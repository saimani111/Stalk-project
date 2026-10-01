import { io } from "socket.io-client";
import { BASE_URL } from "./api";

const socket = io(BASE_URL, {
  autoConnect: true,
  transports: ["websocket", "polling"],
  auth: (cb) => {
    cb({ token: localStorage.getItem("token") || "" });
  },
});

export default socket;