import type { ReactNode } from "react";
import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { GPC } from "./apis/GPC";
import { Identity } from "./apis/Identity";
import { PODSection } from "./apis/PODSection";
import "./index.css";
import type { Zapp } from "@parcnet-js/app-connector";
import {
  ClientConnectionState,
  ParcnetClientProvider,
  Toolbar,
  useParcnetClient
} from "@parcnet-js/app-connector-react";

const zapp: Zapp = {
  name: "test-client",
  permissions: {
    REQUEST_PROOF: { collections: ["Apples", "Bananas"] },
    SIGN_POD: {},
    READ_POD: { collections: ["Apples", "Bananas"] },
    INSERT_POD: { collections: ["Apples", "Bananas"] },
    DELETE_POD: { collections: ["Bananas"] },
    READ_PUBLIC_IDENTIFIERS: {}
  }
};

export default function Main(): ReactNode {
  const { connectionState, z } = useParcnetClient();
  useEffect(() => {
    if (connectionState === ClientConnectionState.DISCONNECTED) {
      console.log("Connecting to Parcnet");
      void z.connect();
    }
  }, [connectionState, z]);
  return (
    <>
      <div className="container mx-auto my-4 p-4">
        <Toolbar />
        <p>Welcome to Parcnet!</p>
        <p>You can use this page to test the Parcnet API.</p>
        <div className="flex flex-col gap-4 my-4">
          <PODSection />
          <GPC />
          <Identity />
        </div>
      </div>
    </>
  );
}

function App(): ReactNode {
  return (
    <StrictMode>
      <ParcnetClientProvider zapp={zapp}>
        <Main />
      </ParcnetClientProvider>
    </StrictMode>
  );
}
const root = createRoot(
  document.querySelector("#root") as unknown as HTMLDivElement
);
root.render(<App />);
