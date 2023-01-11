const crypto = require("crypto");
const {
  BN,
  constants,
  expectEvent,
  expectRevert,
} = require('@openzeppelin/test-helpers')
const { min } = require('bn.js')
const { MAX_UINT256, ZERO_ADDRESS, ZERO_BYTES32 } = constants
const { expect } = require('chai')
const { default: Wallet } = require('ethereumjs-wallet')
const { fromRpcSig, toChecksumAddress } = require('ethereumjs-util');
const ethSigUtil = require('eth-sig-util');

const { _data } = require('../helpers/DataMaker')
const { EIP2612Make } = require('../helpers/EIP2612Maker')
const { EIP3009TransferMake } = require('../helpers/EIP3009Maker')

const FiatTokenProxy = artifacts.require('ERC1967Proxy')
const FiatTokenV1 = artifacts.require('FiatTokenV1')
const FiatTokenV1_1 = artifacts.require('FiatTokenV1_1')
const FiatTokenV2 = artifacts.require('FiatTokenV2')

const { EIP712Domain, domainSeparator } = require('../helpers/eip712');

function usesOriginalStorageSlotPositions({ version, accounts }) {
  describe('uses original storage slot positions', () => {
    const [name, symbol, currency, decimals] = ['JPY Coin', 'JPYC', 'JPY', 18]
    const [mintAllowance, minted, transferred, allowance] = [
      1000,
      100,
      30,
      10,
    ]
    const [
      owner,
      minterAdmin,
      pauser,
      blocklister,
      minter,
      rescuer,
      allowlister,
      alice,
      bob,
      charlie,
      to,
    ] = accounts

    let fiatToken
    let proxy
    let proxyAsFiatToken
    const wallet = Wallet.generate()
    const from = wallet.getAddressString()
    const nonce = "0x" + crypto.randomBytes(32).toString('hex')

    beforeEach(async () => {
      fiatToken = await FiatTokenV1.new()
      proxy = await FiatTokenProxy.new(
        fiatToken.address,
        _data(minterAdmin, pauser, blocklister, rescuer, owner)
      )

      proxyAsFiatToken = await FiatTokenV1.at(proxy.address)

      if (version == 1.1) {
        fiatToken = await FiatTokenV1_1.new()
        await proxyAsFiatToken.upgradeTo(fiatToken.address, { from: owner })
        proxyAsFiatToken = await FiatTokenV1_1.at(proxy.address);
      }

      if (version == 2) {
        fiatToken = await FiatTokenV2.new()
        await proxyAsFiatToken.upgradeTo(fiatToken.address, { from: owner })
        proxyAsFiatToken = await FiatTokenV2.at(proxy.address)
      }
      
      await proxyAsFiatToken.configureMinter(minter, mintAllowance, { from: minterAdmin });
      await proxyAsFiatToken.mint(alice, minted, { from: minter });
      await proxyAsFiatToken.mint(from, minted, { from: minter });
      await proxyAsFiatToken.transfer(bob, transferred, { from: alice });
      await proxyAsFiatToken.approve(charlie, allowance, { from: alice });
      await proxyAsFiatToken.blocklist(charlie, { from: blocklister });

      let data = EIP2612Make(name, proxy.address, from, to, allowance);
      let signature = ethSigUtil.signTypedMessage(wallet.getPrivateKey(), {
        data,
      });
      var { v, r, s } = fromRpcSig(signature);
      await proxyAsFiatToken.permit(from, to, allowance, MAX_UINT256, v, r, s);

      data = EIP3009TransferMake(name, proxy.address, from, to, transferred, nonce);
      signature = ethSigUtil.signTypedMessage(wallet.getPrivateKey(), {
        data,
      });
      var { v, r, s } = fromRpcSig(signature);
      await proxyAsFiatToken.transferWithAuthorization(from, to, transferred, 0, MAX_UINT256, nonce, v, r, s);
      
      if(version == 2) {
        await proxyAsFiatToken.updateAllowlister(allowlister, { from: owner });
        await proxyAsFiatToken.allowlist(charlie, { from: allowlister });
      }

      await proxyAsFiatToken.pause({ from: pauser });
      await proxyAsFiatToken.updateRescuer(rescuer, { from: owner });
    })

    it('retains original storage slots 0 through 571', async () => {
      const slots = []
      for (let i = 0; i < 1000; i++) {
        const slot = await readSlot(proxy.address, i)
        slots.push(slot)
      }

      // Ownable.sol
      // slot 0 - owner
      expect(parseAddress(slots[0])).to.equal(owner) // owner
      checkGap(1, 51, slots)

      // Pausable.sol
      // slot 51 - pauser, paused
      // values are lower-order aligned
      expect(parseBoolAddress(slots[51]).slice(0, 2)).to.equal('01') // paused
      expect(parseAddress(parseBoolAddress(slots[51]).slice(2))).to.equal(
        pauser
      ) // pauser
      checkGap(52, 102, slots)

      // Blocklistable.sol
      // slot 102 - blocklister
      expect(parseAddress(slots[102])).to.equal(blocklister) // blocklister

      // slot 103 - blocklisted (mapping, slot is unused)
      expect(slots[103]).to.equal('')
      checkGap(104, 154, slots)

      // Rescuable.sol
      // slot 154 - rescuer
      expect(parseAddress(slots[154])).to.equal(rescuer)
      checkGap(155, 205, slots)

      // AbstractFiatTokenV1.sol
      checkGap(205, 255, slots);

      // EIP712Domain.sol
      // slot 255 - DOMAIN_SEPARATER
      const DOMAIN_SEPARATER = await domainSeparator(
        name,
        '1',
        1337,
        proxy.address
      )
      expect(parseHash(slots[255])).to.equal(DOMAIN_SEPARATER)

      // slot 256 - CHAIN_ID
      expect(parseUint(slots[256]).toNumber()).to.equal(1337)

      // slot 257 - NAME
      expect(parseString(slots[257])).to.equal(name)

      // slot 258 - VERSION
      expect(parseString(slots[258])).to.equal('1')

      checkGap(259, 309, slots)

      // EIP3009.sol
      // slot 309 - _authorizationStates (mapping, slot is unused)
      expect(slots[309]).to.equal('')
      checkGap(310, 360, slots)

      // EIP2612.sol
      // slot 360 - _permitNonces (mapping, slot is unused)
      expect(slots[360]).to.equal('')
      checkGap(361, 411, slots)

      // UUPSUpgradeable.sol
      checkGap(411, 461, slots)

      // ERC1967Upgradeable.sol
      checkGap(461, 511, slots)

      // FiatTokenV1.sol
      // slot 511 - name
      expect(parseString(slots[511])).to.equal(name)

      // slot 512 - symbol
      expect(parseString(slots[512])).to.equal(symbol)

      // slot 513 - currency
      expect(parseString(slots[513])).to.equal(currency)

      // slot 514 - totalSuuply
      expect(parseUint(slots[514]).toNumber()).to.equal(minted*2)

      // slot 515 - minterAdmin, initialized
      expect(parseAddress(parseBoolUint8Address(slots[515]).slice(4))).to.equal(
        minterAdmin
        ) // minterAdmin
      expect(parseUint(parseBoolUint8Address(slots[515]).slice(2, 4)).toNumber()).to.equal(decimals)
      expect(parseBoolUint8Address(slots[515]).slice(0, 2)).to.equal('01') // initialized

      // slot 516 - balances (mapping, slot is unused)
      expect(slots[516]).to.equal('')

      // slot 517 - allowed (mapping, slot is unused)
      expect(slots[517]).to.equal('')

      // slot 518 - minters (mapping, slot is unused)
      expect(slots[518]).to.equal('')

      // slot 519 - minterAllowed (mapping, slot is unused)
      expect(slots[519]).to.equal('')

      if (version == 2) {
        // FiatTokenV2.sol
        // slot 520 - allowlisted (mapping, slot is unused)
        expect(slots[520]).to.equal('')

        // slot 521 - allowlister
        expect(parseAddress(slots[521])).to.equal(allowlister)
      }
    })

    it('retains original storage slots for blocklisted mapping', async () => {
      // blocklisted[alice]
      let v = await readSlot(proxy.address, addressMappingSlot(alice, 103))
      expect(v).to.equal('')

      // blocklisted[charlie]
      v = await readSlot(proxy.address, addressMappingSlot(charlie, 103))
      expect(v).to.equal('1')
    })

    it('retains original storage slots for _authorizationState mapping', async () => {
      // _authorizationState[from]
      let v = await readSlot(proxy.address, address2MappingSlot(from, nonce, 309))
      expect(v).to.equal('1')

      // _authorizationState[to]
      v = await readSlot(proxy.address, address2MappingSlot(to, nonce, 309))
      expect(v).to.equal('')
    })

    it('retains original storage slots for _permitNonces mapping', async () => {
      // _permitNonces[from]
      let v = await readSlot(proxy.address, addressMappingSlot(from, 360))
      expect(v).to.equal('1')

      // _permitNonces[to]
      v = await readSlot(proxy.address, addressMappingSlot(to, 360))
      expect(v).to.equal('')
    })

    it('retains original storage slots for balances mapping', async () => {
      // balance[alice]
      let v = parseInt(
        await readSlot(proxy.address, addressMappingSlot(alice, 516)),
        16
      )
      expect(v).to.equal(minted - transferred)

      // balances[bob]
      v = parseInt(
        await readSlot(proxy.address, addressMappingSlot(bob, 516)),
        16
      )
      expect(v).to.equal(transferred)
    })

    it('retains original storage slots for allowed mapping', async () => {
      // allowed[alice][bob]
      let v = await readSlot(
        proxy.address,
        address2MappingSlot(alice, bob, 517)
      )
      expect(v).to.equal('')
      // allowed[alice][charlie]
      v = parseInt(
        await readSlot(proxy.address, address2MappingSlot(alice, charlie, 517)),
        16
      )
      expect(v).to.equal(allowance)
    })

    it('retains original storage slots for minters mapping', async () => {
      // minters[minter]
      let v = await readSlot(proxy.address, addressMappingSlot(minter, 518))
      expect(v).to.equal('1')

      // minters[alice]
      v = await readSlot(proxy.address, addressMappingSlot(alice, 518))
      expect(v).to.equal('')
    })

    it('retains original storage slots for minterAllowed mapping', async () => {
      // minterAllowed[minter]
      let v = parseInt(
        await readSlot(proxy.address, addressMappingSlot(minter, 519)),
        16
      )
      expect(v).to.equal(mintAllowance - minted*2)

      // minterAllowed[alice]
      v = await readSlot(proxy.address, addressMappingSlot(alice, 519))
      expect(v).to.equal('')
    })

    if (version == 2) {
      it('retains original storage slots for allowlisted mapping', async () => {
        // allowlisted[alice]
        let v = await readSlot(proxy.address, addressMappingSlot(alice, 520))
        expect(v).to.equal('')

        // allowlisted[charie]
        v = await readSlot(proxy.address, addressMappingSlot(charlie, 520))
        expect(v).to.equal('1')
      })
    }
  })
}

async function readSlot(address, slot) {
  let data = await web3.eth.getStorageAt(
    address,
    slot // does support string, but type definition file is wrong
  )
  data = data.replace(/^0x/, '')
  return data.replace(/^0+/, '')
}

function parseAddress(hex) {
  return web3.utils.toChecksumAddress(hex.padStart(40, '0'))
}

function parseString(hex) {
  const len = parseInt(hex.slice(-2), 16)
  return Buffer.from(hex.slice(0, len), 'hex').toString('utf8')
}

function parseUint(hex) {
  return new BN(hex, 16)
}

function parseHash(hex) {
  return '0x' + hex.padStart(64, '0')
}

function parseBoolAddress(hex) {
  return hex.padStart(42, '0')
}

function parseBoolUint8Address(hex) {
  return hex.padStart(44, '0')
}

function encodeUint(value) {
  return new BN(value).toString(16).padStart(64, '0')
}

function encodeAddress(addr) {
  return addr.replace(/^0x/, '').toLowerCase().padStart(64, '0')
}

function addressMappingSlot(addr, pos) {
  return web3.utils.keccak256('0x' + encodeAddress(addr) + encodeUint(pos))
}

function address2MappingSlot(addr, addr2, pos) {
  return web3.utils.keccak256(
    '0x' + encodeAddress(addr2) + addressMappingSlot(addr, pos).slice(2)
  )
}

function checkGap(i, j, slots) {
  for (i; i < j; i++) {
    expect(slots[i]).to.equal('')
  }
}

module.exports = {
  usesOriginalStorageSlotPositions,
}