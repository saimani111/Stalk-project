import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import socket from "../services/socket";

function Users() {
  const [users, setUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem("token");

        const { data } = await axios.get(
          "https://stalk-backend-gw09.onrender.com/api/users",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setUsers(data);

        const payload = JSON.parse(
          atob(token.split(".")[1])
        );

        socket.emit("user_online", payload.id);
      } catch (error) {
        console.log(error);
      }
    };

    fetchUsers();

    socket.on("online_users", (users) => {
      setOnlineUsers(users);
    });

    return () => {
      socket.off("online_users");
    };
  }, []);

  return (
    <div
      style={{
        padding: "20px",
      }}
    >
      <h1>Users</h1>

      {users.map((user) => {
        const isOnline = onlineUsers.includes(user._id);

        return (
          <div
            key={user._id}
            style={{
              border: "1px solid gray",
              margin: "10px",
              padding: "15px",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              gap: "15px",
            }}
          >
            <img
              src={
                user.profilePic ||
                "https://via.placeholder.com/60"
              }
              alt={user.name}
              width="60"
              height="60"
              style={{
                borderRadius: "50%",
                objectFit: "cover",
              }}
            />

            <div style={{ flex: 1 }}>
              <h3>{user.name}</h3>

              <p>{user.email}</p>

              <p>
                {isOnline
                  ? "🟢 Online"
                  : "⚫ Offline"}
              </p>
            </div>

            <Link to={`/chat/${user._id}`}>
              <button>Chat</button>
            </Link>
          </div>
        );
      })}
    </div>
  );
}

export default Users;