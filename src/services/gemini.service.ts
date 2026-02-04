
import { Injectable, signal } from '@angular/core';
import { GoogleGenAI, Type } from '@google/genai';
import { AiResponse, CraftingResult, GameState, StorySegment } from '../models/story.model';

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

  async generateCraftingResult(
    itemsToCombine: string[],
    currentInventory: string[],
    language: 'th' | 'en'
  ): Promise<CraftingResult> {
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        success: { type: Type.BOOLEAN, description: 'Was the crafting attempt successful?' },
        newItemName: { type: Type.STRING, description: 'Name of the created item. Empty string if unsuccessful.' },
        consumedItems: { 
          type: Type.ARRAY, 
          items: { type: Type.STRING }, 
          description: 'List of items consumed in the attempt. This can include all or some of the selected items.' 
        },
        message: { type: Type.STRING, description: 'A description for the player about what happened during the crafting attempt.' }
      },
      required: ['success', 'newItemName', 'consumedItems', 'message']
    };
    
    const languageInstruction = language === 'th'
        ? 'Generate all text output (newItemName, message) in Thai language.'
        : 'Generate all text output (newItemName, message) in English language.';

    const prompt = `
      Context:
      Player's Full Inventory: [${currentInventory.join(', ')}]
      Items Selected for Crafting: [${itemsToCombine.join(', ')}]

      Task:
      You are the Crafting Master in a dark fantasy RPG. Determine the outcome of combining the selected items. Be creative, logical, and unpredictable. Not all combinations should succeed.
      1. If the combination is plausible, rule it a success. The result should be a single new item. Decide which of the selected items are consumed.
      2. If the combination is illogical or fails, rule it a failure. Describe the failure (e.g., they explode, fizzle into dust, create a useless item). Decide if any items are consumed in the failure.
      3. Provide a message for the player explaining the result.
      ${languageInstruction}
    `;

    try {
      const result = await this.ai.models.generateContent({
        model: this.storyModel,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema,
          temperature: 0.7
        },
      });

      const jsonString = result.text;
      return JSON.parse(jsonString) as CraftingResult;

    } catch (error: any) {
      console.error('Error generating crafting result:', error);
      // Return a default failure message so the game doesn't crash
      return {
        success: false,
        newItemName: '',
        consumedItems: itemsToCombine,
        message: language === 'th' ? 'พลังงานเวทมนตร์เกิดการย้อนกลับอย่างรุนแรง ไอเทมของคุณสลายไปในประกายไฟ' : 'A surge of unpredictable magic backfired, consuming your items in a flash of light.'
      };
    }
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
            },
            lorebook: {
              type: Type.ARRAY,
              description: 'An array of NEWLY discovered lore objects based on the story. Do NOT include lore the player already has.',
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: 'A short, captivating title for the lore entry.' },
                  content: { type: Type.STRING, description: 'The detailed content of the lore snippet.' },
                  imagePrompt: { type: Type.STRING, description: 'A concise, visually descriptive prompt in English for an image related to this lore.' }
                },
                required: ['title', 'content']
              }
            }
          },
          required: ['inventory', 'currentQuest', 'stats', 'lorebook']
        },
      },
      required: ['story', 'gameState']
    };

    const languageInstruction = language === 'th' 
      ? 'Generate all text output (story, choices, quest, inventory, stats keys, lore title and content) in Thai language. The only exception is visualDescription and lore imagePrompt, which must be in English.'
      : 'Generate all text output (story, choices, quest, inventory, stats keys, lore title and content) in English language.';
    
    const questContext = `Title: ${currentGameState.currentQuest.title}, Objectives: [${currentGameState.currentQuest.objectives.join(', ')}]`;
    const statsContext = currentGameState.stats && currentGameState.stats.length > 0
      ? currentGameState.stats.map(s => `${s.name}: ${s.value}`).join(', ')
      : 'No stats yet.';
    const lorebookContext = currentGameState.lorebook && currentGameState.lorebook.length > 0
      ? `Player already knows about: ["${currentGameState.lorebook.map(l => l.title).join('", "')}"]`
      : 'Player has not discovered any lore yet.';


    const prompt = `
      Context:
      Previous Story: "${previousStory}"
      Player's Choice: "${userChoice}"
      Current Inventory: [${currentGameState.inventory.join(', ')}]
      Current Quest: "${questContext}"
      Current Stats: [${statsContext}]
      Known Lore: ${lorebookContext}

      Task:
      Continue the dark fantasy adventure based on the player's choice. 
      Update the inventory, quest (title and objectives), and character stats.
      If any NEW, significant information about the world's history, creatures, or important events is revealed, add it as a new object to the lorebook array. Do not repeat known lore.
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
