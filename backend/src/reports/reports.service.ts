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
      createdAt: this.formatDateRu(item.createdAt),
    }));

    if (format === "csv") {
      return Buffer.from(
        stringify(rows, {
          header: true,
          columns: [
            { key: "id", header: "ID" },
            { key: "title", header: "Название" },
            { key: "type", header: "Тип" },
            { key: "status", header: "Статус" },
            { key: "owner", header: "Владелец" },
            { key: "sizeBytes", header: "Размер" },
            { key: "score", header: "Оценка" },
            { key: "createdAt", header: "Дата создания" },
          ],
        }),
        "utf-8",
      );
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
      { header: "Дата создания", key: "createdAt", width: 24 },
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

      document.fontSize(16).text("Отчет по качеству медиа");
      document.moveDown();
      document.fontSize(9);

      for (const row of rows) {
        document.text(
          `${row.title} | тип=${row.type} | статус=${row.status} | владелец=${row.owner} | оценка=${row.score ?? "н/д"} | дата=${row.createdAt}`,
        );
      }

      document.end();
    });
  }

  private formatDateRu(value: Date) {
    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(value);
  }
}
