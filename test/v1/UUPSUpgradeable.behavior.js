const { expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
const { expect } = require('chai');

const UUPSUpgradeableMock = artifacts.require('FiatTokenV1');

const _IMPLEMENTATION_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";

function shouldBehaveLikeUUPSUpgradeable(errorPrefix) {
  let implUpgradeOk;
  beforeEach(async function () {
    implUpgradeOk = await UUPSUpgradeableMock.new();
  });

  it('expected proxiableUUID _IMPLEMENTATION_SLOT', async function () {
    expect(await this.token.proxiableUUID()).to.equal(_IMPLEMENTATION_SLOT);
  });

  it('reject upgradeTo not through delegatecall', async function () {
    await expectRevert(
      this.token.upgradeTo(implUpgradeOk.address),
      'Function must be called through delegatecall',
    );
  });

  it('reject upgradeToAndCall not through delegatecall', async function () {
    await expectRevert(
      this.token.upgradeToAndCall(implUpgradeOk.address, implUpgradeOk.contract.methods.name().encodeABI()),
      'Function must be called through delegatecall',
    );
  });
};

module.exports = {
  shouldBehaveLikeUUPSUpgradeable,
};