const uuid = require("uuid/v4");
const Log = require("@dazn/lambda-powertools-logger");
const AWS = require("aws-sdk");
const Lambda = new AWS.Lambda();
const Retry = require("async-retry");

module.exports.handler = async (input, context) => {
	const functionName = input.functionName;
	const envVars = await getEnvVars(functionName);
	const payload = input.payload || "{}";
	const count = input.count || 100; // default to 100 iterations
	input.startTime = input.startTime || Date.now();

	let done = 0;
	for (let i = 0; i < count; i++) {
		await updateEnvVar(functionName, envVars);
		await invoke(functionName, payload);
		done++;

		if (context.getRemainingTimeInMillis() < 10000) {
			return { ...input, count: count - done };
		}
	}

	return { ...input, count: count - done };
};

const getEnvVars = async (functionName) => {
	Log.debug("getting current env variables", { functionName });
	const resp = await Lambda.getFunctionConfiguration({
		FunctionName: functionName
	}).promise();

	return resp.Environment || { Variables: {} };
};

const updateEnvVar = async (functionName, envVars) => {
	Log.debug("touching environment variable", { functionName });
	envVars.Variables["uuid"] = uuid();

	const req = {
		FunctionName: functionName,
		Environment: envVars
	};
	await Retry(
		async () => {
			await Lambda.updateFunctionConfiguration(req).promise();
		}, {
			retries: 5,
			minTimeout: 100,
			maxTimeout: 1000
		}
	);
};

const invoke = async (functionName, payload) => {
	Log.debug("invoking", { functionName });
	const req = {
		FunctionName: functionName,
		InvocationType: "RequestResponse",
		Payload: payload
	};
	await Lambda.invoke(req).promise();
};
