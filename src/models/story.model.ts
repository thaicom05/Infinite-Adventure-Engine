
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

export interface GameState {
  inventory: string[];
  currentQuest: Quest;
  stats?: StatItem[];
}

export interface AiResponse {
  story: StorySegment;
  gameState: GameState;
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
