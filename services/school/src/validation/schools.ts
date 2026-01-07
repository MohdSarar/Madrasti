import Joi from "joi";

export const provisionSchoolSchema = Joi.object({
  slug: Joi.string().min(3).max(100).required(),
  name_ar: Joi.string().max(255).required(),
  name_en: Joi.string().max(255).optional(),
  school_type: Joi.string().max(50).required(),
  subscription_plan: Joi.string().max(50).optional(),
  admin_user: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).max(200).required(),
    first_name_ar: Joi.string().max(100).optional(),
    last_name_ar: Joi.string().max(100).optional(),
  }).required(),
});
