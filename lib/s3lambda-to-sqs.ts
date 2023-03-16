import { Construct } from "constructs";
import {
  aws_lambda as lambda,
  aws_iam as iam,
  aws_s3 as s3,
  aws_sqs as sqs,
  aws_s3_notifications as notifications,
} from "aws-cdk-lib";
import { ManagedPolicy } from "aws-cdk-lib/aws-iam";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as path from "path";

export class S3LambdaToSQS extends Construct {
  public readonly sqsQueueURL: string;
  constructor(scope: Construct, id: string, region: string, s3ArchiveBucket: s3.Bucket, lambdaReqQueue: sqs.Queue) {
    super(scope, id);

    const lamdbaRole = new iam.Role(this, "RoleForS3UploadLambda", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonS3FullAccess"),
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSQSFullAccess"),
        iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole"),
      ],
    });

    const myLambda = new NodejsFunction(this, "EventReplayEngineS3UploadTrigger", {
      role: lamdbaRole,
      entry: path.join(__dirname, `/../resources/s3upload.ts`),
      handler: "handler",
      environment: {
        REGION: region,
        BUCKET_NAME: s3ArchiveBucket.bucketName,
        QUEUE_URL: lambdaReqQueue.queueUrl,
      },
    });

    const trigger = new notifications.LambdaDestination(myLambda);
    trigger.bind(this, s3ArchiveBucket);
    s3ArchiveBucket.addObjectCreatedNotification(trigger, { suffix: ".ts" });

    this.sqsQueueURL = lambdaReqQueue.queueUrl;
  }
}
