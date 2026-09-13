'use strict';

const express = require('express');
const authController = require('../controllers/auth.controller');
const passwordResetController = require('../controllers/passwordReset.controller');
const validate = require('../middlewares/validate.middleware');
const { rateLimit, emailKey, ipKey } = require('../middlewares/rateLimit.middleware');
const env = require('../config/env');
const {
  registerSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  verifyOtpSchema,
  resetPasswordSchema,
} = require('../validations/auth.validation');

const router = express.Router();

// rate limits for the sensitive public auth endpoints (proxy-aware:
// keys derive from req.ip, which honors the TRUST_PROXY setting).
const loginLimiter = rateLimit({
  windowMs: env.rateLoginWindowMs,
  max: env.rateLoginMax,
  keyGenerator: ipKey('login'),
  message: 'Too many login attempts. Try again later.',
  code: 'RATE_LIMITED',
});
const registerLimiter = rateLimit({
  windowMs: env.rateRegisterWindowMs,
  max: env.rateRegisterMax,
  keyGenerator: ipKey('register'),
  message: 'Too many accounts created from this address. Try again later.',
  code: 'RATE_LIMITED',
});

// rate limits (in-memory, per instance). DB-backed guards
// (OTP attempts, per-hour OTP cap) live in passwordReset.service.js.
const refreshLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: ipKey('refresh'),
  message: 'Too many refresh attempts. Try again shortly.',
  code: 'RATE_LIMITED',
});
const forgotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: emailKey('forgot'),
  message: 'Too many code requests. Try again later.',
  code: 'RATE_LIMITED',
});
const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyGenerator: emailKey('verify'),
  message: 'Too many verification attempts. Try again later.',
  code: 'RATE_LIMITED',
});
const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyGenerator: emailKey('reset'),
  message: 'Too many requests. Try again later.',
  code: 'RATE_LIMITED',
});

// Create Account route (public registration — always BASIC).
router.post('/register', registerLimiter, validate(registerSchema), authController.register);

// Login route (username + password -> Access Token + Home payload).
router.post('/login', loginLimiter, validate(loginSchema), authController.login);

// all public (no Access Token required):
// Refresh Token (valid non-revoked refresh -> new token pair).
router.post('/refresh', refreshLimiter, validate(refreshSchema), authController.refresh);

// Forgot Password (email -> 6-digit OTP; always a generic response).
router.post(
  '/forgot-password',
  forgotLimiter,
  validate(forgotPasswordSchema),
  passwordResetController.forgotPassword
);

// OTP Verification (correct -> New Password route; incorrect -> stay).
router.post(
  '/verify-otp',
  verifyLimiter,
  validate(verifyOtpSchema),
  passwordResetController.verifyOtpCode
);

// New Password (password + confirmPassword -> hashed + stored -> Login).
router.post(
  '/reset-password',
  resetLimiter,
  validate(resetPasswordSchema),
  passwordResetController.resetPassword
);

module.exports = router;
