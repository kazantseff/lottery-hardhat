// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

// Enter Lottery
// Automatically pick a winner based on VRF and Chainlink keeper
// Payout a win

import "hardhat/console.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol";

error Lottery__NotEnoughETH();
error Lottery__NotOpen();
error Lottery__NoUpkeepNeeded(
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

  //here we match an ABI/VRFCoordinatorV2Interface with a var
  // so that we can use VRFCoordinatorV2Interface as our only reference to that contract
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
  event RequestedLotteryWinner(uint256 indexed requestId);
  event WinnerPicked(address indexed winner);

  constructor(
    address vrfCoordinatorV2,
    uint64 subscriptionId,
    bytes32 gasLane,
    uint256 interval,
    uint256 entranceFee,
    uint32 callbackGasLimit
  ) VRFConsumerBaseV2(vrfCoordinatorV2) {
    //here we match and abi with an address so we can interact with the contract.
    // Wrap interface around the address
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
    if (msg.value <= 0) revert Lottery__NotEnoughETH();
    if (s_lotteryState != LotteryState.OPEN) revert Lottery__NotOpen();
    s_players.push(payable(msg.sender));
    emit LotteryEntered(msg.sender);
  }

  function checkUpkeep(
    bytes memory /* checkData */
  )
    public
    view
    override
    returns (bool upkeepNeeded, bytes memory /* PerformData */)
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
    upkeepNeeded = (isOpen && intervalPassed && enoughPlayers && enoughETH);
    return (upkeepNeeded, "0x0");
  }

  function performUpkeep(bytes calldata /* PerformData */) external override {
    (bool upkeepNeeded, ) = checkUpkeep("");
    if (!upkeepNeeded)
      revert Lottery__NoUpkeepNeeded(
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
    // The VRFCoordinator emits an event by himself, so this is mostly redundant
    emit RequestedLotteryWinner(requestId);
  }

  function fulfillRandomWords(
    uint256 /* reqId */,
    uint256[] memory randomWords
  ) internal override {
    uint256 index = (randomWords[0] % s_players.length);
    s_winner = s_players[index];
    s_lotteryState = LotteryState.OPEN;
    s_players = new address payable[](0);
    s_lastTimeStamp = block.timestamp;

    (bool success, ) = payable(s_winner).call{value: address(this).balance}("");
    if (!success) revert Lottery__TransferFailed();
    emit WinnerPicked(s_winner);
  }

  /* Pure/View functions */
  function getVrfCoordinator() public view returns (VRFCoordinatorV2Interface) {
    return i_vrfCoordinator;
  }

  function getSubId() public view returns (uint256) {
    return i_subscriptionId;
  }

  function getGasLane() public view returns (bytes32) {
    return i_gasLane;
  }

  function getInterval() public view returns (uint256) {
    return i_interval;
  }

  function getEntranceFee() public view returns (uint256) {
    return i_entranceFee;
  }

  function getCallbackGasLimit() public view returns (uint256) {
    return i_callbackGasLimit;
  }

  function getCurrentTimeStamp() public view returns (uint256) {
    return block.timestamp;
  }

  function getLastTimeStamp() public view returns (uint256) {
    return s_lastTimeStamp;
  }

  function getPlayers(uint256 index) public view returns (address payable) {
    return s_players[index];
  }

  function getNumberOfPlayers() public view returns (uint256) {
    return s_players.length;
  }

  function getLotteryState() public view returns (LotteryState) {
    return s_lotteryState;
  }

  function getRecentWinner() public view returns (address) {
    return s_winner;
  }
}
