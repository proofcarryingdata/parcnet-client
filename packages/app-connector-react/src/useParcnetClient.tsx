import { connect, type ParcnetAPI, type Zapp } from "@parcnet-js/app-connector";
import { useContext } from "react";
import { ClientConnectionState } from "./context.js";
import { ParcnetClientContext } from "./context.js";

class ParcnetConnector implements IParcnetConnector {
  public constructor(private readonly context: ClientState) {}

  public connect(zapp: Zapp) {
    connect(zapp);
  }
}

interface IParcnetConnector {
  connect: (zapp: Zapp) => void;
}

type UseParcnetClient =
  | {
      connected: true;
      connectionState: ClientConnectionState.CONNECTED;
      z: ParcnetAPI;
    }
  | {
      connected: false;
      connectionState: ClientConnectionState.CONNECTING;
      z: ParcnetConnector;
    }
  | {
      connected: false;
      connectionState: ClientConnectionState.DISCONNECTED;
      z: ParcnetConnector;
    }
  | {
      connected: false;
      connectionState: ClientConnectionState.ERROR;
      z: ParcnetConnector;
    };

export function useParcnetClient(): UseParcnetClient {
  const context = useContext(ParcnetClientContext);
  return context.state === ClientConnectionState.CONNECTED
    ? {
        connected: true,
        connectionState: ClientConnectionState.CONNECTED,
        z: context.z
      }
    : {
        connected: false,
        connectionState: context.state,
        z: {
          connect: (zapp: Zapp) => {
            context.connect(zapp);
          }
        }
      };
}
