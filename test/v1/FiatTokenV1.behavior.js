const {
  BN,
  constants,
  expectEvent,
  expectRevert,
} = require('@openzeppelin/test-helpers')
const { MAX_UINT256 } = require('@openzeppelin/test-helpers/src/constants')
const { inTransaction } = require('@openzeppelin/test-helpers/src/expectEvent')
const { expect } = require('chai')
const { bnToHex } = require('ethereumjs-util')
const { ZERO_ADDRESS } = constants

function shouldBehaveLikeFiatTokenV1(
  errorPrefix,
  minterAdmin,
  anotherAccount,
  recipient,
  initialSupply,
  owner
) {
  it('has a minterAdmin', async function () {
    expect(await this.token.minterAdmin()).to.equal(minterAdmin)
  })

  describe('mint', function () {
    const value = new BN(100)
    const minter = anotherAccount

    beforeEach(async function () {
      await this.token.configureMinter(minter, value, { from: minterAdmin })
    })

    describe('when the requested account is minter', function () {
      it('mint (full amount)', async function () {
        await this.token.mint(recipient, value, { from: minter })

        expect(await this.token.totalSupply()).to.be.bignumber.equal(
          initialSupply.add(value)
        )
        expect(await this.token.balanceOf(recipient)).to.be.bignumber.equal(
          value
        )
        expect(await this.token.minterAllowance(minter)).to.be.bignumber.equal(
          new BN(0)
        )
      })

      it('mint (partical amount)', async function () {
        const amount = value.subn(1)
        await this.token.mint(recipient, amount, { from: minter })

        expect(await this.token.totalSupply()).to.be.bignumber.equal(
          initialSupply.add(amount)
        )
        expect(await this.token.balanceOf(recipient)).to.be.bignumber.equal(
          amount
        )
        expect(await this.token.minterAllowance(minter)).to.be.bignumber.equal(
          value.sub(amount)
        )
      })

      it('emits a Mint event', async function () {
        const result = await this.token.mint(recipient, value, { from: minter })

        expectEvent(result, 'Mint', {
          minter: minter,
          to: recipient,
          amount: value,
        })
      })

      it('emits a Transfer event', async function () {
        const result = await this.token.mint(recipient, value, { from: minter })

        expectEvent(result, 'Transfer', {
          from: ZERO_ADDRESS,
          to: recipient,
          value: value,
        })
      })

      it('when to is the zero', async function () {
        await expectRevert(
          this.token.mint(ZERO_ADDRESS, value, { from: minter }),
          'FiatToken: mint to the zero address'
        )
      })

      it('when amount is not greater than 0', async function () {
        const amount = new BN(0)
        await expectRevert(
          this.token.mint(recipient, amount, { from: minter }),
          'FiatToken: mint amount not greater than 0'
        )
      })

      it('when amount exceeds minterAllowance', async function () {
        const amount = value.addn(1)
        await expectRevert(
          this.token.mint(recipient, amount, { from: minter }),
          'FiatToken: mint amount exceeds minterAllowance'
        )
      })
    })

    describe('when the requested account is not minter', function () {
      it('reverts', async function () {
        await expectRevert(
          this.token.mint(recipient, value, { from: owner }),
          'FiatToken: caller is not a minter'
        )
      })
    })
  })

  describe('minterAllowance', function () {
    const value = new BN(100)

    it('return minterAllowed', async function () {
      await this.token.configureMinter(anotherAccount, value, {
        from: minterAdmin,
      })

      expect(
        await this.token.minterAllowance(anotherAccount)
      ).to.be.bignumber.equal(value)
    })
  })

  describe('isMinter', function () {
    const value = new BN(100)

    it('return true', async function () {
      await this.token.configureMinter(anotherAccount, value, {
        from: minterAdmin,
      })

      expect(await this.token.isMinter(anotherAccount)).to.be.equal(true)
    })
    it('return false', async function () {
      expect(await this.token.isMinter(anotherAccount)).to.be.equal(false)
    })
  })

  describe('configureMinter', function () {
    const value = new BN(100)

    it('when the requested account is minterAdmin', async function () {
      await this.token.configureMinter(anotherAccount, value, {
        from: minterAdmin,
      })

      expect(await this.token.isMinter(anotherAccount)).to.be.equal(true)
      expect(
        await this.token.minterAllowance(anotherAccount)
      ).to.be.bignumber.equal(value)
    })

    it('emits a MinterConfigured event', async function () {
      const result = await this.token.configureMinter(anotherAccount, value, {
        from: minterAdmin,
      })

      expectEvent(result, 'MinterConfigured', {
        minter: anotherAccount,
        minterAllowedAmount: value,
      })
    })

    it('when the requested account is not minterAdmin', async function () {
      await expectRevert(
        this.token.configureMinter(anotherAccount, value, { from: owner }),
        'FiatToken: caller is not the minterAdmin'
      )
    })
  })

  describe('removeMinter', function () {
    const value = new BN(100)
    const minter = anotherAccount

    beforeEach(async function () {
      await this.token.configureMinter(minter, value, { from: minterAdmin })
    })

    describe('when the requested account is minterAdmin', function () {
      it('remove minter', async function () {
        expect(await this.token.isMinter(minter)).to.equal(true)
        expect(await this.token.minterAllowance(minter)).to.be.bignumber.equal(
          value
        )

        await this.token.removeMinter(minter, { from: minterAdmin })
        expect(await this.token.isMinter(minter)).to.equal(false)
        expect(await this.token.minterAllowance(minter)).to.be.bignumber.equal(
          new BN(0)
        )
      })

      it('emits a MinterRemoved event', async function () {
        const result = await this.token.removeMinter(minter, {
          from: minterAdmin,
        })
        expectEvent(result, 'MinterRemoved', {
          oldMinter: minter,
        })
      })

      it('removed and then configured', async function () {
        await this.token.removeMinter(minter, { from: minterAdmin })

        await this.token.configureMinter(minter, value, { from: minterAdmin })
        expect(await this.token.isMinter(minter)).to.equal(true)
        expect(await this.token.minterAllowance(minter)).to.be.bignumber.equal(
          value
        )
      })
    })

    describe('when the requested account is not minterAdmin', function () {
      it('reverts', async function () {
        await expectRevert(
          this.token.removeMinter(minter, {from: owner}),
          'FiatToken: caller is not the minterAdmin',
        );
      });
    });
  });

  describe('burn', function () {
    const value = new BN(100)
    const minter = anotherAccount

    beforeEach(async function () {
      await this.token.configureMinter(minter, value, { from: minterAdmin })
      await this.token.mint(minter, value, { from: minter })
    })

    describe('when the requested account is minter', function () {
      it('burn (full amount)', async function () {
        expect(await this.token.totalSupply()).to.be.bignumber.equal(
          initialSupply.add(value)
        )
        expect(await this.token.balanceOf(minter)).to.be.bignumber.equal(value)

        await this.token.burn(value, { from: minter })

        expect(await this.token.totalSupply()).to.be.bignumber.equal(
          initialSupply
        )
        expect(await this.token.balanceOf(minter)).to.be.bignumber.equal(
          new BN(0)
        )
      })

      it('burn (partical amount)', async function () {
        expect(await this.token.totalSupply()).to.be.bignumber.equal(
          initialSupply.add(value)
        )
        expect(await this.token.balanceOf(minter)).to.be.bignumber.equal(value)

        const amount = value.subn(1)
        await this.token.burn(amount, { from: minter })

        expect(await this.token.totalSupply()).to.be.bignumber.equal(
          initialSupply.addn(1)
        )
        expect(await this.token.balanceOf(minter)).to.be.bignumber.equal(
          value.sub(amount)
        )
      })

      it('emits a Burn event', async function () {
        const result = await this.token.burn(value, { from: minter })

        expectEvent(result, 'Burn', {
          burner: minter,
          amount: value,
        })
      })

      it('emits a Transfer event', async function () {
        const result = await this.token.burn(value, { from: minter })

        expectEvent(result, 'Transfer', {
          from: minter,
          to: ZERO_ADDRESS,
          value: value,
        })
      })

      it('when amount is not greater than 0', async function () {
        const amount = new BN(0)
        await expectRevert(
          this.token.burn(amount, { from: minter }),
          'FiatToken: burn amount not greater than 0'
        )
      })

      it('when amount exceeds balance', async function () {
        const amount = value.addn(1)
        await expectRevert(
          this.token.burn(amount, { from: minter }),
          'FiatToken: burn amount exceeds balance'
        )
      })
    })

    describe('when the requested account is not minter', function () {
      it('reverts', async function () {
        await expectRevert(
          this.token.burn(value, {from: owner}),
          'FiatToken: caller is not a minter',
        );
      });
    });
  });

  describe('updateMinterAdmin', async function() {
    describe('minterAdmin', async function () {
      it('returns minterAdmin', async function () {
        expect(await this.token.minterAdmin()).to.equal(minterAdmin)
      })
    })

    describe('when the newMinterAdmin is not the zero address', function () {
      describe('when the requested account is owner', function () {
        it('returns minterAdmin', async function () {
          await this.token.updateMinterAdmin(anotherAccount, { from: owner })
          expect(await this.token.minterAdmin()).to.equal(anotherAccount)
        })

        it('emits a updateMinterAdminevent', async function () {
          const { logs } = await this.token.updateMinterAdmin(anotherAccount, {
            from: owner,
          })
          expectEvent.inLogs(logs, 'MinterAdminChanged', {
            newMinterAdmin: anotherAccount,
          })
        })
      })

      describe('when the requested account is not owner (minterAdmin)', function () {
        it('reverts', async function () {
          await expectRevert(
            this.token.updateMinterAdmin(anotherAccount, {
              from: minterAdmin,
            }),
            `Ownable: caller is not the owner`
          )
        })
      })
    })

    describe('when the newMinterAdmin is the zero address', function () {
      it('reverts', async function () {
        await expectRevert(
          this.token.updateMinterAdmin(ZERO_ADDRESS, { from: owner }),
          `${errorPrefix}: new minterAdmin is the zero address`
        )
      })
    })
  })

  describe('transferFrom', function () {
    const value = new BN(100)

    it('when maximum approve', async function () {
      await this.token.approve(recipient, MAX_UINT256, { from: owner })
      await this.token.transferFrom(owner, recipient, value, { from: recipient })
      expect(await this.token.allowance(owner, recipient)).to.be.bignumber.equal(
        MAX_UINT256
      )
    })
  })
}

module.exports = {
  shouldBehaveLikeFiatTokenV1,
}
