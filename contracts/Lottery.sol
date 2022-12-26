// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

// Enter Lottery
// Automatically pick a winner based on VRF and Chainlink keeper
// Payout a win

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol";

error Lottery__NotEnoughETH();

contract Lottery is VRFConsumerBaseV2, KeeperCompatibleInterface {
  // State variables

  event LotteryEntered(address indexed participant);
  event WinnerPicked(address indexed winner, uint256 indexed winnerNumber);

  /* VRF Variables */
  VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
  uint64 private immutable i_subscriptionId;
  bytes32 private immutable i_gasLane;
  uint32 private immutable i_callbackGasLimit;
  uint16 private constant REQUEST_CONFIRMATIONS = 3;
  uint32 private constant NUM_WORDS = 1;

  /* Lottery variables */
  address payable[] s_players;
  address payable s_winner;
  uint256 private s_winnerNumber;

  constructor(
    address vrfCoordinatorAddress,
    uint64 subscriptionId,
    bytes32 gasLane,
    uint32 callbackGasLimit
  ) VRFConsumerBaseV2(vrfCoordinatorAddress) {
    i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorAddress);
    i_subscriptionId = subscriptionId;
    i_gasLane = gasLane;
    i_callbackGasLimit = callbackGasLimit;
  }

  function enterLottery() public payable {
    if (msg.value < 0) revert Lottery__NotEnoughETH();
    s_players.push(payable(msg.sender));
    emit LotteryEntered(msg.sender);
  }

  function rollANumber() internal override {
    uint256 requestId = i_vrfCoordinator.requestRandomWords(
      i_gasLane,
      i_subscriptionId,
      REQUEST_CONFIRMATIONS,
      i_callbackGasLimit,
      NUM_WORDS
    );
  }

  function fulfillRandomWords(
    uint256 /* reqId */,
    uint256[] memory randomWords
  ) internal override {
    uint256 index = (randomWords[0] % s_players.length);
    s_winnerNumber = index;
    s_winner = s_players[index];
    emit WinnerPicked(s_winner, s_winnerNumber);
  }
}
