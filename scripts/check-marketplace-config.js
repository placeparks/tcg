// Script to check marketplace configuration and provide fix instructions
// Run this with: node scripts/check-marketplace-config.js

import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

// Configuration
const MARKETPLACE_ADDRESS = '0xD0761A7974bf13757751C4171295265E0BE7648c';
const YOUR_ERC1155_FACTORY = '0x8d10142C9e328828c4195D6E66d3cdA4ff0211f4';
const YOUR_SINGLE_FACTORY = '0x6884AB1fdcdE1B9B04b33DeE059e1f5f40380Afe';
const PROBLEM_NFT = '0xa18b1901AFF1F68B6F38A3679F26d624eFC50Ae6';

// Marketplace ABI for reading factory addresses
const marketplaceAbi = [
  {
    "inputs": [],
    "name": "factory1155A",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "factory1155B", 
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "nft", "type": "address"}],
    "name": "isCardify1155",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  }
];

async function checkMarketplaceConfig() {
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http()
  });

  console.log('🔍 Checking marketplace configuration...\n');

  try {
    // Read current factory configuration
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

    console.log('📋 Current Marketplace Configuration:');
    console.log(`   Factory A: ${factoryA}`);
    console.log(`   Factory B: ${factoryB}\n`);

    console.log('📋 Your Dashboard Configuration:');
    console.log(`   ERC1155 Factory: ${YOUR_ERC1155_FACTORY}`);
    console.log(`   Single Factory:  ${YOUR_SINGLE_FACTORY}\n`);

    // Check if configurations match
    const factoryAMatches = factoryA.toLowerCase() === YOUR_ERC1155_FACTORY.toLowerCase();
    const factoryBMatches = factoryB.toLowerCase() === YOUR_SINGLE_FACTORY.toLowerCase();
    
    console.log('🔍 Configuration Analysis:');
    console.log(`   Factory A matches: ${factoryAMatches}`);
    console.log(`   Factory B matches: ${factoryBMatches}\n`);

    if (!factoryAMatches || !factoryBMatches) {
      console.log('❌ MISMATCH DETECTED!');
      console.log('   The marketplace is configured with different factory addresses than your dashboard.\n');
      
      console.log('🔧 SOLUTION:');
      console.log('   1. You need to update the marketplace factory configuration');
      console.log('   2. Call the marketplace\'s setFactories1155() function with:');
      console.log(`      - Factory A: ${YOUR_ERC1155_FACTORY}`);
      console.log(`      - Factory B: ${YOUR_SINGLE_FACTORY}\n`);
      
      console.log('📝 To fix this, you can:');
      console.log('   1. Use the update-marketplace-factories.js script');
      console.log('   2. Or call setFactories1155() directly from your wallet');
      console.log('   3. Or ask the marketplace owner to update the configuration\n');
    } else {
      console.log('✅ Configuration matches! The issue might be elsewhere.\n');
    }

    // Test if the problem NFT is recognized
    console.log('🧪 Testing NFT Recognition:');
    const isRecognized = await publicClient.readContract({
      address: MARKETPLACE_ADDRESS,
      abi: marketplaceAbi,
      functionName: 'isCardify1155',
      args: [PROBLEM_NFT]
    });
    
    console.log(`   NFT ${PROBLEM_NFT} is recognized: ${isRecognized}`);
    
    if (!isRecognized) {
      console.log('\n❌ The NFT is not recognized by the marketplace.');
      console.log('   This confirms the factory configuration issue.\n');
    } else {
      console.log('\n✅ The NFT is recognized by the marketplace.');
      console.log('   The issue might be something else.\n');
    }

  } catch (error) {
    console.error('❌ Error checking marketplace configuration:', error);
  }
}

checkMarketplaceConfig().catch(console.error);
