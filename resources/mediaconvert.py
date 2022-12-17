import json
import cv2
import os
import boto3
import time


def convert_media(
    mediaconvert, dest_bucket, source_bucket, source_key, mc_job_template,mc_role_arn
):
    mediaconvert_input_path = "s3://" + source_bucket + "/" + source_key

    # destination of mediaconvert output
    mc_destination = "s3://" + dest_bucket + "/" + "vod-assets/"

    rc = mediaconvert.create_job(
        JobTemplate=mc_job_template,
        Role=mc_role_arn,
        Settings={
            "Inputs": [
                {
                    "AudioSelectors": {
                        "Audio Selector 1": {"DefaultSelection": "DEFAULT"}
                    },
                    "VideoSelector": {},
                    "TimecodeSource": "ZEROBASED",
                    "FileInput": mediaconvert_input_path,
                }
            ],
        },
    )


def handler(event, context):
    sqs = boto3.client("sqs")
    sns = boto3.client("sns")
    s3 = boto3.client("s3")
    rekog = boto3.client("rekognition")

    # Get the SQS Url
    queue_url = os.environ.get("QUEUE_URL")
    dest_bucket = os.environ.get("DEST_BUCKET")
    mc_endpoint = os.environ.get("MC_ENDPOINT")
    mc_job_template = os.environ.get("MC_JOB_TEMPLATE")
    mc_role_arn = os.environ.get("MC_ROLE_ARN")

    # You need to get your own MediaConvert regional endpoint using
    # `aws mediaconvert describe-endpoints` cli command
    mediaconvert = boto3.client(
        "mediaconvert",
        endpoint_url=mc_endpoint,
    )

    # Check if vod-assets folder exists under dest_bucket.
    # If not, create it.
    object_lists = s3.list_objects(Bucket=dest_bucket, Prefix="vod-assets")
    if "Contents" not in object_lists:
        s3.put_object(Bucket=dest_bucket, Key="vod-assets/")

    # Receive the message from the queue
    response = sqs.receive_message(
        QueueUrl=queue_url,
        AttributeNames=[
            "SentTimestamp",
        ],
        MaxNumberOfMessages=1,
        MessageAttributeNames=["All"],
        VisibilityTimeout=10,
        WaitTimeSeconds=0,
    )

    message = response["Messages"][0]
    receipt_handle = message["ReceiptHandle"]

    sqs.delete_message(QueueUrl=queue_url, ReceiptHandle=receipt_handle)
    # sns_response = sns.publish(
    #     TopicArn=topic_arn,
    #     Subject="Received Messages from SQS",
    #     Message=message["MessageAttributes"]["Key"]["StringValue"],
    # )

    source_bucket = message["MessageAttributes"]["Bucket"]["StringValue"]
    source_key = message["MessageAttributes"]["Key"]["StringValue"]

    # Convert the video
    convert_media(mediaconvert, dest_bucket, source_bucket, source_key, mc_job_template, mc_role_arn)

    print(json.dumps(message, indent=2))