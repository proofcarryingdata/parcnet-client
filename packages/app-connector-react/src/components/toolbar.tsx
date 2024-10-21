import { useContext } from "react";
import root from "react-shadow" assert { type: "module" };
import { ClientConnectionState, ParcnetClientContext } from "../context.js";

const RootDiv: React.ComponentType<React.HTMLProps<HTMLElement>> = root.div!;

export function Toolbar() {
  const ctx = useContext(ParcnetClientContext);
  if (!ctx) {
    throw new Error("Toolbar must be used within a ParcnetClientProvider");
  }
  const { connectionState, connect } = ctx;
  return (
    <RootDiv>
      <style>{`
        :host div {
          display: inline-block;
          padding: 8px 16px;
          border-radius: 200px;
          background-color: #0077ff;
          color: white;
          cursor: pointer;
        }
      `}</style>
      <div
        className={""}
        onClick={() => {
          void connect();
        }}
      >
        {connectionState === ClientConnectionState.CONNECTED
          ? "Connected"
          : connectionState === ClientConnectionState.CONNECTING
            ? "Connecting..."
            : "Connect PODs"}
      </div>
    </RootDiv>
  );
}
