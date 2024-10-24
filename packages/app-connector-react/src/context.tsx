import { type ParcnetAPI, type Zapp, connect } from "@parcnet-js/app-connector";
import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState
} from "react";

export enum ClientConnectionState {
  DISCONNECTED = "DISCONNECTED",
  CONNECTING = "CONNECTING",
  CONNECTED = "CONNECTED",
  ERROR = "ERROR"
}

export const ParcnetClientContext = createContext<
  ParcnetClientContextType | undefined
>(undefined);

export const useParcnetClientContext = (): ParcnetClientContextType => {
  const context = useContext(ParcnetClientContext);
  if (!context) {
    throw new Error(
      "useParcnetClientContext must be used within a ParcnetClientProvider"
    );
  }
  return context;
};

type ParcnetContextBase = {
  zapp: Zapp;
  connect: () => Promise<void>;
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
  url?: string;
};

export function ParcnetClientProvider({
  zapp,
  url,
  children
}: ParcnetClientProviderProps): ReactNode {
  return (
    <ParcnetIframeProvider zapp={zapp} url={url}>
      {children}
    </ParcnetIframeProvider>
  );
}

export function ParcnetIframeProvider({
  zapp,
  url,
  children
}: {
  zapp: Zapp;
  url?: string;
  children: React.ReactNode;
}): ReactNode {
  const ref = useRef<HTMLDivElement>(null);

  const [connectionState, setConnectionState] = useState(
    ClientConnectionState.DISCONNECTED
  );
  const [z, setZ] = useState<ParcnetAPI | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const connectCallback = useCallback(async () => {
    const connectUrl = url ?? "https://zupass.org";
    if (!ref.current) {
      return;
    }
    if (
      url !== connectUrl ||
      connectionState === ClientConnectionState.DISCONNECTED ||
      connectionState === ClientConnectionState.ERROR
    ) {
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
  }, [zapp, connectionState, url]);

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
