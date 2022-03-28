// SPDX-License-Identifier: MIT

pragma solidity 0.8.11;

import "../v1/FiatTokenV1.sol";

contract UUPSUpgradeableUnsafeMock is FiatTokenV1 {
    function upgradeTo(address newImplementation) external virtual override {
        ERC1967Upgrade._upgradeToAndCall(newImplementation, bytes(""), false);
    }

    function upgradeToAndCall(address newImplementation, bytes memory data) external payable virtual override {
        ERC1967Upgrade._upgradeToAndCall(newImplementation, data, false);
    }
}