# @parcnet-js/app-connector-react

React bindings for the Parcnet app connector library.

## Installation

Using npm:

    npm install @parcnet-js/app-connector-react

Using yarn:

    yarn add @parcnet-js/app-connector-react

Using pnpm:

    pnpm add @parcnet-js/app-connector-react

## Usage

Basic usage with the ParcnetClientProvider:

    import { ParcnetClientProvider } from "@parcnet-js/app-connector-react";
    import type { Zapp } from "@parcnet-js/app-connector";

    // Create your Zapp instance
    const zapp: Zapp = {
      name: "My Zapp Name",
      permissions: {
        REQUEST_PROOF: { collections: ["My Collection"] },
        SIGN_POD: {},
        READ_POD: { collections: ["My Collection"] },
        INSERT_POD: { collections: ["My Collection"] },
        DELETE_POD: { collections: ["My Collection"] },
        READ_PUBLIC_IDENTIFIERS: {}
      }
    };

    function App() {
      return (
        <ParcnetClientProvider 
          zapp={zapp}
          url="https://zupass.org" // Optional, defaults to https://zupass.org
        >
          {/* Your app content */}
        </ParcnetClientProvider>
      );
    }

Using the context in your components:

    import { useParcnetClient, ClientConnectionState } from '@parcnet-js/app-connector-react';

    function MyComponent() {
      const { connectionState, connect, disconnect, z } = useParcnetClientContext();

      if (connectionState === ClientConnectionState.CONNECTED) {
        // Access the Parcnet API through 'z'
        // e.g. await z.identity.getPublicKey()
      }
    }

## Documentation

For detailed documentation and API reference, please visit our [documentation site](https://zappsdk.netlify.app/guides/getting-started/).






