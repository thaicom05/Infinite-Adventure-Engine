
import { Injectable } from '@angular/core';

export type SoundEffect = 'start' | 'choice' | 'save' | 'lore' | 'update' | 'error' | 'discover_lore' | 'craft_open' | 'craft_success' | 'craft_fail' | 'drop_item';

@Injectable({
  providedIn: 'root',
})
export class AudioService {
  private audioContext: AudioContext | null = null;
  private soundBuffers: Map<SoundEffect, AudioBuffer> = new Map();
  private isInitialized = false;

  private sounds: Record<SoundEffect, string> = {
    start: 'https://cdn.pixabay.com/audio/2022/11/10/audio_26538317a0.mp3', // Level Up sound
    choice: 'https://cdn.pixabay.com/audio/2022/03/15/audio_70b221a97a.mp3', // UI Click
    save: 'https://cdn.pixabay.com/audio/2022/01/21/audio_eb22b73523.mp3', // Writing sound
    lore: 'https://cdn.pixabay.com/audio/2022/11/19/audio_24b4578b5a.mp3', // Page turn
    update: 'https://cdn.pixabay.com/audio/2022/03/23/audio_839797a76c.mp3', // Magic wand
    error: 'https://cdn.pixabay.com/audio/2022/03/13/audio_2f28b9d034.mp3', // Error sound
    discover_lore: 'https://cdn.pixabay.com/audio/2022/03/04/audio_39a2f3893c.mp3', // Secret chime
    craft_open: 'https://cdn.pixabay.com/audio/2023/06/13/audio_34b3131c9a.mp3', // Open metal lid
    craft_success: 'https://cdn.pixabay.com/audio/2022/01/20/audio_f5234192a5.mp3', // Anvil hit
    craft_fail: 'https://cdn.pixabay.com/audio/2022/03/10/audio_b333963d3b.mp3', // Magic fizzle
    drop_item: 'https://cdn.pixabay.com/audio/2022/03/15/audio_13c4197576.mp3' // Item pouch thud
  };

  private initialize(): void {
    if (this.isInitialized || typeof window === 'undefined') return;

    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.preloadSounds();
      this.isInitialized = true;
    } catch (e) {
      console.error("Web Audio API is not supported in this browser.");
    }
  }

  private async preloadSounds(): Promise<void> {
    if (!this.audioContext) return;

    for (const key in this.sounds) {
      try {
        const soundKey = key as SoundEffect;
        const response = await fetch(this.sounds[soundKey]);

        if (!response.ok) {
          throw new Error(`Failed to fetch sound ${key}: ${response.status} ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        // Use promise-based decodeAudioData for modern browsers and better error handling
        const buffer = await this.audioContext.decodeAudioData(arrayBuffer);
        this.soundBuffers.set(soundKey, buffer);
      } catch (error) {
        console.error(`Failed to load or decode sound: ${key}`, error);
      }
    }
  }

  public playSound(sound: SoundEffect): void {
    this.initialize();

    if (!this.audioContext) return;

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const audioBuffer = this.soundBuffers.get(sound);
    if (audioBuffer) {
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      source.start(0);
    } else {
      // Retry if sound is not yet loaded
      setTimeout(() => {
        const delayedBuffer = this.soundBuffers.get(sound);
        if (delayedBuffer && this.audioContext) {
          const source = this.audioContext.createBufferSource();
          source.buffer = delayedBuffer;
          source.connect(this.audioContext.destination);
          source.start(0);
        } else {
          console.warn(`Sound not loaded: ${sound}`);
        }
      }, 250);
    }
  }
}
