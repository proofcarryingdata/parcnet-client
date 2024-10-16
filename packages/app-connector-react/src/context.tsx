import {
  type ParcnetAPI,
  type Zapp,
  connect,
  connectToHost,
  isHosted
} from "@parcnet-js/app-connector";
import type { ReactNode } from "react";
import { createContext, useEffect, useRef, useState } from "react";

export type ClientConnectionInfo = {
  url: string;
  type: "iframe";
};

export enum ClientConnectionState {
  DISCONNECTED = "DISCONNECTED",
  CONNECTING = "CONNECTING",
  CONNECTED = "CONNECTED",
  ERROR = "ERROR"
}

type ClientIframeState =
  | {
      state: ClientConnectionState.DISCONNECTED;
      ref: React.RefObject<HTMLDivElement> | null;
    }
  | {
      state: ClientConnectionState.CONNECTING;
      ref: React.RefObject<HTMLDivElement>;
    }
  | {
      state: ClientConnectionState.CONNECTED;
      z: ParcnetAPI;
      ref: React.RefObject<HTMLDivElement>;
    };

type ClientState = ClientIframeState;

export const ParcnetClientContext = createContext<ClientState>({
  state: ClientConnectionState.DISCONNECTED,
  ref: null
});

export function ParcnetClientProvider({
  zapp,
  connectionInfo,
  children
}: {
  zapp: Zapp;
  connectionInfo: ClientConnectionInfo;
  children: React.ReactNode;
}): ReactNode {
  return (
    <ParcnetIframeProvider zapp={zapp} url={connectionInfo.url}>
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
  url: string;
  children: React.ReactNode;
}): ReactNode {
  const ref = useRef<HTMLDivElement>(null);
  const isMounted = useRef(false);

  const [value, setValue] = useState<ClientState>({
    state: ClientConnectionState.CONNECTING,
    ref
  });

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }
    if (!isHosted()) {
      if (ref.current) {
        void connect(zapp, ref.current, url).then((zupass) => {
          setValue({
            state: ClientConnectionState.CONNECTED,
            z: zupass,
            ref
          });
        });
      }
    } else {
      void connectToHost(zapp).then((zupass) => {
        setValue({
          state: ClientConnectionState.CONNECTED,
          z: zupass,
          ref
        });
      });
    }

    return () => {
      isMounted.current = false;
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ParcnetClientContext.Provider value={value}>
      <div ref={ref}></div>
      {children}
    </ParcnetClientContext.Provider>
  );
}
