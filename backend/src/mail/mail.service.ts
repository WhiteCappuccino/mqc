import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import nodemailer, { Transporter } from "nodemailer";

interface SendMailInput {
  to: string;
  subject: string;
  text: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter?: Transporter;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>("SMTP_HOST");
    const port = Number(this.configService.get<string>("SMTP_PORT", "587"));
    const user = this.configService.get<string>("SMTP_USER");
    const pass = this.configService.get<string>("SMTP_PASS");

    this.from = this.configService.get<string>("SMTP_FROM", "no-reply@media-quality.local");

    if (!host || !user || !pass) {
      this.logger.warn("SMTP is not configured. Email delivery is disabled.");
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: this.configService.get<string>("SMTP_SECURE", "false") === "true",
      auth: {
        user,
        pass,
      },
    });
  }

  async send(input: SendMailInput) {
    if (!this.transporter) return { sent: false, reason: "smtp_not_configured" };

    await this.transporter.sendMail({
      from: this.from,
      to: input.to,
      subject: input.subject,
      text: input.text,
    });

    return { sent: true };
  }
}
