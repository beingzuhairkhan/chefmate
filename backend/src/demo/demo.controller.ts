import { Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DemoService } from './demo.service';

@ApiTags('Demo Mode')
@Controller('demo')
export class DemoController {
  constructor(private readonly demoService: DemoService) {}

  @Get('status')
  @ApiOperation({ summary: 'Check demo mode status' })
  status() {
    return this.demoService.getDemoStatus();
  }

  @Post('load-data')
  @ApiOperation({ summary: 'One-click: create demo user + load all sample data (pantry, recipes, meal plan, grocery, notifications, automation history)' })
  loadData() {
    return this.demoService.loadDemoData();
  }

  @Get('user')
  @ApiOperation({ summary: 'Get demo user auth token (login as demo user)' })
  user() {
    return this.demoService.getDemoUser();
  }
}
