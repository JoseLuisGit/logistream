import { Request, Response, NextFunction } from 'express';
import { NotAuthorizedError } from '../errors/not-authorized-error';

export const requireAuth = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if (!req.currentUser) {
        // We should ideally use a custom error class here, let's define NotAuthorizedError inline or separate
        // For now I'll use the one I just defined above, but better to put it in errors folder.
        // Actually, I'll separate it.
        throw new NotAuthorizedError();
    }

    next();
};
