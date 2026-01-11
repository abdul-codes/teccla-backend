import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '../../prisma/generated/prisma/client';
import jwt from 'jsonwebtoken';
import Logger from '../utils/logger';

export const errorMiddleware = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    // Log the error for development/monitoring
    Logger.error(`${err.name || 'Error'}: ${err.message}`, {
        method: req.method,
        url: req.originalUrl,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });

    // Handle Zod Validation Errors
    if (err instanceof ZodError) {
        return res.status(400).json({
            status: 'fail',
            message: 'Validation failed',
            errors: err.errors.map((e) => ({
                path: e.path.join('.'),
                message: e.message,
            })),
        });
    }

    // Handle Prisma Database Errors
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        // Unique constraint violation (e.g., email already exists)
        if (err.code === 'P2002') {
            const field = (err.meta?.target as string[])?.join(', ') || 'field';
            return res.status(409).json({
                status: 'fail',
                message: `A record with this ${field} already exists.`,
            });
        }
        // Record not found
        if (err.code === 'P2025') {
            return res.status(404).json({
                status: 'fail',
                message: 'The requested record was not found.',
            });
        }
    }

    // Handle JWT Errors
    if (err instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({
            status: 'fail',
            message: 'Invalid or expired token. Please log in again.',
        });
    }

    // Handle explicit status errors (if any)
    const statusCode = err.status || err.statusCode || 500;
    const message = err.message || 'An unexpected error occurred';

    res.status(statusCode).json({
        status: statusCode >= 500 ? 'error' : 'fail',
        message: process.env.NODE_ENV === 'production' && statusCode === 500
            ? 'Internal server error'
            : message,
    });
};
