import { ConfigService } from '@nestjs/config';
import { SarvamService } from './sarvam.service';

describe('SarvamService.speechToText', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sends decoded WAV audio as a multipart file', async () => {
    const config = new ConfigService({
      app: {
        sarvamApiKey: 'test-key',
        sarvamSttUrl: 'https://sarvam.example/stt',
      },
    });
    const fetch = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ transcript: 'Hello' }), { status: 200 }),
    );
    const service = new SarvamService(config);
    const audio = Buffer.from('RIFF0000WAVEdata');

    await expect(service.speechToText(audio.toString('base64'))).resolves.toBe(
      'Hello',
    );

    const request = fetch.mock.calls[0][1];
    expect(request?.headers).toEqual({ 'api-subscription-key': 'test-key' });
    const formData = request?.body as FormData;
    expect(formData.get('language_code')).toBe('en-IN');
    const file = formData.get('file') as File;
    expect(file.name).toBe('audio.wav');
    expect(file.type).toBe('audio/wav');
    expect(Buffer.from(await file.arrayBuffer())).toEqual(audio);
  });

  it('sends native MPEG-4 audio with an M4A filename', async () => {
    const config = new ConfigService({
      app: {
        sarvamApiKey: 'test-key',
        sarvamSttUrl: 'https://sarvam.example/stt',
      },
    });
    const fetch = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ transcript: 'Hello' }), { status: 200 }),
    );
    const service = new SarvamService(config);
    const audio = Buffer.from('0000ftypM4A ');

    await service.speechToText(audio.toString('base64'));

    const formData = fetch.mock.calls[0][1]?.body as FormData;
    const file = formData.get('file') as File;
    expect(file.name).toBe('audio.m4a');
    expect(file.type).toBe('audio/mp4');
  });
});

describe('SarvamService.textToSpeech', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sends the configured Bulbul V3 voice settings', async () => {
    const config = new ConfigService({
      app: {
        sarvamApiKey: 'test-key',
        sarvamTtsUrl: 'https://sarvam.example/tts',
      },
    });
    const fetch = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ audio: 'dGVzdA==' }), { status: 200 }),
    );
    const service = new SarvamService(config);

    await expect(service.textToSpeech('Hello')).resolves.toBe('dGVzdA==');

    const body = JSON.parse(String(fetch.mock.calls[0][1]?.body));
    expect(body).toMatchObject({
      model: 'bulbul:v3',
      language_code: 'en-IN',
      speaker: 'ritu',
      pitch: 0,
      pace: 1,
      speech_sample_rate: 22050,
    });
  });
});
