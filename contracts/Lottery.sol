// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

// Enter Lottery
// Automatically pick a winner based on VRF and Chainlink keeper
// Payout a win

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol";

error Lottery__NotEnoughETH();
error Lottery__NoUpKeepNeeded(
  uint256 lotteryState,
  uint256 numOfPlayers,
  uint256 balance
);
error Lottery__TransferFailed();

contract Lottery is VRFConsumerBaseV2, KeeperCompatibleInterface {
  // State variables

  /* Type declarations */
  enum LotteryState {
    OPEN,
    PENDING
  }

  /* VRF Variables */
  VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
  uint64 private immutable i_subscriptionId;
  bytes32 private immutable i_gasLane;
  uint32 private immutable i_callbackGasLimit;
  uint16 private constant REQUEST_CONFIRMATIONS = 3;
  uint32 private constant NUM_WORDS = 1;

  /* Lottery variables */
  uint256 private immutable i_interval;
  uint256 private immutable i_entranceFee;
  address payable[] private s_players;
  address private s_winner;
  uint256 private s_lastTimeStamp;
  LotteryState private s_lotteryState;

  event LotteryEntered(address indexed participant);
  event RequestedLotteryWinner(uint256 indexed reqId);
  event WinnerPicked(address indexed winner);

  constructor(
    address vrfCoordinatorV2,
    uint64 subscriptionId,
    bytes32 gasLane,
    uint256 interval,
    uint256 entranceFee,
    uint32 callbackGasLimit
  ) VRFConsumerBaseV2(vrfCoordinatorV2) {
    i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
    i_subscriptionId = subscriptionId;
    i_gasLane = gasLane;
    i_interval = interval;
    i_entranceFee = entranceFee;
    i_callbackGasLimit = callbackGasLimit;
    s_lastTimeStamp = block.timestamp;
    s_lotteryState = LotteryState.OPEN;
  }

  function enterLottery() public payable {
    if (msg.value < 0) revert Lottery__NotEnoughETH();
    s_players.push(payable(msg.sender));
    emit LotteryEntered(msg.sender);
  }

  function checkUpkeep(
    bytes memory /* checkData */
  )
    public
    view
    override
    returns (bool upKeepNeeded, bytes memory /* PerformData */)
  {
    // upKeepNeedede == true if:
    // 1. Interval has passed
    // 2. There is enough players
    // 3. There is ETH in contract
    // 4. Contract is in open state
    bool isOpen = LotteryState.OPEN == s_lotteryState;
    bool intervalPassed = (block.timestamp - s_lastTimeStamp) > i_interval;
    bool enoughPlayers = s_players.length > 0;
    bool enoughETH = address(this).balance > 0;
    upKeepNeeded = (isOpen && intervalPassed && enoughPlayers && enoughETH);
    return (upKeepNeeded, "0x0");
  }

  function performUpkeep(bytes calldata /* PerformData */) external override {
    (bool upKeepNeeded, ) = checkUpkeep("");
    if (!upKeepNeeded)
      revert Lottery__NoUpKeepNeeded(
        uint256(s_lotteryState),
        s_players.length,
        address(this).balance
      );
    s_lotteryState = LotteryState.PENDING;
    uint256 requestId = i_vrfCoordinator.requestRandomWords(
      i_gasLane,
      i_subscriptionId,
      REQUEST_CONFIRMATIONS,
      i_callbackGasLimit,
      NUM_WORDS
    );
    emit RequestedLotteryWinner(requestId);
  }

  function fulfillRandomWords(
    uint256 /* reqId */,
    uint256[] memory randomWords
  ) internal override {
    uint256 index = (randomWords[0] % s_players.length);
    s_lotteryState = LotteryState.OPEN;
    s_players = new address payable[](0);
    s_lastTimeStamp = block.timestamp;
    s_winner = s_players[index];

    (bool success, ) = payable(s_winner).call{value: address(this).balance}("");
    if (!success) revert Lottery__TransferFailed();
    emit WinnerPicked(s_winner);
  }
}
