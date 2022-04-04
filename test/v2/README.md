

### Allowlistable.behaviour.js
- isAllowlisted
  - account is allowlisted
  - account is not allowlisted
- allowlist
  - requested account is allowlister
    - allowlist allowlisted account
    - allowlist unallowlisted account
    - emmits a allowlist event
  - requested account is not allowlister 
- unallowlist
  - requested account is allowlister
    - unallowlist allowlisted account
    - unallowlist unallowlisted account
    - emits a unAllowlist event
  - requested account is not allowlister
- upadateAllowlister
  - allowlister
  - newAllowlister is not the zero
    - requested account is owner
      - returns allowlister
      - emits a updateAllowlister event
    - requested account is not owner
  - newAllowlister is the zero
- allowlistable token
  - approve
    - allows to approve over 100000 tokens when Allowlisted
    - reverts when allows to approve over 100000 tokens when unAllowlisted
    - allows to approve under 100000 tokens when unAllowlisted
    - allows to approve under 100000 tokens when allowlisted and then unAllowlisted
  - transfer
    - allows to transfer over 100000 when allowlisted
    - allows to transfer under 100000 tokens when allowlisted and then unAllowlisted
    - reverts when trying to transfer when sender is not allowlisted and the value is more than 100000
  - transfer from
    - allows to transferfrom over 100000 tokens when sender is Allowlisted
    - allows to transferfrom under 100000 tokens when sender is not Allowlisted
    - allows to transferfrom under 100000 tokens when sender is allowlisted and then unAllowlisted
    - reverts when transferfrom over 100000 tokens when sender is not Allowlisted
    - allows to transferfrom under 100000 tokens when sender is not Allowlisted
  - increaseAllowance
    - allows to increaseAllowance under 100000 tokens when msg.sender is unAllowlisted
    - allows to increaseAllowance under 100000 tokens when msg.sender and spender is allowlisted and then unAllowlisted
    - reverts when trying to increaseAllowance over 100000 tokens when msg.sender is not allowlisted
  - decreaseAllowance
    - allows to decreaseAllowance when unAllowlisted
    - allows to decreaseAllowance when allowlisted and then unAllowlisted
  - mint
    - allows to mint over 100000 tokens when minter is allowlisted
    - allows to mint under 100000 tokens when minter is not allowlisted
    - reverts when minter is not allowlisted and mint more than 100000 token
  - allowlist
    - allows to allowlist when unpaused
    - allows to allowlist when paused and then unpaused
    - reverts when trying to allowlist when paused

### AllowlistEIP2612.behaviour.js
- permit
  - accepts owner signature when unallowlisted and under 100000 tokens
  - reverts when permit with unallowlisted account and over 100000 tokens
  - accepts owner signature when he is allowlisted and under 100000 tokens
  - accepts owner signature when he is allowlisted and over 100000 tokens

### AllowlistEIP3009.behaviour.js
- TransferWithAuthorization
  - accepts owner signature when from is unAllowlisted and send under 100000 tokens
  - reverts when from is unAllowlisted and send over 100000 tokens
  - accepts owner signature when from is allowlisted and send under 100000 tokens
  - accepts owner signature when from is allowlisted and send over 100000 tokens
- ReceiveWithAuthorization
  - accepts owner signature when from is not allowlisted and receive under 100000 tokens and caller is the payee
  - reverts when from is not allowlisted and receive over 100000 tokens and caller is the payee
  - accepts owner signature when from is allowlisted and receive under 100000 tokens and caller is the payee
  - accepts owner signature when from is allowlisted and receive over 100000 tokens and caller is the payee

