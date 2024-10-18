import type { ParcnetAPI } from "@parcnet-js/app-connector";
import { useContext } from "react";
import { ClientConnectionState } from "./context.js";
import { ParcnetClientContext } from "./context.js";

interface ParcnetConnector {
  connect: (connectUrl?: string) => Promise<void>;
}

type UseParcnetClient =
  | {
      connectionState: ClientConnectionState.CONNECTED;
      z: ParcnetAPI;
    }
  | {
      connectionState: ClientConnectionState.CONNECTING;
      z: ParcnetConnector;
    }
  | {
      connectionState: ClientConnectionState.DISCONNECTED;
      z: ParcnetConnector;
    }
  | {
      connectionState: ClientConnectionState.ERROR;
      z: ParcnetConnector;
    };

export function useParcnetClient(): UseParcnetClient {
  const context = useContext(ParcnetClientContext);
  if (!context) {
    throw new Error(
      "useParcnetClient must be used within a ParcnetClientProvider"
    );
  }

  return context.connectionState === ClientConnectionState.CONNECTED
    ? {
        connectionState: context.connectionState,
        z: context.z
      }
    : {
        connectionState: context.connectionState,
        z: {
          connect: async (connectUrl?: string) => {
            await context.connect(connectUrl);
          }
        }
      };
}
