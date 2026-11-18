import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import { json, urlencoded } from "express";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: false,
    bodyParser: false,
  });
  app.use(json({ limit: "10mb" }));
  app.use(urlencoded({ extended: true, limit: "10mb" }));
  const config = app.get(ConfigService);
  const logger = new Logger("Bootstrap");

  app.setGlobalPrefix("api");

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  const frontendOrigin =
    config.get<string>("app.frontendOrigin") || "http://localhost:5173";

  app.enableCors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle("ChefMate AI API")
    .setDescription(
      "AI-powered kitchen assistant backend — Gemini Vision, Sarvam Voice, BullMQ automation, 【entity-MongoDB¦canonical_name=MongoDB】.",
    )
    .setVersion("1.0.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/docs", app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = config.get<number>("app.port") || 3000;
  await app.listen(port, '0.0.0.0');
  logger.log(`ChefMate AI backend running on http://localhost:${port}`);
  logger.log(`Swagger docs at http://localhost:${port}/api/docs`);
  logger.log(
    `Demo mode: ${config.get("app.isDemoMode") ? "ON (no AI credentials)" : "OFF (real AI)"}`,
  );
}

bootstrap();