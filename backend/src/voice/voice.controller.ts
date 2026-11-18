import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { VoiceService } from './voice.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TranscribeDto, RespondDto, SpeakDto, StartCookingDto, UpdateCookingDto } from './dto/voice.dto';

@ApiTags('Voice Assistant')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('voice')
export class VoiceController {
  constructor(private readonly voiceService: VoiceService) {}

  @Post('transcribe')
  @ApiOperation({ summary: 'Sarvam Speech-to-Text: transcribe audio to text' })
  transcribe(@Body() dto: TranscribeDto) {
    return this.voiceService.transcribe(dto.audio, dto.language || 'en-IN');
  }

  @Post('respond')
  @ApiOperation({ summary: 'Sarvam assistant response and voice action execution' })
  respond(@CurrentUser('userId') userId: string, @Body() dto: RespondDto) {
    return this.voiceService.respond(userId, dto.text, dto.language || 'en-IN', dto.context);
  }

  @Post('speak')
  @ApiOperation({ summary: 'Sarvam Text-to-Speech: convert text to audio' })
  speak(@Body() dto: SpeakDto) {
    return this.voiceService.speak(dto.text, dto.language || 'en-IN');
  }

  @Post('pipeline')
  @ApiOperation({ summary: 'Full Sarvam voice pipeline: STT -> assistant -> tools -> TTS' })
  pipeline(@CurrentUser('userId') userId: string, @Body() dto: TranscribeDto) {
    return this.voiceService.fullPipeline(userId, dto.audio, dto.language || 'en-IN');
  }

  @Post('cooking/start')
  @ApiOperation({ summary: 'Start a cooking session for a recipe' })
  startCooking(@CurrentUser('userId') userId: string, @Body() dto: StartCookingDto) {
    return this.voiceService.startCooking(userId, dto.recipeId);
  }

  @Get('cooking/active')
  @ApiOperation({ summary: 'Get the active cooking session' })
  activeSession(@CurrentUser('userId') userId: string) {
    return this.voiceService.getActiveSession(userId);
  }

  @Post('cooking/next-step')
  @ApiOperation({ summary: 'Advance to the next cooking step' })
  nextStep(@CurrentUser('userId') userId: string, @Body('recipeId') recipeId?: string) {
    return this.voiceService.advanceCookingStep(userId, recipeId);
  }

  @Patch('cooking/:id')
  @ApiOperation({ summary: 'Update a cooking session (step, timer, status)' })
  updateSession(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateCookingDto,
  ) {
    return this.voiceService.updateCookingSession(userId, id, dto);
  }
}
