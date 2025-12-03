import { supabase } from './supabaseAdmin';

export interface Profile {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    email: string;
}

export interface PackCollection {
    id: number;
    collection_address: string;
    name: string;
    description: string;
    pack_image_uri: string;
    pack_price_wei: string;
    active: boolean;
    user_id: string;
    deployer?: Profile;
    type: 'pack';
}

export interface Collection {
    address: string;
    name: string;
    description: string;
    image_uri: string;
    owner: string;
    active: boolean;
    deployer?: Profile;
    type: 'collection';
}

export interface NFTCollection {
    id: number;
    collection_address: string;
    name: string;
    description: string;
    image_uri: string;
    user_id: string;
    active: boolean;
    deployer?: Profile;
    type: 'nft';
}

export type MarketplaceItem = PackCollection | Collection | NFTCollection;

export async function getTrendingCollections(): Promise<MarketplaceItem[]> {
    // Fetch from all 3 tables
    const { data: packs } = await supabase
        .from('pack_collection')
        .select('*, profiles:user_id(display_name, avatar_url)')
        .eq('active', true)
        .limit(4);

    const { data: collections } = await supabase
        .from('collections')
        .select('*, profiles:owner(display_name, avatar_url)')
        .eq('active', true)
        .limit(4);

    const { data: nfts } = await supabase
        .from('nft_collection')
        .select('*, profiles:user_id(display_name, avatar_url)')
        .eq('active', true)
        .limit(4);

    // Map and combine
    const formattedPacks: PackCollection[] = (packs || []).map((p: any) => ({
        ...p,
        type: 'pack',
        deployer: p.profiles
    }));

    const formattedCollections: Collection[] = (collections || []).map((c: any) => ({
        ...c,
        type: 'collection',
        deployer: c.profiles
    }));

    const formattedNFTs: NFTCollection[] = (nfts || []).map((n: any) => ({
        ...n,
        type: 'nft',
        deployer: n.profiles
    }));

    // Combine and shuffle/sort (for now just returning a mix)
    return [...formattedPacks, ...formattedCollections, ...formattedNFTs].slice(0, 8);
}

export async function getLatestDrops() {
    // Similar logic but ordered by created_at
    const { data: packs } = await supabase
        .from('pack_collection')
        .select('*, profiles:user_id(display_name, avatar_url)')
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(3);

    return (packs || []).map((p: any) => ({
        ...p,
        type: 'pack',
        deployer: p.profiles
    }));
}
