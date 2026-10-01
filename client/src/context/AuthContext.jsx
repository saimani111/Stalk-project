import { createContext, useContext, useState, useEffect } from "react";
import { loginUser, registerUser, getProfile } from "../services/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token") || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      if (token) {
        try {
          const profile = await getProfile();
          setUser(profile);
        } catch (error) {
          console.error("Failed to fetch user profile:", error);
          localStorage.removeItem("token");
          setToken(null);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    fetchUser();
  }, [token]);

  const handleLogin = async (email, password) => {
    const data = await loginUser({ email, password });
    localStorage.setItem("token", data.token);
    setToken(data.token);
    setUser({
      _id: data._id,
      name: data.name,
      email: data.email,
      profilePic: data.profilePic,
    });
    return data;
  };

  const handleRegister = async (name, email, password, profilePic) => {
    const data = await registerUser({ name, email, password, profilePic });
    return data;
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login: handleLogin,
        register: handleRegister,
        logout: handleLogout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components -- context files co-export their hook by design
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
