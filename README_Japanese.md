
# 日本円ステーブルコインJPYC
## 目的
現在(2022/4/1)、すでに運用されている日本円ステーブルコインJPYCが存在しており、便宜上ここでは「JPYC v1」と呼ぶ。JPYC v1はERC20トークンである。しかし、JPYC v1をスタートした当初からJPYCエコシステムが目覚ましい成長を遂げてきており、今後さらなる成長を目指すにはいくつかのキーとなる機能を備わっていない。例えば、スマートコントラクトをアップグレードできるUpgradeability機能、コントラクトを一時停止できるPausability機能、特定のアカウントをブロックできるblocklistability機能などが挙げられる。今回のJPYC v2の開発はそういった機能を付け加えるとともに、ガス代の最適化をはかったのである。
## 概要
JPYC v2のことを一言でまとめる、**JPYC v2はERC20トークンであり、複数のエンティティによる通貨発行ができたり、コントラクトの一時停止ができたり、特定アカウントのブロックできたり、当該コントラクトに誤送信されたトークンの引き出しができたり、バグの修正あるいは機能を追加するためにスマートコントラクトのアップグレードができたりするプロトコルとなっている**。

## プロトコルの構造
![contractArchitecture](contractArchitecture.drawio.svg)

## Solidityバージョン
Solidityのバージョンについては、`pragma solidity 0.8.11`を使用している。

## Proxy

### UUPS方式を採用
JPYC v2はUUPS方式のupgrade proxy patternを採用している。採用した背景には以下の点がある。
- シンプルさ
- ガス代が安い
- upgradeabilityの柔軟性の高さ
- openzeppelin推奨

upgrade方式の選択にあたって[transparent方式、UUPS方式](https://docs.openzeppelin.com/contracts/4.x/api/proxy#transparent-vs-uups)またはEIP2535についての検討を実施した。


### UUPS Proxy Pattern
UUPS方式はopenzeppelin teamにも推奨されている理由として、多機能で軽量という特徴を持っている。
UUPS方式の構成
- Proxies
  
  UUPS proxiesはERC1967Proxyコントラクトを使っている。Proxy自体はアップグレード可能ではない。呼び出しをImplementation側へ転送（delegate）している
- Implementation
  
  UUPSのImplementationはUUPSUpgradeableコントラクトを継承し`upgradeTo`関数を持つ。そこでアップデートしたい時に、Implementationコントラクトから`upgradeTo`または`upgradeToAndCall`関数を呼び出してアップグレードする。

### UUPSコントラクトについて
OpenZeppelinの[UUPS upgradeable pattern](https://github.com/OpenZeppelin/openzeppelin-contracts/tree/master/contracts/proxy)を採用している。変更した点は`uint256[50] private _gap;`を追加している。これは将来的にコントラクトの更新（例：新しい状態変数の追加）がある場合のために用意している。


#### Proxy.sol
- `_fallback`関数：proxyへの呼び出しをimplementation側へ転送（delegate）する。`_implementation`関数は`virtual`修飾子がついているので、`ERC1967Proxy.sol`にてoverrideしている。

#### UUPSUpgradeable.sol
UUPS proxiesのメカニズムを構成する重要なコントラクトである。メインとなる`FiatTokenV1.sol`のコントラクトが`UUPSUpgradeable`コントラクトを継承することでJPYC v2はupgradeabilityを持てるようになる。

Note: `_authorize`関数に関してはoverrideしてあげる必要がある。Implementationのコントラクト`FiatTokenV1`においては以下のように修飾子`onlyOnwer`をつけることでonwerにのみアップグレード権限を与えている。

``` 
    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyOwner
    {}
```

#### ERC1967Upgrade.sol
[EIP1967](https://eips.ethereum.org/EIPS/eip-1967)から由来している。

#### ERC1967Proxy.sol
これはProxy contractの本体で、`_logic`、`_data`を引数にしてイニシャライズされる。
- `constructor()`
  - `_logic`: Implementationのcontract address
  - `_data`: `_logic` addressに向けてdelegatecallのdataとして`_data`を使って呼び出す。こうすることでproxyのイニシャライズをすることができる。
- `_implementation()`
  - 現在のimplementation contract addressを返す


## implementation
実際のJPYC v2 tokenのロジックが書かれているコントラクト
### explanation of implementation contract
- [centre-tokens](https://github.com/jcam1/JPYCv2/tree/japaneseReadme#:~:text=with%20reference%20to-,the%20centre%2Dtokens,-%2C%20Which%20is%20a)をフォークしている。実際にフォークした内容に関してはコントラクトに記載されている。
- コントラクトごとに`gap`を宣言している。
#### Ownable.sol
アクセス権限を管理するためのもの。OpenZeppelinのLibraryをフォークしている。変更点としては`renounceOwnership`関数を削除している。
#### Pausable.sol
コントラクトの停止措置を管理するためのもの。一時停止（Pause）する時に、JPYC tokenの一部の機能は制限されることになる。

#### Blocklistable.sol
コントラクトのブロックリスト機能を管理するためのもの。

#### Rescuable.sol
間違えて当該コントラクトへ送信してしまったtokenの救済をするためのもの。

#### EIP712Domain.sol
EIP712のDomain Separatorを保存している。Chain IDが異なる場合、再計算される。EIP3009やEIP2612はEIP712のDomainを必要とする。

https://github.com/ethereum/EIPs/blob/master/EIPS/eip-712.md

#### EIP2612.sol
署名による権限の移譲でファンジブルなトークンを送信することを可能にしたもの。コントラクトはv、rまたはsを使ってアドレスを復元させてアドレス所有者であることの確認を取っている。

- nouces
  - ユーザーごとに`nonce`がある。同じ`nonce`は一度しか使えない。nonceは順番に増える
  - `block.time`の確認をする
  - 復元アドレスはownerと同じであれば`_approve`をする

https://eips.ethereum.org/EIPS/eip-2612

#### EIP3009.sol
署名による権限の移譲でファンジブルなトークンを送信することを可能にしたもの。コントラクトはv、rまたはsを使ってアドレスを復元させてアドレス所有者であることの確認を取っている。

EIP2612との違いはnonceは順番に増えていく形式ではなくランダムに生成されるので、トランザクションが失敗する心配がなく複数の権限移譲が可能。

- `authorizationState`
  - ユーザーごとに`nonce`がある。同じ`nonce`は一度しか使えない
  - nonceはランダムに生成
- `_transferWithAuthorization`
- `_receiveWithAuthorization`
  - 宛先のアドレスは`msg.sender`でなければならない
- `_cancelAuthorization`
  - `nonce`を無効にする
- `_requireUnusedAuthorization`
  - `nonce`が使われたかをチェック
- `_requireValidAuthorization`
  - `block.time`をチェックする
- `_markAuthorizationAsUsed`
  - `nonce`を使用済みにしてeventを放出

https://eips.ethereum.org/EIPS/eip-3009



#### FiatTokenV1
JPYC v2のImplementation contract。
- 主なロジック（ERC20 tokenなど）が含まれている。
  - minterAdminのアクセス管理
  - `initialize`関数
    - `blocklisted[address(this)] = true`
    - `makeDomainSeparator(name, "1")`
    - `initialized = true`
  - `mint`, `burn`, `increaseAllowance`, `decreaseAllowance`関数
  - `_authorizeUpgrade`関数に`onlyOwner`修飾子をつけた

#### FiatTokenV2
- 仮説上JPYC v2をアップグレードさせる場合に使用されるImplementation contract。
- 仮設上の新規な機能`allowlist`を追加
- その他は`FiatTokenV1`と同じ

### Note
- `ERC1967Upgradeable`を使用しているが、部分的にしか使われていないので、その部分に関しては削除した。

## ロール
JPYC v2には新しい機能のPausability, Blocklistabilityが存在し、それらの機能を管理する権限をもつロールはPauser、Blocklisterという。JPYC社がそういった管理権限のロールを担っている。ロールがどのような場合にそういった機能を実行するかについて説明する。

### Pauser
- PauserはJPYC v2の一時停止機能をコントロールできる
- JPYCを利用する全てのユーザーが不利益を被る可能性が高いとJPYC社が判断した場合に、JPYCトークンの送受信、発行、approveなどの機能を停止する。
  - 例:JPYCの重要な機能を実行する権限のある秘密鍵が流出した場合
- JPYCのコントラクトに重大なバグが発見された場合

### Blocklister
- BlocklisterはJPYC v2のblocklist機能をコントロールできる
- JPYC社は現地の法律に従って犯罪に関与している可能性が高いとJPYC社が判断した場合あるいは政府機関から命令された場合に、当該ユーザーの保有するアドレスにおけるJPYCの送受信機能を停止する。
- アドレスをBlocklistから除外するどうかについて、JPYC社が判断を下した場合のみ可能。


## Contracts Address
- Contracts on Avalanche   
> Proxy
https://snowtrace.io/address/0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB#code

> Implementation
https://snowtrace.io/address/0xf2fab05f26dc8da5a3f24d015fb043db7a8751cf#code

> MinterAdmin
https://snowtrace.io/address/0xc6b1dc6c9ff85e968527f5c755fc07253a084247#code

## 📝 License
Copyright © 2022 [JPYC](https://jpyc.jp). <br />
This project is [MIT](https://github.com/jcam1/JPYCv2/blob/master/LICENSE) licensed.