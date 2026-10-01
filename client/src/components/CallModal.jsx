import { useEffect, useRef } from "react";
import { useSocket } from "../context/SocketContext";
import { Phone, PhoneOff, Mic, MicOff, Camera, CameraOff } from "lucide-react";

const CallModal = () => {
  const {
    incomingCall,
    callActive,
    callType,
    targetUser,
    localStream,
    remoteStream,
    micMuted,
    cameraOff,
    answerCall,
    rejectCall,
    endCall,
    toggleMic,
    toggleCamera,
  } = useSocket();

  const localVideoRef = useRef();
  const remoteVideoRef = useRef();

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (!incomingCall && !callActive) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.88)",
        backdropFilter: "blur(12px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      {/* Incoming Call Dialog */}
      {incomingCall && !callActive && (
        <div
          style={{
            background: "#121212",
            border: "1px solid #27272a",
            borderRadius: "24px",
            padding: "36px 32px",
            textAlign: "center",
            width: "360px",
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.9), 0 0 30px rgba(220, 38, 38, 0.2)",
          }}
        >
          <div
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #ef4444, #991b1b)",
              margin: "0 auto 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "32px",
              fontWeight: "bold",
              animation: "pulse 2s infinite",
              boxShadow: "0 0 20px rgba(239, 68, 68, 0.5)",
            }}
          >
            {incomingCall.name ? incomingCall.name[0].toUpperCase() : "C"}
          </div>
          <h3 style={{ margin: "0 0 8px 0", color: "#ffffff", fontSize: "20px" }}>
            {incomingCall.name || "Incoming Call"}
          </h3>
          <p style={{ color: "#a1a1aa", fontSize: "14px", margin: "0 0 24px 0" }}>
            Incoming {incomingCall.callType === "video" ? "Video" : "Voice"} Call...
          </p>

          <div style={{ display: "flex", gap: "16px", justifyContent: "center" }}>
            <button
              onClick={rejectCall}
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "#1c1917",
                border: "1px solid #7f1d1d",
                color: "#ef4444",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "transform 0.2s",
              }}
              title="Decline Call"
            >
              <PhoneOff size={24} />
            </button>
            <button
              onClick={answerCall}
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "#22c55e",
                border: "none",
                color: "white",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "transform 0.2s",
                boxShadow: "0 0 15px rgba(34, 197, 94, 0.5)",
              }}
              title="Accept Call"
            >
              <Phone size={24} />
            </button>
          </div>
        </div>
      )}

      {/* Active Video / Voice Call Window */}
      {callActive && (
        <div
          style={{
            position: "relative",
            width: "90%",
            maxWidth: "900px",
            height: "80vh",
            background: "#0a0a0a",
            border: "1px solid #27272a",
            borderRadius: "24px",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.9), 0 0 30px rgba(220, 38, 38, 0.15)",
          }}
        >
          {/* Main Video View */}
          <div style={{ flex: 1, position: "relative", background: "#050505" }}>
            {callType === "video" ? (
              <>
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
                {/* Local Video Thumbnail */}
                <div
                  style={{
                    position: "absolute",
                    bottom: "20px",
                    right: "20px",
                    width: "180px",
                    height: "135px",
                    borderRadius: "16px",
                    overflow: "hidden",
                    border: "2px solid #ef4444",
                    boxShadow: "0 10px 20px rgba(0,0,0,0.8)",
                    background: "#18181b",
                  }}
                >
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                </div>
              </>
            ) : (
              /* Voice Call Placeholder */
              <div
                style={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "20px",
                  color: "white",
                }}
              >
                <div
                  style={{
                    width: "120px",
                    height: "120px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #ef4444, #991b1b)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "48px",
                    fontWeight: "bold",
                    boxShadow: "0 0 30px rgba(239, 68, 68, 0.5)",
                  }}
                >
                  {targetUser?.name ? targetUser.name[0].toUpperCase() : "U"}
                </div>
                <h2>{targetUser?.name || "Voice Call in Progress..."}</h2>
                <audio ref={remoteVideoRef} autoPlay />
              </div>
            )}
          </div>

          {/* Call Controls Bar */}
          <div
            style={{
              padding: "16px 24px",
              background: "#111113",
              borderTop: "1px solid #27272a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "20px",
            }}
          >
            <button
              onClick={toggleMic}
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: micMuted ? "#ef4444" : "#1c1917",
                border: "1px solid #27272a",
                color: "white",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title={micMuted ? "Unmute Mic" : "Mute Mic"}
            >
              {micMuted ? <MicOff size={20} /> : <Mic size={20} />}
            </button>

            {callType === "video" && (
              <button
                onClick={toggleCamera}
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  background: cameraOff ? "#ef4444" : "#1c1917",
                  border: "1px solid #27272a",
                  color: "white",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                title={cameraOff ? "Turn Camera On" : "Turn Camera Off"}
              >
                {cameraOff ? <CameraOff size={20} /> : <Camera size={20} />}
              </button>
            )}

            <button
              onClick={endCall}
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "#dc2626",
                border: "none",
                color: "white",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 15px rgba(220, 38, 38, 0.5)",
              }}
              title="End Call"
            >
              <PhoneOff size={24} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CallModal;
