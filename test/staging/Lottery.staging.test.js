const { developmentChains } = require("../../helper-hardhat-config");
const { getNamedAccounts, ethers, deployments, network } = require("hardhat");
const { expect } = require("chai");

developmentChains.includes(network.name)
  ? describe.skip
  : describe("Lottery", function() {
      let lottery;
      let deployer;

      beforeEach(async function() {
        deployer = await getNamedAccounts();
        lottery = await ethers.getContract("Lottery", deployer);
      });

      describe("constructor", function() {
        it("sets the owner of the contract correctly", async function() {
          await expect(lottery.getOwner(), deployer);
        });
      });
    });
