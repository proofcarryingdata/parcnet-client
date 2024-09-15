import {
  deepGet,
  InitializationMessageSchema,
  InitializationMessageType,
  ParcnetRPC,
  ParcnetRPCMethodName,
  ParcnetRPCSchema,
  RPCMessage,
  RPCMessageSchema,
  RPCMessageType,
  SubscriptionUpdateResult,
  Zapp
} from "@parcnet-js/client-rpc";
import * as v from "valibot";
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
    { update, subscriptionId }: SubscriptionUpdateResult,
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

function getSchema(method: ParcnetRPCMethodName) {
  switch (method) {
    case "gpc.canProve":
      return ParcnetRPCSchema.gpc.canProve;
    case "gpc.prove":
      return ParcnetRPCSchema.gpc.prove;
    case "gpc.verify":
      return ParcnetRPCSchema.gpc.verify;
    case "identity.getSemaphoreV3Commitment":
      return ParcnetRPCSchema.identity.getSemaphoreV3Commitment;
    case "pod.query":
      return ParcnetRPCSchema.pod.query;
    case "pod.insert":
      return ParcnetRPCSchema.pod.insert;
    case "pod.delete":
      return ParcnetRPCSchema.pod.delete;
    case "pod.subscribe":
      return ParcnetRPCSchema.pod.subscribe;
    case "pod.unsubscribe":
      return ParcnetRPCSchema.pod.unsubscribe;
    case "pod.sign":
      return ParcnetRPCSchema.pod.sign;
    default:
      const unknownMethod: never = method;
      throw new Error(`Unknown method: ${unknownMethod as string}`);
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
    const functionToInvoke = (
      object as Record<string, (...args: unknown[]) => Promise<unknown>>
    )[functionName];

    try {
      if (functionToInvoke && typeof functionToInvoke === "function") {
        const schema = getSchema(message.fn);
        const parsedArgs = v.parse(schema.input, message.args);
        try {
          const result = v.parse(
            schema.output,
            await functionToInvoke.apply(object, parsedArgs)
          );

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

  return new Promise((resolve) => {
    const windowEventHandler = (event: MessageEvent) => {
      const data = v.safeParse(InitializationMessageSchema, event.data);
      if (!data.success) {
        return;
      }

      const msg = data.output;

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
                const message = v.parse(RPCMessageSchema, ev.data);
                void handleMessage(rpc, port, message);
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
