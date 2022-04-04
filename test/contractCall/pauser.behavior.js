const { BN, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { ZERO_ADDRESS } = constants;

function shouldBehaveLikePauser () {
  it('puase', async function () {
    expect(await this.token.paused()).to.be.equal(false);
    await this.contract.functionCall(
        this.token.address,
        this.token.contract.methods.pause().encodeABI()
    );
    expect(await this.token.paused()).to.be.equal(true);
  });

  it('unpuase', async function () {
    expect(await this.token.paused()).to.be.equal(false);
    await this.contract.functionCall(
        this.token.address,
        this.token.contract.methods.pause().encodeABI()
    );
    expect(await this.token.paused()).to.be.equal(true);
    await this.contract.functionCall(
        this.token.address,
        this.token.contract.methods.unpause().encodeABI()
    );
    expect(await this.token.paused()).to.be.equal(false);
  });
}

module.exports = {
  shouldBehaveLikePauser,
};