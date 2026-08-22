const jwt = require("jsonwebtoken");

const getRequiredEnv = (name) => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured`);
  }

  return value;
};

const generateAccessToken = (user) => {
  return jwt.sign(
    {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    },
    getRequiredEnv("JWT_ACCESS_SECRET"),
    {
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "60m",
    }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      userId: user._id.toString(),
      tokenType: "refresh",
    },
    getRequiredEnv("JWT_REFRESH_SECRET"),
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
    }
  );
};

const verifyAccessToken = (token) => {
  return jwt.verify(
    token,
    getRequiredEnv("JWT_ACCESS_SECRET")
  );
};

const verifyRefreshToken = (token) => {
  const decoded = jwt.verify(
    token,
    getRequiredEnv("JWT_REFRESH_SECRET")
  );

  if (decoded.tokenType !== "refresh") {
    throw new Error("Invalid refresh token");
  }

  return decoded;
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};