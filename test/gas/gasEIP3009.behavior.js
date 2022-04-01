const { expect } = require("chai");
const crypto = require("crypto");
const {
  constants,
} = require('@openzeppelin/test-helpers')
const { MAX_UINT256 } = constants
const { default: Wallet } = require('ethereumjs-wallet')
const { fromRpcSig, toChecksumAddress } = require('ethereumjs-util');
const ethSigUtil = require('eth-sig-util');

const { EIP3009TransferMake } = require('../helpers/EIP3009Maker')

function gasEstimateEIP3009(name, initialSupply, initialHolder, recipient) {

  const wallet = Wallet.generate()
  const from = wallet.getAddressString()
  const to = recipient
  const transferred = initialSupply
  const nonce = "0x" + crypto.randomBytes(32).toString('hex')

  beforeEach(async function () {
    await this.token.transfer(from, initialSupply, {from:initialHolder})
  })

  it('transferWithAuthorization', async function () {
    data = EIP3009TransferMake(name, this.token.address, from, to, transferred, nonce);
    signature = ethSigUtil.signTypedMessage(wallet.getPrivateKey(), {
      data,
    });
    var { v, r, s } = fromRpcSig(signature);

    estimateGas = await this.token.transferWithAuthorization.estimateGas(from, to, transferred, 0, MAX_UINT256, nonce, v, r, s);
    console.log("estimateGas is " + estimateGas.toString());
    await this.token.transferWithAuthorization(from, to, transferred, 0, MAX_UINT256, nonce, v, r, s);
    expect(await this.token.balanceOf(to)).to.be.bignumber.equal(initialSupply);
  });
};

module.exports = {
  gasEstimateEIP3009,
}