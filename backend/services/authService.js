const bcrypt = require("bcryptjs");

const User = require("../models/User");
const Session = require("../models/Session");

const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require("../utils/jwt");

const createError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const registerUser = async (userData) => {
  const {
    fullName,
    email,
    mobileNo,
    internCode,
    domain,
    startDate,
    endDate,
    password,
    role,
  } = userData;

  const normalizedEmail = email.toLowerCase().trim();

  const existingUser = await User.findOne({
    email: normalizedEmail,
  });

  if (existingUser) {
    throw createError("Email is already registered", 409);
  }

  let normalizedInternCode;

  if (internCode) {
    normalizedInternCode = internCode.trim();

    const existingInternCode = await User.findOne({
      internCode: normalizedInternCode,
    });

    if (existingInternCode) {
      throw createError("Intern code is already registered", 409);
    }
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await User.create({
    fullName: fullName.trim(),
    email: normalizedEmail,
    mobileNo: mobileNo.trim(),
    internCode: normalizedInternCode,
    domain: domain.trim(),
    startDate: startDate || null,
    endDate: endDate || null,
    password: hashedPassword,
    role,
  });

  const userResponse = user.toObject();

  delete userResponse.password;

  return userResponse;
};

const loginUser = async ({
  email,
  password,
  ipAddress,
  userAgent,
}) => {
  const normalizedEmail = email.toLowerCase().trim();

  const user = await User.findOne({
    email: normalizedEmail,
  });

  if (!user) {
    throw createError("Invalid email or password", 401);
  }

  const passwordMatches = await bcrypt.compare(
    password,
    user.password
  );

  if (!passwordMatches) {
    throw createError("Invalid email or password", 401);
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  const decodedRefreshToken = verifyRefreshToken(refreshToken);

  const session = await Session.create({
    userId: user._id,
    token: refreshToken,
    ipAddress: ipAddress || null,
    userAgent: userAgent || null,
    expiresAt: new Date(decodedRefreshToken.exp * 1000),
    isActive: true,
  });

  const userResponse = user.toObject();

  delete userResponse.password;

  return {
    accessToken,
    refreshToken,
    sessionId: session._id,
    user: userResponse,
  };
};

const refreshAccessToken = async (refreshToken) => {
  if (!refreshToken) {
    throw createError("Refresh token is required", 401);
  }

  const decoded = verifyRefreshToken(refreshToken);

  const session = await Session.findOne({
    token: refreshToken,
    userId: decoded.userId,
    isActive: true,
  });

  if (!session) {
    throw createError("Invalid or inactive refresh session", 401);
  }

  if (session.expiresAt <= new Date()) {
    session.isActive = false;
    await session.save();

    throw createError("Refresh session has expired", 401);
  }

  const user = await User.findById(decoded.userId);

  if (!user) {
    session.isActive = false;
    await session.save();

    throw createError("User account not found", 404);
  }

  const accessToken = generateAccessToken(user);

  return {
    accessToken,
  };
};

const logoutUser = async (refreshToken) => {
  if (!refreshToken) {
    throw createError("Refresh token is required", 400);
  }

  const session = await Session.findOne({
    token: refreshToken,
    isActive: true,
  });

  if (!session) {
    throw createError("Active session not found", 404);
  }

  session.isActive = false;

  await session.save();

  return {
    success: true,
  };
};

module.exports = {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
};