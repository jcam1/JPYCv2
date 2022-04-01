const { BN, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { ZERO_ADDRESS } = constants;

const DummyERC20 = artifacts.require("DummyERC20");

function shouldBehaveLikeRescuable (errorPrefix, rescuer, owner, anotherAccount) {
  describe(`rescueERC20`, async function () {
    beforeEach(async function () {
      tokenOwner = anotherAccount;
      this.dummyToken = await DummyERC20.new("Dummy", "DUM", 1000, { from: tokenOwner });

      await this.dummyToken.transfer(this.token.address, 100, { from : tokenOwner });
      expect((await this.dummyToken.balanceOf(tokenOwner)).toNumber()).to.equal(900);
      expect((await this.dummyToken.balanceOf(this.token.address)).toNumber()).to.equal(100);
    });

    it(`arrows rescuer to rescue ERC20 (full amount)`, async function () {
      await this.token.rescueERC20(this.dummyToken.address, tokenOwner, 100, { from : rescuer });
      expect((await this.dummyToken.balanceOf(this.token.address)).toNumber()).to.equal(0);
      expect((await this.dummyToken.balanceOf(tokenOwner)).toNumber()).to.equal(1000);
    });

    it(`arrows rescuer to rescue ERC20 (partical amount)`, async function () {
      await this.token.rescueERC20(this.dummyToken.address, tokenOwner, 50, { from : rescuer });
      expect((await this.dummyToken.balanceOf(this.token.address)).toNumber()).to.equal(50);
      expect((await this.dummyToken.balanceOf(this.dummyToken.address)).toNumber()).to.lessThanOrEqual(950);
    });

    it('reverts when tha requested amount is greater than balance', async function () {
      await expectRevert(
        this.token.rescueERC20(this.dummyToken.address, tokenOwner, 101, { from : rescuer }),
        `ERC20: transfer amount exceeds balance`,
      );
    });

    it('reverts when the given contract address is not ERC20', async function () {
      await expectRevert(
        this.token.rescueERC20(anotherAccount, tokenOwner, 1, { from : rescuer }),
        `Transaction reverted: function returned an unexpected amount of data`,
      );
    });

    it('reverts when the requested account is not rescuer (tokenOwner)', async function () {
      await expectRevert(
        this.token.rescueERC20(this.dummyToken.address, tokenOwner, 101, { from : tokenOwner }),
        `caller is not the rescuer`,
      );
      expect((await this.dummyToken.balanceOf(tokenOwner)).toNumber()).to.equal(900);
      expect((await this.dummyToken.balanceOf(this.token.address)).toNumber()).to.equal(100);
    });
  });
  
  describe('updateRescuer', async function() {
    describe('rescuer', async function () {
      it('returns rescuer', async function () {
        expect(await this.token.rescuer()).to.equal(rescuer);
      });
    });

    describe('when the newRescuer is not the zero address', function () {
      describe('when the requested account is owner', function () {
        it('returns resuser', async function () {
          await this.token.updateRescuer(anotherAccount, { from : owner });
          expect(await this.token.rescuer()).to.equal(anotherAccount);
        });

        it('emits a updateBlocklister event', async function () {
          const { logs } = await this.token.updateRescuer(anotherAccount, { from : owner });
          expectEvent.inLogs(logs, 'RescuerChanged', {
            newRescuer: anotherAccount
          });
        });
      });

      describe('when the requested account is not owner (anotherAccount)', function () {
        it('reverts', async function () {
          await expectRevert(this.token.updateRescuer(anotherAccount, { from : anotherAccount }),
            `Ownable: caller is not the owner`,
          );
        });
      });
    });

    describe('when the newRescuer is the zero address', function () {
      it('reverts', async function () {
        await expectRevert(this.token.updateRescuer(ZERO_ADDRESS, { from : owner }),
          `${errorPrefix}: new rescuer is the zero address`,
        );
      });
    })
  });
}

module.exports = {
  shouldBehaveLikeRescuable,
};