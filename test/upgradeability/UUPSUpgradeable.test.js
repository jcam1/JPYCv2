const { expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
const { getSlot, ImplementationSlot } = require('../helpers/erc1967');

const ERC1967Proxy = artifacts.require('ERC1967Proxy');
const UUPSUpgradeableMock = artifacts.require('FiatTokenV1');
const UUPSUpgradeableUnsafeMock = artifacts.require('UUPSUpgradeableUnsafeMock');
const DummyERC20 = artifacts.require('DummyERC20');

const { _data } = require('../helpers/DataMaker');

contract('UUPSUpgradeable', function (accounts) {
  const [
    owner,
    minterAdmin,
    pauser,
    blocklister,
    rescuer,
    anotherAccount
  ] = accounts

  let implUpgradeOk;
  let implUpgradeUnsafe;
  let implUpgradeNonUUPS;
  beforeEach(async function () {
    const fiatToken = await UUPSUpgradeableMock.new();
    implUpgradeOk = await UUPSUpgradeableMock.new();
    implUpgradeUnsafe = await UUPSUpgradeableUnsafeMock.new();
    implUpgradeNonUUPS = await DummyERC20.new("Dummy", "DUM", 1000);
    const proxy = await ERC1967Proxy.new(fiatToken.address, _data(minterAdmin, pauser, blocklister, rescuer, owner));
    this.token = await UUPSUpgradeableMock.at(proxy.address);
  });

  it('reject proxiableUUID through delegatecall', async function () {
    await expectRevert(
      this.token.proxiableUUID(),
      "UUPSUpgradeable: must not be called through delegatecall"
    );
  });

  it('upgrade to upgradeable implementation', async function () {
    const { receipt } = await this.token.upgradeTo(implUpgradeOk.address, {from: owner});
    expect(receipt.logs.filter(({ event }) => event === 'Upgraded').length).to.be.equal(1);
    expectEvent(receipt, 'Upgraded', { implementation: implUpgradeOk.address });
  });

  it('upgrade to upgradeable implementation with call', async function () {
    expect(await this.token.owner()).to.equal(owner);

    const { receipt } = await this.token.upgradeToAndCall(
      implUpgradeOk.address,
      implUpgradeOk.contract.methods.transferOwnership(anotherAccount).encodeABI(),
      {from: owner}
    );
    expect(receipt.logs.filter(({ event }) => event === 'Upgraded').length).to.be.equal(1);
    expectEvent(receipt, 'Upgraded', { implementation: implUpgradeOk.address });

    expect(await this.token.owner()).to.equal(anotherAccount);
  });

  it('upgrade to and unsafe upgradeable implementation', async function () {
    const { receipt } = await this.token.upgradeTo(implUpgradeUnsafe.address, {from: owner});
    expectEvent(receipt, 'Upgraded', { implementation: implUpgradeUnsafe.address });
  });

  // delegate to a non existing upgradeTo function causes a low level revert
  it('reject upgrade to non uups implementation', async function () {
    await expectRevert(
      this.token.upgradeTo(implUpgradeNonUUPS.address, {from: owner}),
      'ERC1967Upgrade: new implementation is not UUPS',
    );
  });

  it('reject proxy address as implementation', async function () {
    const { address } = await ERC1967Proxy.new(implUpgradeOk.address, '0x');
    const otherInstance = await UUPSUpgradeableMock.at(address);

    await expectRevert(
      this.token.upgradeTo(otherInstance.address, {from: owner}),
      'ERC1967Upgrade: new implementation is not UUPS',
    );
  });
});