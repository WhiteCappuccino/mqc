import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance } from "axios";

interface AnalyzePayload {
  mediaType: string;
  title: string;
  description?: string;
  mimeType: string;
  sizeBytes: number;
  fileName: string;
  fileUrl?: string;
  duplicateHint?: boolean;
}

export interface AnalyzeResponse {
  score: number;
  violations: string[];
  recommendation: "approved" | "manual_review" | "reject";
  details: Record<string, unknown>;
}

@Injectable()
export class AnalyzerClientService {
  private readonly http: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    this.http = axios.create({
      baseURL: this.configService.getOrThrow<string>("ANALYZER_URL"),
      timeout: 8000,
    });
  }

  async analyze(payload: AnalyzePayload): Promise<AnalyzeResponse> {
    try {
      const response = await this.http.post<AnalyzeResponse>("/analyze", payload);
      return response.data;
    } catch {
      throw new InternalServerErrorException("Analyzer service unavailable");
    }
  }
}
