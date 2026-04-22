import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { stringify } from "csv-stringify/sync";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";

export type ReportFormat = "csv" | "xlsx" | "pdf";

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async generateMediaReport(
    format: ReportFormat,
    query?: { dateFrom?: string; dateTo?: string },
  ): Promise<Buffer> {
    const createdAt =
      query?.dateFrom || query?.dateTo
        ? {
            gte: query.dateFrom ? new Date(query.dateFrom) : undefined,
            lte: query.dateTo ? new Date(query.dateTo) : undefined,
          }
        : undefined;

    const items = await this.prisma.mediaItem.findMany({
      where: { createdAt },
      include: {
        owner: true,
        qualityChecks: { take: 1, orderBy: { createdAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
    });

    const rows = items.map((item) => ({
      id: item.id,
      title: item.title,
      type: item.type,
      status: item.status,
      owner: item.owner.email,
      sizeBytes: item.sizeBytes,
      score: item.qualityChecks[0]?.finalScore ?? null,
      createdAt: item.createdAt.toISOString(),
    }));

    if (format === "csv") {
      return Buffer.from(stringify(rows, { header: true }), "utf-8");
    }

    if (format === "xlsx") {
      return this.generateXlsx(rows);
    }

    return this.generatePdf(rows);
  }

  private async generateXlsx(rows: Record<string, unknown>[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Media Report");

    sheet.columns = [
      { header: "ID", key: "id", width: 25 },
      { header: "Title", key: "title", width: 24 },
      { header: "Type", key: "type", width: 12 },
      { header: "Status", key: "status", width: 16 },
      { header: "Owner", key: "owner", width: 24 },
      { header: "Size", key: "sizeBytes", width: 12 },
      { header: "Score", key: "score", width: 10 },
      { header: "Created At", key: "createdAt", width: 24 },
    ];

    rows.forEach((row) => sheet.addRow(row));
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  private generatePdf(rows: Record<string, unknown>[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const document = new PDFDocument({
        margin: 32,
        size: "A4",
      });
      const chunks: Uint8Array[] = [];
      document.on("data", (chunk) => chunks.push(chunk));
      document.on("end", () => resolve(Buffer.concat(chunks)));
      document.on("error", reject);

      document.fontSize(16).text("Media Quality Report");
      document.moveDown();
      document.fontSize(9);

      for (const row of rows) {
        document.text(
          `${row.title} | type=${row.type} | status=${row.status} | owner=${row.owner} | score=${row.score ?? "n/a"}`,
        );
      }

      document.end();
    });
  }
}
