export const centralErrorHandler = (err, req, res, next) => {
  const isProduction = process.env.NODE_ENV === "production";
  const statusCode = err.status || err.statusCode || 500;

  // Mask 500 error messages in production to prevent information disclosure
  let message;
  if (statusCode === 500) {
    message = isProduction ? "Internal server error" : (err.message || "Internal server error");
  } else {
    message = err.message || "An error occurred";
  }

  const response = { message };
  if (err.errors && Array.isArray(err.errors)) {
    response.errors = err.errors;
  }

  if (statusCode === 500) {
    console.error(`[500 ERROR] ${req.method} ${req.originalUrl}:`, err);
  }

  return res.status(statusCode).json(response);
};
