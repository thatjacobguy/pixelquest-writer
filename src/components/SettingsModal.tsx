import React from 'react';
import { sound } from '../utils/audio';
import { Volume2, VolumeX, Download, Upload } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onExportData: () => void;
  onImportData: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  soundEnabled,
  onToggleSound,
  onExportData,
  onImportData,
}: SettingsModalProps) {
  if (!isOpen) return null;

  const handleSave = () => {
    sound.playCoin();
    onClose();
  };

  const playSoundTest = (type: 'click' | 'hit' | 'coin' | 'levelUp' | 'quest' | 'purchase') => {
    if (type === 'click') sound.playTypeClick();
    if (type === 'hit') sound.playHit();
    if (type === 'coin') sound.playCoin();
    if (type === 'levelUp') sound.playLevelUp();
    if (type === 'quest') sound.playQuestComplete();
    if (type === 'purchase') sound.playPurchase();
  };

  return (
    <div className="dialog-backdrop">
      <div className="pixel-panel pixel-dialog crt-glow">
        <div className="pixel-panel-header">Settings & Tavern Cache</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Sound Settings */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem' }}>Retro Sound Synthesizer:</span>
            <button
              className={`pixel-btn ${soundEnabled ? 'pixel-btn-accent' : ''}`}
              onClick={onToggleSound}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              {soundEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Sound Board Test */}
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Sound Board Sound effects (Synthesized in Web Audio):
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
              <button className="pixel-btn" onClick={() => playSoundTest('click')} style={{ fontSize: '0.6rem' }}>Click</button>
              <button className="pixel-btn" onClick={() => playSoundTest('hit')} style={{ fontSize: '0.6rem' }}>Hit</button>
              <button className="pixel-btn" onClick={() => playSoundTest('coin')} style={{ fontSize: '0.6rem' }}>Coin</button>
              <button className="pixel-btn" onClick={() => playSoundTest('purchase')} style={{ fontSize: '0.6rem' }}>Buy</button>
              <button className="pixel-btn" onClick={() => playSoundTest('quest')} style={{ fontSize: '0.6rem' }}>Victory</button>
              <button className="pixel-btn" onClick={() => playSoundTest('levelUp')} style={{ fontSize: '0.6rem' }}>Level Up</button>
            </div>
          </div>

          <hr style={{ borderColor: 'var(--border-color)', opacity: 0.3 }} />

          {/* Backup Import/Export */}
          <div>
            <div style={{ fontSize: '0.8rem', marginBottom: '8px' }}>Local Tavern Backup (JSON):</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="pixel-btn" onClick={onExportData} style={{ flex: 1, fontSize: '0.65rem' }}>
                <Download size={12} /> Export JSON
              </button>
              <label className="pixel-btn" style={{ flex: 1, fontSize: '0.65rem', margin: 0 }}>
                <Upload size={12} /> Import JSON
                <input
                  type="file"
                  accept=".json"
                  onChange={onImportData}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </div>

        </div>

        <div className="dialog-buttons">
          <button className="pixel-btn" onClick={() => { sound.playError(); onClose(); }}>
            Cancel
          </button>
          <button className="pixel-btn pixel-btn-accent" onClick={handleSave}>
            Save Cache
          </button>
        </div>
      </div>
    </div>
  );
}
