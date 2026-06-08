import { useState } from "react";
import { registerUser } from "../authServices";

function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [profilePic, setProfilePic] = useState("");

  const submitHandler = async (e) => {
    e.preventDefault();

    try {
      await registerUser({
        name,
        email,
        password,
        profilePic,
      });

      alert("Registration Successful");
    } catch (err) {
      alert("Registration Failed");
    }
  };

  return (
    <div>
      <h2>Register</h2>

      <form onSubmit={submitHandler}>
        <input
          type="text"
          placeholder="Name"
          onChange={(e) => setName(e.target.value)}
        />

        <br />
        <br />

        <input
          type="email"
          placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
        />

        <br />
        <br />

        <input
          type="password"
          placeholder="Password"
          onChange={(e) => setPassword(e.target.value)}
        />

        <br />
        <br />

        <input
          type="text"
          placeholder="Profile Picture URL"
          onChange={(e) => setProfilePic(e.target.value)}
        />

        <br />
        <br />

        {profilePic && (
          <img
            src={profilePic}
            alt="Preview"
            width="100"
            height="100"
            style={{
              borderRadius: "50%",
              objectFit: "cover",
            }}
          />
        )}

        <br />
        <br />

        <button type="submit">Register</button>
      </form>
    </div>
  );
}

export default Register;