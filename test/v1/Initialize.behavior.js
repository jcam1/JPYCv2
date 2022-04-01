const { BN, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { ZERO_ADDRESS } = constants;

const FiatTokenV1= artifacts.require('FiatTokenV1');

function shouldBehaveLikeInitialize (errorPrefix, name, symbol, currency, decimals, minterAdmin, pauser, blocklister, rescuer, owner) {
  beforeEach(async function () {
    this.anotherToken = await FiatTokenV1.new();
  });

  it('newMinterAdmin is the zero', async function () {
    await expectRevert(
      this.anotherToken.initialize(name, symbol, currency, decimals, ZERO_ADDRESS, pauser, blocklister, rescuer, owner),
      `${errorPrefix}: new minterAdmin is the zero address`,
    );
  });

  it('newPauser is the zero', async function () {
    await expectRevert(
      this.anotherToken.initialize(name, symbol, currency, decimals, minterAdmin, ZERO_ADDRESS, blocklister, rescuer, owner),
      `${errorPrefix}: new pauser is the zero address`,
    );
  });

  it('newBlocklister is the zero', async function () {
    await expectRevert(
      this.anotherToken.initialize(name, symbol, currency, decimals, minterAdmin, pauser, ZERO_ADDRESS, rescuer, owner),
      `${errorPrefix}: new blocklister is the zero address`,
    );
  });

  it('newRescuer is the zero', async function () {
    await expectRevert(
      this.anotherToken.initialize(name, symbol, currency, decimals, minterAdmin, pauser, blocklister, ZERO_ADDRESS, owner),
      `${errorPrefix}: new rescuer is the zero address`,
    );
  });

  it('newOwner is the zero', async function () {
    await expectRevert(
      this.anotherToken.initialize(name, symbol, currency, decimals, minterAdmin, pauser, blocklister, rescuer, ZERO_ADDRESS),
      `${errorPrefix}: new owner is the zero address`,
    );
  });
}

module.exports = {
  shouldBehaveLikeInitialize,
};