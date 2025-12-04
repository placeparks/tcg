import { NextRequest, NextResponse } from "next/server";

// Check if message is related to TCG Meta or Cardify
function isRelevantQuestion(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  const keywords = [
    'tcg meta',
    'tcgmeta',
    'cardify',
    'cardify.club',
    'tcg',
    'trading card',
    'nft',
    'collection',
    'pack',
    'card',
    'mint',
    'marketplace',
    'dashboard',
    'ecosystem'
  ];
  
  return keywords.some(keyword => lowerMessage.includes(keyword));
}

// Generate a helpful response for TCG Meta/Cardify questions
function generateResponse(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  // Greeting responses
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
    return "Greetings, Collector! I'm here to help you with TCGMeta and Cardify.club. What would you like to know?";
  }
  
  // Questions about what it is
  if (lowerMessage.includes('what is') || lowerMessage.includes('what\'s') || lowerMessage.includes('tell me about')) {
    if (lowerMessage.includes('tcg meta') || lowerMessage.includes('tcgmeta')) {
      return "TCGMeta is a cutting-edge trading card game ecosystem built on blockchain technology. It combines traditional TCG gameplay with NFT ownership, allowing collectors to own, trade, and battle with unique digital cards.";
    }
    if (lowerMessage.includes('cardify') || lowerMessage.includes('cardify.club')) {
      return "Cardify.club is part of the TCGMeta ecosystem, providing a platform for card collection, trading, and marketplace activities. It's where collectors can discover, purchase, and manage their digital card collections.";
    }
    return "TCGMeta and Cardify.club form a comprehensive ecosystem for digital trading card games. TCGMeta is the main platform, while Cardify.club focuses on collection management and marketplace features.";
  }
  
  // Questions about how to use
  if (lowerMessage.includes('how') && (lowerMessage.includes('buy') || lowerMessage.includes('purchase') || lowerMessage.includes('get'))) {
    return "You can purchase cards and packs through the marketplace on Cardify.club. Navigate to the Buy section to browse available collections and packs. Connect your wallet to complete transactions.";
  }
  
  if (lowerMessage.includes('how') && (lowerMessage.includes('mint') || lowerMessage.includes('create'))) {
    return "To mint cards, you can use redemption codes in the Mint section, or purchase packs that contain random cards. Each pack opening reveals unique cards that are minted to your wallet.";
  }
  
  if (lowerMessage.includes('how') && (lowerMessage.includes('sell') || lowerMessage.includes('list'))) {
    return "To sell your cards, go to your Dashboard, select the card you want to list, and use the List feature. You can set your price and the card will appear in the marketplace for other collectors to purchase.";
  }
  
  // Questions about collections
  if (lowerMessage.includes('collection')) {
    return "Collections are curated sets of cards with unique themes and rarities. You can browse active collections, view card details, and add them to your collection through purchases or pack openings.";
  }
  
  // Questions about packs
  if (lowerMessage.includes('pack')) {
    return "Packs contain random cards from active collections. When you open a pack, you'll receive a selection of cards that are immediately minted to your wallet. Each pack opening is an exciting reveal!";
  }
  
  // Questions about dashboard
  if (lowerMessage.includes('dashboard')) {
    return "Your Dashboard is where you can view all your owned cards, manage your collection, list cards for sale, and track your trading activity. It's your personal command center for the TCGMeta ecosystem.";
  }
  
  // Default helpful response
  return "I can help you with questions about TCGMeta and Cardify.club, including how to buy cards, mint NFTs, manage collections, use the marketplace, and more. What specific topic would you like to explore?";
}

// Polite refusal message
function getRefusalMessage(): string {
  return "I apologize, but I'm specifically designed to assist with questions about TCGMeta and Cardify.club. I can help you with card collections, marketplace features, minting, trading, and other aspects of our ecosystem. Is there something about TCGMeta or Cardify.club I can help you with instead?";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages } = body;
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 }
      );
    }
    
    // Get the last user message
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== 'user') {
      return NextResponse.json(
        { error: "Last message must be from user" },
        { status: 400 }
      );
    }
    
    const userMessage = lastMessage.text || '';
    
    // Check if the question is relevant
    const isRelevant = isRelevantQuestion(userMessage);
    
    // Create a readable stream for SSE
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const responseText = isRelevant 
          ? generateResponse(userMessage)
          : getRefusalMessage();
        
        // Simulate streaming by sending the response in chunks
        const words = responseText.split(' ');
        for (let i = 0; i < words.length; i++) {
          const chunk = i === 0 ? words[i] : ' ' + words[i];
          const data = JSON.stringify({ text: chunk });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          
          // Small delay to simulate streaming
          await new Promise(resolve => setTimeout(resolve, 30));
        }
        
        controller.close();
      }
    });
    
    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
    
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

