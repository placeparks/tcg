import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

/* GET /api/packs/active → returns all active packs */
export async function GET() {
  try {
    const { data: packs, error } = await supabase
      .from('pack_collections')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching packs:', error);
      return NextResponse.json({ error: 'Failed to fetch packs' }, { status: 500 });
    }

    return NextResponse.json(packs || []);
  } catch (error) {
    console.error('Error in packs API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

