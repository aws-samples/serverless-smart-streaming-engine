// Based on the following reference
// https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/dynamodb-example-query-scan.html

// Create service client module using ES6 syntax.
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { ScanCommand } from "@aws-sdk/client-dynamodb";

interface ISvgObj {
  [key: string]: string;
}

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
export const handler = async () => {
  const region = process.env["REGION"]!;
  // Set the AWS Region.
  const cfDomain = process.env["CF_URL"];

  // Create an Amazon DynamoDB service client object.
  const ddbTable = process.env["DDB_TABLE"];
  const ddbClient = new DynamoDBClient({ region });

  // Set the parameters.
  const params = {
    TableName: ddbTable,
  };

  const data = await ddbClient.send(new ScanCommand(params));
  console.log(JSON.stringify(data.Items));

  const urls: ISvgObj = {};

  data.Items!.forEach(function (element, index, array) {
    const filepath = element.PK.S!.split("//")[1].split("/");
    const key = filepath[filepath.length - 1].split(".");
    const fileName = key[0] + "." + key[1] + ".m3u8";
    // const folder = filepath.slice(1).join("/");
    const url = cfDomain + "/vod-assets/" + fileName;
    console.log(url + "    " + key);
    urls[fileName] = url;
  });
  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
    },
    body: JSON.stringify(urls),
  };
};
