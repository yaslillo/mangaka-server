import { Router } from "express";
import jwt from 'jsonwebtoken';

export const authRouter = Router();

export const isAuthenticated = (req: any , res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, 'secret' as string, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  })
};

authRouter.post<{}, {}>("/token", (req, res, next) => {
  const { email, password } = req.body;

  const token = jwt.sign({email}, 'secret', {expiresIn: '1d'});
  return res.status(200).send({ token: token });
});
