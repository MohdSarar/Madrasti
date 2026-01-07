import swaggerJSDoc from "swagger-jsdoc";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function buildOpenApiSpec() {
  const options: swaggerJSDoc.Options = {
    definition: {
      openapi: "3.0.3",
      info: {
        title: "Madrasti Auth Service",
        version: "0.1.0",
        description: "Auth + multi-tenant bootstrap (dev)",
      },
      servers: [
        {
          url: `http://localhost:${config.port}`,
          description: "Local",
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
    },
    apis: [
      path.join(__dirname, "routes.ts"),
      // Add more files if you start annotating controllers/services:
      // path.join(__dirname, "controllers", "*.ts"),
    ],
  };

  return swaggerJSDoc(options);
}
