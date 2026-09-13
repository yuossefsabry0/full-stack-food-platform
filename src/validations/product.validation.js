'use strict';

const { z } = require('zod');

// Product / Menu / Search validation.
// Covers product data shapes, search parameters, and pagination parameters.

const paginationSchema = z.object({
  page: z.coerce.number().int('Page must be an integer').min(1, 'Page must be at least 1').default(1),
  limit: z.coerce
    .number()
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(50, 'Limit must be at most 50')
    .default(10),
});

// Menu listing + product search share one endpoint: `search` is optional.
// Partial, case-insensitive name match (even 2-3 letters must match).
const menuQuerySchema = paginationSchema.extend({
  search: z.string().trim().min(1, 'Search must not be empty').max(100).optional(),
});

const productIdParamSchema = z.object({
  id: z.coerce.number().int('Product ID must be an integer').positive('Product ID must be positive'),
});

module.exports = { paginationSchema, menuQuerySchema, productIdParamSchema };
