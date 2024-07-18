import { Inferable } from "inferable";
import { env } from "./util/env";
import { logger } from "./util/logger";

logger.info("Inferable SDK initializing...", {
  environment: env.NODE_ENV,
  apiSecret: env.INFERABLE_API_SECRET.substring(0, 6) + "...",
  endpoint: env.INFERABLE_API_ENDPOINT,
  // TODO: add machineId and SDK verstion
});

export const inferable = new Inferable({
  apiSecret: env.INFERABLE_API_SECRET,
  endpoint: env.INFERABLE_API_ENDPOINT,
});
