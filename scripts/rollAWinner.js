const { getNamedAccounts, ethers } = require("hardhat");

async function main() {
  const { deployer } = await getNamedAccounts();
  const lottery = await ethers.getContract("Lottery", deployer);

  const number = await lottery.getNumberOfParticipants();
  await lottery.rollAWinner(number);
  const winner = await lottery.getWinner();
  console.log(winner);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
