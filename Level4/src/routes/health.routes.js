import { Router } from "express";

export const createHealthRouter = () => {
  const router = Router();

  router.get("/", (_req, res) => {
    return res.json({
      message: "hello from server",
      success: true,
    });
  });

  return router;
};

