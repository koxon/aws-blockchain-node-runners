#!/bin/bash
set +e

echo "AWS_REGION=${_AWS_REGION_}" >> /etc/environment
echo "ASSETS_S3_PATH=${_ASSETS_S3_PATH_}" >> /etc/environment
echo "STACK_NAME=${_STACK_NAME_}" >> /etc/environment
echo "STACK_ID=${_STACK_ID_}" >> /etc/environment
echo "RESOURCE_ID=${_NODE_CF_LOGICAL_ID_}" >> /etc/environment
echo "ACCOUNTS_VOLUME_TYPE=${_ACCOUNTS_VOLUME_TYPE_}" >> /etc/environment
echo "ACCOUNTS_VOLUME_SIZE=${_ACCOUNTS_VOLUME_SIZE_}" >> /etc/environment
echo "DATA_VOLUME_TYPE=${_DATA_VOLUME_TYPE_}" >> /etc/environment
echo "DATA_VOLUME_SIZE=${_DATA_VOLUME_SIZE_}" >> /etc/environment
echo "NEAR_VERSION=${_NEAR_VERSION_}" >> /etc/environment
echo "NEAR_NODE_TYPE=${_NEAR_NODE_TYPE_}" >> /etc/environment
echo "NEAR_NODE_IDENTITY_SECRET_ARN=${_NEAR_NODE_IDENTITY_SECRET_ARN_}" >> /etc/environment
echo "NEAR_CLUSTER=${_NEAR_CLUSTER_}" >> /etc/environment
echo "LIFECYCLE_HOOK_NAME=${_LIFECYCLE_HOOK_NAME_}" >> /etc/environment
echo "ASG_NAME=${_ASG_NAME_}" >> /etc/environment
echo "NEAR_ENV=${_NEAR_NODE_TYPE_}" >> /etc/environment
source /etc/environment

lscpu | grep -P '(?=.*avx )(?=.*sse4.2 )(?=.*cx16 )(?=.*popcnt )' > /dev/null \
  && echo "Instance Supported" \
  || ( echo "Instance Not supported" && exit )

echo "Installing dependencies"
sudo apt-get -yqq update
sudo apt install -y git curl unzip python3-pip build-essential binutils-dev libcurl4-openssl-dev zlib1g-dev libdw-dev libiberty-dev cmake gcc g++ python docker.io protobuf-compiler libssl-dev pkg-config clang llvm cargo awscli

cd /opt
echo "In /opt"
ls -la 

# Installing RUST
export HOME=/root/
echo "Installing RUST"
sudo curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs > /tmp/rustup-init.sh
chmod +x /tmp/rustup-init.sh
/tmp/rustup-init.sh -y
source "$HOME/.cargo/env"

echo "Downloading assets zip file"
aws s3 cp $ASSETS_S3_PATH ./assets.zip --region $AWS_REGION
unzip -q assets.zip

echo "Install and configure CloudWatch agent"
wget -q https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i -E amazon-cloudwatch-agent.deb

echo 'Configuring CloudWatch Agent'
mkdir -p /opt/aws/amazon-cloudwatch-agent/etc/
cp /opt/cw-agent.json /opt/aws/amazon-cloudwatch-agent/etc/custom-amazon-cloudwatch-agent.json

echo "Starting CloudWatch Agent"
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
-a fetch-config -c file:/opt/aws/amazon-cloudwatch-agent/etc/custom-amazon-cloudwatch-agent.json -m ec2 -s
systemctl status amazon-cloudwatch-agent

echo "Fine tune sysctl to prepare the system for Near"
sudo bash -c "cat >/etc/sysctl.d/20-near-additionals.conf <<EOF
kernel.hung_task_timeout_secs=600
vm.stat_interval=10
vm.dirty_ratio=40
vm.dirty_background_ratio=10
vm.dirty_expire_centisecs=36000
vm.dirty_writeback_centisecs=3000
vm.dirtytime_expire_seconds=43200
kernel.timer_migration=0
kernel.pid_max=65536
net.ipv4.tcp_fastopen=3
fs.nr_open = 1000000
EOF"

sudo bash -c "cat >/etc/sysctl.d/20-near-mmaps.conf <<EOF
# Increase memory mapped files limit
vm.max_map_count = 1000000
EOF"

sudo bash -c "cat >/etc/sysctl.d/20-near-udp-buffers.conf <<EOF
# Increase UDP buffer size
net.core.rmem_default = 134217728
net.core.rmem_max = 134217728
net.core.wmem_default = 134217728
net.core.wmem_max = 134217728
EOF"

sudo bash -c "echo 'DefaultLimitNOFILE=1000000' >> /etc/systemd/system.conf"

sudo sysctl -p /etc/sysctl.d/20-near-mmaps.conf
sudo sysctl -p /etc/sysctl.d/20-near-udp-buffers.conf
sudo sysctl -p /etc/sysctl.d/20-near-additionals.conf

sudo systemctl daemon-reload

sudo bash -c "cat >/etc/security/limits.d/90-near-nofiles.conf <<EOF
# Increase process file descriptor count limit
* - nofile 1000000
EOF"

echo 'Preparing fs for Near installation'
sudo mkdir /var/near
sudo mkdir /var/near/data
sudo mkdir /var/near/accounts

if [[ "$STACK_ID" != "none" ]]; then
  echo "Install CloudFormation helper scripts"
  mkdir -p /opt/aws/
  pip3 install https://s3.amazonaws.com/cloudformation-examples/aws-cfn-bootstrap-py3-latest.tar.gz
  sudo ln -s /usr/local/init/ubuntu/cfn-hup /etc/init.d/cfn-hup

  echo "Configuring CloudFormation helper scripts"
  mkdir -p /etc/cfn/
  mv /opt/cfn-hup/cfn-hup.conf /etc/cfn/cfn-hup.conf
  sed -i "s;__AWS_STACK_ID__;\"$STACK_ID\";g" /etc/cfn/cfn-hup.conf
  sed -i "s;__AWS_REGION__;\"$AWS_REGION\";g" /etc/cfn/cfn-hup.conf

  mkdir -p /etc/cfn/hooks.d/
  mv /opt/cfn-hup/cfn-auto-reloader.conf /etc/cfn/hooks.d/cfn-auto-reloader.conf
  sed -i "s;__AWS_STACK_NAME__;\"$STACK_NAME\";g" /etc/cfn/hooks.d/cfn-auto-reloader.conf
  sed -i "s;__AWS_REGION__;\"$AWS_REGION\";g" /etc/cfn/hooks.d/cfn-auto-reloader.conf

  echo "Starting CloudFormation helper scripts as a service"
  mv /opt/cfn-hup/cfn-hup.service /etc/systemd/system/cfn-hup.service

  systemctl daemon-reload
  systemctl enable --now cfn-hup
  systemctl start cfn-hup.service

  cfn-signal --stack $STACK_NAME --resource $RESOURCE_ID --region $AWS_REGION
fi

echo "Waiting for volumes to be available"
sleep 60

if [[ "$DATA_VOLUME_TYPE" == "instance-store" ]]; then
  echo "Data volume type is instance store"

  cd /opt
  sudo chmod +x /opt/setup-instance-store-volumes.sh

  (crontab -l; echo "@reboot /opt/setup-instance-store-volumes.sh >/tmp/setup-instance-store-volumes.log 2>&1") | crontab -
  crontab -l

  sudo /opt/setup-instance-store-volumes.sh

else
  echo "Data volume type is EBS"

  DATA_VOLUME_ID=/dev/$(lsblk -lnb | awk -v VOLUME_SIZE_BYTES="$DATA_VOLUME_SIZE" '{if ($4== VOLUME_SIZE_BYTES) {print $1}}')
  sudo mkfs -t xfs $DATA_VOLUME_ID
  sleep 10
  DATA_VOLUME_UUID=$(lsblk -fn -o UUID  $DATA_VOLUME_ID)
  DATA_VOLUME_FSTAB_CONF="UUID=$DATA_VOLUME_UUID /var/near/data xfs defaults 0 2"
  echo "DATA_VOLUME_ID="$DATA_VOLUME_ID
  echo "DATA_VOLUME_UUID="$DATA_VOLUME_UUID
  echo "DATA_VOLUME_FSTAB_CONF="$DATA_VOLUME_FSTAB_CONF
  echo $DATA_VOLUME_FSTAB_CONF | sudo tee -a /etc/fstab
  sudo mount -a
fi

if [[ "$ACCOUNTS_VOLUME_TYPE" == "instance-store" ]]; then
  echo "Accounts volume type is instance store"

  if [[ "$DATA_VOLUME_TYPE" != "instance-store" ]]; then
    cd /opt

    sudo chmod +x /opt/setup-instance-store-volumes.sh

    (crontab -l; echo "@reboot /opt/setup-instance-store-volumes.sh >/tmp/setup-instance-store-volumes.log 2>&1") | crontab -
    crontab -l

    sudo /opt/setup-instance-store-volumes.sh

  else
    echo "Data and Accounts volumes are instance stores and should be both configured by now"
  fi

else
  echo "Accounts volume type is EBS"
  ACCOUNTS_VOLUME_ID=/dev/$(lsblk -lnb | awk -v VOLUME_SIZE_BYTES="$ACCOUNTS_VOLUME_SIZE" '{if ($4 == VOLUME_SIZE_BYTES) {print $1}}')
  sudo mkfs -t xfs $ACCOUNTS_VOLUME_ID
  sleep 10
  ACCOUNTS_VOLUME_UUID=$(lsblk -fn -o UUID $ACCOUNTS_VOLUME_ID)
  ACCOUNTS_VOLUME_FSTAB_CONF="UUID=$ACCOUNTS_VOLUME_UUID /var/near/accounts xfs defaults 0 2"
  echo "ACCOUNTS_VOLUME_ID="$ACCOUNTS_VOLUME_ID
  echo "ACCOUNTS_VOLUME_UUID="$ACCOUNTS_VOLUME_UUID
  echo "ACCOUNTS_VOLUME_FSTAB_CONF="$ACCOUNTS_VOLUME_FSTAB_CONF
  echo $ACCOUNTS_VOLUME_FSTAB_CONF | sudo tee -a /etc/fstab

  sudo mount -a
fi

sudo mkdir /var/near/data/ledger

echo 'Adding near user and group'
sudo groupadd -g 1002 near
sudo useradd -u 1002 -g 1002 -m -s /bin/bash near
sudo usermod -aG sudo near

cd /home/near
sudo mkdir ./bin

ln -s /var/near/data/ledger /home/near

# if [[ $NODE_IDENTITY_SECRET_ARN == "none" ]]; then
#     echo "Create node identity"
#     sudo ./near-keygen new --no-passphrase -o /home/near/config/validator-keypair.json
# else
#     echo "Get node identity from AWS Secrets Manager"
#     sudo aws secretsmanager get-secret-value --secret-id $NODE_IDENTITY_SECRET_ARN --query SecretString --output text --region $AWS_REGION > ~/validator-keypair.json
#     sudo mv ~/validator-keypair.json /home/near/config/validator-keypair.json
# fi

if [[ "$NEAR_NODE_TYPE" == "validator" ]]; then
  echo "Getting Validator secrets from Secret Manager"
  # Make sure you edit your NEAR key correctly as mentioned in the NEAR documentation
  sudo aws secretsmanager get-secret-value --secret-id $NEAR_NODE_IDENTITY_SECRET_ARN --query SecretString --output text --region $AWS_REGION > /home/near/validator_key.json
fi

cfn-signal --stack $STACK_NAME --resource $RESOURCE_ID --region $AWS_REGION

sudo chown -R near:near /var/near
sudo chown -R near:near /home/near

# Setup NEAR CLI
echo "Installing NodeJS"
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | sudo tee /etc/apt/sources.list.d/nodesource.list
sudo apt-get update
sudo apt-get install nodejs -y
sudo apt-get install npm -y
sudo npm install -g near-cli

cfn-signal --stack $STACK_NAME --resource $RESOURCE_ID --region $AWS_REGION

# Getting node code
echo "Downloading source for NEAR version $NEAR_VERSION"
git clone https://github.com/near/nearcore
echo "Preparing NEAR start script"
cd /home/near/nearcore/
git checkout master
# compiling Near
make release
/home/near/nearcore/target/release/neard --home /home/near init --chain-id $NEAR_NODE_TYPE --download-genesis --download-config

cfn-signal --stack $STACK_NAME --resource $RESOURCE_ID --region $AWS_REGION

# Updating the config file
sudo rm /home/near/config.json
sudo wget https://s3-us-west-1.amazonaws.com/build.nearprotocol.com/nearcore-deploy/$NEAR_CLUSTER/config.json -P /home/near/

# echo "Getting NEAR Archive from S3"
# aws s3 --no-sign-request cp s3://near-protocol-public/backups/$NEAR_CLUSTER/rpc/latest .
# latest=$(cat latest)
# aws s3 --no-sign-request cp --no-sign-request --recursive s3://near-protocol-public/backups/$NEAR_CLUSTER/rpc/$latest /home/near/data

cfn-signal --stack $STACK_NAME --resource $RESOURCE_ID --region $AWS_REGION

if [[ "$NEAR_NODE_TYPE" == "rpc" ]]; then
  echo "Starting near RPC node as a service"
  sudo bash -c 'cat > /etc/systemd/system/near.service <<EOF
  [Unit]
  Description=Near $NEAR_NODE_TYPE
  After=network.target
  StartLimitIntervalSec=0
  [Service]
  Type=simple
  Restart=always
  RestartSec=1
  User=near
  LimitNOFILE=1000000
  LogRateLimitIntervalSec=0
  Environment="PATH=/bin:/usr/bin:/home/near/bin"
  ExecStart=/home/near/nearcore/target/release/neard --home /home/near run
  [Install]
  WantedBy=multi-user.target
  EOF'
fi

sudo systemctl daemon-reload
sudo systemctl enable --now near

echo 'Configuring logrotate to rotate Near logs'
sudo bash -c 'sudo cat > logrotate.near <<EOF
/home/near/near-rpc.log {
  rotate 7
  daily
  missingok
  postrotate
  systemctl kill -s USR1 near.service
  endscript
}
EOF'

cfn-signal --stack $STACK_NAME --resource $RESOURCE_ID --region $AWS_REGION

sudo cp logrotate.near /etc/logrotate.d/near
sudo systemctl restart logrotate.service

echo "Configuring syncchecker script"
cd /opt
sudo mv /opt/sync-checker/syncchecker-near.sh /opt/syncchecker.sh
sudo chmod +x /opt/syncchecker.sh

(crontab -l; echo "*/1 * * * * /opt/syncchecker.sh >/tmp/syncchecker.log 2>&1") | crontab -
crontab -l

if [[ "$LIFECYCLE_HOOK_NAME" != "none" ]]; then
  echo "Signaling ASG lifecycle hook to complete"
  TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")
  INSTANCE_ID=$(curl -H "X-aws-ec2-metadata-token: $TOKEN" -s http://169.254.169.254/latest/meta-data/instance-id)
  aws autoscaling complete-lifecycle-action --lifecycle-action-result CONTINUE --instance-id $INSTANCE_ID --lifecycle-hook-name "$LIFECYCLE_HOOK_NAME" --auto-scaling-group-name "$ASG_NAME"  --region $AWS_REGION
fi

echo "All Done!!"
