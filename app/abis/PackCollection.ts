export const PACK_COLLECTION_ABI = [
  { "type": "function", "name": "mintPacks", "stateMutability": "payable", "inputs": [{ "name": "amount", "type": "uint256" }], "outputs": [] },
  { "type": "function", "name": "openPack", "stateMutability": "nonpayable", "inputs": [{ "name": "amount", "type": "uint256" }], "outputs": [] },
  { "type": "function", "name": "uri", "stateMutability": "view", "inputs": [{ "name": "id", "type": "uint256" }], "outputs": [{ "type": "string" }] },
  { "type": "function", "name": "balanceOf", "stateMutability": "view", "inputs": [{ "name": "account", "type": "address" }, { "name": "id", "type": "uint256" }], "outputs": [{ "type": "uint256" }] },
  { "type": "function", "name": "packPrice", "stateMutability": "view", "inputs": [], "outputs": [{ "type": "uint256" }] },
  { "type": "function", "name": "maxPacks", "stateMutability": "view", "inputs": [], "outputs": [{ "type": "uint256" }] },
  { "type": "function", "name": "packsMinted", "stateMutability": "view", "inputs": [], "outputs": [{ "type": "uint256" }] },
  { "type": "function", "name": "name", "stateMutability": "view", "inputs": [], "outputs": [{ "type": "string" }] },
  { "type": "function", "name": "symbol", "stateMutability": "view", "inputs": [], "outputs": [{ "type": "string" }] },
  { "type": "function", "name": "packTokenId", "stateMutability": "pure", "inputs": [], "outputs": [{ "type": "uint256" }] },
  { "type": "function", "name": "cardTokenIds", "stateMutability": "pure", "inputs": [], "outputs": [{ "type": "uint256[5]" }] },
  { "type": "function", "name": "getAllTokenURIs", "stateMutability": "view", "inputs": [], "outputs": [{ "type": "string[6]" }] },
  { "type": "function", "name": "packsRemaining", "stateMutability": "view", "inputs": [], "outputs": [{ "type": "uint256" }] },
  { "type": "function", "name": "owner", "stateMutability": "view", "inputs": [], "outputs": [{ "type": "address" }] },
  { "type": "function", "name": "marketplace", "stateMutability": "view", "inputs": [], "outputs": [{ "type": "address" }] },
  // Optional admin functions (for creator dashboards)
  { "type": "function", "name": "setTokenURI", "stateMutability": "nonpayable", "inputs": [{ "name": "id", "type": "uint256" }, { "name": "newURI", "type": "string" }], "outputs": [] },
  { "type": "function", "name": "freezeMetadata", "stateMutability": "nonpayable", "inputs": [], "outputs": [] },
  { "type": "function", "name": "setMarketplace", "stateMutability": "nonpayable", "inputs": [{ "name": "mp", "type": "address" }], "outputs": [] },
  { "type": "function", "name": "pause", "stateMutability": "nonpayable", "inputs": [], "outputs": [] },
  { "type": "function", "name": "unpause", "stateMutability": "nonpayable", "inputs": [], "outputs": [] }
] as const
