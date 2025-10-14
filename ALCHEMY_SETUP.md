# Alchemy NFT API Integration

This project now uses Alchemy's NFT API for reliable metadata fetching, eliminating the 429 rate limiting issues from direct IPFS gateway calls.

## Setup
export PATH="/home/kainat/.daml/bin:$PATH"

1. **Get a free Alchemy API key:**
   - Visit [https://www.alchemy.com/](https://www.alchemy.com/)
   - Sign up for a free account
   - Create a new app for Base network
   - Copy your API key

2. **Add to environment variables:**
   ```bash
   # Add to your .env.local file
   NEXT_PUBLIC_ALCHEMY_KEY=your_alchemy_api_key_here
   ```

3. **Restart your development server:**
   ```bash
   npm run dev
   ```

## How it works

### Primary: Alchemy API
- Fetches NFT metadata directly from Alchemy's cached database
- No rate limits (within your plan)
- Handles IPFS resolution automatically
- Returns consistent, normalized data

### Fallback: IPFS Proxy
- If Alchemy fails, falls back to our `/api/ipfs-proxy/[cid]` route
- Tries multiple IPFS gateways server-side
- Caches responses for 1 hour
- No client-side rate limiting

### Benefits
- ✅ **No more 429 errors** - Alchemy handles rate limiting
- ✅ **Faster loading** - Cached metadata from Alchemy
- ✅ **Better reliability** - Multiple fallback strategies
- ✅ **Consistent data** - Normalized metadata format
- ✅ **Cost effective** - Free tier covers most use cases

## API Usage

The integration automatically:
1. Tries Alchemy API first for each NFT
2. Falls back to IPFS proxy if Alchemy fails
3. Caches successful results for 5 minutes
4. Handles both JSON metadata and direct image files

No code changes needed - the NFTCard component now uses this automatically!
