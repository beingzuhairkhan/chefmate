import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AutomationService } from './automation.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Automation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('automation')
export class AutomationController {
  constructor(private readonly automationService: AutomationService) {}

  @Get('history')
  @ApiOperation({ summary: 'Get automation job execution history for the current user' })
  history(@CurrentUser('userId') userId: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.automationService.getHistory(
      userId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Post('expiry-check')
  @ApiOperation({ summary: 'Manually trigger an expiry check (admin/debug)' })
  triggerExpiry() {
    return this.automationService.runExpiryCheck();
  }
}
