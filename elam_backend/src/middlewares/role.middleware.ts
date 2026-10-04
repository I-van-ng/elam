import { Request, Response, NextFunction } from 'express';
import { Role } from '../types/enums.js';
import { sendError } from '../utils/response.js';

export const authorize = (...allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, 'Utilisateur non authentifié.', 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(
        res,
        `Accès interdit. Rôle requis: [${allowedRoles.join(', ')}]. Votre rôle: ${req.user.role}`,
        403
      );
    }

    next();
  };
};
