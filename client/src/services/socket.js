import { io } from "socket.io-client";

const socket = io("https://stalk-backend-gw09.onrender.com");

export default socket;