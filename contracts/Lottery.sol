// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "hardhat/console.sol";
error Lottery__NotOwner();
error Lottery__NotAWinner();

contract Lottery {
  // 1. Enter the lottery (Need a struct to account for all the participants and their balances)
  // 2. Calculate the winner
  // 3. Distribute money

  // Chainlink VRF variables

  address owner; // Owner of the lottery
  uint256 numberOfParticipants = 0;
  uint256 winnerNumber;
  address winner;

  constructor() {
    owner = msg.sender;
  }

  modifier onlyOwner() {
    if (msg.sender != owner) revert Lottery__NotOwner();
    _;
  }

  struct Participant {
    bool exists;
    uint256 balance;
    uint256 lotteryNumber;
  }

  mapping(address => Participant) lotteryParticipants;
  address[] participantsAddreses;

  function random(uint number) public view returns (uint) {
    return
      uint(
        keccak256(
          abi.encodePacked(block.timestamp, block.difficulty, msg.sender)
        )
      ) % number;
  }

  // Later on i can add _depositAmount variable for users to be able to deposit not only ETH but any ERC20 token
  function enterLottery() public payable {
    require(
      lotteryParticipants[msg.sender].exists == false,
      "Account already exist"
    );
    require(
      msg.value > 0,
      "The minimum amount of deposit should be greater than 0."
    );

    participantsAddreses.push(msg.sender);

    lotteryParticipants[msg.sender].exists = true;
    lotteryParticipants[msg.sender].balance = msg.value;
    numberOfParticipants++;
    lotteryParticipants[msg.sender].lotteryNumber = numberOfParticipants;
  }

  /** @dev This function takes a number of participants as an argument */
  function rollAWinner(uint256 number) public onlyOwner {
    require(
      numberOfParticipants > 1,
      "Number of participants should be greater than 1"
    );

    winnerNumber = random(number);

    for (uint256 i = 0; i < participantsAddreses.length; i++) {
      if (
        winnerNumber ==
        lotteryParticipants[participantsAddreses[i]].lotteryNumber
      ) {
        winner = participantsAddreses[i];
      }
    }
  }

  function payOutWin(address _winner) public onlyOwner {
    if (_winner != winner) {
      revert Lottery__NotAWinner();
    }

    (bool success, ) = payable(_winner).call{value: address(this).balance}("");
    require(success, "Withdraw failed, please try again.");

    // Clear all the data about last lottery and restart it
    for (uint i = 0; i < participantsAddreses.length; i++) {
      lotteryParticipants[participantsAddreses[i]].exists = false;
    }
    numberOfParticipants = 0;
    participantsAddreses = new address[](0);
  }

  function getOwner() public view returns (address) {
    return owner;
  }

  function getStatus() public view returns (bool) {
    return lotteryParticipants[msg.sender].exists;
  }

  function getAddress(uint256 index) public view returns (address) {
    return participantsAddreses[index];
  }

  function getParticipant(
    address participant
  ) public view returns (Participant memory) {
    return lotteryParticipants[participant];
  }

  // To check how mane participants are there
  function getNumberOfParticipants() public view returns (uint256) {
    return numberOfParticipants;
  }

  function getWinner() public view returns (address) {
    return winner;
  }

  function getWinnerNumber() public view returns (uint256) {
    return winnerNumber;
  }
}
