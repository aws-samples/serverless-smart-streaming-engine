import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import {
  RekognitionClient,
  StartCelebrityRecognitionCommand,
  GetCelebrityRecognitionCommand,
} from "@aws-sdk/client-rekognition";
import { S3Event } from "aws-lambda";

interface ISvgObj {
  [key: string]: string;
}

export const handler = async (event: S3Event) => {
  const rekognition = new RekognitionClient({ region: "ap-northeast-2" });
  const dynamodb = new DynamoDBClient({ region: "ap-northeast-2" });

  // Get dynamoDB table name from environment variables
  const tableName = process.env["TABLE"];

  console.log(`Event received from EventBridge: ${JSON.stringify(event)}`);

  const s3Info = event["Records"][0]["s3"];
  const bucketName = s3Info["bucket"]["name"];
  const objectKey = s3Info["object"]["key"];

  console.log(`Bucket: ${bucketName}, Key: ${objectKey}`);

  const celebrities = await rekognize(rekognition, bucketName, objectKey);

  if ("Son Heung-min" in celebrities) {
    const videoPath = "s3://" + bucketName + "/" + objectKey;

    dynamodb.send(
      new PutItemCommand({
        TableName: tableName,
        Item: {
          PK: { S: videoPath },
          SK: { S: Date.now().toString() },
          celebs: { S: JSON.stringify(celebrities) },
        },
      })
    );
  }
};

const rekognize = async (rekog: RekognitionClient, bucket: string, key: string) => {
  let theCelebs: ISvgObj = {};

  const startRekogCelebRes = await rekog.send(
    new StartCelebrityRecognitionCommand({
      Video: {
        S3Object: {
          Bucket: bucket,
          Name: key,
        },
      },
    })
  );

  // Get Job Id
  const jobId = startRekogCelebRes["JobId"];
  console.log(`Rekognition Job Id: ${jobId}`);

  let getRekogCelebRes = await rekog.send(
    new GetCelebrityRecognitionCommand({
      JobId: jobId,
      SortBy: "TIMESTAMP",
    })
  );

  // if Rekognition job is still in progress, sleep for 5 seconds
  // and try it again
  while (getRekogCelebRes.JobStatus == "IN_PROGRESS") {
    console.log("Rekognition job in progress...", getRekogCelebRes.Celebrities);
    await new Promise((f) => setTimeout(f, 5000));
    getRekogCelebRes = await rekog.send(
      new GetCelebrityRecognitionCommand({
        JobId: jobId,
        SortBy: "TIMESTAMP",
      })
    );
  }

  console.log(getRekogCelebRes.JobStatus);
  console.log(JSON.stringify(getRekogCelebRes));

  for (const celebrity of getRekogCelebRes.Celebrities!) {
    let strDetail = "";
    if (celebrity.Celebrity !== undefined) {
      const cconfidence = celebrity["Celebrity"]["Confidence"];
      if (cconfidence !== undefined && cconfidence > 95) {
        const ts = celebrity.Timestamp;
        const name = celebrity.Celebrity.Name!;
        strDetail += strDetail + `At ${ts} ms: ${name} (confidence ${Math.round(cconfidence)})`;
        if (!(name in theCelebs)) {
          theCelebs[name] = name;
        }
      }
    }
  }
  return theCelebs;
};
