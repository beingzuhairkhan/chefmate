import { Test } from '@nestjs/testing';
import { GeminiService } from '../gemini.service';
import { RecipeAgent } from './recipe-agent';

describe('RecipeAgent configured provider failures', () => {
  it('surfaces a provider error instead of returning demo recipes', async () => {
    const providerError = new Error('AI provider unavailable');
    const gemini = {
      isConfigured: jest.fn().mockReturnValue(true),
      generateJson: jest.fn().mockRejectedValue(providerError),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        RecipeAgent,
        { provide: GeminiService, useValue: gemini },
      ],
    }).compile();

    try {
      const agent = moduleRef.get(RecipeAgent);

      await expect(agent.generateRecipes({ ingredients: ['Tomatoes'] })).rejects.toBe(providerError);
    } finally {
      await moduleRef.close();
    }
  });
});
