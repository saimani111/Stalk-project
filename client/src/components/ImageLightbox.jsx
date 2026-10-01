import { X, Download } from "lucide-react";

const ImageLightbox = ({ imageUrl, onClose }) => {
  if (!imageUrl) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.92)",
        backdropFilter: "blur(10px)",
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      {/* Action buttons */}
      <div
        style={{
          position: "absolute",
          top: "24px",
          right: "24px",
          display: "flex",
          gap: "12px",
          zIndex: 10,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <a
          href={imageUrl}
          download="chat-image"
          target="_blank"
          rel="noreferrer"
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            background: "#18181b",
            border: "1px solid #27272a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            cursor: "pointer",
            textDecoration: "none",
            boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
          }}
          title="Download Image"
        >
          <Download size={20} />
        </a>
        <button
          onClick={onClose}
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            background: "#18181b",
            border: "1px solid #27272a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#f87171",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
          }}
          title="Close Preview"
        >
          <X size={22} />
        </button>
      </div>

      {/* Image Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "90%",
          maxHeight: "90%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <img
          src={imageUrl}
          alt="Full Preview"
          style={{
            maxWidth: "100%",
            maxHeight: "85vh",
            objectFit: "contain",
            borderRadius: "12px",
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.9), 0 0 30px rgba(220, 38, 38, 0.2)",
          }}
        />
      </div>
    </div>
  );
};

export default ImageLightbox;
