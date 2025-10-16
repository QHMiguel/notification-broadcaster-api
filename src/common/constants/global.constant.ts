import Joi from "joi";

export enum DB_NAME {
	EXP_SERV_CWRV = "EXP_SERV_CWRV"
}

export const PaginationSchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .optional()
    .default(1),   // si no viene, vale 1

  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .optional()
    .default(10),  // si no viene, vale 10
});

export const ESTADO_AUDITORIA = {
  ACTIVO: true,
  INACTIVO: false,
} as const;