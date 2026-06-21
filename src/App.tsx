import React, { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Editor from './components/Editor';
import RPGPanel, { QUEST_CONFIGS } from './components/RPGPanel';
import ShopPanel from './components/ShopPanel';
import SettingsModal from './components/SettingsModal';
import AuthPage from './components/AuthPage';
import { sound } from './utils/audio';
import { saveFolderHandle, getFolderHandle } from './utils/db';
import { supabase, isSupabaseConfigured } from './utils/supabase';
import { Settings, Sparkles, Music, ChevronDown, LogOut } from 'lucide-react';

export interface Chapter {
  id: string;
  title: string;
  content: string;
}

export interface Document {
  id: string;
  title: string;
  chapters: Chapter[];
  activeChapterId: string;
  wordGoal: number;
  questId: string;
  questCompleted: boolean;
  lastModified: number;
  driveFileId?: string;
  claimedQuests?: string[];
  battleStartWords?: number;
  battleMode?: 'progression' | 'single';
  selectedMonsterId?: string;
  battleDamageDealt?: number;
}

export interface CharacterStats {
  level: number;
  xp: number;
  maxXp: number;
  gold: number;
  inventory: string[];
  normalWordsWritten: number;
  monstersSlainCount?: number;
  witchThemeUnlocked?: boolean;
}

const DEFAULT_STATS: CharacterStats = {
  level: 1,
  xp: 0,
  maxXp: 100,
  gold: 0,
  inventory: [],
  normalWordsWritten: 0,
  monstersSlainCount: 0,
  witchThemeUnlocked: false,
};

const DEFAULT_DOCS: Document[] = [
  {
    id: 'intro-scroll',
    title: 'The Chronicle',
    chapters: [
      {
        id: 'intro-scroll-ch1',
        title: 'Chapter 1',
        content: '', // Start empty to show the theme-specific placeholder underlay
      }
    ],
    activeChapterId: 'intro-scroll-ch1',
    wordGoal: 5000,
    questId: '',
    questCompleted: false,
    lastModified: Date.now(),
    claimedQuests: [],
    battleMode: 'progression',
    selectedMonsterId: '',
  },
];



export default function App() {
  // Authentication State
  const [activeUser, setActiveUser] = useState<string | null>(() => {
    return localStorage.getItem('pixelquest_active_user');
  });

  // Global States
  const [documents, setDocuments] = useState<Document[]>(() => {
    const user = localStorage.getItem('pixelquest_active_user');
    if (!user) return DEFAULT_DOCS;
    const userDocsKey = `pixelquest_${user}_docs`;
    const saved = localStorage.getItem(userDocsKey);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    // Check migration from legacy
    const legacy = localStorage.getItem('pixelquest_docs');
    if (legacy) {
      try {
        const parsed = JSON.parse(legacy);
        localStorage.setItem(userDocsKey, legacy);
        return parsed;
      } catch (e) {}
    }
    return DEFAULT_DOCS;
  });

  const [activeDocId, setActiveDocId] = useState<string | null>(() => {
    const user = localStorage.getItem('pixelquest_active_user');
    if (!user) return DEFAULT_DOCS[0]?.id || null;
    const userKey = `pixelquest_${user}_active_doc_id`;
    const saved = localStorage.getItem(userKey);
    if (saved) return saved;
    // Check legacy
    const legacy = localStorage.getItem('pixelquest_active_doc_id');
    if (legacy) {
      localStorage.setItem(userKey, legacy);
      return legacy;
    }
    return DEFAULT_DOCS[0]?.id || null;
  });

  const [stats, setStats] = useState<CharacterStats>(() => {
    const user = localStorage.getItem('pixelquest_active_user');
    const activeTheme = (user ? localStorage.getItem(`pixelquest_${user}_theme`) : null) || localStorage.getItem('pixelquest_theme') || 'fantasy';
    if (!user) return DEFAULT_STATS;
    const userStatsKey = `pixelquest_${user}_stats_${activeTheme}`;
    const saved = localStorage.getItem(userStatsKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.normalWordsWritten === undefined) {
          parsed.normalWordsWritten = 0;
        }
        return { ...DEFAULT_STATS, ...parsed };
      } catch (e) {}
    }
    // Check migration from legacy
    const legacyThemeStats = localStorage.getItem(`pixelquest_stats_${activeTheme}`);
    if (legacyThemeStats) {
      try {
        const parsed = JSON.parse(legacyThemeStats);
        if (parsed.normalWordsWritten === undefined) {
          parsed.normalWordsWritten = 0;
        }
        const merged = { ...DEFAULT_STATS, ...parsed };
        localStorage.setItem(userStatsKey, JSON.stringify(merged));
        return merged;
      } catch (e) {}
    }
    return DEFAULT_STATS;
  });

  const [theme, setTheme] = useState<string>(() => {
    const user = localStorage.getItem('pixelquest_active_user');
    const key = user ? `pixelquest_${user}_theme` : 'pixelquest_theme';
    return localStorage.getItem(key) || 'fantasy';
  });

  const isWitchUnlocked = useCallback(() => {
    const user = localStorage.getItem('pixelquest_active_user');
    const globalKey = user ? `pixelquest_${user}_witch_unlocked` : `pixelquest_witch_unlocked`;
    if (localStorage.getItem(globalKey) === 'true') return true;
    if (stats.witchThemeUnlocked) return true;
    
    // Check if any other theme stats have it unlocked
    const themes = ['fantasy', 'cozy', 'horror', 'spaceship', 'witch'];
    for (const t of themes) {
      const userKey = user ? `pixelquest_${user}_stats_${t}` : `pixelquest_stats_${t}`;
      const saved = localStorage.getItem(userKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.witchThemeUnlocked) {
            localStorage.setItem(globalKey, 'true');
            return true;
          }
        } catch (e) {}
      }
    }
    return false;
  }, [stats.witchThemeUnlocked]);

  const getMaxMonstersSlain = useCallback(() => {
    const user = localStorage.getItem('pixelquest_active_user');
    let maxSlain = stats.monstersSlainCount || 0;
    const themes = ['fantasy', 'cozy', 'horror', 'spaceship', 'witch'];
    for (const t of themes) {
      const userKey = user ? `pixelquest_${user}_stats_${t}` : `pixelquest_stats_${t}`;
      const saved = localStorage.getItem(userKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.monstersSlainCount && parsed.monstersSlainCount > maxSlain) {
            maxSlain = parsed.monstersSlainCount;
          }
        } catch (e) {}
      }
    }
    return maxSlain;
  }, [stats.monstersSlainCount]);

  const [fontSize, setFontSize] = useState<string>(() => {
    const user = localStorage.getItem('pixelquest_active_user');
    const key = user ? `pixelquest_${user}_font_size` : 'pixelquest_font_size';
    return localStorage.getItem(key) || '18px';
  });

  const themeDropdownRef = useRef<HTMLDivElement>(null);
  const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState<boolean>(false);

  const [isDistractionFree, setIsDistractionFree] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<'editor' | 'shop' | 'sidebar' | 'rpg'>('editor');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(sound.getEnabled());
  const [musicEnabled, setMusicEnabled] = useState<boolean>(sound.getMusicEnabled());
  const [musicVolume, setMusicVolume] = useState<number>(() => sound.getVolume());
  const [showLevelUpModal, setShowLevelUpModal] = useState<boolean>(false);
  const [levelUpMessage, setLevelUpMessage] = useState<string>('');
  const [showReviewPopup, setShowReviewPopup] = useState<boolean>(false);
  const [reviewStars, setReviewStars] = useState<number>(5);
  const [reviewFeedback, setReviewFeedback] = useState<string>( '');
  const [customAlert, setCustomAlert] = useState<{ title: string; message: string; buttonText?: string; themeClass?: string } | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(() => window.innerWidth <= 900);

  // Challenge Mode State
  const [challengeActive, setChallengeActive] = useState<boolean>(false);
  const [challengeTimer, setChallengeTimer] = useState<number | null>(null);
  const [challengeSuccess, setChallengeSuccess] = useState<boolean | null>(null);
  const [challengeWordTarget, setChallengeWordTarget] = useState<number | null>(null);
  const [challengeRewards, setChallengeRewards] = useState<{ xp: number; gold: number } | null>(null);

  // Local Folder Sync State
  const [localFolderHandle, setLocalFolderHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [localFolderState, setLocalFolderState] = useState<'connected' | 'needs_reauth' | 'none'>('none');
  const [localFolderName, setLocalFolderName] = useState<string | null>(null);

  // Save states to local storage on changes
  useEffect(() => {
    if (activeUser) {
      localStorage.setItem(`pixelquest_${activeUser}_docs`, JSON.stringify(documents));
    }
  }, [documents, activeUser]);

  // Handle mobile layout resize checks
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 900);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sync activeView back to editor if switching to desktop
  useEffect(() => {
    if (!isMobile && (activeView === 'sidebar' || activeView === 'rpg')) {
      setActiveView('editor');
    }
  }, [isMobile, activeView]);

  // Fetch Cloud Stats on Mount or Login
  useEffect(() => {
    const fetchCloudStats = async (username: string) => {
      if (!isSupabaseConfigured) return;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('character_stats')
          .select('theme, stats')
          .eq('user_id', user.id);

        if (error) {
          console.error('Error fetching stats from Supabase:', error.message);
          return;
        }

        if (data && data.length > 0) {
          data.forEach((row) => {
            const key = `pixelquest_${username}_stats_${row.theme}`;
            localStorage.setItem(key, JSON.stringify(row.stats));
          });

          const activeTheme = (username ? localStorage.getItem(`pixelquest_${username}_theme`) : null) || localStorage.getItem('pixelquest_theme') || 'fantasy';
          const matchingRow = data.find((row) => row.theme === activeTheme);
          if (matchingRow) {
            setStats({ ...DEFAULT_STATS, ...matchingRow.stats });
          }
        }
      } catch (err) {
        console.error('Failed to fetch cloud stats:', err);
      }
    };

    if (activeUser) {
      fetchCloudStats(activeUser);
    }
  }, [activeUser]);

  // Debounced Cloud Stats Saving
  useEffect(() => {
    if (!activeUser || !isSupabaseConfigured) return;

    const timer = setTimeout(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
          .from('character_stats')
          .upsert({
            user_id: user.id,
            theme: theme,
            stats: stats,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id,theme'
          });

        if (error) {
          console.error('Failed to save stats to Supabase:', error.message);
        }
      } catch (err) {
        console.error('Failed to save stats to Supabase:', err);
      }
    }, 4000); // 4-second debounce

    return () => clearTimeout(timer);
  }, [stats, theme, activeUser]);

  useEffect(() => {
    if (activeUser && theme) {
      localStorage.setItem(`pixelquest_${activeUser}_stats_${theme}`, JSON.stringify(stats));
    }
  }, [stats, theme, activeUser]);

  useEffect(() => {
    if (activeUser) {
      localStorage.setItem(`pixelquest_${activeUser}_font_size`, fontSize);
    }
  }, [fontSize, activeUser]);

  useEffect(() => {
    if (activeUser) {
      if (activeDocId) {
        localStorage.setItem(`pixelquest_${activeUser}_active_doc_id`, activeDocId);
      } else {
        localStorage.removeItem(`pixelquest_${activeUser}_active_doc_id`);
      }
    }
  }, [activeDocId, activeUser]);

  useEffect(() => {
    if (activeUser) {
      localStorage.setItem(`pixelquest_${activeUser}_theme`, theme);
    }
    document.body.className = `theme-${theme}`;
    sound.changeMusicTheme(theme);
  }, [theme, activeUser]);

  // Migration: Clear out legacy default placeholder text from chapters
  useEffect(() => {
    setDocuments((prev) =>
      prev.map((doc) => {
        let changed = false;
        const updatedChapters = doc.chapters.map((ch) => {
          if (
            ch.content &&
            (ch.content.includes("Long ago in the digital taverns") ||
              ch.content.includes("digital taverns"))
          ) {
            changed = true;
            return { ...ch, content: "" };
          }
          return ch;
        });
        if (changed) {
          return { ...doc, chapters: updatedChapters, questId: "", questCompleted: false, claimedQuests: [] };
        }
        return doc;
      })
    );
  }, []);


  // Load Folder Handle from IndexedDB on mount or activeUser change
  useEffect(() => {
    const loadFolder = async () => {
      if (!activeUser) {
        setLocalFolderHandle(null);
        setLocalFolderName(null);
        setLocalFolderState('none');
        return;
      }
      try {
        const handle = await getFolderHandle(activeUser);
        if (handle) {
          setLocalFolderHandle(handle);
          setLocalFolderName(handle.name);
          // Query current write permissions
          const permission = await (handle as any).queryPermission({ mode: 'readwrite' });
          if (permission === 'granted') {
            setLocalFolderState('connected');
          } else {
            setLocalFolderState('needs_reauth');
          }
        } else {
          setLocalFolderHandle(null);
          setLocalFolderName(null);
          setLocalFolderState('none');
        }
      } catch (e) {
        console.error('Failed to load folder handle from IndexedDB', e);
      }
    };
    loadFolder();
  }, [activeUser]);

  // Programmatic background music initializer
  useEffect(() => {
    const startOnInteraction = () => {
      if (sound.getMusicEnabled()) {
        sound.startMusic();
      }
      window.removeEventListener('click', startOnInteraction);
    };
    window.addEventListener('click', startOnInteraction);
    return () => window.removeEventListener('click', startOnInteraction);
  }, []);

  // Theme Dropdown click-outside handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (themeDropdownRef.current && !themeDropdownRef.current.contains(e.target as Node)) {
        setIsThemeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Challenge Countdown Ticker
  useEffect(() => {
    if (!challengeActive || challengeTimer === null || challengeSuccess !== null) return;

    const ticker = setInterval(() => {
      setChallengeTimer((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(ticker);
          setChallengeSuccess(false);
          sound.playError();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(ticker);
  }, [challengeActive, challengeTimer, challengeSuccess]);

  const activeDoc = documents.find((d) => d.id === activeDocId) || null;

  // Silent auto-claim of milestones passed by existing text on document load/switch
  useEffect(() => {
    if (!activeDoc) return;
    const currentWords = activeDoc.chapters.reduce((sum, ch) => {
      const words = ch.content ? ch.content.trim().split(/\s+/).filter(Boolean).length : 0;
      return sum + words;
    }, 0);
    const unclaimedPassedQuests = QUEST_CONFIGS.filter(
      (q) => q.wordCount <= currentWords && !(activeDoc.claimedQuests || []).includes(q.id)
    );
    if (unclaimedPassedQuests.length > 0) {
      const idsToClaim = unclaimedPassedQuests.map((q) => q.id);
      setDocuments((prev) =>
        prev.map((doc) =>
          doc.id === activeDoc.id
            ? {
                ...doc,
                claimedQuests: [...(doc.claimedQuests || []), ...idsToClaim],
              }
            : doc
        )
      );
    }
  }, [activeDocId]);

  // Watch for active quest completion in Timed Challenge Mode
  useEffect(() => {
    if (challengeActive && challengeSuccess === null && activeDoc?.questCompleted) {
      setChallengeSuccess(true);
    }
  }, [documents, challengeActive, challengeSuccess, activeDoc]);

  // References and Dirty states for robust Autosaving
  const documentsRef = useRef<Document[]>(documents);
  const prevDocsRef = useRef<Document[]>(documents);
  const localDirtyRef = useRef<{ [docId: string]: boolean }>({});
  const localTimerRef = useRef<any>(null);


  // Sync documentsRef with documents state
  useEffect(() => {
    documentsRef.current = documents;
  }, [documents]);

  // Helper to save a document to the local folder
  const saveLocalFolderImmediate = useCallback(async (docId: string, currentDocs: Document[]) => {
    if (localFolderState !== 'connected' || !localFolderHandle) return;
    const doc = currentDocs.find((d) => d.id === docId);
    if (!doc) return;

    try {
      // 1. Sanitize the folder name (chronicle title)
      const safeDirName = doc.title.replace(/[\\/:*?"<>|]/g, ' ').trim() || 'Untitled Chronicle';
      const dirHandle = await localFolderHandle.getDirectoryHandle(safeDirName, { create: true });

      // 2. Write active chapter files
      const activeFilenames: string[] = [];
      for (let index = 0; index < doc.chapters.length; index++) {
        const ch = doc.chapters[index];
        const safeChTitle = ch.title.replace(/[\\/:*?"<>|]/g, ' ').trim() || `Chapter ${index + 1}`;
        const filename = `${index + 1} - ${safeChTitle}.txt`;
        activeFilenames.push(filename);

        const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(ch.content);
        await writable.close();
      }

      // 3. Prune old chapter files that no longer exist
      for await (const entry of (dirHandle as any).values()) {
        if (entry.kind === 'file' && entry.name.endsWith('.txt')) {
          if (!activeFilenames.includes(entry.name)) {
            await dirHandle.removeEntry(entry.name);
          }
        }
      }

      console.log(`Successfully synced "${doc.title}" (directories and chapters) to local desktop folder`);
      localDirtyRef.current[docId] = false;
    } catch (err) {
      console.warn('Failed to sync to local desktop folder:', err);
    }
  }, [localFolderHandle, localFolderState]);

  // 1. Detect document content/title/goal modifications and trigger debounced saving
  useEffect(() => {
    if (!activeDocId) {
      prevDocsRef.current = documents;
      return;
    }

    const currentDoc = documents.find((d) => d.id === activeDocId);
    const prevDoc = prevDocsRef.current.find((d) => d.id === activeDocId);

    // Update prevDocsRef for future comparisons
    prevDocsRef.current = documents;

    if (!currentDoc) return;

    // Helper to serialize document for comparison (excluding transient fields like driveFileId and lastModified)
    const cleanDocForCompare = (d: Document | undefined) => {
      if (!d) return null;
      const copy: any = { ...d };
      delete copy.lastModified;
      delete copy.driveFileId;
      return JSON.stringify(copy);
    };

    const isChanged = cleanDocForCompare(currentDoc) !== cleanDocForCompare(prevDoc);

    if (isChanged) {
      localDirtyRef.current[activeDocId] = true;

      // Debounced save to local folder
      if (localFolderState === 'connected' && localFolderHandle) {
        if (localTimerRef.current) clearTimeout(localTimerRef.current);
        localTimerRef.current = setTimeout(() => {
          saveLocalFolderImmediate(activeDocId, documents);
        }, 5000);
      }
    }
  }, [
    documents,
    activeDocId,
    localFolderHandle,
    localFolderState,
    saveLocalFolderImmediate
  ]);

  // 2. Switch document & unmount handler: flush pending changes immediately
  useEffect(() => {
    const oldDocId = activeDocId;

    return () => {
      if (oldDocId) {
        if (localTimerRef.current) clearTimeout(localTimerRef.current);

        if (localDirtyRef.current[oldDocId]) {
          saveLocalFolderImmediate(oldDocId, documentsRef.current);
        }
      }
    };
  }, [activeDocId, saveLocalFolderImmediate]);

  // 3. Page unload dirty prevention
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const hasUnsavedLocal = Object.values(localDirtyRef.current).some(Boolean);
      if (hasUnsavedLocal) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Local Folder Handlers
  const handleLinkFolder = async () => {
    if (!('showDirectoryPicker' in window)) {
      sound.playError();
      setCustomAlert({
        title: '⛔ Browser Incompatible',
        message: 'Your browser does not support the File System Access API. Please use a Chromium-based browser (Chrome, Edge, Opera) to link a local folder.',
        buttonText: 'Acknowledge'
      });
      return;
    }
    try {
      const handle = await (window as any).showDirectoryPicker();
      setLocalFolderHandle(handle);
      setLocalFolderName(handle.name);
      setLocalFolderState('connected');
      await saveFolderHandle(handle, activeUser || undefined);
      sound.playCoin();
    } catch (e: any) {
      console.warn('Folder picker cancelled or failed', e);
      sound.playError();
    }
  };

  const handleUnlinkFolder = async () => {
    setLocalFolderHandle(null);
    setLocalFolderName(null);
    setLocalFolderState('none');
    await saveFolderHandle(null, activeUser || undefined);
    sound.playHit();
  };

  const handleReauthFolder = async () => {
    if (!localFolderHandle) return;
    try {
      const permission = await (localFolderHandle as any).requestPermission({ mode: 'readwrite' });
      if (permission === 'granted') {
        setLocalFolderState('connected');
        sound.playCoin();
      } else {
        sound.playError();
      }
    } catch (e) {
      console.error('Re-authorization failed', e);
      sound.playError();
    }
  };

  const handleLogin = (username: string) => {
    localStorage.setItem('pixelquest_active_user', username);
    setActiveUser(username);
    
    // Load documents
    const userDocsKey = `pixelquest_${username}_docs`;
    const savedDocs = localStorage.getItem(userDocsKey);
    let loadedDocs = DEFAULT_DOCS;
    if (savedDocs) {
      try {
        loadedDocs = JSON.parse(savedDocs);
      } catch (e) {}
    } else {
      // Check migration from legacy
      const legacyDocs = localStorage.getItem('pixelquest_docs');
      if (legacyDocs) {
        try {
          loadedDocs = JSON.parse(legacyDocs);
          localStorage.setItem(userDocsKey, legacyDocs);
        } catch (e) {}
      }
    }
    setDocuments(loadedDocs);
    
    // Load activeDocId
    const userActiveDocKey = `pixelquest_${username}_active_doc_id`;
    const savedActiveDocId = localStorage.getItem(userActiveDocKey);
    let loadedActiveDocId = loadedDocs[0]?.id || null;
    if (savedActiveDocId) {
      loadedActiveDocId = savedActiveDocId;
    } else {
      const legacyActiveDocId = localStorage.getItem('pixelquest_active_doc_id');
      if (legacyActiveDocId) {
        loadedActiveDocId = legacyActiveDocId;
        localStorage.setItem(userActiveDocKey, legacyActiveDocId);
      }
    }
    setActiveDocId(loadedActiveDocId);
    
    // Load theme
    const userThemeKey = `pixelquest_${username}_theme`;
    const savedTheme = localStorage.getItem(userThemeKey) || 'fantasy';
    setTheme(savedTheme);
    
    // Load stats
    const userStatsKey = `pixelquest_${username}_stats_${savedTheme}`;
    const savedStats = localStorage.getItem(userStatsKey);
    let loadedStats = DEFAULT_STATS;
    if (savedStats) {
      try {
        loadedStats = { ...DEFAULT_STATS, ...JSON.parse(savedStats) };
      } catch (e) {}
    } else {
      // Check migration from legacy
      const legacyStats = localStorage.getItem(`pixelquest_stats_${savedTheme}`);
      if (legacyStats) {
        try {
          loadedStats = { ...DEFAULT_STATS, ...JSON.parse(legacyStats) };
          localStorage.setItem(userStatsKey, JSON.stringify(loadedStats));
        } catch (e) {}
      }
    }
    if (loadedStats.normalWordsWritten === undefined) {
      loadedStats.normalWordsWritten = 0;
    }
    setStats(loadedStats);

    // Load font size
    const userFontSizeKey = `pixelquest_${username}_font_size`;
    const savedFontSize = localStorage.getItem(userFontSizeKey) || '18px';
    setFontSize(savedFontSize);
  };

  const handleLogout = () => {
    // Save current stats/docs for active user before resetting state
    if (activeUser) {
      localStorage.setItem(`pixelquest_${activeUser}_stats_${theme}`, JSON.stringify(stats));
      localStorage.setItem(`pixelquest_${activeUser}_docs`, JSON.stringify(documents));
      if (activeDocId) {
        localStorage.setItem(`pixelquest_${activeUser}_active_doc_id`, activeDocId);
      }
      localStorage.setItem(`pixelquest_${activeUser}_theme`, theme);
    }
    localStorage.removeItem('pixelquest_active_user');
    setActiveUser(null);
    setDocuments(DEFAULT_DOCS);
    setActiveDocId(DEFAULT_DOCS[0]?.id || null);
    setStats(DEFAULT_STATS);
    setTheme('fantasy');
    setFontSize('18px');
    setLocalFolderHandle(null);
    setLocalFolderName(null);
    setLocalFolderState('none');
  };

  // Timed Challenge Mode Handlers
  const handleStartChallenge = (questId: string, durationSeconds: number, wordTarget: number, xpReward: number, goldReward: number) => {
    setChallengeTimer(durationSeconds);
    setChallengeSuccess(null);
    setChallengeActive(true);
    setChallengeWordTarget(wordTarget);
    setChallengeRewards({ xp: xpReward, gold: goldReward * 2 }); // ×2 gold bonus for challenge mode
    
    // Set active quest in document
    handleSetQuestInDoc(questId, false);
    
    // Clear document contents so player starts a fresh timed battle!
    handleUpdateContent('');
    setActiveView('editor');
  };

  const handleCancelChallenge = () => {
    setChallengeActive(false);
    setChallengeTimer(null);
    setChallengeSuccess(null);
    setChallengeWordTarget(null);
    setChallengeRewards(null);
    handleSetQuestInDoc('', false);
  };

  // Document controls
  const handleSelectDoc = (id: string) => {
    setActiveDocId(id);
    setActiveView('editor');
  };

  const handleCreateDoc = () => {
    const chId = `chapter-${Date.now()}-ch1`;
    const newDoc: Document = {
      id: 'doc-' + Date.now(),
      title: 'New Chronicle',
      chapters: [
        {
          id: chId,
          title: 'Chapter 1',
          content: '', // Starts empty
        }
      ],
      activeChapterId: chId,
      wordGoal: 5000,
      questId: '',
      questCompleted: false,
      lastModified: Date.now(),
      claimedQuests: [],
      battleMode: 'progression',
      selectedMonsterId: '',
    };
    setDocuments((prev) => [newDoc, ...prev]);
    setActiveDocId(newDoc.id);
    setActiveView('editor');
    sound.playLevelUp();
  };

  const handleSelectChapter = (docId: string, chapterId: string) => {
    setDocuments((prev) =>
      prev.map((doc) =>
        doc.id === docId ? { ...doc, activeChapterId: chapterId } : doc
      )
    );
    sound.playCoin();
  };

  const handleAddChapter = (docId: string) => {
    setDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id === docId) {
          const nextIndex = doc.chapters.length + 1;
          const newCh: Chapter = {
            id: `chapter-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            title: `Chapter ${nextIndex}`,
            content: '',
          };
          sound.playCoin();
          return {
            ...doc,
            chapters: [...doc.chapters, newCh],
            activeChapterId: newCh.id,
            lastModified: Date.now(),
          };
        }
        return doc;
      })
    );
  };

  const handleRenameChapter = (docId: string, chapterId: string, newTitle: string) => {
    setDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id === docId) {
          const updated = doc.chapters.map((ch) =>
            ch.id === chapterId ? { ...ch, title: newTitle } : ch
          );
          sound.playCoin();
          return {
            ...doc,
            chapters: updated,
            lastModified: Date.now(),
          };
        }
        return doc;
      })
    );
  };

  const handleDeleteChapter = (docId: string, chapterId: string) => {
    setDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id === docId) {
          if (doc.chapters.length <= 1) {
            sound.playError();
            setCustomAlert({
              title: '⚠️ Seal Broken',
              message: 'A chronicle must have at least one chapter!',
              buttonText: 'Acknowledge'
            });
            return doc;
          }
          const index = doc.chapters.findIndex((ch) => ch.id === chapterId);
          const updated = doc.chapters.filter((ch) => ch.id !== chapterId);
          let newActiveId = doc.activeChapterId;
          if (doc.activeChapterId === chapterId) {
            newActiveId = updated[Math.max(0, index - 1)].id;
          }
          sound.playHit();
          return {
            ...doc,
            chapters: updated,
            activeChapterId: newActiveId,
            lastModified: Date.now(),
          };
        }
        return doc;
      })
    );
  };

  const handleForceSave = useCallback(async () => {
    // Force write current state to localStorage immediately
    localStorage.setItem('pixelquest_docs', JSON.stringify(documents));
    localStorage.setItem('pixelquest_stats', JSON.stringify(stats));

    // Force write active document to local folder if connected
    if (activeDocId) {
      await saveLocalFolderImmediate(activeDocId, documents);
    }
    sound.playQuestComplete();
  }, [documents, stats, activeDocId, saveLocalFolderImmediate]);

  const handleRenameDoc = (id: string, newTitle: string) => {
    setDocuments((prev) =>
      prev.map((doc) => (doc.id === id ? { ...doc, title: newTitle, lastModified: Date.now() } : doc))
    );
  };

  const handleDeleteDoc = async (id: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== id));
    if (activeDocId === id) {
      setActiveDocId(null);
    }
  };

  const handleUpdateContent = (content: string) => {
    setDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id === activeDocId) {
          const updatedChapters = doc.chapters.map((ch) =>
            ch.id === doc.activeChapterId ? { ...ch, content } : ch
          );
          return { ...doc, chapters: updatedChapters, lastModified: Date.now() };
        }
        return doc;
      })
    );
  };

  const handleUpdateGoal = (goal: number, battleMode: 'progression' | 'single' = 'progression', selectedMonsterId?: string) => {
    setDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id === activeDocId) {
          const currentWords = doc.chapters.reduce((sum, ch) => {
            const words = ch.content ? ch.content.trim().split(/\s+/).filter(Boolean).length : 0;
            return sum + words;
          }, 0);

          let updatedClaimed = doc.claimedQuests || [];
          if (battleMode === 'progression') {
            if (goal === 5000) {
              updatedClaimed = [];
            } else {
              // Reset claimed quests at or above this new goal
              const targetQuest = QUEST_CONFIGS.find((q) => q.wordCount === goal);
              if (targetQuest) {
                const activeIndex = QUEST_CONFIGS.findIndex((q) => q.id === targetQuest.id);
                if (activeIndex !== -1) {
                  const questsToReset = QUEST_CONFIGS.slice(activeIndex);
                  updatedClaimed = updatedClaimed.filter((id) => !questsToReset.some((q) => q.id === id));
                }
              }
            }
          }

          return {
            ...doc,
            battleMode,
            selectedMonsterId: selectedMonsterId || '',
            wordGoal: goal,
            battleStartWords: currentWords,
            questCompleted: false,
            questId: '',
            claimedQuests: updatedClaimed,
            battleDamageDealt: 0,
            lastModified: Date.now(),
          };
        }
        return doc;
      })
    );
  };

  const handleSetQuestInDoc = (questId: string, completed: boolean) => {
    setDocuments((prev) =>
      prev.map((doc) =>
        doc.id === activeDocId ? { ...doc, questId, questCompleted: completed, battleDamageDealt: 0, battleStartWords: 0, lastModified: Date.now() } : doc
      )
    );
  };

  const handleDealDamage = (damage: number) => {
    setDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id === activeDocId) {
          const newDamage = Math.max(0, (doc.battleDamageDealt || 0) + damage);
          return {
            ...doc,
            battleDamageDealt: newDamage,
            lastModified: Date.now(),
          };
        }
        return doc;
      })
    );
  };

  const handleClaimProgressionQuest = (questId: string, xpReward: number, goldReward: number) => {
    let xpMultiplier = 1.0;
    let goldMultiplier = 1.0;
    
    const xpItems = ['lucky_charm', 'warm_blanket', 'amulet_protection', 'navigation_chip'];
    const goldItems = ['golden_quill', 'sweet_biscuit', 'crypt_key', 'plasma_core'];

    if (stats.inventory.some(item => xpItems.includes(item))) xpMultiplier += 0.15;
    if (stats.inventory.some(item => goldItems.includes(item))) goldMultiplier += 0.20;

    const finalXp = Math.round(xpReward * xpMultiplier);
    const finalGold = Math.round(goldReward * goldMultiplier);

    setDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id === activeDocId) {
          if (doc.battleMode === 'single') {
            return {
              ...doc,
              questCompleted: true,
              lastModified: Date.now(),
            };
          } else {
            const currentClaimed = doc.claimedQuests || [];
            const updatedClaimed = [...currentClaimed, questId];
            
            // Check if there is a next quest in QUEST_CONFIGS
            const currentQuestIndex = QUEST_CONFIGS.findIndex((q) => q.id === questId);
            let newGoal = doc.wordGoal;
            
            if (currentQuestIndex !== -1 && currentQuestIndex < QUEST_CONFIGS.length - 1) {
              newGoal = QUEST_CONFIGS[currentQuestIndex + 1].wordCount;
            }

            const currentWords = doc.chapters.reduce((sum, ch) => {
              const words = ch.content ? ch.content.trim().split(/\s+/).filter(Boolean).length : 0;
              return sum + words;
            }, 0);

            return {
              ...doc,
              wordGoal: newGoal,
              claimedQuests: updatedClaimed,
              battleDamageDealt: 0,
              battleStartWords: currentWords,
              lastModified: Date.now(),
            };
          }
        }
        return doc;
      })
    );
    
    handleAddRewards(finalXp, finalGold);

    // Track slain monsters count
    const currentSlain = stats.monstersSlainCount || 0;
    const newSlainCount = currentSlain + 1;
    
    setStats((prev) => {
      const updated = {
        ...prev,
        monstersSlainCount: newSlainCount,
      };
      
      // Save stats to user local storage partition immediately
      if (activeUser && theme) {
        localStorage.setItem(`pixelquest_${activeUser}_stats_${theme}`, JSON.stringify(updated));
      }
      return updated;
    });

    if (newSlainCount === 3 && !isWitchUnlocked()) {
      setTimeout(() => {
        setShowReviewPopup(true);
      }, 1500); // Small delay to let victory transition/level up screen play first
    }
  };

  const handleReviewSubmit = async (stars: number, feedback: string) => {
    sound.playCoin();
    
    const reviewData = {
      username: activeUser || 'Anonymous',
      stars,
      feedback,
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('reviews').insert(reviewData);
        if (error) {
          console.error('Failed to submit review to Supabase:', error.message);
        }
      } catch (err) {
        console.error('Failed to submit review to Supabase:', err);
      }
    } else {
      // Local fallback
      try {
        const existingReviewsStr = localStorage.getItem('pixelquest_global_reviews') || '[]';
        const existingReviews = JSON.parse(existingReviewsStr);
        existingReviews.push(reviewData);
        localStorage.setItem('pixelquest_global_reviews', JSON.stringify(existingReviews));
      } catch (err) {
        console.error('Failed to save review locally:', err);
      }
    }

    // Unlock Wicked Witch theme
    const user = localStorage.getItem('pixelquest_active_user');
    const globalKey = user ? `pixelquest_${user}_witch_unlocked` : `pixelquest_witch_unlocked`;
    localStorage.setItem(globalKey, 'true');

    setStats((prev) => {
      const updated = {
        ...prev,
        witchThemeUnlocked: true
      };
      if (activeUser && theme) {
        localStorage.setItem(`pixelquest_${activeUser}_stats_${theme}`, JSON.stringify(updated));
      }
      return updated;
    });

    setShowReviewPopup(false);

    // Show custom alert dialog to congratulate them
    setTimeout(() => {
      sound.playLevelUp();
      setLevelUpMessage('🔮 THE COVEN IS PLEASED! You have sealed the pact and unlocked the forbidden "Wicked Witch" theme! Select it in the theme dropdown menu at the top to brew your pages in the swamp night.');
      setShowLevelUpModal(true);
    }, 500);
  };

  // Sounds & Music toggles
  const handleToggleSound = () => {
    sound.toggle();
    setSoundEnabled(sound.getEnabled());
  };

  const handleToggleMusic = () => {
    sound.toggleMusic();
    setMusicEnabled(sound.getMusicEnabled());
  };

  // Claim XP/Gold rewards
  const handleAddRewards = (addedXp: number, addedGold: number) => {
    setStats((prev) => {
      let newXp = prev.xp + addedXp;
      let newLevel = prev.level;
      let newMaxXp = prev.maxXp;
      let leveledUp = false;

      while (newXp >= newMaxXp) {
        leveledUp = true;
        newLevel += 1;
        newXp -= newMaxXp;
        newMaxXp = Math.round(newMaxXp * 1.5);
      }

      if (leveledUp) {
        sound.playLevelUp();
        setLevelUpMessage(`LV. ${prev.level} -> LV. ${newLevel}! You gained a stats boost!`);
        setShowLevelUpModal(true);
      } else {
        sound.playCoin();
      }

      return {
        ...prev,
        level: newLevel,
        xp: newXp,
        maxXp: newMaxXp,
        gold: prev.gold + addedGold,
      };
    });
  };

  const handleBuyItem = (itemId: string, price: number) => {
    setStats((prev) => ({
      ...prev,
      gold: prev.gold - price,
      inventory: [...prev.inventory, itemId],
    }));
  };

  const handleAddNormalWords = (words: number) => {
    setStats((prev) => ({
      ...prev,
      normalWordsWritten: Math.max(0, (prev.normalWordsWritten || 0) + words),
    }));
  };

  // Backup Import/Export
  const handleExportData = () => {
    sound.playCoin();
    const exportPayload: any = {
      documents,
      stats
    };
    
    const themes = ['fantasy', 'cozy', 'horror', 'spaceship'];
    themes.forEach((t) => {
      const savedThemeStats = localStorage.getItem(`pixelquest_stats_${t}`);
      if (savedThemeStats) {
        exportPayload[`stats_${t}`] = JSON.parse(savedThemeStats);
      }
    });

    const dataStr = JSON.stringify(exportPayload);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `pixelquest_backup_${Date.now()}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (event.target.files && event.target.files[0]) {
      fileReader.readAsText(event.target.files[0], 'UTF-8');
      fileReader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          if (data.documents) {
            setDocuments(data.documents);
            
            // Restore theme-specific stats
            const themes = ['fantasy', 'cozy', 'horror', 'spaceship'];
            themes.forEach((t) => {
              if (data[`stats_${t}`]) {
                localStorage.setItem(`pixelquest_stats_${t}`, JSON.stringify(data[`stats_${t}`]));
              }
            });

            // Set current stats
            if (data[`stats_${theme}`]) {
              setStats(data[`stats_${theme}`]);
            } else if (data.stats) {
              setStats(data.stats);
              localStorage.setItem(`pixelquest_stats_${theme}`, JSON.stringify(data.stats));
            }

            sound.playLevelUp();
            setCustomAlert({
              title: '💾 System Restored',
              message: 'Chronicles and character data successfully loaded!',
              buttonText: 'Huzzah!'
            });
          } else {
            sound.playError();
            setCustomAlert({
              title: '💾 Load Failed',
              message: 'Invalid backup file structure.',
              buttonText: 'Acknowledge'
            });
          }
        } catch (err) {
          sound.playError();
          setCustomAlert({
            title: '💾 Parse Error',
            message: 'Failed to parse backup JSON.',
            buttonText: 'Acknowledge'
          });
        }
      };
    }
  };

  if (!activeUser) {
    return <AuthPage onLogin={handleLogin} />;
  }

  return (
    <div className={`app-container ${isDistractionFree ? 'distraction-free' : ''}`}>
      {/* Muted CRT scanlines filter */}
      <div className="crt-overlay" />

      {/* Header bar */}
      <header className="app-header crt-glow">
        <div className="logo-section">
          <span style={{ fontSize: '1.4rem' }}>⚔️</span>
          <span className="logo-text">Pixel Writer</span>
        </div>

        <div className="header-controls">
          {/* Ambient Music Toggle */}
          <button
            className={`pixel-btn ${musicEnabled ? 'pixel-btn-accent' : ''}`}
            onClick={handleToggleMusic}
            style={{ padding: '6px 10px' }}
            title={musicEnabled ? 'Stop ambient music' : 'Start ambient music'}
          >
            <Music size={14} />
            <span style={{ fontSize: '0.6rem', marginLeft: '4px' }}>
              {musicEnabled ? 'MUSIC: ON' : 'MUSIC: OFF'}
            </span>
          </button>

          {/* Music Volume Slider */}
          {musicEnabled && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={musicVolume}
                onChange={(e) => {
                  const vol = Number(e.target.value);
                  setMusicVolume(vol);
                  sound.setVolume(vol);
                }}
                className="pixel-slider"
                title="Music Volume"
              />
            </div>
          )}

          {/* Theme Selector */}
          <div ref={themeDropdownRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginRight: '6px' }}>Theme:</span>
            <button
              className="pixel-btn"
              onClick={() => {
                sound.playCoin();
                setIsThemeDropdownOpen(!isThemeDropdownOpen);
              }}
              style={{
                padding: '4px 8px',
                fontSize: '0.65rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                minWidth: '130px',
                justifyContent: 'space-between',
              }}
            >
              <span>{theme === 'cozy' ? 'Cozy Cottage' : theme === 'horror' ? 'Gothic' : theme === 'witch' ? 'Wicked Witch' : theme.charAt(0).toUpperCase() + theme.slice(1)}</span>
              <ChevronDown size={10} style={{ transform: isThemeDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
            </button>

            {isThemeDropdownOpen && (
              <div
                className="pixel-panel crt-glow"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  right: 0,
                  width: '150px',
                  backgroundColor: 'var(--panel-bg)',
                  zIndex: 2000,
                  padding: '4px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                }}
              >
                {[
                  { value: 'fantasy', label: 'Fantasy', locked: false },
                  { value: 'cozy', label: 'Cozy Cottage', locked: false },
                  { value: 'horror', label: 'Gothic', locked: false },
                  { value: 'spaceship', label: 'Spaceship', locked: false },
                  { value: 'witch', label: 'Wicked Witch', locked: !isWitchUnlocked() },
                ].map((item) => {
                  const isSelected = item.value === theme;
                  const labelText = item.locked ? `🔒 ${item.label}` : item.label;
                  return (
                    <div
                      key={item.value}
                      onClick={() => {
                        if (item.locked) {
                          sound.playError();
                          const maxSlain = getMaxMonstersSlain();
                          if (maxSlain >= 3) {
                            setIsThemeDropdownOpen(false);
                            setShowReviewPopup(true);
                          } else {
                            setCustomAlert({
                              title: '🔒 Coven Sealed',
                              message: `The Coven has sealed this theme! You have slain ${maxSlain}/3 beasts. Defeat 3 swamp beasts to earn their favor and brew a review to unlock the Wicked Witch theme.`,
                              buttonText: 'Flee',
                              themeClass: 'theme-witch'
                            });
                          }
                          return;
                        }
                        sound.playCoin();
                        const nextTheme = item.value;
                        // Save current stats before switching (user-scoped)
                        if (activeUser && theme) {
                          localStorage.setItem(`pixelquest_${activeUser}_stats_${theme}`, JSON.stringify(stats));
                        }
                        // Load next stats (user-scoped)
                        const userKey = activeUser ? `pixelquest_${activeUser}_stats_${nextTheme}` : `pixelquest_stats_${nextTheme}`;
                        const saved = localStorage.getItem(userKey);
                        const nextStats = saved ? { ...DEFAULT_STATS, ...JSON.parse(saved) } : { ...DEFAULT_STATS };
                        if (nextStats.normalWordsWritten === undefined) {
                          nextStats.normalWordsWritten = 0;
                        }
                        setStats(nextStats);
                        setTheme(nextTheme);
                        setIsThemeDropdownOpen(false);
                      }}
                      style={{
                        padding: '6px 8px',
                        cursor: 'pointer',
                        fontSize: '0.65rem',
                        fontFamily: 'var(--font-ui)',
                        color: isSelected ? 'var(--bg-primary)' : 'var(--text-primary)',
                        backgroundColor: isSelected ? 'var(--accent-color)' : 'transparent',
                        borderRadius: '2px',
                        transition: 'background-color 0.1s, color 0.1s',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      {labelText}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Settings button */}
          <button
            className="pixel-btn"
            onClick={() => {
              sound.playCoin();
              setIsSettingsOpen(true);
            }}
            style={{ padding: '6px 10px' }}
            title="Settings"
          >
            <Settings size={14} />
          </button>

          {/* Logout button */}
          {activeUser && (
            <button
              className="pixel-btn"
              onClick={() => {
                sound.playHit();
                handleLogout();
              }}
              style={{ padding: '6px 10px' }}
              title="Logout"
            >
              <span style={{ fontSize: '0.6rem', marginRight: '4px' }}>{activeUser.toUpperCase()}</span>
              <LogOut size={14} />
            </button>
          )}
        </div>
      </header>

      {isMobile ? (
        <>
          {activeView === 'sidebar' && (
            <Sidebar
              documents={documents}
              activeDocId={activeDocId}
              onSelectDoc={handleSelectDoc}
              onCreateDoc={handleCreateDoc}
              onRenameDoc={handleRenameDoc}
              onDeleteDoc={handleDeleteDoc}
              localFolderName={localFolderName}
              localFolderState={localFolderState}
              onLinkFolder={handleLinkFolder}
              onUnlinkFolder={handleUnlinkFolder}
              onReauthFolder={handleReauthFolder}
              onSelectChapter={handleSelectChapter}
              onAddChapter={handleAddChapter}
              onRenameChapter={handleRenameChapter}
              onDeleteChapter={handleDeleteChapter}
              onForceSave={handleForceSave}
            />
          )}
          {activeView === 'editor' && (
            <Editor
              document={activeDoc}
              onUpdateContent={handleUpdateContent}
              onUpdateGoal={handleUpdateGoal}
              isDistractionFree={isDistractionFree}
              onToggleDistractionFree={() => setIsDistractionFree(!isDistractionFree)}
              fontSize={fontSize}
              onUpdateFontSize={setFontSize}
              theme={theme}
            />
          )}
          {activeView === 'shop' && (
            <ShopPanel
              stats={stats}
              onBuyItem={handleBuyItem}
              onCloseShop={() => setActiveView('editor')}
              theme={theme}
            />
          )}
          {activeView === 'rpg' && (
            <RPGPanel
              stats={stats}
              activeDoc={activeDoc}
              theme={theme}
              onAddRewards={handleAddRewards}
              onSetQuestInDoc={handleSetQuestInDoc}
              onSwitchToShop={() => setActiveView('shop')}
              challengeActive={challengeActive}
              challengeTimer={challengeTimer}
              challengeSuccess={challengeSuccess}
              challengeWordTarget={challengeWordTarget}
              challengeRewards={challengeRewards}
              onStartChallenge={handleStartChallenge}
              onCancelChallenge={handleCancelChallenge}
              onClaimProgressionQuest={handleClaimProgressionQuest}
              onUpdateGoal={handleUpdateGoal}
              onAddNormalWords={handleAddNormalWords}
              onDealDamage={handleDealDamage}
            />
          )}

          {/* Mobile Bottom Navigation Bar */}
          <div className="mobile-nav-bar crt-glow">
            <button
              className={`pixel-btn ${activeView === 'sidebar' ? 'pixel-btn-accent' : ''}`}
              onClick={() => {
                sound.playCoin();
                setActiveView('sidebar');
              }}
              style={{ flex: 1, height: '100%', fontSize: '0.55rem', padding: '4px', margin: '0 2px' }}
            >
              📜 Scrolls
            </button>
            <button
              className={`pixel-btn ${activeView === 'editor' ? 'pixel-btn-accent' : ''}`}
              onClick={() => {
                sound.playCoin();
                setActiveView('editor');
              }}
              style={{ flex: 1, height: '100%', fontSize: '0.55rem', padding: '4px', margin: '0 2px' }}
            >
              ✍️ Write
            </button>
            <button
              className={`pixel-btn ${activeView === 'rpg' ? 'pixel-btn-accent' : ''}`}
              onClick={() => {
                sound.playCoin();
                setActiveView('rpg');
              }}
              style={{ flex: 1, height: '100%', fontSize: '0.55rem', padding: '4px', margin: '0 2px' }}
            >
              ⚔️ Quest
            </button>
            <button
              className={`pixel-btn ${activeView === 'shop' ? 'pixel-btn-accent' : ''}`}
              onClick={() => {
                sound.playCoin();
                setActiveView('shop');
              }}
              style={{ flex: 1, height: '100%', fontSize: '0.55rem', padding: '4px', margin: '0 2px' }}
            >
              🛒 Shop
            </button>
          </div>
        </>
      ) : (
        <>
          {/* Sidebar - Chronicles */}
          <Sidebar
            documents={documents}
            activeDocId={activeDocId}
            onSelectDoc={handleSelectDoc}
            onCreateDoc={handleCreateDoc}
            onRenameDoc={handleRenameDoc}
            onDeleteDoc={handleDeleteDoc}
            localFolderName={localFolderName}
            localFolderState={localFolderState}
            onLinkFolder={handleLinkFolder}
            onUnlinkFolder={handleUnlinkFolder}
            onReauthFolder={handleReauthFolder}
            onSelectChapter={handleSelectChapter}
            onAddChapter={handleAddChapter}
            onRenameChapter={handleRenameChapter}
            onDeleteChapter={handleDeleteChapter}
            onForceSave={handleForceSave}
          />

          {/* Center - Editor / Shop */}
          {activeView === 'editor' ? (
            <Editor
              document={activeDoc}
              onUpdateContent={handleUpdateContent}
              onUpdateGoal={handleUpdateGoal}
              isDistractionFree={isDistractionFree}
              onToggleDistractionFree={() => setIsDistractionFree(!isDistractionFree)}
              fontSize={fontSize}
              onUpdateFontSize={setFontSize}
              theme={theme}
            />
          ) : (
            <ShopPanel
              stats={stats}
              onBuyItem={handleBuyItem}
              onCloseShop={() => setActiveView('editor')}
              theme={theme}
            />
          )}

          {/* Right - RPG Panel */}
          <RPGPanel
            stats={stats}
            activeDoc={activeDoc}
            theme={theme}
            onAddRewards={handleAddRewards}
            onSetQuestInDoc={handleSetQuestInDoc}
            onSwitchToShop={() => setActiveView('shop')}
            challengeActive={challengeActive}
            challengeTimer={challengeTimer}
            challengeSuccess={challengeSuccess}
            challengeWordTarget={challengeWordTarget}
            challengeRewards={challengeRewards}
            onStartChallenge={handleStartChallenge}
            onCancelChallenge={handleCancelChallenge}
            onClaimProgressionQuest={handleClaimProgressionQuest}
            onUpdateGoal={handleUpdateGoal}
            onAddNormalWords={handleAddNormalWords}
            onDealDamage={handleDealDamage}
          />
        </>
      )}

      {/* Settings Modal Dialog */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        onExportData={handleExportData}
        onImportData={handleImportData}
      />

      {/* Level Up congratulatory popup */}
      {showLevelUpModal && (
        <div className="dialog-backdrop" style={{ zIndex: 1002 }}>
          <div className={`pixel-panel pixel-dialog crt-glow ${levelUpMessage.includes('COVEN') ? 'theme-witch' : ''}`} style={{ width: '320px', textAlign: 'center' }}>
            <div className="pixel-panel-header">Level Up!</div>
            <Sparkles size={48} style={{ color: 'var(--accent-color)', margin: '16px auto' }} />
            <h3 style={{ fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '8px' }}>CONGRATULATIONS!</h3>
            <p style={{ fontSize: '0.7rem', lineHeight: '1.5', marginBottom: '20px' }}>
              {levelUpMessage}
            </p>
            <button
              className="pixel-btn pixel-btn-accent"
              onClick={() => {
                sound.playCoin();
                setShowLevelUpModal(false);
              }}
              style={{ width: '100%' }}
            >
              Onward, Adventurer!
            </button>
          </div>
        </div>
      )}

      {/* Tavern Review Request Modal */}
      {showReviewPopup && (
        <div className="dialog-backdrop" style={{ zIndex: 1002 }}>
          <div className="pixel-panel pixel-dialog crt-glow theme-witch" style={{ width: '400px' }}>
            <div className="pixel-panel-header">🔮 Witches’ Coven Pact 🔮</div>
            
            <p style={{ fontSize: '0.65rem', lineHeight: '1.6', marginBottom: '16px', color: 'var(--text-primary)' }}>
              Greetings, adventurer! You have slain 3 beasts! 
              The Swamp Coven requests a review in our magical database to spread the word. 
              Cast your thoughts into the cauldron to seal the pact and unlock the forbidden **Wicked Witch** theme!
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '16px' }}>
              {/* Star Rating Select */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>COVEN RATING (STARS):</span>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isSelected = star <= reviewStars;
                    return (
                      <span
                        key={star}
                        onClick={() => {
                          sound.playTypeClick();
                          setReviewStars(star);
                        }}
                        style={{
                          fontSize: '1.5rem',
                          cursor: 'pointer',
                          color: isSelected ? 'var(--accent-color)' : 'var(--text-secondary)',
                          textShadow: isSelected ? '0 0 5px var(--accent-color)' : 'none',
                          transition: 'color 0.1s'
                        }}
                      >
                        ★
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Feedback Comment Text Area */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>TRANSCRIBE YOUR HEX OR BLESSING:</label>
                <textarea
                  className="pixel-input"
                  rows={3}
                  value={reviewFeedback}
                  onChange={(e) => setReviewFeedback(e.target.value)}
                  style={{
                    width: '100%',
                    resize: 'none',
                    fontSize: '0.65rem',
                    lineHeight: '1.4',
                    fontFamily: 'Courier Prime, monospace',
                    padding: '8px',
                  }}
                  placeholder="Cast your words into the brew... how has your journey been?"
                  maxLength={500}
                />
              </div>
            </div>

            <div className="dialog-buttons">
              <button
                className="pixel-btn"
                onClick={() => {
                  sound.playHit();
                  setShowReviewPopup(false);
                }}
              >
                Flee
              </button>
              <button
                className="pixel-btn pixel-btn-accent"
                onClick={() => {
                  if (!reviewFeedback.trim()) {
                    sound.playHit();
                    setCustomAlert({
                      title: '🔮 Cauldron Empty',
                      message: 'Please write a quick comment to brew the potion!',
                      buttonText: 'Acknowledge',
                      themeClass: 'theme-witch'
                    });
                    return;
                  }
                  handleReviewSubmit(reviewStars, reviewFeedback);
                }}
                disabled={reviewStars < 1 || reviewStars > 5}
              >
                Seal Pact
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert Modal Dialog */}
      {customAlert && (
        <div className="dialog-backdrop" style={{ zIndex: 1003 }}>
          <div className={`pixel-panel pixel-dialog crt-glow ${customAlert.themeClass || ''}`} style={{ width: '360px', textAlign: 'center' }}>
            <div className="pixel-panel-header">{customAlert.title}</div>
            <p style={{ fontSize: '0.65rem', lineHeight: '1.6', margin: '20px 0', color: 'var(--text-primary)' }}>
              {customAlert.message}
            </p>
            <button
              className="pixel-btn pixel-btn-accent"
              onClick={() => {
                sound.playCoin();
                setCustomAlert(null);
              }}
              style={{ width: '100%' }}
            >
              {customAlert.buttonText || 'OK'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
