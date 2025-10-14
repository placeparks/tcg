import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

/* GET /api/collections/active?code=XXX → { address, cid, collection_type } | 404 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'code parameter required' }, { status: 400 });
  }

  // First, find the collection code in the collection_codes table
  const { data: collectionCode, error: codeError } = await supabase
    .from('collection_codes')
    .select('collection_address, used')
    .eq('code', code)
    .single();

  if (codeError || !collectionCode) {
    return NextResponse.json({ error: 'code not found' }, { status: 404 });
  }

  // Check if the code has already been used
  if (collectionCode.used) {
    return NextResponse.json({ error: 'code already used' }, { status: 400 });
  }

  // Get the collection details from the collections table
  const { data: collection, error: collectionError } = await supabase
    .from('collections')
    .select('address, cid, collection_type')
    .eq('address', collectionCode.collection_address)
    .eq('active', true)
    .single();

  if (collectionError || !collection) {
    return NextResponse.json({ error: 'collection not found or not active' }, { status: 404 });
  }

  return NextResponse.json({
    address: collection.address,
    cid: collection.cid,
    collection_type: collection.collection_type,
  });
}
