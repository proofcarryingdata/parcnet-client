# PARCNET client libraries

TypeScript client libraries for PARCNET, providing APIs for third-party applications to connect to PARCNET clients.

## What's inside?

This monorepo includes the following packages/apps:

### Apps (Clients)

- `client-nodejs`, an example PARCNET client in TypeScript and running on NodeJS, which accepts connections from applications via a websocket and is intended to be run locally
- `client-web`, an example PARCNET client in TypeScript and running in browser `<iframe>`, which accepts connections via a browser `MessageChannel` and is intended to be hosted by a third-party service (similar to Zupass)

### Packages

- `app-connector`, a TypeScript package which is imported by third-party apps which want to connect to a PARCNET client. It exposes an API and abstracts away the detail of which client and transport is being used.
- `client-helpers`, useful code for client developers which provides reusable code for handling messages via MessageChannel and websocket transports
- `client-rpc`, which defines the RPC protocol and API that clients support

### Examples

- `test-app`, an example of the functionality exposed by clients to third-party applications

## Usage

To install the monorepo contents:

```bash
pnpm install
```

To build all packages and apps:

```bash
pnpm build
```

To run a single app:

```bash
cd path/to/app
pnpm dev
```

To run all apps:

```bash
pnpm dev
```

To watch all packages and rebuild on change (good to run alongside `pnpm dev`):

```bash
pnpm watch
```

## How to use/test

To see the apps in action, run either `client-web` or `client-nodejs`. Then run `test-app` and open `test-app` at [http://localhost:3200](http://localhost:3200).

By default it will connect to `client-web` on `http://localhost:5173`. By clicking the lightning icon in the top-right of the screen, you can configure it to connect to another client. `client-nodejs` runs at `http://localhost:3050` - remember to select "websocket" rather than "iframe" when using `client-nodejs`.