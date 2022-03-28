// SPDX-License-Identifier: MIT

pragma solidity 0.8.11;

import "../util/Address.sol";

contract ContractCall {
    using Address for address;

    function functionCall (address target, bytes memory data) external {
        target.functionCall(data);
    }
}