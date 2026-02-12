
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
    start: 'https://www.gstatic.com/assistant/sounds/glockenspiel_triumph.ogg',
    choice: 'https://www.gstatic.com/assistant/sounds/ui_tap_variant_01.ogg',
    save: 'https://www.gstatic.com/assistant/sounds/magic_chime.ogg',
    lore: 'https://www.gstatic.com/assistant/sounds/book_page_turn.ogg',
    update: 'https://www.gstatic.com/assistant/sounds/magic_wand.ogg',
    error: 'https://www.gstatic.com/assistant/sounds/error_chime_negative_4.ogg',
    discover_lore: 'https://www.gstatic.com/assistant/sounds/magic_chime_2.ogg',
    craft_open: 'https://www.gstatic.com/assistant/sounds/wooden_door_open.ogg',
    craft_success: 'https://www.gstatic.com/assistant/sounds/hammer_on_metal.ogg',
    craft_fail: 'https://www.gstatic.com/assistant/sounds/magic_fizzle.ogg',
    drop_item: 'https://www.gstatic.com/assistant/sounds/thud.ogg'
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
