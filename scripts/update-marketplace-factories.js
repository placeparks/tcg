// Script to update marketplace factory configuration
// Run this with: node scripts/update-marketplace-factories.js

import { createPublicClient, createWalletClient, http, parseEther } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// Configuration - UPDATE THESE VALUES
const MARKETPLACE_ADDRESS = '0xD0761A7974bf13757751C4171295265E0BE7648c'; // Your marketplace address
const FACTORY_A = '0x8d10142C9e328828c4195D6E66d3cdA4ff0211f4'; // Your ERC1155 factory
const FACTORY_B = '0x6884AB1fdcdE1B9B04b33DeE059e1f5f40380Afe'; // Your Single factory
const PRIVATE_KEY = process.env.PRIVATE_KEY; // Your private key (marketplace owner)

// Marketplace ABI (just the setFactories1155 function)
const marketplaceAbi = [
  {
    "inputs": [
      {"internalType": "address", "name": "a", "type": "address"},
      {"internalType": "address", "name": "b", "type": "address"}
    ],
    "name": "setFactories1155",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

async function updateMarketplaceFactories() {
  if (!PRIVATE_KEY) {
    throw new Error('Please set PRIVATE_KEY environment variable');
  }

  const account = privateKeyToAccount(PRIVATE_KEY);
  
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http()
  });

  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http()
  });

  console.log('🔍 Current marketplace configuration:');
  
  // Check current factory configuration
  try {
    const factoryA = await publicClient.readContract({
      address: MARKETPLACE_ADDRESS,
      abi: marketplaceAbi,
      functionName: 'factory1155A'
    });
    const factoryB = await publicClient.readContract({
      address: MARKETPLACE_ADDRESS,
      abi: marketplaceAbi,
      functionName: 'factory1155B'
    });
    
    console.log('Current Factory A:', factoryA);
    console.log('Current Factory B:', factoryB);
    console.log('Desired Factory A:', FACTORY_A);
    console.log('Desired Factory B:', FACTORY_B);
  } catch (error) {
    console.log('Could not read current factory configuration:', error.message);
  }

  console.log('🔄 Updating marketplace factories...');
  
  try {
    const hash = await walletClient.writeContract({
      address: MARKETPLACE_ADDRESS,
      abi: marketplaceAbi,
      functionName: 'setFactories1155',
      args: [FACTORY_A, FACTORY_B]
    });

    console.log('✅ Transaction submitted:', hash);
    
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    
    if (receipt.status === 'success') {
      console.log('✅ Marketplace factories updated successfully!');
      console.log('New Factory A:', FACTORY_A);
      console.log('New Factory B:', FACTORY_B);
    } else {
      console.log('❌ Transaction failed');
    }
  } catch (error) {
    console.error('❌ Failed to update marketplace factories:', error);
  }
}

updateMarketplaceFactories().catch(console.error);
