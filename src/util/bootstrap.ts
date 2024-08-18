import fs from "fs";
import path from "path";
import { logger } from "./logger";
import http from "http";
import { env } from "./env";
import { z } from "zod";
import { inferable } from "./inferable";

const DEFAULT_SERVICE_PATH = path.join(__dirname, '..', 'services');

// Already registered service exported via Inferable.service(....)
const registeredServiceSchema = z.object({
  start: z.function(),
  stop: z.function(),
  definition: z.object({
    name: z.string(),
  }),
});

// Service definition only
const unregisteredServiceSchema = z.object({
  name: z.string(),
  functions: z.array(z.any()),
});

const integrationSchema = z.object({
  type: z.literal("inferable-integration"),
  name: z.string(),
  version: z.string(),
  initialize: z.function().returns(z.promise(registeredServiceSchema)),
});

type LocalService  = {
  status: 'registered',
  service: z.infer<typeof registeredServiceSchema>,
} | {
  status: 'unregistered',
  service: z.infer<typeof unregisteredServiceSchema>,
}

export async function bootstrap() {
  const start = new Date();

  logger.info("Discovering services...");

  const services = loadLocalServices()
  .map((s) => {
    if (s.status === 'registered') {
      return s.service;
    }

    return inferable.service(s.service);
  })

  const integrations = Object.keys(
    require("../../package.json").dependencies ?? []
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
    services: services.map((s) => s.definition.name),
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
      name: s.definition.name,
      ...settled[i],
    })),
  });

  process.on("SIGTERM", async () => {
    logger.info("Shutting down services...");

    await Promise.all([startables.map((s) => s.stop())]);

    logger.info("All services stopped!");
  });

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

  return {
    start,
    services: startables,
  };
}

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

const isServiceFile = (entry: fs.Dirent) => entry.isFile() && (entry.name.endsWith('.service.js') || entry.name.endsWith('.service.ts'));

function loadLocalServices(dir: string = DEFAULT_SERVICE_PATH): LocalService[] {
  if (!fs.existsSync(dir)) {
    logger.info(`No services directory found at ${dir}, skipping local service discovery`);
    return []
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  const subDirectories = entries
    .filter(entry => entry.isDirectory())
    .map(entry => path.join(dir, entry.name));

  const subDirectoryServices = subDirectories.flatMap(subDir => loadLocalServices(subDir));

  const serviceFiles = entries

  .filter(isServiceFile)
  .map(entry => require(path.join(dir, entry.name)));

  const services = serviceFiles
    .flatMap(f => Object.values(f))
    .map((m: unknown) => {
      const registeredService = registeredServiceSchema.safeParse(m);

      if (registeredService.success) {
        logger.info('Found registered service', {
          name: registeredService.data.definition.name,
          directory: dir
        });

        return {
          status: 'registered',
          service: registeredService.data,
        }
      }

      const unregisteredService = unregisteredServiceSchema.safeParse(m);

      if (unregisteredService.success) {
        logger.info('Found unregistered service', {
          name: unregisteredService.data.name,
          directory: dir
        });

        return {
          status: 'unregistered',
          service: unregisteredService.data
        }
      }
      return null;
    })
    .filter(Boolean) as LocalService[];

  return [...services, ...subDirectoryServices];
}
