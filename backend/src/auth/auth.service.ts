import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { DEMO_USER_EMAIL, DEMO_USER_PASSWORD } from '../common/constants';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
    });

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email, true);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return this.buildAuthResponse(user);
  }

  async loginDemoUser() {
    let user = await this.usersService.findByEmail(DEMO_USER_EMAIL);
    if (!user) {
      const passwordHash = await bcrypt.hash(DEMO_USER_PASSWORD, 10);
      user = await this.usersService.create({
        name: 'ChefMate Demo User',
        email: DEMO_USER_EMAIL,
        passwordHash,
        preferredLanguage: 'en-IN',
        preferences: {
          dietaryPreference: 'Vegetarian',
          allergies: [],
          favoriteCuisines: ['Indian', 'Italian'],
          cookingExperience: 'Intermediate',
          householdSize: 2,
          weeklyBudget: 80,
          cookingTimePreference: '30 min',
          nutritionPreference: 'Balanced',
        },
      });
    }
    return this.buildAuthResponse(user);
  }

  async getMe(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');
    return this.sanitizeUser(user);
  }

  private buildAuthResponse(user: any) {
    const payload = { userId: String(user._id), email: user.email };
    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.get<string>('app.jwtSecret'),
      expiresIn: this.config.get<string>('app.jwtExpiresIn') || '7d',
    });
    return { accessToken, user: this.sanitizeUser(user) };
  }

  private sanitizeUser(user: any) {
    return {
      id: String(user._id),
      name: user.name,
      email: user.email,
      preferredLanguage: user.preferredLanguage,
      preferences: user.preferences,
      allergies: user.allergies,
      dietaryRestrictions: user.dietaryRestrictions,
    };
  }
}
