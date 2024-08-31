import { ReactNode, useCallback, useMemo, useState } from "react";
import { HiLightningBolt } from "react-icons/hi";
import { cn, getConnectionInfo } from "../utils";

export function Navbar({ connecting }: { connecting: boolean }): ReactNode {
  const connectionInfo = useMemo(() => getConnectionInfo(), []);

  const [inputClientUrl, setInputClientUrl] = useState(connectionInfo.url);
  const [inputClientType, setInputClientType] = useState(connectionInfo.type);

  const onSave = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      const newConnectionInfo = { url: inputClientUrl, type: inputClientType };
      localStorage.setItem(
        "clientConnectionInfo",
        JSON.stringify(newConnectionInfo)
      );
      window.location.reload();
    },
    [inputClientUrl, inputClientType]
  );

  return (
    <div className="navbar bg-base-100 w-full">
      <div className="flex-none">
        <a className="btn btn-ghost text-lg md:text-xl">Parcnet API Client</a>
      </div>
      <div className="flex-1"></div>
      <div className="flex-none flex items-center">
        <span
          className={cn(
            "mr-1 text-xs md:text-sm",
            connecting
              ? ""
              : "transition-opacity delay-1000 duration-300 opacity-0"
          )}
        >
          {connecting ? "Connecting..." : "Connected!"}
        </span>
        <div className="dropdown dropdown-end">
          <div
            tabIndex={0}
            role="button"
            className="btn btn-square btn-ghost rounded-full"
          >
            {" "}
            <HiLightningBolt
              title={
                connecting ? "Connecting to Parcnet..." : "Connected to Parcnet"
              }
              className={cn(
                connecting ? "animate-pulse text-base-500" : "text-green-500"
              )}
            />
          </div>
          <div
            tabIndex={0}
            className="card compact dropdown-content bg-base-200 rounded-box z-[1] w-72 shadow"
          >
            <div tabIndex={0} className="card-body">
              <div className="label">
                <span className="label-text">
                  Set Client Connection Details
                </span>
              </div>
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  placeholder="Enter"
                  className="input input-bordered w-full max-w-xs input-sm"
                  value={inputClientUrl}
                  onChange={(e) => setInputClientUrl(e.target.value)}
                />
                <div className="flex items-center gap-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="iframe"
                      checked={inputClientType === "iframe"}
                      onChange={(e) => setInputClientType("iframe")}
                      className="radio radio-primary radio-xs mr-2"
                    />
                    <span className="label-text">IFrame</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="websocket"
                      checked={inputClientType === "websocket"}
                      onChange={(e) => setInputClientType("websocket")}
                      className="radio radio-primary radio-xs mr-2"
                    />
                    <span className="label-text">WebSocket</span>
                  </label>
                </div>
                <button className="btn btn-sm btn-primary" onClick={onSave}>
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
