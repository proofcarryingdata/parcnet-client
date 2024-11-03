# PARCNET App Connector

The app connector is for connecting your app to PARCNET.

## Getting started

Install the package:

```
npm install @parcnet-js/app-connector
```

Then connect to a PARCNET client:

```ts
import { connect } from "@parcnet-js/app-connector";

// Ensure this HTML element exists:
const element = document.getElementById("app-connector");
// The URL to the PARCNET client, e.g. Zupass
const clientUrl = "http://localhost:5173";

// Returns an API object that you can use to invoke actions
// See api_wrapper.ts for details
const api = await connect({ name: "My App Name", permissions: []}, element, clientUrl);
```

This will give you an API object, which can be used to invoke various APIs.

## APIs

See [the documentation](https://zappsdk.netlify.app/guides/getting-started/) for details of the API methods, their parameters, and results.