import { Request, Response, NextFunction } from "express";
import { AnyZodObject, ZodError } from "zod";
import { asyncMiddleware } from "./asyncMiddleware";

export const validateSchema = (schema: AnyZodObject) =>
  asyncMiddleware(async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
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
