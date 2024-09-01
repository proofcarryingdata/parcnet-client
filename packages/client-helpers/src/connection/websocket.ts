// pass in a websocket
// set up event handlers??
// wait til we get a connect
// return advice channel and zapp

import {
  deepGet,
  InitializationMessageSchema,
  InitializationMessageType,
  ParcnetRPC,
  RPCMessage,
  RPCMessageSchema,
  RPCMessageType,
  SubscriptionUpdateResult,
  Zapp
} from "@parcnet/client-rpc";
import JSONBig from "json-bigint";
import type { MessageEvent, WebSocket } from "ws";
import { ConnectorAdvice } from "./advice.js";

export class WebsocketAdviceChannel implements ConnectorAdvice {
  private socket: WebSocket;
  private onReady: (rpc: ParcnetRPC) => void;

  constructor({
    socket,
    onReady
  }: {
    socket: WebSocket;
    onReady: (rpc: ParcnetRPC) => void;
  }) {
    this.socket = socket;
    this.onReady = onReady;
  }

  private send(message: RPCMessage): void {
    this.socket.send(JSONBig.stringify(message));
  }

  public showClient(): void {
    this.send({
      type: RPCMessageType.PARCNET_CLIENT_SHOW
    });
  }

  public hideClient(): void {
    this.send({
      type: RPCMessageType.PARCNET_CLIENT_HIDE
    });
  }

  public ready(rpc: ParcnetRPC): void {
    this.onReady(rpc);
    this.send({
      type: RPCMessageType.PARCNET_CLIENT_READY
    });
  }

  public subscriptionUpdate(
    { update, subscriptionId }: SubscriptionUpdateResult,
    subscriptionSerial: number
  ): void {
    this.send({
      type: RPCMessageType.PARCNET_CLIENT_SUBSCRIPTION_UPDATE,
      update,
      subscriptionId,
      subscriptionSerial
    });
  }
}

interface ListenResult {
  advice: ConnectorAdvice;
  zapp: Zapp;
}

export async function listen(ws: WebSocket): Promise<ListenResult> {
  let rpcMessageHandler: (ev: MessageEvent) => void;

  return new Promise((resolve) => {
    const initialEventHandler = (initialEvent: MessageEvent) => {
      const data = InitializationMessageSchema.safeParse(
        JSONBig.parse(initialEvent.data.toString())
      );
      if (!data.success) {
        return;
      }

      const msg = data.data;
      if (msg.type === InitializationMessageType.PARCNET_CLIENT_CONNECT) {
        ws.removeEventListener("message", initialEventHandler);
        resolve({
          advice: new WebsocketAdviceChannel({
            socket: ws,
            onReady: (rpc) => {
              rpcMessageHandler = (ev: MessageEvent) => {
                const message = RPCMessageSchema.safeParse(
                  JSONBig.parse(ev.data.toString())
                );
                if (message.success === false) {
                  return;
                }

                handleMessage(rpc, ws, message.data);
              };

              ws.addEventListener("message", rpcMessageHandler);
            }
          }),
          zapp: msg.zapp
        });
      }
    };

    ws.addEventListener("message", initialEventHandler);
  });
}

async function handleMessage(
  rpc: ParcnetRPC,
  socket: WebSocket,
  message: RPCMessage
): Promise<void> {
  if (message.type === RPCMessageType.PARCNET_CLIENT_INVOKE) {
    const path = message.fn.split(".");
    const functionName = path.pop();
    if (!functionName) {
      throw new Error("Path does not contain a function name");
    }
    const object = deepGet(rpc, path);
    const functionToInvoke = (object as Record<string, unknown>)[functionName];
    try {
      if (functionToInvoke && typeof functionToInvoke === "function") {
        try {
          const result = await functionToInvoke.apply(object, message.args);
          socket.send(
            JSONBig.stringify({
              type: RPCMessageType.PARCNET_CLIENT_INVOKE_RESULT,
              result,
              serial: message.serial
            } satisfies RPCMessage)
          );
        } catch (error) {
          socket.send(
            JSONBig.stringify({
              type: RPCMessageType.PARCNET_CLIENT_INVOKE_ERROR,
              serial: message.serial,
              error: (error as Error).message
            } satisfies RPCMessage)
          );
        }
      } else {
        throw new Error("Function not found");
      }
    } catch (error) {
      socket.send(
        JSONBig.stringify({
          type: RPCMessageType.PARCNET_CLIENT_INVOKE_ERROR,
          error: (error as Error).message
        })
      );
    }
  }
}
