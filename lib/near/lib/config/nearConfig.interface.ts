import * as configTypes from "../../../constructs/config.interface";

export type NearCluster = "mainnet" | "testnet" | "localnet";
export type NearNodeConfiguration = "validator" | "rpc" | "archive";

export interface NearDataVolumeConfig extends configTypes.DataVolumeConfig {
}

export interface NearAccountsVolumeConfig extends configTypes.DataVolumeConfig {
}

export interface NearBaseConfig extends configTypes.BaseConfig {
}

export interface NearBaseNodeConfig extends configTypes.BaseNodeConfig {
    nearCluster: NearCluster;
    nearVersion: string;
    nodeConfiguration: NearNodeConfiguration;
    dataVolume: NearDataVolumeConfig;
    accountsVolume: NearAccountsVolumeConfig;
    nearNodeSecretARN: string;
    voteAccountSecretARN: string;
    authorizedWithdrawerAccountSecretARN: string;
    registrationTransactionFundingAccountSecretARN: string;
}

export interface NearHAConfig {
    albHealthCheckGracePeriodMin: number;
    heartBeatDelayMin: number;
    numberOfNodes: number;
}
