import React, { useRef, useEffect, useState } from 'react';
import type { Document } from '../App';
import { Eye, EyeOff, BookOpen, Clock, Target, ChevronDown } from 'lucide-react';
import { sound } from '../utils/audio';
import { QUEST_CONFIGS, getMonsterData } from './RPGPanel';

interface EditorProps {
  document: Document | null;
  onUpdateContent: (content: string) => void;
  onUpdateGoal: (goal: number, battleMode?: 'progression' | 'single', selectedMonsterId?: string) => void;
  isDistractionFree: boolean;
  onToggleDistractionFree: () => void;
  fontSize: string;
  onUpdateFontSize: (size: string) => void;
  theme: string;
  isMobile?: boolean;
}

export default function Editor({
  document: doc,
  onUpdateContent,
  onUpdateGoal,
  isDistractionFree,
  onToggleDistractionFree,
  fontSize,
  onUpdateFontSize,
  theme,
  isMobile = false,
}: EditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Focus textarea when document changes
  useEffect(() => {
    if (doc && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [doc?.id]);

  if (!doc) {
    return (
      <div
        className="editor-panel"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: '40px',
          textAlign: 'center',
        }}
      >
        <div className="pixel-panel crt-glow" style={{ maxWidth: '500px' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '16px', color: 'var(--accent-color)' }}>
            Welcome, Scribe!
          </h2>
          <p style={{ fontSize: '0.8rem', lineHeight: '1.6', marginBottom: '20px' }}>
            Choose an existing scroll from the left ledger, or draft a new chronicle to start your writing quest.
          </p>
          <div style={{ fontSize: '1.5rem', opacity: 0.8 }}>🗡️ 📜 ☕ 🚀</div>
        </div>
      </div>
    );
  }

  // Calculate active chapter stats
  const activeChapter = doc.chapters.find((ch) => ch.id === doc.activeChapterId) || doc.chapters[0];
  const cleanContent = activeChapter ? activeChapter.content : '';
  const charCount = cleanContent.length;
  const wordCount = cleanContent ? cleanContent.trim().split(/\s+/).filter(Boolean).length : 0;
  const readTime = Math.ceil(wordCount / 200); // 200 words per minute average reading speed

  // Cumulative document word count
  const totalWordCount = doc.chapters.reduce((sum, ch) => {
    const w = ch.content ? ch.content.trim().split(/\s+/).filter(Boolean).length : 0;
    return sum + w;
  }, 0);

  const activeQuest = doc.battleMode === 'single'
    ? (QUEST_CONFIGS.find((q) => q.id === doc.selectedMonsterId) || QUEST_CONFIGS[0])
    : (QUEST_CONFIGS.find(
        (q) =>
          q.wordCount <= doc.wordGoal &&
          !(doc.claimedQuests || []).includes(q.id)
      ) || QUEST_CONFIGS[0]);
  const activeMonster = getMonsterData(theme, activeQuest.id);

  // Handle typing keydown sound
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Only play clicks for visible/character keypresses (ignore modifiers/arrows)
    if (
      e.key.length === 1 ||
      e.key === 'Backspace' ||
      e.key === 'Enter' ||
      e.key === 'Space'
    ) {
      sound.playTypeClick();
    }
  };

  // Theme-specific placeholders
  const getPlaceholderText = () => {
    switch (theme) {
      case 'cozy':
        return 'Write your thoughts down. The fireplace is crackling, take a sip of tea... ☕';
      case 'horror':
        return 'Describe the shadows creeping up the castle walls... The spirits await your words. 💀';
      case 'spaceship':
        return 'Awaiting command line input. Enter ship logs or crew status updates... 🛰️';
      case 'fantasy':
      default:
        return 'Scribe, record your heroic legend here... The tavern awaits your chronicle. 📜';
    }
  };

  return (
    <div className="editor-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: isMobile ? '6px' : '16px' }}>
      
      {/* Editor Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: isMobile ? '6px' : '12px',
          gap: '8px',
        }}
      >
        {isMobile ? (
          <>
            {/* Mobile Header: Single line title + Target Quest dropdown on the same row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {doc.title} &gt; {activeChapter ? activeChapter.title : 'Chapter 1'}
              </span>
            </div>

            {/* Quest Dropdown directly next to it */}
            <div ref={dropdownRef} style={{ position: 'relative', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <Target size={12} style={{ color: 'var(--accent-color)', marginRight: '4px' }} />
              <button
                className="pixel-btn"
                onClick={() => {
                  sound.playCoin();
                  setIsDropdownOpen(!isDropdownOpen);
                }}
                style={{
                  padding: '4px 6px',
                  fontSize: '0.55rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  maxWidth: '150px',
                  justifyContent: 'space-between',
                }}
              >
                {doc.battleMode === 'single' ? (
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>S: {activeMonster.name}</span>
                ) : (
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Q: {activeMonster.name}</span>
                )}
                <ChevronDown size={8} style={{ transform: isDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
              </button>

              {isDropdownOpen && (
                <div
                  className="pixel-panel crt-glow"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    right: 0,
                    width: '200px',
                    backgroundColor: 'var(--panel-bg)',
                    zIndex: 200,
                    padding: '4px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                  }}
                >
                  {/* Campaign Mode Option */}
                  <div
                    onClick={() => {
                      sound.playCoin();
                      onUpdateGoal(5000, 'progression');
                      setIsDropdownOpen(false);
                    }}
                    style={{
                      padding: '6px 8px',
                      cursor: 'pointer',
                      fontSize: '0.6rem',
                      fontFamily: 'var(--font-ui)',
                      color: doc.battleMode === 'progression' ? 'var(--bg-primary)' : 'var(--text-primary)',
                      backgroundColor: doc.battleMode === 'progression' ? 'var(--accent-color)' : 'transparent',
                      transition: 'background-color 0.1s, color 0.1s',
                      borderRadius: '2px',
                      fontWeight: 'bold',
                      borderBottom: '1px dashed var(--border-color)',
                      marginBottom: '4px',
                    }}
                  >
                    ⚔️ Quest (Progressive)
                  </div>

                  {QUEST_CONFIGS.map((q) => {
                    const monster = getMonsterData(theme, q.id);
                    const isSelected = doc.battleMode === 'single' && q.id === doc.selectedMonsterId;
                    return (
                      <div
                        key={q.id}
                        onClick={() => {
                          sound.playCoin();
                          onUpdateGoal(q.wordCount, 'single', q.id);
                          setIsDropdownOpen(false);
                        }}
                        style={{
                          padding: '6px 8px',
                          cursor: 'pointer',
                          fontSize: '0.55rem',
                          fontFamily: 'var(--font-ui)',
                          color: isSelected ? 'var(--bg-primary)' : 'var(--text-primary)',
                          backgroundColor: isSelected ? 'var(--accent-color)' : 'transparent',
                          transition: 'background-color 0.1s, color 0.1s',
                          borderRadius: '2px',
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span>Single: {monster.name}</span>
                        <span style={{ fontSize: '0.5rem', opacity: 0.8 }}>({q.wordCount}w)</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Desktop Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Chronicle:</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>
                {doc.title}
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>&gt; Chapter:</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 'bold', borderBottom: '2px solid var(--border-color)', paddingBottom: '2px' }}>
                {activeChapter ? activeChapter.title : 'Chapter 1'}
              </span>
            </div>

            {/* Goal Selector & Distraction Free toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              
              {/* Font Size Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Font:</span>
                <select
                  className="pixel-input"
                  value={fontSize}
                  onChange={(e) => {
                    sound.playCoin();
                    onUpdateFontSize(e.target.value);
                  }}
                  style={{ padding: '2px 4px', fontSize: '0.65rem', cursor: 'pointer' }}
                >
                  <option value="14px">14px</option>
                  <option value="16px">16px</option>
                  <option value="18px">18px</option>
                  <option value="20px">20px</option>
                  <option value="24px">24px</option>
                </select>
              </div>

              <div ref={dropdownRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Target size={14} style={{ color: 'var(--accent-color)', marginRight: '6px' }} />
                <button
                  className="pixel-btn"
                  onClick={() => {
                    sound.playCoin();
                    setIsDropdownOpen(!isDropdownOpen);
                  }}
                  style={{
                    padding: '4px 8px',
                    fontSize: '0.6rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    minWidth: '180px',
                    justifyContent: 'space-between',
                  }}
                >
                  {doc.battleMode === 'single' ? (
                    <span>Single: {activeMonster.name} ({activeQuest.wordCount}w)</span>
                  ) : (
                    <span>Quest: {activeMonster.name} ({activeQuest.wordCount}w)</span>
                  )}
                  <ChevronDown size={10} style={{ transform: isDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                </button>

                {isDropdownOpen && (
                  <div
                    className="pixel-panel crt-glow"
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 4px)',
                      right: 0,
                      width: '240px',
                      backgroundColor: 'var(--panel-bg)',
                      zIndex: 200,
                      padding: '4px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                    }}
                  >
                    {/* Campaign Mode Option */}
                    <div
                      onClick={() => {
                        sound.playCoin();
                        onUpdateGoal(5000, 'progression');
                        setIsDropdownOpen(false);
                      }}
                      style={{
                        padding: '6px 8px',
                        cursor: 'pointer',
                        fontSize: '0.6rem',
                        fontFamily: 'var(--font-ui)',
                        color: doc.battleMode === 'progression' ? 'var(--bg-primary)' : 'var(--text-primary)',
                        backgroundColor: doc.battleMode === 'progression' ? 'var(--accent-color)' : 'transparent',
                        transition: 'background-color 0.1s, color 0.1s',
                        borderRadius: '2px',
                        fontWeight: 'bold',
                        borderBottom: '1px dashed var(--border-color)',
                        marginBottom: '4px',
                      }}
                      onMouseEnter={(e) => {
                        if (doc.battleMode !== 'progression') {
                          e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (doc.battleMode !== 'progression') {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      ⚔️ Quest (Progressive)
                    </div>

                    {QUEST_CONFIGS.map((q) => {
                      const monster = getMonsterData(theme, q.id);
                      const isSelected = doc.battleMode === 'single' && q.id === doc.selectedMonsterId;
                      return (
                        <div
                          key={q.id}
                          onClick={() => {
                            sound.playCoin();
                            onUpdateGoal(q.wordCount, 'single', q.id);
                            setIsDropdownOpen(false);
                          }}
                          style={{
                            padding: '6px 8px',
                            cursor: 'pointer',
                            fontSize: '0.6rem',
                            fontFamily: 'var(--font-ui)',
                            color: isSelected ? 'var(--bg-primary)' : 'var(--text-primary)',
                            backgroundColor: isSelected ? 'var(--accent-color)' : 'transparent',
                            transition: 'background-color 0.1s, color 0.1s',
                            borderRadius: '2px',
                            display: 'flex',
                            justifyContent: 'space-between',
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
                          <span>Single: {monster.name}</span>
                          <span style={{ fontSize: '0.55rem', opacity: 0.8 }}>({q.wordCount} words)</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                className="pixel-btn"
                onClick={() => {
                  sound.playCoin();
                  onToggleDistractionFree();
                }}
                style={{ padding: '6px 10px' }}
                title={isDistractionFree ? 'Show HUD Panels' : 'Distraction-Free Mode'}
              >
                {isDistractionFree ? <Eye size={14} /> : <EyeOff size={14} />}
                <span style={{ fontSize: '0.6rem', marginLeft: '4px' }}>
                  {isDistractionFree ? 'SHOW HUD' : 'FOCUS'}
                </span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Main Textarea Canvas */}
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        <textarea
          ref={textareaRef}
          className="editor-textarea"
          value={cleanContent}
          onChange={(e) => onUpdateContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={getPlaceholderText()}
          style={{
            width: '100%',
            height: '100%',
            outline: 'none',
            resize: 'none',
            fontSize: fontSize,
            padding: isMobile ? '10px' : '20px',
            border: 'var(--border-width) var(--border-style) var(--border-color)',
            backgroundColor: 'var(--bg-editor)',
            color: 'var(--text-editor)',
            fontFamily: 'var(--font-editor)',
            lineHeight: '1.6',
            boxShadow: 'var(--box-shadow-inset)',
          }}
        />
      </div>

      {/* Editor Footer / Metrics */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: isMobile ? '6px' : '12px',
          fontSize: '0.65rem',
          color: 'var(--text-secondary)',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', gap: isMobile ? '8px' : '16px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <BookOpen size={12} /> {wordCount} W
          </span>
          {!isMobile && (
            <>
              <span>
                {charCount} Chars
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={12} /> ~{readTime} Min
              </span>
            </>
          )}
        </div>

        {/* Quest/Goal Progress bar */}
        {(() => {
          const runWords = Math.max(0, totalWordCount - (doc.battleStartWords || 0));
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: isMobile ? '120px' : '180px' }}>
              <span style={{ fontSize: '0.55rem' }}>Goal:</span>
              <div
                style={{
                  flex: 1,
                  height: '8px',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${Math.min(100, (runWords / doc.wordGoal) * 100)}%`,
                    height: '100%',
                    backgroundColor: 'var(--accent-color)',
                    transition: 'width 0.2s',
                  }}
                />
              </div>
              <span style={{ fontWeight: 'bold', fontSize: '0.55rem', color: runWords >= doc.wordGoal ? 'var(--accent-color)' : 'inherit' }}>
                {runWords}/{doc.wordGoal} ({Math.round(Math.min(100, (runWords / doc.wordGoal) * 100))}%)
              </span>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
