import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export const SARVAM_VOICE_TIMEOUT_MS = 5000;
export const VOICE_LANGUAGES = ['en-IN', 'hi-IN'] as const;
export type VoiceLanguage = (typeof VOICE_LANGUAGES)[number];

@Injectable()
export class SarvamService {
  private readonly logger = new Logger(SarvamService.name);
  private readonly apiKey: string;
  private readonly sttUrl: string;
  private readonly ttsUrl: string;
  private readonly chatUrl: string;
  private readonly sttModel = 'saaras:v3';
  private readonly chatModel = 'sarvam-105b-conversations';
  private readonly ttsModel = 'bulbul:v3';
  private readonly ttsSpeaker = 'ritu';
  private readonly ttsPace = 1;
  private readonly ttsSampleRate = 22050;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('app.sarvamApiKey') || '';
    this.sttUrl =
      this.config.get<string>('app.sarvamSttUrl') ||
      'https://api.sarvam.ai/speech-to-text';
    this.ttsUrl =
      this.config.get<string>('app.sarvamTtsUrl') ||
      'https://api.sarvam.ai/text-to-speech';
    this.chatUrl =
      this.config.get<string>('app.sarvamChatUrl') ||
      'https://api.sarvam.ai/v1/chat/completions';
  }

  isConfigured() {
    return Boolean(this.apiKey);
  }

  async speechToText(audioBase64: string, language: string = 'en-IN'): Promise<string> {
    this.requireConfigured();
    const languageCode = this.requireLanguage(language);
    try {
      const audio = Buffer.from(audioBase64, 'base64');
      const isWav =
        audio.subarray(0, 4).toString('ascii') === 'RIFF' &&
        audio.subarray(8, 12).toString('ascii') === 'WAVE';
      const fileName = isWav ? 'audio.wav' : 'audio.m4a';
      const formData = new FormData();
      formData.append(
        'file',
        new Blob([audio], { type: isWav ? 'audio/wav' : 'audio/mp4' }),
        fileName,
      );
      formData.append('model', this.sttModel);
      formData.append('mode', 'transcribe');
      formData.append('language_code', languageCode);

      const res = await fetch(this.sttUrl, {
        method: 'POST',
        headers: {
          'api-subscription-key': this.apiKey,
        },
        body: formData,
        signal: AbortSignal.timeout(SARVAM_VOICE_TIMEOUT_MS),
      });
      if (!res.ok) {
        const detail = await res.text();
        this.logger.error(`Sarvam speech recognition returned HTTP ${res.status}`, detail.slice(0, 1000));
        throw new ServiceUnavailableException('Voice is unavailable. Please try again.');
      }
      const data = await res.json();
      return data?.transcript || data?.text || '';
    } catch (err) {
      throw this.providerError('speech recognition', err);
    }
  }

  async understand(
    transcript: string,
    systemPrompt: string,
    language: string = 'en-IN',
  ): Promise<string> {
    this.requireConfigured();
    const languageCode = this.requireLanguage(language);
    try {
      const res = await fetch(this.chatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-subscription-key': this.apiKey,
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.chatModel,
          messages: [
            { role: 'system', content: `${systemPrompt}\nRespond in ${languageCode === 'hi-IN' ? 'Hindi' : 'English'}.` },
            { role: 'user', content: transcript },
          ],
          temperature: 0.2,
          max_tokens: 180,
          reasoning_effort: 'low',
          response_format: { type: 'json_object' },
          stream: true,
        }),
        signal: AbortSignal.timeout(SARVAM_VOICE_TIMEOUT_MS),
      });
      if (!res.ok) {
        const detail = await res.text();
        this.logger.error(`Sarvam assistant returned HTTP ${res.status}`, detail.slice(0, 1000));
        throw new ServiceUnavailableException('The assistant is down. Please try again.');
      }
      return await this.readChatStream(res);
    } catch (err) {
      throw this.providerError('assistant response', err);
    }
  }

  async textToSpeech(text: string, language: string = 'en-IN'): Promise<string> {
    this.requireConfigured();
    const languageCode = this.requireLanguage(language);
    try {
      const res = await fetch(this.ttsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-subscription-key': this.apiKey,
        },
        body: JSON.stringify({
          text: text.slice(0, 2500),
          model: this.ttsModel,
          language_code: languageCode,
          speaker: this.ttsSpeaker,
          pitch: 0,
          pace: this.ttsPace,
          speech_sample_rate: this.ttsSampleRate,
        }),
        signal: AbortSignal.timeout(SARVAM_VOICE_TIMEOUT_MS),
      });
      if (!res.ok) {
        const detail = await res.text();
        this.logger.error(`Sarvam speech synthesis returned HTTP ${res.status}`, detail.slice(0, 1000));
        throw new ServiceUnavailableException('Voice is unavailable. Please try again.');
      }
      const data = await res.json();
      const audio = data?.audio || data?.audios?.[0];
      if (typeof audio !== 'string' || !audio) {
        throw new ServiceUnavailableException('Voice unavailable. Sarvam returned no audio.');
      }
      return audio;
    } catch (err) {
      throw this.providerError('speech synthesis', err);
    }
  }

  private async readChatStream(response: Response): Promise<string> {
    if (!response.body) {
      throw new ServiceUnavailableException('Voice unavailable. Sarvam returned an empty response.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let pending = '';
    let content = '';

    const consumeLine = (line: string) => {
      if (!line.startsWith('data:')) return;
      const payload = line.slice(5).trim();
      if (!payload || payload === '[DONE]') return;
      let event: any;
      try {
        event = JSON.parse(payload);
      } catch {
        throw new ServiceUnavailableException('Voice unavailable. Sarvam returned an invalid response.');
      }
      if (event?.error) {
        throw new ServiceUnavailableException('The assistant is down. Please try again.');
      }
      const delta = event?.choices?.[0]?.delta?.content;
      if (typeof delta === 'string') content += delta;
    };

    try {
      while (true) {
        const { done, value } = await reader.read();
        pending += decoder.decode(value, { stream: !done });
        const lines = pending.split(/\r?\n/);
        pending = lines.pop() || '';
        lines.forEach(consumeLine);
        if (done) break;
      }
      if (pending) consumeLine(pending);
    } finally {
      reader.releaseLock();
    }

    if (!content.trim()) {
      throw new ServiceUnavailableException('Voice unavailable. Sarvam returned an empty response.');
    }
    return content;
  }

  private requireConfigured() {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'Voice unavailable. Configure SARVAM_API_KEY on the server to use voice features.',
      );
    }
  }

  private requireLanguage(language: string): VoiceLanguage {
    if (VOICE_LANGUAGES.includes(language as VoiceLanguage)) {
      return language as VoiceLanguage;
    }
    throw new BadRequestException('Only Hindi and English are supported for voice.');
  }

  private providerError(provider: string, error: unknown): Error {
    if (error instanceof ServiceUnavailableException) return error;
    const errorName =
      error && typeof error === 'object' && 'name' in error
        ? String(error.name)
        : '';
    const timedOut = errorName === 'TimeoutError' || errorName === 'AbortError';
    const name = provider === 'assistant' ? 'The assistant' : 'Voice service';
    const message = timedOut
      ? `${name} is taking too long. Please try again.`
      : `${name} is unavailable. Please try again.`;
    this.logger.error(
      message,
      error && typeof error === 'object' && 'message' in error
        ? String(error.message)
        : undefined,
    );
    return new ServiceUnavailableException(message);
  }
}
