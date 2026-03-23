import winston from "winston";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level}] ${message}`),
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "test-results/test-run.log", level: "info" }),
  ],
});

export function logApiRequest(method: string, url: string): void {
  logger.info(`API Request  → ${method} ${url}`);
}

export function logApiResponse(method: string, url: string, status: number, durationMs: number): void {
  logger.info(`API Response ← ${method} ${url} | ${status} | ${durationMs}ms`);
}

export function logStep(step: string): void {
  logger.info(`UI Step      ▸ ${step}`);
}

export default logger;
