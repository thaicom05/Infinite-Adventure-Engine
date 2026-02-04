
import { Injectable, signal } from '@angular/core';
import { GoogleGenAI, Type } from '@google/genai';
import { AiResponse, GameState, StorySegment } from '../models/story.model';

@Injectable({
  providedIn: 'root',
})
export class GeminiService {
  private readonly ai: GoogleGenAI;
  private readonly storyModel = 'gemini-2.5-flash';
  private readonly imageModel = 'imagen-4.0-generate-001';

  constructor() {
    // This is a placeholder for the API key. In a real applet environment,
    // process.env.API_KEY would be provided.
    const apiKey = (window as any).process?.env?.API_KEY ?? '';
    if (!apiKey) {
      console.error("API Key is missing. Please set it in your environment variables.");
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  async generateNextStep(
    previousStory: string,
    userChoice: string,
    currentGameState: GameState,
    language: 'th' | 'en'
  ): Promise<AiResponse> {

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        story: {
          type: Type.OBJECT,
          properties: {
            storyText: { type: Type.STRING, description: 'The next paragraph of the story. Max 150 words.' },
            choices: { 
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'An array of 3-4 possible actions for the player.' 
            },
            visualDescription: { 
              type: Type.STRING, 
              description: 'A concise, visually descriptive prompt for an image generator based on the story text. Focus on character, action, and environment. This should always be in English.' 
            },
          },
          required: ['storyText', 'choices', 'visualDescription']
        },
        gameState: {
          type: Type.OBJECT,
          properties: {
            inventory: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: 'The player\'s updated inventory. Add or remove items logically.' 
            },
            currentQuest: { 
              type: Type.OBJECT,
              description: 'The player\'s updated quest. It can change based on the story.',
              properties: {
                title: { type: Type.STRING, description: 'A brief title for the current quest.' },
                objectives: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'A list of 1-3 concrete objectives for the current quest.'
                }
              },
              required: ['title', 'objectives']
            },
            stats: {
              type: Type.ARRAY,
              description: 'An array of character statistics. Only add, update, or remove stats if narratively relevant.',
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: 'The name of the stat (e.g., Health, Mana).' },
                  value: { type: Type.STRING, description: 'The value of the stat (e.g., "100/100", "50").' }
                },
                required: ['name', 'value']
              }
            }
          },
          required: ['inventory', 'currentQuest']
        },
      },
      required: ['story', 'gameState']
    };

    const languageInstruction = language === 'th' 
      ? 'Generate all text output (story, choices, quest, inventory, stats keys) in Thai language. The only exception is visualDescription, which must be in English.'
      : 'Generate all text output (story, choices, quest, inventory, stats keys) in English language.';
    
    const questContext = `Title: ${currentGameState.currentQuest.title}, Objectives: [${currentGameState.currentQuest.objectives.join(', ')}]`;
    const statsContext = currentGameState.stats && currentGameState.stats.length > 0
      ? currentGameState.stats.map(s => `${s.name}: ${s.value}`).join(', ')
      : 'No stats yet.';


    const prompt = `
      Context:
      Previous Story: "${previousStory}"
      Player's Choice: "${userChoice}"
      Current Inventory: [${currentGameState.inventory.join(', ')}]
      Current Quest: "${questContext}"
      Current Stats: [${statsContext}]

      Task:
      Continue the dark fantasy adventure based on the player's choice. 
      Update the inventory, quest (title and objectives), and character stats (as an array of {name, value} objects) if necessary based on the story.
      Provide 3 new choices.
      Generate a visual description for the scene.
      ${languageInstruction}
    `;

    try {
      const result = await this.ai.models.generateContent({
        model: this.storyModel,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema,
          temperature: 0.8,
          thinkingConfig: { thinkingBudget: 0 } // For low latency
        },
      });

      const jsonString = result.text;
      return JSON.parse(jsonString) as AiResponse;
    } catch (error: any) {
      console.error('Error generating story step:', error);
      throw new Error(error.message || 'Failed to generate the next part of the story. The ancient magic is unstable.');
    }
  }

  async generateImage(prompt: string): Promise<string> {
    const fullPrompt = `${prompt}. Epic fantasy digital painting, detailed character design, atmospheric lighting, cinematic composition, moody, dark fantasy art style.`;
    
    try {
      const result = await this.ai.models.generateImages({
        model: this.imageModel,
        prompt: fullPrompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: '16:9',
        },
      });

      if (result.generatedImages && result.generatedImages.length > 0) {
        return result.generatedImages[0].image.imageBytes;
      }
      throw new Error('No image was generated.');
    } catch (error: any) {
      console.error('Error generating image:', error);
      throw new Error(error.message || 'Failed to visualize the world. The ether is disturbed.');
    }
  }
}
