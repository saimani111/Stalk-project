import { createContext, useContext, useEffect, useState, useRef } from "react";
import socket from "../services/socket";
import { useAuth } from "./AuthContext";
import { toast } from "../utils/toast";

const SocketContext = createContext();

const peerConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState([]);

  // WebRTC Calling state
  const [incomingCall, setIncomingCall] = useState(null);
  const [callActive, setCallActive] = useState(false);
  const [callType, setCallType] = useState("video"); // "audio" | "video"
  const [targetUser, setTargetUser] = useState(null);
  const [micMuted, setMicMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);

  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  const cleanupCall = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    setLocalStream(null);
    setRemoteStream(null);
    setCallActive(false);
    setIncomingCall(null);
    setTargetUser(null);
    setMicMuted(false);
    setCameraOff(false);
  };

  // Online Users & Socket Setup
  useEffect(() => {
    if (user?._id) {
      // Reconnect with fresh token if the socket was created before login
      if (!socket.connected) socket.connect();
      socket.emit("user_online", user._id);
    } else {
      socket.disconnect();
    }

    socket.on("online_users", (users) => {
      setOnlineUsers(users);
    });

    // WebRTC Signaling listeners
    socket.on("incoming-call", ({ from, name, offer, callType }) => {
      setIncomingCall({ from, name, offer, callType });
      setCallType(callType || "video");
    });

    socket.on("call-answered", async ({ answer }) => {
      if (peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(answer)
          );
          setCallActive(true);
        } catch (err) {
          console.error("Error setting remote description:", err);
        }
      }
    });

    socket.on("ice-candidate", async ({ candidate }) => {
      if (peerConnectionRef.current && candidate) {
        try {
          await peerConnectionRef.current.addIceCandidate(
            new RTCIceCandidate(candidate)
          );
        } catch (err) {
          console.error("Error adding ice candidate:", err);
        }
      }
    });

    socket.on("call-rejected", () => {
      cleanupCall();
      toast.info("Call was rejected");
    });

    socket.on("call-ended", () => {
      cleanupCall();
    });

    return () => {
      socket.off("online_users");
      socket.off("incoming-call");
      socket.off("call-answered");
      socket.off("ice-candidate");
      socket.off("call-rejected");
      socket.off("call-ended");
    };
  }, [user]);

  const initLocalStream = async (type = "video") => {
    try {
      const constraints = {
        audio: { echoCancellation: true, noiseSuppression: true },
        video:
          type === "video"
            ? { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24, max: 30 }, facingMode: "user" }
            : false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.error("Failed to access media devices:", err);
      toast.error("Microphone/Camera access required for calls.");
      return null;
    }
  };

  const createPeerConnection = (targetUserId) => {
    const pc = new RTCPeerConnection(peerConfiguration);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", {
          to: targetUserId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        remoteStreamRef.current = event.streams[0];
        setRemoteStream(event.streams[0]);
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  };

  const startCall = async (userToCall, type = "video") => {
    setCallType(type);
    setTargetUser(userToCall);

    const stream = await initLocalStream(type);
    if (!stream) return;

    const pc = createPeerConnection(userToCall._id);
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit("call-user", {
        userToCall: userToCall._id,
        offer,
        from: user._id,
        name: user.name,
        callType: type,
      });

      setCallActive(true);
    } catch (err) {
      console.error("Error starting call:", err);
      cleanupCall();
    }
  };

  const answerCall = async () => {
    if (!incomingCall) return;

    setCallType(incomingCall.callType || "video");
    const stream = await initLocalStream(incomingCall.callType);
    if (!stream) return;

    const pc = createPeerConnection(incomingCall.from);
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    try {
      await pc.setRemoteDescription(
        new RTCSessionDescription(incomingCall.offer)
      );
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit("make-answer", {
        to: incomingCall.from,
        answer,
      });

      setCallActive(true);
      setIncomingCall(null);
    } catch (err) {
      console.error("Error answering call:", err);
      cleanupCall();
    }
  };

  const rejectCall = () => {
    if (incomingCall) {
      socket.emit("reject-call", { to: incomingCall.from });
      setIncomingCall(null);
    }
  };

  const endCall = () => {
    if (targetUser?._id) {
      socket.emit("end-call", { to: targetUser._id });
    } else if (incomingCall?.from) {
      socket.emit("end-call", { to: incomingCall.from });
    }
    cleanupCall();
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleCamera = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCameraOff(!videoTrack.enabled);
      }
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        onlineUsers,
        incomingCall,
        callActive,
        callType,
        targetUser,
        localStream,
        remoteStream,
        micMuted,
        cameraOff,
        startCall,
        answerCall,
        rejectCall,
        endCall,
        toggleMic,
        toggleCamera,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components -- context files co-export their hook by design
export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};
