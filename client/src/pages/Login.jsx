import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser } from "../authServices";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submitHandler = async (e) => {
    e.preventDefault();

    try {
      const data = await loginUser({
        email,
        password,
      });

      console.log("LOGIN RESPONSE =", data);

      localStorage.setItem("token", data.token);

      alert("Login Successful");

      navigate("/users");
    } catch (err) {
      console.log(err);
      alert("Login Failed");
    }
  };

  return (
    <div>
      <h2>Login</h2>

      <form onSubmit={submitHandler}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <br /><br />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <br /><br />

        <button type="submit">Login</button>
      </form>
    </div>
  );
}

export default Login;