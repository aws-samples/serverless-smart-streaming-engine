import { Construct } from "constructs";
import {
  aws_lambda as lambda,
  aws_iam as iam,
  aws_s3 as s3,
  aws_events as eventbridge,
  aws_events_targets as targets,
  Duration,
  Size,
} from "aws-cdk-lib";

export class MediaConvertToRekognition extends Construct {
  constructor(scope: Construct, id: string, bucket: s3.Bucket, tableName: string) {
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

    const myLambda = new lambda.Function(this, "EventReplayEngineRekognitionLambda", {
      role: lamdbaRole,
      runtime: lambda.Runtime.PYTHON_3_7,
      handler: "rekognition.handler",
      code: lambda.Code.fromAsset("./resources"),
      ephemeralStorageSize: Size.mebibytes(1024),
      timeout: Duration.minutes(5),
      environment: {
        DEST_BUCKET: bucket.bucketName,
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
