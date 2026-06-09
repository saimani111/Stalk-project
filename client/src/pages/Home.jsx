import { useNavigate } from "react-router-dom";

function Home() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        color: "white",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        padding: "20px",
      }}
    >
      <h1 style={{ fontSize: "4rem", marginBottom: "20px" }}>
        Welcome to Stalk 🚀
      </h1>

      <p style={{ fontSize: "1.3rem", maxWidth: "700px" }}>
        A modern real-time communication platform built with React,
        Node.js, MongoDB and Socket.IO.
      </p>

      <div style={{ marginTop: "40px" }}>
        <button
          onClick={() => navigate("/login")}
          style={{
            padding: "12px 25px",
            marginRight: "15px",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
          }}
        >
          Login
        </button>

        <button
          onClick={() => navigate("/register")}
          style={{
            padding: "12px 25px",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
          }}
        >
          Register
        </button>
      </div>
    </div>
  );
}

export default Home;