import React, { useState } from 'react';
import type { Document } from '../App';
import { Plus, Trash2, Edit2, Check, FileText, Folder, Save } from 'lucide-react';
import { sound } from '../utils/audio';

interface SidebarProps {
  documents: Document[];
  activeDocId: string | null;
  onSelectDoc: (id: string) => void;
  onCreateDoc: () => void;
  onRenameDoc: (id: string, newTitle: string) => void;
  onDeleteDoc: (id: string) => void;
  // Local Folder state
  localFolderName: string | null;
  localFolderState: 'connected' | 'needs_reauth' | 'none';
  onLinkFolder: () => void;
  onUnlinkFolder: () => void;
  onReauthFolder: () => void;
  // Chapter handlers
  onSelectChapter: (docId: string, chapterId: string) => void;
  onAddChapter: (docId: string) => void;
  onRenameChapter: (docId: string, chapterId: string, newTitle: string) => void;
  onDeleteChapter: (docId: string, chapterId: string) => void;
  onForceSave: () => void;
  isMobile?: boolean;
}

export default function Sidebar({
  documents,
  activeDocId,
  onSelectDoc,
  onCreateDoc,
  onRenameDoc,
  onDeleteDoc,
  localFolderName,
  localFolderState,
  onLinkFolder,
  onUnlinkFolder,
  onReauthFolder,
  onSelectChapter,
  onAddChapter,
  onRenameChapter,
  onDeleteChapter,
  onForceSave,
  isMobile = false,
}: SidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempTitle, setTempTitle] = useState('');
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [tempChapterTitle, setTempChapterTitle] = useState('');

  const handleStartEdit = (doc: Document, e: React.MouseEvent) => {
    e.stopPropagation();
    sound.playTypeClick();
    setEditingId(doc.id);
    setTempTitle(doc.title);
  };

  const handleSaveRename = (id: string) => {
    if (tempTitle.trim()) {
      onRenameDoc(id, tempTitle.trim());
      sound.playCoin();
    }
    setEditingId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      handleSaveRename(id);
    } else if (e.key === 'Escape') {
      setEditingId(null);
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this chronicle from your scrolls?')) {
      onDeleteDoc(id);
      sound.playHit();
    } else {
      sound.playError();
    }
  };

  const handleSaveChapterRename = (docId: string, chapterId: string) => {
    if (tempChapterTitle.trim()) {
      onRenameChapter(docId, chapterId, tempChapterTitle.trim());
    }
    setEditingChapterId(null);
  };

  return (
    <div className="sidebar-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      
      {/* Save Status & Manual Save Panel */}
      <div className="pixel-panel" style={{ margin: '8px 8px 4px 8px', padding: '8px', fontSize: '0.7rem' }}>
        <div className="pixel-panel-header" style={{ fontSize: '0.65rem' }}>Tavern Ledger Sync</div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '0.55rem', color: 'var(--text-secondary)' }}>
            Progress auto-saves to browser storage.
          </div>
          
          <button 
            className="pixel-btn pixel-btn-accent" 
            onClick={onForceSave}
            disabled={!activeDocId}
            style={{ width: '100%', padding: '6px', fontSize: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <Save size={12} />
            SAVE SCROLLS NOW
          </button>
        </div>
      </div>

      {/* Local Folder Sync Panel - hidden on mobile (File System Access API not supported on iOS) */}
      {!isMobile && (
        <div className="pixel-panel" style={{ margin: '0 8px 8px 8px', padding: '8px', fontSize: '0.7rem' }}>
          <div className="pixel-panel-header" style={{ fontSize: '0.65rem' }}>Local Desktop Export</div>
          
          {localFolderState === 'connected' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-color)', overflow: 'hidden' }}>
                <Folder size={14} style={{ flexShrink: 0 }} />
                <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={localFolderName || ''}>
                  {localFolderName || 'Desktop Folder'}
                </span>
              </div>
              
              <button 
                className="pixel-btn" 
                onClick={onUnlinkFolder}
                style={{ width: '100%', padding: '4px 6px', fontSize: '0.6rem', color: 'var(--text-secondary)' }}
              >
                UNLINK FOLDER
              </button>
            </div>
          )}

          {localFolderState === 'needs_reauth' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#eab308', overflow: 'hidden' }}>
                <Folder size={14} style={{ flexShrink: 0 }} />
                <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={localFolderName || ''}>
                  {localFolderName || 'Desktop Folder'}
                </span>
              </div>
              
              <button 
                className="pixel-btn pixel-btn-accent" 
                onClick={onReauthFolder}
                style={{ width: '100%', padding: '4px 6px', fontSize: '0.6rem' }}
              >
                RE-AUTHORIZE
              </button>
            </div>
          )}

          {localFolderState === 'none' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button 
                className="pixel-btn" 
                onClick={onLinkFolder}
                style={{ width: '100%', padding: '4px 6px', fontSize: '0.6rem' }}
              >
                LINK LOCAL FOLDER
              </button>
            </div>
          )}
        </div>
      )}

      {/* Document Control Header */}
      <div style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Chronicles</span>
        <button className="pixel-btn pixel-btn-accent" onClick={onCreateDoc} style={{ padding: '4px 8px' }} title="New Chronicle">
          <Plus size={12} />
        </button>
      </div>

      {/* Document List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 8px 8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {documents.length === 0 ? (
          <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '20px 0' }}>
            Scrolls are empty. Craft a new document.
          </div>
        ) : (
          documents.map((doc) => {
            const isActive = doc.id === activeDocId;
            const totalWords = doc.chapters ? doc.chapters.reduce((sum, ch) => {
              const w = ch.content ? ch.content.trim().split(/\s+/).filter(Boolean).length : 0;
              return sum + w;
            }, 0) : 0;

            return (
              <div key={doc.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {/* Parent Chronicle Item */}
                <div
                  onClick={() => {
                    if (doc.id !== activeDocId) {
                      sound.playCoin();
                      onSelectDoc(doc.id);
                    }
                  }}
                  className="pixel-panel"
                  style={{
                    padding: '8px',
                    cursor: 'pointer',
                    borderColor: isActive ? 'var(--accent-color)' : 'var(--border-color)',
                    backgroundColor: isActive ? 'var(--bg-primary)' : 'var(--panel-bg)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    transition: 'border-color 0.1s'
                  }}
                >
                  {editingId === doc.id ? (
                    <div style={{ display: 'flex', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        className="pixel-input"
                        value={tempTitle}
                        onChange={(e) => setTempTitle(e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, doc.id)}
                        autoFocus
                        style={{ flex: 1, padding: '2px', fontSize: '0.65rem' }}
                      />
                      <button className="pixel-btn" onClick={() => handleSaveRename(doc.id)} style={{ padding: '2px 6px' }}>
                        <Check size={10} />
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden' }}>
                        <FileText size={12} style={{ flexShrink: 0 }} />
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: isActive ? 'bold' : 'normal',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {doc.title}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          className="pixel-btn"
                          onClick={(e) => handleStartEdit(doc, e)}
                          style={{ padding: '2px', border: 'none', background: 'transparent' }}
                          title="Rename Chronicle"
                        >
                          <Edit2 size={10} style={{ color: 'var(--text-secondary)' }} />
                        </button>
                        <button
                          className="pixel-btn"
                          onClick={(e) => handleDelete(doc.id, e)}
                          style={{ padding: '2px', border: 'none', background: 'transparent' }}
                          title="Delete Chronicle"
                        >
                          <Trash2 size={10} style={{ color: 'var(--text-secondary)' }} />
                        </button>
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.55rem', color: 'var(--text-secondary)' }}>
                    <span>{totalWords} words total</span>
                    <span style={{ opacity: 0.8 }}>💾 Local</span>
                  </div>
                </div>

                {/* Sub-list of chapters (visible ONLY if isActive) */}
                {isActive && doc.chapters && (
                  <div
                    style={{
                      paddingLeft: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      marginTop: '2px',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.55rem',
                        color: 'var(--text-secondary)',
                        padding: '2px 4px',
                        borderBottom: '1px dashed var(--border-color)',
                        marginBottom: '2px',
                      }}
                    >
                      <span>CHAPTERS</span>
                      <button
                        className="pixel-btn"
                        onClick={() => onAddChapter(doc.id)}
                        style={{ padding: '1px 4px', fontSize: '0.5rem' }}
                        title="Add New Chapter"
                      >
                        + ADD
                      </button>
                    </div>

                    {doc.chapters.map((ch) => {
                      const isChActive = ch.id === doc.activeChapterId;
                      const chWords = ch.content ? ch.content.trim().split(/\s+/).filter(Boolean).length : 0;
                      const isEditingCh = editingChapterId === ch.id;

                      return (
                        <div
                          key={ch.id}
                          onClick={() => onSelectChapter(doc.id, ch.id)}
                          className="pixel-panel"
                          style={{
                            padding: '4px 6px',
                            cursor: 'pointer',
                            fontSize: '0.65rem',
                            borderColor: isChActive ? 'var(--accent-color)' : 'var(--border-color)',
                            backgroundColor: isChActive ? 'var(--bg-secondary)' : 'var(--bg-primary)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px',
                            opacity: isChActive ? 1 : 0.85,
                          }}
                        >
                          {isEditingCh ? (
                            <div style={{ display: 'flex', gap: '2px' }} onClick={(e) => e.stopPropagation()}>
                              <input
                                type="text"
                                className="pixel-input"
                                value={tempChapterTitle}
                                onChange={(e) => setTempChapterTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleSaveChapterRename(doc.id, ch.id);
                                  } else if (e.key === 'Escape') {
                                    setEditingChapterId(null);
                                  }
                                }}
                                autoFocus
                                style={{ flex: 1, padding: '1px', fontSize: '0.6rem' }}
                              />
                              <button
                                className="pixel-btn"
                                onClick={() => handleSaveChapterRename(doc.id, ch.id)}
                                style={{ padding: '1px 4px' }}
                              >
                                <Check size={8} />
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', overflow: 'hidden' }}>
                                <FileText size={10} style={{ flexShrink: 0 }} />
                                <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', fontWeight: isChActive ? 'bold' : 'normal' }}>
                                  {ch.title}
                                </span>
                              </div>
                              <div style={{ display: 'flex', gap: '2px' }} onClick={(e) => e.stopPropagation()}>
                                <button
                                  className="pixel-btn"
                                  onClick={() => {
                                    setEditingChapterId(ch.id);
                                    setTempChapterTitle(ch.title);
                                  }}
                                  style={{ padding: '1px', border: 'none', background: 'transparent' }}
                                  title="Rename Chapter"
                                >
                                  <Edit2 size={8} style={{ color: 'var(--text-secondary)' }} />
                                </button>
                                <button
                                  className="pixel-btn"
                                  onClick={() => {
                                    if (confirm(`Delete chapter "${ch.title}"? This cannot be undone.`)) {
                                      onDeleteChapter(doc.id, ch.id);
                                    }
                                  }}
                                  style={{ padding: '1px', border: 'none', background: 'transparent' }}
                                  title="Delete Chapter"
                                >
                                  <Trash2 size={8} style={{ color: 'var(--text-secondary)' }} />
                                </button>
                              </div>
                            </div>
                          )}
                          <div style={{ fontSize: '0.55rem', color: 'var(--text-secondary)' }}>
                            {chWords} words
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .spin-anim {
          animation: spin 1s infinite linear;
        }
      `}</style>
    </div>
  );
}
