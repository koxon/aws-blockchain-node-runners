// This is to set all the Networking
// Set ingress/egress rules here

import * as cdk from "aws-cdk-lib";
import * as cdkContructs from 'constructs';
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as nag from "cdk-nag";

export interface MyChainNodeSecurityGroupConstructProps {
    vpc: cdk.aws_ec2.IVpc;
    mychainRpcPort: number;
}

export class MyChainNodeSecurityGroupConstruct extends cdkContructs.Construct {
  public securityGroup: cdk.aws_ec2.ISecurityGroup;

  constructor(scope: cdkContructs.Construct, id: string, props: MyChainNodeSecurityGroupConstructProps) {
    super(scope, id);

    const {
      vpc,
      mychainRpcPort,
    } = props;

    const sg = new ec2.SecurityGroup(this, `rpc-node-security-group`, {
      vpc,
      description: "Security Group for Blockchain nodes",
      allowAllOutbound: true,
    });

    // Private ports restricted only to the VPC IP range
    sg.addIngressRule(ec2.Peer.ipv4(vpc.vpcCidrBlock), ec2.Port.tcp(mychainRpcPort), "RPC port HTTP (user access needs to be restricted. Allowed access only from internal IPs)");
    this.securityGroup = sg

    /**
     * cdk-nag suppressions
     */
    nag.NagSuppressions.addResourceSuppressions(
      this,
      [
          {
              id: "AwsSolutions-EC23",
              reason: "Need to use wildcard for P2P ports",
          },
      ],
      true
    );
  }
}
