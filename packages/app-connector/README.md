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

### Identity

#### identity.getSemaphoreV3Commitment();
```ts
await api.identity.getSemaphoreV3Commitment();
```

This returns a `bigint` representing the Semaphore v3 commitment.

#### identity.getSemaphoreV4Commitment();
```ts
await api.identity.getSemaphoreV4Commitment();
```

This returns a `bigint` representing the Semaphore v4 commitment.

#### identity.getSemaphoreV4PublicKey();
```ts
await api.identity.getSemaphoreV4PublicKey();
```

This returns a `string` representing the Semaphore v4 public key.

### POD

#### pod.sign
```ts
const pod: POD = await api.pod.sign({ type: "string", value: "entry value" });
```

This will request the signature of a POD with the entries given. An exception may be thrown if the POD is invalid, or if permission is refused for the signing of the POD. Otherwise, the signed POD is returned.

#### pod.insert
```ts
await api.pod.insert(pod);
```

This inserts a POD into the user's POD collection for permanent storage.

#### pod.delete
```ts
await api.pod.delete(pod_signature);
```

This deletes a POD from the user's POD collection, as identified by the POD's signature, which can be retrieved from the `signature` property on a POD.

#### pod.query
```ts
await api.pod.query({
  entries: {
    str: { type: "int", inRange: { min: 10n, max: 100n }},
    wis: { type: "int", inRange: { min: 5n, max: 100n }}
  }
});
```

This queries the user's POD collection for matching PODs. For details of the possible query types, see the `@parcnet-js/podspec` package.

### GPC

#### gpc.prove
```ts
await api.gpc.prove({
  pods: {
    podName: {
      pod: {
        entries: {
          str: { type: "int", inRange: { min: 10n, max: 100n }},
          wis: { type: "int", inRange: { min: 5n, max: 100n }}
        }
      }
    }
  }
})
```

This requests that the user make a GPC proof about a POD in their collection which matches the criteria specified above. For more examples of the available criteria, see the `@parcnet-js/podspec` library.