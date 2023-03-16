import { Construct } from "constructs";
import {
  aws_lambda as lambda,
  aws_iam as iam,
  aws_s3 as s3,
  aws_events as eventbridge,
  aws_events_targets as targets,
  Duration,
  aws_s3_notifications as notifications,
  Size,
} from "aws-cdk-lib";
import * as path from "path";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";

export class MediaConvertToRekognition extends Construct {
  constructor(scope: Construct, id: string, region: string, rekogBucket: s3.Bucket, tableName: string) {
    super(scope, id);

    // Create an event rule for MediaConvert Complete
    const rule = new eventbridge.Rule(this, "MediaConvertJobCompleteEvent", {
      eventPattern: {
        source: ["aws.mediaconvert"],
        detail: { status: ["COMPLETE"] },
      },
    });

    // Create an lambda that is invoked by the event above.
    // This lambda will call Rekognition to analyze the video content
    const lamdbaRole = new iam.Role(this, "RoleForRekognitionLambad", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonRekognitionFullAccess"),
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonS3FullAccess"),
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonDynamoDBFullAccess"),
        iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole"),
      ],
    });

    const myLambda = new NodejsFunction(this, "RekognitionInvoker", {
      role: lamdbaRole,
      entry: path.join(__dirname, `/../resources/rekognition.ts`),
      handler: "handler",
      memorySize: 10240,
      ephemeralStorageSize: Size.mebibytes(10240),
      timeout: Duration.minutes(15),
      environment: {
        REGION: region,
        DEST_BUCKET: rekogBucket.bucketName,
        TABLE: tableName,
      },
    });

    // Add a rekognition lambda as a target of EventBridge rule
    rule.addTarget(
      new targets.LambdaFunction(myLambda, {
        retryAttempts: 3,
      })
    );
  }
}
