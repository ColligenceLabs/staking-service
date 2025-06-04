const { ethers, upgrades } = require("hardhat");
const fs = require("fs");

async function upgradeStakeWeight(StakeWeight) {
  const V2Factory = await ethers.getContractFactory("StakeWeightV2");
  const v2Factory = await upgrades.upgradeProxy(StakeWeight, V2Factory);
  console.log("StakeWeight upgraded : ", await v2Factory.getAddress());
}

async function upgradeStakingRewardDistributor(StakingRewardDistributor) {
  const V2Factory = await ethers.getContractFactory(
    "StakingRewardDistributorV2",
  );
  const v2Factory = await upgrades.upgradeProxy(
    StakingRewardDistributor,
    V2Factory,
  );
  console.log(
    "StakingRewardDistributor upgraded : ",
    await v2Factory.getAddress(),
  );
}

async function main() {
  const deployments = JSON.parse(fs.readFileSync("deployments.json", "utf8"));

  await upgradeStakeWeight(deployments.StakeWeight);
  await upgradeStakingRewardDistributor(deployments.StakingRewardDistributor);
}

main();
