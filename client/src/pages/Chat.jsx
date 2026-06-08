import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { getMessages, sendMessage } from "../services/messageServices";
import socket from "../services/socket";

function Chat() {
  const { userId } = useParams();

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [typing, setTyping] = useState(false);

  const myId = "6a259bbe5d9a4904be34f401";

  const loadMessages = async () => {
    try {
      const data = await getMessages(userId);

      setMessages(data);

      socket.emit("message_seen");
    } catch (error) {
      console.log("CHAT ERROR =", error);
    }
  };

  useEffect(() => {
    loadMessages();
  }, [userId]);

  useEffect(() => {
    socket.on("receive_message", loadMessages);
    socket.on("message_seen", loadMessages);

    socket.on("user_typing", () => {
      setTyping(true);
    });

    socket.on("user_stop_typing", () => {
      setTyping(false);
    });

    return () => {
      socket.off("receive_message", loadMessages);
      socket.off("message_seen", loadMessages);
      socket.off("user_typing");
      socket.off("user_stop_typing");
    };
  }, []);

  const handleSend = async () => {
    if (!newMessage.trim()) return;

    try {
      await sendMessage(userId, newMessage);

      socket.emit("send_message", {
        message: newMessage,
      });

      socket.emit("stop_typing");

      setNewMessage("");

      loadMessages();
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0f172a",
        color: "white",
        padding: "20px",
      }}
    >
      <h1>Chat Page</h1>

      <div style={{ marginTop: "20px", marginBottom: "20px" }}>
        {messages.length === 0 ? (
          <p>No messages found</p>
        ) : (
          messages.map((msg) => {
            const isMyMessage =
              msg.sender?._id === myId;

            return (
              <div
                key={msg._id}
                style={{
                  display: "flex",
                  justifyContent: isMyMessage
                    ? "flex-end"
                    : "flex-start",
                  margin: "12px 0",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-end",
                    gap: "10px",
                    flexDirection: isMyMessage
                      ? "row-reverse"
                      : "row",
                  }}
                >
                  <img
                    src={
                      msg.sender?.profilePic ||
                      "https://via.placeholder.com/40"
                    }
                    alt="avatar"
                    width="40"
                    height="40"
                    style={{
                      borderRadius: "50%",
                      objectFit: "cover",
                    }}
                  />

                  <div
                    style={{
                      background: isMyMessage
                        ? "#22c55e"
                        : "#1e293b",
                      padding: "10px",
                      borderRadius: "12px",
                      maxWidth: "350px",
                      color: "white",
                    }}
                  >
                    <div>{msg.message}</div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginTop: "5px",
                        gap: "10px",
                      }}
                    >
                      <small>
                        {new Date(
                          msg.createdAt
                        ).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </small>

                      {isMyMessage && (
                        <small>
                          {msg.seen
                            ? "✓✓ Seen"
                            : "✓ Sent"}
                        </small>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {typing && (
        <p
          style={{
            color: "#94a3b8",
            fontStyle: "italic",
          }}
        >
          Someone is typing...
        </p>
      )}

      <div
        style={{
          display: "flex",
          gap: "10px",
        }}
      >
        <input
          type="text"
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => {
            setNewMessage(e.target.value);

            socket.emit("typing");

            setTimeout(() => {
              socket.emit("stop_typing");
            }, 1000);
          }}
          style={{
            flex: 1,
            padding: "12px",
            borderRadius: "10px",
            border: "none",
          }}
        />

        <button
          onClick={handleSend}
          style={{
            padding: "12px 20px",
            borderRadius: "10px",
            border: "none",
            cursor: "pointer",
            backgroundColor: "#22c55e",
            color: "white",
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default Chat;