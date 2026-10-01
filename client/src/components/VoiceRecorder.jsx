import { useState, useRef } from "react";
import { Mic, Square, Send, Trash2 } from "lucide-react";
import { uploadFileApi } from "../services/api";
import { toast } from "../utils/toast";

const VoiceRecorder = ({ onAudioRecorded, onCancel }) => {
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [uploading, setUploading] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);

        // Stop audio track
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start();
      setRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Failed to start voice recording:", err);
      toast.error("Microphone access is required to record voice notes.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleSend = async () => {
    if (!audioBlob) return;

    try {
      setUploading(true);
      const audioFile = new File([audioBlob], "voice-note.webm", {
        type: "audio/webm",
      });

      const uploaded = await uploadFileApi(audioFile);
      onAudioRecorded(uploaded.url, "audio", uploaded.fileName);
      handleCancel();
    } catch (err) {
      console.error("Failed to upload voice note:", err);
      toast.error("Failed to upload voice note");
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setRecording(false);
    setRecordingTime(0);
    if (onCancel) onCancel();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        background: "#1e293b",
        padding: "8px 16px",
        borderRadius: "12px",
        border: "1px solid #334155",
        flex: 1,
      }}
    >
      {!recording && !audioUrl && (
        <button
          onClick={startRecording}
          style={{
            background: "#ef4444",
            border: "none",
            borderRadius: "50%",
            width: "36px",
            height: "36px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            cursor: "pointer",
          }}
          title="Start Recording"
        >
          <Mic size={18} />
        </button>
      )}

      {recording && (
        <>
          <div
            style={{
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              background: "#ef4444",
              animation: "pulse 1.5s infinite",
            }}
          />
          <span style={{ color: "#f8fafc", fontSize: "14px", fontWeight: "500" }}>
            Recording {formatTime(recordingTime)}
          </span>
          <button
            onClick={stopRecording}
            style={{
              background: "#334155",
              border: "none",
              borderRadius: "50%",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              cursor: "pointer",
              marginLeft: "auto",
            }}
            title="Stop Recording"
          >
            <Square size={16} />
          </button>
        </>
      )}

      {audioUrl && !recording && (
        <>
          <audio src={audioUrl} controls style={{ height: "36px", flex: 1 }} />
          <button
            onClick={handleCancel}
            style={{
              background: "#334155",
              border: "none",
              borderRadius: "50%",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#94a3b8",
              cursor: "pointer",
            }}
            title="Discard"
          >
            <Trash2 size={16} />
          </button>
          <button
            onClick={handleSend}
            disabled={uploading}
            style={{
              background: "#22c55e",
              border: "none",
              borderRadius: "50%",
              width: "36px",
              height: "36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              cursor: "pointer",
              opacity: uploading ? 0.6 : 1,
            }}
            title="Send Voice Note"
          >
            <Send size={18} />
          </button>
        </>
      )}
    </div>
  );
};

export default VoiceRecorder;
