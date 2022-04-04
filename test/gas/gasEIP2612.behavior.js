const { expect } = require("chai");
const {
  constants,
} = require('@openzeppelin/test-helpers')
const { MAX_UINT256 } = constants
const { default: Wallet } = require('ethereumjs-wallet')
const { fromRpcSig, toChecksumAddress } = require('ethereumjs-util');
const ethSigUtil = require('eth-sig-util');

const { EIP2612Make } = require('../helpers/EIP2612Maker')

function gasEstimateEIP2612(name, initialSupply, initialHolder, recipient) {

  const wallet = Wallet.generate()
  const from = wallet.getAddressString()
  const to = recipient
  const allowance = initialSupply

  beforeEach(async function () {
    await this.token.transfer(from, initialSupply, {from:initialHolder})
  })

  it('permit', async function () {
    const data = EIP2612Make(name, this.token.address, from, to, allowance)
    let signature = ethSigUtil.signTypedMessage(wallet.getPrivateKey(), {
      data,
    });
    var { v, r, s } = fromRpcSig(signature);
    estimateGas = await this.token.permit.estimateGas(from, to, allowance, MAX_UINT256, v, r, s)
    console.log("estimateGas is " + estimateGas.toString());
    await this.token.permit(from, to, allowance, MAX_UINT256, v, r, s)
    expect(await this.token.allowance(from, to)).to.be.bignumber.equal(initialSupply);
  });
};

module.exports = {
  gasEstimateEIP2612,
}
