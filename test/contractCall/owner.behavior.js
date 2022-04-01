const { BN, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { ZERO_BYTES32 } = require('@openzeppelin/test-helpers/src/constants');
const { expect } = require('chai');
const { ZERO_ADDRESS } = constants;

function shouldBehaveLikeOwner (alice) {
  it('upgradeTo', async function () {
    await this.contract.functionCall(
      this.token.address,
      this.token.contract.methods.upgradeTo(this.impOk.address).encodeABI()
    )

    const data = await web3.eth.getStorageAt(
      this.token.address,
      "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc"
    )
    expect(web3.utils.toChecksumAddress("0x" + data.replace(/^0x/, '').substring(24, 64))).to.be.equal(this.impOk.address);
  });

  it('upgradeToAndCall', async function () {
    await this.contract.functionCall(
      this.token.address,
      this.token.contract.methods.upgradeToAndCall(
        this.impOk.address,
        this.token.contract.methods.owner().encodeABI()
      ).encodeABI()
    )

    const data = await web3.eth.getStorageAt(
      this.token.address,
      "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc"
    )
    expect(web3.utils.toChecksumAddress("0x" + data.replace(/^0x/, '').substring(24, 64))).to.be.equal(this.impOk.address);
  });

  it('updateMinterAdmin', async function () {
    expect(await this.token.minterAdmin()).to.be.equal(this.contract.address);
    
    await this.contract.functionCall(
        this.token.address,
        this.token.contract.methods.updateMinterAdmin(alice).encodeABI()
    );

    expect(await this.token.minterAdmin()).to.be.equal(alice);
  });

  it('updatePauser', async function () {
    expect(await this.token.pauser()).to.be.equal(this.contract.address);
    
    await this.contract.functionCall(
        this.token.address,
        this.token.contract.methods.updatePauser(alice).encodeABI()
    );

    expect(await this.token.pauser()).to.be.equal(alice);
  });

  it('updateBlocklister', async function () {
    expect(await this.token.blocklister()).to.be.equal(this.contract.address);
    
    await this.contract.functionCall(
        this.token.address,
        this.token.contract.methods.updateBlocklister(alice).encodeABI()
    );

    expect(await this.token.blocklister()).to.be.equal(alice);
  });

  it('transferOwnership', async function () {
    expect(await this.token.owner()).to.be.equal(this.contract.address);
    
    await this.contract.functionCall(
        this.token.address,
        this.token.contract.methods.transferOwnership(alice).encodeABI()
    );

    expect(await this.token.owner()).to.be.equal(alice);
  });

  it('updateRescuer', async function () {
    expect(await this.token.rescuer()).to.be.equal(this.contract.address);
    
    await this.contract.functionCall(
        this.token.address,
        this.token.contract.methods.updateRescuer(alice).encodeABI()
    );

    expect(await this.token.rescuer()).to.be.equal(alice);
  });
}

module.exports = {
  shouldBehaveLikeOwner,
};