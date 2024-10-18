import { type ParcnetAPI, type Zapp, connect } from "@parcnet-js/app-connector";
import type { ReactNode } from "react";
import { createContext, useCallback, useRef, useState } from "react";

export enum ClientConnectionState {
  DISCONNECTED = "DISCONNECTED",
  CONNECTING = "CONNECTING",
  CONNECTED = "CONNECTED",
  ERROR = "ERROR"
}

export const ParcnetClientContext = createContext<
  ParcnetClientContextType | undefined
>(undefined);

type ParcnetContextBase = {
  zapp: Zapp;
  connect: (url?: string) => Promise<void>;
  disconnect: () => Promise<void>;
};

type ParcnetClientContextType = ParcnetContextBase &
  (
    | {
        z: ParcnetAPI;
        connectionState: ClientConnectionState.CONNECTED;
      }
    | {
        connectionState: ClientConnectionState.DISCONNECTED;
      }
    | {
        connectionState: ClientConnectionState.CONNECTING;
      }
    | {
        connectionState: ClientConnectionState.ERROR;
        error: Error;
      }
  );

type ParcnetClientProviderProps = {
  zapp: Zapp;
  children: React.ReactNode;
};

export function ParcnetClientProvider({
  zapp,
  children
}: ParcnetClientProviderProps): ReactNode {
  return <ParcnetIframeProvider zapp={zapp}>{children}</ParcnetIframeProvider>;
}

export function ParcnetIframeProvider({
  zapp,
  children
}: {
  zapp: Zapp;
  children: React.ReactNode;
}): ReactNode {
  const ref = useRef<HTMLDivElement>(null);

  const [connectionState, setConnectionState] = useState(
    ClientConnectionState.DISCONNECTED
  );
  const [z, setZ] = useState<ParcnetAPI | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [url, setUrl] = useState<string>("https://zupass.org");

  const connectCallback = useCallback(
    async (connectUrl?: string) => {
      if (!connectUrl) {
        connectUrl = "https://zupass.org";
      }
      if (!ref.current) {
        return;
      }
      if (
        url !== connectUrl ||
        connectionState === ClientConnectionState.DISCONNECTED
      ) {
        setUrl(connectUrl);
        setConnectionState(ClientConnectionState.CONNECTING);
        try {
          const zupass = await connect(zapp, ref.current, connectUrl);
          setZ(zupass);
          setConnectionState(ClientConnectionState.CONNECTED);
        } catch (error) {
          setError(error as Error);
          setConnectionState(ClientConnectionState.ERROR);
        }
      }
    },
    [zapp, connectionState, url]
  );

  const disconnectCallback = useCallback(async () => {
    setConnectionState(ClientConnectionState.DISCONNECTED);
  }, []);

  return (
    <ParcnetClientContext.Provider
      value={
        connectionState === ClientConnectionState.CONNECTED
          ? {
              connectionState,
              z: z!,
              zapp,
              connect: connectCallback,
              disconnect: disconnectCallback
            }
          : connectionState === ClientConnectionState.ERROR
            ? {
                connectionState,
                error: error!,
                zapp,
                connect: connectCallback,
                disconnect: disconnectCallback
              }
            : {
                connectionState,
                zapp,
                connect: connectCallback,
                disconnect: disconnectCallback
              }
      }
    >
      <div ref={ref}></div>
      {children}
    </ParcnetClientContext.Provider>
  );
}
