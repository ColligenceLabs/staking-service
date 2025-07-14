const { ethers, upgrades } = require("hardhat");
const { RPC_URLS } = require("../config/config");
const fs = require("fs");

const configAbi =
  require("../artifacts/src/TalkenStakingConfig.sol/TalkenStakingConfig.json").abi;

require("dotenv").config();

const cursor = process.env.TARGET_NETWORK === "1" ? 3600 * 24 * 7 : 3600; // Mainnet = 1 weeks, Testnet = 1 hours
// const talkAddress = "0x1cc20f446679cf79436cC8d5F6c3EB60B1954463";
const talkAddress = "0xCAabCaA4ca42e1d86dE1a201c818639def0ba7A7";

const provider = new ethers.JsonRpcProvider(
  RPC_URLS[process.env.TARGET_NETWORK],
);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const admin = wallet.address;
console.log("");
console.log("!! signer addr =", wallet.address);
console.log("");

const setup = async (configAddress, pauserAddress, weightAddress) => {
  const configContract = new ethers.Contract(configAddress, configAbi, wallet);

  try {
    // let tx = await configContract.updatePauser(pauserAddress);
    // let receipt = await tx.wait();
    // console.log("updatePauser \t\t:", tx.hash, receipt.status);
    //
    // tx = await configContract.updateStakeWeight(weightAddress);
    // receipt = await tx.wait();
    // console.log("updateStakeWeight \t:", tx.hash, receipt.status);

    tx = await configContract.updateTalken(talkAddress);
    receipt = await tx.wait();
    console.log("updateTalken \t\t:", tx.hash, receipt.status);
  } catch (error) {
    console.log("!! error =", error.message);
  }
};

async function main() {
  // // 1. Pauser.sol
  // const PauserFactory = await ethers.getContractFactory("Pauser");
  // const pauserFactory = await upgrades.deployProxy(
  //   PauserFactory,
  //   [[admin, admin]],
  //   {
  //     initializer: "initialize",
  //   },
  // );
  // await pauserFactory.waitForDeployment();
  //
  // const pauserAddress = await pauserFactory.getAddress();
  // console.log("Pauser \t\t\t:", pauserAddress);
  //
  // // 2.TalkenStakingConfig.sol
  // const ConfigFactory = await ethers.getContractFactory("TalkenStakingConfig");
  // const configFactory = await upgrades.deployProxy(ConfigFactory, [[admin]], {
  //   initializer: "initialize",
  // });
  // await configFactory.waitForDeployment();
  //
  // const configAddress = await configFactory.getAddress();
  // console.log("TalkenStakingConfig \t:", configAddress);
  //
  // // 3. StakeWeight.sol
  // const WeightFactory = await ethers.getContractFactory("StakeWeight");
  // const weightFactory = await upgrades.deployProxy(
  //   WeightFactory,
  //   [[admin, configAddress]],
  //   {
  //     initializer: "initialize",
  //   },
  // );
  // await weightFactory.waitForDeployment();
  //
  // const weightAddress = await weightFactory.getAddress();
  // console.log("StakeWeight \t\t:", weightAddress);
  //
  // // 4.StakingRewardDistributor.sol
  // const now = Math.floor(Date.now() / 1000);
  // const timestamp = Math.floor(now / cursor) * cursor;
  // console.log("timestamp \t\t:", timestamp);
  //
  // const RewardFactory = await ethers.getContractFactory(
  //   "StakingRewardDistributor",
  // );
  // const rewardFactory = await upgrades.deployProxy(
  //   RewardFactory,
  //   [[admin, timestamp, admin, configAddress]],
  //   {
  //     initializer: "initialize",
  //   },
  // );
  // await rewardFactory.waitForDeployment();
  //
  // const rewardAddress = await rewardFactory.getAddress();
  // console.log("StakingRewardDistributor \t:", rewardAddress);

  // 5. Setup Contracts
  console.log("");
  // await setup(configAddress, pauserAddress, weightAddress);
  await setup(
    "0x0DdDFcEc18e4aC928723FbEBCFE46CB2037C2360",
    "0x70978E9ba33Cc766FC50684c97B6Cd0F2De5531a",
    "0x6Bc0bA397C6f633b3002113EA2C432CF8268986C",
  );
  console.log("");

  // 6. Store deployments
  const deployments = {
    StakeWeight: weightAddress,
    StakingRewardDistributor: rewardAddress,
  };
  fs.writeFileSync("deployments.json", JSON.stringify(deployments, null, 2));
}

main();
