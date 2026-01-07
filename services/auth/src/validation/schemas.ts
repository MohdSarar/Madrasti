import Joi from "joi";

export const schemaCreateSchool = Joi.object({
  name_ar: Joi.string().min(2).max(255).required(),
  name_en: Joi.string().min(2).max(255).allow(null, ""),
  name_fr: Joi.string().min(2).max(255).allow(null, ""),
  slug: Joi.string().regex(/^[a-z0-9-]{3,100}$/).required(),
  school_type: Joi.string().max(50).allow(null, ""),
  contact_email: Joi.string().email().allow(null, ""),
  contact_phone: Joi.string().max(20).allow(null, ""),
  primary_language: Joi.string().valid("ar", "en", "fr").default("ar"),
  admin_email: Joi.string().email().required(),
  admin_password: Joi.string().min(8).max(128).required(),
  admin_first_name_ar: Joi.string().min(1).max(100).required(),
  admin_last_name_ar: Joi.string().min(1).max(100).required(),
});

export const schemaLogin = Joi.object({
  // NOTE: tests and local environments commonly use emails like `user@local`.
  // Joi's default email() requires at least 2 domain segments (e.g. example.com).
  // We relax it to accept `@local` while still validating basic email structure.
  email: Joi.string().email({ tlds: { allow: false }, minDomainSegments: 1 }).required(),
  password: Joi.string().min(8).max(128).required(),
  totp: Joi.string().length(6).optional(),
  school_slug: Joi.string().regex(/^[a-z0-9-]{3,100}$/).optional(),
});

export const schemaRefresh = Joi.object({
  // Let controller decide validity (and return a 401) instead of schema blocking.
  refresh_token: Joi.string().required(),
});

export const schema2faVerify = Joi.object({
  token: Joi.string().length(6).required(),
});

export const schemaPhoneRequestOtp = Joi.object({
  phone: Joi.string().min(6).max(20).required(),
});

export const schemaPhoneVerifyOtp = Joi.object({
  request_id: Joi.string().min(10).required(),
  phone: Joi.string().min(6).max(20).required(),
  code: Joi.string().length(6).required(),
});


export const changePasswordSchema = Joi.object({
  oldPassword: Joi.string().min(8).required(),
  newPassword: Joi.string().min(10).required(),
});

export const resetPasswordRequestSchema = Joi.object({
  email: Joi.string().email().required(),
});

export const resetPasswordConfirmSchema = Joi.object({
  token: Joi.string().min(32).required(),
  newPassword: Joi.string().min(10).required(),
});

export const securitySettingsSchema = Joi.object({
  // extension point
}).unknown(true);
