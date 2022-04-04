const { BN, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { ZERO_ADDRESS } = constants;

function shouldBehaveLikeBlocklister (alice) {
  it('blocklist', async function () {
  expect(await this.token.isBlocklisted(alice)).to.be.equal(false);
  await this.contract.functionCall(
    this.token.address,
    this.token.contract.methods.blocklist(alice).encodeABI()
  )
  expect(await this.token.isBlocklisted(alice)).to.be.equal(true);
  });

  it('unBlocklist', async function () {
  expect(await this.token.isBlocklisted(alice)).to.be.equal(false);
  await this.contract.functionCall(
    this.token.address,
    this.token.contract.methods.blocklist(alice).encodeABI()
  )
  expect(await this.token.isBlocklisted(alice)).to.be.equal(true);
  await this.contract.functionCall(
    this.token.address,
    this.token.contract.methods.unBlocklist(alice).encodeABI()
  )
  expect(await this.token.isBlocklisted(alice)).to.be.equal(false);
  });
}

module.exports = {
  shouldBehaveLikeBlocklister,
};