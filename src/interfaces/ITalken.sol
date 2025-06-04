// SPDX-License-Identifier: MIT
pragma solidity >=0.8.25 <0.9.0;

interface ITalken {
  function isFrozen(address) external view returns (bool);
}