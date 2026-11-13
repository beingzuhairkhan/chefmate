import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { PantryService } from './pantry.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreatePantryItemDto, UpdatePantryItemDto, ConfirmScanDto } from './dto/pantry.dto';

@ApiTags('Pantry')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pantry')
export class PantryController {
  constructor(private readonly pantryService: PantryService) {}

  @Post('scan')
  @ApiOperation({ summary: 'Scan a fridge/pantry image with Gemini Vision and return recognized ingredients' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { image: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('image'))
  async scan(@UploadedFile() file: Express.Multer.File) {
    if (!file) return { ingredients: [], demoMode: true, error: 'No image provided' };
    const base64 = file.buffer.toString('base64');
    return this.pantryService.scan(base64, file.mimetype);
  }

  @Get()
  @ApiOperation({ summary: 'List all pantry items for the current user' })
  findAll(
    @CurrentUser('userId') userId: string,
    @Query('category') category?: string,
    @Query('expiringOnly') expiringOnly?: string,
  ) {
    return this.pantryService.findAll(userId, {
      category,
      expiringOnly: expiringOnly === 'true',
    });
  }

  @Get('expiring')
  @ApiOperation({ summary: 'List pantry items expiring soon' })
  expiring(@CurrentUser('userId') userId: string, @Query('days') days?: string) {
    return this.pantryService.findExpiringSoon(userId, days ? parseInt(days, 10) : 3);
  }

  @Get('expired')
  @ApiOperation({ summary: 'List expired pantry items' })
  expired(@CurrentUser('userId') userId: string) {
    return this.pantryService.findExpired(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Add a single pantry item' })
  create(@CurrentUser('userId') userId: string, @Body() dto: CreatePantryItemDto) {
    return this.pantryService.create(userId, dto);
  }

  @Post('batch')
  @ApiOperation({ summary: 'Confirm and save multiple scanned ingredients at once' })
  confirmScan(@CurrentUser('userId') userId: string, @Body() dto: ConfirmScanDto) {
    return this.pantryService.createMany(userId, dto.ingredients);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a pantry item' })
  update(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdatePantryItemDto,
  ) {
    return this.pantryService.update(id, userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a pantry item' })
  remove(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    return this.pantryService.remove(id, userId);
  }
}
