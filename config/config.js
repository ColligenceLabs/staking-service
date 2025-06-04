require("dotenv").config();

const ChainId = {
  KAIA: 8217,
  KAIROS: 1001,
  SEPOLIA: 11155111,
};

const RPC_URLS = {
  [ChainId.KAIA]: "https://public-en.node.kaia.io",
  [ChainId.KAIROS]: "https://public-en-kairos.node.kaia.io",
  [ChainId.SEPOLIA]: `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`,
};

// const StakeWeight = "0xd04A72BBF8D2Db69C8E56684AF757C093fA11135";
// const StakingRewardDistributor = "0x1A6E0A2Ad7177004769Cb6e5E66540E12dbe8BE1";

const StakeWeight = "0xC62ecF12150a7da6Cb84f1D3224a8F89681651C3";
const StakingRewardDistributor = "0x4F28cFb5832b25EF21193067A12ACB0780CA3673";

module.exports = { ChainId, RPC_URLS, StakeWeight, StakingRewardDistributor };
