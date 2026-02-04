
import { Component, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GeminiService } from './services/gemini.service';
import { AppState, GameState, StorySegment } from './models/story.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  language = signal<'th' | 'en'>('th');

  private readonly uiTextDb = {
    th: {
      sidebarTitle1: 'ผจญภัย',
      sidebarTitle2: 'ไม่สิ้นสุด',
      questTitle: 'เควสปัจจุบัน',
      inventoryTitle: 'ช่องเก็บของ',
      emptyInventory: 'ในกระเป๋าของคุณว่างเปล่า',
      welcomeMessage: 'เรื่องราวของคุณกำลังรออยู่ กดปุ่มเพื่อเริ่มต้นการเดินทางผ่านโลกที่สร้างจากจินตนาการ',
      mainTitle: 'สร้างตำนานของคุณ',
      mainSubtitle: 'เรื่องราวที่เปลี่ยนแปลงไปไม่สิ้นสุด ที่ซึ่งตัวเลือกของคุณกำหนดโลก ไม่มีสองการผจญภัยใดที่เหมือนกัน',
      startButton: 'เริ่มต้นการผจญภัย',
      loadingWorld: 'กำลังอัญเชิญโลกใบใหม่...',
      loadingWeaving: 'เส้นด้ายแห่งโชคชะตากำลังถักทอ...',
      loadingPainting: 'กำลังวาดฉากด้วยแสงและเงา...',
      errorTitle: 'เกิดข้อผิดพลาด',
      unseenWorld: 'โลกนี้ยังไม่เคยถูกพบเห็น...',
      initialQuest: 'ตามหาซากปรักหักพังเสียงกระซิบ',
      initialInventory: ['เสื้อคลุมนักเดินทาง', 'แอปเปิ้ลครึ่งลูก'],
      initialChoice: 'เริ่มต้นการผจญภัย',
      initialStoryContext: 'คุณตื่นขึ้นมาพร้อมกับหอบหายใจ ความรู้สึกของเป้าหมายดังกระหึ่มในเส้นเลือดของคุณ แต่เส้นทางข้างหน้าถูกปกคลุมไปด้วยหมอก',
    },
    en: {
      sidebarTitle1: 'Infinite',
      sidebarTitle2: 'Adventure',
      questTitle: 'Current Quest',
      inventoryTitle: 'Inventory',
      emptyInventory: 'Your pockets are empty.',
      welcomeMessage: 'Your story awaits. Press the button to begin your journey through a world crafted by imagination.',
      mainTitle: 'Forge Your Legend',
      mainSubtitle: 'An endlessly evolving story where your choices shape the world. No two adventures are the same.',
      startButton: 'Begin Your Adventure',
      loadingWorld: 'Summoning a new world...',
      loadingWeaving: 'The threads of fate are weaving...',
      loadingPainting: 'Painting the scene with light and shadow...',
      errorTitle: 'An Error Occurred',
      unseenWorld: 'The world is yet to be seen...',
      initialQuest: 'Find the Whispering Ruins.',
      initialInventory: ['Traveler\'s Cloak', 'A half-eaten apple'],
      initialChoice: 'Begin the adventure',
      initialStoryContext: 'You awaken with a gasp. A sense of purpose hums in your veins, but the path ahead is shrouded in mist.',
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
      currentQuest: this.uiTextDb.th.initialQuest
    },
    image: null,
  };

  state = signal<AppState>(this.initialState);
  
  hasStarted = () => this.state().hasStarted;
  isLoading = () => this.state().isLoading;
  loadingMessage = () => this.state().loadingMessage;
  error = () => this.state().error;
  storySegment = () => this.state().storySegment;
  gameState = () => this.state().gameState;
  image = () => this.state().image ? `data:image/jpeg;base64,${this.state().image}` : null;
  
  constructor(private geminiService: GeminiService) {}

  setLanguage(lang: 'th' | 'en') {
    this.language.set(lang);
    // Reset the game if language is changed, to ensure story consistency
    const currentLangUi = this.uiText();
    this.state.set({
      ...this.initialState,
      gameState: {
        inventory: currentLangUi.initialInventory,
        currentQuest: currentLangUi.initialQuest,
      }
    });
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
      this.state.update(s => ({
        ...s,
        isLoading: false,
        loadingMessage: '',
        error: error.message || 'An unknown arcane interference occurred.'
      }));
    }
  }
}
