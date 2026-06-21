import React, { useState, useEffect } from 'react';
import type { CharacterStats, Document } from '../App';
import { Award, Coins, Timer, Sparkles, AlertCircle } from 'lucide-react';
import { sound } from '../utils/audio';
import { 
  FANTASY_SHOP_ITEMS, 
  COZY_SHOP_ITEMS, 
  GOTHIC_SHOP_ITEMS, 
  SPACESHIP_SHOP_ITEMS 
} from './ShopPanel';

export interface ThemedMonster {
  name: string;
  description: string;
  monsterType: string;
}

export interface Quest {
  id: string;
  wordCount: number;
  xpReward: number;
  goldReward: number;
}

// Word count levels updated to: 100, 250, 500, 1000, 2500, 5000
export const QUEST_CONFIGS: Quest[] = [
  { id: 'slime', wordCount: 100, xpReward: 20, goldReward: 15 },       // Tier 1: 100 words
  { id: 'bat', wordCount: 250, xpReward: 30, goldReward: 25 },        // Tier 2: 250 words
  { id: 'golem', wordCount: 500, xpReward: 50, goldReward: 45 },       // Tier 3: 500 words
  { id: 'ghost', wordCount: 1000, xpReward: 100, goldReward: 90 },    // Tier 4: 1000 words
  { id: 'wyrm', wordCount: 2500, xpReward: 300, goldReward: 270 },     // Tier 5: 2500 words
  { id: 'alien', wordCount: 5000, xpReward: 500, goldReward: 450 },   // Tier 6: 5000 words
];

// Challenge presets calibrated to average creative writing speed (~30 wpm)
export interface ChallengePreset {
  id: string;
  label: string;
  durationSeconds: number;
  wordTarget: number;
  questId: string;  // which monster to fight
  xpReward: number;
  goldReward: number;
}

export const CHALLENGE_PRESETS: ChallengePreset[] = [
  { id: 'c1000', label: 'War',          durationSeconds: 1800,  wordTarget: 1000, questId: 'ghost', xpReward: 100, goldReward: 180 },  // 30 min
  { id: 'c2500', label: 'Siege',        durationSeconds: 4500,  wordTarget: 2500, questId: 'wyrm',  xpReward: 300, goldReward: 540 },  // 75 min
  { id: 'c5000', label: 'Epic Crusade', durationSeconds: 9000,  wordTarget: 5000, questId: 'alien', xpReward: 500, goldReward: 900 }, // 150 min
];

// Helper to retrieve themed name, description, and SVG drawing configuration
export const getMonsterData = (theme: string, questId: string): ThemedMonster => {
  const monsterMap: Record<string, Record<string, ThemedMonster>> = {
    fantasy: {
      slime: { name: 'Green Slime', description: 'A squishy green glob blocks the road. Squash it with 100 words!', monsterType: 'slime' },
      bat: { name: 'Cave Bat', description: 'A flapping bat screeches in the dark. Chase it off with 250 words.', monsterType: 'bat' },
      golem: { name: 'Goblin Scout', description: 'A sneaky goblin scout is spying. Defeat him with 500 words.', monsterType: 'goblin' },
      ghost: { name: 'Orc Warrior', description: 'A burly Orc patrols the tavern garden. Slay him with 1000 words.', monsterType: 'orc' },
      wyrm: { name: 'Stone Wyrm', description: 'An ancient serpent coils in the dungeon depths. Conquer it with 2500 words.', monsterType: 'wyrm' },
      alien: { name: 'Red Dragon', description: 'A massive fire-breathing beast guards the hoard. Slay it with 5000 words!', monsterType: 'dragon' }
    },
    cozy: {
      slime: { name: 'Dust Bunny', description: 'A soft dust bunny sits under the cottage sofa. Clean it with 100 words.', monsterType: 'cozy_dust_bunny' },
      bat: { name: 'Coffee Sprite', description: 'A tiny floating espresso sprite. Brew 250 words to keep it happy.', monsterType: 'cozy_coffee_sprite' },
      golem: { name: 'Steaming Kettle', description: 'A boiling copper tea kettle. Write 500 words to make it whistle.', monsterType: 'cozy_kettle' },
      ghost: { name: 'Cluttered Shelf', description: 'A bookshelf covered in unorganized knick-knacks. Sort it with 1000 words.', monsterType: 'cozy_shelf' },
      wyrm: { name: 'Yarn Serpent', description: 'A tangled yarn serpent has knotted the whole basket. Unravel it with 2500 words.', monsterType: 'cozy_yarn_serpent' },
      alien: { name: 'Cuckoo Golem', description: 'A giant wooden cuckoo clock golem. Calm it with 5000 words.', monsterType: 'cozy_cuckoo' }
    },
    horror: {
      slime: { name: 'Risen Skeleton', description: 'A clattering skeleton blocks the cell. Shatter it with 100 words.', monsterType: 'horror_skeleton' },
      bat: { name: 'Screaming Banshee', description: 'A wailing phantom pierces the silence. Silence it with 250 words.', monsterType: 'horror_banshee' },
      golem: { name: 'Dread Gargoyle', description: 'A grey stone gargoyle guards the tower. Crumble it with 500 words.', monsterType: 'horror_gargoyle' },
      ghost: { name: 'Wandering Ghost', description: 'A wandering spirit haunts the manuscript. Lay it to rest with 1000 words.', monsterType: 'horror_ghost' },
      wyrm: { name: 'Corpse Worm', description: 'A bloated undead worm burrows through the crypt. Purge it with 2500 words.', monsterType: 'horror_worm' },
      alien: { name: 'Vampire Lord', description: 'A blood-drinking vampire noble corners you. Slay him with 5000 words.', monsterType: 'horror_vampire' }
    },
    spaceship: {
      slime: { name: 'Tumbling Asteroid', description: 'A space rock is in a collision path. Vaporize it with 100 words.', monsterType: 'space_asteroid' },
      bat: { name: 'Sentinel Drone', description: 'An automated security drone patrols. Hack it with 250 words.', monsterType: 'space_drone' },
      golem: { name: 'Cyborg Guard', description: 'A cybernetic security guard halts your path. Disable it with 500 words.', monsterType: 'space_cyborg' },
      ghost: { name: 'Holo Simulation', description: 'A glitched holodeck defense matrix. Dissolve it with 1000 words.', monsterType: 'space_holo' },
      wyrm: { name: 'Nebula Leviathan', description: 'A colossal space eel lurks in the nebula. Outrun it with 2500 words.', monsterType: 'space_leviathan' },
      alien: { name: 'Star Devourer', description: 'A cosmic worm eating stellar clusters. Save the galaxy with 5000 words.', monsterType: 'space_devourer' }
    },
    witch: {
      slime: { name: 'Mischievous Imp', description: 'A tiny purple imp is stealing your potion ingredients. Chase it away with 100 words.', monsterType: 'witch_imp' },
      bat: { name: 'Shadow Familiar', description: 'A shadowy black cat familiar blocks your cauldron. Pacify it with 250 words.', monsterType: 'witch_cat' },
      golem: { name: 'Cursed Scarecrow', description: 'A living scarecrow from the pumpkin patch blocks the road. Burn it with 500 words.', monsterType: 'witch_scarecrow' },
      ghost: { name: 'Swamp Hag', description: 'A rival swamp witch tries to steal your spellbook. Out-spell her with 1000 words.', monsterType: 'witch_hag' },
      wyrm: { name: 'Bog Basilisk', description: 'A venomous giant lizard crawls out of the toxic bog. Slay it with 2500 words.', monsterType: 'witch_basilisk' },
      alien: { name: 'Cthulhu Spawn', description: 'An ancient tentacled monstrosity rises from the swamp depths. Banish it with 5000 words!', monsterType: 'witch_cthulhu' }
    }
  };

  const themeData = monsterMap[theme] || monsterMap.fantasy;
  return themeData[questId] || themeData.slime;
};

interface RPGPanelProps {
  stats: CharacterStats;
  activeDoc: Document | null;
  theme: string;
  onAddRewards: (xp: number, gold: number) => void;
  onSetQuestInDoc: (questId: string, completed: boolean) => void;
  onSwitchToShop: () => void;
  // Challenge mode props
  challengeActive: boolean;
  challengeTimer: number | null;
  challengeSuccess: boolean | null;
  challengeWordTarget: number | null;
  challengeRewards: { xp: number; gold: number } | null;
  onStartChallenge: (questId: string, durationSeconds: number, wordTarget: number, xpReward: number, goldReward: number) => void;
  onCancelChallenge: () => void;
  onClaimProgressionQuest: (questId: string, xp: number, gold: number) => void;
  onUpdateGoal?: (goal: number, battleMode?: 'progression' | 'single', selectedMonsterId?: string) => void;
  onAddNormalWords?: (words: number) => void;
  onDealDamage?: (damage: number) => void;
}

export default function RPGPanel({
  stats,
  activeDoc,
  theme,
  onAddRewards,
  onSetQuestInDoc,
  onSwitchToShop,
  challengeActive,
  challengeTimer,
  challengeSuccess,
  challengeWordTarget,
  challengeRewards,
  onStartChallenge,
  onCancelChallenge,
  onClaimProgressionQuest,
  onUpdateGoal,
  onAddNormalWords,
  onDealDamage,
}: RPGPanelProps) {
  const [showChallengeSelect, setShowChallengeSelect] = useState(false);
  const [showGoalSelect, setShowGoalSelect] = useState(false);
  
  const [isHitting, setIsHitting] = useState(false);
  const [floatingDmg, setFloatingDmg] = useState<{ id: number; text: string; x: number; y: number }[]>([]);
  const [dmgId, setDmgId] = useState(0);
  const [isDefeating, setIsDefeating] = useState<string | null>(null);

  const getClassName = () => {
    switch (theme) {
      case 'cozy': return 'Coffee Barista';
      case 'horror': return 'Gothic Necromancer';
      case 'spaceship': return 'Star Pilot';
      case 'witch': return 'Swamp Sorcerer';
      case 'fantasy':
      default: return 'Heroic Scribe';
    }
  };

  const activeChapter = activeDoc
    ? activeDoc.chapters.find((ch) => ch.id === activeDoc.activeChapterId) || activeDoc.chapters[0]
    : null;

  const activeChapterWords = activeChapter && activeChapter.content
    ? activeChapter.content.trim().split(/\s+/).filter(Boolean).length
    : 0;

  const totalWords = activeDoc
    ? activeDoc.chapters.reduce((sum, ch) => {
        const words = ch.content ? ch.content.trim().split(/\s+/).filter(Boolean).length : 0;
        return sum + words;
      }, 0)
    : 0;

  const currentWords = challengeActive ? activeChapterWords : totalWords;
  const startWords = challengeActive ? 0 : (activeDoc ? activeDoc.battleStartWords || 0 : 0);
  const runWords = Math.max(0, currentWords - startWords);

  const activeQuest = activeDoc
    ? (challengeActive
        ? QUEST_CONFIGS.find((q) => q.id === activeDoc.questId)
        : (activeDoc.questCompleted
            ? null
            : (activeDoc.battleMode === 'single'
                ? QUEST_CONFIGS.find((q) => q.id === activeDoc.selectedMonsterId)
                : QUEST_CONFIGS.find(
                    (q) =>
                      q.wordCount <= activeDoc.wordGoal &&
                      !(activeDoc.claimedQuests || []).includes(q.id)
                  )
              )
          )
      )
    : null;

  const isQuestCompleted = activeDoc ? activeDoc.questCompleted : false;
  const isMonsterDead = isQuestCompleted || isDefeating !== null;

  // Find the previous milestone word count (only for progression mode)
  let prevMilestoneWords = 0;
  if (activeQuest && !challengeActive && activeDoc && activeDoc.battleMode !== 'single') {
    const activeIndex = QUEST_CONFIGS.findIndex((q) => q.id === activeQuest.id);
    if (activeIndex > 0) {
      prevMilestoneWords = QUEST_CONFIGS[activeIndex - 1].wordCount;
    }
  }

  const targetWords = challengeActive && challengeWordTarget
    ? challengeWordTarget
    : (activeQuest ? activeQuest.wordCount : 0);
  const questWordsNeeded = challengeActive ? targetWords : (targetWords - prevMilestoneWords);
  
  const currentMonsterHp = Math.max(0, questWordsNeeded - (activeDoc?.battleDamageDealt || 0));
  const hpPercent = questWordsNeeded > 0 ? (currentMonsterHp / questWordsNeeded) * 100 : 100;

  const monsterData = activeDoc && activeQuest ? getMonsterData(theme, activeQuest.id) : null;

  // Track key strikes
  const prevWordCount = React.useRef(runWords);
  useEffect(() => {
    if (activeDoc && activeQuest && !isQuestCompleted && !isDefeating) {
      if (challengeActive && challengeSuccess === false) return;

      if (runWords > prevWordCount.current) {
        setIsHitting(true);
        sound.playHit();
        
        const diff = runWords - prevWordCount.current;
        if (!challengeActive && onAddNormalWords) {
          onAddNormalWords(diff);
        }

        // Calculate damage multiplier and critical hits from theme-scoped items
        let multiplier = 1.0;
        let isCritical = false;

        const hasDmgItem = stats.inventory.some(item =>
          ['epic_sword', 'cozy_mug', 'silver_dagger', 'laser_blaster'].includes(item)
        );
        const hasCritItem = stats.inventory.some(item =>
          ['wizard_robe', 'knitted_sweater', 'plague_mask', 'force_shield'].includes(item)
        );
        const hasUltItem = stats.inventory.some(item =>
          ['scribe_crown', 'grandfather_clock', 'vampire_cape', 'gravity_engine'].includes(item)
        );

        if (hasDmgItem) multiplier += 0.25;
        if (hasCritItem) {
          multiplier += 0.30;
          if (Math.random() < 0.20) {
            isCritical = true;
            multiplier *= 2.0;
          }
        }
        if (hasUltItem) multiplier += 0.50;

        const damage = Math.round(diff * multiplier);
        if (onDealDamage) {
          onDealDamage(damage);
        }

        setFloatingDmg((prev) => [
          ...prev,
          {
            id: dmgId,
            text: isCritical ? `CRIT! -${damage} WP` : `-${damage} WP`,
            x: 35 + Math.random() * 30,
            y: 25 + Math.random() * 20,
          },
        ]);
        setDmgId((id) => id + 1);

        setTimeout(() => setIsHitting(false), 150);

        const currentDealt = activeDoc.battleDamageDealt || 0;
        if (currentDealt + damage >= questWordsNeeded) {
          if (challengeActive) {
            onSetQuestInDoc(activeQuest.id, true);
            sound.playQuestComplete();
          } else {
            // Start defeat transition
            setIsDefeating(activeQuest.id);
            sound.playQuestComplete();
            
            setTimeout(() => {
              onClaimProgressionQuest(activeQuest.id, activeQuest.xpReward, activeQuest.goldReward);
              setIsDefeating(null);
            }, 1200);
          }
        }
      }
    }
    prevWordCount.current = runWords;
  }, [runWords, activeDoc, activeQuest, isQuestCompleted, dmgId, onSetQuestInDoc, challengeActive, challengeSuccess, isDefeating, onClaimProgressionQuest, targetWords, questWordsNeeded, stats.inventory, onAddNormalWords, onDealDamage]);

  // Clean damage floating text
  useEffect(() => {
    if (floatingDmg.length > 0) {
      const timer = setTimeout(() => {
        setFloatingDmg((prev) => prev.slice(1));
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [floatingDmg]);

  const handleSelectChallenge = (preset: ChallengePreset) => {
    onStartChallenge(preset.questId, preset.durationSeconds, preset.wordTarget, preset.xpReward, preset.goldReward);
    sound.playCoin();
    setShowChallengeSelect(false);
  };

  const handleClaimRewards = () => {
    if (activeQuest) {
      let xpMultiplier = 1.0;
      let goldMultiplier = 1.0;
      
      const xpItems = ['lucky_charm', 'warm_blanket', 'amulet_protection', 'navigation_chip'];
      const goldItems = ['golden_quill', 'sweet_biscuit', 'crypt_key', 'plasma_core'];

      if (stats.inventory.some(item => xpItems.includes(item))) xpMultiplier += 0.15;
      if (stats.inventory.some(item => goldItems.includes(item))) goldMultiplier += 0.20;

      let baseXp: number;
      let baseGold: number;

      if (challengeActive && challengeSuccess && challengeRewards) {
        // Use preset rewards (already includes ×2 gold)
        baseXp = challengeRewards.xp;
        baseGold = challengeRewards.gold;
      } else {
        baseXp = activeQuest.xpReward;
        baseGold = activeQuest.goldReward;
      }

      const finalXp = Math.round(baseXp * xpMultiplier);
      const finalGold = Math.round(baseGold * goldMultiplier);

      onAddRewards(finalXp, finalGold);
      onSetQuestInDoc('', false);
      if (challengeActive) {
        onCancelChallenge();
      }
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // SVGs for 20 Monsters (4 themes * 5 tiers)
  const renderMonsterSvg = () => {
    if (!monsterData) return null;
    const type = monsterData.monsterType;

    const baseStyle = {
      width: '120px',
      height: '120px',
      transition: 'transform 0.15s',
      transform: isHitting ? 'scale(0.9) rotate(5deg)' : 'scale(1)',
      filter: isHitting ? 'brightness(1.5) sepia(1) saturate(5) hue-rotate(330deg)' : 'none',
    };

    switch (type) {
      // 1. Fantasy
      case 'slime':
        return (
          <svg viewBox="0 0 100 100" style={baseStyle}>
            <path d="M20 70 Q20 30 50 30 Q80 30 80 70 Z" fill="#4ade80" stroke="#14532d" strokeWidth="4" />
            <circle cx="40" cy="50" r="4" fill="#000" /><circle cx="60" cy="50" r="4" fill="#000" />
            <path d="M46 58 Q50 62 54 58" fill="none" stroke="#000" strokeWidth="2.5" />
          </svg>
        );
      case 'bat':
        return (
          <svg viewBox="0 0 100 100" style={baseStyle}>
            <path d="M10 40 Q30 30 40 45 L40 55 Q30 60 10 40" fill="#312e81" stroke="#1e1b4b" strokeWidth="3" />
            <path d="M90 40 Q70 30 60 45 L60 55 Q70 60 90 40" fill="#312e81" stroke="#1e1b4b" strokeWidth="3" />
            <circle cx="50" cy="50" r="12" fill="#4338ca" stroke="#1e1b4b" strokeWidth="3" />
            <circle cx="46" cy="48" r="2" fill="#ef4444" /><circle cx="54" cy="48" r="2" fill="#ef4444" />
          </svg>
        );
      case 'goblin':
        return (
          <svg viewBox="0 0 100 100" style={baseStyle}>
            <circle cx="50" cy="55" r="18" fill="#4ade80" stroke="#166534" strokeWidth="3.5" />
            <path d="M50 15 L30 38 L70 38 Z" fill="#b45309" stroke="#78350f" strokeWidth="2" />
            <circle cx="43" cy="52" r="3.5" fill="#000" /><circle cx="57" cy="52" r="3.5" fill="#000" />
            <path d="M45 64 Q50 60 55 64" fill="none" stroke="#000" strokeWidth="2" />
          </svg>
        );
      case 'orc':
        return (
          <svg viewBox="0 0 100 100" style={baseStyle}>
            <rect x="25" y="30" width="50" height="42" rx="4" fill="#15803d" stroke="#14532d" strokeWidth="4" />
            <polygon points="12,35 28,45 28,55" fill="#15803d" stroke="#14532d" strokeWidth="3" />
            <polygon points="88,35 72,45 72,55" fill="#15803d" stroke="#14532d" strokeWidth="3" />
            <circle cx="40" cy="45" r="4.5" fill="#eab308" /><circle cx="60" cy="45" r="4.5" fill="#eab308" />
            <path d="M45 62 L55 62" stroke="#000" strokeWidth="3" />
          </svg>
        );
      case 'wyrm':
        return (
          <svg viewBox="0 0 100 100" style={baseStyle}>
            <path d="M 20 80 Q 30 50 50 50 T 80 80" fill="none" stroke="#78716c" strokeWidth="12" strokeLinecap="round" />
            <path d="M 50 50 Q 70 30 80 40" fill="none" stroke="#78716c" strokeWidth="10" strokeLinecap="round" />
            <polygon points="45,40 50,30 55,42" fill="#57534e" />
            <polygon points="62,32 68,22 72,35" fill="#57534e" />
            <polygon points="75,30 92,38 80,50" fill="#a8a29e" stroke="#44403c" strokeWidth="2.5" />
            <circle cx="83" cy="36" r="2.5" fill="#facc15" />
            <line x1="77" y1="30" x2="72" y2="24" stroke="#44403c" strokeWidth="2" />
            <line x1="82" y1="32" x2="78" y2="26" stroke="#44403c" strokeWidth="2" />
          </svg>
        );
      case 'dragon':
        return (
          <svg viewBox="0 0 100 100" style={baseStyle}>
            <path d="M15 65 Q30 20 60 40 T90 30" fill="none" stroke="#dc2626" strokeWidth="10" strokeLinecap="round" />
            <path d="M15 65 Q30 20 60 40 T90 30" fill="none" stroke="#7f1d1d" strokeWidth="6" strokeLinecap="round" />
            <polygon points="80,20 95,25 85,35" fill="#f59e0b" />
            <circle cx="85" cy="26" r="2.5" fill="#000" />
            <path d="M90 28 L98 33" stroke="#f59e0b" strokeWidth="3" />
          </svg>
        );

      // 2. Cozy Cottage
      case 'cozy_dust_bunny':
        return (
          <svg viewBox="0 0 100 100" style={baseStyle}>
            <circle cx="50" cy="55" r="22" fill="#9ca3af" stroke="#4b5563" strokeWidth="3" />
            <ellipse cx="40" cy="30" rx="6" ry="12" fill="#9ca3af" stroke="#4b5563" strokeWidth="3" />
            <ellipse cx="60" cy="30" rx="6" ry="12" fill="#9ca3af" stroke="#4b5563" strokeWidth="3" />
            <circle cx="44" cy="50" r="3" fill="#fff" /><circle cx="56" cy="50" r="3" fill="#fff" />
            <circle cx="44" cy="50" r="1.5" fill="#000" /><circle cx="56" cy="50" r="1.5" fill="#000" />
            <polygon points="50,56 47,53 53,53" fill="#f472b6" />
          </svg>
        );
      case 'cozy_coffee_sprite':
        return (
          <svg viewBox="0 0 100 100" style={baseStyle}>
            <path d="M20 40 L20 70 C20 75, 80 75, 80 70 L80 40 Z" fill="#a16207" stroke="#451a03" strokeWidth="3" />
            <path d="M15 45 Q5 45 5 53 Q5 61 15 61" fill="none" stroke="#451a03" strokeWidth="3" />
            <ellipse cx="50" cy="40" rx="30" ry="6" fill="#451a03" stroke="#451a03" strokeWidth="3" />
            <path d="M40 30 Q45 20 40 10 M50 32 Q55 22 50 12" fill="none" stroke="#d97706" strokeWidth="2" opacity="0.7" />
            <circle cx="40" cy="55" r="2.5" fill="#fff" /><circle cx="60" cy="55" r="2.5" fill="#fff" />
          </svg>
        );
      case 'cozy_kettle':
        return (
          <svg viewBox="0 0 100 100" style={baseStyle}>
            <circle cx="50" cy="55" r="25" fill="#b45309" stroke="#7c2d12" strokeWidth="4" />
            <path d="M25 50 Q10 45 12 35" fill="none" stroke="#7c2d12" strokeWidth="4" />
            <path d="M35 32 Q50 15 65 32" fill="none" stroke="#7c2d12" strokeWidth="4" />
            <circle cx="42" cy="50" r="3" fill="#000" /><circle cx="58" cy="50" r="3" fill="#000" />
            <path d="M46 58 Q50 62 54 58" fill="none" stroke="#000" strokeWidth="2" />
          </svg>
        );
      case 'cozy_shelf':
        return (
          <svg viewBox="0 0 100 100" style={baseStyle}>
            <rect x="20" y="25" width="60" height="50" fill="#a16207" stroke="#713f12" strokeWidth="4" />
            <line x1="20" y1="50" x2="80" y2="50" stroke="#713f12" strokeWidth="4" />
            <rect x="30" y="32" width="10" height="15" fill="#ef4444" />
            <rect x="42" y="32" width="8" height="15" fill="#3b82f6" />
            <rect x="55" y="56" width="16" height="14" fill="#10b981" />
          </svg>
        );
      case 'cozy_yarn_serpent':
        return (
          <svg viewBox="0 0 100 100" style={baseStyle}>
            <circle cx="35" cy="70" r="18" fill="#f43f5e" stroke="#be123c" strokeWidth="3" />
            <path d="M22 60 Q35 80 48 60" fill="none" stroke="#fda4af" strokeWidth="2" />
            <path d="M25 70 Q35 52 45 70" fill="none" stroke="#fda4af" strokeWidth="2" />
            <path d="M18 70 Q35 88 52 70" fill="none" stroke="#fda4af" strokeWidth="2" />
            <path d="M35 70 Q50 35 52 45 T75 32" fill="none" stroke="#f43f5e" strokeWidth="11" strokeLinecap="round" />
            <path d="M35 70 Q50 35 52 45 T75 32" fill="none" stroke="#fda4af" strokeWidth="3" strokeLinecap="round" strokeDasharray="3,6" />
            <circle cx="75" cy="32" r="8.5" fill="#f43f5e" stroke="#be123c" strokeWidth="2" />
            <circle cx="72" cy="30" r="2" fill="#fff" />
            <circle cx="72" cy="30" r="0.8" fill="#000" />
            <circle cx="77" cy="30" r="2" fill="#fff" />
            <circle cx="77" cy="30" r="0.8" fill="#000" />
            <path d="M 72 36 Q 75 38 78 36" fill="none" stroke="#be123c" strokeWidth="1.5" />
          </svg>
        );
      case 'cozy_cuckoo':
        return (
          <svg viewBox="0 0 100 100" style={baseStyle}>
            <polygon points="50,15 15,40 85,40" fill="#78350f" stroke="#451a03" strokeWidth="3" />
            <rect x="25" y="40" width="50" height="45" fill="#d97706" stroke="#451a03" strokeWidth="3" />
            <circle cx="50" cy="62" r="14" fill="#fef08a" stroke="#451a03" strokeWidth="3" />
            <rect x="48" y="28" width="4" height="12" fill="#f43f5e" />
          </svg>
        );

      // 3. Horror
      case 'horror_skeleton':
        return (
          <svg viewBox="0 0 100 100" style={baseStyle}>
            <rect x="45" y="40" width="10" height="40" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="2" />
            <line x1="30" y1="50" x2="70" y2="50" stroke="#e5e7eb" strokeWidth="6" />
            <line x1="30" y1="62" x2="70" y2="62" stroke="#e5e7eb" strokeWidth="6" />
            <circle cx="50" cy="30" r="14" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="3" />
            <rect x="42" y="28" width="5" height="5" fill="#000" />
            <rect x="53" y="28" width="5" height="5" fill="#000" />
          </svg>
        );
      case 'horror_banshee':
        return (
          <svg viewBox="0 0 100 100" style={baseStyle}>
            <path d="M30 75 Q15 40 50 20 T70 75 Z" fill="#93c5fd" stroke="#2563eb" strokeWidth="3" opacity="0.8" />
            <circle cx="44" cy="45" r="3.5" fill="#000" /><circle cx="56" cy="45" r="3.5" fill="#000" />
            <circle cx="50" cy="58" r="5" fill="#000" />
          </svg>
        );
      case 'horror_gargoyle':
        return (
          <svg viewBox="0 0 100 100" style={baseStyle}>
            <rect x="30" y="35" width="40" height="40" rx="4" fill="#4b5563" stroke="#1f2937" strokeWidth="4" />
            <polygon points="20,25 35,35 25,50" fill="#374151" stroke="#1f2937" strokeWidth="2" />
            <polygon points="80,25 65,35 75,50" fill="#374151" stroke="#1f2937" strokeWidth="2" />
            <circle cx="42" cy="48" r="3.5" fill="#f43f5e" /><circle cx="58" cy="48" r="3.5" fill="#f43f5e" />
          </svg>
        );
      case 'horror_ghost':
        return (
          <svg viewBox="0 0 100 100" style={baseStyle}>
            <path d="M30 65 C30 35, 70 35, 70 65 C70 75, 65 75, 60 70 C55 75, 50 75, 45 70 C40 75, 30 75, 30 65" fill="#f3f4f6" stroke="#9ca3af" strokeWidth="3" opacity="0.9" />
            <circle cx="44" cy="50" r="4" fill="#dc2626" /><circle cx="56" cy="50" r="4" fill="#dc2626" />
          </svg>
        );
      case 'horror_worm':
        return (
          <svg viewBox="0 0 100 100" style={baseStyle}>
            <path d="M20 75 Q35 55 50 75 T80 75" fill="none" stroke="#581c87" strokeWidth="14" strokeLinecap="round" />
            <path d="M28 66 A 6 6 0 0 1 34 74" fill="none" stroke="#a855f7" strokeWidth="2.5" />
            <path d="M42 66 A 6 6 0 0 1 48 74" fill="none" stroke="#a855f7" strokeWidth="2.5" />
            <path d="M56 66 A 6 6 0 0 1 62 74" fill="none" stroke="#a855f7" strokeWidth="2.5" />
            <path d="M70 66 A 6 6 0 0 1 76 74" fill="none" stroke="#a855f7" strokeWidth="2.5" />
            <circle cx="36" cy="67" r="1.5" fill="#22c55e" />
            <circle cx="50" cy="72" r="2" fill="#22c55e" />
            <circle cx="80" cy="75" r="9.5" fill="#3b0764" stroke="#581c87" strokeWidth="2.5" />
            <circle cx="83" cy="76" r="4.5" fill="#000" />
            <circle cx="76" cy="71" r="1.5" fill="#ef4444" />
            <circle cx="81" cy="70" r="1.5" fill="#ef4444" />
          </svg>
        );
      case 'horror_vampire':
        return (
          <svg viewBox="0 0 100 100" style={baseStyle}>
            <path d="M20 75 L30 40 L50 20 L70 40 L80 75 Z" fill="#1e1b4b" stroke="#000" strokeWidth="3" />
            <rect x="35" y="40" width="30" height="30" rx="3" fill="#fee2e2" />
            <circle cx="43" cy="50" r="2.5" fill="#ef4444" /><circle cx="57" cy="50" r="2.5" fill="#ef4444" />
            <polygon points="46,56 50,60 54,56" fill="#fff" />
          </svg>
        );

      // 4. Spaceship
      case 'space_asteroid':
        return (
          <svg viewBox="0 0 100 100" style={baseStyle}>
            <polygon points="30,25 60,18 80,35 75,70 50,85 22,65" fill="#4b5563" stroke="#1f2937" strokeWidth="3" />
            <circle cx="40" cy="40" r="6" fill="#374151" /><circle cx="62" cy="58" r="4" fill="#374151" />
          </svg>
        );
      case 'space_drone':
        return (
          <svg viewBox="0 0 100 100" style={baseStyle}>
            <circle cx="50" cy="50" r="20" fill="#64748b" stroke="#334155" strokeWidth="3" />
            <rect x="35" y="45" width="30" height="8" rx="4" fill="#06b6d4" />
            <line x1="50" y1="30" x2="50" y2="15" stroke="#334155" strokeWidth="3" />
            <circle cx="50" cy="15" r="3.5" fill="#22d3ee" />
          </svg>
        );
      case 'space_cyborg':
        return (
          <svg viewBox="0 0 100 100" style={baseStyle}>
            <rect x="32" y="30" width="36" height="40" rx="3" fill="#94a3b8" stroke="#475569" strokeWidth="3" />
            <circle cx="42" cy="45" r="4" fill="#fff" />
            <circle cx="58" cy="45" r="5" fill="#ef4444" />
            <rect x="42" y="58" width="16" height="4" fill="#475569" />
          </svg>
        );
      case 'space_holo':
        return (
          <svg viewBox="0 0 100 100" style={baseStyle}>
            <circle cx="50" cy="50" r="22" fill="none" stroke="#22d3ee" strokeWidth="2.5" strokeDasharray="3,3" />
            <polygon points="50,30 32,65 68,65" fill="none" stroke="#22d3ee" strokeWidth="2" />
          </svg>
        );
      case 'space_leviathan':
        return (
          <svg viewBox="0 0 100 100" style={baseStyle}>
            <path d="M15 70 Q35 40 55 70 T90 50" fill="none" stroke="#0f172a" strokeWidth="13" strokeLinecap="round" />
            <path d="M15 70 Q35 40 55 70 T90 50" fill="none" stroke="#06b6d4" strokeWidth="5" strokeLinecap="round" opacity="0.8" />
            <path d="M18 70 Q35 43 55 70 T87 51" fill="none" stroke="#e0f7fa" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="30" cy="53" r="1.2" fill="#fff" opacity="0.9" />
            <circle cx="48" cy="62" r="1" fill="#fff" opacity="0.8" />
            <circle cx="68" cy="62" r="1.2" fill="#fff" opacity="0.9" />
            <circle cx="90" cy="50" r="8.5" fill="#0f172a" stroke="#0891b2" strokeWidth="2.5" />
            <path d="M 87 48 Q 91 45 94 49" fill="none" stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        );
      case 'witch_imp':
        return (
          <svg viewBox="0 0 100 100" style={baseStyle}>
            <circle cx="50" cy="60" r="18" fill="#6d28d9" stroke="#4c1d95" strokeWidth="3" />
            <path d="M38 48 Q32 30 25 35" fill="none" stroke="#4c1d95" strokeWidth="4" strokeLinecap="round" />
            <path d="M62 48 Q68 30 75 35" fill="none" stroke="#4c1d95" strokeWidth="4" strokeLinecap="round" />
            <circle cx="44" cy="56" r="3.5" fill="#facc15" />
            <circle cx="56" cy="56" r="3.5" fill="#facc15" />
            <circle cx="44" cy="56" r="1" fill="#000" />
            <circle cx="56" cy="56" r="1" fill="#000" />
            <path d="M46 68 Q50 72 54 68" fill="none" stroke="#000" strokeWidth="2" />
          </svg>
        );
      case 'witch_cat':
        return (
          <svg viewBox="0 0 100 100" style={baseStyle}>
            <polygon points="32,25 40,45 25,40" fill="#1e1b4b" stroke="#0f172a" strokeWidth="3" />
            <polygon points="68,25 60,45 75,40" fill="#1e1b4b" stroke="#0f172a" strokeWidth="3" />
            <circle cx="50" cy="50" r="18" fill="#1e1b4b" stroke="#0f172a" strokeWidth="3" />
            <ellipse cx="50" cy="72" rx="14" ry="18" fill="#1e1b4b" stroke="#0f172a" strokeWidth="3" />
            <rect x="39" y="62" width="22" height="4" fill="#a21caf" rx="1" />
            <circle cx="44" cy="46" r="3.5" fill="#a3ff1a" />
            <circle cx="56" cy="46" r="3.5" fill="#a3ff1a" />
            <line x1="44" y1="43" x2="44" y2="49" stroke="#000" strokeWidth="1.5" />
            <line x1="56" y1="43" x2="56" y2="49" stroke="#000" strokeWidth="1.5" />
          </svg>
        );
      case 'witch_scarecrow':
        return (
          <svg viewBox="0 0 100 100" style={baseStyle}>
            <rect x="47" y="10" width="6" height="85" fill="#713f12" />
            <rect x="15" y="42" width="70" height="6" fill="#713f12" />
            <polygon points="50,15 25,35 75,35" fill="#3b0764" />
            <circle cx="50" cy="48" r="14" fill="#ea580c" stroke="#9a3412" strokeWidth="3" />
            <polygon points="42,44 46,48 38,48" fill="#000" />
            <polygon points="58,44 62,48 54,48" fill="#000" />
            <path d="M 40 56 L 43 53 L 47 56 L 50 53 L 53 56 L 57 53 L 60 56" fill="none" stroke="#000" strokeWidth="2.5" />
          </svg>
        );
      case 'witch_hag':
        return (
          <svg viewBox="0 0 100 100" style={baseStyle}>
            <path d="M 15 50 Q 50 5 60 10 T 85 50 Z" fill="#090514" stroke="#8a2be2" strokeWidth="2.5" />
            <circle cx="50" cy="62" r="14" fill="#16a34a" stroke="#14532d" strokeWidth="2.5" />
            <path d="M48 62 L42 66 L48 68" fill="none" stroke="#14532d" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="56" cy="58" r="2.5" fill="#ff00ff" />
            <circle cx="44" cy="58" r="2.5" fill="#ff00ff" />
            <circle cx="43" cy="65" r="1.2" fill="#b91c1c" />
          </svg>
        );
      case 'witch_basilisk':
        return (
          <svg viewBox="0 0 100 100" style={baseStyle}>
            <path d="M20 75 Q40 55 50 75 T80 75" fill="none" stroke="#15803d" strokeWidth="12" strokeLinecap="round" />
            <path d="M30 65 Q50 45 60 65 T90 65" fill="none" stroke="#1e1b4b" strokeWidth="8" strokeLinecap="round" />
            <circle cx="30" cy="45" r="10" fill="#1e1b4b" stroke="#0f172a" strokeWidth="2.5" />
            <circle cx="28" cy="42" r="2" fill="#ff00ff" />
            <path d="M 20 47 Q 10 50 15 55" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        );
      case 'witch_cthulhu':
        return (
          <svg viewBox="0 0 100 100" style={baseStyle}>
            <path d="M10 30 Q30 20 40 55 C30 50 20 55 10 30 Z" fill="#064e3b" stroke="#022c22" strokeWidth="2.5" />
            <path d="M90 30 Q70 20 60 55 C70 50 80 55 90 30 Z" fill="#064e3b" stroke="#022c22" strokeWidth="2.5" />
            <circle cx="50" cy="48" r="18" fill="#047857" stroke="#022c22" strokeWidth="3" />
            <circle cx="43" cy="42" r="3.5" fill="#ea580c" />
            <circle cx="57" cy="42" r="3.5" fill="#ea580c" />
            <path d="M 44 54 Q 40 78 35 72" fill="none" stroke="#022c22" strokeWidth="4" strokeLinecap="round" />
            <path d="M 48 56 Q 48 82 46 76" fill="none" stroke="#022c22" strokeWidth="4" strokeLinecap="round" />
            <path d="M 52 56 Q 52 82 54 76" fill="none" stroke="#022c22" strokeWidth="4" strokeLinecap="round" />
            <path d="M 56 54 Q 60 78 65 72" fill="none" stroke="#022c22" strokeWidth="4" strokeLinecap="round" />
          </svg>
        );
      case 'space_devourer':
      default:
        return (
          <svg viewBox="0 0 100 100" style={baseStyle}>
            <path d="M10 80 Q25 40 40 60 T70 40 T90 20" fill="none" stroke="#1e293b" strokeWidth="10" strokeLinecap="round" />
            <path d="M10 80 Q25 40 40 60 T70 40 T90 20" fill="none" stroke="#0ea5e9" strokeWidth="4" strokeDasharray="4,8" />
            <circle cx="90" cy="20" r="8" fill="#1e293b" />
            <circle cx="90" cy="20" r="3" fill="#22d3ee" />
          </svg>
        );
    }
  };

  return (
    <div className="rpg-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '12px' }}>
      
      {/* Character Info Card */}
      <div className="pixel-panel crt-glow" style={{ marginBottom: '12px' }}>
        <div className="pixel-panel-header">{getClassName()}</div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Level & XP */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 'bold' }}>
            <span>LV. {stats.level}</span>
            <span style={{ color: 'var(--accent-color)' }}>XP: {stats.xp}/{stats.maxXp}</span>
          </div>
          
          {/* XP Progress Bar */}
          <div style={{ height: '8px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
            <div 
              style={{ 
                width: `${Math.min(100, (stats.xp / stats.maxXp) * 100)}%`, 
                height: '100%', 
                backgroundColor: 'var(--accent-color)',
                transition: 'width 0.3s' 
              }} 
            />
          </div>

          {/* Stats & Gold */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', marginTop: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Coins size={12} style={{ color: '#eab308' }} />
              <span>{stats.gold} Gold</span>
            </div>
            
            <button className="pixel-btn" onClick={onSwitchToShop} style={{ padding: '2px 6px', fontSize: '0.55rem' }}>
              SHOP
            </button>
          </div>
        </div>
      </div>

      {/* Equipment & Items Inventory */}
      <div className="pixel-panel" style={{ marginBottom: '12px', flexShrink: 0 }}>
        <div className="pixel-panel-header" style={{ fontSize: '0.65rem' }}>Inventory</div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', minHeight: '32px' }}>
          {stats.inventory.length === 0 ? (
            <div style={{ fontSize: '0.55rem', color: 'var(--text-secondary)', padding: '6px 0' }}>
              No items equipped. Visit the shop!
            </div>
          ) : (
            stats.inventory.map((item) => {
              const allShopItems = [
                ...FANTASY_SHOP_ITEMS,
                ...COZY_SHOP_ITEMS,
                ...GOTHIC_SHOP_ITEMS,
                ...SPACESHIP_SHOP_ITEMS
              ];
              const details = allShopItems.find((i) => i.id === item);
              const icon = details?.icon || '🎁';
              const name = details ? `${details.name} (${details.effect})` : 'Item';

              return (
                <div 
                  key={item} 
                  title={name}
                  style={{
                    width: '32px',
                    height: '32px',
                    border: '2px solid var(--border-color)',
                    backgroundColor: 'var(--bg-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem',
                    cursor: 'help'
                  }}
                >
                  {icon}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Combat Screen / Quest details */}
      <div className="pixel-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div className="pixel-panel-header" style={{ fontSize: '0.65rem' }}>Battle Arena</div>

        {!activeDoc ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '12px' }}>
            Choose a chronicle scroll to engage in combat.
          </div>
        ) : !activeQuest ? (
          showGoalSelect ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', padding: '8px', overflowY: 'auto' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--accent-color)', marginBottom: '6px', textAlign: 'center' }}>
                ⚔️ Pick New Goal
              </div>
              
              <button
                className="pixel-btn"
                onClick={() => {
                  sound.playCoin();
                  if (onUpdateGoal) onUpdateGoal(5000, 'progression');
                  setShowGoalSelect(false);
                }}
                style={{ fontSize: '0.6rem', padding: '6px', textAlign: 'left', width: '100%', display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}
              >
                <span>⚔️ Quest (Progressive)</span>
                <span style={{ opacity: 0.8 }}>(Campaign)</span>
              </button>

              {QUEST_CONFIGS.map((q) => {
                const monster = getMonsterData(theme, q.id);
                return (
                  <button
                    key={q.id}
                    className="pixel-btn"
                    onClick={() => {
                      sound.playCoin();
                      if (onUpdateGoal) onUpdateGoal(q.wordCount, 'single', q.id);
                      setShowGoalSelect(false);
                    }}
                    style={{ fontSize: '0.6rem', padding: '6px', textAlign: 'left', width: '100%', display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}
                  >
                    <span>Single: {monster.name}</span>
                    <span style={{ opacity: 0.8 }}>({q.wordCount}w)</span>
                  </button>
                );
              })}

              <button
                className="pixel-btn"
                onClick={() => {
                  sound.playError();
                  setShowGoalSelect(false);
                }}
                style={{ fontSize: '0.6rem', padding: '6px', marginTop: '6px', alignSelf: 'center', width: '100%' }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '10px', padding: '8px', alignItems: 'center', textAlign: 'center' }}>
              <Award size={48} style={{ color: 'var(--accent-color)', marginBottom: '8px', animation: 'bounce 2s infinite' }} />
              <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--accent-color)' }}>
                VICTORY!
              </div>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                {activeDoc.battleMode === 'single'
                  ? `You have vanquished the beast in single combat!`
                  : `All monsters for this chronicle's quest have been vanquished!`
                }
              </p>
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                <button
                  className="pixel-btn pixel-btn-accent"
                  onClick={() => {
                    sound.playCoin();
                    setShowChallengeSelect(true);
                  }}
                  style={{ fontSize: '0.75rem', width: '100%', padding: '8px' }}
                >
                  TIMED CHALLENGE
                </button>
                <button
                  className="pixel-btn"
                  onClick={() => {
                    sound.playCoin();
                    setShowGoalSelect(true);
                  }}
                  style={{ fontSize: '0.75rem', width: '100%', padding: '8px' }}
                >
                  PICK NEW GOAL
                </button>
                <div style={{ fontSize: '0.55rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {activeDoc.battleMode === 'single'
                    ? 'Start a timed challenge or pick a new goal to continue!'
                    : 'All chronicle campaign targets are complete! Choose a challenge or a new goal.'
                  }
                </div>
              </div>
            </div>
          )
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
            
            {/* Floating damage container */}
            {floatingDmg.map((dmg) => (
              <span
                key={dmg.id}
                className="floating-text"
                style={{ left: `${dmg.x}%`, top: `${dmg.y}%` }}
              >
                {dmg.text}
              </span>
            ))}

            {/* Countdown timer for Timed Challenge Mode */}
            {challengeActive && challengeTimer !== null && (
              <div className={`challenge-timer ${challengeTimer <= 15 ? 'timer-low' : ''}`}>
                <Timer size={14} />
                <span>TIME: {formatTime(challengeTimer)}</span>
              </div>
            )}

            {/* Battle Screen background */}
            <div
              className={`pixel-panel ${isHitting ? 'shake-animation' : ''} ${isMonsterDead ? 'flash-green-animation' : ''}`}
              style={{
                flex: 1,
                backgroundColor: 'var(--bg-primary)',
                border: '2px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
                padding: '8px'
              }}
            >
              {/* Monster Visual */}
              {challengeActive && challengeSuccess === false ? (
                <div style={{ textAlign: 'center', color: '#ef4444' }}>
                  <AlertCircle size={48} style={{ margin: '0 auto 8px auto' }} />
                  <div style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>TIME OUT!</div>
                  <div style={{ fontSize: '0.55rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Monster escaped.</div>
                </div>
              ) : !isMonsterDead ? (
                renderMonsterSvg()
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--accent-color)', animation: 'glitch 0.5s infinite' }}>
                  {challengeActive ? <Sparkles size={48} style={{ margin: '0 auto 8px auto' }} /> : <Award size={48} style={{ margin: '0 auto 8px auto' }} />}
                  <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>
                    {challengeActive ? 'CHALLENGE CLEARED!' : 'DEFEATED!'}
                  </div>
                  {challengeActive && (
                    <div style={{ fontSize: '0.55rem', color: '#eab308', marginTop: '4px' }}>
                      🌟 Double Gold payout unlocked!
                    </div>
                  )}
                </div>
              )}

              {/* Monster Stats */}
              {!(challengeActive && challengeSuccess === false) && (
                <div style={{ width: '100%', marginTop: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 'bold', marginBottom: '4px' }}>
                    {monsterData?.name || 'Unknown Enemy'}
                  </div>
                  
                  {/* Monster HP bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.55rem', color: 'var(--text-secondary)' }}>HP</span>
                    <div style={{ flex: 1, height: '6px', backgroundColor: '#450a0a', border: '1px solid var(--border-color)' }}>
                      <div
                        style={{
                          width: `${isMonsterDead ? 0 : hpPercent}%`,
                          height: '100%',
                          backgroundColor: '#dc2626',
                          transition: 'width 0.1s',
                        }}
                      />
                    </div>
                    <span style={{ fontSize: '0.55rem' }}>
                      {isMonsterDead ? '0' : currentMonsterHp}/{questWordsNeeded}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Action Bar */}
            <div style={{ marginTop: '8px', display: 'flex', gap: '6px' }}>
              {challengeActive && challengeSuccess === false ? (
                <button
                  className="pixel-btn"
                  onClick={() => {
                    sound.playCoin();
                    onCancelChallenge();
                  }}
                  style={{ width: '100%', padding: '6px', fontSize: '0.65rem' }}
                >
                  RETRY TIMED CHALLENGE
                </button>
              ) : isQuestCompleted ? (
                <button
                  className="pixel-btn pixel-btn-accent"
                  onClick={handleClaimRewards}
                  style={{ width: '100%', padding: '6px', fontSize: '0.65rem' }}
                >
                  CLAIM REWARDS (+{challengeActive && challengeRewards ? challengeRewards.xp : activeQuest.xpReward}XP)
                </button>
              ) : (
                <>
                  {challengeActive && (
                    <button
                      className="pixel-btn"
                      onClick={() => {
                        sound.playError();
                        onCancelChallenge();
                      }}
                      style={{ padding: '6px 10px', fontSize: '0.65rem', color: 'var(--text-secondary)' }}
                      title="Flee Battle"
                    >
                      FLEE
                    </button>
                  )}
                  {!challengeActive && (
                    <button
                      className="pixel-btn"
                      onClick={() => {
                        sound.playCoin();
                        setShowChallengeSelect(true);
                      }}
                      style={{ padding: '4px 8px', fontSize: '0.55rem', borderColor: '#eab308', color: '#eab308' }}
                    >
                      CHALLENGE
                    </button>
                  )}
                  <div style={{ flex: 1, fontSize: '0.55rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '6px 0' }}>
                    ⚔️ Write words to damage!
                  </div>
                </>
              )}
            </div>

          </div>
        )}
      </div>

      {/* Challenge Preset Selection Dialog */}
      {showChallengeSelect && (
        <div className="dialog-backdrop" style={{ zIndex: 1001 }}>
          <div className="pixel-panel pixel-dialog" style={{ width: '420px' }}>
            <div className="pixel-panel-header">
              ⚔️ Timed Challenge
            </div>
            <p style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', margin: '0 0 12px', textAlign: 'center' }}>
              Write under pressure! Word targets are calibrated for real writing speed.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
              {CHALLENGE_PRESETS.map((preset) => {
                const presetMonster = getMonsterData(theme, preset.questId);
                const minutes = Math.floor(preset.durationSeconds / 60);
                const seconds = preset.durationSeconds % 60;
                const timeLabel = minutes > 0
                  ? `${minutes}m${seconds > 0 ? ` ${seconds}s` : ''}`
                  : `${seconds}s`;
                return (
                  <div
                    key={preset.id}
                    className="pixel-panel"
                    style={{
                      padding: '10px',
                      cursor: 'pointer',
                      backgroundColor: 'var(--bg-primary)',
                      fontSize: '0.65rem',
                      transition: 'border-color 0.2s',
                    }}
                    onClick={() => handleSelectChallenge(preset)}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent-color)')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = '')}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: 'var(--accent-color)', marginBottom: '4px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Timer size={12} />
                        {preset.label} — {timeLabel}
                      </span>
                      <span>{preset.wordTarget} words</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>vs. {presetMonster.name}</span>
                      <div style={{ display: 'flex', gap: '12px', opacity: 0.8 }}>
                        <span>XP: +{preset.xpReward}</span>
                        <span>Gold: +{preset.goldReward} <span style={{ color: '#eab308' }}>(×2!)</span></span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="dialog-buttons">
              <button className="pixel-btn" onClick={() => { sound.playError(); setShowChallengeSelect(false); }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
