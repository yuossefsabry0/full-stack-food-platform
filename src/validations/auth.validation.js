'use strict';

const { z } = require('zod');

// Validation foundation: registration + login (Task 1),
// refresh token + forgot password / OTP / new password (Task 2).

// Shared new-password policy: length + at least one letter and one number.
// Login keeps a lenient shape so pre-existing weaker passwords can still
// attempt authentication (rejected with 401, not 400).
const newPasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)
  .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, 'Password must contain at least one letter and one number');

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120),
  username: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(60)
    .regex(/^[a-zA-Z0-9._-]+$/, 'Username may contain letters, numbers, dot, underscore, hyphen'),
  email: z.string().trim().toLowerCase().email('Invalid email address').max(190),
  password: newPasswordSchema,
  // NOTE: no `role` field. Public registration always creates BASIC.
}).strict();

const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username is required').max(60),
  password: z.string().min(1, 'Password is required').max(128),
}).strict();

// Refresh Token.
const refreshSchema = z.object({
  refreshToken: z.string().trim().min(1, 'Refresh token is required').max(2048),
}).strict();

// Forgot Password (email only; generic responses prevent enumeration).
const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address').max(190),
}).strict();

// OTP verification (6-digit code).
const verifyOtpSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address').max(190),
  otp: z.string().trim().regex(/^\d{6}$/, 'OTP must be a 6-digit code'),
}).strict();

// New Password (password + confirmation must match).
const resetPasswordSchema = z
  .object({
    email: z.string().trim().toLowerCase().email('Invalid email address').max(190),
    resetToken: z.string().trim().min(1, 'Reset token is required').max(512),
    password: newPasswordSchema,
    confirmPassword: z.string().min(1, 'Password confirmation is required').max(128),
  })
  .strict()
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

module.exports = {
  newPasswordSchema,
  registerSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  verifyOtpSchema,
  resetPasswordSchema,
};
