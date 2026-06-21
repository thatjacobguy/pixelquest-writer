import type { CharacterStats } from '../App';
import { sound } from '../utils/audio';
import { ArrowLeft, ShoppingBag } from 'lucide-react';

export interface ShopItem {
  id: string;
  name: string;
  price: number;
  description: string;
  icon: string;
  effect: string;
  levelRequired?: number;
}

export const FANTASY_SHOP_ITEMS: ShopItem[] = [
  {
    id: 'lucky_charm',
    name: 'Lucky Charm',
    price: 300,
    description: 'An ancient relic that guides your thoughts. Increases XP rewards by 15%.',
    icon: '🧿',
    effect: '+15% XP Gain',
    levelRequired: 1,
  },
  {
    id: 'golden_quill',
    name: 'Golden Quill',
    price: 600,
    description: 'A magical quill that draws gold from inspiration. Increases Gold rewards by 20%.',
    icon: '✒️',
    effect: '+20% Gold Gain',
    levelRequired: 3,
  },
  {
    id: 'epic_sword',
    name: 'Master Sword',
    price: 1000,
    description: 'A legendary sword of pure light. Deals +25% damage to fantasy beasts.',
    icon: '🗡️',
    effect: '+25% Combat Damage',
    levelRequired: 5,
  },
  {
    id: 'wizard_robe',
    name: "Wizard's Robe",
    price: 1600,
    description: 'Robes that ward off distraction. Deals +30% damage and +20% critical hit chance.',
    icon: '🧙‍♂️',
    effect: '+30% Damage & +20% Crit',
    levelRequired: 8,
  },
  {
    id: 'scribe_crown',
    name: "Scribe's Crown",
    price: 4500,
    description: 'Crown of the Master Scribe. Wear it to deal +50% ultimate combat damage.',
    icon: '👑',
    effect: '+50% Ultimate Damage',
    levelRequired: 12,
  },
];

export const COZY_SHOP_ITEMS: ShopItem[] = [
  {
    id: 'warm_blanket',
    name: 'Warm Blanket',
    price: 300,
    description: 'A plush wool blanket to keep you warm. Increases XP rewards by 15%.',
    icon: '🧣',
    effect: '+15% XP Gain',
    levelRequired: 1,
  },
  {
    id: 'sweet_biscuit',
    name: 'Sweet Biscuit',
    price: 600,
    description: 'Freshly baked sugar biscuit. Increases Gold rewards by 20%.',
    icon: '🍪',
    effect: '+20% Gold Gain',
    levelRequired: 3,
  },
  {
    id: 'cozy_mug',
    name: 'Cozy Coffee Mug',
    price: 1000,
    description: 'A steaming mug of brew. Relieves writer block. Deals +25% comfort writing damage.',
    icon: '☕',
    effect: '+25% Comfort Damage',
    levelRequired: 5,
  },
  {
    id: 'knitted_sweater',
    name: 'Chunky Sweater',
    price: 1600,
    description: 'A hand-knitted sweater. Deals +30% relaxation damage and +20% critical hit chance.',
    icon: '🧶',
    effect: '+30% Damage & +20% Crit',
    levelRequired: 8,
  },
  {
    id: 'grandfather_clock',
    name: 'Grandfather Clock',
    price: 4500,
    description: 'Cherrywood grandfather clock. Deals +50% ultimate cozy nostalgia damage.',
    icon: '🕰️',
    effect: '+50% Ultimate Damage',
    levelRequired: 12,
  },
];

export const GOTHIC_SHOP_ITEMS: ShopItem[] = [
  {
    id: 'amulet_protection',
    name: 'Amulet of Protection',
    price: 300,
    description: 'Wards off the dark spirits of the castle. Increases XP rewards by 15%.',
    icon: '📿',
    effect: '+15% XP Gain',
    levelRequired: 1,
  },
  {
    id: 'crypt_key',
    name: 'Crypt Key',
    price: 600,
    description: 'Unlocks ancient hidden coffers. Increases Gold rewards by 20%.',
    icon: '🔑',
    effect: '+20% Gold Gain',
    levelRequired: 3,
  },
  {
    id: 'silver_dagger',
    name: 'Silver Dagger',
    price: 1000,
    description: 'A blessed silver blade. Deals +25% banishing damage to crypt shadows.',
    icon: '🗡️',
    effect: '+25% Banishing Damage',
    levelRequired: 5,
  },
  {
    id: 'plague_mask',
    name: 'Plague Doctor Mask',
    price: 1600,
    description: 'Wards off dark vapors. Deals +30% shadow damage and +20% critical hit chance.',
    icon: '🎭',
    effect: '+30% Damage & +20% Crit',
    levelRequired: 8,
  },
  {
    id: 'vampire_cape',
    name: 'Vampire Lord Cape',
    price: 4500,
    description: 'Cape brimming with nocturnal power. Deals +50% ultimate gothic damage.',
    icon: '🧛',
    effect: '+50% Ultimate Damage',
    levelRequired: 12,
  },
];

export const SPACESHIP_SHOP_ITEMS: ShopItem[] = [
  {
    id: 'navigation_chip',
    name: 'Navigation Chip',
    price: 300,
    description: 'Calibrates autopilot route coordinates. Increases XP rewards by 15%.',
    icon: '💾',
    effect: '+15% XP Gain',
    levelRequired: 1,
  },
  {
    id: 'plasma_core',
    name: 'Plasma Core',
    price: 600,
    description: 'Overcharges reactor grids for extraction. Increases Gold rewards by 20%.',
    icon: '🔋',
    effect: '+20% Gold Gain',
    levelRequired: 3,
  },
  {
    id: 'laser_blaster',
    name: 'Laser Blaster',
    price: 1000,
    description: ' photon blaster. Deals +25% photon damage to clear cosmic debris.',
    icon: '🔫',
    effect: '+25% Photon Damage',
    levelRequired: 5,
  },
  {
    id: 'force_shield',
    name: 'Deflector Shield',
    price: 1600,
    description: 'Deflects mental asteroids. Deals +30% damage and +20% critical hit chance.',
    icon: '🛡️',
    effect: '+30% Damage & +20% Crit',
    levelRequired: 8,
  },
  {
    id: 'gravity_engine',
    name: 'Warp Gravity Engine',
    price: 4500,
    description: 'Folds spacetime. Deals +50% ultimate warp combat damage.',
    icon: '🌀',
    effect: '+50% Ultimate Damage',
    levelRequired: 12,
  },
];

export const WITCH_SHOP_ITEMS: ShopItem[] = [
  {
    id: 'black_candle',
    name: 'Black Candle',
    price: 300,
    description: 'A ritual candle to focus your witchcraft. Increases XP rewards by 15%.',
    icon: '🕯️',
    effect: '+15% XP Gain',
    levelRequired: 1,
  },
  {
    id: 'crystal_ball',
    name: 'Crystal Ball',
    price: 600,
    description: 'A scrying sphere to forecast fortunes. Increases Gold rewards by 20%.',
    icon: '🔮',
    effect: '+20% Gold Gain',
    levelRequired: 3,
  },
  {
    id: 'witch_broom',
    name: 'Flying Broomstick',
    price: 1000,
    description: 'A sweeping birch broom infused with flight. Deals +25% hex damage to bog monsters.',
    icon: '🧹',
    effect: '+25% Hex Damage',
    levelRequired: 5,
  },
  {
    id: 'witches_brew',
    name: 'Witches Brew',
    price: 1600,
    description: 'A bubbling cauldron concoction of swamp herbs. Deals +30% spell damage and +20% critical hit chance.',
    icon: '🧪',
    effect: '+30% Damage & +20% Crit',
    levelRequired: 8,
  },
  {
    id: 'dark_grimoire',
    name: 'Dark Grimoire',
    price: 4500,
    description: 'The ultimate book of swamp hexes and elder spells. Deals +50% ultimate grimoire damage.',
    icon: '📓',
    effect: '+50% Ultimate Damage',
    levelRequired: 12,
  },
];

// Helper to get shop items by theme
export const getShopItemsByTheme = (theme: string): ShopItem[] => {
  switch (theme) {
    case 'cozy':
      return COZY_SHOP_ITEMS;
    case 'horror':
      return GOTHIC_SHOP_ITEMS;
    case 'spaceship':
      return SPACESHIP_SHOP_ITEMS;
    case 'witch':
      return WITCH_SHOP_ITEMS;
    case 'fantasy':
    default:
      return FANTASY_SHOP_ITEMS;
  }
};

interface ShopPanelProps {
  stats: CharacterStats;
  onBuyItem: (itemId: string, price: number) => void;
  onCloseShop: () => void;
  theme: string;
}

export default function ShopPanel({
  stats,
  onBuyItem,
  onCloseShop,
  theme,
}: ShopPanelProps) {
  
  // Custom Merchant dialogue based on Theme
  const getMerchantText = () => {
    switch (theme) {
      case 'cozy':
        return '☕ "Welcome to the cozy cottage! Grab a warm upgrade for your writing journey..."';
      case 'horror':
        return '💀 "Ah, another soul wandering the dark... What secrets do you seek to purchase...?"';
      case 'spaceship':
        return '🤖 "STAR MERCHANT LOG: Uplink established. Trade goods database active..."';
      case 'witch':
        return '🔮 "Double, double, toil and trouble! Exchange your gold for forbidden swamp reagents..."';
      case 'fantasy':
      default:
        return '🧙‍♂️ "Welcome to the Scribe’s Guild shop, traveler! Trade your gold for writing relics!"';
    }
  };

  const getShopTitle = () => {
    switch (theme) {
      case 'cozy':
        return "Cozy Hearth Corner";
      case 'horror':
        return "Cursed Crypt Relics";
      case 'spaceship':
        return "Space Merchant Terminal";
      case 'witch':
        return "Coven Alchemist Brews";
      case 'fantasy':
      default:
        return "Ye Olde Scriptorium Shop";
    }
  };

  const getBackButtonLabel = () => {
    switch (theme) {
      case 'cozy':
        return 'Back to Cafe';
      case 'horror':
        return 'Back to Crypt';
      case 'spaceship':
        return 'Back to Cockpit';
      case 'witch':
        return 'Back to Swamp';
      case 'fantasy':
      default:
        return 'Back to Tavern';
    }
  };

  const handlePurchase = (item: ShopItem) => {
    if (stats.gold < item.price) {
      sound.playError();
      return;
    }
    sound.playPurchase();
    onBuyItem(item.id, item.price);
  };

  const activeItems = getShopItemsByTheme(theme);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '20px',
        overflowY: 'auto',
      }}
    >
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button className="pixel-btn" onClick={() => { sound.playCoin(); onCloseShop(); }}>
          <ArrowLeft size={14} /> {getBackButtonLabel()}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 'bold' }}>
          <ShoppingBag size={18} style={{ color: 'var(--accent-color)' }} />
          <span>{getShopTitle()}</span>
        </div>
      </div>

      {/* Merchant Message */}
      <div className="pixel-panel crt-glow" style={{ marginBottom: '20px', padding: '12px' }}>
        <p style={{ fontSize: '0.75rem', lineHeight: '1.6', fontStyle: 'italic', color: 'var(--accent-color)' }}>
          {getMerchantText()}
        </p>
      </div>

      {/* Shop Items Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
        {activeItems.map((item) => {
          const isOwned = stats.inventory.includes(item.id);
          const isUltimateItem = item.id === 'scribe_crown' || item.id === 'grandfather_clock' || item.id === 'vampire_cape' || item.id === 'gravity_engine';
          const isLockedByWords = isUltimateItem && (stats.normalWordsWritten || 0) < 25000;
          const isLockedByLevel = item.levelRequired ? stats.level < item.levelRequired : false;
          const isLocked = isLockedByWords || isLockedByLevel;
          const canAfford = stats.gold >= item.price && !isLocked;

          return (
            <div
              key={item.id}
              className="pixel-panel"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '12px',
                borderColor: isOwned ? 'var(--text-secondary)' : isLocked ? 'var(--text-secondary)' : 'var(--border-color)',
                opacity: isOwned ? 0.75 : 1,
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '1.8rem' }}>{item.icon}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                    <span
                      style={{
                        fontSize: '0.65rem',
                        color: isOwned ? 'var(--text-secondary)' : 'var(--accent-color)',
                        fontWeight: 'bold',
                      }}
                    >
                      {item.price} Gold
                    </span>
                    <span
                      style={{
                        fontSize: '0.5rem',
                        color: isOwned ? 'var(--text-secondary)' : isLocked ? '#ef4444' : '#22c55e',
                        fontWeight: 'bold',
                      }}
                    >
                      {isOwned ? 'OWNED' : isLockedByLevel && isLockedByWords ? `🔒 LV.${item.levelRequired} & 25k w` : isLockedByLevel ? `🔒 LV.${item.levelRequired} Req` : isLockedByWords ? '🔒 25k w Req' : 'AVAILABLE'}
                    </span>
                  </div>
                </div>

                <h3 style={{ fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '4px' }}>{item.name}</h3>
                <p style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', lineHeight: '1.4', marginBottom: '8px' }}>
                  {item.description}
                </p>
              </div>

              <div>
                <div
                  style={{
                    fontSize: '0.55rem',
                    color: 'var(--accent-color)',
                    fontWeight: 'bold',
                    marginBottom: '8px',
                    textAlign: 'center',
                  }}
                >
                  Effect: {item.effect}
                </div>

                <button
                  className={`pixel-btn ${canAfford && !isOwned ? 'pixel-btn-accent' : ''}`}
                  disabled={isOwned || isLocked || !canAfford}
                  onClick={() => handlePurchase(item)}
                  style={{ width: '100%', fontSize: '0.65rem', padding: '6px' }}
                >
                  {isOwned ? 'Equipped' : isLockedByLevel ? `Locked (LV. ${item.levelRequired})` : isLockedByWords ? `Locked (${stats.normalWordsWritten || 0}/25000w)` : canAfford ? 'Buy Item' : 'Too Expensive'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
