
import type { Abi } from "viem";

export const CONTRACTS = {
  // factory:      process.env.NEXT_PUBLIC_FACTORY_ADDRESS_ERC721 as `0x${string}`, // ERC721 functionality commented out
  factoryERC1155: process.env.NEXT_PUBLIC_FACTORY_ADDRESS_ERC1155 as `0x${string}`,
  marketplace:  process.env.NEXT_PUBLIC_MARKEPLACE as `0x${string}`,
  singleFactory: process.env.NEXT_PUBLIC_SINGLE_NFT_FACTORY_ADDRESS as `0x${string}`,


  singleFactoryAbi: [
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "mp",
          "type": "address"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "inputs": [],
      "name": "FailedDeployment",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "balance",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "needed",
          "type": "uint256"
        }
      ],
      "name": "InsufficientBalance",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        }
      ],
      "name": "OwnableInvalidOwner",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "OwnableUnauthorizedAccount",
      "type": "error"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "creator",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "collection",
          "type": "address"
        }
      ],
      "name": "CollectionDeployed",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "marketplace",
          "type": "address"
        }
      ],
      "name": "MarketplaceSet",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "previousOwner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "OwnershipTransferred",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "allCollections",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "byCreator",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "user",
          "type": "address"
        }
      ],
      "name": "collectionsOf",
      "outputs": [
        {
          "internalType": "address[]",
          "name": "",
          "type": "address[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "name_",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "symbol_",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "baseURI_",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "maxSupply_",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "mintPrice_",
          "type": "uint256"
        },
        {
          "internalType": "uint96",
          "name": "royaltyBps_",
          "type": "uint96"
        },
        {
          "internalType": "address",
          "name": "royaltyReceiver_",
          "type": "address"
        }
      ],
      "name": "createCollection",
      "outputs": [
        {
          "internalType": "address",
          "name": "clone",
          "type": "address"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "implementation",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "col",
          "type": "address"
        }
      ],
      "name": "isCardifyCollection",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "marketplace",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "owner",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "renounceOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "mp",
          "type": "address"
        }
      ],
      "name": "setMarketplace",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "totalCollections",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "transferOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ] as const satisfies Abi,

  singleCollectionAbi: [
    {
      name: "mint",
      type: "function",
      stateMutability: "payable",
      inputs: [
        { name: "id", type: "uint256" },
        { name: "amount", type: "uint256" },
        { name: "data", type: "bytes" }
      ],
      outputs: [],
    },
    // ERC1155 and ERC2981 interface functions
    {
      name: "initialize",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [
        { name: "_name", type: "string" },
        { name: "_symbol", type: "string" },
        { name: "_baseURI", type: "string" },
        { name: "_owner", type: "address" },
        { name: "_maxSupply", type: "uint256" },
        { name: "_mintPrice", type: "uint256" },
        { name: "_royaltyReceiver", type: "address" },
        { name: "_royaltyBps", type: "uint96" }
      ],
      outputs: [],
    },
    {
      name: "mint",
      type: "function",
      stateMutability: "payable",
      inputs: [
        { name: "id", type: "uint256" },
        { name: "amount", type: "uint256" },
        { name: "data", type: "bytes" }
      ],
      outputs: [],
    },
    {
      name: "ownerMint",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [
        { name: "to", type: "address" },
        { name: "id", type: "uint256" },
        { name: "amount", type: "uint256" },
        { name: "data", type: "bytes" }
      ],
      outputs: [],
    },
    {
      name: "name",
      type: "function",
      stateMutability: "view",
      inputs: [],
      outputs: [{ type: "string" }],
    },
    {
      name: "symbol",
      type: "function",
      stateMutability: "view",
      inputs: [],
      outputs: [{ type: "string" }],
    },
    {
      name: "maxSupply",
      type: "function",
      stateMutability: "view",
      inputs: [],
      outputs: [{ type: "uint256" }],
    },
    {
      name: "mintPrice",
      type: "function",
      stateMutability: "view",
      inputs: [],
      outputs: [{ type: "uint256" }],
    },
    {
      name: "owner",
      type: "function",
      stateMutability: "view",
      inputs: [],
      outputs: [{ type: "address" }],
    },
    {
      name: "uri",
      type: "function",
      stateMutability: "view",
      inputs: [{ type: "uint256" }],
      outputs: [{ type: "string" }],
    },
    {
      name: "transferOwnership",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [{ name: "newOwner", type: "address" }],
      outputs: [],
    },
    {
      name: "supportsInterface",
      type: "function",
      stateMutability: "view",
      inputs: [{ name: "interfaceId", type: "bytes4" }],
      outputs: [{ type: "bool" }],
    }
  ] as const satisfies Abi,

  factoryAbi: [
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "mp",
          "type": "address"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        }
      ],
      "name": "OwnableInvalidOwner",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "OwnableUnauthorizedAccount",
      "type": "error"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "creator",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "collection",
          "type": "address"
        }
      ],
      "name": "CollectionDeployed",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "marketplace",
          "type": "address"
        }
      ],
      "name": "MarketplaceSet",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "previousOwner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "OwnershipTransferred",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "allCollections",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "byCreator",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "creator",
          "type": "address"
        }
      ],
      "name": "collectionsOf",
      "outputs": [
        {
          "internalType": "address[]",
          "name": "",
          "type": "address[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "baseUri",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "name_",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "symbol_",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "description",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "mintPrice",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "maxSupply",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "royaltyRecip",
          "type": "address"
        },
        {
          "internalType": "uint96",
          "name": "royaltyBps",
          "type": "uint96"
        }
      ],
      "name": "createCollection",
      "outputs": [
        {
          "internalType": "address",
          "name": "col",
          "type": "address"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "col",
          "type": "address"
        }
      ],
      "name": "isCardifyCollection",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "marketplace",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "owner",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "renounceOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "mp",
          "type": "address"
        }
      ],
      "name": "setMarketplace",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "totalCollections",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "transferOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ] as const satisfies Abi,

  factoryERC1155Abi: [
    {
      name: "getAllCollections",
      type: "function",
      stateMutability: "view",
      inputs: [],
      outputs: [{ type: "address[]" }],
    },
    {
      name: "getUserCollections",
      type: "function",
      stateMutability: "view",
      inputs: [{ type: "address" }],
      outputs: [{ type: "address[]" }],
    },
    {
      name: "totalCollections",
      type: "function",
      stateMutability: "view",
      inputs: [],
      outputs: [{ type: "uint256" }],
    },
    {
      name: "createCollection",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [
        { name: "baseUri", type: "string" },
        { name: "mintPrice", type: "uint256" },
        { name: "maxSupply", type: "uint256" },
        { name: "name_", type: "string" },
        { name: "symbol_", type: "string" },
        { name: "description", type: "string" },
        { name: "royaltyRecipient", type: "address" },
        { name: "royaltyBps", type: "uint96" },
      ],
      outputs: [{ name: "collection", type: "address" }],
    },
    {
      name: "isCardifyCollection",
      type: "function",
      stateMutability: "view",
      inputs: [{ type: "address" }],
      outputs: [{ type: "bool" }],
    },
    {
      name: "CollectionDeployed",
      type: "event",
      inputs: [
        { name: "creator", type: "address", indexed: true },
        { name: "collection", type: "address", indexed: false },
        { name: "mintPrice", type: "uint256", indexed: false },
        { name: "maxSupply", type: "uint256", indexed: false },
        { name: "name", type: "string", indexed: false },
        { name: "symbol", type: "string", indexed: false },
        { name: "royaltyRecipient", type: "address", indexed: false },
        { name: "royaltyBps", type: "uint96", indexed: false }
      ],
    },
  ] as const satisfies Abi,

  // ERC721 ABI commented out
  // nftAbi: [
  //   /* ─── basic reads ─── */
  //  { name: "ownerOf",           type: "function", stateMutability: "view", inputs: [{ type: "uint256" }], outputs: [{ type: "address" }] },

  //   { name: "tokenIdCounter", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  //   { name: "balanceOf",      type: "function", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
  //   { name: "name",           type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string"  }] },
  //       { name: "symbol",           type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string"  }] },

  //   { name: "tokenURI",       type: "function", stateMutability: "view", inputs: [{ type: "uint256" }], outputs: [{ type: "string"  }] },
  // {
  //   "name": "totalSupply",
  //   "type": "function",
  //   "stateMutability": "view",
  //   "inputs": [],
  //   "outputs": [{ "type": "uint256" }]
  // },
  // { name: "tokensOfOwner", type: "function", stateMutability: "view",
  //   inputs: [{ type: "address" }], outputs: [{ type: "uint256[]" }] },

  //   {
  //     name: "isApprovedForAll",
  //     type: "function",
  //     stateMutability: "view",
  //     inputs: [
  //       { name: "owner",    type: "address" },
  //       { name: "operator", type: "address" },
  //     ],
  //     outputs: [{ type: "bool" }],
  //   },

  //   {
  //     name: "setApprovalForAll",
  //     type: "function",
  //     stateMutability: "nonpayable",
  //     inputs: [
  //       { name: "operator", type: "address" },
  //       { name: "approved", type: "bool"    },
  //     ],
  //     outputs: [],
  //   },
  // ] as const satisfies Abi,

  nft1155Abi: [
    /* ─── ERC1155 standard functions ─── */
    { name: "balanceOf", type: "function", stateMutability: "view", 
      inputs: [{ type: "address" }, { type: "uint256" }], 
      outputs: [{ type: "uint256" }] },
    
    { name: "uri", type: "function", stateMutability: "view", 
      inputs: [{ type: "uint256" }], 
      outputs: [{ type: "string" }] },
    
    { name: "totalMinted", type: "function", stateMutability: "view", 
      inputs: [], 
      outputs: [{ type: "uint256" }] },
    
    { name: "name", type: "function", stateMutability: "view", 
      inputs: [], 
      outputs: [{ type: "string" }] },
    
    { name: "symbol", type: "function", stateMutability: "view", 
      inputs: [], 
      outputs: [{ type: "string" }] },
    
    { name: "description", type: "function", stateMutability: "view", 
      inputs: [], 
      outputs: [{ type: "string" }] },
    
    { name: "baseUri", type: "function", stateMutability: "view", 
      inputs: [], 
      outputs: [{ type: "string" }] },
    
    { name: "mintPrice", type: "function", stateMutability: "view", 
      inputs: [], 
      outputs: [{ type: "uint256" }] },
    
    { name: "maxSupply", type: "function", stateMutability: "view", 
      inputs: [], 
      outputs: [{ type: "uint256" }] },
    
    { name: "validCodes", type: "function", stateMutability: "view", 
      inputs: [{ type: "bytes32" }], 
      outputs: [{ type: "bool" }] },
    
    { name: "usedCodes", type: "function", stateMutability: "view", 
      inputs: [{ type: "bytes32" }], 
      outputs: [{ type: "bool" }] },
    
    { name: "redeemWithCode", type: "function", stateMutability: "payable", 
      inputs: [{ type: "string" }], 
      outputs: [] },
    
    { name: "isApprovedForAll", type: "function", stateMutability: "view",
      inputs: [
        { name: "owner", type: "address" },
        { name: "operator", type: "address" },
      ],
      outputs: [{ type: "bool" }] },
    
    { name: "setApprovalForAll", type: "function", stateMutability: "nonpayable",
      inputs: [
        { name: "operator", type: "address" },
        { name: "approved", type: "bool" },
      ],
      outputs: [] },
    
    /* ─── ERC1155 transfer functions ─── */
    { name: "safeTransferFrom", type: "function", stateMutability: "nonpayable",
      inputs: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "id", type: "uint256" },
        { name: "amount", type: "uint256" },
        { name: "data", type: "bytes" }
      ],
      outputs: [] },
    
    { name: "safeBatchTransferFrom", type: "function", stateMutability: "nonpayable",
      inputs: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "ids", type: "uint256[]" },
        { name: "amounts", type: "uint256[]" },
        { name: "data", type: "bytes" }
      ],
      outputs: [] },
    
    /* ─── ERC1155 interface support ─── */
    { name: "supportsInterface", type: "function", stateMutability: "view",
      inputs: [{ name: "interfaceId", type: "bytes4" }],
      outputs: [{ type: "bool" }] },
  ] as const satisfies Abi,

  marketplaceAbi:[
    {
      "inputs": [
        {
          "internalType": "uint96",
          "name": "feeBps_",
          "type": "uint96"
        },
        {
          "internalType": "address",
          "name": "feeRecip_",
          "type": "address"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        }
      ],
      "name": "OwnableInvalidOwner",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "OwnableUnauthorizedAccount",
      "type": "error"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "nft",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "id",
          "type": "uint256"
        }
      ],
      "name": "Cancelled1155",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "nft",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "id",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "seller",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint96",
          "name": "price",
          "type": "uint96"
        }
      ],
      "name": "Listed1155",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "previousOwner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "OwnershipTransferred",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "Paused",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "nft",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "id",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "buyer",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint96",
          "name": "amount",
          "type": "uint96"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "total",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "roy",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "fee",
          "type": "uint256"
        }
      ],
      "name": "Sold1155",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "Unpaused",
      "type": "event"
    },
    {
      "inputs": [],
      "name": "FEE_DENOM",
      "outputs": [
        {
          "internalType": "uint96",
          "name": "",
          "type": "uint96"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "MAX_FEE",
      "outputs": [
        {
          "internalType": "uint96",
          "name": "",
          "type": "uint96"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "f",
          "type": "address"
        }
      ],
      "name": "addFactory1155",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "nft",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "id",
          "type": "uint256"
        },
        {
          "internalType": "uint96",
          "name": "amount",
          "type": "uint96"
        }
      ],
      "name": "buy1155",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "nft",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "id",
          "type": "uint256"
        }
      ],
      "name": "cancelListing1155",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "factories1155",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "factory721",
      "outputs": [
        {
          "internalType": "contract ICardifyNFTFactory721",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "feeBps",
      "outputs": [
        {
          "internalType": "uint96",
          "name": "",
          "type": "uint96"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "feeRecipient",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "isFactory1155",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "nft",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "id",
          "type": "uint256"
        },
        {
          "internalType": "uint96",
          "name": "price",
          "type": "uint96"
        }
      ],
      "name": "listItem1155",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "listings1155",
      "outputs": [
        {
          "internalType": "address",
          "name": "seller",
          "type": "address"
        },
        {
          "internalType": "uint96",
          "name": "unitPrice",
          "type": "uint96"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "listings721",
      "outputs": [
        {
          "internalType": "address",
          "name": "seller",
          "type": "address"
        },
        {
          "internalType": "uint96",
          "name": "price",
          "type": "uint96"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "owner",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "paused",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "renounceOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint96",
          "name": "b",
          "type": "uint96"
        }
      ],
      "name": "setFeeBps",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "transferOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "stateMutability": "payable",
      "type": "receive"
    }
  ] as const satisfies Abi,


    /* ─── helpers ─── */
  imageGateway: (collection: string, id: bigint | number) =>
    `https://gateway.pinata.cloud/ipfs/${collection}_${id}.png`,

  collectionPreview: (_collection: string) => "/cardifyN.png",

} as const;       

