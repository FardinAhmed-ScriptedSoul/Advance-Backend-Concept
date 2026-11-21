import dotenv from "dotenv";

dotenv.config();

const { createApp } = await import("./src/app.js");
const port = process.env.PORT || 5000;
const app = createApp();

app.listen(port, () => {
  console.log(`server started at ${port}`);
});
