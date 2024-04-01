import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as configTypes from "./mychainConfig.interface";
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

export const baseConfig: configTypes.MyChainBaseConfig = {
    accountId: process.env.AWS_ACCOUNT_ID || "xxxxxxxxxxx",
    region: process.env.AWS_REGION || "us-east-2",
}

export const baseNodeConfig: configTypes.MyChainBaseNodeConfig = {
    instanceType: new ec2.InstanceType(process.env.MYCHAIN_INSTANCE_TYPE ? process.env.MYCHAIN_INSTANCE_TYPE : "r6a.8xlarge"),
    instanceCpuType: process.env.MYCHAIN_CPU_TYPE?.toLowerCase() == "x86_64" ? ec2.AmazonLinuxCpuType.X86_64 : ec2.AmazonLinuxCpuType.ARM_64,
    mychainCluster: <configTypes.MyChainCluster> process.env.MYCHAIN_CLUSTER || "mainnet-beta",
    mychainVersion: process.env.MYCHAIN_VERSION || "1.16.15",
    nodeConfiguration: <configTypes.MyChainNodeConfiguration> process.env.MYCHAIN_NODE_CONFIGURATION || "baserpc",
    dataVolume: {
        sizeGiB: process.env.MYCHAIN_DATA_VOL_SIZE ? parseInt(process.env.MYCHAIN_DATA_VOL_SIZE): 2000,
        type: parseDataVolumeType(process.env.MYCHAIN_DATA_VOL_TYPE?.toLowerCase() ? process.env.MYCHAIN_DATA_VOL_TYPE?.toLowerCase() : "gp3"),
        iops: process.env.MYCHAIN_DATA_VOL_IOPS ? parseInt(process.env.MYCHAIN_DATA_VOL_IOPS): 12000,
        throughput: process.env.MYCHAIN_DATA_VOL_THROUGHPUT ? parseInt(process.env.MYCHAIN_DATA_VOL_THROUGHPUT): 700,
    },
    accountsVolume: {
        sizeGiB: process.env.MYCHAIN_ACCOUNTS_VOL_SIZE ? parseInt(process.env.MYCHAIN_ACCOUNTS_VOL_SIZE): 500,
        type: parseDataVolumeType(process.env.MYCHAIN_ACCOUNTS_VOL_TYPE?.toLowerCase() ? process.env.MYCHAIN_ACCOUNTS_VOL_TYPE?.toLowerCase() : "gp3"),
        iops: process.env.MYCHAIN_ACCOUNTS_VOL_IOPS ? parseInt(process.env.MYCHAIN_ACCOUNTS_VOL_IOPS): 6000,
        throughput: process.env.MYCHAIN_ACCOUNTS_VOL_THROUGHPUT ? parseInt(process.env.MYCHAIN_ACCOUNTS_VOL_THROUGHPUT): 700,
    },
    mychainNodeIdentitySecretARN: process.env.MYCHAIN_NODE_IDENTITY_SECRET_ARN || "none",
    voteAccountSecretARN: process.env.MYCHAIN_VOTE_ACCOUNT_SECRET_ARN || "none",
    authorizedWithdrawerAccountSecretARN: process.env.MYCHAIN_AUTHORIZED_WITHDRAWER_ACCOUNT_SECRET_ARN || "none",
    registrationTransactionFundingAccountSecretARN: process.env.MYCHAIN_REGISTRATION_TRANSACTION_FUNDING_ACCOUNT_SECRET_ARN || "none",
};

export const haNodeConfig: configTypes.MyChainHAConfig = {
    albHealthCheckGracePeriodMin: process.env.MYCHAIN_HA_ALB_HEALTHCHECK_GRACE_PERIOD_MIN ? parseInt(process.env.MYCHAIN_HA_ALB_HEALTHCHECK_GRACE_PERIOD_MIN) : 10,
    heartBeatDelayMin: process.env.MYCHAIN_HA_NODES_HEARTBEAT_DELAY_MIN ? parseInt(process.env.MYCHAIN_HA_NODES_HEARTBEAT_DELAY_MIN) : 40,
    numberOfNodes: process.env.MYCHAIN_HA_NUMBER_OF_NODES ? parseInt(process.env.MYCHAIN_HA_NUMBER_OF_NODES) : 2,
};
