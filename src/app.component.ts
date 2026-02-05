
import { Component, ChangeDetectionStrategy, signal, computed, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GeminiService } from './services/gemini.service';
import { AppState, GameState, StorySegment, SavedState, StatItem, LoreEntry, NewLoreEntry } from './models/story.model';
import { AudioService } from './services/audio.service';

type Archetype = 'warrior' | 'rogue' | 'mage';

interface ArchetypeData {
  name: string;
  description: string;
  appearance: string;
  stats: StatItem[];
  inventory: string[];
}

const ANIMATION_DURATION = 200; // ms

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
  
  // Modal states
  isLorebookVisible = signal(false);
  isLorebookClosing = signal(false);
  isCreatingCharacter = signal(false);
  isCreatingCharacterClosing = signal(false);
  isCrafting = signal(false);
  isCraftingClosing = signal(false);
  itemToDrop = signal<string | null>(null);
  isDropModalClosing = signal(false);
  
  isImageGenerationEnabled = signal(true);

  // Character Creation Signals
  characterName = signal('');
  characterAppearance = signal('');
  selectedArchetype = signal<Archetype | null>(null);

  // Crafting Signals
  craftingSelection = signal<string[]>([]);
  craftingStatus = signal<{ success: boolean, message: string } | null>(null);
  isCraftingLoading = signal(false);

  // Lorebook Signals
  loreSortOrder = signal<'date' | 'alpha'>('date');
  loreSearchTerm = signal('');
  selectedLoreEntry = signal<LoreEntry | null>(null);
  loreDetailImage = signal<string | null>(null);
  isLoreImageLoading = signal(false);

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
      mainSubtitle: 'เรื่องราวที่เปลี่ยนแปลงไปไม่สิ้นสุด ที่ซึ่งตัวเลือกของคุณกำหนดโลก ไม่มีสองการผจญ"ภัยใดที่เหมือนกัน',
      startButton: 'เริ่มต้นการผจญภัย',
      loadingWorld: 'กำลังอัญเชิญโลกใบใหม่...',
      loadingWeaving: 'เส้นด้ายแห่งโชคชะตากำลังถักทอ...',
      loadingPainting: 'กำลังค้นหาภาพจากบันทึกโบราณ...',
      errorTitle: 'เกิดข้อผิดพลาด',
      errorQuota: 'ไม่สามารถเชื่อมต่อกับคลังภาพได้ เรื่องราวจะดำเนินต่อไปโดยไม่มีภาพใหม่',
      errorStoryQuota: 'พลังแห่งโชคชะตาต้องใช้เวลาฟื้นฟู (โควต้า API หมด) กรุณารอสักครู่แล้วลองอีกครั้ง',
      errorGeneric: 'เกิดการรบกวนทางเวทมนตร์ที่ไม่รู้จัก โปรดลองอีกครั้ง',
      unseenWorld: 'ไม่มีภาพใดตรงกับเหตุการณ์นี้...',
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
      autoSaveSuccess: 'บันทึกอัตโนมัติแล้ว',
      lorebookTitle: 'ตำราแห่งตำนาน',
      lorebookButton: 'เปิดตำรา',
      emptyLorebook: 'ยังไม่มีการค้นพบตำนานใดๆ',
      closeButton: 'ปิด',
      loreDiscovered: 'ค้นพบตำนานใหม่',
      loreSearchPlaceholder: 'ค้นหาตำนาน...',
      loreSortDate: 'วันที่',
      loreSortAlpha: 'A-Z',
      loreBackButton: 'ย้อนกลับ',
      loreImageLoading: 'กำลังค้นหาภาพประกอบตำนาน...',
      // Character Creation UI
      createHeroTitle: 'สร้างวีรบุรุษของคุณ',
      nameLabel: 'ชื่อ',
      namePlaceholder: 'ใส่ชื่อตัวละครของคุณ',
      archetypeLabel: 'เลือกอาชีพเริ่มต้น',
      appearanceLabel: 'ลักษณะภายนอก',
      startJourneyButton: 'เริ่มต้นการเดินทาง',
      // Crafting UI
      craftingButton: 'คราฟต์ไอเทม',
      craftingTitle: 'โต๊ะประดิษฐ์',
      craftingSelect: 'เลือกไอเทมเพื่อผสม',
      combineButton: 'ผสมไอเทม',
      craftingSuccess: 'การประดิษฐ์สำเร็จ!',
      craftingFailure: 'การประดิษฐ์ล้มเหลว!',
      craftingInProgress: 'กำลังหลอมรวมธาตุ...',
      // Settings
      settingsTitle: 'การตั้งค่า',
      imageGenerationLabel: 'การค้นหาภาพ',
      imageGenerationDisabled: 'การค้นหาภาพถูกปิดใช้งาน',
      // Drop Item UI
      dropItemTitle: 'ทิ้งไอเทม?',
      dropItemConfirmation: 'คุณแน่ใจหรือไม่ว่าต้องการทิ้ง {itemName}?',
      dropButton: 'ทิ้ง',
      cancelButton: 'ยกเลิก',
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
      loadingPainting: 'Searching the archives for a visual...',
      errorTitle: 'An Error Occurred',
      errorQuota: 'Could not connect to the image archives. The story will continue without a new image.',
      errorStoryQuota: 'The threads of fate need time to recharge (API Quota Exceeded). Please wait a moment and try again.',
      errorGeneric: 'An unknown arcane interference occurred. Please try again.',
      unseenWorld: 'No image could be found for this moment...',
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
      autoSaveSuccess: 'Progress auto-saved',
      lorebookTitle: 'Tome of Lore',
      lorebookButton: 'Open Lorebook',
      emptyLorebook: 'No lore has been discovered yet.',
      closeButton: 'Close',
      loreDiscovered: 'New Lore Discovered',
      loreSearchPlaceholder: 'Search lore...',
      loreSortDate: 'Date',
      loreSortAlpha: 'A-Z',
      loreBackButton: 'Back to List',
      loreImageLoading: 'Finding an illustration for the legend...',
      // Character Creation UI
      createHeroTitle: 'Create Your Hero',
      nameLabel: 'Name',
      namePlaceholder: 'Enter your character\'s name',
      archetypeLabel: 'Choose your Archetype',
      appearanceLabel: 'Appearance',
      startJourneyButton: 'Start Journey',
      // Crafting UI
      craftingButton: 'Crafting',
      craftingTitle: 'Crafting Bench',
      craftingSelect: 'Select items to combine',
      combineButton: 'Combine Items',
      craftingSuccess: 'Crafting Successful!',
      craftingFailure: 'Crafting Failed!',
      craftingInProgress: 'Fusing the elements...',
      // Settings
      settingsTitle: 'Settings',
      imageGenerationLabel: 'Image Search',
      imageGenerationDisabled: 'Image Search is disabled',
       // Drop Item UI
      dropItemTitle: 'Drop Item?',
      dropItemConfirmation: 'Are you sure you want to drop {itemName}?',
      dropButton: 'Drop',
      cancelButton: 'Cancel',
    }
  };
  
  private readonly archetypes: Record<Archetype, Record<'th' | 'en', ArchetypeData>> = {
    warrior: {
      th: {
        name: 'นักรบ',
        description: 'ผู้ช่ำชองการต่อสู้ในระยะประชิด แข็งแกร่งและทนทานดั่งภูผา',
        appearance: 'นักรบกร้านศึกในชุดเกราะเหล็กกล้าที่ผ่านสมรภูมิมานับไม่ถ้วน ใบหน้ามีแผลเป็นแห่งเกียรติยศ และแววตามุ่งมั่น',
        stats: [{ name: 'ความแข็งแกร่ง', value: 'สูง' }, { name: 'ความเร็ว', value: 'ปานกลาง' }],
        inventory: ['ดาบเหล็กยาว', 'โล่ไม้โอ๊ค', 'เกราะเหล็กชำรุด']
      },
      en: {
        name: 'Warrior',
        description: 'A master of close-quarters combat, strong and resilient as a mountain.',
        appearance: 'A battle-hardened warrior in scarred steel plate armor. Their face holds a stoic expression and determined eyes.',
        stats: [{ name: 'Strength', value: 'High' }, { name: 'Agility', value: 'Medium' }],
        inventory: ['Longsword', 'Oak Shield', 'Battered Steel Armor']
      }
    },
    rogue: {
      th: {
        name: 'โจร',
        description: 'นักฆ่าในเงามืด ว่องไวและปราดเปรียว หาตัวจับได้ยาก',
        appearance: 'ร่างปราดเปรียวในชุดหนังสีเข้มที่กลมกลืนกับเงา มีผ้าคลุมศีรษะปิดบังใบหน้าครึ่งหนึ่ง เผยให้เห็นเพียงดวงตาที่คมกริบ',
        stats: [{ name: 'ความเร็ว', value: 'สูง' }, { name: 'เล่ห์เหลี่ยม', value: 'สูง' }],
        inventory: ['มีดสั้นคู่', 'ชุดหนังย้อมดำ', 'เครื่องมือสะเดาะกุญแจ']
      },
      en: {
        name: 'Rogue',
        description: 'A deadly agent of the shadows, quick and difficult to pin down.',
        appearance: 'A lithe figure clad in dark, supple leather. A cowl conceals much of their face, revealing only sharp, observant eyes.',
        stats: [{ name: 'Agility', value: 'High' }, { name: 'Cunning', value: 'High' }],
        inventory: ['Twin Daggers', 'Dark Leather Armor', 'Set of Lockpicks']
      }
    },
    mage: {
      th: {
        name: 'นักเวทย์',
        description: 'ผู้ควบคุมพลังงานลี้ลับ สามารถร่ายเวทมนตร์ที่เปลี่ยนแปลงความเป็นจริงได้',
        appearance: 'ผู้คงแก่เรียนในชุดคลุมยาวปักด้วยอักขระเวทมนตร์เรืองรอง ในมือถือคทาไม้ที่สลักเสลาอย่างวิจิตร ดวงตาฉายแววแห่งปัญญา',
        stats: [{ name: 'สติปัญญา', value: 'สูง' }, { name: 'พลังเวท', value: 'สูง' }],
        inventory: ['คทาไม้เวทมนตร์', 'ชุดคลุมแห่งผู้บำเพ็ญ', 'ตำราเวทเก่าๆ']
      },
      en: {
        name: 'Mage',
        description: 'A wielder of arcane energies, capable of weaving reality-altering spells.',
        appearance: 'A scholarly figure in long robes embroidered with glowing runes. They carry an intricately carved wooden staff and their eyes gleam with intellect.',
        stats: [{ name: 'Intellect', value: 'High' }, { name: 'Arcane Power', value: 'High' }],
        inventory: ['Enchanted Staff', 'Acolyte\'s Robes', 'Tome of Ancient Spells']
      }
    }
  };

  uiText = computed(() => this.uiTextDb[this.language()]);
  archetypeData = computed(() => {
    const lang = this.language();
    return {
      warrior: this.archetypes.warrior[lang],
      rogue: this.archetypes.rogue[lang],
      mage: this.archetypes.mage[lang]
    }
  });

  private readonly initialState: AppState = {
    hasStarted: false,
    isLoading: false,
    loadingMessage: '',
    error: null,
    storySegment: null,
    gameState: {
      inventory: [],
      currentQuest: this.uiTextDb.th.initialQuest,
      stats: [],
      lorebook: [],
    },
    image: null,
  };

  state = signal<AppState>(this.initialState);
  savedGame = signal<SavedState | null>(null);
  saveStatus = signal<string | null>(null);
  autoSaveStatus = signal<string | null>(null);
  loreNotification = signal<string | null>(null);
  
  private geminiService = inject(GeminiService);
  private audioService = inject(AudioService);

  hasStarted = computed(() => this.state().hasStarted);
  isLoading = computed(() => this.state().isLoading);
  loadingMessage = computed(() => this.state().loadingMessage);
  error = computed(() => this.state().error);
  storySegment = computed(() => this.state().storySegment);
  gameState = computed(() => this.state().gameState);
  image = computed(() => this.state().image ? `data:image/jpeg;base64,${this.state().image}` : null);
  characterStats = computed(() => this.gameState()?.stats ?? []);
  lorebook = computed(() => this.gameState()?.lorebook ?? []);
  
  filteredAndSortedLore = computed(() => {
    const lore = this.lorebook() ?? [];
    const term = this.loreSearchTerm().toLowerCase();
    const sortOrder = this.loreSortOrder();

    const filtered = term
      ? lore.filter(l => l.title.toLowerCase().includes(term) || l.content.toLowerCase().includes(term))
      : lore;

    return [...filtered].sort((a, b) => {
      if (sortOrder === 'alpha') {
        return a.title.localeCompare(b.title);
      }
      return b.discoveredDate - a.discoveredDate; // Newest first
    });
  });

  ngOnInit(): void {
    this.loadSaveFromLocalStorage();
  }
  
  openCharacterCreation(): void {
    this.isCreatingCharacter.set(true);
  }

  closeCharacterCreation(): void {
    this.isCreatingCharacterClosing.set(true);
    setTimeout(() => {
        this.isCreatingCharacter.set(false);
        this.isCreatingCharacterClosing.set(false);
    }, ANIMATION_DURATION);
  }

  selectArchetype(archetype: Archetype): void {
    this.selectedArchetype.set(archetype);
    this.characterAppearance.set(this.archetypeData()[archetype].appearance);
  }

  toggleQuestDetails(): void {
    this.isQuestExpanded.update(value => !value);
  }
  
  toggleLorebook(forceOpen?: boolean): void {
    const currentlyVisible = this.isLorebookVisible();
    const open = forceOpen ?? !currentlyVisible;

    if (open) {
      if (currentlyVisible) return;
      this.audioService.playSound('lore');
      this.isLorebookVisible.set(true);
    } else {
      if (!currentlyVisible) return;
      this.isLorebookClosing.set(true);
      setTimeout(() => {
        this.isLorebookVisible.set(false);
        this.isLorebookClosing.set(false);
        this.selectedLoreEntry.set(null); // Reset detail view on close
        this.loreDetailImage.set(null);
      }, ANIMATION_DURATION);
    }
  }

  toggleImageGeneration(): void {
    this.isImageGenerationEnabled.update(value => !value);
    if (!this.isImageGenerationEnabled()) {
        this.state.update(s => ({...s, image: null}));
    }
  }

  openCrafting(): void {
    this.craftingSelection.set([]);
    this.craftingStatus.set(null);
    this.isCrafting.set(true);
    this.audioService.playSound('craft_open');
  }

  closeCrafting(): void {
    this.isCraftingClosing.set(true);
    setTimeout(() => {
      this.isCrafting.set(false);
      this.isCraftingClosing.set(false);
    }, ANIMATION_DURATION);
  }
  
  toggleCraftingSelection(item: string): void {
    this.craftingSelection.update(current => {
      const index = current.indexOf(item);
      if (index > -1) {
        return current.filter(i => i !== item);
      } else {
        return [...current, item];
      }
    });
  }

  async attemptCrafting(): Promise<void> {
    const itemsToCombine = this.craftingSelection();
    if (itemsToCombine.length < 2 || this.isCraftingLoading()) return;

    this.isCraftingLoading.set(true);
    this.craftingStatus.set(null);

    const result = await this.geminiService.generateCraftingResult(
      itemsToCombine,
      this.gameState()?.inventory ?? [],
      this.language()
    );

    this.isCraftingLoading.set(false);

    if (result.success) {
      this.audioService.playSound('craft_success');
    } else {
      this.audioService.playSound('craft_fail');
    }
    
    this.craftingStatus.set({ success: result.success, message: result.message });
    
    this.state.update(s => {
      if (!s.gameState) return s;

      let newInventory = [...s.gameState.inventory];
      newInventory = newInventory.filter(item => !result.consumedItems.includes(item));
      if (result.success && result.newItemName) {
        newInventory.push(result.newItemName);
      }

      return {
        ...s,
        gameState: { ...s.gameState, inventory: newInventory }
      };
    });
    
    this.craftingSelection.set([]);
    setTimeout(() => this.closeCrafting(), 4000);
  }

  initiateDrop(item: string): void {
    this.itemToDrop.set(item);
  }

  cancelDrop(): void {
    this.isDropModalClosing.set(true);
    setTimeout(() => {
      this.itemToDrop.set(null);
      this.isDropModalClosing.set(false);
    }, ANIMATION_DURATION);
  }

  confirmDrop(): void {
    const item = this.itemToDrop();
    if (!item) return;

    this.state.update(s => {
      if (!s.gameState) return s;
      return {
        ...s,
        gameState: {
          ...s.gameState,
          inventory: s.gameState.inventory.filter(i => i !== item)
        }
      };
    });
    
    this.audioService.playSound('drop_item');
    this.cancelDrop();
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
    
    if (this.selectedArchetype()) {
      this.characterAppearance.set(this.archetypeData()[this.selectedArchetype()!].appearance);
    }
    
    if (!this.hasStarted()) {
        const currentLangUi = this.uiText();
        this.state.update(s => ({
            ...s,
            gameState: {
                ...s.gameState!,
                currentQuest: currentLangUi.initialQuest
            }
        }));
    }
  }

  private _performSave(): SavedState | null {
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
      return stateToSave;
    }
    return null;
  }

  saveGame(): void {
    if (this._performSave()) {
      this.audioService.playSound('save');
      this.saveStatus.set(this.uiText().saveSuccess);
      setTimeout(() => this.saveStatus.set(null), 2000);
    }
  }

  private autoSaveGame(): void {
    if (this._performSave()) {
      this.autoSaveStatus.set(this.uiText().autoSaveSuccess);
      setTimeout(() => this.autoSaveStatus.set(null), 2500);
    }
  }

  loadGame(): void {
    const saved = this.savedGame();
    if (saved) {
      this.audioService.playSound('start');
      this.language.set(saved.language);
      this.state.set({
        hasStarted: true,
        isLoading: false,
        loadingMessage: '',
        error: null,
        storySegment: saved.storySegment,
        gameState: saved.gameState,
        image: this.isImageGenerationEnabled() ? saved.image : null,
      });
    }
  }

  deleteGame(): void {
    localStorage.removeItem('infiniteAdventureSave');
    this.savedGame.set(null);
  }

  async confirmCharacterCreation(): Promise<void> {
    const name = this.characterName().trim();
    const archetype = this.selectedArchetype();
    if (!name || !archetype) return;

    this.audioService.playSound('start');
    const currentLangUi = this.uiText();
    const archetypeDetails = this.archetypeData()[archetype];

    const initialGameState: GameState = {
      inventory: archetypeDetails.inventory,
      currentQuest: currentLangUi.initialQuest,
      stats: archetypeDetails.stats,
      lorebook: []
    };
    
    this.closeCharacterCreation();

    this.state.set({
      ...this.initialState,
      gameState: initialGameState,
      hasStarted: true,
      isLoading: true,
      loadingMessage: currentLangUi.loadingWorld
    });
    
    const storyContext = `The hero, named ${name}, is a ${archetype}. Appearance: ${this.characterAppearance()}. They awaken with a gasp, a sense of purpose humming in their veins, but the path ahead is shrouded in mist.`;
    
    await this.processChoice(currentLangUi.initialChoice, storyContext);
  }

  async makeChoice(choice: string): Promise<void> {
    if (this.isLoading()) return;

    this.audioService.playSound('choice');
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
      
      const oldLore = initialGameState.lorebook ?? [];
      const newLoreEntries: LoreEntry[] = (aiResponse.gameState.lorebook ?? []).map((newLore: NewLoreEntry) => ({
        ...newLore,
        id: crypto.randomUUID(),
        discoveredDate: Date.now()
      }));

      if (newLoreEntries.length > 0) {
          this.loreNotification.set(newLoreEntries[0].title);
          this.audioService.playSound('discover_lore');
          setTimeout(() => this.loreNotification.set(null), 6000);
      }

      this.state.update(s => {
        if (!s.gameState) return s;
        return {
          ...s,
          storySegment: aiResponse.story,
          gameState: {
            ...s.gameState,
            ...aiResponse.gameState,
            lorebook: [...oldLore, ...newLoreEntries]
          }
        };
      });
      
      if (this.isImageGenerationEnabled()) {
        this.state.update(s => ({ ...s, loadingMessage: this.uiText().loadingPainting }));
        const imageBytes = await this.geminiService.generateImage(aiResponse.story.visualDescription)
          .catch((err: any) => {
              console.warn("Image generation failed; proceeding with story.", err);
              this.audioService.playSound('error');
              
              let imageErrorMessage: string;
              const errorMessage = err?.message?.toLowerCase() ?? '';

              // Use a more generic error for any image fetch failure now
              imageErrorMessage = this.uiText().errorQuota;
              
              this.state.update(s => ({ ...s, error: imageErrorMessage }));
              return null;
          });
        this.state.update(s => ({ ...s, image: imageBytes }));
      }

      this.state.update(s => ({
        ...s,
        isLoading: false,
        loadingMessage: ''
      }));
      
      this.audioService.playSound('update');
      this.autoSaveGame();

    } catch (error: any) {
      this.audioService.playSound('error');
      let finalErrorMessage: string;
      const errorMessage = error?.message ?? '';

      if (errorMessage.includes('QUOTA_EXCEEDED')) {
        finalErrorMessage = this.uiText().errorStoryQuota;
      } else if (errorMessage) {
        finalErrorMessage = errorMessage;
      } else {
        finalErrorMessage = this.uiText().errorGeneric;
      }

      this.state.update(s => ({
        ...s,
        isLoading: false,
        loadingMessage: '',
        error: finalErrorMessage
      }));
    }
  }

  // LOREBOOK METHODS
  setLoreSortOrder(order: 'date' | 'alpha'): void {
    this.loreSortOrder.set(order);
  }

  updateLoreSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.loreSearchTerm.set(input.value);
  }

  async selectLore(entry: LoreEntry): Promise<void> {
    this.selectedLoreEntry.set(entry);
    this.loreDetailImage.set(null);
    if (entry.imagePrompt && this.isImageGenerationEnabled()) {
      this.isLoreImageLoading.set(true);
      try {
        const imageBytes = await this.geminiService.generateImage(entry.imagePrompt);
        this.loreDetailImage.set(`data:image/jpeg;base64,${imageBytes}`);
      } catch (e) {
        console.error("Failed to generate lore image", e);
        this.loreDetailImage.set(null);
      } finally {
        this.isLoreImageLoading.set(false);
      }
    }
  }

  deselectLore(): void {
    this.selectedLoreEntry.set(null);
    this.loreDetailImage.set(null);
  }
}
