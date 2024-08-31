import { ConnectorAdvice } from "@parcnet/client-helpers";
import { WebsocketAdviceChannel } from "@parcnet/client-helpers/connection/websocket";
import {
  deepGet,
  InitializationMessageSchema,
  InitializationMessageType,
  ParcnetRPC,
  RPCMessage,
  RPCMessageSchema,
  RPCMessageType,
  Zapp
} from "@parcnet/client-rpc";
import * as http from "http";
import JSONBig from "json-bigint";
import { v4 as uuidv4 } from "uuid";
import { MessageEvent, WebSocket, WebSocketServer } from "ws";
import { ParcnetClientProcessor } from "./client/client";
import log from "./log";

const server = http.createServer();
const PORT = parseInt(process.env.PORT ?? "3050");

log(`Starting websocket server on port ${PORT}`);

const wss = new WebSocketServer({
  server
  /* perMessageDeflate: {
    zlibDeflateOptions: {
      // See zlib defaults.
      chunkSize: 1024,
      memLevel: 7,
      level: 3
    },
    zlibInflateOptions: {
      chunkSize: 10 * 1024
    },
    // Other options settable:
    clientNoContextTakeover: true, // Defaults to negotiated value.
    serverNoContextTakeover: true, // Defaults to negotiated value.
    serverMaxWindowBits: 10, // Defaults to negotiated value.
    // Below options specified as default values.
    concurrencyLimit: 10, // Limits zlib concurrency for perf.
    threshold: 1024 // Size (in bytes) below which messages
    // should not be compressed if context takeover is disabled.
  }*/
});

server.listen(PORT, () => {
  log(`Server is listening on port ${PORT}`);
});

const clients: Record<string, WebSocket> = {};

// A new client connection request received
wss.on("connection", async function (connection) {
  // Generate a unique code for every user
  const userId = uuidv4();
  console.log(`Received a new connection.`);
  const { advice } = await listen(connection);
  advice.ready(new ParcnetClientProcessor(advice));

  // Store the new connection and handle messages
  clients[userId] = connection;
  console.log(`${userId} connected.`);
});

interface ListenResult {
  advice: ConnectorAdvice;
  zapp: Zapp;
}

export async function listen(ws: WebSocket): Promise<ListenResult> {
  let rpcMessageHandler: (ev: MessageEvent) => void;
  console.log("starting listen");
  return new Promise((resolve, _reject) => {
    const initialEventHandler = async (initialEvent: MessageEvent) => {
      const data = InitializationMessageSchema.safeParse(
        JSONBig.parse(initialEvent.data.toString())
      );
      if (!data.success) {
        return;
      }

      log(data);

      const msg = data.data;
      if (msg.type === InitializationMessageType.PARCNET_CLIENT_CONNECT) {
        ws.removeEventListener("message", initialEventHandler);
        console.log("got connection!");
        resolve({
          advice: new WebsocketAdviceChannel({
            socket: ws,
            onReady: (rpc) => {
              rpcMessageHandler = (ev: MessageEvent) => {
                const message = RPCMessageSchema.safeParse(
                  JSONBig.parse(ev.data.toString())
                );
                console.log({ message });
                if (message.success === false) {
                  log(message.error);
                  log(ev.data.toString());
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

    console.log("adding window event listener");
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
