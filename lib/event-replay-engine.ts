import {
  CfnOutput,
  Fn,
  Aws,
  aws_s3 as s3,
  aws_sqs as sqs,
  aws_dynamodb as dynamodb,
  Duration,
  aws_cloudfront as cloudfront,
} from "aws-cdk-lib";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { MediaPackageCdnAuth } from "./media_package";
import { MediaLive } from "./media_live";
import { CloudFrontForStreaming } from "./cloudfront-streaming";
import { CloudFrontForVod } from "./cloudfront-vod";
import { S3LambdaToSQS } from "./s3lambda-to-sqs";
import { mediaConvertLambda } from "./sqs-to-mediaconvert";
import { MediaConvertToRekognition } from "./mediaconvert-rekognition";
import { AmplifyStack } from "./amplify";
import * as dotenv from "dotenv";
import { table } from "console";

dotenv.config();

const configurationMediaLive = {
  streamName: "live",
  channelClass: "SINGLE_PIPELINE",
  inputType: "RTMP_PUSH",
  sourceEndBehavior: "LOOP",
  codec: "AVC",
  encodingProfile: "HD-720p",
  priLink: "",
  secLink: "",
  inputCidr: "0.0.0.0/0",
  priUrl: "",
  secUrl: "",
  priFlow: "",
  secFlow: "",
};

const configurationMediaPackage = {
  ad_markers: "PASSTHROUGH",
  cdn_authorization: false,
  hls_segment_duration_seconds: 4,
  hls_playlist_window_seconds: 60,
  hls_max_video_bits_per_second: 2147483647,
  hls_min_video_bits_per_second: 0,
  hls_stream_order: "ORIGINAL",
  hls_include_I_frame: false,
  hls_audio_rendition_group: false,
  hls_program_date_interval: 60,
  dash_period_triggers: "ADS",
  dash_profile: "NONE",
  dash_segment_duration_seconds: 2,
  dash_segment_template: "TIME_WITH_TIMELINE",
  dash_manifest_window_seconds: 60,
  dash_max_video_bits_per_second: 2147483647,
  dash_min_video_bits_per_second: 0,
  dash_stream_order: "ORIGINAL",
  cmaf_segment_duration_seconds: 4,
  cmaf_include_I_frame: false,
  cmaf_program_date_interval: 60,
  cmaf_max_video_bits_per_second: 2147483647,
  cmaf_min_video_bits_per_second: 0,
  cmaf_stream_order: "ORIGINAL",
  cmaf_playlist_window_seconds: 60,
  mss_segment_duration_seconds: 2,
  mss_manifest_window_seconds: 60,
  mss_max_video_bits_per_second: 2147483647,
  mss_min_video_bits_per_second: 0,
  mss_stream_order: "ORIGINAL",
};

export class EventReplayEngine extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const region = this.region;
    console.log(__dirname);
    console.log("Current Region: ", region);

    // S3 bucket for MediaLive Archive
    const mediaLiveArchiveBucket = new s3.Bucket(
      this,
      "mediaLiveArchiveBucket"
    );
    const mediaConvertBucket = new s3.Bucket(this, "MediaConvertBucket");
    const rekognitionBucket = new s3.Bucket(this, "RekognitionBucket");

    // DynamoDB Table for this stack
    const ddbTable = new dynamodb.Table(this, "EventReplayEnginTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: "PK",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "SK",
        type: dynamodb.AttributeType.STRING,
      },
    });
    /*
     * First step: Create MediaPackage Channel 👇
     */
    const mediaPackageChannel = new MediaPackageCdnAuth(
      this,
      "MyMediaPackageChannel",
      configurationMediaPackage
    );

    /*
     * Second step: Create MediaLive Channel 👇
     */

    const mediaLiveChannel = new MediaLive(
      this,
      "MyMediaLiveChannel",
      configurationMediaLive,
      mediaPackageChannel.myChannel.id,
      mediaLiveArchiveBucket.bucketName
    );

    /*
     * Third step: Create CloudFront Distribution for Streaming Event 👇
     */
    const streamingCloudfront = new CloudFrontForStreaming(
      this,
      "MyCloudFrontDistribution",
      mediaPackageChannel.myChannelEndpointHls.attrUrl,
      mediaPackageChannel.myChannelEndpointDash.attrUrl
    );

    //👇Add dependencyto wait for MediaPackage channel to be ready before deploying MediaLive
    mediaLiveChannel.node.addDependency(mediaPackageChannel);

    // SQS to queue converting jobs
    const lambdaReqQueue = new sqs.Queue(this, "EventReplayEngine", {
      visibilityTimeout: Duration.seconds(60),
    });
    const fromS3LamdbatoSQS = new S3LambdaToSQS(
      this,
      "S3LamdbaToSQS",
      region,
      mediaLiveArchiveBucket,
      lambdaReqQueue
    );

    const sqsToMediaConvert = new mediaConvertLambda(
      this,
      "LamdbaCallingMediaConvert",
      region,
      lambdaReqQueue.queueUrl,
      mediaConvertBucket,
      rekognitionBucket,
      lambdaReqQueue
    );

    const mediaConvertToRekognition = new MediaConvertToRekognition(
      this,
      "MediaConvertToRekognition",
      region,
      rekognitionBucket,
      ddbTable.tableName
    );

    // CloudFront Distribution for VOD contents
    const cloudfrontForVod = new CloudFrontForVod(
      this,
      "CloudFrontForVod",
      mediaConvertBucket
    );

    // Resources for Amplify Frontend: API Gateway + Lambda
    const frontendStack = new AmplifyStack(
      this,
      "AmplifyFrontend",
      region,
      ddbTable,
      cloudfrontForVod.domainName
    );

    /*
     * Final step: CloudFormation Output 👇
     */
    // MediaLive 👇
    new CfnOutput(this, "MyMediaLiveChannelArn", {
      value: mediaLiveChannel.myChannelArn,
      exportName: Aws.STACK_NAME + "mediaLiveChannelArn",
      description: "The Arn of the MediaLive Channel",
    });
    new CfnOutput(this, "MyMediaLiveChannelInputName", {
      value: mediaLiveChannel.myChannelInput,
      exportName: Aws.STACK_NAME + "mediaLiveChannelInputName",
      description: "The Input Name of the MediaLive Channel",
    });
    if (
      ["UDP_PUSH", "RTP_PUSH", "RTMP_PUSH"].includes(
        configurationMediaLive["inputType"]
      )
    ) {
      if (configurationMediaLive["channelClass"] == "STANDARD") {
        new CfnOutput(this, "MyMediaLiveChannelDestPri", {
          value: Fn.join("", [
            Fn.select(0, mediaLiveChannel.channelInput.attrDestinations),
          ]),
          exportName: Aws.STACK_NAME + "mediaLiveChannelDestPri",
          description: "Primary MediaLive input Url",
        });
        new CfnOutput(this, "MyMediaLiveChannelDestSec", {
          value: Fn.join("", [
            Fn.select(1, mediaLiveChannel.channelInput.attrDestinations),
          ]),
          exportName: Aws.STACK_NAME + "mediaLiveChannelDestSec",
          description: "Seconday MediaLive input Url",
        });
      } else {
        new CfnOutput(this, "MyMediaLiveChannelDestPri", {
          value: Fn.join("", [
            Fn.select(0, mediaLiveChannel.channelInput.attrDestinations),
          ]),
          exportName: Aws.STACK_NAME + "mediaLiveChannelDestPri",
          description: "Primary MediaLive input Url",
        });
      }
    }
    new CfnOutput(this, "MyRegion", {
      value: region! as string,
      exportName: Aws.STACK_NAME + "currentRegion",
      description: "Deployed Region",
    });
    new CfnOutput(this, "MyMediaLiveArchiveBucket", {
      value: mediaLiveArchiveBucket.bucketName,
      exportName: Aws.STACK_NAME + "mediaLiveArchiveBucket",
      description: "MediaLive S3 Archive Bucket",
    });
    new CfnOutput(this, "MyMediaConvertBucket", {
      value: mediaConvertBucket.bucketName,
      exportName: Aws.STACK_NAME + "mediaConvertBucket",
      description: "MediaConvert Output Buckets",
    });
    new CfnOutput(this, "MyRekognitionBucket", {
      value: rekognitionBucket.bucketName,
      exportName: Aws.STACK_NAME + "rekognitionBucket",
      description: "Rekognition Analysis Bucket",
    });

    new CfnOutput(this, "MyMediaLiveChannelS3ArchivePath", {
      value: mediaLiveChannel.s3ArchivePath,
      exportName: Aws.STACK_NAME + "mediaLiveChannelS3ArchivePath",
      description: "S3 Archive Path of the MediaLive Channel",
    });

    // MediaPackage 👇
    new CfnOutput(this, "MyMediaPackageChannelName", {
      value: mediaPackageChannel.myChannelName,
      exportName: Aws.STACK_NAME + "mediaPackageName",
      description: "The name of the MediaPackage Channel",
    });

    // CloudFront 👇
    new CfnOutput(this, "MyStreamingCloudFrontHlsEndpoint", {
      value: streamingCloudfront.hlsPlayback,
      exportName: Aws.STACK_NAME + "cloudFrontHlsEndpoint",
      description: "The HLS playback endpoint",
    });
    new CfnOutput(this, "MyStreamingloudFrontDashEndpoint", {
      value: streamingCloudfront.dashPlayback,
      exportName: Aws.STACK_NAME + "cloudFrontDashEndpoint",
      description: "The MPEG DASH playback endpoint",
    });
    // Exporting S3 Buckets for the Log and the hosting demo
    new CfnOutput(this, "MyStreamingCloudFrontS3LogBucket", {
      value: streamingCloudfront.s3LogBucket.bucketName,
      exportName: Aws.STACK_NAME + "cloudFrontS3BucketLog",
      description: "The S3 bucket for CloudFront logs",
    });
    new CfnOutput(this, "MyStreamingCloudFrontForVod", {
      value: cloudfrontForVod.domainName,
      exportName: Aws.STACK_NAME + "CloudFrontForVod",
      description: "CloudFront Domain Name for Vod Contents",
    });
    new CfnOutput(this, "APIGatewayURLforAmplify", {
      value: frontendStack.agwUrl,
      exportName: Aws.STACK_NAME + "APIGatewayURL",
      description: "API Gateway URL for Amplify Frontend",
    });
    new CfnOutput(this, "FrontPageURL", {
      value: "http://" + frontendStack.frontPage,
      exportName: Aws.STACK_NAME + "FrontPageURL",
      description:
        "Frontend web page in S3 web hosting with CloudFront distribution.",
    });
    new CfnOutput(this, "DDBTableName", {
      value: ddbTable.tableName,
      exportName: Aws.STACK_NAME + "DDBTableName",
      description: "DynamoDB table that stores the metadata of clips.",
    });
  }
}
