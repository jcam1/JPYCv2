const { expect } = require('chai')

const { domainSeparator } = require('../helpers/eip712')

function shouldBehaveLikeEIP712Domain(
  errorPrefix,
  name,
  version="1"
) {
  beforeEach(function () {
    // We get the chain id from the contract because Ganache (used for coverage) does not return the same chain id
    // from within the EVM as from the JSON RPC interface.
    // See https://github.com/trufflesuite/ganache-core/issues/515
    this.chainId = 1337 // hardhat.confing.js
  })

  it('has a DOMAIN_SEPARATOR', async function () {
    const expectedDomainSeparator = await domainSeparator(name, version, this.chainId, this.token.address);
    expect(
      await this.token.DOMAIN_SEPARATOR()
    ).to.equal(expectedDomainSeparator);
  })

  it('has a version', async function () {
    expect(await this.token.version()).to.equal(version)
  })
}

module.exports = {
  shouldBehaveLikeEIP712Domain,
}
