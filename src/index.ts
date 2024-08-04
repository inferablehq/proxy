import fs from "fs";
import { RegisteredService } from "inferable/bin/types";
import path from "path";
import { logger } from "./util/logger";
import http from "http";
import { env } from "./util/env";
import { z } from "zod";
import { inferable } from "./inferable";

const serviceSchema = z.object({
  start: z.function(),
  stop: z.function(),
  definition: z.object({
    name: z.string(),
  }),
});

const integrationSchema = z.object({
  type: z.literal("inferable-integration"),
  name: z.string(),
  version: z.string(),
  initialize: z.function().returns(z.promise(serviceSchema)),
});

async function main() {
  const start = new Date();

  logger.info("Discovering services...");

  const services = loadLocalServices();

  const integrations = Object.keys(
    require("../package.json").dependencies ?? []
  )
    .filter((k) => k.startsWith("@inferable/"))
    .map((k) => {
      const l = require(k);
      const m = l.default ?? l;
      const parsed = integrationSchema.safeParse(m);

      if (parsed.success) {
        logger.info("Found integration", {
          name: parsed.data.name,
          version: parsed.data.version,
        });

        return parsed.data;
      } else {
        logger.debug(
          "Found @inferable package, but it does not match the integration schema",
          {
            name: k,
            version: l.version,
            errors: parsed.error.issues,
          }
        );

        return null;
      }
    })
    .filter((i) => i !== null)
    .map((i) => i!);

  logger.info("Starting services...", {
    services: services.map((s) => s.definition),
    integrations: integrations.map((i) => i.name),
  });

  const integrationServices = await Promise.all(
    integrations.map((i) => i.initialize(inferable))
  );

  const startables = [...services, ...integrationServices];

  const settled = await Promise.allSettled(
    startables.map((service) => service.start())
  );

  logger.info("Starting services complete!", {
    services: startables.map((s, i) => ({
      ...s.definition,
      ...settled[i],
    })),
  });

  process.on("SIGTERM", async () => {
    logger.info("Shutting down services...");

    await Promise.all([startables.map((s) => s.stop())]);

    logger.info("All services stopped!");
  });

  return {
    start,
    services: startables,
  };
}

main().then(({ services, start }) => {
  // We create a server so that we can expose a health check endpoint.
  // and make it simpler for environments that already have prior art
  // in hosting servers, run this as a simple server.

  http
    .createServer(async (req, res) => {
      if (req.url === "/health") {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end(
          JSON.stringify({
            uptime: `${(new Date().getTime() - start.getTime()) / 1000}s`,
            status: "ok",
            pid: process.pid,
            services: services.map((s) => s.definition),
          })
        );

        return;
      } else if (req.url === "/live") {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("ok");

        return;
      }

      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
    })
    .listen(env.PORT);
});

process.on("unhandledRejection", (error) => {
  logger.error("Unhandled rejection!", {
    error,
  });

  process.exit(1);
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception!", {
    error,
  });

  process.exit(1);
});

function loadLocalServices() {
  if (!fs.existsSync(path.join(__dirname, "services"))) {
    logger.info(
      "No services directory found, skipping local service discovery"
    );
    return [];
  }

  const files = fs
    .readdirSync(path.join(__dirname, "services"))
    .filter(
      (filename) =>
        filename.endsWith(".service.ts") || filename.endsWith(".service.js")
    )
    .map((filename) => require(path.join(__dirname, "services", filename)));

  const nonServices = fs
    .readdirSync(path.join(__dirname, "services"))
    .filter((filename) => !filename.endsWith(".service.ts"));

  if (nonServices.length > 0) {
    logger.warn(
      "Found non-service files in services directory. These will not be loaded.",
      {
        files: nonServices,
      }
    );
  }

  return files
    .map((f) => Object.values(f))
    .flat()
    .map((m: unknown) => {
      const parsed = serviceSchema.safeParse(m);

      if (parsed.success) {
        logger.info("Found service", {
          name: parsed.data.definition.name,
        });

        return parsed.data;
      }

      return null;
    })
    .map((i) => i!)
    .filter(Boolean);
}
