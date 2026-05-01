import { Module } from "@nestjs/common";
import { SourcesController } from "./sources.controller.js";

@Module({
  controllers: [SourcesController]
})
export class SourcesModule {}
