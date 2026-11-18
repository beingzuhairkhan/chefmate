import { ConfigService } from '@nestjs/config';
import { SarvamService } from './sarvam.service';

function configuredService() {
  return new SarvamService(new ConfigService({
    app: {
      sarvamApiKey: 'test-key',
      sarvamSttUrl: 'https://sarvam.example/stt',
      sarvamTtsUrl: 'https://sarvam.example/tts',
      sarvamChatUrl: 'https://sarvam.example/chat',
    },
  }));
}

function streamResponse(chunks: string[]) {
  return new Response(new ReadableStream({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(new TextEncoder().encode(chunk)));
      controller.close();
    },
  }));
}

describe('SarvamService speech recognition', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sends WAV audio to Saaras with the selected language', async () => {
    const fetch = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ transcript: 'नमस्ते' }), { status: 200 }),
    );
    const service = configuredService();
    const audio = Buffer.from('RIFF0000WAVEdata');

    await expect(service.speechToText(audio.toString('base64'), 'hi-IN')).resolves.toBe('नमस्ते');

    const [url, request] = fetch.mock.calls[0];
    expect(url).toBe('https://sarvam.example/stt');
    expect(request?.headers).toEqual({ 'api-subscription-key': 'test-key' });
    const formData = request?.body as FormData;
    expect(formData.get('model')).toBe('saaras:v3');
    expect(formData.get('mode')).toBe('transcribe');
    expect(formData.get('language_code')).toBe('hi-IN');
    const file = formData.get('file') as File;
    expect(file.name).toBe('audio.wav');
    expect(file.type).toBe('audio/wav');
    expect(Buffer.from(await file.arrayBuffer())).toEqual(audio);
  });

  it('sends native MPEG-4 audio with an M4A filename', async () => {
    const fetch = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ transcript: 'Hello' }), { status: 200 }),
    );
    const service = configuredService();
    const audio = Buffer.from('0000ftypM4A ');

    await service.speechToText(audio.toString('base64'));

    const formData = fetch.mock.calls[0][1]?.body as FormData;
    const file = formData.get('file') as File;
    expect(file.name).toBe('audio.m4a');
    expect(file.type).toBe('audio/mp4');
  });
});

describe('SarvamService voice responses', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('streams Sarvam chat completion chunks and requests Hindi JSON', async () => {
    const content = JSON.stringify({ textResponse: 'नमस्ते', toolCalls: [] });
    const event = JSON.stringify({ choices: [{ delta: { content } }] });
    const fetch = jest.spyOn(global, 'fetch').mockResolvedValue(
      streamResponse([`data: ${event.slice(0, 15)}`, `${event.slice(15)}\n`, 'data: [DONE]\n']),
    );
    const service = configuredService();

    await expect(service.understand('नमस्ते', 'Use valid JSON.', 'hi-IN')).resolves.toBe(content);

    const [url, request] = fetch.mock.calls[0];
    expect(url).toBe('https://sarvam.example/chat');
    expect(request?.headers).toEqual({
      'Content-Type': 'application/json',
      'api-subscription-key': 'test-key',
      Authorization: 'Bearer test-key',
    });
    expect(JSON.parse(String(request?.body))).toMatchObject({
      model: 'sarvam-105b-conversations',
      stream: true,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: expect.stringContaining('Hindi') },
        { role: 'user', content: 'नमस्ते' },
      ],
    });
  });

  it('uses the configured female Bulbul voice and selected language', async () => {
    const fetch = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ audios: ['dGVzdA=='] }), { status: 200 }),
    );
    const service = configuredService();

    await expect(service.textToSpeech('नमस्ते', 'hi-IN')).resolves.toBe('dGVzdA==');

    expect(JSON.parse(String(fetch.mock.calls[0][1]?.body))).toMatchObject({
      model: 'bulbul:v3',
      language_code: 'hi-IN',
      speaker: 'ritu',
      pitch: 0,
      pace: 1,
      speech_sample_rate: 22050,
    });
  });

  it('reports a clear unavailable error without Sarvam credentials', async () => {
    const service = new SarvamService(new ConfigService({ app: { sarvamApiKey: '' } }));

    await expect(service.speechToText('YQ==')).rejects.toThrow('Voice unavailable. Configure SARVAM_API_KEY');
    await expect(service.understand('Hello', 'Prompt')).rejects.toThrow('Voice unavailable. Configure SARVAM_API_KEY');
    await expect(service.textToSpeech('Hello')).rejects.toThrow('Voice unavailable. Configure SARVAM_API_KEY');
  });

  it('returns a clear timeout message when Sarvam takes more than five seconds', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new DOMException('Timed out', 'TimeoutError'));

    await expect(configuredService().textToSpeech('Hello')).rejects.toThrow(
      'Voice unavailable. Sarvam speech synthesis timed out after 5 seconds.',
    );
  });
});
