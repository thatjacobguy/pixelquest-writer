import React, { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Editor from './components/Editor';
import RPGPanel, { QUEST_CONFIGS } from './components/RPGPanel';
import ShopPanel from './components/ShopPanel';
import SettingsModal from './components/SettingsModal';
import { sound } from './utils/audio';
import { saveFolderHandle, getFolderHandle } from './utils/db';
import { Settings, Sparkles, Music, ChevronDown } from 'lucide-react';

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
}

const DEFAULT_STATS: CharacterStats = {
  level: 1,
  xp: 0,
  maxXp: 100,
  gold: 0,
  inventory: [],
  normalWordsWritten: 0,
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

// Helper to parse and migrate documents from legacy format
const getInitialDocs = (): Document[] => {
  const saved = localStorage.getItem('pixelquest_docs');
  if (!saved) return DEFAULT_DOCS;
  try {
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed)) {
      return parsed.map((doc: any) => {
        if (!doc.chapters) {
          const chId = `${doc.id}-ch1`;
          return {
            id: doc.id,
            title: doc.title || 'Untitled',
            chapters: [
              {
                id: chId,
                title: 'Chapter 1',
                content: doc.content || '',
              },
            ],
            activeChapterId: chId,
            wordGoal: doc.wordGoal || 100,
            questId: doc.questId || '',
            questCompleted: doc.questCompleted || false,
            lastModified: doc.lastModified || Date.now(),
            driveFileId: doc.driveFileId,
            claimedQuests: doc.claimedQuests || [],
            battleMode: 'progression',
            selectedMonsterId: '',
          };
        }
        if (!doc.battleMode) {
          return {
            ...doc,
            battleMode: 'progression',
            selectedMonsterId: '',
          };
        }
        return doc;
      });
    }
  } catch (e) {
    console.error('Failed to parse saved documents:', e);
  }
  return DEFAULT_DOCS;
};

export default function App() {
  // Global States
  const [documents, setDocuments] = useState<Document[]>(getInitialDocs);

  const [activeDocId, setActiveDocId] = useState<string | null>(() => {
    const saved = localStorage.getItem('pixelquest_active_doc_id');
    return saved || (DEFAULT_DOCS[0]?.id || null);
  });

  const [stats, setStats] = useState<CharacterStats>(() => {
    const activeTheme = localStorage.getItem('pixelquest_theme') || 'fantasy';
    const savedThemeStats = localStorage.getItem(`pixelquest_stats_${activeTheme}`);
    if (savedThemeStats) {
      const parsed = JSON.parse(savedThemeStats);
      if (parsed.normalWordsWritten === undefined) {
        parsed.normalWordsWritten = 0;
      }
      return parsed;
    }
    
    // Check if there are legacy global stats to migrate
    const legacyStats = localStorage.getItem('pixelquest_stats');
    if (legacyStats) {
      const parsed = JSON.parse(legacyStats);
      if (parsed.normalWordsWritten === undefined) {
        parsed.normalWordsWritten = 0;
      }
      localStorage.setItem(`pixelquest_stats_${activeTheme}`, JSON.stringify(parsed));
      localStorage.removeItem('pixelquest_stats');
      return parsed;
    }
    
    return DEFAULT_STATS;
  });

  const [theme, setTheme] = useState<string>(() => {
    return localStorage.getItem('pixelquest_theme') || 'fantasy';
  });

  const [fontSize, setFontSize] = useState<string>(() => {
    return localStorage.getItem('pixelquest_font_size') || '18px';
  });

  const themeDropdownRef = useRef<HTMLDivElement>(null);
  const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState<boolean>(false);

  const [isDistractionFree, setIsDistractionFree] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<'editor' | 'shop'>('editor');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(sound.getEnabled());
  const [musicEnabled, setMusicEnabled] = useState<boolean>(sound.getMusicEnabled());
  const [musicVolume, setMusicVolume] = useState<number>(() => sound.getVolume());
  const [showLevelUpModal, setShowLevelUpModal] = useState<boolean>(false);
  const [levelUpMessage, setLevelUpMessage] = useState<string>('');

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
    localStorage.setItem('pixelquest_docs', JSON.stringify(documents));
  }, [documents]);

  useEffect(() => {
    localStorage.setItem(`pixelquest_stats_${theme}`, JSON.stringify(stats));
  }, [stats, theme]);

  useEffect(() => {
    localStorage.setItem('pixelquest_font_size', fontSize);
  }, [fontSize]);

  useEffect(() => {
    if (activeDocId) {
      localStorage.setItem('pixelquest_active_doc_id', activeDocId);
    } else {
      localStorage.removeItem('pixelquest_active_doc_id');
    }
  }, [activeDocId]);

  useEffect(() => {
    localStorage.setItem('pixelquest_theme', theme);
    document.body.className = `theme-${theme}`;
    sound.changeMusicTheme(theme);
  }, [theme]);

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


  // Load Folder Handle from IndexedDB on mount
  useEffect(() => {
    const loadFolder = async () => {
      try {
        const handle = await getFolderHandle();
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
        }
      } catch (e) {
        console.error('Failed to load folder handle from IndexedDB', e);
      }
    };
    loadFolder();
  }, []);

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
      alert('Your browser does not support the File System Access API. Please use a Chromium-based browser (Chrome, Edge, Opera) to link a local folder.');
      sound.playError();
      return;
    }
    try {
      const handle = await (window as any).showDirectoryPicker();
      setLocalFolderHandle(handle);
      setLocalFolderName(handle.name);
      setLocalFolderState('connected');
      await saveFolderHandle(handle);
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
    await saveFolderHandle(null);
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
            alert('A chronicle must have at least one chapter!');
            sound.playError();
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
          return {
            ...doc,
            battleDamageDealt: (doc.battleDamageDealt || 0) + damage,
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
      normalWordsWritten: (prev.normalWordsWritten || 0) + words,
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
            alert('Chronicles and character data successfully loaded!');
          } else {
            sound.playError();
            alert('Invalid backup file structure.');
          }
        } catch (err) {
          sound.playError();
          alert('Failed to parse backup JSON.');
        }
      };
    }
  };

  return (
    <div className={`app-container ${isDistractionFree ? 'distraction-free' : ''}`}>
      {/* Muted CRT scanlines filter */}
      <div className="crt-overlay" />

      {/* Header bar */}
      <header className="app-header crt-glow">
        <div className="logo-section">
          <span style={{ fontSize: '1.4rem' }}>⚔️</span>
          <span className="logo-text">PixelQuest Writer</span>
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
              <span>{theme === 'cozy' ? 'Cozy Cottage' : theme === 'horror' ? 'Gothic' : theme.charAt(0).toUpperCase() + theme.slice(1)}</span>
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
                  { value: 'fantasy', label: 'Fantasy' },
                  { value: 'cozy', label: 'Cozy Cottage' },
                  { value: 'horror', label: 'Gothic' },
                  { value: 'spaceship', label: 'Spaceship' },
                ].map((item) => {
                  const isSelected = item.value === theme;
                  return (
                    <div
                      key={item.value}
                      onClick={() => {
                        sound.playCoin();
                        const nextTheme = item.value;
                        // Save current stats before switching
                        localStorage.setItem(`pixelquest_stats_${theme}`, JSON.stringify(stats));
                        // Load next stats
                        const saved = localStorage.getItem(`pixelquest_stats_${nextTheme}`);
                        const nextStats = saved ? JSON.parse(saved) : { ...DEFAULT_STATS };
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
                      {item.label}
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
          >
            <Settings size={14} />
          </button>
        </div>
      </header>

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
          <div className="pixel-panel pixel-dialog crt-glow" style={{ width: '320px', textAlign: 'center' }}>
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
    </div>
  );
}
