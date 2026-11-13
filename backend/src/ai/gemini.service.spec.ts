import { ConfigService } from '@nestjs/config';
import { GeminiService } from './gemini.service';

describe('GeminiService.generateJson', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('requests JSON output from OpenRouter', async () => {
    const config = new ConfigService({
      app: { openrouterApiKey: 'test-key', openrouterModel: 'test/model' },
    });
    const fetch = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        choices: [{ message: { content: '{"result":true}' } }],
      }), { status: 200 }),
    );
    const service = new GeminiService(config);

    await expect(service.generateJson<{ result: boolean }>('Return a result')).resolves.toEqual({ result: true });

    const body = JSON.parse(String(fetch.mock.calls[0][1]?.body));
    expect(body.response_format).toEqual({ type: 'json_object' });
  });

  it('requests JSON MIME output from Gemini', async () => {
    const config = new ConfigService({
      app: { geminiApiKey: 'test-key', geminiModel: 'test-model' },
    });
    const fetch = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text: '{"result":true}' }] } }],
      }), { status: 200 }),
    );
    const service = new GeminiService(config);

    await expect(service.generateJson<{ result: boolean }>('Return a result')).resolves.toEqual({ result: true });

    const body = JSON.parse(String(fetch.mock.calls[0][1]?.body));
    expect(body.generationConfig.responseMimeType).toBe('application/json');
  });

  it('tries the configured Gemini key before the OpenRouter free router', async () => {
    const config = new ConfigService({
      app: {
        geminiApiKey: 'gemini-test-key',
        geminiModel: 'gemini-3.8-flash',
        openrouterApiKey: 'openrouter-test-key',
        openrouterModel: 'openrouter/free',
      },
    });
    const fetch = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text: '{"result":true}' }] } }],
      }), { status: 200 }),
    );
    const service = new GeminiService(config);

    await expect(service.generateJson<{ result: boolean }>('Return a result')).resolves.toEqual({ result: true });

    expect(fetch.mock.calls[0][0]).toContain('generativelanguage.googleapis.com');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('falls back to OpenRouter when Gemini requests time out', async () => {
    const config = new ConfigService({
      app: {
        geminiApiKey: 'gemini-test-key',
        geminiModel: 'test-model',
        openrouterApiKey: 'openrouter-test-key',
        openrouterModel: 'openrouter/free',
      },
    });
    const fetch = jest.spyOn(global, 'fetch')
      .mockRejectedValueOnce(new DOMException('Request timed out', 'TimeoutError'))
      .mockRejectedValueOnce(new DOMException('Request timed out', 'TimeoutError'))
      .mockRejectedValueOnce(new DOMException('Request timed out', 'TimeoutError'))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          choices: [{ message: { content: '{"result":true}' } }],
        }), { status: 200 }),
      );
    const service = new GeminiService(config);

    await expect(service.generateJson<{ result: boolean }>('Return a result')).resolves.toEqual({ result: true });

    expect(fetch).toHaveBeenCalledTimes(4);
    for (const [url, options] of fetch.mock.calls.slice(0, 3)) {
      expect(url).toContain('generativelanguage.googleapis.com');
      expect(options?.signal).toBeInstanceOf(AbortSignal);
    }
    expect(fetch.mock.calls[3][0]).toContain('openrouter.ai');
  });
});
