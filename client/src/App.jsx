import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import Users from "./pages/Users";
import Chat from "./pages/Chat";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />

        <Route path="/login" element={<Login />} />

        <Route path="/register" element={<Register />} />

        <Route path="/profile" element={<Profile />} />

        <Route path="/users" element={<Users />} />

        <Route path="/chat/:userId" element={<Chat />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;