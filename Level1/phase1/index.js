import express from "express";
import dotenv from "dotenv";

dotenv.config();

const port = process.env.PORT || 3000;

const app = express();

app.get("/", (req, res) => {
  return res.status(200).json({
    message: "Hello World",
    success: true,
  });
});


app.listen(port, () => {
  console.log(`Added and extra line =>>>Server is running on port ${port}`);
});