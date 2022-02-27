import { Router } from "express";
import bcrypt from "bcrypt";
import { db } from "../app";
import User from "../classes/User";
import fsPromise from "fs/promises";
import multer from "multer";
import { isAuthenticated } from "./auth";
const upload = multer({
  limits: {
    fileSize: 100000000,
  },
  fileFilter(req, file, cb) {
    if (!file.originalname.match(/\.(png|jpg|jpeg|jfif)$/)) {
      cb(new Error("Please upload an image."));
    }
    cb(null, true);
  },
});
import axios from "axios";
import { deleteToTheList, addToTheList } from "../utils/lists";
const router = Router();

router.get("/", async (req, res) => {
    const users = await db.user.findMany({});
    return res.status(200).send(users);
});

router.post("/", upload.single("avatar"), async (req, res) => {
  const { name, username, password, email } = req.body;

  const regPass = new RegExp(/^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-._]).{8,15}$/);
  const regEmail = new RegExp(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/);

  if (!regPass.test(password)) return res.status(400).json({ error: "contraseña no valida" });
  if (!regEmail.test(email)) return res.status(400).json({ error: "email no valido" });

  const hashedPassword = await bcrypt.hash(password, 10);
  const avatar: Buffer = req.file ? req.file.buffer : await fsPromise.readFile("./assets/default.png");
  const user = new User(name, username, avatar, email, hashedPassword);

  try {
    const existingUser = await db.user.findFirst({
      where: {
        OR: [{ username: username }, { email: email }],
      },
    });

    if (!existingUser) {
      await db.user.create({
        data: user,
      });
  
      return res.status(201).json({ msg: "user created successfully" });
    }

    const error = [];
    if (existingUser.username === username) error.push('username already exist');
    if (existingUser.email === email) error.push('email already exist')
    return res.status(400).json({ error: error.join(", ") });
  } catch (error) {
    return res.status(400).json({ error: "there was an error creating the user" });
  }
});


router.get("/current", isAuthenticated, async (req: any, res, next) => {
  console.log('aca')
  const { id } = req.user;
  try {
    var user: any = await db.user.findUnique({
      where: { id: "4f641d8b-6f76-4077-adfd-5cffd7dee608" },
    });
  } catch (err: any) {
    console.log('alskdjfaldskj')
    return res.status(400).send({ error: err.message });
  }

  return res.status(200).send(user)
});

router.get("/:id", async (req, res, next) => {
  const { id } = req.params;
  try {
    const user: any = await db.user.findUnique({
      where: { id: id },
      include: {
        created: {
          select: {
            id: true,
            title: true,
            image: true,
            state: true,
            rating: true,
          },
        },
      },
    });

    if (!user) return res.status(404).json({ msg: "Invalid author ID" });

    let totalPoints: number = 0;

    user.created.map((manga: any) => {
      totalPoints += manga.rating;
    });

    let authorRating: number = Number(
      (totalPoints / user.created.length).toFixed(2)
    );

    return res.send({
      data: {
        id: user.id,
        name: user.name,
        username: user.username,
        avatar: user.avatar,
        about: user.about,
        created: user.created,
        authorRating,
      },
    });
  } catch (err: any) {
    res.status(400).send({ error: err.message });
  }
});


router.post("/super-admin", async (req, res) => {
  let image = await axios.get(
    "https://http2.mlstatic.com/D_NQ_NP_781075-MLA48271965969_112021-O.webp",
    { responseType: "arraybuffer" }
  );
  let buffer = Buffer.from(image.data, "utf-8");
  let hashedPassword = await bcrypt.hash("Manga1522022!", 10);
  const newUser = new User(
    "Super Mangaka",
    "SuperMGK",
    buffer,
    "supermangaka2022@gmail.com",
    hashedPassword,
    "SUPERADMIN"
  );

  try {
    let superAdmin = await db.user.findUnique({
      where: { username: newUser.username },
    });

    if (!superAdmin) {
      superAdmin = await db.user.create({
        data: newUser,
      });
    }
  } catch (err) {

  }
});

router.put(
  "/set-admin/:username",
  isAuthenticated,
  async (req: any, res, next) => {
    const { username } = req.params;
    const admin = req.user

    if (!(admin.role === "SUPERADMIN")) {
      return res.status(403).send({ message: "You don't have permission to do this, Are you trying to hack us?" });
    }
    
    try {
      const user = await db.user.findUnique({
        where: { username: username },
      });
      if (!user) return res.send({ message: "User not found" });

      const upsertUser = await db.user.update({
        where: {
          username: username,
        },
        data: {
          role: user.role === "USER" ? "ADMIN" : "USER",
        },
      });

      return res.status(200).send(upsertUser);
    } catch (error) {
      return res.sendStatus(404).json({ message: error });
    }
  }
);

router.put(
  "/set-active/:username",
  isAuthenticated,
  async (req: any, res, next) => {
    const { username } = req.params;
    const admin = req.user
    if (!(admin.role === "ADMIN" || admin.role === "SUPERADMIN")) {
      return res.status(403).send({ message: "You don't have permission to do this, Are you trying to hack us?" });
    }

    try {
      const user = await db.user.findUnique({
        where: { username: username },
        include: { created: true },
      });
      if (!user) return res.send({ message: "User not found" });

      user.created.forEach((manga) => {
        manga.active = true;
      });

      const upsertUser = await db.user.update({
        where: {
          username: username,
        },
        data: {
          active: user?.active === true ? false : true,
        },
      });
      return res.send(upsertUser);
    } catch (error) {
      return res.sendStatus(404).json({ message: error });
    }
  });

router.put("/lists", isAuthenticated, async (req: any, res) => {
  const id = req.user.id
  const { list } = req.query;
  const mangaId = Number(req.body.mangaId);

  if (list !== "library" && list !== "favorites" && list !== "wishList") return res.status(400).send({ msg: "Invalid list name" });
  try {
    if (req.user[list].includes(mangaId)) {
      let mangasList = await deleteToTheList(id, list, mangaId, req.user[list]);
      return (mangasList.length === 0) ?
        res.send({ msg: "Empty list" }) : res.send({ msg: "Delete manga to the list" })
    } else {
      let mangasList = await addToTheList(id, list, mangaId, req.user[list]);
      return (mangasList.length === 0) ?
        res.send({ msg: "Empty list" }) : res.send({ msg: "Add manga to the list" })
    }
  } catch (error: any) {
    return res.status(400).send({ error: error.message })
  }
});

router.get("/popular-authors", async (req, res) => {
  try {
    let authorsDB = await db.user.findMany({
      where: {
        creatorMode: true,
      },
      select: {
        id: true, name: true, avatar: true, created: {
          select: {
            rating: true,
          }
        }
      },
    });

    const authorsRating: any = authorsDB.map((author) => {
      return {
        id: author.id,
        avatar: author.avatar,
        name: author.name,
        rating: Number(((author.created.map(elto => elto.rating).reduce((acum, actu) => acum += actu)) / author.created.length).toFixed(2))
      }
    });

    authorsRating.sort((a: any, b: any) => {
      if (a.rating > b.rating) return -1;
      if (a.rating < b.rating) return 1;
    })

    res.send({ data: authorsRating.slice(0, 11) })
  } catch (error: any) {
    return res.status(400).send({ error: error.message })
  }
});

export default router;