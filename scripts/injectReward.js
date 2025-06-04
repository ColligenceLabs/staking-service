const cron = require("node-cron");
const { ethers, utils } = require("ethers");
// const { BigNumber } = require("bignumber.js");
const {
  StakeWeight,
  StakingRewardDistributor,
  RPC_URLS,
} = require("../config/config");
const { time } = require("@nomicfoundation/hardhat-network-helpers");
const weightAbi =
  require("../artifacts/src/StakeWeight.sol/StakeWeight.json").abi;
const rewardAbi =
  require("../artifacts/src/StakingRewardDistributor.sol/StakingRewardDistributor.json").abi;

require("dotenv").config();

const provider = new ethers.JsonRpcProvider(RPC_URLS[11155111]);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const stakeWeight = new ethers.Contract(StakeWeight, weightAbi, wallet);
const stakingRewardDistributor = new ethers.Contract(
  StakingRewardDistributor,
  rewardAbi,
  wallet,
);

async function claim(user) {
  let tx = await stakingRewardDistributor.claim(user, {
    gasLimit: 1000000,
  });
  let receipt = await tx.wait();
  console.log("checkpointTotalSupply \t:", tx.hash, receipt.status);
}

async function checkpoint() {
  let tx = await stakingRewardDistributor.checkpointTotalSupply({
    gasLimit: 1000000,
  });
  let receipt = await tx.wait();
  console.log("checkpointTotalSupply \t:", tx.hash, receipt.status);

  tx = await stakingRewardDistributor.checkpointToken({ gasLimit: 1000000 });
  receipt = await tx.wait();
  console.log("checkpointToken \t:", tx.hash, receipt.status);

  // const user = await wallet.getAddress();
  // claim(user);;
}

async function injectReward(timestamp, flag = false) {
  if (flag) await checkpoint();

  let min = 0;
  let max = Number(await stakeWeight.epoch());
  // Loop for 128 times -> enough for 128-bit numbers
  for (let i = 0; i < 128; i++) {
    if (min >= max) {
      break;
    }
    let mid = Math.floor((min + max + 1) / 2);
    const point = await stakeWeight.pointHistory(mid);
    if (Number(point[2]) <= timestamp) {
      min = mid;
    } else {
      max = mid - 1;
    }
  }
  console.log("_findTimestampEpoch : ", min);

  const pointHistory = await stakeWeight.pointHistory(min);
  if (Number(pointHistory[2]) === timestamp) {
    const lockedAmount = pointHistory[1] * BigInt("752399"); // MAX_LOCK_CAP;
    console.log(
      `>> Locked Amount at ${timestamp} : ${parseFloat(ethers.formatEther(lockedAmount)).toFixed(2)}`,
    );

    // TODO : 개발기 시간 단위 지급 경우, APY 20%, APR 18.2%
    const reward = (lockedAmount * BigInt("182")) / BigInt("1000");
    // TODO : 상용기 주단위 지급 경우, APY 20%, APR 18.23%
    // const reward = (lockedAmount * BigInt("1823")) / BigInt("10000");

    console.log(
      `>> Reward needed ${timestamp} : ${parseFloat(ethers.formatEther(reward.toString())).toFixed(2)}`,
    );

    // TODO : send TALK for rewards automatically
    // await stakingRewardDistributor.injectReward(timestamp, reward);
  } else {
    console.log("timestamp not matched. run at next epoch !!");
  }
  return min;
}

const task = cron.schedule("5 * * * *", async () => {
  // TODO : 메주 리워드 지급 시점 직후에 계산헤서 넣어두먄 될 듯....
  // 매 주 checkpoint() 실행 후 계산 ?
  const now = Math.floor(Date.now() / 1000);
  const timestamp = Math.floor(now / 3600) * 3600;
  console.log("Timestamp : ", timestamp);

  await injectReward(timestamp, true);
  console.log("\n\n");
});
task.start();
