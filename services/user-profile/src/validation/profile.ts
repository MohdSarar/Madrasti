import Joi from "joi";

export const upsertProfileSchema = Joi.object({
  first_name_ar: Joi.string().max(100).optional(),
  last_name_ar: Joi.string().max(100).optional(),
  date_of_birth: Joi.date().iso().optional(),
  gender: Joi.string().valid("male", "female").optional(),
  photo_url: Joi.string().uri().optional(),
  address: Joi.object().unknown(true).optional(),
  bio: Joi.string().max(2000).optional(),
});
