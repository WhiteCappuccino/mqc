import {
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import { ApiBearerAuth, ApiQuery, ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import type { Response } from "express";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { ReportFormat, ReportsService } from "./reports.service";

@ApiTags("reports")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.MODERATOR, Role.ADMIN)
@Controller("reports")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get("media")
  @ApiQuery({ name: "format", enum: ["csv", "xlsx", "pdf"], required: true })
  async mediaReport(@Query("format") format: string, @Res() res: Response) {
    if (!["csv", "xlsx", "pdf"].includes(format)) {
      throw new BadRequestException("format must be csv, xlsx or pdf");
    }
    const typedFormat = format as ReportFormat;
    const buffer = await this.reportsService.generateMediaReport(typedFormat);

    const contentTypeMap: Record<ReportFormat, string> = {
      csv: "text/csv",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      pdf: "application/pdf",
    };

    res.setHeader("Content-Type", contentTypeMap[typedFormat]);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=media-report.${typedFormat}`,
    );
    res.send(buffer);
  }
}
