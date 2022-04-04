const { BN, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { ZERO_ADDRESS } = constants;

function shouldBehaveLikeOwnable (errorPrefix, owner, anotherAccount) {
  it('has an owner', async function () {
    expect(await this.token.owner()).to.equal(owner);
  });

  describe('transfer ownership', function () {
    it('changes owner after transfer', async function () {
      const { logs } = await this.token.transferOwnership(anotherAccount, { from: owner });
      expectEvent.inLogs(logs, 'OwnershipTransferred', {
        previousOwner: owner,
        newOwner: anotherAccount
      });

      expect(await this.token.owner()).to.equal(anotherAccount);
    });

    it('prevents non-owners from transferring', async function () {
      await expectRevert(
        this.token.transferOwnership(anotherAccount, { from: anotherAccount }),
        'Ownable: caller is not the owner',
      );
    });

    it('guards ownership against stuck state', async function () {
      await expectRevert(
        this.token.transferOwnership(ZERO_ADDRESS, { from: owner }),
        'Ownable: new owner is the zero address',
      );
    });
  });
}

module.exports = {
  shouldBehaveLikeOwnable,
};