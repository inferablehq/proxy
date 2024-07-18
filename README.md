# Inferable Proxy

This is a self-hostable proxy server that'll interface with your systems on behalf of Inferable. Inferable will only be able to read the service metadata of your services, therefore this is a good place to:

1. Place secrets that you don't want exposed to the outside world.
2. Wrap your existing services selectively so that Inferable can only access the ones you want it to.
3. Place your own custom logic in the proxy to do things like rate limiting, authentication, etc.
4. Add additional observability.

## Adding first-party integrations

You can `npm install` any `@inferable/*` package in the proxy and it'll get discovered and bootstrapped on proxy start.

For all first-party integrations, visit the Inferable Marketplace in your dashboard.

## Adding your own services.

```sh
inferable proxy add <service_name>
```

Or, if you choose to do this manually, note that:

1. All your services must be placed in the `src/services` directory.
2. A service must be exposed in a single Typescript file that ends with `service.ts`.

## Build & Deployment

### Building

This application is dockerized, and you can run it in any environment that supports docker.

```sh
docker build . -t inferable/proxy:latest
```

### Running

The services require the following environment variables at a minimum:

```dotenv
INFERABLE_API_SECRET="sk_xxx"
```

Assuming you have a `.env` file with the above, you can run the proxy with:

```sh
docker run -p 8173:8173 -e-env-file.env inferable/proxy:latest
```

### Deployment

Port `8173` exposes 3 endpoints:

1. `/health`: Health check endpoint. Reports some telemtry about the proxy.
2. `/live`: Liveness check endpoint. Reports 200 if the proxy is alive.
