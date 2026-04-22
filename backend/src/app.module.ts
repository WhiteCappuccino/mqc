import { AdminModule } from "./admin/admin.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AnalyzerModule } from "./analyzer/analyzer.module";
import { AuditModule } from "./audit/audit.module";
import { AuthModule } from "./auth/auth.module";
import { CollectionsModule } from "./collections/collections.module";
import { CommentsModule } from "./comments/comments.module";
import { FavoritesModule } from "./favorites/favorites.module";
import { HealthModule } from "./health/health.module";
import { MediaModule } from "./media/media.module";
import { ModerationModule } from "./moderation/moderation.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ProfileModule } from "./profile/profile.module";
import { ReportsModule } from "./reports/reports.module";
import { StorageModule } from "./storage/storage.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env"],
    }),
    PrismaModule,
    AuditModule,
    NotificationsModule,
    StorageModule,
    AnalyzerModule,
    UsersModule,
    AuthModule,
    ProfileModule,
    MediaModule,
    FavoritesModule,
    CollectionsModule,
    CommentsModule,
    ModerationModule,
    AnalyticsModule,
    AdminModule,
    ReportsModule,
    HealthModule,
  ],
})
export class AppModule {}
