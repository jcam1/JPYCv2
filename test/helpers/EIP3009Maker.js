const {
  constants,
} = require('@openzeppelin/test-helpers')
const { MAX_UINT256 } = constants

const { EIP712Domain, domainSeparator } = require('../helpers/eip712')

const version = '1'
const chainId = 1337;

const EIP3009TransferMake = (name, verifyingContract, from, to, value, nonce, validAfter = 0, validBefore = MAX_UINT256) => ({
  primaryType: 'TransferWithAuthorization',
  types: { EIP712Domain, TransferWithAuthorization },
  domain: { name, version, chainId, verifyingContract },
  message: { from, to, value, validAfter, validBefore, nonce },
});

const TransferWithAuthorization = [
  { name: 'from', type: 'address' },
  { name: 'to', type: 'address' },
  { name: 'value', type: 'uint256' },
  { name: 'validAfter', type: 'uint256' },
  { name: 'validBefore', type: 'uint256' },
  { name: 'nonce', type: 'bytes32' },
];

module.exports = {
  EIP3009TransferMake,
}