import { useContext } from "react";
import root from "react-shadow" assert { type: "module" };
import { ClientConnectionState, ParcnetClientContext } from "../context.js";

const RootDiv: React.ComponentType<React.HTMLProps<HTMLElement>> = root.div!;

export function Toolbar() {
  const ctx = useContext(ParcnetClientContext);
  if (!ctx) {
    throw new Error("Toolbar must be used within a ParcnetClientProvider");
  }
  const { connectionState } = ctx;
  return (
    <RootDiv>
      <style>{`
        :host div {
          display: inline-block;
          padding: 8px 16px;
          border-radius: 200px;
          background-color: #0077ff;
          color: white;
        }
      `}</style>
      <div className={""}>
        {connectionState === ClientConnectionState.CONNECTED
          ? "Connected"
          : "Disconnected"}
      </div>
    </RootDiv>
  );
}
