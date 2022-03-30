
# 日本円ステーブルコインJPYC
## 目的
現在はすでに運用されている日本円ステーブルコインJPYCが存在しており、便宜上我々は「JPYC v1」とよんでいる。JPYC v1はERC20トークンである。しかし、JPYC v1をスタートした当初からJPYCエコシステムが目覚ましい成長を遂げてきており、今後さらなる成長を目指すにはいくつかのキーとなる機能を備わっていない。例えば、スマートコントラクトをアップグレードできるUpgradeability機能、コントラクトを一時停止できるPausability機能、特定のアカウントをブラックリストできるblocklistability機能などが挙げられる。今回のJPYC v2の開発はそういった機能を付け加えるとともに、ガス代のオプティマイズをはかったのである。
## 概要
JPYC v2のことを一言でまとめる、**JPYC v2はERC20トークンであり、複数のエンティティによる通貨発行（Mint）ができたり、コントラクトの一時停止（Pause）ができたり、特定アカウントのブロックリスト化（blocklist）ができたり、トークンをレスキューすることができたり、バグの修正あるいは機能を追加するためにスマートコントラクトのアップグレードができたりするプロトコルとなっている**。

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
これはProxy contractの本体で、`_logic`、`_data`を引数にしてイニシャライズされる。


#### ERC1967Proxy.sol

## implementation

### explanation of implementation contract

#### Ownable.sol

#### Pausable.sol

#### Blocklistable.sol

#### Rescuable.sol

#### EIP712Domain.sol

#### EIP3009.sol

#### EIP2612.sol

#### FiatTokenV1

#### FiatTokenV2

### Note


## Contracts Address
- Contracts on Avalanche   
> Proxy
https://snowtrace.io/address/0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB#code
Implementation
https://snowtrace.io/address/0xf2fab05f26dc8da5a3f24d015fb043db7a8751cf#code
MinterAdmin
https://snowtrace.io/address/0xc6b1dc6c9ff85e968527f5c755fc07253a084247#code

## 📝 License
Copyright © 2022 [JPYC](https://jpyc.jp). <br />
This project is [MIT](https://github.com/jcam1/JPYCv2/blob/master/LICENSE) licensed.