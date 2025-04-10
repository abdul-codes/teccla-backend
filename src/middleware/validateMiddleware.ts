import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { asyncMiddleware } from './asyncMiddleware';

export const validateSchema =
    (schema: AnyZodObject) =>
        asyncMiddleware(async (req: Request, res: Response, next: NextFunction) => {
            try {
                // We validate all three parts of the request because:
                // 1. Body: Contains the main data payload for POST/PUT requests
                // 2. Query: Contains URL query parameters (e.g., ?page=1&limit=10)
                // 3. Params: Contains route parameters (e.g., /users/:id)
                // This ensures complete validation of all possible input sources
                await schema.parseAsync({
                    body: req.body,
                    query: req.query,
                    params: req.params,
                });
                next();
            } catch (error) {
                if (error instanceof ZodError) {
                    res.status(400).json({
                        status: 'fail',
                        errors: error.errors,
                    });
                }
                next(error)
            }
        });