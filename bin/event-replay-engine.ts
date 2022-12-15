#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { Aws } from "aws-cdk-lib";
import { App, Aspects } from "aws-cdk-lib";

import { AwsSolutionsChecks } from "cdk-nag";

import { EventReplayEngine } from "../lib/event-replay-engine";
const stackNameValue = "EventReplayEngine";
const description =
  "Event Replay Engine with AI/ML. This uses Elemental Services and backend \
  serverless services to automatically generate the highlight clips of a streaming event";

const app = new cdk.App();
//Aspects.of(app).add(new AwsSolutionsChecks());
new EventReplayEngine(app, "EventReplayEngineStack", {
  stackName: stackNameValue,
  env: {
    region: `${Aws.REGION}`,
    account: `${Aws.ACCOUNT_ID}`,
  },
  description,
});
