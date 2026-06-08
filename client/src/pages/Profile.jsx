import { useEffect, useState } from "react";
import { getProfile } from "../authServices";

function Profile() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("token");

      try {
        const data = await getProfile(token);
        setUser(data);
      } catch (error) {
        console.log(error);
      }
    };

    fetchProfile();
  }, []);

  return (
    <div>
      <h1>Profile Page</h1>

      {user ? (
        <>
          <h3>{user.name}</h3>
          <p>{user.email}</p>
        </>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
}

export default Profile;