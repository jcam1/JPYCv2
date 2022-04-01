const {
  constants,
} = require('@openzeppelin/test-helpers')
const { MAX_UINT256 } = constants

const { EIP712Domain, domainSeparator } = require('../helpers/eip712')

const version = '1'
const chainId = 1337;

const EIP2612Make = (name, verifyingContract, owner, spender, value, nonce = 0, deadline = MAX_UINT256) => ({
  primaryType: 'Permit',
  types: { EIP712Domain, Permit },
  domain: { name, version, chainId, verifyingContract },
  message: { owner, spender, value, nonce, deadline },
});

const Permit = [
  { name: 'owner', type: 'address' },
  { name: 'spender', type: 'address' },
  { name: 'value', type: 'uint256' },
  { name: 'nonce', type: 'uint256' },
  { name: 'deadline', type: 'uint256' },
]

module.exports = {
  EIP2612Make,
}