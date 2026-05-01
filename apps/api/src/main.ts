import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { appDefaults, envKeys } from "./common/app.constants.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  const port = Number(process.env[envKeys.port] ?? process.env[envKeys.apiPort] ?? appDefaults.port);
  await app.listen(port);
  console.log(`API listening on http://localhost:${port}`);
}

void bootstrap();
