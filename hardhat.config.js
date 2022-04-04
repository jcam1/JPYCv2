/**
 * @type import('hardhat/config').HardhatUserConfig
 */

require('@nomiclabs/hardhat-truffle5')
// require("@nomiclabs/hardhat-waffle")
require('@openzeppelin/hardhat-upgrades')
require('hardhat-contract-sizer')
require('solidity-coverage')
require('dotenv').config()

module.exports = {
  solidity: {
    version: '0.8.11',
    settings: {
      optimizer: {
        enabled: true,
        runs: 3000,
      },
    },
  },

  networks: {
    hardhat: {
      chainId: 1337,
      allowUnlimitedContractSize: false,
    },
    rinkeby: {
      url: process.env.INFRA_API_KEY,
      accounts: [process.env.PRIVATE_KEY],
    },
  },
}
