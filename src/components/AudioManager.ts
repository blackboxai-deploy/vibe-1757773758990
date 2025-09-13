export class AudioManager {
  private context: AudioContext | null = null;
  private sounds: Map<string, AudioBuffer> = new Map();
  private initialized = false;
  private masterVolume = 0.3;

  constructor() {
    this.initializeAudio();
  }

  private async initializeAudio() {
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.context = new AudioContextClass();
      await this.createSounds();
      this.initialized = true;
    } catch (error) {
      console.warn('Audio initialization failed:', error);
    }
  }

  private async createSounds() {
    if (!this.context) return;

    // Generate different sound effects using Web Audio API
    await this.createShootSound();
    await this.createExplosionSound();
    await this.createPowerUpSound();
    await this.createHitSound();
  }

  private async createShootSound() {
    if (!this.context) return;

    const length = 0.1;
    const sampleRate = this.context.sampleRate;
    const buffer = this.context.createBuffer(1, sampleRate * length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      // Create a laser-like sound with frequency sweep
      const frequency = 800 - t * 400;
      data[i] = Math.sin(2 * Math.PI * frequency * t) * Math.exp(-t * 10) * 0.3;
    }

    this.sounds.set('shoot', buffer);
  }

  private async createExplosionSound() {
    if (!this.context) return;

    const length = 0.5;
    const sampleRate = this.context.sampleRate;
    const buffer = this.context.createBuffer(1, sampleRate * length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      // Create explosion with noise and frequency sweep
      const noise = (Math.random() * 2 - 1);
      const sweep = Math.sin(2 * Math.PI * (200 - t * 150) * t);
      data[i] = (noise * 0.7 + sweep * 0.3) * Math.exp(-t * 3) * 0.4;
    }

    this.sounds.set('explosion', buffer);
  }

  private async createPowerUpSound() {
    if (!this.context) return;

    const length = 0.3;
    const sampleRate = this.context.sampleRate;
    const buffer = this.context.createBuffer(1, sampleRate * length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      // Create ascending power-up sound
      const frequency = 400 + t * 800;
      const harmonics = Math.sin(2 * Math.PI * frequency * t) + 
                       Math.sin(2 * Math.PI * frequency * 2 * t) * 0.5 +
                       Math.sin(2 * Math.PI * frequency * 3 * t) * 0.25;
      data[i] = harmonics * Math.exp(-t * 2) * 0.2;
    }

    this.sounds.set('powerUp', buffer);
  }

  private async createHitSound() {
    if (!this.context) return;

    const length = 0.15;
    const sampleRate = this.context.sampleRate;
    const buffer = this.context.createBuffer(1, sampleRate * length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      // Create hit sound with quick frequency drop
      const frequency = 600 * Math.exp(-t * 15);
      data[i] = Math.sin(2 * Math.PI * frequency * t) * Math.exp(-t * 8) * 0.4;
    }

    this.sounds.set('hit', buffer);
  }

  public playSound(soundName: string, volume = 1) {
    if (!this.initialized || !this.context || this.context.state === 'suspended') {
      // Try to resume audio context (required for some browsers)
      this.resumeAudio();
      return;
    }

    const buffer = this.sounds.get(soundName);
    if (!buffer) return;

    try {
      const source = this.context.createBufferSource();
      const gainNode = this.context.createGain();
      
      source.buffer = buffer;
      gainNode.gain.setValueAtTime(this.masterVolume * volume, this.context.currentTime);
      
      source.connect(gainNode);
      gainNode.connect(this.context.destination);
      
      source.start();
    } catch (error) {
      console.warn('Failed to play sound:', error);
    }
  }

  public async resumeAudio() {
    if (this.context && this.context.state === 'suspended') {
      try {
        await this.context.resume();
      } catch (error) {
        console.warn('Failed to resume audio context:', error);
      }
    }
  }

  public setMasterVolume(volume: number) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
  }

  public getMasterVolume(): number {
    return this.masterVolume;
  }

  // Background music using oscillators
  private backgroundMusicSource: OscillatorNode | null = null;
  private backgroundMusicGain: GainNode | null = null;
  
  public startBackgroundMusic() {
    if (!this.context || this.backgroundMusicSource) return;

    try {
      // Create a simple ambient background track
      this.backgroundMusicSource = this.context.createOscillator();
      this.backgroundMusicGain = this.context.createGain();
      
      this.backgroundMusicSource.type = 'sine';
      this.backgroundMusicSource.frequency.setValueAtTime(110, this.context.currentTime); // Low A
      this.backgroundMusicGain.gain.setValueAtTime(0.05, this.context.currentTime);
      
      this.backgroundMusicSource.connect(this.backgroundMusicGain);
      this.backgroundMusicGain.connect(this.context.destination);
      
      // Add some frequency modulation for ambient effect
      const lfo = this.context.createOscillator();
      const lfoGain = this.context.createGain();
      lfo.frequency.setValueAtTime(0.1, this.context.currentTime);
      lfoGain.gain.setValueAtTime(10, this.context.currentTime);
      
      lfo.connect(lfoGain);
      lfoGain.connect(this.backgroundMusicSource.frequency);
      
      this.backgroundMusicSource.start();
      lfo.start();
    } catch (error) {
      console.warn('Failed to start background music:', error);
    }
  }

  public stopBackgroundMusic() {
    if (this.backgroundMusicSource) {
      try {
        this.backgroundMusicSource.stop();
        this.backgroundMusicSource = null;
        this.backgroundMusicGain = null;
      } catch (error) {
        console.warn('Failed to stop background music:', error);
      }
    }
  }

  public dispose() {
    this.stopBackgroundMusic();
    if (this.context) {
      this.context.close();
      this.context = null;
    }
    this.sounds.clear();
    this.initialized = false;
  }
}