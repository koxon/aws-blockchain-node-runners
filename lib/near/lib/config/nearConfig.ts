import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as configTypes from "./nearConfig.interface";
import * as constants from "../../../constructs/constants";


const parseDataVolumeType = (dataVolumeType: string) => {
    switch (dataVolumeType) {
        case "gp3":
            return ec2.EbsDeviceVolumeType.GP3;
        case "io2":
            return ec2.EbsDeviceVolumeType.IO2;
        case "io1":
            return ec2.EbsDeviceVolumeType.IO1;
        case "instance-store":
            return constants.InstanceStoreageDeviceVolumeType;
        default:
            return ec2.EbsDeviceVolumeType.GP3;
    }
}

export const baseConfig: configTypes.NearBaseConfig = {
    accountId: process.env.AWS_ACCOUNT_ID || "552389609561",
    region: process.env.AWS_REGION || "us-east-1",
};

export const baseNodeConfig: configTypes.NearBaseNodeConfig = {
    instanceType: new ec2.InstanceType(process.env.NEAR_INSTANCE_TYPE ? process.env.NEAR_INSTANCE_TYPE : "r6a.8xlarge"),
    instanceCpuType:
        process.env.NEAR_CPU_TYPE?.toLowerCase() == "x86_64"
            ? ec2.AmazonLinuxCpuType.X86_64
            : ec2.AmazonLinuxCpuType.ARM_64,
    nearCluster: <configTypes.NearCluster>process.env.NEAR_CLUSTER || "mainnet-beta",
    nearVersion: process.env.NEAR_VERSION || "2.11",
    nodeConfiguration: <configTypes.NearNodeConfiguration>process.env.NEAR_NODE_CONFIGURATION || "baserpc",
    dataVolume: {
        sizeGiB: process.env.NEAR_DATA_VOL_SIZE ? parseInt(process.env.NEAR_DATA_VOL_SIZE) : 2000,
        type: parseDataVolumeType(
            process.env.NEAR_DATA_VOL_TYPE?.toLowerCase() ? process.env.NEAR_DATA_VOL_TYPE?.toLowerCase() : "gp3"
        ),
        iops: process.env.NEAR_DATA_VOL_IOPS ? parseInt(process.env.NEAR_DATA_VOL_IOPS) : 12000,
        throughput: process.env.NEAR_DATA_VOL_THROUGHPUT ? parseInt(process.env.NEAR_DATA_VOL_THROUGHPUT) : 700,
    },
    accountsVolume: {
        sizeGiB: process.env.NEAR_ACCOUNTS_VOL_SIZE ? parseInt(process.env.NEAR_ACCOUNTS_VOL_SIZE) : 500,
        type: parseDataVolumeType(
            process.env.NEAR_ACCOUNTS_VOL_TYPE?.toLowerCase()
                ? process.env.NEAR_ACCOUNTS_VOL_TYPE?.toLowerCase()
                : "gp3"
        ),
        iops: process.env.NEAR_ACCOUNTS_VOL_IOPS ? parseInt(process.env.NEAR_ACCOUNTS_VOL_IOPS) : 6000,
        throughput: process.env.NEAR_ACCOUNTS_VOL_THROUGHPUT ? parseInt(process.env.NEAR_ACCOUNTS_VOL_THROUGHPUT) : 700,
    },
    nearNodeSecretARN: process.env.NEAR_NODE_IDENTITY_SECRET_ARN || "none",
    voteAccountSecretARN: process.env.NEAR_VOTE_ACCOUNT_SECRET_ARN || "none",
    authorizedWithdrawerAccountSecretARN: process.env.NEAR_AUTHORIZED_WITHDRAWER_ACCOUNT_SECRET_ARN || "none",
    registrationTransactionFundingAccountSecretARN: process.env.NEAR_REGISTRATION_TRANSACTION_FUNDING_ACCOUNT_SECRET_ARN || "none",
};

export const haNodeConfig: configTypes.NearHAConfig = {
    albHealthCheckGracePeriodMin: process.env.NEAR_HA_ALB_HEALTHCHECK_GRACE_PERIOD_MIN ? parseInt(process.env.NEAR_HA_ALB_HEALTHCHECK_GRACE_PERIOD_MIN) : 10,
    heartBeatDelayMin: process.env.NEAR_HA_NODES_HEARTBEAT_DELAY_MIN ? parseInt(process.env.NEAR_HA_NODES_HEARTBEAT_DELAY_MIN) : 40,
    numberOfNodes: process.env.NEAR_HA_NUMBER_OF_NODES ? parseInt(process.env.NEAR_HA_NUMBER_OF_NODES) : 2,
};
