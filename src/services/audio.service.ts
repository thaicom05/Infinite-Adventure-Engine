
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
    start: 'https://actions.google.com/sounds/v1/positive/success_chime.ogg',
    choice: 'https://actions.google.com/sounds/v1/ui/ui_tap_forward.ogg',
    save: 'https://actions.google.com/sounds/v1/magical/magic_chime.ogg',
    lore: 'https://actions.google.com/sounds/v1/books/book_page_turn.ogg',
    update: 'https://actions.google.com/sounds/v1/magical/magic_wand_spell.ogg',
    error: 'https://actions.google.com/sounds/v1/negative/negative_beeps.ogg',
    discover_lore: 'https://actions.google.com/sounds/v1/magical/magic_chime_2.ogg',
    craft_open: 'https://actions.google.com/sounds/v1/doors/wooden_door_open.ogg',
    craft_success: 'https://actions.google.com/sounds/v1/impacts/hammer_on_metal.ogg',
    craft_fail: 'https://actions.google.com/sounds/v1/magical/magic_fizzle.ogg',
    drop_item: 'https://actions.google.com/sounds/v1/impacts/thud.ogg'
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
