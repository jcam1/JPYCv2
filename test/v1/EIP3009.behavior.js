const crypto = require("crypto");
const { BN, constants, expectEvent, expectRevert, time} = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { MAX_UINT256, ZERO_ADDRESS, ZERO_BYTES32 } = constants;

const { fromRpcSig, toChecksumAddress } = require('ethereumjs-util');
const ethSigUtil = require('eth-sig-util');
const Wallet = require('ethereumjs-wallet').default;

const { EIP712Domain, domainSeparator } = require('../helpers/eip712');
const { web3 } = require("@openzeppelin/test-helpers/src/setup");

const transferWithAuthorizationTypeHash = web3.utils.keccak256(
    "TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)"
);

const receiveWithAuthorizationTypeHash = web3.utils.keccak256(
  "ReceiveWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)"
);

const cancelAuthorizationTypeHash = web3.utils.keccak256(
  "CancelAuthorization(address authorizer,bytes32 nonce)"
);

const TransferWithAuthorization = [
  { name: 'from', type: 'address' },
  { name: 'to', type: 'address' },
  { name: 'value', type: 'uint256' },
  { name: 'validAfter', type: 'uint256' },
  { name: 'validBefore', type: 'uint256' },
  { name: 'nonce', type: 'bytes32' },
];

const ReceiveWithAuthorization = [
  { name: 'from', type: 'address' },
  { name: 'to', type: 'address' },
  { name: 'value', type: 'uint256' },
  { name: 'validAfter', type: 'uint256' },
  { name: 'validBefore', type: 'uint256' },
  { name: 'nonce', type: 'bytes32' },
];

const CancelAuthorization = [
  { name: 'authorizer', type: 'address' },
  { name: 'nonce', type: 'bytes32' },
];

function shouldBehaveLikeEIP3009(errorPrefix, name, initialSupply, initialHolder, recipient, pauser, blocklister, version="1") {
  const to = recipient;

  beforeEach(async function () {

    // We get the chain id from the contract because Ganache (used for coverage) does not return the same chain id
    // from within the EVM as from the JSON RPC interface.
    // See https://github.com/trufflesuite/ganache-core/issues/515
    this.chainId = 1337; // hardhat.confing.js
  });

  it('domain separator', async function () {
    expect(
      await this.token._domainSeparatorV4(),
    ).to.equal(
      await domainSeparator(name, version, this.chainId, this.token.address),
    );
  });

  it('expected transfer type hash', async function () {
    expect(await this.token.TRANSFER_WITH_AUTHORIZATION_TYPEHASH()).to.equal(transferWithAuthorizationTypeHash);
  });

  it('expected receive type hash', async function () {
    expect(await this.token.RECEIVE_WITH_AUTHORIZATION_TYPEHASH()).to.equal(receiveWithAuthorizationTypeHash);
  });

  it('expected cancel type hash', async function () {
    expect(await this.token.CANCEL_AUTHORIZATION_TYPEHASH()).to.equal(cancelAuthorizationTypeHash);
  });

  describe('TransferWithAuthorization', async function () {
    const wallet = Wallet.generate();
    let owner = wallet.getAddressString();
    const from = toChecksumAddress(owner);

    beforeEach(async function () {
        await this.token.transfer(from, initialSupply, {from: initialHolder});
    })

    const value = new BN(42);
    const minValidAfter = new BN(0);
    const maxValidBefore = MAX_UINT256;
    const nonce = "0x" + crypto.randomBytes(32).toString('hex');

    const buildData = (chainId, verifyingContract, validAfter = minValidAfter, validBefore = maxValidBefore) => ({
      primaryType: 'TransferWithAuthorization',
      types: { EIP712Domain, TransferWithAuthorization },
      domain: { name, version, chainId, verifyingContract },
      message: { from, to, value, validAfter, validBefore, nonce },
    });

    it('accepts owner signature', async function () {
      expect(await this.token.balanceOf(from)).to.be.bignumber.equal(initialSupply);
      expect(await this.token.balanceOf(to)).to.be.bignumber.equal(new BN(0));
      
      expect(await this.token.authorizationState(from, nonce)).to.equal(false);

      const data = buildData(this.chainId, this.token.address);
      const signature = ethSigUtil.signTypedMessage(wallet.getPrivateKey(), { data });
      const { v, r, s } = fromRpcSig(signature);
      
      await this.token.transferWithAuthorization(from, to, value, minValidAfter, maxValidBefore, nonce, v, r, s);
      
      expect(await this.token.balanceOf(from)).to.be.bignumber.equal(initialSupply.sub(value));
      expect(await this.token.balanceOf(to)).to.be.bignumber.equal(value);

      expect(await this.token.authorizationState(from, nonce)).to.equal(true);
    });

    it('emits a AuthorizationUsed event', async function () {
      const data = buildData(this.chainId, this.token.address);
      const signature = ethSigUtil.signTypedMessage(wallet.getPrivateKey(), { data });
      const { v, r, s } = fromRpcSig(signature);

      const result = await this.token.transferWithAuthorization(from, to, value, minValidAfter, maxValidBefore, nonce, v, r, s);

      expectEvent(result, 'AuthorizationUsed', {
        authorizer: from,
        nonce: nonce
      });
    });

    it('revert not match given parameters', async function () {
      const data = buildData(this.chainId, this.token.address);
      const signature = ethSigUtil.signTypedMessage(wallet.getPrivateKey(), { data });
      const { v, r, s } = fromRpcSig(signature);

      await expectRevert(
        this.token.transferWithAuthorization(from, to, value*2, minValidAfter, maxValidBefore, nonce, v, r, s),
        'EIP3009: invalid signature',
      );
    });

    it('revert reused signature', async function () {
      const data = buildData(this.chainId, this.token.address);
      const signature = ethSigUtil.signTypedMessage(wallet.getPrivateKey(), { data });
      const { v, r, s } = fromRpcSig(signature);

      await this.token.transferWithAuthorization(from, to, value, minValidAfter, maxValidBefore, nonce, v, r, s);

      await expectRevert(
        this.token.transferWithAuthorization(from, to, value, minValidAfter, maxValidBefore, nonce, v, r, s),
        'EIP3009: authorization is used or canceled',
      );
    });

    it('revert reused nonce', async function () {
      let data = buildData(this.chainId, this.token.address);
      let signature = ethSigUtil.signTypedMessage(wallet.getPrivateKey(), { data });
      var { v, r, s } = fromRpcSig(signature);

      await this.token.transferWithAuthorization(from, to, value, minValidAfter, maxValidBefore, nonce, v, r, s);

      const validAfter = await time.latest();
      data = buildData(this.chainId, this.token.address, validAfter);
      signature = ethSigUtil.signTypedMessage(wallet.getPrivateKey(), { data });
      var { v, r, s } = fromRpcSig(signature);

      await expectRevert(
        this.token.transferWithAuthorization(from, to, value, minValidAfter, maxValidBefore, nonce, v, r, s),
        'EIP3009: authorization is used or canceled',
      );
    });

    it('revert other signature', async function () {
      const otherWallet = Wallet.generate();
      const data = buildData(this.chainId, this.token.address);
      const signature = ethSigUtil.signTypedMessage(otherWallet.getPrivateKey(), { data });
      const { v, r, s } = fromRpcSig(signature);

      await expectRevert(
        this.token.transferWithAuthorization(from, to, value, minValidAfter, maxValidBefore, nonce, v, r, s),
        'EIP3009: invalid signature',
      );
    });

    it('revert not yet valid', async function () {
      const validAfter = (await time.latest()) + time.duration.weeks(1);
  
      const data = buildData(this.chainId, this.token.address, validAfter);
      const signature = ethSigUtil.signTypedMessage(wallet.getPrivateKey(), { data });
      const { v, r, s } = fromRpcSig(signature);
  
      await expectRevert(
        this.token.transferWithAuthorization(from, to, value, validAfter, maxValidBefore, nonce, v, r, s),
        'EIP3009: authorization is not yet valid',
      );
    });

    it('revert aurhorization is expired', async function () {
      const validBefore = (await time.latest()) - time.duration.weeks(1);

      const data = buildData(this.chainId, this.token.address, validBefore);
      const signature = ethSigUtil.signTypedMessage(wallet.getPrivateKey(), { data });
      const { v, r, s } = fromRpcSig(signature);

      await expectRevert(
        this.token.transferWithAuthorization(from, to, value, minValidAfter, validBefore, nonce, v, r, s),
        'EIP3009: authorization is expired',
      );
    });

    it('revert when paused', async function () {
      const data = buildData(this.chainId, this.token.address);
      const signature = ethSigUtil.signTypedMessage(wallet.getPrivateKey(), { data });
      const { v, r, s } = fromRpcSig(signature);
      
      await this.token.pause({from: pauser});

      await expectRevert(
        this.token.transferWithAuthorization(from, to, value, minValidAfter, maxValidBefore, nonce, v, r, s),
        'Pausable: paused',
      );
    });

    it('revert when owner or spender is blocklisted', async function () {
      const data = buildData(this.chainId, this.token.address);
      const signature = ethSigUtil.signTypedMessage(wallet.getPrivateKey(), { data });
      const { v, r, s } = fromRpcSig(signature);

      await this.token.blocklist(from, {from: blocklister});

      await expectRevert(
        this.token.transferWithAuthorization(from, to, value, minValidAfter, maxValidBefore, nonce, v, r, s),
        'Blocklistable: account is blocklisted',
      );

      await this.token.unBlocklist(from, {from: blocklister});
      await this.token.blocklist(to, {from: blocklister});

      await expectRevert(
        this.token.transferWithAuthorization(from, to, value, minValidAfter, maxValidBefore, nonce, v, r, s),
        'Blocklistable: account is blocklisted',
      );
    });
  });

  describe('ReceiveWithAuthorization', async function () {
    const wallet = Wallet.generate();
    let owner = wallet.getAddressString();
    const from = toChecksumAddress(owner);

    beforeEach(async function () {
        await this.token.transfer(from, initialSupply, {from: initialHolder});
    })

    const value = new BN(42);
    const minValidAfter = new BN(0);
    const maxValidBefore = MAX_UINT256;
    const nonce = "0x" + crypto.randomBytes(32).toString('hex');

    const buildData = (chainId, verifyingContract, validAfter = minValidAfter, validBefore = maxValidBefore) => ({
      primaryType: 'ReceiveWithAuthorization',
      types: { EIP712Domain, ReceiveWithAuthorization },
      domain: { name, version, chainId, verifyingContract },
      message: { from, to, value, validAfter, validBefore, nonce },
    });

    it('accepts owner signature and caller is the payee', async function () {
      expect(await this.token.balanceOf(from)).to.be.bignumber.equal(initialSupply);
      expect(await this.token.balanceOf(to)).to.be.bignumber.equal(new BN(0));
      
      expect(await this.token.authorizationState(from, nonce)).to.equal(false);

      const data = buildData(this.chainId, this.token.address);
      const signature = ethSigUtil.signTypedMessage(wallet.getPrivateKey(), { data });
      const { v, r, s } = fromRpcSig(signature);
      
      await this.token.receiveWithAuthorization(from, to, value, minValidAfter, maxValidBefore, nonce, v, r, s, {from: to});
      
      expect(await this.token.balanceOf(from)).to.be.bignumber.equal(initialSupply.sub(value));
      expect(await this.token.balanceOf(to)).to.be.bignumber.equal(value);

      expect(await this.token.authorizationState(from, nonce)).to.equal(true);
    });

    it('emits a AuthorizationUsed event', async function () {
      const data = buildData(this.chainId, this.token.address);
      const signature = ethSigUtil.signTypedMessage(wallet.getPrivateKey(), { data });
      const { v, r, s } = fromRpcSig(signature);

      const result = await this.token.receiveWithAuthorization(from, to, value, minValidAfter, maxValidBefore, nonce, v, r, s, {from: to});

      expectEvent(result, 'AuthorizationUsed', {
        authorizer: from,
        nonce: nonce
      });
    });

    it('reverts tha caller is not the payee', async function () {
      const data = buildData(this.chainId, this.token.address);
      const signature = ethSigUtil.signTypedMessage(wallet.getPrivateKey(), { data });
      const { v, r, s } = fromRpcSig(signature);

      await expectRevert(
        this.token.receiveWithAuthorization(from, to, value, minValidAfter, maxValidBefore, nonce, v, r, s, {from: initialHolder}),
        'EIP3009: caller must be the payee',
      );
    });

    it('revert not match given parameters', async function () {
      const data = buildData(this.chainId, this.token.address);
      const signature = ethSigUtil.signTypedMessage(wallet.getPrivateKey(), { data });
      const { v, r, s } = fromRpcSig(signature);

      await expectRevert(
        this.token.receiveWithAuthorization(from, to, value*2, minValidAfter, maxValidBefore, nonce, v, r, s, {from: to}),
        'EIP3009: invalid signature',
      );
    });

    it('revert reused signature', async function () {
      const data = buildData(this.chainId, this.token.address);
      const signature = ethSigUtil.signTypedMessage(wallet.getPrivateKey(), { data });
      const { v, r, s } = fromRpcSig(signature);

      await this.token.receiveWithAuthorization(from, to, value, minValidAfter, maxValidBefore, nonce, v, r, s, {from: to});

      await expectRevert(
        this.token.receiveWithAuthorization(from, to, value, minValidAfter, maxValidBefore, nonce, v, r, s, {from: to}),
        'EIP3009: authorization is used or canceled',
      );
    });

    it('revert reused nonce', async function () {
      let data = buildData(this.chainId, this.token.address);
      let signature = ethSigUtil.signTypedMessage(wallet.getPrivateKey(), { data });
      var { v, r, s } = fromRpcSig(signature);

      await this.token.receiveWithAuthorization(from, to, value, minValidAfter, maxValidBefore, nonce, v, r, s, {from: to});

      const validAfter = await time.latest();
      data = buildData(this.chainId, this.token.address, validAfter);
      signature = ethSigUtil.signTypedMessage(wallet.getPrivateKey(), { data });
      var { v, r, s } = fromRpcSig(signature);

      await expectRevert(
        this.token.receiveWithAuthorization(from, to, value, minValidAfter, maxValidBefore, nonce, v, r, s, {from: to}),
        'EIP3009: authorization is used or canceled',
      );
    });

    it('revert other signature', async function () {
      const otherWallet = Wallet.generate();
      const data = buildData(this.chainId, this.token.address);
      const signature = ethSigUtil.signTypedMessage(otherWallet.getPrivateKey(), { data });
      const { v, r, s } = fromRpcSig(signature);

      await expectRevert(
        this.token.receiveWithAuthorization(from, to, value, minValidAfter, maxValidBefore, nonce, v, r, s, {from: to}),
        'EIP3009: invalid signature',
      );
    });

    it('revert not yet valid', async function () {
      const validAfter = (await time.latest()) + time.duration.weeks(1);
  
      const data = buildData(this.chainId, this.token.address, validAfter);
      const signature = ethSigUtil.signTypedMessage(wallet.getPrivateKey(), { data });
      const { v, r, s } = fromRpcSig(signature);
  
      await expectRevert(
        this.token.receiveWithAuthorization(from, to, value, validAfter, maxValidBefore, nonce, v, r, s, {from: to}),
        'EIP3009: authorization is not yet valid',
      );
    });

    it('revert aurhorization is expired', async function () {
      const validBefore = (await time.latest()) - time.duration.weeks(1);

      const data = buildData(this.chainId, this.token.address, validBefore);
      const signature = ethSigUtil.signTypedMessage(wallet.getPrivateKey(), { data });
      const { v, r, s } = fromRpcSig(signature);

      await expectRevert(
        this.token.receiveWithAuthorization(from, to, value, minValidAfter, validBefore, nonce, v, r, s, {from: to}),
        'EIP3009: authorization is expired',
      );
    });

    it('revert when paused', async function () {
      const data = buildData(this.chainId, this.token.address);
      const signature = ethSigUtil.signTypedMessage(wallet.getPrivateKey(), { data });
      const { v, r, s } = fromRpcSig(signature);
      
      await this.token.pause({from: pauser});

      await expectRevert(
        this.token.receiveWithAuthorization(from, to, value, minValidAfter, maxValidBefore, nonce, v, r, s, {from: to}),
        'Pausable: paused',
      );
    });

    it('revert when owner or spender is blocklisted', async function () {
      const data = buildData(this.chainId, this.token.address);
      const signature = ethSigUtil.signTypedMessage(wallet.getPrivateKey(), { data });
      const { v, r, s } = fromRpcSig(signature);

      await this.token.blocklist(from, {from: blocklister});

      await expectRevert(
        this.token.receiveWithAuthorization(from, to, value, minValidAfter, maxValidBefore, nonce, v, r, s, {from: to}),
        'Blocklistable: account is blocklisted',
      );

      await this.token.unBlocklist(from, {from: blocklister});
      await this.token.blocklist(to, {from: blocklister});

      await expectRevert(
        this.token.receiveWithAuthorization(from, to, value, minValidAfter, maxValidBefore, nonce, v, r, s, {from: to}),
        'Blocklistable: account is blocklisted',
      );
    });
  });

  describe('CancelWithAuthorization', async function () {
    const wallet = Wallet.generate();
    let owner = wallet.getAddressString();
    const from = toChecksumAddress(owner);
    const authorizer = from;

    beforeEach(async function () {
        await this.token.transfer(from, initialSupply, {from: initialHolder});
    })

    const value = new BN(42);
    const minValidAfter = new BN(0);
    const maxValidBefore = MAX_UINT256;
    const nonce = "0x" + crypto.randomBytes(32).toString('hex');

    const buildData = (chainId, verifyingContract, validAfter = minValidAfter, validBefore = maxValidBefore) => ({
      primaryType: 'TransferWithAuthorization',
      types: { EIP712Domain, TransferWithAuthorization },
      domain: { name, version, chainId, verifyingContract },
      message: { from, to, value, validAfter, validBefore, nonce },
    });

    const buildData2 = (chainId, verifyingContract) => ({
      primaryType: 'CancelAuthorization',
      types: { EIP712Domain, CancelAuthorization },
      domain: { name, version, chainId, verifyingContract },
      message: { authorizer, nonce },
    });

    it('cancel unused transfer authorization and owner signature', async function () {
      expect(await this.token.authorizationState(from, nonce)).to.equal(false);

      let data = buildData(this.chainId, this.token.address);
      let signature = ethSigUtil.signTypedMessage(wallet.getPrivateKey(), { data });
      var { v, r, s } = fromRpcSig(signature);
      const transfer_v =v;
      const transfer_r =r;
      const transfer_s =s;
      
      data = buildData2(this.chainId, this.token.address);
      signature = ethSigUtil.signTypedMessage(wallet.getPrivateKey(), { data });
      var { v, r, s } = fromRpcSig(signature);

      await this.token.cancelAuthorization(authorizer, nonce, v, r, s);

      expect(await this.token.authorizationState(from, nonce)).to.equal(true);

      await expectRevert(
        this.token.transferWithAuthorization(from, to, value, minValidAfter, maxValidBefore, nonce, transfer_v, transfer_r, transfer_s),
        'EIP3009: authorization is used or canceled',
      );
    });

    it('emits a AuthorizationCanceled event', async function () {
      let data = buildData(this.chainId, this.token.address);
      let signature = ethSigUtil.signTypedMessage(wallet.getPrivateKey(), { data });
      var { v, r, s } = fromRpcSig(signature);

      data = buildData2(this.chainId, this.token.address);
      signature = ethSigUtil.signTypedMessage(wallet.getPrivateKey(), { data });
      var { v, r, s } = fromRpcSig(signature);

      const result = await this.token.cancelAuthorization(authorizer, nonce, v, r, s);

      expectEvent(result, 'AuthorizationCanceled', {
        authorizer: authorizer,
        nonce: nonce
      });
    });

    it('revert other signature', async function () {
      let data = buildData(this.chainId, this.token.address);
      let signature = ethSigUtil.signTypedMessage(wallet.getPrivateKey(), { data });
      var { v, r, s } = fromRpcSig(signature);
      const transfer_v =v;
      const transfer_r =r;
      const transfer_s =s;
    
      expect(await this.token.authorizationState(authorizer, nonce)).to.equal(false);
      
      const otherWallet = Wallet.generate();
      data = buildData2(this.chainId, this.token.address);
      signature = ethSigUtil.signTypedMessage(otherWallet.getPrivateKey(), { data });
      var { v, r, s } = fromRpcSig(signature);
      
      await expectRevert(
        this.token.cancelAuthorization(authorizer, nonce, v, r, s),
        'EIP3009: invalid signature',
      );
      
      expect(await this.token.authorizationState(authorizer, nonce)).to.equal(false);

      await this.token.transferWithAuthorization(from, to, value, minValidAfter, maxValidBefore, nonce, transfer_v, transfer_r, transfer_s);
    });

    it('reverts authorization has already been used', async function () {
      let data = buildData(this.chainId, this.token.address);
      let signature = ethSigUtil.signTypedMessage(wallet.getPrivateKey(), { data });
      var { v, r, s } = fromRpcSig(signature);
    
      await this.token.transferWithAuthorization(from, to, value, minValidAfter, maxValidBefore, nonce, v, r, s);
      
      data = buildData(this.chainId, this.token.address);
      signature = ethSigUtil.signTypedMessage(wallet.getPrivateKey(), { data });
      var { v, r, s } = fromRpcSig(signature);
      
      await expectRevert(
        this.token.cancelAuthorization(authorizer, nonce, v, r, s),
        'EIP3009: authorization is used or canceled',
      );
    });

    it('reverts authorization has already benn canceled', async function () {
      const data = buildData2(this.chainId, this.token.address);
      const signature = ethSigUtil.signTypedMessage(wallet.getPrivateKey(), { data });
      const { v, r, s } = fromRpcSig(signature);

      await this.token.cancelAuthorization(authorizer, nonce, v, r, s);
      
      await expectRevert(
        this.token.cancelAuthorization(authorizer, nonce, v, r, s),
        'EIP3009: authorization is used or canceled',
      );
    });

    it('revert when paused', async function () {
      const data = buildData2(this.chainId, this.token.address);
      const signature = ethSigUtil.signTypedMessage(wallet.getPrivateKey(), { data });
      const { v, r, s } = fromRpcSig(signature);
      
      await this.token.pause({from: pauser});

      await expectRevert(
        this.token.cancelAuthorization(authorizer, nonce, v, r, s),
        'Pausable: paused',
      );
    });
  });
}

module.exports = {
    shouldBehaveLikeEIP3009,
}