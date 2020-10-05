# measure-cold-start

[![Version](https://img.shields.io/badge/semver-1.3.3-blue)](template.yml)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

This is an AWS Step Functions state machine that helps you measure the initialization time (or `Init Duration` in the REPORT log messages) of your Lambda functions. The initializatoin time is the time it takes to initialize the function module before Lambda is able to invoke the handler method.

The state machine is language agnostic. You can give it any function as input and the state machine will invoke it multiple times whilst inducing a cold start for each invocation by changing an environment variable value. It will then analyze the function's logs and report the following data points.

 ```json
{
  "coldStarts": 40,
  "min": 308.3,
  "fstQuartile": 323.86,
  "median": 347.63,
  "trdQuartile": 362.66,
  "p95": 407,
  "max": 422.56,
  "stddev": 29.9653
}
 ```

The state machine expects input of the following format:

```json
{
  "functionName": "my-function",
  "count": 100,
  "payload": "{}"
}
```

![](/imgs/Screenshot.png)

## Deploying to your account (via the console)

Go to this [page](https://serverlessrepo.aws.amazon.com/applications/arn:aws:serverlessrepo:us-east-1:374852340823:applications~measure-cold-start) and click the `Deploy` button.

## Deploying via SAM/Serverless framework/CloudFormation

To deploy this app via SAM, you need something like this in the CloudFormation template:

```yml
PropagateCloudFormationTags:
  Type: AWS::Serverless::Application
  Properties:
    Location:
      ApplicationId: arn:aws:serverlessrepo:us-east-1:374852340823:applications/measure-cold-start
      SemanticVersion: <enter latest version>
```

To do the same via CloudFormation or the Serverless framework, you need to first add the following `Transform`:

```yml
Transform: AWS::Serverless-2016-10-31
```

For more details, read this [post](https://theburningmonk.com/2019/05/how-to-include-serverless-repository-apps-in-serverless-yml/).
