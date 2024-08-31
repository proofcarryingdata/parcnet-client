import {
  deepGet,
  InitializationMessageSchema,
  InitializationMessageType,
  ParcnetRPC,
  RPCMessage,
  RPCMessageSchema,
  RPCMessageType,
  SubscriptionResult,
  Zapp
} from "@parcnet/client-rpc";
import { ConnectorAdvice } from "./advice.js";

export class AdviceChannel implements ConnectorAdvice {
  private port: MessagePort;
  private onReady: (rpc: ParcnetRPC) => void;

  constructor({
    port,
    onReady
  }: {
    port: MessagePort;
    onReady: (rpc: ParcnetRPC) => void;
  }) {
    this.port = port;
    this.onReady = onReady;
  }

  public showClient(): void {
    this.port.postMessage({
      type: RPCMessageType.PARCNET_CLIENT_SHOW
    });
  }

  public hideClient(): void {
    this.port.postMessage({
      type: RPCMessageType.PARCNET_CLIENT_HIDE
    });
  }

  public ready(rpc: ParcnetRPC): void {
    this.onReady(rpc);
    this.port.postMessage({
      type: RPCMessageType.PARCNET_CLIENT_READY
    });
  }

  public subscriptionUpdate(
    { update, subscriptionId }: SubscriptionResult,
    subscriptionSerial: number
  ): void {
    this.port.postMessage({
      type: RPCMessageType.PARCNET_CLIENT_SUBSCRIPTION_UPDATE,
      update,
      subscriptionId,
      subscriptionSerial
    });
  }
}

async function handleMessage(
  rpc: ParcnetRPC,
  port: MessagePort,
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
          port.postMessage({
            type: RPCMessageType.PARCNET_CLIENT_INVOKE_RESULT,
            result,
            serial: message.serial
          } satisfies RPCMessage);
        } catch (error) {
          port.postMessage({
            type: RPCMessageType.PARCNET_CLIENT_INVOKE_ERROR,
            serial: message.serial,
            error: (error as Error).message
          } satisfies RPCMessage);
        }
      } else {
        throw new Error("Function not found");
      }
    } catch (error) {
      port.postMessage({
        type: RPCMessageType.PARCNET_CLIENT_INVOKE_ERROR,
        error: (error as Error).message
      });
    }
  }
}

interface ListenResult {
  advice: ConnectorAdvice;
  zapp: Zapp;
}

export async function listen(): Promise<ListenResult> {
  let port: MessagePort;
  let portMessageHandler: (message: MessageEvent) => void;

  return new Promise((resolve, _reject) => {
    const windowEventHandler = async (event: MessageEvent) => {
      const data = InitializationMessageSchema.safeParse(event.data);
      if (!data.success) {
        return;
      }

      const msg = data.data;

      if (msg.type === InitializationMessageType.PARCNET_CLIENT_CONNECT) {
        if (!event.ports[0] || event.ports.length !== 1) {
          throw new Error("Expected exactly one port");
        }
        port = event.ports[0];
        port.start();

        resolve({
          advice: new AdviceChannel({
            port,
            onReady: (rpc) => {
              portMessageHandler = (ev) => {
                const message = RPCMessageSchema.parse(ev.data);
                handleMessage(rpc, port, message);
              };

              port.addEventListener("message", portMessageHandler);

              port.postMessage({
                type: RPCMessageType.PARCNET_CLIENT_READY
              });
            }
          }),
          zapp: msg.zapp
        });
      }
    };

    window.addEventListener("message", windowEventHandler);
  });
}
