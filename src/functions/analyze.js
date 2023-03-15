const _ = require("lodash");
const { CloudWatchLogs } = require("@aws-sdk/client-cloudwatch-logs");
const client = new CloudWatchLogs();
const Retry = require("async-retry");

const queryString = `
fields @memorySize / 1000000 as memorySize
  | filter @message like /(?i)(Init Duration)/
  | parse @log /^.*\\/aws\\/lambda\\/(?<functionName>.*)/
  | stats count() as coldStarts, 
          min(@initDuration + @duration) as min,
          percentile(@initDuration + @duration, 25) as p25,
          median(@initDuration + @duration) as median, 
          percentile(@initDuration + @duration, 75) as p75,
          percentile(@initDuration + @duration, 95) as p95,
          max(@initDuration + @duration) as max,
          stddev(@initDuration + @duration) as stddev
    by functionName, memorySize`;

module.exports.handler = async ({ startTime, functionName }) => {
	const endTime = new Date();
	const logGroupNames = [`/aws/lambda/${functionName}`];
	const startResp = await client.startQuery({
		logGroupNames,
		startTime: new Date(startTime).getTime() / 1000,
		endTime: endTime.getTime() / 1000,
		queryString
	});

	const queryId = startResp.queryId;
	const rows = await Retry(
		async () => {
			const resp = await client.getQueryResults({
				queryId
			});

			if (resp.status !== "Complete") {
				throw new Error("query result not ready yet...");
			}

			return resp.results;
		},
		{
			retries: 200, // 10 mins
			minTimeout: 3000,
			maxTimeout: 3000
		}
	);
  
	const result = rows.map(fields => {
		return _.reduce(
			fields,
			(acc, field) => {
				acc[field.field] = tryParseFloat(field.value);
				return acc;
			},
			{}
		);
	});

	return {
		functionName,
		note: "The values include both DURATION as well as INIT DURATION",
		result
	};
};

function tryParseFloat(str) {
	const n = parseFloat(str);
	return _.isNaN(n) ? str : n;
}
