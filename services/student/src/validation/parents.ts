import Joi from "joi";

export const createParentSchema = Joi.object({
  first_name_ar: Joi.string().min(1).max(100).required(),
  last_name_ar: Joi.string().min(1).max(100).required(),
  first_name_en: Joi.string().min(1).max(100).allow(null, ""),
  last_name_en: Joi.string().min(1).max(100).allow(null, ""),
  email: Joi.string().email().allow(null, ""),
  phone: Joi.string().min(6).max(30).allow(null, ""),
  relationship_type: Joi.string().max(50).allow(null, ""),
  occupation: Joi.string().max(100).allow(null, ""),
  employer: Joi.string().max(100).allow(null, ""),
  work_phone: Joi.string().max(30).allow(null, ""),
  is_primary_contact: Joi.boolean().default(false),
  can_pickup_student: Joi.boolean().default(true),
  receives_notifications: Joi.boolean().default(true),
}).custom((value, helpers) => {
  const email = (value.email ?? "").trim();
  const phone = (value.phone ?? "").trim();
  if (!email && !phone) {
    return helpers.error("any.custom", { message: "email or phone is required" });
  }
  return value;
}, "email/phone requirement");

export const listParentsSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
});

export const linkParentSchema = Joi.object({
  parent_id: Joi.string().uuid().required(),
  relationship_type: Joi.string().max(50).allow(null, ""),
  is_primary: Joi.boolean().default(false),
});
