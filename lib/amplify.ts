import {
  aws_dynamodb as dynamodb,
  aws_apigateway as agw,
  aws_s3_deployment as deployment,
  aws_cloudfront_origins as origins,
  aws_iam as iam,
  aws_s3 as s3,
  aws_cloudfront as cf,
  aws_cloudfront as cloudfront,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as path from "path";

export class AmplifyStack extends Construct {
  public readonly frontPage: string;
  public readonly agwUrl: string;
  constructor(scope: Construct, id: string, region: string, table: dynamodb.Table, cfDomain: string) {
    super(scope, id);

    // Step 1: Lambda that scans the dynamoDB table
    const lamdbaRole = new iam.Role(this, "RoleForRekognitionLambad", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonDynamoDBFullAccess"),
        iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole"),
      ],
    });

    const myLambda = new NodejsFunction(this, "RekognitionInvoker", {
      role: lamdbaRole,
      entry: path.join(__dirname, `/../resources/getData.ts`),
      handler: "handler",
      environment: {
        REGION: region,
        DDB_TABLE: table.tableName!,
        CF_URL: cfDomain,
      },
    });

    // Step 2: API Gateway
    const apiGateway = new agw.LambdaRestApi(this, "ApiGateway", { handler: myLambda, proxy: false });
    const vod = apiGateway.root.addResource("vod"); // GET /vod
    vod.addMethod("GET");

    this.agwUrl = apiGateway.url;

    // S3 bucket for static files(html, css, react)
    const websiteBucket = new s3.Bucket(this, "WebsiteBucket");

    const websiteDeployment = new deployment.BucketDeployment(this, "WebsiteDeployment", {
      sources: [deployment.Source.asset("./static")],
      destinationBucket: websiteBucket,
    });

    const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, "OAIforWebsiteBucket");
    const s3Origin = new origins.S3Origin(websiteBucket, { originAccessIdentity });

    const cfDistribution = new cloudfront.Distribution(this, "DistributionForWebsiteBucket", {
      defaultRootObject: "index.html",
      defaultBehavior: {
        origin: s3Origin,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.ALLOW_ALL,
        originRequestPolicy: cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN,
        responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.CORS_ALLOW_ALL_ORIGINS_WITH_PREFLIGHT,
      },
    });

    this.frontPage = cfDistribution.domainName;
  }
}
