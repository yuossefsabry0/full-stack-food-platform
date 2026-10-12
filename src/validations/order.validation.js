'use strict';

const { z } = require('zod');

// Order validation: delivery address (all fields required),
// checkout payload, and orders pagination.

// Delivery Address — every field is required except otherDetails; the
// backend never confirms an order unless all required ones are complete.
// otherDetails is the optional "Other Details" note below the phone number.
const deliveryAddressSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120),
  address: z.string().trim().min(3, 'Address is required').max(255),
  buildingNumber: z.string().trim().min(1, 'Building number is required').max(40),
  apartmentNumber: z.string().trim().min(1, 'Apartment number is required').max(40),
  streetName: z.string().trim().min(2, 'Street name is required').max(150),
  phoneNumber: z
    .string()
    .trim()
    .min(6, 'Phone number is required')
    .max(40)
    .regex(/^[+\d][\d\s\-().+]*$/, 'Invalid phone number'),
  otherDetails: z.string().trim().max(500, 'Other details must be at most 500 characters').optional(),
}).strict();

// Confirming an order = submitting the delivery address. Same schema.
const checkoutSchema = deliveryAddressSchema;

const orderIdParamSchema = z.object({
  id: z.coerce.number().int('Order ID must be an integer').positive('Order ID must be positive'),
});

module.exports = { deliveryAddressSchema, checkoutSchema, orderIdParamSchema };
