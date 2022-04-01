const {
  BN,
  constants,
  expectEvent,
  expectRevert,
} = require('@openzeppelin/test-helpers')

const { _data, _dataV2 } = require('../helpers/DataMaker')

const { expect } = require('chai')
const { ZERO_ADDRESS } = constants

const { shouldBehaveLikeERC20 } = require('../v1/ERC20.behavior')

const {
  shouldBehaveLikeBlocklistable,
} = require('../v1/Blocklistable.behavior')

const {
  shouldBehaveLikeAllowlistable,
} = require('../v2/Allowlistable.behavior')

const { shouldBehaveLikeOwnable } = require('../v1/Ownable.behabvior')

const { shouldBehaveLikePausable } = require('../v1/Pausable.behavior')

const { shouldBehaveLikeRescuable } = require('../v1/Rescuable.behavior')

const { shouldBehaveLikeEIP3009 } = require(`../v1/EIP3009.behavior`)

const { shouldBehaveLikeEIP2612 } = require(`../v1/EIP2612.behavior`)

const { shouldBehaveLikeFiatTokenV1 } = require('../v1/FiatTokenV1.behavior')

const { allowlistWithEIP2612 } = require('../v2/AllowlistEIP2612.behavior')

const { allowlistWithEIP3009 } = require('../v2/AllowlistEIP3009.behavior')

const { artifacts } = require('hardhat')

const FiatTokenV1 = artifacts.require('FiatTokenV1')
const FiatTokenV2 = artifacts.require('FiatTokenV2')
const FiatTokenV2Test = artifacts.require('FiatTokenV2Test')
const ERC1967Proxy = artifacts.require('ERC1967Proxy')

contract('FiatTokenV2_proxy', function (accounts) {
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
  const allowlister = accounts[9]
  const unAllowlisted = accounts[1]
  const allowlisted = accounts[0]

  const initialSupply = new BN(100)
  // variables for allowlist
  const mintSupplyCap = new BN('210000000000000000000000')
  const mintSupply = new BN('110000000000000000000000')
  const sendAmountAbove = new BN('110000000000000000000000')
  const sendAmountBelow = new BN('90000000000000000000000')

  beforeEach(async function () {
    this.implementationV1 = await FiatTokenV1.new()
    this.implementationV2 = await FiatTokenV2.new()

    // initialize implementation v1 in proxy
    this.proxyContract = await ERC1967Proxy.new(
      this.implementationV1.address,
      _data(minterAdmin, pauser, blocklister, rescuer, owner)
    )
    // call tokenImple from proxy address
    this.tokenImpleAtProxy = await FiatTokenV1.at(this.proxyContract.address)

    // additional case setting
    await this.tokenImpleAtProxy.configureMinter(minter, mintSupplyCap, {
      from: minterAdmin,
    })
    await this.tokenImpleAtProxy.mint(initialHolder, initialSupply, {
      from: minter,
    })
    await this.tokenImpleAtProxy.blocklist(blocklisted, { from: blocklister })

    // upgrade to v2
    this.tokenImpleAtProxy.upgradeToAndCall(this.implementationV2.address, _dataV2, {from: owner})

    // Call v2 implementation from proxy
    this.token = await FiatTokenV2.at(this.proxyContract.address)
    // additional case setting
    await this.token.updateAllowlister(allowlister, { from: owner })
    await this.token.allowlist(allowlisted, { from: allowlister })
    await this.token.configureMinter(minter, mintSupplyCap, {
      from: minterAdmin,
    })
  })

  it('check addresses are not null', async function () {
    console.log(
      'Imlementation FiatTokenV1 deployed to:',
      this.implementationV1.address
    )
    console.log('proxy contract:', this.proxyContract.address)
    assert(this.proxyContract.address != null)
    assert(this.implementationV1.address != null)
    assert(this.implementationV2.address != null)
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
    const tokenTest = await FiatTokenV2Test.new()
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

  describe('shouldBehaveLikeAllowlistable', () => {
    shouldBehaveLikeAllowlistable(
      'FiatToken',
      allowlister,
      allowlisted,
      unAllowlisted,
      owner,
      recipient,
      initialSupply,
      mintSupply,
      sendAmountBelow,
      sendAmountAbove,
      initialHolder,
      anotherAccount,
      minterAdmin,
      minter,
      pauser
    )
  })

  describe('allowlistWithEIP2612', () => {
    allowlistWithEIP2612(
      'FiatToken',
      name,
      initialHolder,
      recipient,
      pauser,
      blocklister,
      sendAmountAbove,
      sendAmountBelow,
      allowlister
    )
  })

  describe('allowlistWithEIP3009', () => {
    allowlistWithEIP3009(
      'FiatToken',
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
      blocklister,
      "2"
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
      blocklister,
      "2"
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
})
