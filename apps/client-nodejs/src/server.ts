import { confirm } from "@inquirer/prompts";
import { listen } from "@parcnet/client-helpers/connection/websocket";
import { RPCMessage, RPCMessageType } from "@parcnet/client-rpc";
import * as http from "http";
import JSONBig from "json-bigint";
import { v4 as uuidv4 } from "uuid";
import { WebSocket, WebSocketServer } from "ws";
import { ParcnetClientProcessor } from "./client/client";
import log from "./log";

const server = http.createServer();
const PORT = parseInt(process.env.PORT ?? "3050");

log(`Starting websocket server on port ${PORT}`);

const wss = new WebSocketServer({ server });

server.listen(PORT, () => {
  log(`Server is listening on port ${PORT}`);
});

const clients: Record<string, WebSocket> = {};

// A new client connection request received
wss.on("connection", async function (connection) {
  // Generate a unique code for every connection
  const connectionId = uuidv4();
  console.log(`Received a new connection.`);
  const { advice, zapp } = await listen(connection);

  connection.send(
    JSONBig.stringify({
      type: RPCMessageType.PARCNET_CLIENT_SHOW
    } satisfies RPCMessage)
  );
  const allowed = await confirm({
    message: `Allow Zapp "${zapp.name}" to connect?`
  });
  connection.send(
    JSONBig.stringify({
      type: RPCMessageType.PARCNET_CLIENT_HIDE
    } satisfies RPCMessage)
  );

  if (allowed) {
    advice.ready(new ParcnetClientProcessor(advice));
    console.log(`Connected to ${zapp.name}`);
    clients[connectionId] = connection;
  } else {
    connection.close();
  }
});
