// web3.jsの場合でも試してみる

const _data = (newMinterAdmin, newPauser, newBlocklister, newRescuer, newOwner) => web3.eth.abi.encodeFunctionCall(
  {
    name: 'initialize',
    type: 'function',
    inputs: [
      {
        type: 'string',
        name: 'tokenName',
      },
      {
        type: 'string',
        name: 'tokenSymbol',
      },
      {
        type: 'string',
        name: 'tokenCurrency',
      },
      {
        type: 'uint8',
        name: 'tokenName',
      },
      {
        type: 'address',
        name: 'newMinterAdmin',
      },
      {
        type: 'address',
        name: 'newPauser',
      },
      {
        type: 'address',
        name: 'newBlocklister',
      },
      {
        type: 'address',
        name: 'newRescuer',
      },
      {
        type: 'address',
        name: 'newOwner',
      },
    ],
  },
  [
    'JPY Coin',
    'JPYC',
    'JPY',
    18,
    newMinterAdmin,
    newPauser,
    newBlocklister,
    newRescuer,
    newOwner,
  ]
)
// console.log('data by encode: ', data)

// console.log(
//   'data by sha3: ',
//   web3.utils
//     .sha3(
//       'initialize(string,string,string,uint8,address,address,address,address)'
//     )
//     .substring(0, 10)
// )
const _dataV2 = web3.eth.abi.encodeFunctionSignature("initializeV2()")

module.exports = {
  _data,
  _dataV2
}
