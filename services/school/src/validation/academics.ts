import Joi from "joi";

export const createGradeLevelSchema = Joi.object({
  academic_year_id: Joi.string().uuid().allow(null, ""),
  name_ar: Joi.string().min(1).max(100).required(),
  name_en: Joi.string().min(1).max(100).allow(null, ""),
  code: Joi.string().min(1).max(20).required(),
  level_order: Joi.number().integer().min(0).max(50).required(),
  section: Joi.string().max(50).allow(null, ""),
});

export const listGradeLevelsSchema = Joi.object({
  academic_year_id: Joi.string().uuid().allow(null, ""),
});

export const createClassSchema = Joi.object({
  academic_year_id: Joi.string().uuid().allow(null, ""),
  grade_level_id: Joi.string().uuid().allow(null, ""),
  name_ar: Joi.string().min(1).max(100).required(),
  name_en: Joi.string().min(1).max(100).allow(null, ""),
  code: Joi.string().min(1).max(20).required(),
  capacity: Joi.number().integer().min(1).max(200).default(30),
  homeroom_teacher_id: Joi.string().uuid().allow(null, ""),
});

export const listClassesSchema = Joi.object({
  academic_year_id: Joi.string().uuid().allow(null, ""),
  grade_level_id: Joi.string().uuid().allow(null, ""),
});
