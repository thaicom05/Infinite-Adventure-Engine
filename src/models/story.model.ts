
export interface Quest {
  title: string;
  objectives: string[];
}

export interface StorySegment {
  storyText: string;
  choices: string[];
  visualDescription: string;
}

export interface StatItem {
  name: string;
  value: string | number;
}

export interface LoreEntry {
  id: string;
  title: string;
  content: string;
  discoveredDate: number;
  imagePrompt?: string;
  rewardsGained?: string[]; // e.g., ["Ancient Sword", "Fireball Skill"]
}

// The structure the AI will return for new lore
export interface NewLoreEntry {
  title: string;
  content: string;
  imagePrompt?: string;
  rewardsGained?: string[];
}

export interface Companion {
  name: string;
  description: string; // A brief description of their appearance and personality
  mood: string; // e.g., "Anxious", "Confident", "Wary"
  stats: StatItem[]; // e.g., Health, Mana, Loyalty
}

export interface Skill {
  name: string;
  description: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
}

export interface GameState {
  characterName: string;
  avatarUrl?: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
  rebirths: number;
  skills: Skill[];
  inventory: string[];
  currentQuest: Quest;
  stats?: StatItem[];
  lorebook?: LoreEntry[];
  playerGender?: 'male' | 'female' | 'other';
  companion?: Companion | null;
}

// The gameState structure returned by the AI
export interface AiResponseGameState {
  level: number;
  xp: number;
  xpToNextLevel: number;
  rebirths: number;
  skills: Skill[];
  inventory: string[];
  currentQuest: Quest;
  stats?: StatItem[];
  lorebook?: NewLoreEntry[];
  companion?: Companion | null;
}

export interface AiResponse {
  story: StorySegment;
  gameState: AiResponseGameState;
}

export interface AppState {
  hasStarted: boolean;
  isLoading: boolean;
  loadingMessage: string;
  error: string | null;
  storySegment: StorySegment | null;
  gameState: GameState | null;
  image: string | null;
}

export interface SavedState {
  storySegment: StorySegment;
  gameState: GameState;
  image: string | null; // The base64 string, can be null
  language: 'th' | 'en';
}

export interface CraftingResult {
  success: boolean;
  newItemName: string;
  consumedItems: string[];
  message: string;
}
