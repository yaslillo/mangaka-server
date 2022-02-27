import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { Router } from "express";
import { db } from "../app";

const { JWT_TOKEN_SECRET } = process.env;
const router = Router();

export async function isAuthenticated(req: any , res: any, next: any) {
  const token = req.token;

  if (!token) return res.sendStatus(401)

  jwt.verify(token, JWT_TOKEN_SECRET as string, async (err: any, decoded: any) => {
    const user = await db.user.findUnique({where: { id: decoded.id }});
    if (err) return res.sendStatus(403);
    req.user = user
    next();
  })
};

router.post("/token", async (req, res, next) => {
  const { email, password } = req.body;

  if (!email) return res.status(400).send({error: 'missing body.email'});
  if (!password) return res.status(400).send({error: 'missing body.password'});

  const user = await db.user.findUnique({where: { email }});

  if (!user) {
    return res.status(404).send();
  }

  const isCorrectPassword = await bcrypt.compare(password, user.password || '');

  if (!isCorrectPassword) {
    return res.status(401).send();
  }

  const token = jwt.sign({id: user.id}, `${JWT_TOKEN_SECRET}`, { expiresIn: '1800s' });
  return res.status(200).send({token})
});

export default router;