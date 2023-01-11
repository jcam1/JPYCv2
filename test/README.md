# General ERC20 test
- 1. deploy erc20 contract
- 2. check normal myERC20's functions: transfer, mint, etc.
- 3. transfer some token and then upgrade contract
- 4. check if the old data exists and new function is added
- 5. check normal myERC20V2's contract functions: transfer, mint, etc.

# test list

## contractCall test

### contractCall.test.js

### owner.behavior.js
- upgradeTo
- upgradeToAndCall
- updateMinterAdmin
- updatePauser
- updateBlocklister
- transferOwnership
- updateRescuer

### pauser.behavior.js
- pause
- unpause

### blocklister.behavior.js
- blocklist
- unBlocklist

## storageSlot test

### storageSlot.test.js
- v1
- v1_1(upgraded)
- v2(upgraded)

### storageSlot.behavior.js
- retains original storage slots 0 through 521
- retains original storage slots for blacklisted mapping
- retains original storage slots for _authorizationState mapping
- retains original storage slots for _permitNonces mapping
- retains original storage slots for balances mapping
- retains original storage slots for allowed mapping
- retains original storage slots for minters mapping
- retains original storage slots for minterAllowed mapping
- retains original storage slots for allowlisted mapping

## upgradeability

### UUPSUpgradeable.test.js
- reject proxiableUUID through delegatecall
- upgrade to upgradeable implementation
- upgrade to upgradeable implementation with call
- upgrade to and unsafe upgradeable implementation
- reject upgrade to non uups implementation
- reject proxy address as implementation


## util test

### ECRecover.test.js
- recovers signer address from a valid signature
- reverts with ZERO_BYTES32 value signature
- reverts with v-2 value signature
- reverts with v+2 value signature
- reverts with high-s value signature


## v1 test

### AnotherToken.test.js

### Initialize.behaviour.js
- new minterAdmin is the zero
- new pauser is the zero
- new blocklister is the zero
- new owner is the zero

### ERC20.test.js
- already initialized
- name
- symbol
- currency
- decimals
- minterAdmin
- pauser
- blocklister
- owner
- rescuer

### ERC20.behaviour.js
- total supply
- balanceOf
  - has no token
  - has some token
- transfer
  - shouldBehaveLikeERC20Transer
  - recipient is not the zero
    - sender not have enough balance
    - transfers all balance
      - transfers the requested amount
      - emits a transfer event
    - transfers zero tokens
      - transfers the requested amount
      - emits a transfer event
  - recipient is the zero
- transfer from
  - owner is not the zero
    - recipient is not the zero
      - spender has enough approved balance
        - owner has enough balance
          - transfers the requested amount
          - decrease the spender allowance
          - emits a transfer event
        - owner not have enough balance
      - spender not have enough approved balance
        - owner has enough balance
        - owner has not enough balance
    - recipient is the zero
  - owner is the zero
- approve
  - shouldBehaveLikeERC20Approve
  - spender is the zero
    - spender has enough balance
      - emits an approve event
      - no approved amount before
      - spender had an approved amount
    - spender not have enough balance
      - emits an approval event
      - no approved amount before
      - spender had an approved amount
  - spender is the zero
- decrease allowance
  - spender is not the zero
    - no approved amount before
    - spender had an approved amount
      - emits an approval event
      - decrease the spender allowance
      - sets the allowance to zero when all allowance is removed
      - decrease allowance below zero
    - spender has enough balance
    - spender not have enough balance
  - spender is the zero
- increase allowance
  - spender is not the zero
    - sender has enough balance
      - emits an approval event
      - no approved amount before
      - spender had an approved amount
    - sender not have enough balance
      - emits an approval event
      - no approved amont before
      - spender had an approved amount
  - spender is the zero

### Blasklistable.behaviour.js
- isBlocklisted
  - account is blocklisted
  - account is not blocklisted
- blocklist
  - requested account is blocklister
    - blocklist blocklisted account
    - blocklist unblocklisted account
    - emmits a blocklist event
  - requested account is not blocklister
- unblocklist
  - requested account is blocklister
    - unblocklist blocklisted account
    - unblocklist unblocklisted account
    - emmits a unBlocklist event
  - requested account is not blocklister
- upadateBlocklister
  - blocklister
  - newBlocklister is not the zero
    - requested account is owner
      - returns blocklister
      - emits a updateBlocklister event
    - requested account is not owner
  - newBlocklister is the zero
- blocklistable token
  - approve
    - when unblocklisted
    - when blocklisted and then unblocklsited
    - when recipient is blocklisted
    - when sender is blocklisted
  - transfer
    - when unblocklisted
    - when blocklisted and then unblocklsited
    - when recipient is blocklisted
    - when sender is blocklisted
  - transfer from
    - when unblocklisted
    - when blocklisted and then unblocklsited
    - when msg.sender is blocklisted
    - when from account is blocklisted
    - when to account is blocklisted
  - increaseAllowance
    - when unblocklisted
    - when blocklisted and then unblocklsited
    - when spender is blocklisted
    - when msg.sender is blocklisted
  - decreaseAllowance
    - when unblocklisted
    - when blocklisted and then unblocklsited
    - when spender is blocklisted
    - when msg.sender is blocklisted
  - mint
    - when unblocklisted
    - when blocklisted and then unblocklsited
    - when to is blocklisted
    - when minter is blocklisted
  - burn
    - when unblocklisted
    - when blocklisted and then unblocklsited
    - when minter is blocklisted


### Owanable.behaviour.js
- owner
- transfer ownership
  - chages owner after transfer
  - prevents non-owners from tranferring
  - guards ownership against stuck state

### Pausable.behaviour.js
- pause
  - requested account is pauser
  - requested account is not pauser
- uppause
  - requseted account is pauser
  - requested account is not puaser
- updatePauser
  - pauser
  - newPauser is not the zero
    - requested account is owner
      - pauser
      - emits a updateBlocklister event
    - requested account is not owner
  - newPauser is the zero
-  pausable token
  - approve
    - when unpaused
    - when paused and then unpaused
    - when paused
  - transfer
    - when unpaused
    - when paused and then unpaused
    - when paused
  - transfer from
    - when unpaused
    - when paused and then unpaused
    - when paused
  - increaseAllowance
    - when unpaused
    - when paused and then unpaused
    - when paused
  - decreaseAllowance
    - when unpaused
    - when paused and then unpaused
    - when paused
  - mint
    - when unpaused
    - when paused and then unpaused
    - when paused
  - configureMinter
    - when unpaused
    - when paused and then unpaused
    - when paused
  - burn
    - when unpaused
    - when paused and then unpaused
    - when paused

### Rescuable.behaviour.js
- rescueERC20
  - rescueERC20(full amount)
  - rescueERC20(partical amount)
  - rescueERC20(greater than balance)
  - contract is not ERC20
  - requested account is not rescuer
- updateRescuer
  - rescuer
  - newRescuer is not the zero
    - requested account is owner
      - rescuer
      - emits a updateBlocklister event
    - requested account is not owner
  - newRescuer is the zero

### EIP2612.behavior.js
- initial nonce is 0
- domainSeparatorV4
- expected permit type hash
- premit
  - owner signature
  - not match given parameters
  - reused signature
  - other signature
  - expired permit
  - when paused
  - when blocklisted

### EIP3009.behavior.js
- domainSeparatorV4
- expected transfer type hash
- expected receive type hash
- expected cancel type hash
- TransferWithAuthorization
  - owner signature
  - emmits a Authorization evet
  - not mutch given parameters
  - reused signature
  - reused nonce
  - other signature
  - not yet valid
  - authorization is expired
  - when paused
  - when blocklisted
- ReceiveWithAuthorization
  - owner signature and caller is the payee
  - caller is not the payee
  - not mutch given parameters
  - reused signature
  - reused nonce
  - other signature
  - not yet valid
  - authorization is expired
  - when paused
  - when blocklisted
- CancelAuthorization
  - unused transfer authorization and owner signature
  - emits a AuthorizationCanceled event
  - other signature
  - authorization has already been used
  - authorization has already been canceld
  - when paused

### FiatTokenV1.behavior.js
- minterAdmin
- mint
  - requested account is minter
    - mint (full amount)
    - mint (partical amount)
    - emits a Mint event
    - emits a Transfer event
    - when to is the zero
    - when amount is not greater than 0
    - when amount exceeds minterAllowance
  - requested account is not minter
- minterallowance
  - minterAllowed
- isMinter
  - true
  - false
- configureMinter
  - requested account is minterAdmin
    - emits a MasterConfigured event
  - requested account is not minterAdmin
- removeMinter
  - requested account is minterAdmin
    - remove minter
    - emits a MinterRemoved event
    - removed and then configured
  - requested account is not minterAdmin
- burn
  - requested account is minter
    - burn (full amount)
    - burn (partical amount)
    - emits a Burn event
    - emits a Transfer event
    - when amount is not greater than 0
    - when amount exceeds balance
  - requested account is not minter
- updateMinterAdmin
  - nasterMinter
  - newMinterAdmin is not the zero
    - requested account is owner
      - minterAdmin
      - emits a updateMinterAdmin event
    - requested account is not owner
  - newMinterAdmin is the zero
- transferFrom
  - when maximum approve

### UUPSUpgradeable.behavior.js
- expected proxiableUUID _IMPLEMENTATION_SLOT
- reject upgradeTo not through delegatecall
- reject upgradeToAndCall not through delegatecall

## v1_proxy test
- all test of v1 except the list below
  - shouldBehaveLikeUUPSUpgradeable

## v1_1 test
- all test of v1 except the list below
  - domain separator(v1/EIP2612.behavior.js)
  - domain separator(v1/EIP3009.behavior.js)
- add list below
  - DOMAIN_SEPARATOR(v1_1/EIP712Domain.behavior.js)

## v1_1 proxy
- all test of v1_1 except the list below
  - shouldBehaveLikeUUPSUpgradeable