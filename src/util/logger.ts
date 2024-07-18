import { createLogger, format, transports } from "winston";
import { env } from "./env";

const winston = createLogger({
  level: process.env.LOG_LEVEL,
  format: format.combine(
    ...(env.NODE_ENV === "production"
      ? [format.json()]
      : [format.prettyPrint({ colorize: true })]),
    format.errors({ stack: true }),
  ),
  transports: [new transports.Console()],
});

type LogMeta = Record<string, any>;
type LogLevel = "error" | "warn" | "info" | "debug";

const log = (level: LogLevel, message: string, meta?: LogMeta) => {
  winston.log(level, message, meta);
};

export const logger = {
  error: (message: string, meta?: LogMeta) => log("error", message, meta),
  warn: (message: string, meta?: LogMeta) => log("warn", message, meta),
  info: (message: string, meta?: LogMeta) => log("info", message, meta),
  debug: (message: string, meta?: LogMeta) => log("debug", message, meta),
};
