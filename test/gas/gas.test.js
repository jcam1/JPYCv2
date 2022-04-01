const { BN } = require('@openzeppelin/test-helpers')
const { _data } = require('../helpers/DataMaker')

const { gasEstimateEIP2612 } = require('./gasEIP2612.behavior')
const { gasEstimateEIP3009 } = require('./gasEIP3009.behavior')

const FiatTokenV1 = artifacts.require('FiatTokenV1')
const ERC1967Proxy = artifacts.require('ERC1967Proxy')

contract('FiatTokenV1_Proxy', function (accounts) {
  const initialHolder = accounts[0]
  const recipient = accounts[1]
  const anotherAccount = accounts[2]

  const name = 'JPY Coin'
  const minterAdmin = accounts[3]
  const pauser = accounts[4]
  const blacklister = accounts[5]
  const owner = initialHolder
  const minter = accounts[6]
  const rescuer = accounts[7]

  const initialSupply = new BN(100)

  beforeEach(async function () {
    this.implementation = await FiatTokenV1.new()
    this.proxy = await ERC1967Proxy.new(
      this.implementation.address,
      _data(minterAdmin, pauser, blacklister, owner, rescuer)
    )
    this.token = await FiatTokenV1.at(this.proxy.address)
    await this.token.configureMinter(minter, initialSupply, {
        from: minterAdmin,
      })
    await this.token.mint(initialHolder, initialSupply, { from: minter })
  })

  describe('gasEIP2612', () => {
    gasEstimateEIP2612(
      name,
      initialSupply,
      initialHolder,
      recipient,
    )
  })

  describe('gasEIP3009', () => {
    gasEstimateEIP3009(
      name,
      initialSupply,
      initialHolder,
      recipient,
    )
  })
})
