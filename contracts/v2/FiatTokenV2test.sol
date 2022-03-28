// SPDX-License-Identifier: MIT

pragma solidity 0.8.11;

import "../v1/FiatTokenV1.sol";

// simple example for upgradeable test
contract FiatTokenV2test is FiatTokenV1 {
    string public name2;

    function setName2(string memory _name) public {
        name2 = _name;
    }
}
