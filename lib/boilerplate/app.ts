#!/usr/bin/env node
import 'dotenv/config'
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import * as nag from "cdk-nag";
import * as config from "./lib/config/mychainConfig";

import { MyChainSingleNodeStack } from "./lib/single-node-stack";
import { MyChainCommonStack } from "./lib/common-stack";
import { MyChainHANodesStack } from './lib/ha-nodes-stack';

const app = new cdk.App();
cdk.Tags.of(app).add("Project", "Node Runner"); // DON'T TOUCH
cdk.Tags.of(app).add("Blockchain", "MyChain");

new MyChainCommonStack(app, "mychain-common", {
    stackName: `mychain-nodes-common`,
    env: { account: config.baseConfig.accountId, region: config.baseConfig.region },
});

new MyChainSingleNodeStack(app, "mychain-single-node", {
    stackName: `mychain-single-node-${config.baseNodeConfig.mychainNodeConfiguration}`,
    env: { account: config.baseConfig.accountId, region: config.baseConfig.region },
    ...config.baseNodeConfig
});

new MyChainHANodesStack(app, "mychain-ha-nodes", {
    stackName: `mychain-ha-nodes-${config.baseNodeConfig.mychainNodeConfiguration}`,
    env: { account: config.baseConfig.accountId, region: config.baseConfig.region },
    ...config.baseNodeConfig,
    ...config.haNodeConfig
});

// Security Check
cdk.Aspects.of(app).add(
    new nag.AwsSolutionsChecks({
        verbose: false,
        reports: true,
        logIgnores: false,
    })
);
