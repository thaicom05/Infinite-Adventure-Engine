
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
}

// The structure the AI will return for new lore
export interface NewLoreEntry {
  title: string;
  content: string;
  imagePrompt?: string;
}

export interface GameState {
  inventory: string[];
  currentQuest: Quest;
  stats?: StatItem[];
  lorebook?: LoreEntry[];
}

// The gameState structure returned by the AI
export interface AiResponseGameState {
  inventory: string[];
  currentQuest: Quest;
  stats?: StatItem[];
  lorebook?: NewLoreEntry[];
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
  image: string; // The base64 string
  language: 'th' | 'en';
}

export interface CraftingResult {
  success: boolean;
  newItemName: string;
  consumedItems: string[];
  message: string;
}
