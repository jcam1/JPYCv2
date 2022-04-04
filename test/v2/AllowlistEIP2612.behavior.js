const {
  BN,
  constants,
  expectEvent,
  expectRevert,
  time,
} = require('@openzeppelin/test-helpers')
const { expect } = require('chai')
const { MAX_UINT256, ZERO_ADDRESS, ZERO_BYTES32 } = constants

const { fromRpcSig } = require('ethereumjs-util')
const ethSigUtil = require('eth-sig-util')
const Wallet = require('ethereumjs-wallet').default

const { EIP712Domain, domainSeparator } = require('../helpers/eip712')

const permitTypeHash = web3.utils.keccak256(
  'Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)'
)

const Permit = [
  { name: 'owner', type: 'address' },
  { name: 'spender', type: 'address' },
  { name: 'value', type: 'uint256' },
  { name: 'nonce', type: 'uint256' },
  { name: 'deadline', type: 'uint256' },
]

function allowlistWithEIP2612(
  errorPrefix,
  name,
  initialHolder,
  recipient,
  pauser,
  blocklister,
  sendAmountAbove,
  sendAmountBelow,
  allowlister
) {
  const spender = recipient
  const version = '2'

  beforeEach(async function () {
    // We get the chain id from the contract because Ganache (used for coverage) does not return the same chain id
    // from within the EVM as from the JSON RPC interface.
    // See https://github.com/trufflesuite/ganache-core/issues/515
    this.chainId = 1337 // hardhat.confing.js
  })

  describe('permit', function () {
    const wallet = Wallet.generate()
    const owner = wallet.getAddressString()
    const nonce = 0
    const maxDeadline = MAX_UINT256

    it('accepts owner signature when unallowlisted and under 100000 tokens', async function () {
      const value = sendAmountBelow

      const buildData = (
        chainId,
        verifyingContract,
        deadline = maxDeadline
      ) => ({
        primaryType: 'Permit',
        types: { EIP712Domain, Permit },
        domain: { name, version, chainId, verifyingContract },
        message: { owner, spender, value, nonce, deadline },
      })

      await this.token.unAllowlist(owner, { from: allowlister })
      const data = buildData(this.chainId, this.token.address)
      const signature = ethSigUtil.signTypedMessage(wallet.getPrivateKey(), {
        data,
      })
      const { v, r, s } = fromRpcSig(signature)

      await this.token.permit(owner, spender, value, maxDeadline, v, r, s)

      expect(await this.token.nonces(owner)).to.be.bignumber.equal('1')
      expect(await this.token.allowance(owner, spender)).to.be.bignumber.equal(
        value
      )
    })

    it('reverts when permit with unallowlisted account and over 100000 tokens', async function () {
      const value = sendAmountAbove

      const buildData = (
        chainId,
        verifyingContract,
        deadline = maxDeadline
      ) => ({
        primaryType: 'Permit',
        types: { EIP712Domain, Permit },
        domain: { name, version, chainId, verifyingContract },
        message: { owner, spender, value, nonce, deadline },
      })

      // unallowlist owner
      await this.token.unAllowlist(owner, { from: allowlister })
      const data = buildData(this.chainId, this.token.address)
      const signature = ethSigUtil.signTypedMessage(wallet.getPrivateKey(), {
        data,
      })
      const { v, r, s } = fromRpcSig(signature)

      await expectRevert(
        this.token.permit(owner, spender, value, maxDeadline, v, r, s),
        `${errorPrefix}: account is not allowlisted`
      )
    })

    it('accepts owner signature when he is allowlisted and under 100000 tokens', async function () {
      const value = sendAmountBelow

      const buildData = (
        chainId,
        verifyingContract,
        deadline = maxDeadline
      ) => ({
        primaryType: 'Permit',
        types: { EIP712Domain, Permit },
        domain: { name, version, chainId, verifyingContract },
        message: { owner, spender, value, nonce, deadline },
      })

      await this.token.allowlist(owner, { from: allowlister })
      const data = buildData(this.chainId, this.token.address)
      const signature = ethSigUtil.signTypedMessage(wallet.getPrivateKey(), {
        data,
      })
      const { v, r, s } = fromRpcSig(signature)

      await this.token.permit(owner, spender, value, maxDeadline, v, r, s)

      expect(await this.token.nonces(owner)).to.be.bignumber.equal('1')
      expect(await this.token.allowance(owner, spender)).to.be.bignumber.equal(
        value
      )
    })

    it('accepts owner signature when he is allowlisted and over 100000 tokens', async function () {
      const value = sendAmountAbove

      const buildData = (
        chainId,
        verifyingContract,
        deadline = maxDeadline
      ) => ({
        primaryType: 'Permit',
        types: { EIP712Domain, Permit },
        domain: { name, version, chainId, verifyingContract },
        message: { owner, spender, value, nonce, deadline },
      })

      await this.token.allowlist(owner, { from: allowlister })
      const data = buildData(this.chainId, this.token.address)
      const signature = ethSigUtil.signTypedMessage(wallet.getPrivateKey(), {
        data,
      })
      const { v, r, s } = fromRpcSig(signature)

      await this.token.permit(owner, spender, value, maxDeadline, v, r, s)

      expect(await this.token.nonces(owner)).to.be.bignumber.equal('1')
      expect(await this.token.allowance(owner, spender)).to.be.bignumber.equal(
        value
      )
    })
  })
}

module.exports = {
  allowlistWithEIP2612,
}
