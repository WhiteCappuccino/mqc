import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { NotificationType, User } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import { AuditService } from "../audit/audit.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { UsersService } from "../users/users.service";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { VerifyEmailDto } from "./dto/verify-email.dto";
import { JwtPayload } from "./jwt-payload.interface";

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
  ) {}

  async register(dto: RegisterDto) {
    const [existsByEmail, existsByUsername] = await Promise.all([
      this.usersService.findByEmail(dto.email),
      this.usersService.findByUsername(dto.username),
    ]);
    if (existsByEmail) {
      throw new BadRequestException("User with this email already exists");
    }
    if (existsByUsername) {
      throw new BadRequestException("Username is already taken");
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({
      email: dto.email,
      username: dto.username,
      fullName: dto.fullName,
      passwordHash,
    });

    const verifyToken = randomUUID();
    await this.prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        token: verifyToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    await this.auditService.log({
      actorId: user.id,
      action: "REGISTER",
      entityType: "USER",
      entityId: user.id,
      metadata: { email: user.email, username: user.username },
    });

    const auth = this.issueToken(user);
    return {
      ...auth,
      verificationToken: verifyToken,
    };
  }

  async login(dto: LoginDto, metadata?: { ipAddress?: string; userAgent?: string }) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !user.isActive) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const failedAttempts = await this.usersService.countRecentFailedLogins(user.id, 15);
    if (failedAttempts >= 5) {
      throw new ForbiddenException("Too many failed attempts, try later");
    }

    const matches = await bcrypt.compare(dto.password, user.passwordHash);
    await this.usersService.createLoginHistory(
      user.id,
      matches,
      metadata?.ipAddress,
      metadata?.userAgent,
    );

    if (!matches) {
      throw new UnauthorizedException("Invalid credentials");
    }

    await this.auditService.log({
      actorId: user.id,
      action: "LOGIN",
      entityType: "USER",
      entityId: user.id,
      metadata: { email: user.email },
    });

    return this.issueToken(user);
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      return { ok: true };
    }

    const token = randomUUID();
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    await this.notificationsService.notify({
      userId: user.id,
      type: NotificationType.STATUS_CHANGED,
      title: "Password reset requested",
      message: `Use reset token: ${token}`,
      alsoEmail: true,
    });

    await this.auditService.log({
      actorId: user.id,
      action: "REQUEST_PASSWORD_RESET",
      entityType: "USER",
      entityId: user.id,
      metadata: {},
    });

    return { ok: true, resetToken: token };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenEntity = await this.prisma.passwordResetToken.findUnique({
      where: { token: dto.token },
    });
    if (!tokenEntity || tokenEntity.usedAt || tokenEntity.expiresAt < new Date()) {
      throw new BadRequestException("Invalid reset token");
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: tokenEntity.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: tokenEntity.id },
        data: { usedAt: new Date() },
      }),
    ]);

    await this.auditService.log({
      actorId: tokenEntity.userId,
      action: "RESET_PASSWORD",
      entityType: "USER",
      entityId: tokenEntity.userId,
      metadata: {},
    });

    return { ok: true };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const tokenEntity = await this.prisma.emailVerificationToken.findUnique({
      where: { token: dto.token },
    });
    if (!tokenEntity || tokenEntity.usedAt || tokenEntity.expiresAt < new Date()) {
      throw new BadRequestException("Invalid verification token");
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: tokenEntity.userId },
        data: { emailVerified: true },
      }),
      this.prisma.emailVerificationToken.update({
        where: { id: tokenEntity.id },
        data: { usedAt: new Date() },
      }),
    ]);

    await this.auditService.log({
      actorId: tokenEntity.userId,
      action: "VERIFY_EMAIL",
      entityType: "USER",
      entityId: tokenEntity.userId,
      metadata: {},
    });

    return { ok: true };
  }

  async validateUser(payload: JwtPayload): Promise<JwtPayload> {
    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException("Invalid token");
    }

    return {
      sub: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    };
  }

  private issueToken(user: User) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      userId: user.id,
      email: user.email,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      emailVerified: user.emailVerified,
    };
  }
}
