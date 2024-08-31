import { listen } from "@parcnet/client-helpers/connection/websocket";
import * as http from "http";
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
  console.log(zapp);
  // Here we should decide if we want to permit this Zapp to connect
  // For demonstration purposes, just allow it automatically
  advice.ready(new ParcnetClientProcessor(advice));

  // Store the new connection and handle messages
  clients[connectionId] = connection;
  console.log(`${connectionId} connected.`);
});
