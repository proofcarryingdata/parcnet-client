import type {
  ParcnetRPC,
  ParcnetRPCMethodName,
  RPCMessage,
  SubscriptionUpdateResult,
  Zapp
} from "@parcnet-js/client-rpc";
import {
  InitializationMessageSchema,
  InitializationMessageType,
  ParcnetRPCSchema,
  RPCMessageSchema,
  RPCMessageType,
  deepGet
} from "@parcnet-js/client-rpc";
import * as v from "valibot";
import type { ConnectorAdvice } from "./advice.js";

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

  public cancel(): void {
    this.port.postMessage({
      type: RPCMessageType.PARCNET_CLIENT_CANCEL
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

type Split<S extends string> = S extends `${infer A}.${infer B}`
  ? [A, B]
  : never;

function splitPath<T extends string>(path: T): Split<T> {
  const [a, b] = path.split(".") as Split<T>;
  return [a, b] as Split<T>;
}

function getSchema(methodName: ParcnetRPCMethodName) {
  const [namespace, method] = splitPath(methodName);

  if (namespace === "gpc") {
    if (method in ParcnetRPCSchema.gpc) {
      return ParcnetRPCSchema.gpc[method];
    }
    throw new Error(`Method ${methodName} not found`);
  }

  if (namespace === "pod") {
    if (method in ParcnetRPCSchema.pod) {
      return ParcnetRPCSchema.pod[method];
    }
    throw new Error(`Method ${methodName} not found`);
  }

  if (namespace === "identity") {
    if (method in ParcnetRPCSchema.identity) {
      return ParcnetRPCSchema.identity[method];
    }
    throw new Error(`Method ${methodName} not found`);
  }

  // This is a type guard to ensure that all namespaces are covered.
  const _unknownNamespace: never = namespace;

  throw new Error(`Method ${methodName} not found`);
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
        error: (error as Error).message,
        serial: message.serial
      });
    }
  }
}

interface ListenResult {
  advice: ConnectorAdvice;
  zapp: Zapp;
  origin: string;
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
          zapp: msg.zapp,
          origin: event.origin
        });
      }
    };

    window.addEventListener("message", windowEventHandler);
  });
}
