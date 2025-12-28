import { Request, Response, NextFunction } from "express";
import { AnyZodObject, ZodError } from "zod";
import { asyncMiddleware } from "./asyncMiddleware";

export const validateSchema = (schema: AnyZodObject, source: 'body' | 'query' = 'body') =>
  asyncMiddleware(async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (source === 'query') {
        req.query = await schema.parseAsync(req.query);
      } else {
        req.body = await schema.parseAsync(req.body);
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          status: "fail",
          errors: error.errors,
        });
      }
      next(error);
    }
  });
