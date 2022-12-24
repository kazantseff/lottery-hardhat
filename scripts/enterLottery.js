const { getNamedAccounts, ethers } = require("hardhat");

const sendValue = ethers.utils.parseEther("1");
async function main() {
  const { deployer } = await getNamedAccounts();

  const accounts = await ethers.getSigners();
  const lottery = await ethers.getContract("Lottery", deployer);

  await lottery.connect(accounts[2]).enterLottery({ value: sendValue });
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
