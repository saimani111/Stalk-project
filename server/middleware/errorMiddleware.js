const notFound = (req, res, next) => {
  res.status(404).json({ message: `Not found - ${req.method} ${req.originalUrl}` });
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  console.error("SERVER ERROR:", err);

  if (err.name === "MulterError") {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "File too large (max 25MB)"
        : `Upload error: ${err.message}`;
    return res.status(400).json({ message });
  }

  const statusCode = err.statusCode || 500;
  const isProd = process.env.NODE_ENV === "production";
  // Never leak internal error details (DB messages etc.) in production
  res.status(statusCode).json({
    message:
      statusCode === 500 && isProd
        ? "Something went wrong on our side. Please try again."
        : err.message || "Internal server error",
  });
};

module.exports = { notFound, errorHandler };
