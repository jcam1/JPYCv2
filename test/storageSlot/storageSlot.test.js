const {
  usesOriginalStorageSlotPositions,
} = require('./storageSlots.behavior')

contract('FiatTokenV1', (accounts) => {
  usesOriginalStorageSlotPositions({ version: 1, accounts })
})

contract('FiatTokenV2', (accounts) => {
  usesOriginalStorageSlotPositions({ version: 2, accounts })
})
