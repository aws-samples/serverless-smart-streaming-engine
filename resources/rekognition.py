import json
import cv2
import os
import boto3
import time
from datetime import datetime


def rekognize(rekog, source_bucket, source_key):
    theCelebs = {}
    strDetail = ""
    strOverall = ""

    startCelebrityrekog = rekog.start_celebrity_recognition(
        Video={
            "S3Object": {
                "Bucket": source_bucket,
                "Name": source_key,
            }
        },
    )

    celebrityJobId = startCelebrityrekog["JobId"]

    print("Rekog Job Id: {0}".format(celebrityJobId))

    # Wait for celebrity recognition job to complete
    # In production use cases, you would usually use StepFucntion or SNS topic to get notified when job is complete.
    getCelebrityRecognition = rekog.get_celebrity_recognition(
        JobId=celebrityJobId, SortBy="TIMESTAMP"
    )

    while getCelebrityRecognition["JobStatus"] == "IN_PROGRESS":
        time.sleep(5)
        print(".", end="")

        getCelebrityRecognition = rekog.get_celebrity_recognition(
            JobId=celebrityJobId, SortBy="TIMESTAMP"
        )

    print(getCelebrityRecognition["JobStatus"])
    print(json.dumps(getCelebrityRecognition, indent=4))

    # Celebrities detected in each frame
    for celebrity in getCelebrityRecognition["Celebrities"]:
        if "Celebrity" in celebrity:
            cconfidence = celebrity["Celebrity"]["Confidence"]
            if cconfidence > 95:
                ts = celebrity["Timestamp"]
                cname = celebrity["Celebrity"]["Name"]
                strDetail = strDetail + "At {} ms: {} (Confidence: {})\n".format(
                    ts, cname, round(cconfidence, 2)
                )
                if not cname in theCelebs:
                    theCelebs[cname] = cname

    # Unique faces detected in video
    for theCeleb in theCelebs:
        strOverall = strOverall + "Name: {}\n".format(theCeleb)

    print(strDetail)
    print(strOverall)

    return theCelebs


def handler(event, context):
    s3 = boto3.client("s3")
    rekog = boto3.client("rekognition")
    dynamodb = boto3.resource("dynamodb")

    # Get the dynamodb table
    dynamodb_name = os.environ.get("TABLE")
    table = dynamodb.Table(dynamodb_name)
    print("[JINLOG] Successfully load the table " + dynamodb_name)

    # Get the bucket and key from the MediaConvert event
    file_info = event["detail"]["outputGroupDetails"][1]["outputDetails"][0][
        "outputFilePaths"
    ][0].split("//")
    file_info = file_info[1].split("/")

    bucket_name = file_info[0]
    object_key = ""
    for i in range(1, len(file_info) - 1):
        object_key = file_info[i] + "/"
    object_key += file_info[i + 1]

    # Call Rekognition for object detections
    celebrities = rekognize(rekog, bucket_name, object_key)

    if 'Son Heung-min' in celebrities : 

        playlist_filepath = event["detail"]["outputGroupDetails"][0]["playlistFilePaths"][0]

        # Put an item in the table
        table.put_item(
            Item={
                "filepath": playlist_filepath,
                "datetime": datetime.now().strftime("%Y-%m-%d-%H:%M:%S"),
                "celebrities": celebrities,
            }
        )