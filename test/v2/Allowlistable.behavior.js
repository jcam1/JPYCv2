const {
  BN,
  constants,
  expectEvent,
  expectRevert,
} = require('@openzeppelin/test-helpers')
const { expect } = require('chai')
const { ZERO_ADDRESS } = constants

function shouldBehaveLikeAllowlistable(
  errorPrefix,
  allowlister,
  allowlisted,
  unAllowlisted,
  owner,
  recipient,
  initialSupply,
  mintSupply,
  sendAmountBelow,
  sendAmountAbove,
  initialHolder,
  anotherAccount,
  minterAdmin,
  minter,
  pauser
) {
  describe('isAllowlisted', function () {
    describe('when _account is allowlisted', function () {
      it('returns true', async function () {
        expect(await this.token.isAllowlisted(allowlisted)).to.be.equal(true)
      })
    })

    describe('when _account is not allowlisted', function () {
      it('returns false', async function () {
        expect(await this.token.isAllowlisted(unAllowlisted)).to.be.equal(false)
      })
    })
  })

  describe('allowlist', function () {
    describe('when the requested account is allowlister', function () {
      describe('when allowlist allowlisted account', function () {
        it('returns true', async function () {
          await this.token.allowlist(allowlisted, { from: allowlister })
          expect(await this.token.isAllowlisted(allowlisted)).to.be.equal(true)
        })
      })

      describe('when allowlist unallowlisted account', function () {
        it('returns true', async function () {
          await this.token.allowlist(unAllowlisted, { from: allowlister })
          expect(await this.token.isAllowlisted(unAllowlisted)).to.be.equal(
            true
          )
        })
      })

      it('emits a allowlist event', async function () {
        const { logs } = await this.token.allowlist(allowlisted, {
          from: allowlister,
        })
        expectEvent.inLogs(logs, 'Allowlisted', {
          _account: allowlisted,
        })
      })
    })

    describe('when the requested account is not allowlister (owner)', function () {
      it('reverts', async function () {
        await expectRevert(
          this.token.allowlist(unAllowlisted, { from: owner }),
          `${errorPrefix}: caller is not the allowlister`
        )
      })
    })
  })

  describe('unallowlist', function () {
    describe('when the requested account is allowlister', function () {
      describe('when unallowlist allowlisted account', function () {
        it('returns false', async function () {
          await this.token.unAllowlist(allowlisted, { from: allowlister })
          expect(await this.token.isAllowlisted(allowlisted)).to.be.equal(false)
        })
      })

      describe('when unallowlist unallowlisted account', function () {
        it('returns false', async function () {
          await this.token.unAllowlist(unAllowlisted, { from: allowlister })
          expect(await this.token.isAllowlisted(unAllowlisted)).to.be.equal(
            false
          )
        })
      })

      it('emits a unAllowlist event', async function () {
        const { logs } = await this.token.unAllowlist(allowlisted, {
          from: allowlister,
        })
        expectEvent.inLogs(logs, 'UnAllowlisted', {
          _account: allowlisted,
        })
      })
    })

    describe('when the requested account is not allowlister (owner)', function () {
      it('reverts', async function () {
        await expectRevert(
          this.token.unAllowlist(allowlisted, { from: owner }),
          `${errorPrefix}: caller is not the allowlister`
        )
      })
    })
  })

  describe('updateAllowlister', async function () {
    describe('allowlister', async function () {
      it('returns allowlister', async function () {
        expect(await this.token.allowlister()).to.equal(allowlister)
      })
    })

    describe('when the newAllowlister is not the zero address', function () {
      describe('when the requested account is owner', function () {
        it('returns allowlister', async function () {
          await this.token.updateAllowlister(unAllowlisted, { from: owner })
          expect(await this.token.allowlister()).to.equal(unAllowlisted)
        })

        it('emits a updateAllowlister event', async function () {
          const { logs } = await this.token.updateAllowlister(unAllowlisted, {
            from: owner,
          })
          expectEvent.inLogs(logs, 'AllowlisterChanged', {
            newAllowlister: unAllowlisted,
          })
        })
      })

      describe('when the requested account is not owner (allowlister)', function () {
        it('reverts', async function () {
          await expectRevert(
            this.token.updateAllowlister(unAllowlisted, { from: allowlister }),
            `Ownable: caller is not the owner`
          )
        })
      })
    })

    describe('when the newAllowlister is the zero address', function () {
      it('reverts', async function () {
        await expectRevert(
          this.token.updateAllowlister(ZERO_ADDRESS, { from: owner }),
          `${errorPrefix}: new allowlister is the zero address`
        )
      })
    })
  })

  describe('allowlistable token', function () {
    describe('approve', function () {
      it('allows to approve over 100000 tokens when Allowlisted', async function () {
        await this.token.approve(unAllowlisted, sendAmountAbove, {
          from: initialHolder,
        })

        expect(
          await this.token.allowance(initialHolder, unAllowlisted)
        ).to.be.bignumber.equal(sendAmountAbove)
      })

      it('reverts when allows to approve over 100000 tokens when unAllowlisted', async function () {
        await expectRevert(
          this.token.approve(initialHolder, sendAmountAbove, {
            from: unAllowlisted,
          }),
          `${errorPrefix}: account is not allowlisted`
        )
      })

      it('allows to approve under 100000 tokens when unAllowlisted', async function () {
        await this.token.approve(initialHolder, sendAmountBelow, {
          from: unAllowlisted,
        })

        expect(
          await this.token.allowance(unAllowlisted, initialHolder)
        ).to.be.bignumber.equal(sendAmountBelow)
      })

      it('allows to approve under 100000 tokens when allowlisted and then unAllowlisted', async function () {
        await this.token.allowlist(unAllowlisted, { from: allowlister })
        await this.token.unAllowlist(unAllowlisted, { from: allowlister })
        await this.token.allowlist(initialHolder, { from: allowlister })
        await this.token.unAllowlist(initialHolder, { from: allowlister })

        await this.token.approve(unAllowlisted, sendAmountBelow, {
          from: initialHolder,
        })

        expect(
          await this.token.allowance(initialHolder, unAllowlisted)
        ).to.be.bignumber.equal(sendAmountBelow)
      })
    })
  })

  describe('transfer', function () {
    it('allows to transfer over 100000 when allowlisted', async function () {
      await this.token.allowlist(minter, { from: allowlister })
      await this.token.mint(initialHolder, mintSupply, { from: minter })
      await this.token.transfer(unAllowlisted, sendAmountAbove, {
        from: initialHolder, //owner
      })

      expect(await this.token.balanceOf(initialHolder)).to.be.bignumber.equal(
        '100'
      )
      expect(await this.token.balanceOf(unAllowlisted)).to.be.bignumber.equal(
        sendAmountAbove
      )
    })

    it('allows to transfer under 100000 tokens when allowlisted and then unAllowlisted', async function () {
      await this.token.allowlist(minter, { from: allowlister })
      await this.token.mint(initialHolder, sendAmountBelow, { from: minter })
      await this.token.allowlist(unAllowlisted, { from: allowlister })
      await this.token.unAllowlist(unAllowlisted, { from: allowlister })
      await this.token.allowlist(initialHolder, { from: allowlister })
      await this.token.unAllowlist(initialHolder, { from: allowlister })

      await this.token.transfer(unAllowlisted, sendAmountBelow, {
        from: initialHolder,
      })

      expect(await this.token.balanceOf(initialHolder)).to.be.bignumber.equal(
        '100'
      )
      expect(await this.token.balanceOf(unAllowlisted)).to.be.bignumber.equal(
        sendAmountBelow
      )
    })

    it('reverts when trying to transfer when sender is not allowlisted and the value is more than 100000', async function () {
      await this.token.unAllowlist(initialHolder, { from: allowlister })
      await expectRevert(
        this.token.transfer(allowlisted, sendAmountAbove, {
          from: initialHolder,
        }),
        `${errorPrefix}: account is not allowlisted`
      )
    })
  })

  describe('transfer from', function () {
    beforeEach(async function () {
      await this.token.approve(anotherAccount, mintSupply, {
        from: initialHolder,
      })
      await this.token.allowlist(minter, { from: allowlister })
      await this.token.mint(initialHolder, mintSupply, { from: minter })
    })

    it('allows to transferfrom over 100000 tokens when sender is Allowlisted', async function () {
      await this.token.transferFrom(
        initialHolder,
        unAllowlisted,
        sendAmountAbove,
        {
          from: anotherAccount,
        }
      )

      expect(await this.token.balanceOf(unAllowlisted)).to.be.bignumber.equal(
        sendAmountAbove
      )

      expect(await this.token.balanceOf(initialHolder)).to.be.bignumber.equal(
        new BN(100)
      )
    })

    it('allows to transferfrom under 100000 tokens when sender is not Allowlisted', async function () {
      await this.token.unAllowlist(initialHolder, { from: allowlister })
      await this.token.transferFrom(
        initialHolder,
        unAllowlisted,
        sendAmountBelow,
        {
          from: anotherAccount,
        }
      )

      expect(await this.token.balanceOf(unAllowlisted)).to.be.bignumber.equal(
        sendAmountBelow
      )

      expect(await this.token.balanceOf(initialHolder)).to.be.bignumber.equal(
        new BN('20000000000000000000100')
      )
    })

    it('allows to transferfrom under 100000 tokens when sender is allowlisted and then unAllowlisted', async function () {
      await this.token.allowlist(anotherAccount, { from: allowlister })
      await this.token.unAllowlist(anotherAccount, { from: allowlister })
      await this.token.allowlist(initialHolder, { from: allowlister })
      await this.token.unAllowlist(initialHolder, { from: allowlister })
      await this.token.allowlist(unAllowlisted, { from: allowlister })
      await this.token.unAllowlist(unAllowlisted, { from: allowlister })

      await this.token.transferFrom(
        initialHolder,
        unAllowlisted,
        sendAmountBelow,
        {
          from: anotherAccount,
        }
      )

      expect(await this.token.balanceOf(unAllowlisted)).to.be.bignumber.equal(
        sendAmountBelow
      )

      expect(await this.token.balanceOf(initialHolder)).to.be.bignumber.equal(
        new BN('20000000000000000000100')
      )
    })

    it('reverts when transferfrom over 100000 tokens when sender is not Allowlisted', async function () {
      await this.token.unAllowlist(initialHolder, { from: allowlister })
      await expectRevert(
        this.token.transferFrom(initialHolder, unAllowlisted, sendAmountAbove, {
          from: anotherAccount,
        }),
        `${errorPrefix}: account is not allowlisted`
      )
    })

    it('allows to transferfrom under 100000 tokens when sender is not Allowlisted', async function () {
      await this.token.unAllowlist(initialHolder, { from: allowlister })
      await this.token.transferFrom(
        initialHolder,
        unAllowlisted,
        sendAmountBelow,
        {
          from: anotherAccount,
        }
      )

      expect(await this.token.balanceOf(unAllowlisted)).to.be.bignumber.equal(
        sendAmountBelow
      )

      expect(await this.token.balanceOf(initialHolder)).to.be.bignumber.equal(
        new BN('20000000000000000000100')
      )
    })
  })

  describe(`increaseAllowance`, function () {
    const allowance = new BN('90000000000000000000000')
    const allowanceDiff = new BN('10000000000000000000000')
    const allowanceAbove = new BN('20000000000000000000000')

    beforeEach(async function () {
      await this.token.approve(anotherAccount, allowance, {
        from: initialHolder,
      })
    })

    it('allows to increaseAllowance under 100000 tokens when msg.sender is unAllowlisted', async function () {
      await this.token.unAllowlist(initialHolder, { from: allowlister })
      await this.token.increaseAllowance(anotherAccount, allowanceDiff, {
        from: initialHolder,
      })

      expect(
        await this.token.allowance(initialHolder, anotherAccount)
      ).to.be.bignumber.equal(allowance.add(allowanceDiff))
    })

    it('allows to increaseAllowance under 100000 tokens when msg.sender and spender is allowlisted and then unAllowlisted', async function () {
      await this.token.allowlist(anotherAccount, { from: allowlister })
      await this.token.unAllowlist(anotherAccount, { from: allowlister })
      await this.token.allowlist(initialHolder, { from: allowlister })
      await this.token.unAllowlist(initialHolder, { from: allowlister })

      await this.token.increaseAllowance(anotherAccount, allowanceDiff, {
        from: initialHolder,
      })

      expect(
        await this.token.allowance(initialHolder, anotherAccount)
      ).to.be.bignumber.equal(allowance.add(allowanceDiff))
    })

    it('reverts when trying to increaseAllowance over 100000 tokens when msg.sender is not allowlisted', async function () {
      await this.token.unAllowlist(initialHolder, { from: allowlister })
      await expectRevert(
        this.token.increaseAllowance(anotherAccount, allowanceAbove, {
          from: initialHolder,
        }),
        `${errorPrefix}: account is not allowlisted`
      )
    })
  })

  describe(`decreaseAllowance`, function () {
    const allowance = new BN('90000000000000000000000')
    const allowanceDiff = new BN('10000000000000000000000')
    const allowanceAbove = new BN('20000000000000000000000')

    beforeEach(async function () {
      await this.token.approve(anotherAccount, allowance, {
        from: initialHolder,
      })
    })

    it('allows to decreaseAllowance when unAllowlisted', async function () {
      await this.token.unAllowlist(initialHolder, { from: allowlister })
      await this.token.decreaseAllowance(anotherAccount, allowanceDiff, {
        from: initialHolder,
      })

      expect(
        await this.token.allowance(initialHolder, anotherAccount)
      ).to.be.bignumber.equal(allowance.sub(allowanceDiff))
    })

    it('allows to decreaseAllowance when allowlisted and then unAllowlisted', async function () {
      await this.token.allowlist(anotherAccount, { from: allowlister })
      await this.token.unAllowlist(anotherAccount, { from: allowlister })
      await this.token.allowlist(initialHolder, { from: allowlister })
      await this.token.unAllowlist(initialHolder, { from: allowlister })

      await this.token.decreaseAllowance(anotherAccount, allowanceDiff, {
        from: initialHolder,
      })

      expect(
        await this.token.allowance(initialHolder, anotherAccount)
      ).to.be.bignumber.equal(allowance.sub(allowanceDiff))
    })
  })

  describe('mint', function () {
    beforeEach(async function () {
      await this.token.allowlist(minter, { from: allowlister })
    })

    it('allows to mint over 100000 tokens when minter is allowlisted', async function () {
      await this.token.mint(unAllowlisted, mintSupply, { from: minter })

      expect(await this.token.balanceOf(unAllowlisted)).to.be.bignumber.equal(
        mintSupply
      )
    })

    it('allows to mint under 100000 tokens when minter is not allowlisted', async function () {
      await this.token.unAllowlist(minter, { from: allowlister })
      await this.token.mint(unAllowlisted, sendAmountBelow, { from: minter })

      expect(await this.token.balanceOf(unAllowlisted)).to.be.bignumber.equal(
        sendAmountBelow
      )
    })

    it('reverts when minter is not allowlisted and mint more than 100000 token', async function () {
      await this.token.unAllowlist(minter, { from: allowlister })

      await expectRevert(
        this.token.mint(unAllowlisted, mintSupply, { from: minter }),
        `${errorPrefix}: account is not allowlisted`
      )
    })
  })

  describe('allowlist', function () {
    it('allows to allowlist when unpaused', async function () {
      await this.token.allowlist(recipient, {
        from: allowlister,
      })
      expect(await this.token.isAllowlisted(recipient)).to.be.equal(true)
    })

    it('allows to allowlist when paused and then unpaused', async function () {
      await this.token.pause({ from: pauser })
      await this.token.unpause({ from: pauser })
  
      await this.token.allowlist(recipient, {
        from: allowlister,
      })
      expect(await this.token.isAllowlisted(recipient)).to.be.equal(true)
    })
  
    it('reverts when trying to allowlist when paused', async function () {
      await this.token.pause({ from: pauser })
  
      await expectRevert(
        this.token.allowlist(recipient, {
          from: initialHolder,
        }),
        `Pausable: paused`
      )
    })
  })
}

module.exports = {
  shouldBehaveLikeAllowlistable,
}
