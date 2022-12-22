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
import * as path from "path";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";

dotenv.config({ path: __dirname + "/../.env" });

export class mediaConvertLambda extends Construct {
  public readonly jobTemplateName: string;
  constructor(
    scope: Construct,
    id: string,
    sqsQueueUrl: string,
    mcBucket: s3.Bucket,
    rkBucket: s3.Bucket,
    jobQueue: sqs.IQueue
  ) {
    super(scope, id);

    // Load MediaConvert endpoint URL from .env file
    const mediaConvertEndpoint: string = process.env.MEDIACONVERT_URL!;

    // Create a job template using JSON
    const jobTemplateParams = require("../config/encoding-profiles/mc-job-template");

    // Set S3 bucket name for outputs
    jobTemplateParams["OutputGroups"][0]["OutputGroupSettings"]["HlsGroupSettings"]["Destination"] =
      "s3://" + mcBucket.bucketName + "/vod-assets/";

    jobTemplateParams["OutputGroups"][1]["OutputGroupSettings"]["FileGroupSettings"]["Destination"] =
      "s3://" + rkBucket.bucketName + "/rekog-data/";

    const jobTemplate = new mediaconvert.CfnJobTemplate(this, "MyCfnJobTemplate", {
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

    const jobTemplateName: string = jobTemplate.name!;

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
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonS3FullAccess"),
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonAPIGatewayInvokeFullAccess"),
      ],
    });

    const myLambda = new NodejsFunction(this, "EventReplayEngineS3UploadTrigger", {
      role: lamdbaRole,
      entry: path.join(__dirname, `/../resources/mediaconvert.ts`),
      handler: "handler",
      ephemeralStorageSize: Size.mebibytes(1024),
      timeout: Duration.minutes(1),
      environment: {
        QUEUE_URL: sqsQueueUrl,
        MC_JOB_TEMPLATE: jobTemplateName,
        MC_ROLE_ARN: roleForMediaConvert.roleArn,
      },
    });

    // Register SQS as a event source of lambda_sqs_to_mediaconvert_handler
    const sqsEventSource = new eventSource.SqsEventSource(jobQueue, { batchSize: 1 });
    myLambda.addEventSource(sqsEventSource);

    this.jobTemplateName = jobTemplateName;
  }
}
