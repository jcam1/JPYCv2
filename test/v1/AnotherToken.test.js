const { shouldBehaveLikeInitialize } = require('./Initialize.behavior')

const FiatTokenV1 = artifacts.require('FiatTokenV1')

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
  const rescuer = accounts[9]

  beforeEach(async function () {
    this.anotherToken = await FiatTokenV1.new()
  })
  
  describe('shouldBehaveLikeInitialize', () => {
    shouldBehaveLikeInitialize(
      'FiatToken',
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
  })
})