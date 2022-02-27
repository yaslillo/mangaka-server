import { Router } from "express";
import { db } from "../app";
import CoinsPackage from "../classes/CoinsPackage";
import extractionOrder from "../classes/ExtractionOrder";
import externalOrder from "../classes/ExternalOrder";
import { isAuthenticated } from "./auth";
const mercadopago = require("mercadopago");
const router = Router();
const {
  MERCADO_PAGO_ACCESS_TOKEN,
  SERVER_URL
} = process.env

mercadopago.configure({ access_token: MERCADO_PAGO_ACCESS_TOKEN });

router.post("/buy", async (req, res) => {
  const product = req.body;
  const preference = {
    items: [
      {
        title: product.title,
        unit_price: product.buyprice,
        quantity: 1,
      },
    ],
    installments: 1,
    back_urls: {
      success: `${SERVER_URL}/api/coins/pagos/${product.idaux}`,
      failure: `${SERVER_URL}/api/coins/buy`,
      pending: `${SERVER_URL}/api/coins/buy`,
    },
    auto_return: "approved",
    external_reference: product.id,
  };

  try {
    const response = await mercadopago.preferences.create(preference);
    return res.status(200).send(response.body.id);
    } catch (e) {
    return res.status(500).send('internal server error');
  }
});

router.get("/payments/:product", async (req: any, res) => {
  const payment_status = req.query.status;
  let { product } = req.params;
  let user2 = req.user;
  let adminId = await db.user.findUnique({ where: { username: "SuperAdmin" } });
  console.log(product);
  let packageCoins: any = await db.coinsPackage.findUnique({
    //@ts-ignore
    where: { id: Number(product) },
  });
  console.log(packageCoins.value);

  if (user2 && adminId) {
    if (payment_status !== "approved") {
      res.send("Hay un problema con la compra");
    } else {
      try {
        //@ts-ignore
        const Eorder = new externalOrder(
          adminId.id,
          //@ts-ignore
          user2.id,
          "approved",
          packageCoins.buyprice,
          packageCoins.value,
          payment_status,
          packageCoins.id
        );
        //@ts-ignore
        const newEOrder = await db.externalOrder.create({ data: Eorder });
        const updateBuyer = await db.user.update({
          //@ts-ignore
          where: { id: user2.id },
          data: {
            //@ts-ignore
            coins: user2.coins + packageCoins.value,
          },
        });
        //@ts-ignore

        res.redirect(`${SERVER_URL}`);
      } catch (error) {
        console.log(error);
        res.redirect(`${SERVER_URL}/error`);
      }
    }
  }
});

router.post("/sell", async (req: any, res) => {
  let { name, cbu, value } = req.body;
  let user2 = req.user;
  let nValue = Number(value);
  if (user2) {
    //@ts-ignore
    let adminId = await db.user.findUnique({
      where: { username: "SuperAdmin" },
    });
    //@ts-ignore
    let seller = await db.user.findUnique({ where: { id: user2.id } });
    let base = await db.coinsPackage.findUnique({ where: { id: 6 } });
    console.log(base);
    if (seller && base && adminId) {
      if (seller.coins - nValue < 0) {
        res.send("Estan intentado extraer mas monedas de las que tienes");
      } else {
        let price = base?.sellprice * nValue;
        let pack = new CoinsPackage(nValue, base.title, price, 0);
        let newcP = await db.coinsPackage.create({ data: pack });
        console.log(pack);
        const Eorder = new extractionOrder(
          adminId.id,
          seller.id,
          name,
          cbu,
          "Orden de extraccion",
          nValue,
          price,
          "approved",
          newcP.id
        );
        //@ts-ignore
        const newEOrder = await db.extractionOrder.create({ data: Eorder });
        const updateSeller = await db.user.update({
          where: { username: seller.username },
          data: { coins: seller.coins - nValue },
        });
        res.send("Peticion de extraccion recibida");
      }
    }
  }
});

router.get("/packages", async (req, res) => {
  try {
    const pack = await db.coinsPackage.findMany();
    const filteredPack = pack.filter((e) => e.buyprice > 9);
    return res.status(200).send(filteredPack);
  } catch (e) {
    return res.status(500).send('internal server error');
  }
});

router.post("/packages", async (req, res) => {
  const coinPackages = [
    new CoinsPackage(600, "500 Monedas + 100 Monedas de regalo", 0 ,5000),
    new CoinsPackage(300, "250 Monedas + 50 Monedas de regalo", 0, 2500),
    new CoinsPackage(130, "100 Monedas + 30 Monedas de regalo", 0, 1000),
    new CoinsPackage(60, "50 Monedas + 10 Monedas de regalo", 0, 500),
    new CoinsPackage(10, "10 Monedas", 0, 10),
    new CoinsPackage(1, "Orden de extraccion", 7, 0),
  ];

  const coinPackagesToCreate = coinPackages.map((cp) => db.coinsPackage.create({ data: cp }));

  try {
    await Promise.all(coinPackagesToCreate)
    return res.status(201).send("combos de monedas creados");
  } catch (e) {
    return res.status(500).send('internal server error');
  }
});

router.get("/buy-orders", isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user;
    const externalOrders = await db.externalOrder.findMany({ where: { userId: user.id } });
    return res.status(200).send(externalOrders);
  } catch (error) {
    return res.status(500).send('internal server error');
  }
});

router.get("/sell-orders", isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user;
    const extractionOrders = await db.extractionOrder.findMany({ where: { userId: user.id } });
    return res.status(200).send(extractionOrders);
  } catch (error) {
    return res.status(500).send('internal server error');
  }
});

export default router;