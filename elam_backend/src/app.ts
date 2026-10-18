import express, { Express, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import apiRoutes from "./routes/index.js";
import { ENV } from "./config/env.js";

export const createApp = (): Express => {
  const app = express();
  app.set("trust proxy", 1);

  // En production, rediriger tout trafic HTTP vers HTTPS (y compris derrière Vercel).
  app.use((req, res, next) => {
    if (ENV.NODE_ENV === "production" && !req.secure) {
      const host = req.get("host");
      if (!host) return res.sendStatus(400);
      return res.redirect(308, `https://${host}${req.originalUrl}`);
    }
    if (req.secure) {
      res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }
    next();
  });

  // Middlewares de sécurité
  app.use(helmet());
  app.use(cors({ origin: "*" }));
  app.use(
    express.json({
      limit: "10mb",
      // On conserve le corps brut : indispensable pour verifier la signature
      // HMAC des webhooks de paiement (Airtel Money / Moov Money).
      verify: (req, _res, buf) => {
        (req as Request & { rawBody?: string }).rawBody = buf.toString("utf8");
      },
    }),
  );
  app.use(express.urlencoded({ extended: true }));

  // Limiteur de requêtes
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: "Trop de requêtes, veuillez réessayer plus tard.",
    },
  });
  app.use("/api", limiter);

  // Documentation interactive Swagger
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // Healthcheck
  app.get("/health", (req: Request, res: Response) => {
    res.json({
      status: "healthy",
      app: "ELAM API - Le Waze de la Santé au Gabon",
      timestamp: new Date().toISOString(),
      country: "Gabon",
    });
  });

  // Routes API v1
  app.use("/api/v1", apiRoutes);

  // Fallback 404
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: `Route ${req.method} ${req.originalUrl} introuvable sur le serveur ELAM`,
    });
  });

  // Gestionnaire d'erreurs global
  app.use(errorHandler);

  return app;
};
