import { io } from "socket.io-client";

const socket = io("https://YOUR-RENDER-URL.onrender.com");

export default socket;