#!/usr/bin/env node
import 'dotenv/config'
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import * as nag from "cdk-nag";
import * as config from "./lib/config/nearConfig";

import { NearSingleNodeStack } from "./lib/single-node-stack";
import { NearCommonStack } from "./lib/common-stack";
import { NearHANodesStack } from "./lib/ha-nodes-stack";

const app = new cdk.App();
cdk.Tags.of(app).add("Project", "AWSNear");

new NearCommonStack(app, "near-common", {
    stackName: `near-nodes-common`,
    env: { account: config.baseConfig.accountId, region: config.baseConfig.region },
});

new NearSingleNodeStack(app, "near-single-node", {
    stackName: `near-single-node-${config.baseNodeConfig.nodeConfiguration}`,
    env: { account: config.baseConfig.accountId, region: config.baseConfig.region },
    instanceType: config.baseNodeConfig.instanceType,
    instanceCpuType: config.baseNodeConfig.instanceCpuType,
    nearCluster: config.baseNodeConfig.nearCluster,
    nearVersion: config.baseNodeConfig.nearVersion,
    nodeConfiguration: config.baseNodeConfig.nodeConfiguration,
    dataVolume: config.baseNodeConfig.dataVolume,
    accountsVolume: config.baseNodeConfig.accountsVolume,
    nearNodeSecretARN: config.baseNodeConfig.nearNodeSecretARN,
    voteAccountSecretARN: config.baseNodeConfig.voteAccountSecretARN,
    authorizedWithdrawerAccountSecretARN: config.baseNodeConfig.authorizedWithdrawerAccountSecretARN,
    registrationTransactionFundingAccountSecretARN:
        config.baseNodeConfig.registrationTransactionFundingAccountSecretARN,
});

new NearHANodesStack(app, "near-ha-nodes", {
    stackName: `near-ha-nodes-${config.baseNodeConfig.nodeConfiguration}`,
    env: { account: config.baseConfig.accountId, region: config.baseConfig.region },

    instanceType: config.baseNodeConfig.instanceType,
    instanceCpuType: config.baseNodeConfig.instanceCpuType,
    nearCluster: config.baseNodeConfig.nearCluster,
    nearVersion: config.baseNodeConfig.nearVersion,
    nodeConfiguration: config.baseNodeConfig.nodeConfiguration,
    dataVolume: config.baseNodeConfig.dataVolume,
    accountsVolume: config.baseNodeConfig.accountsVolume,

    albHealthCheckGracePeriodMin: config.haNodeConfig.albHealthCheckGracePeriodMin,
    heartBeatDelayMin: config.haNodeConfig.heartBeatDelayMin,
    numberOfNodes: config.haNodeConfig.numberOfNodes,
});


// Security Check
cdk.Aspects.of(app).add(
    new nag.AwsSolutionsChecks({
        verbose: false,
        reports: true,
        logIgnores: false,
    })
);
