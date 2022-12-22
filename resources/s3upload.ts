import { S3Event } from "aws-lambda";
import { SQSClient } from "@aws-sdk/client-sqs";
import { SendMessageCommand } from "@aws-sdk/client-sqs";

export const handler = async (event: S3Event) => {
  const sqs = new SQSClient({ region: "ap-northeast-2" });
  const queueURL = process.env["QUEUE_URL"];

  const s3Info = event["Records"][0]["s3"];
  const bucketName = s3Info["bucket"]["name"];
  const bucketArn = s3Info["bucket"]["arn"];
  const objectKey = s3Info["object"]["key"];

  const params = {
    QueueUrl: queueURL,
    MessageAttributes: {
      Bucket: { DataType: "String", StringValue: bucketName },
      ARN: { DataType: "String", StringValue: bucketArn },
      Key: { DataType: "String", StringValue: objectKey },
    },
    MessageBody: "Information about uploaded video",
  };

  const data = await sqs.send(new SendMessageCommand(params));
  console.log("Success, message sent. MessageID:", data.MessageId);

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: event,
    }),
  };
};
