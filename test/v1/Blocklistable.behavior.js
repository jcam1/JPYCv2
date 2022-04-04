const { BN, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { ZERO_ADDRESS } = constants;

function shouldBehaveLikeBlocklistable (errorPrefix, blocklister, blocklisted, unblocklisted, owner, initialSupply, initialHolder, anotherAccount, minterAdmin) {
  describe('isBlocklisted', function () {
    describe('when _account is blocklisted', function () {
      it('returns true', async function () {
        expect(await this.token.isBlocklisted(blocklisted)).to.be.equal(true);
      });
    });

    describe('when _account is not blocklisted', function () {
      it('returns false', async function () {
        expect(await this.token.isBlocklisted(unblocklisted)).to.be.equal(false);
      });
    });
  });

  describe('blocklist', function () {
    describe('when the requested account is blocklister', function () {
      describe('when blocklist blocklistd account', function () {
        it('returns true', async function () {
          await this.token.blocklist(blocklisted, { from: blocklister });
          expect(await this.token.isBlocklisted(blocklisted)).to.be.equal(true);
        });
      });
      
      describe('when blocklist unblocklistd account', function () {
        it('returns true', async function () {
          await this.token.blocklist(unblocklisted, { from: blocklister });
          expect(await this.token.isBlocklisted(unblocklisted)).to.be.equal(true);
        });
      });
  
      it('emits a blocklist event', async function () {
        const { logs } = await this.token.blocklist(blocklisted, { from: blocklister });
        expectEvent.inLogs(logs, 'Blocklisted', {
          _account: blocklisted
        });
      });
    });

    describe('when the requested account is not blocklister (owner)', function () {
      it('reverts', async function () {
        await expectRevert(this.token.blocklist(unblocklisted, { from : owner }),
          `${errorPrefix}: caller is not the blocklister`,
        );
      });
    });
  });

  describe('unblocklist', function () {
    describe('when the requested account is blocklister', function () {
      describe('when unblocklist blocklistd account', function () {
        it('returns false', async function () {
          await this.token.unBlocklist(blocklisted, { from: blocklister });
          expect(await this.token.isBlocklisted(blocklisted)).to.be.equal(false);
        });
      });

    
      describe('when unblocklist unblocklistd account', function () {
        it('returns false', async function () {
          await this.token.unBlocklist(unblocklisted, { from: blocklister });
          expect(await this.token.isBlocklisted(unblocklisted)).to.be.equal(false);
        });
      });

      it('emits a unBlocklist event', async function () {
        const { logs } = await this.token.unBlocklist(blocklisted, { from: blocklister });
        expectEvent.inLogs(logs, 'UnBlocklisted', {
          _account: blocklisted
        });
      });
    });
    
    describe('when the requested account is not blocklister (owner)', function () {
      it('reverts', async function () {
        await expectRevert(this.token.unBlocklist(blocklisted, { from : owner }),
          `${errorPrefix}: caller is not the blocklister`,
        );
      });
    });
  });

  describe('updateBlocklister', async function() {
    describe('blocklister', async function () {
      it('returns blocklister', async function () {
        expect(await this.token.blocklister()).to.equal(blocklister);
      });
    });

    describe('when the newBlocklister is not the zero address', function () {
      describe('when the requested account is owner', function () {
        it('returns blocklister', async function () {
          await this.token.updateBlocklister(unblocklisted, { from : owner });
          expect(await this.token.blocklister()).to.equal(unblocklisted);
        });

        it('emits a updateBlocklister event', async function () {
          const { logs } = await this.token.updateBlocklister(unblocklisted, { from : owner });
          expectEvent.inLogs(logs, 'BlocklisterChanged', {
            newBlocklister: unblocklisted
          });
        });
      });

      describe('when the requested account is not owner (blocklister)', function () {
        it('reverts', async function () {
          await expectRevert(this.token.updateBlocklister(unblocklisted, { from : blocklister }),
            `Ownable: caller is not the owner`,
          );
        });
      });
    });

    describe('when the newBlocklister is the zero address', function () {
      it('reverts', async function () {
        await expectRevert(this.token.updateBlocklister(ZERO_ADDRESS, { from : owner }),
          `${errorPrefix}: new blocklister is the zero address`,
        );
      });
    })
  });

  describe('blocklistable token', function () {
    describe('approve', function () {
      it('allows to approve when unblocklisted', async function () {
        await this.token.approve(unblocklisted, initialSupply, { from: initialHolder });
    
        expect(await this.token.allowance(initialHolder, unblocklisted)).to.be.bignumber.equal(initialSupply);
      });
    
      it('allows to approve when blocklisted and then unblocklisted', async function () {
        await this.token.blocklist(unblocklisted, { from: blocklister });
        await this.token.unBlocklist(unblocklisted, { from: blocklister });
        await this.token.blocklist(initialHolder, { from: blocklister });
        await this.token.unBlocklist(initialHolder, { from: blocklister });
        
        await this.token.approve(unblocklisted, initialSupply, { from: initialHolder });
        
        expect(await this.token.allowance(initialHolder, unblocklisted)).to.be.bignumber.equal(initialSupply);
      });
    
      it('reverts when trying to approve when recipient is blocklisted', async function () {
        await expectRevert(this.token.approve(blocklisted, initialSupply, { from: initialHolder }),
          `${errorPrefix}: account is blocklisted`,
        );
      });

      it('reverts when trying to approve when sender is blocklisted', async function () {
        await this.token.blocklist(initialHolder, { from : blocklister });
        await expectRevert(this.token.approve(unblocklisted, initialSupply, { from: initialHolder }),
          `${errorPrefix}: account is blocklisted`,
        );
      });
    });

    describe('transfer', function () {
      it('allows to transfer when unblocklisted', async function () {
        await this.token.transfer(unblocklisted, initialSupply, { from: initialHolder });
    
        expect(await this.token.balanceOf(initialHolder)).to.be.bignumber.equal('0');
        expect(await this.token.balanceOf(unblocklisted)).to.be.bignumber.equal(initialSupply);
      });
    
      it('allows to transfer when blocklisted and then unblocklisted', async function () {
        await this.token.blocklist(unblocklisted, { from: blocklister });
        await this.token.unBlocklist(unblocklisted, { from: blocklister });
        await this.token.blocklist(initialHolder, { from: blocklister });
        await this.token.unBlocklist(initialHolder, { from: blocklister });
    
        await this.token.transfer(unblocklisted, initialSupply, { from: initialHolder });
    
        expect(await this.token.balanceOf(initialHolder)).to.be.bignumber.equal('0');
        expect(await this.token.balanceOf(unblocklisted)).to.be.bignumber.equal(initialSupply);
      });
    
      it('reverts when trying to transfer when recipent is blocklisted', async function () {
        await expectRevert(this.token.transfer(
          blocklisted, initialSupply, { from: initialHolder }), `${errorPrefix}: account is blocklisted`,
        );
      });

      it('reverts when trying to transfer when sender is blocklisted', async function () {
        await this.token.blocklist(initialHolder, { from: blocklister });
    
        await expectRevert(this.token.transfer(
          unblocklisted, initialSupply, { from: initialHolder }), `${errorPrefix}: account is blocklisted`,
        );
      });
    });
    
    describe('transfer from', function () {
      const allowance = new BN(40);
    
      beforeEach(async function () {
        await this.token.approve(anotherAccount, allowance, { from: initialHolder });
      });
    
      it('allows to transfer from when unblocklisted', async function () {
        await this.token.transferFrom(initialHolder, unblocklisted, allowance, { from: anotherAccount });
    
        expect(await this.token.balanceOf(unblocklisted)).to.be.bignumber.equal(allowance);
        expect(await this.token.balanceOf(initialHolder)).to.be.bignumber.equal(initialSupply.sub(allowance));
      });
    
      it('allows to transfer when blocklisted and then unblocklisted', async function () {
        await this.token.blocklist(anotherAccount, { from : blocklister });
        await this.token.unBlocklist(anotherAccount, { from : blocklister });
        await this.token.blocklist(initialHolder, { from : blocklister });
        await this.token.unBlocklist(initialHolder, { from : blocklister });
        await this.token.blocklist(unblocklisted, { from : blocklister });
        await this.token.unBlocklist(unblocklisted, { from : blocklister });
    
        await this.token.transferFrom(initialHolder, unblocklisted, allowance, { from: anotherAccount });
    
        expect(await this.token.balanceOf(unblocklisted)).to.be.bignumber.equal(allowance);
        expect(await this.token.balanceOf(initialHolder)).to.be.bignumber.equal(initialSupply.sub(allowance));
      });
    
      it('reverts when trying to transfer from when msg.sender is blocklisted', async function () {
        await this.token.blocklist(anotherAccount, { from : blocklister });
    
        await expectRevert(this.token.transferFrom(
            initialHolder, unblocklisted, allowance, { from: anotherAccount }), `${errorPrefix}: account is blocklisted`,
        );
      });

      it('reverts when trying to transfer from when from account is blocklisted', async function () {
        await expectRevert(this.token.transferFrom(
            initialHolder, blocklisted, allowance, { from: anotherAccount }), `${errorPrefix}: account is blocklisted`,
        );
      });

      it('reverts when trying to transfer from when to account is blocklisted', async function () {
        await this.token.blocklist(initialHolder, { from: blocklister });
    
        await expectRevert(this.token.transferFrom(
            initialHolder, unblocklisted, allowance, { from: anotherAccount }), `${errorPrefix}: account is blocklisted`,
        );
      });
    });

    describe(`increaseAllowance`, function () {
      const allowance = new BN(40);
      const amount = new BN(10);
    
      beforeEach(async function () {
        await this.token.approve(anotherAccount, allowance, { from: initialHolder });
      });

      it('allows to increaseAllowance when unblocklisted', async function () {
        await this.token.increaseAllowance(anotherAccount, amount, { from: initialHolder });
    
        expect(await this.token.allowance(initialHolder, anotherAccount)).to.be.bignumber.equal(allowance.add(amount));
      });
      
      it('allows to increaseAllowance when blocklisted and then unblocklisted', async function () {
        await this.token.blocklist(anotherAccount, { from: blocklister });
        await this.token.unBlocklist(anotherAccount, { from: blocklister });
        await this.token.blocklist(initialHolder, { from: blocklister });
        await this.token.unBlocklist(initialHolder, { from: blocklister });
        
        await this.token.increaseAllowance(anotherAccount, amount, { from: initialHolder });
        
        expect(await this.token.allowance(initialHolder, anotherAccount)).to.be.bignumber.equal(allowance.add(amount));
      });
    
      it('reverts when trying to increaseAllowance when spender is blocklisted', async function () {
        await this.token.blocklist(anotherAccount, { from: blocklister });

        await expectRevert(this.token.increaseAllowance(
          anotherAccount, amount, { from: initialHolder }), `${errorPrefix}: account is blocklisted`,
        );
      });

      it('reverts when trying to increaseAllowance when msg.sender is blocklisted', async function () {
        await this.token.blocklist(initialHolder, { from: blocklister });
    
        await expectRevert(this.token.increaseAllowance(
          anotherAccount, amount, { from: initialHolder }), `${errorPrefix}: account is blocklisted`,
        );
      });
    });

    describe(`decreaseAllowance`, function () {
      const allowance = new BN(40);
      const amount = new BN(10);
    
      beforeEach(async function () {
        await this.token.approve(anotherAccount, allowance, { from: initialHolder });
      });

      it('allows to decreaseAllowance when unblocklisted', async function () {
        await this.token.decreaseAllowance(anotherAccount, amount, { from: initialHolder });
    
        expect(await this.token.allowance(initialHolder, anotherAccount)).to.be.bignumber.equal(allowance.sub(amount));
      });
      
      it('allows to decreaseAllowance when blocklisted and then unblocklisted', async function () {
        await this.token.blocklist(anotherAccount, { from: blocklister });
        await this.token.unBlocklist(anotherAccount, { from: blocklister });
        await this.token.blocklist(initialHolder, { from: blocklister });
        await this.token.unBlocklist(initialHolder, { from: blocklister });
        
        await this.token.decreaseAllowance(anotherAccount, amount, { from: initialHolder });
        
        expect(await this.token.allowance(initialHolder, anotherAccount)).to.be.bignumber.equal(allowance.sub(amount));
      });
    
      it('reverts when trying to decreaseAllowance when spender is blocklisted', async function () {
        await this.token.blocklist(anotherAccount, { from: blocklister });
        
        await expectRevert(this.token.decreaseAllowance(
          anotherAccount, amount, { from: initialHolder }), `${errorPrefix}: account is blocklisted`,
          );
        });
        
      it('reverts when trying to decreaseAllowance when msg.sender is blocklisted', async function () {
        await this.token.unBlocklist(anotherAccount, { from: blocklister });
        await this.token.blocklist(initialHolder, { from: blocklister });
    
        await expectRevert(this.token.decreaseAllowance(
          anotherAccount, amount, { from: initialHolder }), `${errorPrefix}: account is blocklisted`,
        );
      });
    });

    describe('mint', function () {
      const value = new BN(100);
      const minter = anotherAccount;

      beforeEach(async function () {
        await this.token.configureMinter(minter, value, {from: minterAdmin});
      });

      it('allows to mint when unblocklisted', async function () {
        await this.token.mint(unblocklisted, value, { from: minter });
    
        expect(await this.token.balanceOf(unblocklisted)).to.be.bignumber.equal(value);
      });
    
      it('allows to mint when blocklisted and then unblocklisted', async function () {
        await this.token.blocklist(unblocklisted, { from: blocklister });
        await this.token.unBlocklist(unblocklisted, { from: blocklister });
        await this.token.blocklist(minter, { from: blocklister });
        await this.token.unBlocklist(minter, { from: blocklister });
        
        await this.token.mint(unblocklisted, value, { from: minter });
        
        expect(await this.token.balanceOf(unblocklisted)).to.be.bignumber.equal(value);
      });
    
      it('reverts when trying to mint when to is blocklisted', async function () {
        await expectRevert(this.token.mint(blocklisted, value, { from: minter }),
          `${errorPrefix}: account is blocklisted`,
        );
      });

      it('reverts when trying to mint when minter is blocklisted', async function () {
        await this.token.blocklist(minter, { from : blocklister });
        await expectRevert(this.token.mint(unblocklisted, value, { from: minter }),
          `${errorPrefix}: account is blocklisted`,
        );
      });
    });

    describe('burn', function () {
      const value = new BN(100);
      const minter = anotherAccount;

      beforeEach(async function () {
        await this.token.configureMinter(minter, value, {from: minterAdmin});
        await this.token.mint(minter, value, {from: minter});
      });

      it('allows to burn when unblocklisted', async function () {
        await this.token.burn(value, { from: minter });
    
        expect(await this.token.balanceOf(minter)).to.be.bignumber.equal(new BN(0));
      });
    
      it('allows to burn when blocklisted and then unblocklisted', async function () {
        await this.token.blocklist(minter, { from: blocklister });
        await this.token.unBlocklist(minter, { from: blocklister });
        
        await this.token.burn(value, { from: minter });
        
        expect(await this.token.balanceOf(minter)).to.be.bignumber.equal(new BN(0));
      });

      it('reverts when trying to burn when minter is blocklisted', async function () {
        await this.token.blocklist(minter, { from : blocklister });

        await expectRevert(this.token.burn(value, { from: minter }),
          `${errorPrefix}: account is blocklisted`,
        );
      });
    });
  });
}

module.exports = {
  shouldBehaveLikeBlocklistable,
};