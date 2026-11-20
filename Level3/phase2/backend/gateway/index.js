const express = require("express");
const dotenv = require("dotenv");
const proxy = require("express-http-proxy");

dotenv.config();

const port = process.env.PORT || 8000;
const app = express();

app.get("/", (_request, response) => {
  response.status(200).json({
    message: `hello from backend(api gateway ${process.env.SERVER_NAME})`,
    sucess: true,
  });
});

app.use("/auth", proxy(process.env.AUTH_SERVICE_URL || "http://localhost:3001"));
app.use("/user", proxy(process.env.USER_SERVICE_URL || "http://localhost:3002"));
app.use("/product", proxy(process.env.PRODUCT_SERVICE_URL || "http://localhost:3003"));
app.use("/order", proxy(process.env.ORDER_SERVICE_URL || "http://localhost:3004"));

app.use(express.json());

app.listen(port, () => {
  console.log(`server started at ${port}`);
});
