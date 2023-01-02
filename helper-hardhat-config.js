const { ethers } = require("hardhat");

const networkConfig = {
  default: {
    name: "hardhat",
    keepersUpdateInterval: "30"
  },
  5: {
    name: "goerli",
    vrfCoordinatorV2Address: "0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D",
    gasLane:
      "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15",
    subscriptionId: "", // Create later
    keepersUpdateInterval: "30",
    lotteryEntranceFee: ethers.utils.parseEther("0.1"),
    callbackGasLimit: "500000"
  },
  31337: {
    name: "localhost",
    gasLane:
      "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15",
    subscriptionId: "1",
    keepersUpdateInterval: "30",
    lotteryEntranceFee: ethers.utils.parseEther("0.1"),
    callbackGasLimit: "500000"
  }
};
const developmentChains = ["hardhat", "localhost"];
const VERIFICATION_BLOCK_CONFIRMATIONS = 6;

module.exports = {
  networkConfig,
  developmentChains,
  VERIFICATION_BLOCK_CONFIRMATIONS
};
