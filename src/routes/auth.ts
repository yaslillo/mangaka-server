import { Router } from "express";
import { db } from "../app";

export const authRouter = Router();
export async function isAuthenticated(req: any , res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.sendStatus(401);
};

authRouter.post<{}, {}>("/token", (req, res, next) => {
  return res.status(200).send({})
});
