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
  require("../artifacts/src/StakeWeight.sol/StakeWeight.json").abi;
const rewardAbi =
  require("../artifacts/src/StakingRewardDistributor.sol/StakingRewardDistributor.json").abi;

require("dotenv").config();

const provider = new ethers.JsonRpcProvider(RPC_URLS[1]);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const stakeWeight = new ethers.Contract(StakeWeight, weightAbi, wallet);
const stakingRewardDistributor = new ethers.Contract(
  StakingRewardDistributor,
  rewardAbi,
  wallet,
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

const _claim = async (user, maxClaimTimestamp) => {
  let userEpoch = 0;
  let toDistribute = 0;

  const maxUserEpoch = Number(await stakeWeight.userPointEpoch(user));
  console.log("maxUserEpoch :", maxUserEpoch);
  const startWeekCursor_ = 1751544000; // 7월 3일 09:00 AM (UTC +9)
  // maxUserEpoch = 0, meaning no lock.
  // Hence, no yield for user
  if (maxUserEpoch === 0) {
    return 0;
  }

  let userWeekCursor = Number(
    await stakingRewardDistributor.weekCursorOf(user),
  );
  console.log("userWeekCursor :", userWeekCursor);
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
  console.log("userEpoch : ", userEpoch);

  if (userEpoch === 0) {
    userEpoch = 1;
  }

  let userPoint = await stakeWeight.userPointHistory(user, userEpoch);
  console.log("userPoint :", userPoint);

  if (userWeekCursor === 0) {
    userWeekCursor = ((Number(userPoint[2]) + 604800 - 1) / 604800) * 604800;
  }
  console.log("userWeekCursor :", userWeekCursor);

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
  console.log("userWeekCursor :", userWeekCursor);

  let prevUserPoint = { bias: 0, slope: 0, timestamp: 0, blockNumber: 0 };

  // Go through weeks
  for (let i = 0; i < 52; i++) {
    // If userWeekCursor is iterated to be at/beyond maxClaimTimestamp
    // This means we went through all weeks that user subject to claim rewards already
    // if (userWeekCursor >= maxClaimTimestamp) {
    //   console.log("----- break -----");
    //   break;
    // }
    // Move to the new epoch if need to,
    // else calculate rewards that user should get.
    if (userWeekCursor >= Number(userPoint[2]) && userEpoch <= maxUserEpoch) {
      userEpoch = userEpoch + 1;
      prevUserPoint = {
        bias: Number(userPoint[0]),
        slope: Number(userPoint[1]),
        timestamp: Number(userPoint[2]),
        blockNumber: Number(userPoint[3]),
      };
      // When userEpoch goes beyond maxUserEpoch then there is no more Point,
      // else take userEpoch as a new Point
      if (userEpoch > maxUserEpoch) {
        userPoint = { bias: 0, slope: 0, timestamp: 0, blockNumber: 0 };
      } else {
        userPoint = await stakeWeight.userPointHistory(user, userEpoch);
      }
    } else {
      const timeDelta = userWeekCursor - Number(prevUserPoint[2]);
      const balanceOf = Math.max(
        Number(prevUserPoint[0]) - timeDelta * Number(prevUserPoint[1]),
        0,
      );
      if (balanceOf === 0 && userEpoch > maxUserEpoch) {
        break;
      }
      if (balanceOf > 0) {
        toDistribute =
          toDistribute +
          (balanceOf *
            Number(
              await stakingRewardDistributor.tokensPerWeek(userWeekCursor),
            )) /
            Number(
              await stakingRewardDistributor.totalSupplyAt(userWeekCursor),
            );
      }
      userWeekCursor = userWeekCursor + 604800;
    }
  }

  // userEpoch = Math128.min(maxUserEpoch, userEpoch - 1);
  // userEpochOf[user] = userEpoch;
  // weekCursorOf[user] = userWeekCursor;
  //
  // emit RewardsClaimed(user, recipient_, toDistribute, userEpoch, maxUserEpoch);

  return toDistribute;
};

const _timestampToFloorWeek = (timestamp) => {
  return (timestamp / 604800) * 604800;
};

const claim = async (user) => {
  const timestamp = Math.floor(Date.now() / 1000);
  const weekCursor = Number(await stakingRewardDistributor.weekCursor());
  console.log("weekCursor :", weekCursor);
  if (timestamp >= weekCursor) {
    console.log("..... run checkpointTotalSupply .....");
    await stakingRewardDistributor.checkpointTotalSupply();
  }

  let lastTokenTimestamp_ = Number(
    await stakingRewardDistributor.lastTokenTimestamp(),
  );
  console.log("lastTokenTimestamp :", lastTokenTimestamp_);

  // 이더가 없어... ㅠㅠ
  // console.log("..... run checkpointToken .....");
  // await stakingRewardDistributor.checkpointToken();
  lastTokenTimestamp_ = timestamp;

  lastTokenTimestamp_ = _timestampToFloorWeek(lastTokenTimestamp_);

  const total = await _claim(user, lastTokenTimestamp_);

  console.log("!! Total = ", total);
  return total;
};

// 0x1b9b97d05C6e14a46c4B7CA07CbB34b0A1bE1941
// 0x5758d8f888ec33846B574c209DC86FD451806382
claim("0x5758d8f888ec33846B574c209DC86FD451806382");
