import json
import os
import boto3

def handler(event, context):
    # TODO implement

    sqs = boto3.client("sqs")
    sns = boto3.client("sns")

    queue_url = os.environ.get("QUEUE_URL")
    topic_arn = os.environ.get("TOPIC_ARN")

    s3_info = event["Records"][0]["s3"]
    bucket_name = s3_info["bucket"]["name"]
    bucket_arn = s3_info["bucket"]["arn"]
    object_key = s3_info["object"]["key"]

    rc = sqs.send_message(
        QueueUrl=queue_url,
        DelaySeconds=10,
        MessageAttributes={
            "Bucket": {"DataType": "String", "StringValue": bucket_name},
            "ARN": {"DataType": "String", "StringValue": bucket_arn},
            "Key": {"DataType": "String", "StringValue": object_key},
        },
        MessageBody=("Information about uploaded video"),
    )

    return {"statusCode": 200, "body": event}