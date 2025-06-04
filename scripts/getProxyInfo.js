const { upgrades } = require("hardhat");

async function getProxyInfo(contract) {
  const admin = await upgrades.erc1967.getAdminAddress(contract.address);
  console.log(`${contract.name} : ${admin}`);
}

const contracts = [
  { name: "Pauser", address: "0x8Da247bF539d3aD456A65f0BE5d1e28146de0C4b" },
  {
    name: "TalkenStakingConfig",
    address: "0x55a6Be60a01D3d85078672d058Fa1282ac63a538",
  },
  {
    name: "StakeWeight",
    address: "0x714707edd16A933A921745d77BA93304e1860c07",
  },
  {
    name: "StakingRewardDistributor",
    address: "0x8b943e56ea65A7Ca2697108840C2e03A131798B6",
  },
];

console.log("[ Get Proxy Admin of Contracts ]");
contracts.forEach(async (contract) => await getProxyInfo(contract));
