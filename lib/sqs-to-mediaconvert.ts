import { Construct } from "constructs";
import {
  aws_lambda as lambda,
  aws_iam as iam,
  aws_mediaconvert as mediaconvert,
  Size,
  Duration,
  aws_s3 as s3,
  aws_sqs as sqs,
  aws_lambda_event_sources as eventSource,
} from "aws-cdk-lib";
import "dotenv/config";
import * as dotenv from "dotenv";

dotenv.config({ path: __dirname + "/../.env" });

export class mediaConvertLambda extends Construct {
  constructor(scope: Construct, id: string, sqsQueueUrl: string, s3Bucket: s3.Bucket, jobQueue: sqs.IQueue) {
    super(scope, id);

    // Load MediaConvert endpoint URL from .env file
    const mediaConvertEndpoint: string = process.env.MEDIACONVERT_URL!;

    // Create a job template using JSON
    const jobTemplateParams = require("../config/encoding-profiles/mc-job-template");

    const cfnJobTemplate = new mediaconvert.CfnJobTemplate(this, "MyCfnJobTemplate", {
      category: "OTT-HLS",
      queue: "arn:aws:mediaconvert:ap-northeast-2:236241703319:queues/Default",
      name: "event-replay-engine-job-template",
      settingsJson: jobTemplateParams,
      accelerationSettings: {
        mode: "DISABLED",
      },
      statusUpdateInterval: "SECONDS_60",
      priority: 0,
      hopDestinations: [],
    });

    const lamdbaRole = new iam.Role(this, "RoleForMediaConvertLambda", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSQSFullAccess"),
        iam.ManagedPolicy.fromAwsManagedPolicyName("AWSElementalMediaConvertFullAccess"),
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonS3FullAccess"),
        iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole"),
      ],
    });

    // We need another role for MediaConvert
    const roleForMediaConvert = new iam.Role(this, "RoleForMediaConvert", {
      assumedBy: new iam.ServicePrincipal("mediaconvert.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSQSFullAccess"),
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonAPIGatewayInvokeFullAccess"),
      ],
    });

    // create a lambda which calls MediaConvert
    const my_lambda = new lambda.Function(this, "EventReplayEngineMediaConvertLambda", {
      role: lamdbaRole,
      runtime: lambda.Runtime.PYTHON_3_7,
      handler: "mediaconvert.handler",
      code: lambda.Code.fromAsset("./resources"),
      ephemeralStorageSize: Size.mebibytes(1024),
      timeout: Duration.minutes(5),
      environment: {
        QUEUE_URL: sqsQueueUrl,
        MC_ENDPOINT: mediaConvertEndpoint,
        MC_JOB_TEMPLATE: JSON.stringify(jobTemplateParams),
        DEST_BUCKET: s3Bucket.bucketName,
        MC_ROLE_ARN: roleForMediaConvert.roleArn,
      },
    });

    // Register SQS as a event source of lambda_sqs_to_mediaconvert_handler
    const sqsEventSource = new eventSource.SqsEventSource(jobQueue);
  }
}
