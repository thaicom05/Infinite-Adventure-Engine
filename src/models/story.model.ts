
export interface StorySegment {
  storyText: string;
  choices: string[];
  visualDescription: string;
}

export interface GameState {
  inventory: string[];
  currentQuest: string;
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
