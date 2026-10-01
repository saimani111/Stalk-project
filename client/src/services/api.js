import axios from "axios";

export const BASE_URL =
  import.meta.env.VITE_API_URL ||
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000"
    : "https://stalk-backend-gw09.onrender.com");

const API = axios.create({
  baseURL: `${BASE_URL}/api`,
});

// Resolve server-relative upload URLs (e.g. /uploads/x.png) against the API host
export const fileUrl = (url) =>
  !url || url.startsWith("http") ? url : `${BASE_URL}${url}`;

// Attach JWT Authorization token to requests automatically
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth Services
export const registerUser = async (userData) => {
  const response = await API.post("/auth/register", userData);
  return response.data;
};

export const loginUser = async (userData) => {
  const response = await API.post("/auth/login", userData);
  return response.data;
};

export const getProfile = async () => {
  const response = await API.get("/auth/profile");
  return response.data;
};

export const forgotPasswordApi = async (email) => {
  const response = await API.post("/auth/forgot-password", { email });
  return response.data;
};

export const resetPasswordApi = async (email, code, newPassword) => {
  const response = await API.post("/auth/reset-password", { email, code, newPassword });
  return response.data;
};

// User Services
export const getAllUsers = async () => {
  const response = await API.get("/users");
  return response.data;
};

export const updateProfilePicApi = async (profilePic) => {
  const response = await API.put("/users/profile-pic", { profilePic });
  return response.data;
};

export const deleteProfilePicApi = async () => {
  const response = await API.delete("/users/profile-pic");
  return response.data;
};

// Message Services
export const getDirectMessages = async (userId) => {
  const response = await API.get(`/messages/user/${userId}`);
  return response.data;
};

export const getGroupMessages = async (groupId) => {
  const response = await API.get(`/messages/group/${groupId}`);
  return response.data;
};

export const getConversationsSummaryApi = async () => {
  const response = await API.get("/messages/conversations/summary");
  return response.data;
};

export const sendApiMessage = async (payload) => {
  const response = await API.post("/messages", payload);
  return response.data;
};

export const reactToApiMessage = async (messageId, emoji) => {
  const response = await API.post(`/messages/${messageId}/react`, { emoji });
  return response.data;
};

export const votePollApi = async (messageId, optionIndex) => {
  const response = await API.post(`/messages/${messageId}/vote`, { optionIndex });
  return response.data;
};

export const deleteApiMessage = async (messageId) => {
  const response = await API.delete(`/messages/${messageId}`);
  return response.data;
};

export const openBurnMessageApi = async (messageId) => {
  const response = await API.put(`/messages/${messageId}/open-burn`);
  return response.data;
};

export const burnMessageApi = async (messageId) => {
  const response = await API.delete(`/messages/${messageId}/burn`);
  return response.data;
};

// Group Services
export const createGroupApi = async (groupData) => {
  const response = await API.post("/groups", groupData);
  return response.data;
};

export const getUserGroupsApi = async () => {
  const response = await API.get("/groups");
  return response.data;
};

export const addGroupMembersApi = async (groupId, memberIds) => {
  const response = await API.post(`/groups/${groupId}/members`, { memberIds });
  return response.data;
};

export const removeGroupMemberApi = async (groupId, memberId) => {
  const response = await API.delete(`/groups/${groupId}/members/${memberId}`);
  return response.data;
};

// Upload Services
export const uploadFileApi = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await API.post("/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    // generous: Render free-tier cold starts can take ~50s
    timeout: 120000,
  });
  return response.data;
};

// ================= Call Services =================
export const getCallLogsApi = async () => {
  const response = await API.get("/calls");
  return response.data;
};

export const createCallLogApi = async (callData) => {
  const response = await API.post("/calls", callData);
  return response.data;
};

export const clearCallLogsApi = async () => {
  const response = await API.delete("/calls");
  return response.data;
};

// ================= Status / Stories Services =================
export const getStatusesApi = async () => {
  const response = await API.get("/status");
  return response.data;
};

export const createStatusApi = async (statusData) => {
  const response = await API.post("/status", statusData);
  return response.data;
};

export const viewStatusApi = async (statusId) => {
  const response = await API.put(`/status/${statusId}/view`);
  return response.data;
};

export const deleteStatusApi = async (statusId) => {
  const response = await API.delete(`/status/${statusId}`);
  return response.data;
};

// ================= Community Services =================
export const getCommunitiesApi = async () => {
  const response = await API.get("/communities");
  return response.data;
};

export const createCommunityApi = async (communityData) => {
  const response = await API.post("/communities", communityData);
  return response.data;
};

export const postAnnouncementApi = async (communityId, message) => {
  const response = await API.post(`/communities/${communityId}/announcement`, { message });
  return response.data;
};

export const linkGroupToCommunityApi = async (communityId, groupId) => {
  const response = await API.post(`/communities/${communityId}/groups`, { groupId });
  return response.data;
};

// ================= AI Companion (Stuny) Services =================
export const askAssistantApi = async (messages) => {
  const response = await API.post("/ai/chat", { messages });
  return response.data;
};

export const speakAssistantApi = async (text) => {
  const response = await API.post("/ai/speak", { text }, { responseType: "blob" });
  return response.data;
};

export default API;

