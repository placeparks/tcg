export const PACK_FACTORY_ABI = [
  {
    "type": "function",
    "name": "createCollection",
    "stateMutability": "nonpayable",
    "inputs": [
      {
        "name": "p",
        "type": "tuple",
        "components": [
          { "name": "name", "type": "string" },
          { "name": "symbol", "type": "string" },
          { "name": "owner", "type": "address" },
          { "name": "tokenURIs", "type": "string[6]" },
          { "name": "packPrice", "type": "uint256" },
          { "name": "maxPacks", "type": "uint256" },
          { "name": "royaltyBps", "type": "uint96" },
          { "name": "royaltyReceiver", "type": "address" },
          { "name": "marketplace", "type": "address" },
          { "name": "initialMintTo", "type": "address" },
          { "name": "initialMintAmount", "type": "uint256" }
        ]
      }
    ],
    "outputs": [{ "name": "col", "type": "address" }]
  },
  {
    "type": "function",
    "name": "setDefaults",
    "stateMutability": "nonpayable",
    "inputs": [
      { "name": "_feeReceiver", "type": "address" },
      { "name": "_feeBps", "type": "uint96" },
      { "name": "_marketplace", "type": "address" }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "registerExistingCollection",
    "stateMutability": "nonpayable",
    "inputs": [
      { "name": "collection", "type": "address" },
      { "name": "ownerHint", "type": "address" }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "isCardifyCollection",
    "stateMutability": "view",
    "inputs": [{ "name": "col", "type": "address" }],
    "outputs": [{ "type": "bool" }]
  },
  {
    "type": "function",
    "name": "totalCollections",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [{ "type": "uint256" }]
  },
  {
    "type": "function",
    "name": "allCollections",
    "stateMutability": "view",
    "inputs": [{ "name": "index", "type": "uint256" }],
    "outputs": [{ "type": "address" }]
  },
  {
    "type": "function",
    "name": "collectionsOf",
    "stateMutability": "view",
    "inputs": [{ "name": "user", "type": "address" }],
    "outputs": [{ "type": "address[]" }]
  },
  {
    "type": "event",
    "name": "CollectionCreated",
    "inputs": [
      { "name": "creator", "type": "address", "indexed": true },
      { "name": "collection", "type": "address", "indexed": true },
      { "name": "owner", "type": "address", "indexed": true }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "CollectionRegistered",
    "inputs": [
      { "name": "collection", "type": "address", "indexed": true },
      { "name": "owner", "type": "address", "indexed": true }
    ],
    "anonymous": false
  }
] as const
