import { Router, type IRouter } from "express";
import healthRouter from "./health";
import urlsRouter from "./urls";
import redirectRouter from "./redirect";

const router: IRouter = Router();

router.use(healthRouter);
router.use(urlsRouter);
router.use(redirectRouter);

export default router;
