const {
  developmentChains,
  networkConfig
} = require("../../helper-hardhat-config");
const { getNamedAccounts, ethers, network } = require("hardhat");
const { expect, assert } = require("chai");

developmentChains.includes(network.name)
  ? describe.skip
  : describe("Lottery", function() {
      let lottery, deployer, entranceFee, accounts;
      const chainId = network.config.chainId;
      beforeEach(async function() {
        deployer = (await getNamedAccounts()).deployer;
        lottery = await ethers.getContract("Lottery", deployer);
        entranceFee = await lottery.getEntranceFee();
        accounts = await ethers.getSigners();
      });

      describe("Constructor", function() {
        it("sets the VRFCoordinator address correctly", async function() {
          const response = await lottery.getVrfCoordinator();
          await expect(response).to.equal(
            networkConfig[chainId]["vrfCoordinatorV2Address"]
          );
        });

        it("sets the subscriptionId correctly", async function() {
          const response = await lottery.getSubId();
          await expect(response.toString()).to.equal(
            networkConfig[chainId]["subscriptionId"]
          );
        });

        it("sets the gasLane correctly", async function() {
          const response = await lottery.getGasLane();
          await expect(response.toString()).to.equal(
            networkConfig[chainId]["gasLane"]
          );
        });

        it("sets the interval correctly", async function() {
          const response = await lottery.getInterval();
          await expect(response.toString()).to.equal(
            networkConfig[chainId]["keepersUpdateInterval"]
          );
        });

        it("sets the entranceFee correctly", async function() {
          const response = await lottery.getEntranceFee();
          await expect(response.toString()).to.equal(
            networkConfig[chainId]["lotteryEntranceFee"]
          );
        });

        it("sets the callbackGasLimit correctly", async function() {
          const response = await lottery.getCallbackGasLimit();
          await expect(response.toString()).to.equal(
            networkConfig[chainId]["callbackGasLimit"]
          );
        });

        it("initializes the lottery state correctly", async function() {
          const response = await lottery.getLotteryState();
          await expect(response.toString()).to.equal("0");
        });
      });

      describe("enterLottery", function() {
        it("Reverts when not enough ETH was sent", async function() {
          await expect(lottery.enterLottery()).to.be.revertedWithCustomError(
            lottery,
            "Lottery__NotEnoughETH"
          );
        });

        it("adds new player to the array", async function() {
          await lottery.enterLottery({ value: entranceFee });
          const response = await lottery.getNumberOfPlayers();
          await expect(response > 0);
        });

        it("emits an event LotteryEntered", async function() {
          await expect(lottery.enterLottery({ value: entranceFee }))
            .to.emit(lottery, "LotteryEntered")
            .withArgs(deployer);
        });

        it("reverts if lottery is not open", async function() {
          await new Promise(async (resolve, reject) => {
            lottery.once("RequestedLotteryWinner", async () => {
              try {
                const connectedAcc = await lottery.connect(accounts[1]);
                await expect(
                  connectedAcc.enterLottery({ value: entranceFee })
                ).to.be.revertedWithCustomError(lottery, "Lottery__NotOpen");
                resolve();
              } catch (e) {
                reject(e);
              }
            });
            console.log("Entering lottery...");
            const tx = await lottery.enterLottery({ value: entranceFee });
            await tx.wait(1);
            console.log("time to wait...");
          });
        });
      });

      describe("fulfillRandomWords", function() {
        beforeEach(async () => {
          console.log("Entering lottery...");
          const tx = await lottery.enterLottery({ value: entranceFee });
          await tx.wait(1);
          console.log("Waiting...");
        });

        it("finds a winner of the lottery", async function() {
          await new Promise(async (resolve, reject) => {
            lottery.once("WinnerPicked", async () => {
              try {
                const winner = await lottery.getRecentWinner();
                await expect(winner).to.equal(deployer);
                resolve();
              } catch (e) {
                reject(e);
              }
            });
          });
        });

        it("changes the lottery state to open", async function() {
          await new Promise(async (resolve, reject) => {
            lottery.once("WinnerPicked", async () => {
              try {
                const state = await lottery.getLotteryState();
                await expect(state.toString()).to.equal("0");
                resolve();
              } catch (e) {
                reject(e);
              }
            });
          });
        });

        it("resets the array of players", async function() {
          await new Promise(async (resolve, reject) => {
            lottery.once("WinnerPicked", async () => {
              try {
                const result = await lottery.getNumberOfPlayers();
                await expect(result.toString()).to.equal("0");
                resolve();
              } catch (e) {
                reject(e);
              }
            });
          });
        });

        it("resets the timestamp", async function() {
          await new Promise(async (resolve, reject) => {
            lottery.once("WinnerPicked", async () => {
              try {
                const response = await lottery.getLastTimeStamp();
                const actual = await lottery.getCurrentTimeStamp();
                await expect(response.toString()).to.equal(actual.toString());
                resolve();
              } catch (e) {
                reject(e);
              }
            });
          });
        });

        it("pays out the win", async function() {
          await new Promise(async (resolve, reject) => {
            lottery.once("WinnerPicked", async () => {
              try {
                const endingLotteryBalance = await lottery.provider.getBalance(
                  lottery.address
                );
                const endingWinnerBalance = await lottery.provider.getBalance(
                  deployer
                );

                await expect(endingLotteryBalance.toString()).to.equal("0");

                await expect(endingWinnerBalance.toString()).to.equal(
                  startingWinnerBalance.add(entranceFee).toString()
                );
                resolve();
              } catch (e) {
                reject(e);
              }
            });

            const startingWinnerBalance = await lottery.provider.getBalance(
              deployer
            );
          });
        });
      });
    });
