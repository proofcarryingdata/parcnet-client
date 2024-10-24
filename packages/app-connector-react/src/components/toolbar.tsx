import { useCallback, useContext, useEffect, useRef, useState } from "react";
import root from "react-shadow" assert { type: "module" };
import { ClientConnectionState, ParcnetClientContext } from "../context.js";

const RootDiv: React.ComponentType<React.HTMLProps<HTMLElement>> = root.div!;

interface ToolbarProps {
  textColor?: string;
  backgroundColor?: string;
  connectText?: string;
}

function getTextWidth(text: string, font: string): number {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return 0;
  context.font = font;
  const metrics = context.measureText(text);
  return metrics.width;
}

export function Toolbar({
  connectText,
  backgroundColor,
  textColor
}: ToolbarProps) {
  const ctx = useContext(ParcnetClientContext);
  if (!ctx) {
    throw new Error("Toolbar must be used within a ParcnetClientProvider");
  }
  const { connectionState, connect, disconnect } = ctx;
  const [publicKey, setPublicKey] = useState<string>("");
  const [truncatedText, setTruncatedText] = useState<string>(
    connectText ?? "Connect to Zupass"
  );
  const buttonRef = useRef<HTMLDivElement>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    const truncateMiddle = (str: string) => {
      if (!buttonRef.current) return str;
      const textSpan = buttonRef.current.firstChild as HTMLSpanElement;
      const style = window.getComputedStyle(textSpan);
      const font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const maxWidth = textSpan.clientWidth;

      if (getTextWidth(str, font) <= maxWidth) return str;

      let left = 0;
      let right = str.length;
      const ellipsis = "...";

      while (left < right) {
        const mid = Math.floor((left + right) / 2);
        const truncated =
          str.slice(0, mid) + ellipsis + str.slice(str.length - mid);
        if (getTextWidth(truncated, font) <= maxWidth) {
          left = mid + 1;
        } else {
          right = mid;
        }
      }

      return (
        str.slice(0, left - 1) + ellipsis + str.slice(str.length - (left - 1))
      );
    };

    if (isConnected && connectionState !== ClientConnectionState.CONNECTED) {
      setIsConnected(false);
    }

    let text = "Connecting...";
    if (connectionState === ClientConnectionState.CONNECTED) {
      void ctx.z.identity.getPublicKey().then((pk) => {
        setPublicKey(pk);
        setIsConnected(true);
      });
      if (isConnected) {
        text = publicKey;
      }
    } else if (connectionState === ClientConnectionState.CONNECTING) {
      text = "Connecting...";
    } else {
      text = connectText ?? "Connect to Zupass";
    }

    setTruncatedText(truncateMiddle(text));
  }, [connectionState, ctx, publicKey, isConnected, connectText]);

  const onClick = useCallback(() => {
    if (connectionState === ClientConnectionState.CONNECTED) {
      if (confirm("Are you sure you want to disconnect?")) {
        void disconnect();
      }
    } else if (connectionState === ClientConnectionState.CONNECTING) {
      // Do nothing
    } else {
      void connect();
    }
  }, [connect, disconnect, connectionState]);

  return (
    <RootDiv>
      <style>{`
 
        :host div .button {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 8px 8px;
          border-radius: 200px;
          background-color: #0077ff;
          color: white;
          cursor: pointer;
          font-weight: 600;
          width: 19ch;
          text-align: center;
          white-space: nowrap;
          overflow: hidden;
        }
        :host div .bullet {
          font-weight: 900;
          font-size: 1.5em;
          line-height: 0.8;
          margin-top: -3px;
          width: 12px;
          padding-right: 4px;
        }
        :host div .text {
          flex: 1;
          margin-left: 12px;
        }
        :host div .bullet.fade {
          animation: fadeInOut 1s infinite;
        }

        @keyframes fadeInOut {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
      `}</style>
      <div>
        <div
          role="button"
          className={"button"}
          onClick={onClick}
          ref={buttonRef}
          style={{ backgroundColor, color: textColor }}
        >
          <span className="text">{truncatedText}</span>
          {connectionState === ClientConnectionState.CONNECTING && (
            <span className="bullet fade">&bull;</span>
          )}
          {connectionState === ClientConnectionState.CONNECTED && (
            <span className="bullet">&bull;</span>
          )}
          {(connectionState === ClientConnectionState.DISCONNECTED ||
            connectionState === ClientConnectionState.ERROR) && (
            <span className="bullet"></span>
          )}
        </div>
      </div>
    </RootDiv>
  );
}
