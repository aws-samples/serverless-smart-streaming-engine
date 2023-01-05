import { Aws, CfnOutput, aws_secretsmanager as secretsmanager } from "aws-cdk-lib";
import { Construct } from "constructs";
import { NagSuppressions } from "cdk-nag";

export class Secrets extends Construct {
  public readonly cdnSecret: secretsmanager.ISecret;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    const cdnSecret = new secretsmanager.Secret(this, "CdnSecret", {
      secretName: "MediaPackage/" + Aws.STACK_NAME,
      description: "Secret for Secure Resilient Live Streaming Delivery",
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ MediaPackageCDNIdentifier: "" }),
        generateStringKey: "MediaPackageCDNIdentifier", //MUST keep this StringKey to use with EMP
      },
    });
    this.cdnSecret = cdnSecret;
    NagSuppressions.addResourceSuppressions(cdnSecret, [
      {
        id: "AwsSolutions-SMG4",
        reason: "Remediated through property override.",
      },
    ]);

    new CfnOutput(this, "cdnSecret", {
      value: cdnSecret.secretName,
      exportName: Aws.STACK_NAME + "cdnSecret",
      description: "The name of the cdnSecret",
    });
  }
}
