import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('ChefMate AI — Health & Demo (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/health (GET)', async () => {
    const res = await request(app.getHttpServer()).get('/api/health').expect(200);
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.service).toBe('chefmate-ai-backend');
  });

  it('/api/demo/status (GET)', async () => {
    const res = await request(app.getHttpServer()).get('/api/demo/status').expect(200);
    expect(res.body.data.demoMode).toBe(true);
  });
});
