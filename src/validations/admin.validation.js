'use strict';

const { z } = require('zod');

// Admin Dashboard validation. No validation here can create ADMIN:
// staff roles are restricted to CHEF / DELIVERY by schema.

const STAFF_ROLES = ['CHEF', 'DELIVERY'];
const ORDER_STATUSES = ['PENDING', 'PREPARING', 'READY_FOR_DELIVERY', 'OUT_FOR_DELIVERY', 'DELIVERED'];

const adminPagination = z.object({
  page: z.coerce.number().int('Page must be an integer').min(1, 'Page must be at least 1').default(1),
  limit: z.coerce
    .number()
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit must be at most 100')
    .default(20),
});

// Users list: pagination + optional role filter.
const adminUsersQuerySchema = adminPagination.extend({
  role: z.enum(['BASIC', 'CHEF', 'DELIVERY', 'ADMIN']).optional(),
});

// Admin products list: all products (active + inactive), optional search / status.
const adminProductsQuerySchema = adminPagination.extend({
  search: z.string().trim().min(1).max(100).optional(),
  isActive: z
    .preprocess((v) => {
      if (v === undefined) return undefined;
      if (v === true || v === false) return v;
      const s = String(v).trim().toLowerCase();
      if (['true', '1', 'yes'].includes(s)) return true;
      if (['false', '0', 'no'].includes(s)) return false;
      return v;
    }, z.boolean().optional())
    .optional(),
});

// Image URLs must be http(s) when provided (stored and rendered by clients).
const imageUrlField = z
  .string()
  .trim()
  .min(1)
  .max(500)
  .nullable()
  .optional()
  .refine((v) => v == null || /^https?:\/\/.+/i.test(v), {
    message: 'Image URL must be a valid http(s) URL',
  });

// Add product: everything except the id; active by default.
const createProductSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(150),
  description: z.string().trim().max(5000).nullable().optional(),
  price: z.number('Price must be a number').positive('Price must be positive').max(1000000),
  imageUrl: imageUrlField,
  isActive: z.boolean().optional(),
}).strict();

// Edit product: name / price / description / image / image URL / activation.
// Partial — only provided fields change. Never deletes (no hard-delete route).
const updateProductSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(150).optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  price: z.number('Price must be a number').positive('Price must be positive').max(1000000).optional(),
  imageUrl: imageUrlField,
  isActive: z.boolean().optional(),
}).strict().refine((d) => Object.keys(d).length > 0, { message: 'At least one field is required' });

// Admin orders: filters for status / date / user / delivery / chef / order,
// plus pagination and sorting.
const adminOrdersQuerySchema = adminPagination.extend({
  status: z.enum(ORDER_STATUSES).optional(),
  orderId: z.coerce.number().int().positive().optional(),
  userId: z.coerce.number().int().positive().optional(),
  deliveryId: z.coerce.number().int().positive().optional(),
  chefId: z.coerce.number().int().positive().optional(),
  dateFrom: z.string().datetime({ offset: true }).optional(),
  dateTo: z.string().datetime({ offset: true }).optional(),
  sortBy: z.enum(['id', 'createdAt', 'total', 'status']).default('id'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Staff (CHEF / DELIVERY) creation form: name + email + username + password + role.
// ADMIN is not selectable — rejected by the role enum itself.
// Password follows the shared new-password policy (letter + number).
const createStaffSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120),
  username: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(60)
    .regex(/^[a-zA-Z0-9._-]+$/, 'Username may contain letters, numbers, dot, underscore, hyphen'),
  email: z.string().trim().toLowerCase().email('Invalid email address').max(190),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, 'Password must contain at least one letter and one number'),
  role: z.enum(STAFF_ROLES),
}).strict();

// Edit staff data + activate/deactivate (isActive — never delete).
const updateStaffSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120).optional(),
  username: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(60)
    .regex(/^[a-zA-Z0-9._-]+$/, 'Username may contain letters, numbers, dot, underscore, hyphen')
    .optional(),
  email: z.string().trim().toLowerCase().email('Invalid email address').max(190).optional(),
  isActive: z.boolean().optional(),
}).strict().refine((d) => Object.keys(d).length > 0, { message: 'At least one field is required' });

// Staff list: pagination + role filter (CHEF / DELIVERY / all).
const adminStaffQuerySchema = adminPagination.extend({
  role: z.enum(STAFF_ROLES).optional(),
});

const staffIdParamSchema = z.object({
  id: z.coerce.number().int('Staff ID must be an integer').positive('Staff ID must be positive'),
});

// Analytics query: optional date basis for the period buckets. Default is
// created (exactly today's behavior); anything else is a 400.
const analyticsQuerySchema = z.object({
  dateBasis: z.enum(['created', 'delivered']).default('created'),
});

const productIdParamSchema = z.object({
  id: z.coerce.number().int('Product ID must be an integer').positive('Product ID must be positive'),
});

module.exports = {
  adminUsersQuerySchema,
  adminProductsQuerySchema,
  createProductSchema,
  updateProductSchema,
  productIdParamSchema,
  adminOrdersQuerySchema,
  createStaffSchema,
  updateStaffSchema,
  adminStaffQuerySchema,
  staffIdParamSchema,
  analyticsQuerySchema,
};
