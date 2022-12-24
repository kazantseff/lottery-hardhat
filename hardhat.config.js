require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
require("@nomiclabs/hardhat-etherscan");
require("hardhat-gas-reporter");
require("solidity-coverage");
require("hardhat-deploy");

const GOERLI_RPC_URL = process.env.GOERLI_RPC_URL;
const PRIVATE_KEY_DEPLOYER = process.env.PRIVATE_KEY_DEPLOYER;
const PRIVATE_KEY1 = process.env.PRIVATE_KEY1;
const PRIVATE_KEY2 = process.env.PRIVATE_KEY2;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    goerli: {
      url: GOERLI_RPC_URL,
      accounts: [PRIVATE_KEY_DEPLOYER, PRIVATE_KEY1, PRIVATE_KEY2],
      chainId: 5,
      vrf_coordinator: "0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D",
      link: "0x326C977E6efc84E512bB9C30f76E30c160eD06FB",
      key_hash:
        "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15"
    },
    localhost: {
      url: "http://127.0.0.1:8545/"
    }
  },
  solidity: "0.8.17",
  namedAccounts: {
    deployer: {
      default: 0,
      goerli: process.env.PRIVATE_KEY_DEPLOYER
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY
  },
  gasReporter: {
    enabled: false,
    outputFile: "gas-reporter.txt",
    currency: "USD",
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    noColors: true,
    token: "ETH"
  }
};
