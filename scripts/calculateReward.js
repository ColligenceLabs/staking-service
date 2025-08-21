const cron = require("node-cron");
const { ethers, utils } = require("ethers");
// const { BigNumber } = require("bignumber.js");
const {
  StakeWeight,
  StakingRewardDistributor,
  RPC_URLS,
} = require("../config/config");
const { time } = require("@nomicfoundation/hardhat-network-helpers");
const { use } = require("chai");
const weightAbi =
  require("../artifacts/StakeWeight.json").abi;
const rewardAbi =
  require("../artifacts/StakingRewardDistributor.json").abi;

require("dotenv").config();

const provider = new ethers.JsonRpcProvider('https://eth.llamarpc.com');
// const provider = new ethers.JsonRpcProvider();
// const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const stakeWeight = new ethers.Contract(StakeWeight, weightAbi, provider);
const stakingRewardDistributor = new ethers.Contract(
  StakingRewardDistributor,
  rewardAbi,
  provider,
);

sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function toInt128(int256) {
  const mask = (1n << 128n) - 1n;
  return int256 & mask;
}

function toUint256(int128) {
  if (int128 & (1n << 127n)) {
    // Check if negative
    return int128 | ~((1n << 128n) - 1n); // Sign extend
  }
  return int128;
}

async function getRewardInfo(user, timestamp) {
  let balanceOfAtTime = BigInt("0");
  let tokensPerWeek = BigInt("0");
  let totalSupplyAtTime = BigInt("0");

  try {
    // balanceOfAtTime = await stakeWeight.balanceOfAtTime(user, timestamp);
    balanceOfAtTime = await stakingRewardDistributor.balanceOfAt(
      user,
      timestamp,
    );
  } catch (e) {
    // console.log("balanceOfAtTime error : ", e.message);
  }

  try {
    tokensPerWeek = await stakingRewardDistributor.tokensPerWeek(timestamp);
  } catch (e) {
    // console.log("tokensPerWeek error : ", e.message);
  }
  try {
    // totalSupplyAtTime = await stakeWeight.totalSupplyAtTime(timestamp);
    totalSupplyAtTime = await stakingRewardDistributor.totalSupplyAt(timestamp);
  } catch (e) {
    // console.log("totalSupplyAtTime error : ", e.message);
  }
  // console.log(">>> ", {
  //   balanceOfAtTime,
  //   tokensPerWeek,
  //   totalSupplyAtTime,
  // });

  let reward = 0;
  if (totalSupplyAtTime !== BigInt("0")) {
    reward = (balanceOfAtTime * tokensPerWeek) / totalSupplyAtTime;

    console.log(`-- timestamp : ${timestamp} ------------------`);
    console.log("balanceOfAtTime : ", balanceOfAtTime);
    console.log("tokensPerWeek : ", tokensPerWeek);
    console.log("totalSupplyAtTime : ", totalSupplyAtTime);
    console.log("--------------------------------------------");
  }
  return parseFloat(ethers.formatEther(reward));
}

// async function sendTransaction(nonce) {
//   const tx = await contract.mint(nonce); // 1토큰 전송
//   console.log("Transaction hash:", tx.hash);
//
//   const receipt = await tx.wait(); // 블록에 포함될 때까지 대기
//   // console.log('Receipt : ', receipt.logs[0].topics)
//   // console.log('Receipt : ', receipt.events[0].args)
//   console.log("Transaction confirmed in block:", receipt.blockNumber);
//   console.log(
//     "Reward received:",
//     utils.formatEther(receipt.events[0].args.reward),
//   );
// }

async function calculateReward(flag = false) {
  console.log("Calculating reward...");

  if (flag) {
    await checkpoint();
    // await claim(user);
  }

  // const user = await wallet.getAddress();
  // const user = "0x521e21Bf9f930257293887C0575eD2dF714E53b8";
  // const user = "0x1716C4d49E9D81c17608CD9a45b1023ac9DF6c73";
  // const user = "0x1b9b97d05C6e14a46c4B7CA07CbB34b0A1bE1941"; // GiangNV
  const user = "0x1b9b97d05C6e14a46c4B7CA07CbB34b0A1bE1941"; // A user withdrawAll before claim
  const timestamp = parseInt(Date.now() / 1000);
  console.log("user : ", user, timestamp);

  let weekCursor = Number(
    await stakingRewardDistributor.weekCursorOf(
      user,
      // "0x521e21Bf9f930257293887C0575eD2dF714E53b8",
      // "0x1716C4d49E9D81c17608CD9a45b1023ac9DF6c73",
    ),
  );

  const startWeekCursor = Number(
    await stakingRewardDistributor.startWeekCursor(),
  );
  // console.log("startWeekCursor : ", startWeekCursor);

  if (weekCursor === 0) {
    const maxUserEpoch = Number(await stakeWeight.userPointEpoch(user));
    // console.log("maxUserEpoch : ", maxUserEpoch);

    let userEpoch = await _findTimestampUserEpoch(
      user,
      startWeekCursor,
      maxUserEpoch,
    );
    if (userEpoch === 0) {
      userEpoch = 1;
    }
    // console.log("userEpoch : ", userEpoch);

    const userPoint = await stakeWeight.userPointHistory(user, userEpoch);
    // console.log("userPoint : ", userPoint);

    weekCursor =
      parseInt((Number(userPoint[2]) + 604800 - 1) / 604800) * 604800;
  }
  console.log("weekCursor : ", weekCursor);

  // 알고리즘 #1
  let totalReward = 0;
  // while (weekCursor <= timestamp) {
  //   console.log("weekCursor : ", weekCursor);
  //   const reward = await getRewardInfo(user, weekCursor);
  //   totalReward += reward;
  //   weekCursor = weekCursor + 604800;
  // }
  // console.log("totalReward : ", totalReward);

  // 알고리즘 #2 <- 이게 더 맞는 계산법인가 ?
  const lock = await stakeWeight.locks(user);
  let endTimestamp = Number(lock[1]);
  console.log("lock end : ", endTimestamp);

  // let step = parseInt((timestamp + 604800 - 1) / 604800) * 604800;
  // let step = parseInt(timestamp / 604800) * 604800;
  // let step = Math.floor(timestamp / 604800) * 604800;
  // let step = startWeekCursor;
  let step = 1750896000; // <-- Change if it is needed
  if (endTimestamp === 0) endTimestamp = 1754270394;

  console.log("step : ", step);
  while (step <= endTimestamp + 604800) {
    const reward = await getRewardInfo(user, step);
    if (reward !== 0) console.log("reward : ", step, reward);
    totalReward += reward;
    step += 604800;
  }
  console.log("totalReward : ", totalReward);
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
}

async function claim(user) {
  let tx = await stakingRewardDistributor.claim(user, {
    gasLimit: 1000000,
  });
  let receipt = await tx.wait();
  console.log("checkpointTotalSupply \t:", tx.hash, receipt.status);
}

async function _findTimestampUserEpoch(user, timestamp, maxUserEpoch) {
  let min = 0;
  let max = maxUserEpoch;
  for (let i = 0; i < 128; i++) {
    if (min >= max) break;
    let mid = Math.floor((min + max + 1) / 2);
    const point = await stakeWeight.userPointHistory(user, mid);
    if (Number(point[2]) <= timestamp) min = mid;
    else max = mid - 1;
  }
  return min;
}

async function _claim(tokensPerWeek) {
  const user = await wallet.getAddress();
  // const user = "0x1716C4d49E9D81c17608CD9a45b1023ac9DF6c73";
  console.log(`user \t\t\t: ${user}\n`);

  const maxClaimTimestamp = Number(
    await stakingRewardDistributor.lastTokenTimestamp(),
  );
  console.log("maxClaimTimestamp \t:", maxClaimTimestamp);

  let userEpoch = 0;
  let toDistribute = 0;

  const maxUserEpoch = Number(await stakeWeight.userPointEpoch(user));
  console.log("maxUserEpoch \t\t:", maxUserEpoch);
  const startWeekCursor_ = Number(
    await stakingRewardDistributor.startWeekCursor(),
  );
  console.log("startWeekCursor_ \t:", startWeekCursor_);
  // maxUserEpoch = 0, meaning no lock.
  // Hence, no yield for user
  if (maxUserEpoch === 0) {
    return 0;
  }

  let userWeekCursor = Number(
    await stakingRewardDistributor.weekCursorOf(user),
  );
  console.log("userWeekCursor \t\t:", userWeekCursor);
  if (userWeekCursor === 0) {
    // if user has no userWeekCursor with GrassHouse yet
    // then we need to perform binary search
    userEpoch = await _findTimestampUserEpoch(
      user,
      startWeekCursor_,
      maxUserEpoch,
    );
  } else {
    // else, user must has epoch with GrassHouse already
    userEpoch = Number(await stakingRewardDistributor.userEpochOf(user));
  }

  if (userEpoch === 0) {
    userEpoch = 1;
  }
  console.log("userEpoch \t\t:", userEpoch);

  let userPoint = await stakeWeight.userPointHistory(user, userEpoch);
  console.log("userPoint \t\t:", userPoint);

  if (userWeekCursor === 0) {
    //      userWeekCursor = ((userPoint.timestamp + 1 weeks - 1) / 1 weeks) * 1 weeks;
    userWeekCursor =
      parseInt((Number(userPoint[2]) + 604800 - 1) / 604800) * 604800;
  }
  console.log("userWeekCursor \t\t:", userWeekCursor);

  // userWeekCursor is already at/beyond maxClaimTimestamp
  // meaning nothing to be claimed for this user.
  // This can be:
  // 1) User just lock their WCT less than 1 week
  // 2) User already claimed their rewards
  if (userWeekCursor >= maxClaimTimestamp) {
    return 0;
  }

  // Handle when user lock WCT before StakeWeight started
  // by assign userWeekCursor to StakeWeight's startWeekCursor_
  if (userWeekCursor < startWeekCursor_) {
    userWeekCursor = startWeekCursor_;
  }
  let prevUserPoint = [0n, 0n, 0n, 0n];

  // Go through weeks
  for (let i = 0; i < 52; i++) {
    // If userWeekCursor is iterated to be at/beyond maxClaimTimestamp
    // This means we went through all weeks that user subject to claim rewards already
    if (userWeekCursor >= maxClaimTimestamp) {
      break;
    }
    // Move to the new epoch if need to,
    // else calculate rewards that user should get.
    if (userWeekCursor >= Number(userPoint[2]) && userEpoch <= maxUserEpoch) {
      userEpoch = userEpoch + 1;
      prevUserPoint = [userPoint[0], userPoint[1], userPoint[2], userPoint[3]];
      // When userEpoch goes beyond maxUserEpoch then there is no more Point,
      // else take userEpoch as a new Point
      if (userEpoch > maxUserEpoch) {
        userPoint = [0n, 0n, 0n, 0n];
      } else {
        userPoint = await stakeWeight.userPointHistory(user, userEpoch);
      }
    } else {
      const timeDelta = userWeekCursor - Number(prevUserPoint[2]);
      console.log(
        "-------",
        Number(prevUserPoint[0]),
        timeDelta * Number(prevUserPoint[1]),
      );
      const balanceOf =
        Number(prevUserPoint[0]) > timeDelta * Number(prevUserPoint[1])
          ? Number(prevUserPoint[0]) - timeDelta * Number(prevUserPoint[1])
          : 0;
      if (balanceOf === 0 && userEpoch > maxUserEpoch) {
        break;
      }
      console.log(">>>>>>>>>>>>>", balanceOf);
      if (balanceOf > 0) {
        // TODO : Get data from chain
        // toDistribute =
        //   toDistribute +
        //   (balanceOf *
        //     Number(
        //       await stakingRewardDistributor.tokensPerWeek(userWeekCursor),
        //     )) /
        //     Number(
        //       await stakingRewardDistributor.totalSupplyAt(userWeekCursor),
        //     );
        // TODO : Calculate from input data
        // toDistribute =
        //   toDistribute +
        //   (balanceOf *
        //     Number(ethers.parseEther(tokensPerWeek[userWeekCursor] ?? "0"))) /
        //     Number(
        //       await stakingRewardDistributor.totalSupplyAt(userWeekCursor),
        //     );
        toDistribute =
          toDistribute +
          (balanceOf * Number(tokensPerWeek[userWeekCursor])) /
            Number(
              await stakingRewardDistributor.totalSupplyAt(userWeekCursor),
            );
      }
      //        userWeekCursor = userWeekCursor + 1 weeks;
      userWeekCursor = userWeekCursor + 604800;
    }
  }

  console.log(
    `\ntoDistribute \t\t: ${userWeekCursor} => ${parseFloat(ethers.formatEther(toDistribute.toString())).toFixed(2)}\n`,
  );
  return toDistribute;
}

async function tokensPerWeek() {
  let tokens = {};
  // let timestamp = parseInt(timestamp / 604800) * 604800;
  let timestamp = 1751562000;

  for (let i = 0; i < 10; i++) {
    const token = await stakingRewardDistributor.tokensPerWeek(timestamp);
    tokens[timestamp] = token;
    timestamp += 604800;
  }
  return tokens;
}

calculateReward(process.argv[2]);

// const rewards = {
//   [1749013200]: "18.2",
//   [1749016800]: "18.2",
//   [1749020400]: "18.2",
//   [1749024000]: "18.2",
// };
// tokensPerWeek().then((rewards) => {
//   console.log("tokensPerWeek = ", rewards);
//   // _claim(rewards);
// });
