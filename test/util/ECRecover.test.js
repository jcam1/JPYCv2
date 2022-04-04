const { BN, constants, expectEvent, expectRevert} = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { ZERO_ADDRESS, ZERO_BYTES32 } = constants;

const { ecsign, toChecksumAddress } = require('ethereumjs-util');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
const Wallet = require('ethereumjs-wallet').default;

const ECRecoverTest = artifacts.require('ECRecoverTest');

const TEST_MESSAGE = web3.utils.sha3('OpenZeppelin');

contract('ECRecoverTest', function () {
  const wallet = Wallet.generate();
  const owner = wallet.getAddressString();
  const signer = toChecksumAddress(owner);
  const digest = Buffer.from(TEST_MESSAGE.replace(/^0x/, ""), 'hex');

  beforeEach(async function () {
    this.ecRecover = await ECRecoverTest.new();
  });

  describe('recover', function () {
    const sig = ecsign(digest, wallet.getPrivateKey());

    it('recovers signer address from a valid signature', async function () {
      expect(await this.ecRecover.recover(digest, sig.v, sig.r, sig.s)).to.equal(signer);
    });


    it('reverts with ZERO_BYTES32 value signature', async function () {
      await expectRevert(
        this.ecRecover.recover(digest, 27, ZERO_BYTES32, ZERO_BYTES32),
        "ECRecover: invalid signature"
      );
    });

    it('reverts with v-2 value signature', async function () {
      await expectRevert(
        this.ecRecover.recover(digest, sig.v-2, sig.r, sig.s),
        "ECRecover: invalid signature 'v' value"
      );
    });

    it('reverts with v+2 value signature', async function () {
      await expectRevert(
        this.ecRecover.recover(digest, sig.v+2, sig.r, sig.s),
        "ECRecover: invalid signature 'v' value"
      );
    });

    it('already initialized', async function () {
      await expectRevert(
        this.ecRecover.recover(
          digest, 30, sig.r, sig.s
        ),
        "ECRecover: invalid signature 'v' value"
      )
    })

    it('reverts with high-s value signature', async function () {
      const v = 27;
      const r = "0xe742ff452d41413616a5bf43fe15dd88294e983d3d36206c2712f39083d638bd";
      const s = "0xe0a0fc89be718fbc1033e1d30d78be1c68081562ed2e97af876f286f3453231d";
      await expectRevert(
        this.ecRecover.recover(TEST_MESSAGE, v, r, s),
        'ECRecover: invalid signature \'s\' value',
      );
    });
  });
});