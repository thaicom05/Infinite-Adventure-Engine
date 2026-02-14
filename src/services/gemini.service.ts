
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { GoogleGenAI, Type } from '@google/genai';
import { AiResponse, CraftingResult, GameState, StorySegment } from '../models/story.model';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class GeminiService {
  private readonly http = inject(HttpClient);
  
  private readonly ai: GoogleGenAI;
  private readonly storyModel = 'gemini-2.5-flash';

  constructor() {
    // API Keys are expected to be provided by the execution environment.
    const apiKey = (window as any).process?.env?.API_KEY ?? '';
    if (!apiKey) {
      console.error("Gemini API Key is missing. It should be provided by the environment.");
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
    companionCommand: string,
    currentGameState: GameState,
    language: 'th' | 'en'
  ): Promise<AiResponse> {

    const statItemSchema = {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          value: { type: Type.STRING }
        },
        required: ['name', 'value']
    };

    const skillSchema = {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        description: { type: Type.STRING },
        level: { type: Type.INTEGER },
        xp: { type: Type.INTEGER },
        xpToNextLevel: { type: Type.INTEGER }
      },
      required: ['name', 'description', 'level', 'xp', 'xpToNextLevel']
    };

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
            level: { type: Type.INTEGER, description: "Player's new current level." },
            xp: { type: Type.INTEGER, description: "Player's new current XP." },
            xpToNextLevel: { type: Type.INTEGER, description: "XP needed for the player's next level." },
            rebirths: { type: Type.INTEGER, description: "Number of times the player has rebirthed." },
            skills: { type: Type.ARRAY, description: "Player's updated skills array.", items: skillSchema },
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
              items: statItemSchema
            },
            lorebook: {
              type: Type.ARRAY,
              description: 'An array of NEWLY discovered lore objects based on the story. Do NOT include lore the player already has.',
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: 'A short, captivating title for the lore entry.' },
                  content: { type: Type.STRING, description: 'The detailed content of the lore snippet.' },
                  imagePrompt: { type: Type.STRING, description: 'A concise, visually descriptive prompt in English for an image related to this lore.' },
                  rewardsGained: { 
                    type: Type.ARRAY, 
                    description: 'If this lore granted items/skills, list their names here.',
                    items: { type: Type.STRING }
                  }
                },
                required: ['title', 'content']
              }
            },
            companion: {
              type: Type.OBJECT,
              nullable: true,
              description: 'The player\'s AI companion. Create one if null. Update its state otherwise.',
              properties: {
                name: { type: Type.STRING, description: 'Companion\'s name.' },
                description: { type: Type.STRING, description: 'A brief description of their appearance and personality.' },
                mood: { type: Type.STRING, description: 'Their current mood, e.g., "Anxious", "Brave".' },
                stats: { 
                  type: Type.ARRAY, 
                  description: 'Companion\'s stats like Health or Loyalty.',
                  items: statItemSchema
                }
              },
              required: ['name', 'description', 'mood', 'stats']
            }
          },
          required: ['level', 'xp', 'xpToNextLevel', 'rebirths', 'skills', 'inventory', 'currentQuest', 'stats', 'lorebook', 'companion']
        },
      },
      required: ['story', 'gameState']
    };

    const languageInstruction = language === 'th' 
      ? 'Generate all text output (story, choices, quest, inventory, stats keys, lore title and content, companion details, skill names/descriptions, rewards) in Thai language. The only exception is visualDescription and lore imagePrompt, which must be in English.'
      : 'Generate all text output (story, choices, quest, inventory, stats keys, lore title and content, companion details, skill names/descriptions, rewards) in English language.';
    
    const questContext = `Title: ${currentGameState.currentQuest.title}, Objectives: [${currentGameState.currentQuest.objectives.join(', ')}]`;
    const statsContext = currentGameState.stats && currentGameState.stats.length > 0 ? currentGameState.stats.map(s => `${s.name}: ${s.value}`).join(', ') : 'No stats yet.';
    const lorebookContext = currentGameState.lorebook && currentGameState.lorebook.length > 0 ? `Player already knows about: ["${currentGameState.lorebook.map(l => l.title).join('", "')}"]` : 'Player has not discovered any lore yet.';
    const genderContext = `Player's Gender: ${currentGameState.playerGender || 'not specified'}`;
    const companionContext = currentGameState.companion ? `Current Companion State: { Name: ${currentGameState.companion.name}, Description: "${currentGameState.companion.description}", Mood: "${currentGameState.companion.mood}", Stats: [${currentGameState.companion.stats.map(s => `${s.name}: ${s.value}`).join(', ')}] }` : 'Companion State: Player does not have a companion yet.';
    const commandContext = companionCommand.trim() ? `Player's Command to Companion: "${companionCommand}"` : 'Player\'s Command to Companion: None given.';
    const levelContext = `Player Level: ${currentGameState.level} (XP: ${currentGameState.xp}/${currentGameState.xpToNextLevel}), Rebirths: ${currentGameState.rebirths}`;
    const skillsContext = currentGameState.skills.length > 0 ? `Player Skills: [${currentGameState.skills.map(s => `${s.name} (Lvl ${s.level}, XP: ${s.xp}/${s.xpToNextLevel})`).join(', ')}]` : 'Player has no skills yet.';

    const prompt = `
      Context:
      ${genderContext}
      ${levelContext}
      ${skillsContext}
      Previous Story: "${previousStory}"
      Player's Choice: "${userChoice}"
      ${commandContext}
      Current Inventory: [${currentGameState.inventory.join(', ')}]
      Current Quest: "${questContext}"
      Player's Stats: [${statsContext}]
      ${companionContext}
      Known Lore: ${lorebookContext}

      Task:
      You are a master storyteller and game master for a dark fantasy RPG. Continue the adventure.
      1.  **Story Progression & XP:** Based on the player's action, write the next story segment. Award a logical amount of character XP and skill XP for any skills used.
      2.  **Leveling Up:** If character XP >= xpToNextLevel, level them up. Increment 'level', reset 'xp' (carry over excess), and set a new 'xpToNextLevel' (e.g., new_xp = level * 100). Max level is 99.
      3.  **REBIRTH (CRITICAL):** If level is 99 and the player levels up, they Rebirth.
          - Set 'level' to 1.
          - Increment 'rebirths' by 1.
          - In the story, describe a powerful, transcendent event.
          - **DOUBLE their core stats** (like Health, Mana - e.g., "100/100" becomes "200/200").
          - **RESET ALL SKILLS** to level 1 and 0 XP.
      4.  **Skill Management:** Level up skills (max 50) if their XP threshold is met. Set a new xpToNextLevel for the skill. Occasionally, you can grant a NEW skill as a reward.
      5.  **Lore Rewards:** If discovering new lore grants an item or skill, you MUST add the name of the reward(s) to the 'rewardsGained' array for that specific lore entry.
      6.  **Companion:** Ensure the companion is an active participant and process any commands.
      7.  **State Updates:** Update inventory, quest, and player stats.
      8.  **Next Step:** Provide 3 new choices and a visual description.
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
      const errorMessage = error.message || '';
      if (errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('429')) {
        throw new Error('QUOTA_EXCEEDED');
      }
      throw new Error(errorMessage || 'Failed to generate the next part of the story. The ancient magic is unstable.');
    }
  }

  async generateImage(prompt: string): Promise<string> {
    const openAIApiKey = (window as any).process?.env?.OPENAI_API_KEY ?? '';
    if (!openAIApiKey) {
      console.error("OpenAI API Key is missing. Please set it in your environment variables.");
      throw new Error('OpenAI API Key is not configured.');
    }

    const apiURL = 'https://api.openai.com/v1/images/generations';
    
    // DALL-E 3 requires more descriptive prompts for better results.
    const enhancedPrompt = `Epic dark fantasy digital painting of: ${prompt}. Cinematic lighting, high detail, dramatic atmosphere.`;

    const body = {
      model: "dall-e-3",
      prompt: enhancedPrompt,
      n: 1,
      size: "1792x1024",
      response_format: "b64_json"
    };

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openAIApiKey}`
    });

    try {
      const response = await firstValueFrom(
        this.http.post<any>(apiURL, body, { headers })
      );

      if (response && response.data && response.data[0] && response.data[0].b64_json) {
        return response.data[0].b64_json;
      } else {
        throw new Error('Invalid response structure from OpenAI API.');
      }
    } catch (error: any) {
      console.error('Error generating image with OpenAI:', error);
      const errorMessage = error?.error?.error?.message || 'Failed to generate image. The creative energies are blocked.';
      throw new Error(errorMessage);
    }
  }
}
