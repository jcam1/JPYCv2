const {
  BN,
  constants,
  expectEvent,
  expectRevert,
} = require('@openzeppelin/test-helpers')
const { expect } = require('chai')
const { ZERO_ADDRESS } = constants
const { _data } = require('../helpers/DataMaker')

const { shouldBehaveLikeERC20 } = require('../v1/ERC20.behavior')

const { shouldBehaveLikeBlocklistable } = require('../v1/Blocklistable.behavior')

const { shouldBehaveLikeOwnable } = require('../v1/Ownable.behabvior')

const { shouldBehaveLikePausable } = require('../v1/Pausable.behavior')

const { shouldBehaveLikeRescuable } = require('../v1/Rescuable.behavior')

const { shouldBehaveLikeFiatTokenV1 } = require('../v1/FiatTokenV1.behavior')

const { shouldBehaveLikeUUPSUpgradeable } = require('../v1/UUPSUpgradeable.behavior')

const { shouldBehaveLikeEIP712Domain } = require('../v1_1/EIP712Domain.behavior')

const { shouldBehaveLikeEIP2612 } = require(`../v1_1/EIP2612.behavior`)

const { shouldBehaveLikeEIP3009 } = require(`../v1_1/EIP3009.behavior`)

const { artifacts } = require('hardhat')

const FiatTokenV1 = artifacts.require('FiatTokenV1')
const FiatTokenV1_1 = artifacts.require('FiatTokenV1_1')
const FiatTokenV1_1Test = artifacts.require('FiatTokenV1_1Test')
const ERC1967Proxy = artifacts.require('ERC1967Proxy')

contract('FiatTokenV1_1_proxy', function (accounts) {
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
    this.implementationV1 = await FiatTokenV1.new()
    this.implementationV1_1 = await FiatTokenV1_1.new()

    // initialize implementation v1 in proxy
    this.proxyContract = await ERC1967Proxy.new(
      this.implementationV1.address,
      _data(minterAdmin, pauser, blocklister, rescuer, owner)
    )
    // call tokenImple from proxy address
    this.tokenImpleAtProxy = await FiatTokenV1.at(this.proxyContract.address)

    // additional case setting
    await this.tokenImpleAtProxy.configureMinter(minter, initialSupply, {
      from: minterAdmin,
    })
    await this.tokenImpleAtProxy.mint(initialHolder, initialSupply, {
      from: minter,
    })
    await this.tokenImpleAtProxy.blocklist(blocklisted, { from: blocklister })

    // upgrade to v1_1
    this.tokenImpleAtProxy.upgradeTo(this.implementationV1_1.address, { from: owner })

    // Call v1_1 implementation from proxy
    this.token = await FiatTokenV1_1.at(this.proxyContract.address)
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
    const tokenTest = await FiatTokenV1_1Test.new()
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

  describe('shouldBehaveLikeEIP712Domain', () => {
    shouldBehaveLikeEIP712Domain(
      'EIP712Domain',
      name
    )
  })
})
