import axios from "axios";

const API_URL = "https://stalk-backend-gw09.onrender.com/api/messages";

export const getMessages = async (userId) => {
  const token = localStorage.getItem("token");

  const response = await axios.get(`${API_URL}/${userId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};

export const sendMessage = async (receiver, message) => {
  const token = localStorage.getItem("token");

  const response = await axios.post(
    API_URL,
    {
      receiver,
      message,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};