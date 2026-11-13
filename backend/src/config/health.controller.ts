import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly config: ConfigService) {}

  @Get()
  check() {
    return {
      status: 'ok',
      service: 'chefmate-ai-backend',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      demoMode: this.config.get('app.isDemoMode'),
    };
  }
}
