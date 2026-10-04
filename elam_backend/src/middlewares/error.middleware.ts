import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response.js';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Error:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Une erreur interne est survenue sur le serveur.';

  return sendError(res, message, statusCode, process.env.NODE_ENV === 'development' ? err.stack : undefined);
};
