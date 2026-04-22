import { Injectable } from "@nestjs/common";
import { MediaStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AnalyticsQueryDto } from "./dto/analytics-query.dto";

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(query: AnalyticsQueryDto) {
    const periodFilter = this.createPeriodFilter(query.dateFrom, query.dateTo);
    const baseWhere = periodFilter ? { createdAt: periodFilter } : {};

    const checkedStatuses = [
      MediaStatus.AUTO_CHECKED,
      MediaStatus.NEEDS_MANUAL_MODERATION,
      MediaStatus.ON_REVISION,
      MediaStatus.APPROVED,
      MediaStatus.REJECTED,
      MediaStatus.PUBLISHED,
      MediaStatus.ARCHIVED,
    ];

    const [checkedCount, rejectedCount, byType, topViolations, authorRows, checks] =
      await Promise.all([
        this.prisma.mediaItem.count({
          where: {
            ...baseWhere,
            status: { in: checkedStatuses },
          },
        }),
        this.prisma.mediaItem.count({
          where: {
            ...baseWhere,
            status: MediaStatus.REJECTED,
          },
        }),
        this.prisma.mediaItem.groupBy({
          by: ["type"],
          _count: { _all: true },
          where: baseWhere,
        }),
        this.prisma.violation.groupBy({
          by: ["type"],
          _count: { _all: true },
          where: periodFilter ? { createdAt: periodFilter } : {},
          orderBy: { _count: { type: "desc" } },
          take: 10,
        }),
        this.prisma.user.findMany({
          where: { isActive: true },
          select: {
            id: true,
            fullName: true,
            username: true,
            _count: {
              select: {
                mediaItems: {
                  where: baseWhere,
                },
              },
            },
          },
          orderBy: {
            mediaItems: {
              _count: "desc",
            },
          },
          take: 15,
        }),
        this.prisma.qualityCheck.findMany({
          where: periodFilter ? { createdAt: periodFilter } : {},
          include: {
            mediaItem: {
              select: {
                createdAt: true,
              },
            },
            violations: { select: { id: true } },
          },
          take: 5000,
          orderBy: { createdAt: "desc" },
        }),
      ]);

    const moderationDurationsMinutes = checks
      .filter((check) => check.finishedAt)
      .map((check) => {
        const from = check.mediaItem.createdAt.getTime();
        const to = (check.finishedAt ?? check.createdAt).getTime();
        return Math.max(0, (to - from) / (1000 * 60));
      });

    const avgModerationMinutes = moderationDurationsMinutes.length
      ? moderationDurationsMinutes.reduce((sum, value) => sum + value, 0) /
        moderationDurationsMinutes.length
      : 0;

    const totalViolations = checks.reduce((sum, check) => sum + check.violations.length, 0);
    const totalFalsePositives = checks.reduce((sum, check) => sum + check.falsePositive, 0);
    const falsePositiveRate = totalViolations
      ? Number((totalFalsePositives / totalViolations).toFixed(4))
      : 0;

    return {
      period: {
        dateFrom: query.dateFrom ?? null,
        dateTo: query.dateTo ?? null,
      },
      checkedCount,
      rejectedCount,
      mostCommonErrors: topViolations.map((row) => ({
        type: row.type,
        count: row._count._all,
      })),
      byAuthors: authorRows.map((row) => ({
        userId: row.id,
        fullName: row.fullName,
        username: row.username,
        totalMaterials: row._count.mediaItems,
      })),
      byTypes: byType.map((row) => ({
        type: row.type,
        totalMaterials: row._count._all,
      })),
      avgModerationMinutes: Number(avgModerationMinutes.toFixed(2)),
      falsePositiveRate,
    };
  }

  private createPeriodFilter(dateFrom?: string, dateTo?: string) {
    if (!dateFrom && !dateTo) return undefined;
    return {
      gte: dateFrom ? new Date(dateFrom) : undefined,
      lte: dateTo ? new Date(dateTo) : undefined,
    };
  }
}

