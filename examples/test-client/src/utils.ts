import { ClientConnectionInfo } from "./hooks/useParcnetClient";

export function cn(...classes: string[]): string {
  return classes.filter(Boolean).join(" ");
}

export const DEFAULT_CONNECTION_INFO: ClientConnectionInfo = {
  url: process.env.CLIENT_URL || "https://staging-rob.zupass.org",
  type: (["iframe", "websocket"].includes(process.env.CLIENT_TYPE)
    ? process.env.CLIENT_TYPE
    : "iframe") as "iframe" | "websocket"
};

export function getConnectionInfo(): ClientConnectionInfo {
  let connectionInfo = DEFAULT_CONNECTION_INFO;
  const storedConnectionInfo = localStorage.getItem("clientConnectionInfo");
  if (storedConnectionInfo) {
    try {
      const parsedConnectionInfo = JSON.parse(storedConnectionInfo);
      if (
        ["iframe", "websocket"].includes(connectionInfo.type) &&
        typeof connectionInfo.url === "string"
      ) {
        connectionInfo = parsedConnectionInfo;
      }
    } catch (e) {
      // JSON parsing failed
    }
  }
  return connectionInfo;
}
