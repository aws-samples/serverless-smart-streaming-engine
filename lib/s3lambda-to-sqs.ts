import { Construct } from "constructs";
import { aws_lambda as lambda, aws_iam as iam, aws_s3 as s3, aws_sqs as sqs } from "aws-cdk-lib";
import { ManagedPolicy } from "aws-cdk-lib/aws-iam";

export class S3LambdaToSQS extends Construct {
  public readonly sqsQueueURL: string;
  constructor(scope: Construct, id: string, s3ArchiveBucket: s3.Bucket, lambdaReqQueue: sqs.Queue) {
    super(scope, id);

    const s3UploadTrigger = new lambda.Function(this, "EventReplayEngineS3UploadTrigger", {
      runtime: lambda.Runtime.PYTHON_3_7,
      handler: "s3archive-to-sqs.handler",
      code: lambda.Code.fromAsset("./resources"),
      environment: {
        BUCKET_NAME: s3ArchiveBucket.bucketName,
        QUEUE_URL: lambdaReqQueue.queueUrl,
      },
    });

    const lambda_role = new iam.Role(this, "EventReplayEngine", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
    });

    lambda_role.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaSQSQueueExecutionRole"));
    lambda_role.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName("AmazonSNSFullAccess"));

    this.sqsQueueURL = lambdaReqQueue.queueUrl;
  }
}
