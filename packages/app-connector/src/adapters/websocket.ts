import toast from "@brenoroosevelt/toast";
import {
  InitializationMessage,
  InitializationMessageType,
  Zapp
} from "@parcnet/client-rpc";
import JSONBig from "json-bigint";
import { ParcnetAPI } from "../api_wrapper.js";
import { ParcnetRPCConnector } from "../rpc_client.js";
import { DialogController } from "./iframe.js";

class DialogControllerImpl implements DialogController {
  public show(): void {
    toast.info("Your PARCNET client requests interaction");
  }

  public close(): void {
    // Does nothing
  }
}

export function connectWebsocket(zapp: Zapp, url: string): Promise<ParcnetAPI> {
  const ws = new WebSocket(url);
  const chan = new MessageChannel();

  ws.addEventListener("open", async () => {
    const connectMsg = JSONBig.stringify({
      type: InitializationMessageType.PARCNET_CLIENT_CONNECT,
      zapp
    } satisfies InitializationMessage);
    await new Promise((resolve) => window.setTimeout(resolve, 1000));
    ws.send(connectMsg);
  });

  ws.addEventListener("message", (ev) => {
    chan.port1.postMessage(JSONBig.parse(ev.data));
  });

  chan.port1.addEventListener("message", async (message) => {
    ws.send(JSONBig.stringify(message.data));
  });

  chan.port1.start();

  return new Promise((resolve) => {
    // Create a new RPC client
    const client = new ParcnetRPCConnector(
      chan.port2,
      new DialogControllerImpl()
    );
    client.start(() => {
      resolve(new ParcnetAPI(client));
    });
  });
}
