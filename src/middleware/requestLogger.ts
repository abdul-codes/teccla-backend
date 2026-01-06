import { Request, Response, NextFunction } from 'express';
import Logger from '../utils/logger';

/**
 * Middleware to log incoming HTTP requests and their performance
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    // Handle response finish
    res.on('finish', () => {
        const duration = Date.now() - start;
        const { method, originalUrl } = req;
        const { statusCode } = res;

        const message = `${method} ${originalUrl} ${statusCode} - ${duration}ms`;

        if (statusCode >= 500) {
            Logger.error(message);
        } else if (statusCode >= 400) {
            Logger.warn(message);
        } else {
            Logger.http(message);
        }
    });

    next();
};
