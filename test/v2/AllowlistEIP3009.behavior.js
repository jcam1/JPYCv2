const crypto = require('crypto')
const {
  BN,
  constants,
  expectEvent,
  expectRevert,
  time,
} = require('@openzeppelin/test-helpers')
const { expect } = require('chai')
const { MAX_UINT256, ZERO_ADDRESS, ZERO_BYTES32 } = constants

const { fromRpcSig, toChecksumAddress } = require('ethereumjs-util')
const ethSigUtil = require('eth-sig-util')
const Wallet = require('ethereumjs-wallet').default
const createKeccakHash = require('keccak')

const { EIP712Domain, domainSeparator } = require('../helpers/eip712')
const {
  ContractFunctionVisibility,
} = require('hardhat/internal/hardhat-network/stack-traces/model')
const { threadId } = require('worker_threads')
const { web3 } = require('@openzeppelin/test-helpers/src/setup')

const transferWithAuthorizationTypeHash = web3.utils.keccak256(
  'TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)'
)

const receiveWithAuthorizationTypeHash = web3.utils.keccak256(
  'ReceiveWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)'
)

const cancelAuthorizationTypeHash = web3.utils.keccak256(
  'CancelAuthorization(address authorizer,bytes32 nonce)'
)

const TransferWithAuthorization = [
  { name: 'from', type: 'address' },
  { name: 'to', type: 'address' },
  { name: 'value', type: 'uint256' },
  { name: 'validAfter', type: 'uint256' },
  { name: 'validBefore', type: 'uint256' },
  { name: 'nonce', type: 'bytes32' },
]

const ReceiveWithAuthorization = [
  { name: 'from', type: 'address' },
  { name: 'to', type: 'address' },
  { name: 'value', type: 'uint256' },
  { name: 'validAfter', type: 'uint256' },
  { name: 'validBefore', type: 'uint256' },
  { name: 'nonce', type: 'bytes32' },
]

const CancelAuthorization = [
  { name: 'authorizer', type: 'address' },
  { name: 'nonce', type: 'bytes32' },
]

function allowlistWithEIP3009(
  errorPrefix,
  name,
  mintSupply,
  initialHolder,
  recipient,
  pauser,
  blocklister,
  sendAmountAbove,
  sendAmountBelow,
  minter,
  allowlister
) {
  const to = recipient
  const version = '2'

  beforeEach(async function () {
    // We get the chain id from the contract because Ganache (used for coverage) does not return the same chain id
    // from within the EVM as from the JSON RPC interface.
    // See https://github.com/trufflesuite/ganache-core/issues/515
    this.chainId = 1337 // hardhat.confing.js
  })

  describe('TransferWithAuthorization', async function () {
    const wallet = Wallet.generate()
    let owner = wallet.getAddressString()
    const from = toChecksumAddress(owner)

    beforeEach(async function () {
      await this.token.allowlist(minter, { from: allowlister })
      await this.token.mint(initialHolder, mintSupply, { from: minter })
      await this.token.transfer(from, mintSupply, { from: initialHolder })
    })

    const minValidAfter = new BN(0)
    const maxValidBefore = MAX_UINT256
    const nonce = '0x' + crypto.randomBytes(32).toString('hex')

    const buildData = (
      chainId,
      verifyingContract,
      value,
      validAfter = minValidAfter,
      validBefore = maxValidBefore
    ) => ({
      primaryType: 'TransferWithAuthorization',
      types: { EIP712Domain, TransferWithAuthorization },
      domain: { name, version, chainId, verifyingContract },
      message: { from, to, value, validAfter, validBefore, nonce },
    })

    it('accepts owner signature when from is unAllowlisted and send under 100000 tokens', async function () {
      await this.token.unAllowlist(from, { from: allowlister })
      const value = sendAmountBelow

      expect(await this.token.balanceOf(from)).to.be.bignumber.equal(mintSupply)
      expect(await this.token.balanceOf(to)).to.be.bignumber.equal(new BN(0))

      expect(await this.token.authorizationState(from, nonce)).to.equal(false)

      const data = buildData(this.chainId, this.token.address, value)
      const signature = ethSigUtil.signTypedMessage(wallet.getPrivateKey(), {
        data,
      })
      const { v, r, s } = fromRpcSig(signature)

      await this.token.transferWithAuthorization(
        from,
        to,
        value,
        minValidAfter,
        maxValidBefore,
        nonce,
        v,
        r,
        s
      )

      expect(await this.token.balanceOf(from)).to.be.bignumber.equal(
        mintSupply.sub(value)
      )
      expect(await this.token.balanceOf(to)).to.be.bignumber.equal(value)

      expect(await this.token.authorizationState(from, nonce)).to.equal(true)
    })

    it('reverts when from is unAllowlisted and send over 100000 tokens', async function () {
      await this.token.unAllowlist(from, { from: allowlister })
      const value = sendAmountAbove

      expect(await this.token.balanceOf(from)).to.be.bignumber.equal(mintSupply)
      expect(await this.token.balanceOf(to)).to.be.bignumber.equal(new BN(0))

      expect(await this.token.authorizationState(from, nonce)).to.equal(false)

      const data = buildData(this.chainId, this.token.address, value)
      const signature = ethSigUtil.signTypedMessage(wallet.getPrivateKey(), {
        data,
      })
      const { v, r, s } = fromRpcSig(signature)

      await expectRevert(
        this.token.transferWithAuthorization(
          from,
          to,
          value,
          minValidAfter,
          maxValidBefore,
          nonce,
          v,
          r,
          s
        ),
        `${errorPrefix}: account is not allowlisted`
      )
    })

    it('accepts owner signature when from is allowlisted and send under 100000 tokens', async function () {
      await this.token.allowlist(from, { from: allowlister })
      const value = sendAmountBelow

      expect(await this.token.balanceOf(from)).to.be.bignumber.equal(mintSupply)
      expect(await this.token.balanceOf(to)).to.be.bignumber.equal(new BN(0))

      expect(await this.token.authorizationState(from, nonce)).to.equal(false)

      const data = buildData(this.chainId, this.token.address, value)
      const signature = ethSigUtil.signTypedMessage(wallet.getPrivateKey(), {
        data,
      })
      const { v, r, s } = fromRpcSig(signature)

      await this.token.transferWithAuthorization(
        from,
        to,
        value,
        minValidAfter,
        maxValidBefore,
        nonce,
        v,
        r,
        s
      )

      expect(await this.token.balanceOf(from)).to.be.bignumber.equal(
        mintSupply.sub(value)
      )
      expect(await this.token.balanceOf(to)).to.be.bignumber.equal(value)

      expect(await this.token.authorizationState(from, nonce)).to.equal(true)
    })

    it('accepts owner signature when from is allowlisted and send over 100000 tokens', async function () {
      await this.token.allowlist(from, { from: allowlister })
      const value = sendAmountAbove

      expect(await this.token.balanceOf(from)).to.be.bignumber.equal(mintSupply)
      expect(await this.token.balanceOf(to)).to.be.bignumber.equal(new BN(0))

      expect(await this.token.authorizationState(from, nonce)).to.equal(false)

      const data = buildData(this.chainId, this.token.address, value)
      const signature = ethSigUtil.signTypedMessage(wallet.getPrivateKey(), {
        data,
      })
      const { v, r, s } = fromRpcSig(signature)

      await this.token.transferWithAuthorization(
        from,
        to,
        value,
        minValidAfter,
        maxValidBefore,
        nonce,
        v,
        r,
        s
      )

      expect(await this.token.balanceOf(from)).to.be.bignumber.equal(
        mintSupply.sub(value)
      )

      expect(await this.token.balanceOf(to)).to.be.bignumber.equal(value)

      expect(await this.token.authorizationState(from, nonce)).to.equal(true)
    })
  })

  describe('ReceiveWithAuthorization', async function () {
    const wallet = Wallet.generate()
    let owner = wallet.getAddressString()
    const from = toChecksumAddress(owner)

    beforeEach(async function () {
      await this.token.allowlist(minter, { from: allowlister })
      await this.token.mint(initialHolder, mintSupply, { from: minter })
      await this.token.transfer(from, mintSupply, { from: initialHolder })
    })

    const minValidAfter = new BN(0)
    const maxValidBefore = MAX_UINT256
    const nonce = '0x' + crypto.randomBytes(32).toString('hex')

    const buildData = (
      chainId,
      verifyingContract,
      value,
      validAfter = minValidAfter,
      validBefore = maxValidBefore
    ) => ({
      primaryType: 'ReceiveWithAuthorization',
      types: { EIP712Domain, ReceiveWithAuthorization },
      domain: { name, version, chainId, verifyingContract },
      message: { from, to, value, validAfter, validBefore, nonce },
    })

    it('accepts owner signature when from is not allowlisted and receive under 100000 tokens and caller is the payee', async function () {
      const value = sendAmountBelow
      await this.token.unAllowlist(from, { from: allowlister })

      expect(await this.token.balanceOf(from)).to.be.bignumber.equal(mintSupply)
      expect(await this.token.balanceOf(to)).to.be.bignumber.equal(new BN(0))
      expect(await this.token.authorizationState(from, nonce)).to.equal(false)

      const data = buildData(this.chainId, this.token.address, value)
      const signature = ethSigUtil.signTypedMessage(wallet.getPrivateKey(), {
        data,
      })
      const { v, r, s } = fromRpcSig(signature)

      await this.token.receiveWithAuthorization(
        from,
        to,
        value,
        minValidAfter,
        maxValidBefore,
        nonce,
        v,
        r,
        s,
        { from: to }
      )

      expect(await this.token.balanceOf(from)).to.be.bignumber.equal(
        mintSupply.sub(value)
      )
      expect(await this.token.balanceOf(to)).to.be.bignumber.equal(value)

      expect(await this.token.authorizationState(from, nonce)).to.equal(true)
    })

    it('reverts when from is not allowlisted and receive over 100000 tokens and caller is the payee', async function () {
      const value = sendAmountAbove
      await this.token.unAllowlist(from, { from: allowlister })

      const data = buildData(this.chainId, this.token.address, value)
      const signature = ethSigUtil.signTypedMessage(wallet.getPrivateKey(), {
        data,
      })
      const { v, r, s } = fromRpcSig(signature)

      await expectRevert(
        this.token.receiveWithAuthorization(
          from,
          to,
          value,
          minValidAfter,
          maxValidBefore,
          nonce,
          v,
          r,
          s,
          { from: to }
        ),
        `${errorPrefix}: account is not allowlisted`
      )
    })

    it('accepts owner signature when from is allowlisted and receive under 100000 tokens and caller is the payee', async function () {
      const value = sendAmountBelow
      await this.token.allowlist(from, { from: allowlister })

      expect(await this.token.balanceOf(from)).to.be.bignumber.equal(mintSupply)
      expect(await this.token.balanceOf(to)).to.be.bignumber.equal(new BN(0))
      expect(await this.token.authorizationState(from, nonce)).to.equal(false)

      const data = buildData(this.chainId, this.token.address, value)
      const signature = ethSigUtil.signTypedMessage(wallet.getPrivateKey(), {
        data,
      })
      const { v, r, s } = fromRpcSig(signature)

      await this.token.receiveWithAuthorization(
        from,
        to,
        value,
        minValidAfter,
        maxValidBefore,
        nonce,
        v,
        r,
        s,
        { from: to }
      )

      expect(await this.token.balanceOf(from)).to.be.bignumber.equal(
        mintSupply.sub(value)
      )
      expect(await this.token.balanceOf(to)).to.be.bignumber.equal(value)

      expect(await this.token.authorizationState(from, nonce)).to.equal(true)
    })

    it('accepts owner signature when from is allowlisted and receive over 100000 tokens and caller is the payee', async function () {
      const value = sendAmountAbove
      await this.token.allowlist(from, { from: allowlister })

      expect(await this.token.balanceOf(from)).to.be.bignumber.equal(mintSupply)
      expect(await this.token.balanceOf(to)).to.be.bignumber.equal(new BN(0))
      expect(await this.token.authorizationState(from, nonce)).to.equal(false)

      const data = buildData(this.chainId, this.token.address, value)
      const signature = ethSigUtil.signTypedMessage(wallet.getPrivateKey(), {
        data,
      })
      const { v, r, s } = fromRpcSig(signature)

      await this.token.receiveWithAuthorization(
        from,
        to,
        value,
        minValidAfter,
        maxValidBefore,
        nonce,
        v,
        r,
        s,
        { from: to }
      )

      expect(await this.token.balanceOf(from)).to.be.bignumber.equal(
        mintSupply.sub(value)
      )
      expect(await this.token.balanceOf(to)).to.be.bignumber.equal(value)
      expect(await this.token.authorizationState(from, nonce)).to.equal(true)
    })
  })
}

module.exports = {
  allowlistWithEIP3009,
}
