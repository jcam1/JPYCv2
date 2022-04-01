const { BN, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { ZERO_ADDRESS } = constants;

function shouldBehaveLikePausable (errorPrefix, pauser, owner, anotherAccount, initialSupply, initialHolder, recipient, minterAdmin) {
  describe('pause', function () {
    describe('when the requested account is pauser', function () {
      it('returns true', async function () {
        const receipt = await this.token.pause({ from: pauser });
        expectEvent(receipt, 'Pause');

        expect(await this.token.paused()).to.be.equal(true);
      });
    });

    describe('when the requested account is not pauser', function () {
      it('reverts', async function () {
        await expectRevert(this.token.pause({ from : anotherAccount }),
          `${errorPrefix}: caller is not the pauser`,
        );
      });
    });
  });

  describe('unpause', function () {
    describe('when the requested account is pauser', function () {
      it('returns false', async function () {
        const receipt = await this.token.unpause({ from: pauser });
        expectEvent(receipt, 'Unpause');
        
        expect(await this.token.paused()).to.be.equal(false);
      });
    });

    describe('when the requested account is not pauser', function () {
      it('reverts', async function () {
        await expectRevert(this.token.pause({ from : anotherAccount }),
          `${errorPrefix}: caller is not the pauser`,
        );
      });
    });
  });

  describe('updatePauser', async function() {
    describe('pauser', async function () {
      it('returns pauser', async function () {
        expect(await this.token.pauser()).to.equal(pauser);
      });
    });

    describe('when the newPauser is not the zero address', function () {
      describe('when the requested account is owner', function () {
        it('returns pauser', async function () {
          await this.token.updatePauser(anotherAccount, { from : owner });
          expect(await this.token.pauser()).to.equal(anotherAccount);
        });

        it('emits a updateBlocklister event', async function () {
          const { logs } = await this.token.updatePauser(anotherAccount, { from : owner });
          expectEvent.inLogs(logs, 'PauserChanged', {
            newAddress: anotherAccount
          });
        });
      });

      describe('when the requested account is not owner (puser)', function () {
        it('reverts', async function () {
          await expectRevert(this.token.updatePauser(anotherAccount, { from : pauser }),
            `Ownable: caller is not the owner`,
          );
        });
      });
    });

    describe('when the newBlocklister is the zero address', function () {
      it('reverts', async function () {
        await expectRevert(this.token.updatePauser(ZERO_ADDRESS, { from : owner }),
          `${errorPrefix}: new pauser is the zero address`,
        );
      });
    })
  });

  describe('pausable token', function () {
    describe('approve', function () {
      it('allows to approve when unpaused', async function () {
        await this.token.approve(recipient, initialSupply, { from: initialHolder });
    
        expect(await this.token.allowance(initialHolder, recipient)).to.be.bignumber.equal(initialSupply);
      });
    
      it('allows to transfer when paused and then unpaused', async function () {
        await this.token.pause({ from : pauser });
        await this.token.unpause({ from : pauser });
        
        await this.token.approve(recipient, initialSupply, { from: initialHolder });
        
        expect(await this.token.allowance(initialHolder, recipient)).to.be.bignumber.equal(initialSupply);
      });
    
      it('reverts when trying to transfer when paused', async function () {
        await this.token.pause({ from : pauser });
    
        await expectRevert(this.token.approve(recipient, initialSupply, { from: initialHolder }),
          `${errorPrefix}: paused`,
        );
      });
    });

    describe('transfer', function () {
      it('allows to transfer when unpaused', async function () {
        await this.token.transfer(recipient, initialSupply, { from: initialHolder });
    
        expect(await this.token.balanceOf(initialHolder)).to.be.bignumber.equal('0');
        expect(await this.token.balanceOf(recipient)).to.be.bignumber.equal(initialSupply);
      });
    
      it('allows to transfer when paused and then unpaused', async function () {
        await this.token.pause({ from : pauser });
        await this.token.unpause({ from : pauser });
    
        await this.token.transfer(recipient, initialSupply, { from: initialHolder });
    
        expect(await this.token.balanceOf(initialHolder)).to.be.bignumber.equal('0');
        expect(await this.token.balanceOf(recipient)).to.be.bignumber.equal(initialSupply);
      });
    
      it('reverts when trying to transfer when paused', async function () {
        await this.token.pause({ from : pauser });
    
        await expectRevert(this.token.transfer(recipient, initialSupply, { from: initialHolder }),
          `${errorPrefix}: paused`,
        );
      });
    });
    
    describe('transfer from', function () {
      const allowance = new BN(40);
    
      beforeEach(async function () {
        await this.token.approve(anotherAccount, allowance, { from: initialHolder });
      });
    
      it('allows to transfer from when unpaused', async function () {
        await this.token.transferFrom(initialHolder, recipient, allowance, { from: anotherAccount });
    
        expect(await this.token.balanceOf(recipient)).to.be.bignumber.equal(allowance);
        expect(await this.token.balanceOf(initialHolder)).to.be.bignumber.equal(initialSupply.sub(allowance));
      });
    
      it('allows to transfer when paused and then unpaused', async function () {
        await this.token.pause({ from : pauser });
        await this.token.unpause({ from : pauser });
    
        await this.token.transferFrom(initialHolder, recipient, allowance, { from: anotherAccount });
    
        expect(await this.token.balanceOf(recipient)).to.be.bignumber.equal(allowance);
        expect(await this.token.balanceOf(initialHolder)).to.be.bignumber.equal(initialSupply.sub(allowance));
      });
    
      it('reverts when trying to transfer from when paused', async function () {
          await this.token.pause({ from : pauser });
    
          await expectRevert(this.token.transferFrom(
            initialHolder, recipient, allowance, { from: anotherAccount }), `${errorPrefix}: paused`,
        );
      });
    });

    describe(`increaseAllowance`, function () {
      const allowance = new BN(40);
      const amount = new BN(10);
    
      beforeEach(async function () {
        await this.token.approve(anotherAccount, allowance, { from: initialHolder });
      });

      it('allows to increaseAllowance when unpaused', async function () {
        await this.token.increaseAllowance(anotherAccount, amount, { from: initialHolder });
    
        expect(await this.token.allowance(initialHolder, anotherAccount)).to.be.bignumber.equal(allowance.add(amount));
      });
      
      it('allows to increaseAllowance when blocklisted and then unblocklisted', async function () {
        await this.token.pause({ from: pauser });
        await this.token.unpause({ from: pauser });
        
        await this.token.increaseAllowance(anotherAccount, amount, { from: initialHolder });
        
        expect(await this.token.allowance(initialHolder, anotherAccount)).to.be.bignumber.equal(allowance.add(amount));
      });
    
      it('reverts when trying to increaseAllowance when paused', async function () {
        await this.token.pause({ from: pauser });

        await expectRevert(this.token.increaseAllowance(
          anotherAccount, amount, { from: initialHolder }), `${errorPrefix}: paused`,
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
        await this.token.pause({ from: pauser });
        await this.token.unpause({ from: pauser });
        
        await this.token.decreaseAllowance(anotherAccount, amount, { from: initialHolder });
        
        expect(await this.token.allowance(initialHolder, anotherAccount)).to.be.bignumber.equal(allowance.sub(amount));
      });
    
      it('reverts when trying to decreaseAllowance when spender is blocklisted', async function () {
        await this.token.pause({ from: pauser });

        await expectRevert(this.token.decreaseAllowance(
          anotherAccount, amount, { from: initialHolder }), `${errorPrefix}: paused`,
        );
      });
    });

    describe('mint', function () {
      const value = new BN(100);
      const minter = anotherAccount;
      const to = recipient;

      beforeEach(async function () {
        await this.token.configureMinter(minter, value, {from: minterAdmin});
      });

      it('allows to mint when unpaused', async function () {
        await this.token.mint(to, value, { from: minter });
    
        expect(await this.token.balanceOf(to)).to.be.bignumber.equal(value);
      });
    
      it('allows to mint when paused and then unpaused', async function () {
        await this.token.pause({ from: pauser });
        await this.token.unpause({ from: pauser });
        
        await this.token.mint(to, value, { from: minter });
        
        expect(await this.token.balanceOf(to)).to.be.bignumber.equal(value);
      });
    
      it('reverts when trying to mint when pausd', async function () {
        await this.token.pause({ from: pauser });

        await expectRevert(this.token.mint(to, value, { from: minter }),
          `${errorPrefix}: paused`,
        );
      });
    });

    describe('configureMinter', function () {
      const value = new BN(100);
      const minter = anotherAccount;

      it('allows to configureMinter when unpaused', async function () {
        expect(await this.token.isMinter(minter)).to.be.equal(false);
        expect(await this.token.minterAllowance(minter)).to.be.bignumber.equal(new BN(0));

        await this.token.configureMinter(minter, value, { from: minterAdmin });
    
        expect(await this.token.isMinter(minter)).to.be.equal(true);
        expect(await this.token.minterAllowance(minter)).to.be.bignumber.equal(value);
      });
    
      it('allows to configureMinter when paused and then unpaused', async function () {
        expect(await this.token.isMinter(minter)).to.be.equal(false);
        expect(await this.token.minterAllowance(minter)).to.be.bignumber.equal(new BN(0));

        await this.token.pause({ from: pauser });
        await this.token.unpause({ from: pauser });
        
        await this.token.configureMinter(minter, value, { from: minterAdmin });
        
        expect(await this.token.isMinter(minter)).to.be.equal(true);
        expect(await this.token.minterAllowance(minter)).to.be.bignumber.equal(value);
      });
    
      it('reverts when trying to configureMinter when pausd', async function () {
        await this.token.pause({ from: pauser });

        await expectRevert(this.token.configureMinter(minter, value, { from: minterAdmin }),
          `${errorPrefix}: paused`,
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

      it('allows to burn when unpaused', async function () {
        await this.token.burn(value, { from: minter });
    
        expect(await this.token.balanceOf(minter)).to.be.bignumber.equal(new BN(0));
      });
    
      it('allows to burn when paused and then unpaused', async function () {
        await this.token.pause({ from: pauser });
        await this.token.unpause({ from: pauser });
        
        await this.token.burn(value, { from: minter });
        
        expect(await this.token.balanceOf(minter)).to.be.bignumber.equal(new BN(0));
      });

      it('reverts when trying to burn when minter is paused', async function () {
        await this.token.pause({ from : pauser });

        await expectRevert(this.token.burn(value, { from: minter }),
          `${errorPrefix}: paused`,
        );
      });
    });
  });
}

module.exports = {
  shouldBehaveLikePausable,
};