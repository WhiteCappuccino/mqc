import { Module } from "@nestjs/common";
import { AnalyzerClientService } from "./analyzer-client.service";

@Module({
  providers: [AnalyzerClientService],
  exports: [AnalyzerClientService],
})
export class AnalyzerModule {}
