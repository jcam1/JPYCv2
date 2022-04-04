const { expectEvent, expectRevert } = require('@openzeppelin/test-helpers');

const { shouldBehaveLikeOwner } = require('./owner.behavior')

const { shouldBehaveLikePauser } = require('./pauser.behavior')

const { shouldBehaveLikeBlocklister } = require('./blocklister.behavior')

const ERC1967Proxy = artifacts.require('ERC1967Proxy');
const FiatTokenV1 = artifacts.require('FiatTokenV1');
const ContractCall = artifacts.require('ContractCall');

const { _data } = require('../helpers/DataMaker');

contract('UUPSUpgradeable', function (accounts) {
  const [
    alice
  ] = accounts

  beforeEach(async function () {
    const fiatToken = await FiatTokenV1.new();
    this.impOk = await FiatTokenV1.new();
    this.contract = await ContractCall.new();
    const addr = this.contract.address;
    const proxy = await ERC1967Proxy.new(fiatToken.address, _data(addr, addr, addr, addr, addr));
    this.token = await FiatTokenV1.at(proxy.address);
  });

  describe('shouldBehaveLikeOwner', () => {
    shouldBehaveLikeOwner(alice);
  });

  describe('shouldBehaveLikePauser', () => {
    shouldBehaveLikePauser();
  });

  describe('shouldBehaveLikeBlocklister', () => {
    shouldBehaveLikeBlocklister(alice);
  });
});