const {
  BN,
  constants,
  expectEvent,
  expectRevert,
} = require('@openzeppelin/test-helpers')
const { expect } = require('chai')
const { ZERO_ADDRESS } = constants

const { shouldBehaveLikeERC20 } = require('./ERC20.behavior')

const { shouldBehaveLikeBlocklistable } = require('./Blocklistable.behavior')

const { shouldBehaveLikeOwnable } = require('./Ownable.behabvior')

const { shouldBehaveLikePausable } = require('./Pausable.behavior')

const { shouldBehaveLikeRescuable } = require('./Rescuable.behavior')

const { shouldBehaveLikeEIP3009 } = require(`./EIP3009.behavior`)

const { shouldBehaveLikeEIP2612 } = require(`./EIP2612.behavior`)

const { shouldBehaveLikeFiatTokenV1 } = require('./FiatTokenV1.behavior')

const { shouldBehaveLikeUUPSUpgradeable } = require('./UUPSUpgradeable.behavior')

const { artifacts } = require('hardhat')

const FiatTokenV1 = artifacts.require('FiatTokenV1')
const FiatTokenV1Test = artifacts.require('FiatTokenV1Test')

contract('FiatTokenV1', function (accounts) {
  const initialHolder = accounts[0]
  const recipient = accounts[1]
  const anotherAccount = accounts[2]

  const name = 'JPY Coin'
  const symbol = 'JPYC'
  const currency = 'JPY'
  const decimals = 18
  const minterAdmin = accounts[3]
  const pauser = accounts[4]
  const blocklister = accounts[5]
  const owner = initialHolder

  const minter = accounts[6]
  const blocklisted = accounts[7]
  const unblocklisted = accounts[8]
  const rescuer = accounts[9]

  const initialSupply = new BN(100)

  beforeEach(async function () {
    this.token = await FiatTokenV1.new()
    await this.token.initialize(
      name,
      symbol,
      currency,
      decimals,
      minterAdmin,
      pauser,
      blocklister,
      rescuer,
      owner
    )
    await this.token.configureMinter(minter, initialSupply, {
      from: minterAdmin,
    })
    await this.token.mint(initialHolder, initialSupply, { from: minter })
    await this.token.blocklist(blocklisted, { from: blocklister })
  })

  it('already initialized', async function () {
    await expectRevert(
      this.token.initialize(
        name,
        symbol,
        currency,
        decimals,
        minterAdmin,
        pauser,
        blocklister,
        rescuer,
        owner
      ),
      'FiatToken: contract is already initialized'
    )
  })

  it('has a name', async function () {
    expect(await this.token.name()).to.equal(name)
  })

  it('has a symbol', async function () {
    expect(await this.token.symbol()).to.equal(symbol)
  })

  it('has a currency', async function () {
    expect(await this.token.symbol()).to.equal(symbol)
  })

  it('has 18 decimals', async function () {
    expect(await this.token.decimals()).to.be.bignumber.equal('18')
  })

  it('has a minterAdmin', async function () {
    expect(await this.token.minterAdmin()).to.equal(minterAdmin)
  })

  it('has a pauser', async function () {
    expect(await this.token.pauser()).to.equal(pauser)
  })

  it('has a blockLister', async function () {
    expect(await this.token.blocklister()).to.equal(blocklister)
  })

  it('has an owner', async function () {
    expect(await this.token.owner()).to.equal(owner)
  })

  it('has a rescuer', async function () {
    expect(await this.token.rescuer()).to.equal(rescuer)
  })

  // 直接呼び出せないのでFiatTokenV1を継承したmockを使用
  it('_approve test', async function () {
    const tokenTest = await FiatTokenV1Test.new()
    const value = new BN(100)
    await expectRevert(
      tokenTest.approveTest(ZERO_ADDRESS, recipient, value),
      'FiatToken: approve from the zero address'
    )
  })

  describe('shouldBehaveLikeERC20', () => {
    shouldBehaveLikeERC20(
      'FiatToken',
      initialSupply,
      initialHolder,
      recipient,
      anotherAccount
    )
  })

  describe('shouldBehaveLikeBlocklistable', () => {
    shouldBehaveLikeBlocklistable(
      'Blocklistable',
      blocklister,
      blocklisted,
      unblocklisted,
      owner,
      initialSupply,
      initialHolder,
      anotherAccount,
      minterAdmin
    )
  })

  describe('shouldBehaveLikeOwnable', () => {
    shouldBehaveLikeOwnable('Ownable', owner, anotherAccount)
  })

  describe('shouldBehaveLikePausable', () => {
    shouldBehaveLikePausable(
      'Pausable',
      pauser,
      owner,
      anotherAccount,
      initialSupply,
      initialHolder,
      recipient,
      minterAdmin
    )
  })

  describe('shouldBehaveLikeRescuable', () => {
    shouldBehaveLikeRescuable('Rescuable', rescuer, owner, anotherAccount)
  })

  describe('shouldBehaveLikeEIP2612', () => {
    shouldBehaveLikeEIP2612(
      'EIP2612',
      name,
      initialHolder,
      recipient,
      pauser,
      blocklister
    )
  })

  describe('shouldBehaveLikeEIP3009', () => {
    shouldBehaveLikeEIP3009(
      'EIP3009',
      name,
      initialSupply,
      initialHolder,
      recipient,
      pauser,
      blocklister
    )
  })

  describe('shouldBehaveLikeFiatTokenV1', () => {
    shouldBehaveLikeFiatTokenV1(
      'FiatToken',
      minterAdmin,
      anotherAccount,
      recipient,
      initialSupply,
      owner
    )
  })

  describe('shouldBehaveLikeUUPSUpgradeable', () => {
    shouldBehaveLikeUUPSUpgradeable('UUPSUPgradable')
  })
})
