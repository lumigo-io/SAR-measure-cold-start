const uuid = require("uuid/v4");
const Log = require("@dazn/lambda-powertools-logger");
const AWS = require("aws-sdk");
const Lambda = new AWS.Lambda();

module.exports.handler = async (input, context) => {  
	const { functionName, count, payload } = input;
	input.startTime = input.startTime || Date.now();

	let done = 0;
	for (let i = 0; i < count; i++) {
		await updateEnvVar(functionName);
		await invoke(functionName, payload);
		done++;

		if (context.getRemainingTimeInMillis() < 10000) {
			return { ...input, count: count - done };
		}
	}

	return { ...input, count: count - done };
};

const updateEnvVar = async (functionName) => {
	Log.debug("touching environment variable", { functionName });
	const req = {
		FunctionName: functionName,
		Environment: {
			Variables: {
				"uuid": uuid()
			}
		}
	};
	await Lambda.updateFunctionConfiguration(req).promise();
};

const invoke = async (functionName, payload = {}) => {
	Log.debug("invoking", { functionName });
	const req = {
		FunctionName: functionName,
		InvocationType: "RequestResponse",
		Payload: JSON.stringify(payload)
	};
	await Lambda.invoke(req).promise();
};
