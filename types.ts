export interface NFT {
    id: string;
    name: string;
    rarity: 'Common' | 'Rare' | 'Legendary' | 'Mythic';
    price: number;
    currency: string;
    image: string;
    type: 'Robot' | 'Cybernetic' | 'Weapon' | 'Augment';
    likes: number;
  }
  
  export interface NavItem {
    label: string;
    href: string;
  }
  
  export enum CollectionType {
    PHYSICAL = 'Physical Backed',
    ERC1155 = 'ERC1155 Collection',
    BOOSTER = 'Pack Series'
  }