const { expect, assert } = require("chai");
const { getNamedAccounts, deployments, ethers, network } = require("hardhat");
const {
  developmentChains,
  networkConfig
} = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Lottery", function() {
      let lottery, deployer, VRFCoordinatorMock, interval, sendValue;
      const chainId = network.config.chainId;
      beforeEach(async function() {
        deployer = (await getNamedAccounts()).deployer;
        await deployments.fixture(["all"]);
        lottery = await ethers.getContract("Lottery", deployer);
        VRFCoordinatorMock = await ethers.getContract(
          "VRFCoordinatorV2Mock",
          deployer
        );
        sendValue = await lottery.getEntranceFee();
        interval = await lottery.getInterval();
      });

      describe("constructor", function() {
        it("sets the vrfCoordinator address correctly", async function() {
          const response = await lottery.getVrfCoordinator();
          assert.equal(VRFCoordinatorMock.address, response);
        });

        it("initializes lotteryState correclty", async function() {
          const lotteryState = await lottery.getLotteryState();
          assert.equal(lotteryState.toString(), "0");
        });

        it("Initializes interval correctly", async function() {
          const response = await lottery.getInterval();
          assert.equal(response.toString(), interval);
        });

        it("initializes subscriptionId correctly", async function() {
          const response = await lottery.getSubId();
          assert.equal(
            response.toString(),
            networkConfig[chainId]["subscriptionId"]
          );
        });

        it("it initializes gasLane correctly", async function() {
          const response = await lottery.getGasLane();
          assert.equal(response.toString(), networkConfig[chainId]["gasLane"]);
        });

        it("initializes entranceFee correctly", async function() {
          const response = await lottery.getEntranceFee();
          assert.equal(
            response.toString(),
            networkConfig[chainId]["lotteryEntranceFee"]
          );
        });

        it("initializes callbackGasLimit correctly", async function() {
          const response = await lottery.getCallbackGasLimit();
          assert.equal(
            response.toString(),
            networkConfig[chainId]["callbackGasLimit"]
          );
        });
      });

      describe("enterLottery", function() {
        it("reverts when not enough ETH is being sent", async function() {
          await expect(lottery.enterLottery()).to.be.revertedWithCustomError(
            lottery,
            "Lottery__NotEnoughETH"
          );
        });

        it("emits an event", async function() {
          await expect(lottery.enterLottery({ value: sendValue }))
            .to.emit(lottery, "LotteryEntered")
            .withArgs(deployer);
        });

        it("adds the new player to the array", async function() {
          await lottery.enterLottery({ value: sendValue });
          await expect(lottery.getPlayers(0), deployer);
        });

        it("does not allow entrance when lottery is not open", async function() {
          await lottery.enterLottery({ value: sendValue });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1
          ]);
          await network.provider.send("evm_mine", []);
          // Now we can pretend to be a chainlink keeper
          await lottery.performUpkeep([]); // Changes the state of the lottery for out comparison below
          await expect(
            lottery.enterLottery({ value: sendValue })
          ).to.be.revertedWithCustomError(lottery, "Lottery__NotOpen");
        });
      });

      describe("checkUpkeep", function() {
        it("returns true if interval has passed", async function() {
          await lottery.enterLottery({ value: sendValue });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1
          ]);
          await network.provider.send("evm_mine", []);
          const tx = await lottery.callStatic.checkUpkeep([]);
          const { upkeepNeeded } = tx;
          await expect(upkeepNeeded).to.equal(true);
        });

        it("Returns fasle if interval has not passed", async function() {
          await lottery.enterLottery({ value: sendValue });
          const tx = await lottery.callStatic.checkUpkeep([]);
          const { upkeepNeeded } = tx;
          await expect(upkeepNeeded).to.equal(false);
        });

        it("returns false if there are no players", async function() {
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1
          ]);
          await network.provider.send("evm_mine", []);
          const { upkeepNeeded } = await lottery.callStatic.checkUpkeep([]);
          await expect(upkeepNeeded).to.equal(false);
        });

        it("returns false if lottery is not open", async function() {
          await lottery.enterLottery({ value: sendValue });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1
          ]);
          await network.provider.send("evm_mine", []);
          await lottery.performUpkeep([]); // Simulating a keeper, this changes the state to PENDING

          const state = await lottery.getLotteryState();
          const { upkeepNeeded } = await lottery.callStatic.checkUpkeep([]);
          assert.equal(state.toString(), "1");
          await expect(upkeepNeeded).to.equal(false);
        });
      });

      describe("performUpkeep", function() {
        it("only runs if checkUpkeep is true", async function() {
          await lottery.enterLottery({ value: sendValue });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1
          ]);
          await network.provider.send("evm_mine", []);
          const { upkeepNeeded } = await lottery.callStatic.checkUpkeep([]);
          await expect(upkeepNeeded).to.equal(true);
          const tx = await lottery.performUpkeep([]);
          assert(tx);
        });

        it("reverts if checkUpkeep is fasle", async function() {
          const tx = await lottery.callStatic.checkUpkeep([]);
          const { upkeepNeeded } = tx;
          assert.equal(upkeepNeeded, false);
          await expect(lottery.performUpkeep([])).to.be.revertedWithCustomError(
            lottery,
            "Lottery__NoUpkeepNeeded"
          );
        });

        it("Changes the lottery state to PENDING", async function() {
          await lottery.enterLottery({ value: sendValue });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1
          ]);
          await network.provider.send("evm_mine", []);
          await lottery.performUpkeep([]);
          const state = await lottery.getLotteryState();
          await expect(state.toString()).to.equal("1");
        });

        it("calls the vrfCoordinator and emits an event", async function() {
          await lottery.enterLottery({ value: sendValue });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1
          ]);
          await network.provider.send("evm_mine", []);
          const txResponse = await lottery.performUpkeep([]);
          const txReceipt = await txResponse.wait(1);
          // It is the events[1] as VRFCoordinator also fires an event which is 0th indexed
          const requestId = txReceipt.events[1].args.requestId;
          assert(requestId.toNumber() > 0);
        });
      });

      describe("fulfillRandomWords", function() {
        let additionalAccounts, accounts, startingAccountIndex;
        beforeEach(async function() {
          accounts = await ethers.getSigners();
          startingAccountIndex = 0;
          additionalAccounts = 4;

          for (let i = startingAccountIndex; i < additionalAccounts; i++) {
            const connectedAccounts = await lottery.connect(accounts[i]);
            await connectedAccounts.enterLottery({ value: sendValue });
          }
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1
          ]);
          await network.provider.send("evm_mine", []);
        });

        it("reverts when no performUpkeep was run", async function() {
          // So if requestId which is the 1st argument is 0 (means there is none)
          // Function should revert
          // This function is called by a chainlink keeper on a VRFCoordinator
          // The second argument is the consumer address
          // Which in our case is a lottery contract
          await expect(
            VRFCoordinatorMock.fulfillRandomWords(0, lottery.address)
          ).to.be.revertedWith("nonexistent request");
          await expect(
            VRFCoordinatorMock.fulfillRandomWords(1, lottery.address)
          ).to.be.revertedWith("nonexistent request");
        });

        it("changes the lottery state to OPEN", async function() {
          const state = await lottery.getLotteryState();
          await expect(state.toString(), "1");

          await new Promise(async (resolve, reject) => {
            lottery.once("WinnerPicked", async () => {
              console.log("Found the event!");
              try {
                const recentState = await lottery.getLotteryState();
                await expect(recentState.toString()).to.equal("0");
                resolve();
              } catch (e) {
                reject(e);
              }
            });

            const txResponse = await lottery.performUpkeep([]);
            const txReceipt = await txResponse.wait(1);
            const requestId = txReceipt.events[1].args.requestId;

            await VRFCoordinatorMock.fulfillRandomWords(
              requestId,
              lottery.address
            );
          });
        });

        it("resets the array of players", async function() {
          const numberOfPlayers = await lottery.getNumberOfPlayers();
          await expect(numberOfPlayers.toString()).to.equal(
            additionalAccounts.toString()
          );

          await new Promise(async (resolve, reject) => {
            lottery.once("WinnerPicked", async () => {
              try {
                const newNumberOfPlayers = await lottery.getNumberOfPlayers();
                await expect(newNumberOfPlayers.toString()).to.equal("0");
                resolve();
              } catch (e) {
                reject(e);
              }
            });

            const tx = await lottery.performUpkeep([]);
            const txReceipt = await tx.wait(1);
            const requestId = await txReceipt.events[1].args.requestId;

            await VRFCoordinatorMock.fulfillRandomWords(
              requestId,
              lottery.address
            );
          });
        });

        it("Resets the timestamp", async function() {
          await new Promise(async (resolve, reject) => {
            lottery.once("WinnerPicked", async () => {
              try {
                const timeStamp = await lottery.getLastTimeStamp();
                const newTimeStamp = await lottery.getCurrentTimeStamp();
                // Checks if the s_lastTimetamp equals to block.timestamp
                await expect(timeStamp).to.equal(newTimeStamp);
                resolve();
              } catch (e) {
                reject(e);
              }
            });
            const tx = await lottery.performUpkeep([]);
            const txReceipt = await tx.wait(1);
            const requestId = await txReceipt.events[1].args.requestId;

            await VRFCoordinatorMock.fulfillRandomWords(
              requestId,
              lottery.address
            );
          });
        });

        it("pays out the win", async function() {
          // accounts[1] is the winner

          await new Promise(async (resolve, reject) => {
            lottery.once("WinnerPicked", async () => {
              try {
                const winner = await lottery.getRecentWinner();
                const winnerBalance = await lottery.provider.getBalance(winner);
                assert.equal(
                  winnerBalance.toString(),
                  startingBalance.add(
                    sendValue.mul(additionalAccounts).toString()
                  )
                );
                resolve();
              } catch (e) {
                reject(e);
              }
            });
            const tx = await lottery.performUpkeep([]);
            const txReceipt = await tx.wait(1);
            const requestId = await txReceipt.events[1].args.requestId;
            const startingBalance = await lottery.provider.getBalance(
              accounts[1].address
            );

            await VRFCoordinatorMock.fulfillRandomWords(
              requestId,
              lottery.address
            );
          });
        });
      });
    });
