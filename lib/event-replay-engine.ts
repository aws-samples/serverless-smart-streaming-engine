import { CfnOutput, Fn, Aws, aws_s3 as s3, aws_sqs as sqs } from "aws-cdk-lib";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { MediaPackageCdnAuth } from "./media_package";
import { MediaLive } from "./media_live";
import { CloudFront } from "./cloudfront";
import { S3LambdaToSQS } from "./s3lambda-to-sqs";
import { mediaConvertLambda } from "./sqs-to-mediaconvert";
import * as lambda from "aws-cdk-lib/aws-lambda";

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

    // S3 bucket for this stack
    const MyEventReplayEngineBucket = new s3.Bucket(this, "MyEventReplayEngineBucket");

    // SQS to queue converting jobs
    const lambdaReqQueue = new sqs.Queue(this, "EventReplayEngine");
    const fromS3LamdbatoSQS = new S3LambdaToSQS(this, "S3LamdbaToSQS", MyEventReplayEngineBucket, lambdaReqQueue);

    const sqsToMediaConvert = new mediaConvertLambda(
      this,
      "LamdbaCallingMediaConvert",
      lambdaReqQueue.queueUrl,
      MyEventReplayEngineBucket
    );
    /*
     * First step: Create MediaPackage Channel 👇
     */
    const mediaPackageChannel = new MediaPackageCdnAuth(this, "MyMediaPackageChannel", configurationMediaPackage);

    /*
     * Second step: Create MediaLive Channel 👇
     */

    const mediaLiveChannel = new MediaLive(
      this,
      "MyMediaLiveChannel",
      configurationMediaLive,
      mediaPackageChannel.myChannel.id,
      MyEventReplayEngineBucket.bucketName
    );

    /*
     * Third step: Create CloudFront Distribution 👇
     */
    const cloudfront = new CloudFront(
      this,
      "MyCloudFrontDistribution",
      mediaPackageChannel.myChannelEndpointHls.attrUrl,
      mediaPackageChannel.myChannelEndpointDash.attrUrl
    );

    //👇Add dependencyto wait for MediaPackage channel to be ready before deploying MediaLive
    mediaLiveChannel.node.addDependency(mediaPackageChannel);

    new lambda.Function(this, "S3ArchiveToSQS", {
      runtime: lambda.Runtime.PYTHON_3_7,
      handler: "s3archive-to-sqs.handler",
      code: lambda.Code.fromAsset("./resources"),
    });

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
    if (["UDP_PUSH", "RTP_PUSH", "RTMP_PUSH"].includes(configurationMediaLive["inputType"])) {
      if (configurationMediaLive["channelClass"] == "STANDARD") {
        new CfnOutput(this, "MyMediaLiveChannelDestPri", {
          value: Fn.join("", [Fn.select(0, mediaLiveChannel.channelInput.attrDestinations)]),
          exportName: Aws.STACK_NAME + "mediaLiveChannelDestPri",
          description: "Primary MediaLive input Url",
        });
        new CfnOutput(this, "MyMediaLiveChannelDestSec", {
          value: Fn.join("", [Fn.select(1, mediaLiveChannel.channelInput.attrDestinations)]),
          exportName: Aws.STACK_NAME + "mediaLiveChannelDestSec",
          description: "Seconday MediaLive input Url",
        });
      } else {
        new CfnOutput(this, "MyMediaLiveChannelDestPri", {
          value: Fn.join("", [Fn.select(0, mediaLiveChannel.channelInput.attrDestinations)]),
          exportName: Aws.STACK_NAME + "mediaLiveChannelDestPri",
          description: "Primary MediaLive input Url",
        });
      }
    }
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
    new CfnOutput(this, "MyCloudFrontHlsEndpoint", {
      value: cloudfront.hlsPlayback,
      exportName: Aws.STACK_NAME + "cloudFrontHlsEndpoint",
      description: "The HLS playback endpoint",
    });
    new CfnOutput(this, "MyCloudFrontDashEndpoint", {
      value: cloudfront.dashPlayback,
      exportName: Aws.STACK_NAME + "cloudFrontDashEndpoint",
      description: "The MPEG DASH playback endpoint",
    });
    // Exporting S3 Buckets for the Log and the hosting demo
    new CfnOutput(this, "MyCloudFrontS3LogBucket", {
      value: cloudfront.s3LogBucket.bucketName,
      exportName: Aws.STACK_NAME + "cloudFrontS3BucketLog",
      description: "The S3 bucket for CloudFront logs",
    });
  }
}
