const { getNamedAccounts, ethers } = require("hardhat");

async function main() {
  const { deployer } = await getNamedAccounts();
  const lottery = await ethers.getContract("Lottery", deployer);

  const winnerNumber = await lottery.random(10);
  console.log(winnerNumber);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
