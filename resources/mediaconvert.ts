import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from "@aws-sdk/client-sqs";
import { SQSHandler } from "aws-lambda";
import { MediaConvertClient, CreateJobCommand, DescribeEndpointsCommand } from "@aws-sdk/client-mediaconvert";

export const handler: SQSHandler = async (event, context) => {
  const queueURL = process.env["QUEUE_URL"];
  const mcJobTemplate: string = process.env["MC_JOB_TEMPLATE"]!;
  const mcRoleArn = process.env["MC_ROLE_ARN"]!;
  const region = process.env["REGION"]!;

  const sqs = new SQSClient({ region });

  let mediaconvert = new MediaConvertClient({ region });
  // Get MediaConvert Endpoint
  const data = await mediaconvert.send(new DescribeEndpointsCommand({ MaxResults: 0 }));
  const endpoint = data.Endpoints![0];
  console.log(`My MediaConvert endpoint is ${JSON.stringify(endpoint)}`);
  mediaconvert = new MediaConvertClient({ endpoint: endpoint.Url });

  console.log(`Number of Records: ${event.Records.length}`);
  console.log(`Content of Records: ${JSON.stringify(event)}`);

  for (const record of event.Records) {
    const message = record;
    const receiptHandle = message.receiptHandle;
    const deketeMsgParams = {
      QueueUrl: queueURL,
      ReceiptHandle: receiptHandle,
    };

    const deleteMsgResponse = await sqs.send(new DeleteMessageCommand(deketeMsgParams));

    const sourceBucket: string = message["messageAttributes"]!["Bucket"]["stringValue"]!;
    const sourceKey: string = message["messageAttributes"]!["Key"]["stringValue"]!;

    const mediaConvertResponse = convertMedia(mediaconvert, sourceBucket, sourceKey, mcJobTemplate, mcRoleArn);
    console.log("Response from MediaConvert: ", mediaConvertResponse);
  }
};

const convertMedia = (
  mediaconvert: MediaConvertClient,
  sourceBucket: string,
  sourceKey: string,
  mcJobTemplate: string,
  mcRoleArn: string
) => {
  const inputPath: string = "s3://" + sourceBucket + "/" + sourceKey;

  const rc = mediaconvert.send(
    new CreateJobCommand({
      JobTemplate: mcJobTemplate,
      Role: mcRoleArn,
      Settings: {
        Inputs: [
          {
            AudioSelectors: {
              "Audio Selector 1": { DefaultSelection: "DEFAULT" },
            },
            VideoSelector: {},
            TimecodeSource: "ZEROBASED",
            FileInput: inputPath,
          },
        ],
      },
    })
  );
  return rc;
};
