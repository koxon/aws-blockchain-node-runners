import * as configTypes from "../../../constructs/config.interface";

// Values are examples
export type MyChainCluster = "mainnet" | "testnet" | "devnet";
export type MyChainNodeConfiguration = "validator" | "archive" | "rpc";
export type MyChainRpcPort = 11111; 

export interface MyChainDataVolumeConfig extends configTypes.DataVolumeConfig {
}

export interface MyChainAccountsVolumeConfig extends configTypes.DataVolumeConfig {
}

export interface MyChainBaseConfig extends configTypes.BaseConfig {
}

export interface MyChainBaseNodeConfig extends configTypes.BaseNodeConfig {
    mychainCluster: MyChainCluster;
    mychainRpcPort: MyChainRpcPort;
    mychainVersion: string;
    nodeConfiguration: MyChainNodeConfiguration;
    dataVolume: MyChainDataVolumeConfig;
    accountsVolume: MyChainAccountsVolumeConfig;
    mychainNodeIdentitySecretARN: string;
    voteAccountSecretARN: string;
    authorizedWithdrawerAccountSecretARN: string;
    registrationTransactionFundingAccountSecretARN: string;
}

export interface MyChainHAConfig {
    albHealthCheckGracePeriodMin: number;
    heartBeatDelayMin: number;
    numberOfNodes: number;
}
