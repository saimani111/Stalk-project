const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Ensure upload directory exists
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Extension is derived from the validated mimetype, never from the
// client-supplied filename (an attacker could name a file "evil.html")
const MIME_EXT = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/bmp": ".bmp",
  "image/avif": ".avif",
  "audio/mpeg": ".mp3",
  "audio/wav": ".wav",
  "audio/ogg": ".ogg",
  "audio/webm": ".webm",
  "audio/mp4": ".m4a",
  "audio/aac": ".aac",
  "audio/x-m4a": ".m4a",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
  "application/pdf": ".pdf",
  "text/plain": ".txt",
  "application/zip": ".zip",
  "application/msword": ".doc",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.ms-powerpoint": ".ppt",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
};

// Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = MIME_EXT[file.mimetype] || ".bin";
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

const ALLOWED_MIMETYPES = new Set([
  // Images (SVG excluded - scriptable content)
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/bmp",
  "image/avif",
  // Audio
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/webm",
  "audio/mp4",
  "audio/aac",
  "audio/x-m4a",
  // Video
  "video/mp4",
  "video/webm",
  "video/quicktime",
  // Documents
  "application/pdf",
  "text/plain",
  "application/zip",
  "application/msword",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIMETYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${file.mimetype}`));
    }
  },
});

// Upload File Endpoint
router.post("/", protect, upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    let mediaType = "file";

    if (req.file.mimetype.startsWith("image/")) {
      mediaType = "image";
    } else if (req.file.mimetype.startsWith("audio/")) {
      mediaType = "audio";
    }

    res.status(200).json({
      url: fileUrl,
      mediaType,
      fileName: req.file.originalname,
      size: req.file.size,
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
