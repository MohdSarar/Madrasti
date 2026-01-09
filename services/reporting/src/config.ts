import path from "path";

export const config = {
  port: parseInt(process.env.PORT || "8088", 10),
  host: process.env.HOST || "0.0.0.0",
  env: process.env.NODE_ENV || "development",
  databaseUrl: process.env.DATABASE_URL || "postgres://madrasti:madrasti@postgres:5432/postgres",
  logLevel: process.env.LOG_LEVEL || "info",
  serviceName: process.env.SERVICE_NAME || "reporting-service",
  appVersion: process.env.APP_VERSION || "0.1.0",
  redisUrl: process.env.REDIS_URL || "redis://redis:6379",
  
  // Inter-service calls
  httpTimeoutMs: parseInt(process.env.HTTP_TIMEOUT_MS || "5000", 10),
  services: {
    academic: process.env.ACADEMIC_SERVICE_URL || "http://academic:8085",
    attendance: process.env.ATTENDANCE_SERVICE_URL || "http://attendance:8086",
  },
  
  pdfFonts: {
    amiriRegular: process.env.AMIRI_REGULAR_TTF || path.join(process.cwd(), "assets/fonts/Amiri-Regular.ttf"),
    amiriBold: process.env.AMIRI_BOLD_TTF || path.join(process.cwd(), "assets/fonts/Amiri-Bold.ttf"),
  },
};
