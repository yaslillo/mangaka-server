import 'dotenv/config';
import express, { NextFunction, Request, Response } from "express";
import morgan from "morgan";
import { PrismaClient } from "@prisma/client";
import { routes } from "./routes/index";
import cors from "cors";
import bearerToken from 'express-bearer-token';

const { PORT } = process.env;
export const db = new PrismaClient();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: ["https://mangaka-client.herokuapp.com", "http://localhost:3000"],
  credentials: true
}));

app.use(morgan("dev"));
app.use(bearerToken())
app.use("/api", routes);
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  // eslint-disable-line no-unused-vars
  const status = err.status || 500;
  const message = err.message || err;
  console.error(err);
  res.status(status).send({ message });
});

app.listen(PORT || 3000, () => {
  console.log(`server listening on port ${PORT || 3000}`);
});
