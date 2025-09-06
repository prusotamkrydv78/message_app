import { io } from "socket.io-client";

let socket = null;
let currentToken = null;

export function getSocket(token) {
  if (socket && currentToken === token) return socket;
  if (socket) {
    try { socket.disconnect(); } catch {}
  }
  currentToken = token;
  if (!token) return null;
  socket = io(process.env.NEXT_PUBLIC_API_BASE || "https://b-message-app.onrender.com", {
    auth: { token },
    transports: ["websocket"],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 500,
  });
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    try { socket.disconnect(); } catch {}
    socket = null;
    currentToken = null;
  }
}
