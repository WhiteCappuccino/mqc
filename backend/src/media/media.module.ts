import { Module } from "@nestjs/common";
import { AnalyzerModule } from "../analyzer/analyzer.module";
import { StorageModule } from "../storage/storage.module";
import { MediaController } from "./media.controller";
import { MediaService } from "./media.service";

@Module({
  imports: [StorageModule, AnalyzerModule],
  controllers: [MediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
