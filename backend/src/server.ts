import http from "http";
import { app } from "./app";
import { config } from "./config";
import { setNotificationEmitter } from "./notifications-emitter";
import { initializeSocket } from "./socket";

const { port } = config;

const server = http.createServer(app);
const io = initializeSocket(server);

setNotificationEmitter((userId, payload) => {
  io.to(`user:${userId}`).emit("notification", payload);
});

server.listen(port, () => {
  console.log(`[TeleCare] Server running on port ${port} (${config.nodeEnv})`);
  console.log(`[TeleCare] Socket.io initialized`);
});

server.on("error", (err: NodeJS.ErrnoException) => {
  const msg = err.code === "EADDRINUSE"
    ? `Port ${port} in use. Run: lsof -ti:${port} | xargs kill`
    : err.message;
  console.error(`[TeleCare] ${msg}`);
  process.exit(1);
});

const shutdown = () => {
  io.close();
  server.close(() => process.exit(0));
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

export { server, io };
