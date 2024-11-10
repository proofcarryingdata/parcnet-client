# @parcnet-js/app-connector

## 1.1.10

### Patch Changes

- Allow pre-loading of iframe component

## 1.1.9

### Patch Changes

- e1a97f3: Don't close the modal when clicking outside it
- 7b37763: Bump dependencies on POD and GPC
- Updated dependencies [7b37763]
- Updated dependencies [7b37763]
  - @parcnet-js/client-rpc@1.2.0
  - @parcnet-js/podspec@1.2.0

## 1.1.8

### Patch Changes

- Updated dependencies
  - @parcnet-js/podspec@1.1.3
  - @parcnet-js/client-rpc@1.1.6

## 1.1.7

### Patch Changes

- Distinguish between dialog closed by client and by user interaction

## 1.1.6

### Patch Changes

- More explicit management of connection workflow
- Updated dependencies
  - @parcnet-js/client-rpc@1.1.5

## 1.1.5

### Patch Changes

- Bump PCD and GPC dependencies to latest versions
- Updated dependencies
  - @parcnet-js/client-rpc@1.1.4
  - @parcnet-js/podspec@1.1.2

## 1.1.4

### Patch Changes

- Make circuitIdentifier always optional
- Updated dependencies
  - @parcnet-js/client-rpc@1.1.3

## 1.1.3

### Patch Changes

- c02d469: Support adding a circuit identifier to GPC proof requests
- Updated dependencies [c02d469]
  - @parcnet-js/client-rpc@1.1.2
  - @parcnet-js/podspec@1.1.1

## 1.1.2

### Patch Changes

- Allow user to cancel page unload while mutating operation in progress

## 1.1.1

### Patch Changes

- Support 'signPrefixed' for unsafely-signed PODs
- Updated dependencies
  - @parcnet-js/client-rpc@1.1.1

## 1.1.0

### Minor Changes

- aad9a9a: Upgrade @pcd/pod dependency to 0.3.0

### Patch Changes

- Updated dependencies [aad9a9a]
  - @parcnet-js/client-rpc@1.1.0
  - @parcnet-js/podspec@1.1.0

## 1.0.0

### Major Changes

- 2cc8bfc: 1.0.0 release

  This release introduces two new features:

  - Collections, which allow PODs to be stored in separate buckets with different access levels for different Zapps
  - Permissions, which allow your Zapp to specify which features it requires access to

  For documentation on these features, visit https://zappsdk.netlify.app or see the example code at `examples/test-app`.

### Patch Changes

- 6e2f3e5: Subscription updates now work correctly
- 5ba27e1: Prevent multiple iframe load events in Safari
- a1539a5: Support collection-based permissions and PODData type
- Updated dependencies [2cc8bfc]
- Updated dependencies [a1539a5]
  - @parcnet-js/client-rpc@1.0.0
  - @parcnet-js/podspec@1.0.0

## 1.0.0-beta.2

### Patch Changes

- Prevent multiple iframe load events in Safari

## 1.0.0-beta.1

### Major Changes

- 1.0.0 release

  This release introduces two new features:

  - Collections, which allow PODs to be stored in separate buckets with different access levels for different Zapps
  - Permissions, which allow your Zapp to specify which features it requires access to

  For documentation on these features, visit https://zappsdk.netlify.app or see the example code at `examples/test-app`.

### Patch Changes

- Updated dependencies
  - @parcnet-js/client-rpc@1.0.0-beta.1
  - @parcnet-js/podspec@1.0.0-beta.1

## 0.0.10-alpha.0

### Patch Changes

- Support collection-based permissions and PODData type
- Updated dependencies
  - @parcnet-js/client-rpc@0.0.7-alpha.0
  - @parcnet-js/podspec@0.0.6-alpha.0

## 0.0.9

### Patch Changes

- Support for distinct verify and verifyWithProofRequest operations
- Updated dependencies
  - @parcnet-js/client-rpc@0.0.6
  - @parcnet-js/podspec@0.0.5

## 0.0.8

### Patch Changes

- Updated dependencies [0cc537e]
  - @parcnet-js/podspec@0.0.4
  - @parcnet-js/client-rpc@0.0.5

## 0.0.7

### Patch Changes

- Support Zapps embedded inside client

## 0.0.6

### Patch Changes

- Allow storage access API requests from iframes

## 0.0.5

### Patch Changes

- Support meta field on proof requests

## 0.0.4

### Patch Changes

- Updated dependencies
- Updated dependencies
  - @parcnet-js/podspec@0.0.3
  - @parcnet-js/client-rpc@0.0.4

## 0.0.3

### Patch Changes

- Rename getSemaphoreV4PublicKey -> getPublicKey
- Updated dependencies
  - @parcnet-js/client-rpc@0.0.3

## 0.0.2

### Patch Changes

- Updates to API definitions
- Updated dependencies
  - @parcnet-js/client-rpc@0.0.2
  - @parcnet-js/podspec@0.0.2

## 0.0.1

### Patch Changes

- c855a6a: Initial release
- Added support for new identity APIs
- Updated dependencies
- Updated dependencies [c855a6a]
- Updated dependencies
  - @parcnet-js/podspec@0.0.1
  - @parcnet-js/client-rpc@0.0.1
