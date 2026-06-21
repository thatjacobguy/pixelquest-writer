// Retro 8-Bit Chiptune Sound Synthesizer & Music Sequencer using Web Audio API

class SoundManager {
  private ctx: AudioContext | null = null;
  private isEnabled: boolean = true;
  
  // Background music state
  private isMusicEnabled: boolean = false;
  private musicPlaying: boolean = false;
  private musicInterval: any = null;
  private musicBeatCount: number = 0;
  private musicGainNode: GainNode | null = null;
  private activeMusicTheme: string = 'fantasy';
  private musicVolume: number = 0.5; // range 0.0 to 1.0

  constructor() {
    // AudioContext is initialized lazily on first user interaction to comply with browser autoplay policies.
    const savedSound = localStorage.getItem('pixelquest_sound_enabled');
    this.isEnabled = savedSound !== null ? savedSound === 'true' : true;

    const savedMusic = localStorage.getItem('pixelquest_music_enabled');
    this.isMusicEnabled = savedMusic !== null ? savedMusic === 'true' : false;

    const savedVol = localStorage.getItem('pixelquest_music_volume');
    this.musicVolume = savedVol !== null ? Number(savedVol) : 0.5;

    const savedTheme = localStorage.getItem('pixelquest_theme');
    this.activeMusicTheme = savedTheme || 'fantasy';
  }

  private initContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public toggle(state?: boolean) {
    if (state !== undefined) {
      this.isEnabled = state;
    } else {
      this.isEnabled = !this.isEnabled;
    }
    localStorage.setItem('pixelquest_sound_enabled', String(this.isEnabled));
  }

  public getEnabled(): boolean {
    return this.isEnabled;
  }

  // Background Music Volume
  public setVolume(vol: number) {
    this.musicVolume = Math.max(0.0, Math.min(1.0, vol));
    localStorage.setItem('pixelquest_music_volume', String(this.musicVolume));
    
    if (this.musicGainNode && this.ctx) {
      // Direct gain scaling (max 0.022 gain to prevent ear fatigue)
      this.musicGainNode.gain.setValueAtTime(this.musicVolume * 0.022, this.ctx.currentTime);
    }
  }

  public getVolume(): number {
    return this.musicVolume;
  }

  // Background Music Toggle
  public toggleMusic(state?: boolean) {
    if (state !== undefined) {
      this.isMusicEnabled = state;
    } else {
      this.isMusicEnabled = !this.isMusicEnabled;
    }
    localStorage.setItem('pixelquest_music_enabled', String(this.isMusicEnabled));

    if (this.isMusicEnabled) {
      this.startMusic();
    } else {
      this.stopMusic();
    }
  }

  public getMusicEnabled(): boolean {
    return this.isMusicEnabled;
  }

  // Theme-Based Crossfader: Fades out volume, swaps track, and fades in
  public changeMusicTheme(newTheme: string) {
    if (newTheme === this.activeMusicTheme) return;
    this.activeMusicTheme = newTheme;

    if (!this.isMusicEnabled || !this.musicPlaying) return;

    try {
      const ctx = this.initContext();
      if (this.musicGainNode) {
        // 1. Soft fade out over 1.0 second
        this.musicGainNode.gain.setValueAtTime(this.musicGainNode.gain.value, ctx.currentTime);
        this.musicGainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.0);
      }

      // 2. Stop old interval, switch, and start new loop after fade completes
      setTimeout(() => {
        if (!this.musicPlaying) return; // check if user clicked off in interim
        
        // Stop current sequencer
        if (this.musicInterval) {
          clearInterval(this.musicInterval);
          this.musicInterval = null;
        }

        // Start new loop with fade-in
        this.startMusicInternal(newTheme, true);
      }, 1050);

    } catch (e) {
      console.warn("Crossfade failed", e);
    }
  }

  public startMusic() {
    if (!this.isMusicEnabled || this.musicPlaying) return;
    this.startMusicInternal(this.activeMusicTheme, false);
  }

  // Core Sequencer loop
  private startMusicInternal(theme: string, shouldFadeIn: boolean) {
    try {
      const ctx = this.initContext();
      this.musicPlaying = true;
      this.musicBeatCount = 0;

      // Re-create gain node
      this.musicGainNode = ctx.createGain();
      
      const targetGain = this.musicVolume * 0.022;

      if (shouldFadeIn) {
        // Start silent and fade in over 1.0 second
        this.musicGainNode.gain.setValueAtTime(0, ctx.currentTime);
        this.musicGainNode.gain.linearRampToValueAtTime(targetGain, ctx.currentTime + 1.0);
      } else {
        this.musicGainNode.gain.setValueAtTime(targetGain, ctx.currentTime);
      }
      
      this.musicGainNode.connect(ctx.destination);

      // Define chords, BPM, and instrument waves for each theme
      let chords: number[][];
      let bpm: number;
      let waveType: OscillatorType = 'triangle';
      let decay = 0.6;

      switch (theme) {
        case 'cozy':
          // Slow warm jazz chords (Cmaj9, Fmaj9, Dm9, G13)
          chords = [
            [130.81, 196.00, 246.94, 293.66, 329.63], // Cmaj9: C3, G3, B3, D4, E4
            [87.31, 130.81, 164.81, 220.00, 392.00],  // Fmaj9: F2, C3, E3, A3, G4
            [146.83, 220.00, 261.63, 349.23, 329.63], // Dm9: D3, A3, C4, F4, E4
            [98.00, 174.61, 246.94, 329.63, 440.00],  // G13: G2, F3, B3, E4, A4
          ];
          bpm = 55;
          waveType = 'triangle';
          decay = 0.8;
          break;

        case 'horror':
          // Creepy gothic minor progression (Am, Dm, Bdim, E7)
          chords = [
            [110.00, 164.81, 220.00, 261.63], // Am: A2, E3, A3, C4
            [73.42, 110.00, 146.83, 174.61],  // Dm: D2, A2, D3, F3
            [123.47, 174.61, 246.94, 293.66], // Bdim: B2, F3, B3, D4
            [82.41, 123.47, 146.83, 207.65],  // E7: E2, B2, D3, G#3
          ];
          bpm = 50;
          waveType = 'triangle';
          decay = 0.9;
          break;

        case 'spaceship':
          // Cyber Space monospaced cyber chords (Cm, Bb, Ab, G)
          chords = [
            [130.81, 196.00, 261.63, 311.13], // Cm: C3, G3, C4, Eb4
            [116.54, 174.61, 233.08, 293.66], // Bb: Bb2, F3, Bb3, D4
            [103.83, 155.56, 207.65, 261.63], // Ab: Ab2, Eb3, Ab3, C4
            [98.00, 146.83, 196.00, 246.94],  // G: G2, D3, G3, B3
          ];
          bpm = 92;
          waveType = 'square'; // terminal beep sound
          decay = 0.35;
          break;

        case 'fantasy':
        default:
          // Classic RPG chords (Cmaj7, Am7, Fmaj7, G7)
          chords = [
            [130.81, 261.63, 329.63, 392.00], // Cmaj7: C3, C4, E4, G4
            [110.00, 220.00, 261.63, 329.63], // Am7: A2, A3, C4, E4
            [87.31, 174.61, 220.00, 261.63],  // Fmaj7: F2, F3, A3, C4
            [98.00, 196.00, 246.94, 293.66],  // G7: G2, G3, B3, D4
          ];
          bpm = 72;
          waveType = 'triangle';
          decay = 0.6;
          break;
      }

      const beatDuration = 60 / bpm; // Beat length in seconds

      this.musicInterval = setInterval(() => {
        if (!this.musicPlaying || ctx.state === 'suspended') return;

        const numChords = chords.length;
        const notesPerChord = chords[0].length;
        const step = this.musicBeatCount % (numChords * notesPerChord);
        const chordIdx = Math.floor(step / notesPerChord);
        const beatIdx = step % notesPerChord;
        const currentChord = chords[chordIdx];

        // 1. Play sustained base note on the first beat of each chord
        if (beatIdx === 0) {
          const bassOsc = ctx.createOscillator();
          const bassGain = ctx.createGain();
          
          // Spaceship gets square bass, others get triangle/sine
          bassOsc.type = theme === 'spaceship' ? 'triangle' : 'triangle';
          bassOsc.frequency.setValueAtTime(currentChord[0], ctx.currentTime);
          
          bassGain.gain.setValueAtTime(0.5, ctx.currentTime);
          bassGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (beatDuration * notesPerChord - 0.1));
          
          bassOsc.connect(bassGain);
          bassGain.connect(this.musicGainNode!);
          
          bassOsc.start();
          bassOsc.stop(ctx.currentTime + (beatDuration * notesPerChord - 0.1));
        }

        // 2. Play gentle arpeggiated treble note on every beat
        const trebleOsc = ctx.createOscillator();
        const trebleGain = ctx.createGain();
        
        trebleOsc.type = waveType;
        const freq = currentChord[beatIdx];
        trebleOsc.frequency.setValueAtTime(freq, ctx.currentTime);
        
        trebleGain.gain.setValueAtTime(theme === 'spaceship' ? 0.22 : 0.4, ctx.currentTime);
        trebleGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + decay);
        
        trebleOsc.connect(trebleGain);
        trebleGain.connect(this.musicGainNode!);
        
        trebleOsc.start();
        trebleOsc.stop(ctx.currentTime + decay);

        this.musicBeatCount++;
      }, beatDuration * 1000);

    } catch (e) {
      console.warn("Failed to start background music", e);
      this.musicPlaying = false;
    }
  }

  public stopMusic() {
    this.musicPlaying = false;
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
    if (this.musicGainNode) {
      try {
        this.musicGainNode.disconnect();
      } catch (e) {}
      this.musicGainNode = null;
    }
  }

  // Play a simple retro note for sound effects
  private playNote(
    type: OscillatorType,
    frequency: number,
    duration: number,
    gainStart: number,
    gainEnd: number = 0.0001,
    timeOffset: number = 0
  ) {
    if (!this.isEnabled) return;
    try {
      const ctx = this.initContext();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(frequency, ctx.currentTime + timeOffset);

      gainNode.gain.setValueAtTime(gainStart, ctx.currentTime + timeOffset);
      gainNode.gain.exponentialRampToValueAtTime(gainEnd, ctx.currentTime + timeOffset + duration);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(ctx.currentTime + timeOffset);
      osc.stop(ctx.currentTime + timeOffset + duration);
    } catch (e) {
      console.warn("Failed to play retro sound", e);
    }
  }

  // Typewriter retro click: short square wave with tiny decay
  public playTypeClick() {
    this.playNote('triangle', 300, 0.03, 0.08);
    this.playNote('square', 1200, 0.015, 0.03);
  }

  // Monster hit: descending pitch frequency sweep
  public playHit() {
    if (!this.isEnabled) return;
    try {
      const ctx = this.initContext();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.12);

      gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch (e) {
      console.warn(e);
    }
  }

  // Defeat / Coin sound: ascending retro coin chime
  public playCoin() {
    const now = 0;
    this.playNote('square', 987.77, 0.08, 0.08, 0.001, now); // B5
    this.playNote('square', 1318.51, 0.25, 0.08, 0.001, now + 0.08); // E6
  }

  // Shop purchase: coin sound with a cash-register twist
  public playPurchase() {
    const now = 0;
    this.playNote('square', 1046.50, 0.05, 0.1, 0.001, now); // C6
    this.playNote('square', 1174.66, 0.05, 0.1, 0.001, now + 0.05); // D6
    this.playNote('square', 1318.51, 0.05, 0.1, 0.001, now + 0.1); // E6
    this.playNote('square', 1567.98, 0.2, 0.15, 0.001, now + 0.15); // G6
  }

  // Quest Completed fanfare
  public playQuestComplete() {
    const now = 0;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      this.playNote('square', freq, 0.15, 0.1, 0.001, now + idx * 0.1);
    });
    this.playNote('square', 1046.50, 0.4, 0.12, 0.001, now + notes.length * 0.1);
  }

  // Level Up fanfare: epic ascending chiptune scale
  public playLevelUp() {
    const now = 0;
    const arpeggio = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C4, E4, G4, C5, E5, G5, C6
    arpeggio.forEach((freq, idx) => {
      this.playNote('square', freq, 0.08, 0.08, 0.001, now + idx * 0.06);
    });
    
    this.playNote('square', 1046.50, 0.4, 0.15, 0.001, now + arpeggio.length * 0.06);
    this.playNote('triangle', 523.25, 0.45, 0.15, 0.001, now + arpeggio.length * 0.06);
  }

  // Error / Locked sound: low double-buzz
  public playError() {
    const now = 0;
    this.playNote('sawtooth', 130, 0.1, 0.15, 0.001, now);
    this.playNote('sawtooth', 110, 0.15, 0.15, 0.001, now + 0.12);
  }
}

export const sound = new SoundManager();
