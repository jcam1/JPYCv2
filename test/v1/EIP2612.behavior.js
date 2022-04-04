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

function shouldBehaveLikeEIP2612(
  errorPrefix,
  name,
  initialHolder,
  recipient,
  pauser,
  blocklister,
  version="1"
) {
  const spender = recipient


  beforeEach(async function () {
    // We get the chain id from the contract because Ganache (used for coverage) does not return the same chain id
    // from within the EVM as from the JSON RPC interface.
    // See https://github.com/trufflesuite/ganache-core/issues/515
    this.chainId = 1337 // hardhat.confing.js
  })

  it('initial nonce is 0', async function () {
    expect(await this.token.nonces(initialHolder)).to.be.bignumber.equal('0')
  })

  it('domain separator', async function () {
    expect(await this.token._domainSeparatorV4()).to.equal(
      await domainSeparator(name, version, this.chainId, this.token.address)
    )
  })

  it('expected permit type hash', async function () {
    expect(await this.token.PERMIT_TYPEHASH()).to.equal(permitTypeHash)
  })

  describe('permit', function () {
    const wallet = Wallet.generate()

    const owner = wallet.getAddressString()
    const value = new BN(42)
    const nonce = 0
    const maxDeadline = MAX_UINT256

    const buildData = (chainId, verifyingContract, deadline = maxDeadline) => ({
      primaryType: 'Permit',
      types: { EIP712Domain, Permit },
      domain: { name, version, chainId, verifyingContract },
      message: { owner, spender, value, nonce, deadline },
    })

    it('accepts owner signature', async function () {
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

    it('revert not match given parameters', async function () {
      const data = buildData(this.chainId, this.token.address)
      const signature = ethSigUtil.signTypedMessage(wallet.getPrivateKey(), {
        data,
      })
      const { v, r, s } = fromRpcSig(signature)

      await expectRevert(
        this.token.permit(owner, spender, value * 2, maxDeadline, v, r, s),
        'EIP2612: invalid signature'
      )
    })

    it('revert reused signature', async function () {
      const data = buildData(this.chainId, this.token.address)
      const signature = ethSigUtil.signTypedMessage(wallet.getPrivateKey(), {
        data,
      })
      const { v, r, s } = fromRpcSig(signature)

      await this.token.permit(owner, spender, value, maxDeadline, v, r, s)

      await expectRevert(
        this.token.permit(owner, spender, value, maxDeadline, v, r, s),
        'EIP2612: invalid signature'
      )
    })

    it('revert other signature', async function () {
      const otherWallet = Wallet.generate()
      const data = buildData(this.chainId, this.token.address)
      const signature = ethSigUtil.signTypedMessage(
        otherWallet.getPrivateKey(),
        { data }
      )
      const { v, r, s } = fromRpcSig(signature)

      await expectRevert(
        this.token.permit(owner, spender, value, maxDeadline, v, r, s),
        'EIP2612: invalid signature'
      )
    })

    it('revert expired permit', async function () {
      const deadline = (await time.latest()) - time.duration.weeks(1)

      const data = buildData(this.chainId, this.token.address, deadline)
      const signature = ethSigUtil.signTypedMessage(wallet.getPrivateKey(), {
        data,
      })
      const { v, r, s } = fromRpcSig(signature)

      await expectRevert(
        this.token.permit(owner, spender, value, deadline, v, r, s),
        'EIP2612: permit is expired'
      )
    })

    it('revert when paused', async function () {
      const data = buildData(this.chainId, this.token.address)
      const signature = ethSigUtil.signTypedMessage(wallet.getPrivateKey(), {
        data,
      })
      const { v, r, s } = fromRpcSig(signature)

      await this.token.pause({ from: pauser })

      await expectRevert(
        this.token.permit(owner, spender, value, maxDeadline, v, r, s),
        'Pausable: paused'
      )
    })

    it('revert when owner or spender is blocklisted', async function () {
      const data = buildData(this.chainId, this.token.address)
      const signature = ethSigUtil.signTypedMessage(wallet.getPrivateKey(), {
        data,
      })
      const { v, r, s } = fromRpcSig(signature)

      await this.token.blocklist(owner, { from: blocklister })

      await expectRevert(
        this.token.permit(owner, spender, value, maxDeadline, v, r, s),
        'Blocklistable: account is blocklisted'
      )

      await this.token.unBlocklist(owner, { from: blocklister })
      await this.token.blocklist(spender, { from: blocklister })

      await expectRevert(
        this.token.permit(owner, spender, value, maxDeadline, v, r, s),
        'Blocklistable: account is blocklisted'
      )
    })
  })
}

module.exports = {
  shouldBehaveLikeEIP2612,
}
