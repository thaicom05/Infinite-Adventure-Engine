
import { Component, ChangeDetectionStrategy, signal, computed, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GeminiService } from './services/gemini.service';
import { AppState, GameState, StorySegment, SavedState } from './models/story.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {
  language = signal<'th' | 'en'>('th');
  isQuestExpanded = signal(false);

  private readonly uiTextDb = {
    th: {
      sidebarTitle1: 'ผจญภัย',
      sidebarTitle2: 'ไม่สิ้นสุด',
      questTitle: 'เควสปัจจุบัน',
      inventoryTitle: 'ช่องเก็บของ',
      statsTitle: 'ค่าสถานะตัวละคร',
      emptyInventory: 'ในกระเป๋าของคุณว่างเปล่า',
      welcomeMessage: 'เรื่องราวของคุณกำลังรออยู่ กดปุ่มเพื่อเริ่มต้นการเดินทางผ่านโลกที่สร้างจากจินตนาการ',
      mainTitle: 'สร้างตำนานของคุณ',
      mainSubtitle: 'เรื่องราวที่เปลี่ยนแปลงไปไม่สิ้นสุด ที่ซึ่งตัวเลือกของคุณกำหนดโลก ไม่มีสองการผจญภัยใดที่เหมือนกัน',
      startButton: 'เริ่มต้นการผจญภัย',
      loadingWorld: 'กำลังอัญเชิญโลกใบใหม่...',
      loadingWeaving: 'เส้นด้ายแห่งโชคชะตากำลังถักทอ...',
      loadingPainting: 'กำลังวาดฉากด้วยแสงและเงา...',
      errorTitle: 'เกิดข้อผิดพลาด',
      errorQuota: 'โควต้าการสร้างภาพของคุณหมดแล้ว โปรดตรวจสอบแผนและลองอีกครั้งในภายหลัง',
      errorGeneric: 'เกิดการรบกวนทางเวทมนตร์ที่ไม่รู้จัก โปรดลองอีกครั้ง',
      unseenWorld: 'โลกนี้ยังไม่เคยถูกพบเห็น...',
      initialQuest: {
        title: 'ตามหาซากปรักหักพังเสียงกระซิบ',
        objectives: ['ค้นหาแผนที่โบราณ', 'เดินทางไปยังป่าหมอก']
      },
      initialInventory: ['เสื้อคลุมนักเดินทาง', 'แอปเปิ้ลครึ่งลูก'],
      initialChoice: 'เริ่มต้นการผจญภัย',
      initialStoryContext: 'คุณตื่นขึ้นมาพร้อมกับหอบหายใจ ความรู้สึกของเป้าหมายดังกระหึ่มในเส้นเลือดของคุณ แต่เส้นทางข้างหน้าถูกปกคลุมไปด้วยหมอก',
      logTitle: 'สมุดบันทึกการผจญภัย',
      saveButton: 'บันทึกการผจญภัยปัจจุบัน',
      loadButton: 'โหลด',
      deleteButton: 'ลบ',
      noSave: 'ยังไม่มีการผจญภัยที่บันทึกไว้',
      saveSuccess: 'บันทึกสำเร็จ!',
    },
    en: {
      sidebarTitle1: 'Infinite',
      sidebarTitle2: 'Adventure',
      questTitle: 'Current Quest',
      inventoryTitle: 'Inventory',
      statsTitle: 'Character Stats',
      emptyInventory: 'Your pockets are empty.',
      welcomeMessage: 'Your story awaits. Press the button to begin your journey through a world crafted by imagination.',
      mainTitle: 'Forge Your Legend',
      mainSubtitle: 'An endlessly evolving story where your choices shape the world. No two adventures are the same.',
      startButton: 'Begin Your Adventure',
      loadingWorld: 'Summoning a new world...',
      loadingWeaving: 'The threads of fate are weaving...',
      loadingPainting: 'Painting the scene with light and shadow...',
      errorTitle: 'An Error Occurred',
      errorQuota: 'Your image generation quota has been exceeded. Please check your plan and try again later.',
      errorGeneric: 'An unknown arcane interference occurred. Please try again.',
      unseenWorld: 'The world is yet to be seen...',
      initialQuest: {
        title: 'Find the Whispering Ruins',
        objectives: ['Locate the ancient map', 'Travel to the Misty Woods']
      },
      initialInventory: ['Traveler\'s Cloak', 'A half-eaten apple'],
      initialChoice: 'Begin the adventure',
      initialStoryContext: 'You awaken with a gasp. A sense of purpose hums in your veins, but the path ahead is shrouded in mist.',
      logTitle: 'Adventure Log',
      saveButton: 'Save Current Adventure',
      loadButton: 'Load',
      deleteButton: 'Delete',
      noSave: 'No saved adventure found.',
      saveSuccess: 'Saved successfully!',
    }
  };

  uiText = computed(() => this.uiTextDb[this.language()]);

  private readonly initialState: AppState = {
    hasStarted: false,
    isLoading: false,
    loadingMessage: '',
    error: null,
    storySegment: null,
    gameState: {
      inventory: this.uiTextDb.th.initialInventory,
      currentQuest: this.uiTextDb.th.initialQuest,
      stats: undefined,
    },
    image: null,
  };

  state = signal<AppState>(this.initialState);
  savedGame = signal<SavedState | null>(null);
  saveStatus = signal<string | null>(null);
  
  private geminiService = inject(GeminiService);

  hasStarted = computed(() => this.state().hasStarted);
  isLoading = computed(() => this.state().isLoading);
  loadingMessage = computed(() => this.state().loadingMessage);
  error = computed(() => this.state().error);
  storySegment = computed(() => this.state().storySegment);
  gameState = computed(() => this.state().gameState);
  image = computed(() => this.state().image ? `data:image/jpeg;base64,${this.state().image}` : null);
  characterStats = computed(() => {
    return this.gameState()?.stats ?? [];
  });
  
  ngOnInit(): void {
    this.loadSaveFromLocalStorage();
  }

  toggleQuestDetails(): void {
    this.isQuestExpanded.update(value => !value);
  }

  private loadSaveFromLocalStorage(): void {
    const savedGameJson = localStorage.getItem('infiniteAdventureSave');
    if (savedGameJson) {
      try {
        this.savedGame.set(JSON.parse(savedGameJson));
      } catch (e) {
        console.error("Failed to parse saved game from localStorage", e);
        localStorage.removeItem('infiniteAdventureSave');
      }
    }
  }

  setLanguage(lang: 'th' | 'en') {
    if (this.language() === lang) return;
    this.language.set(lang);
    
    const currentLangUi = this.uiText();
    this.state.set({
      ...this.initialState,
      gameState: {
        inventory: currentLangUi.initialInventory,
        currentQuest: currentLangUi.initialQuest,
      }
    });
  }

  saveGame(): void {
    const currentState = this.state();
    if (currentState.storySegment && currentState.gameState && currentState.image) {
      const stateToSave: SavedState = {
        storySegment: currentState.storySegment,
        gameState: currentState.gameState,
        image: currentState.image,
        language: this.language(),
      };
      localStorage.setItem('infiniteAdventureSave', JSON.stringify(stateToSave));
      this.savedGame.set(stateToSave);
      
      this.saveStatus.set(this.uiText().saveSuccess);
      setTimeout(() => this.saveStatus.set(null), 2000);
    }
  }

  loadGame(): void {
    const saved = this.savedGame();
    if (saved) {
      this.language.set(saved.language);
      this.state.set({
        hasStarted: true,
        isLoading: false,
        loadingMessage: '',
        error: null,
        storySegment: saved.storySegment,
        gameState: saved.gameState,
        image: saved.image,
      });
    }
  }

  deleteGame(): void {
    localStorage.removeItem('infiniteAdventureSave');
    this.savedGame.set(null);
  }

  async startGame(): Promise<void> {
    const currentLangUi = this.uiText();
    this.state.set({
      ...this.initialState,
      gameState: {
        inventory: currentLangUi.initialInventory,
        currentQuest: currentLangUi.initialQuest,
      },
      hasStarted: true,
      isLoading: true,
      loadingMessage: currentLangUi.loadingWorld
    });
    
    await this.processChoice(currentLangUi.initialChoice, currentLangUi.initialStoryContext);
  }

  async makeChoice(choice: string): Promise<void> {
    if (this.isLoading()) return;

    this.state.update(s => ({
      ...s,
      isLoading: true,
      error: null,
      loadingMessage: this.uiText().loadingWeaving
    }));
    
    const currentStory = this.state().storySegment?.storyText ?? this.uiText().initialStoryContext;
    await this.processChoice(choice, currentStory);
  }

  private async processChoice(choice: string, storyContext: string): Promise<void> {
    try {
      const initialGameState = this.state().gameState;
      if (!initialGameState) {
        throw new Error("Game state is not initialized.");
      }
      
      const aiResponse = await this.geminiService.generateNextStep(
        storyContext,
        choice,
        initialGameState,
        this.language()
      );

      this.state.update(s => ({
        ...s,
        storySegment: aiResponse.story,
        gameState: aiResponse.gameState,
        loadingMessage: this.uiText().loadingPainting
      }));
      
      const imageBytes = await this.geminiService.generateImage(aiResponse.story.visualDescription);

      this.state.update(s => ({
        ...s,
        image: imageBytes,
        isLoading: false,
        loadingMessage: ''
      }));

    } catch (error: any) {
      let finalErrorMessage: string;
      const genericApiError = this.uiText().errorGeneric;

      if (error && typeof error.message === 'string') {
          const errorMessage = error.message.toLowerCase();
          if (errorMessage.includes('429') || errorMessage.includes('resource_exhausted') || errorMessage.includes('quota')) {
              finalErrorMessage = this.uiText().errorQuota;
          } else {
              finalErrorMessage = error.message;
          }
      } else {
          finalErrorMessage = genericApiError;
      }

      this.state.update(s => ({
        ...s,
        isLoading: false,
        loadingMessage: '',
        error: finalErrorMessage
      }));
    }
  }
}
