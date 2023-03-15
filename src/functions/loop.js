const uuid = require("uuid/v4");
const Log = require("@dazn/lambda-powertools-logger");
const {
    Lambda,
    waitUntilFunctionUpdatedV2
} = require("@aws-sdk/client-lambda");
const Lambda = new Lambda();

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
	});

	return resp.Environment || { Variables: {} };
};

const updateEnvVar = async (functionName, envVars) => {
	Log.debug("touching environment variable", { functionName });
	envVars.Variables["uuid"] = uuid();

	const req = {
		FunctionName: functionName,
		Environment: envVars
	};
	await Lambda.updateFunctionConfiguration(req);
	await waitUntilFunctionUpdatedV2({
        client: Lambda,
        maxWaitTime: 200
    }, {FunctionName: functionName,});
};

const invoke = async (functionName, payload) => {
	Log.debug("invoking", { functionName });
	const req = {
		FunctionName: functionName,
		InvocationType: "RequestResponse",
		Payload: payload
	};
	await Lambda.invoke(req);
};
