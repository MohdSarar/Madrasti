import Joi from "joi";

export const createStudentSchema = Joi.object({
  student_code: Joi.string().max(50).required(),
  first_name_ar: Joi.string().max(100).required(),
  last_name_ar: Joi.string().max(100).required(),
  date_of_birth: Joi.date().iso().required(),
  gender: Joi.string().valid("male", "female").required(),
  enrollment_date: Joi.date().iso().required(),
});

export const listStudentsSchema = Joi.object({
  search: Joi.string().max(100).optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(200).optional(),
});
