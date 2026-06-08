import { Router, type IRouter } from "express";
import healthRouter from "./health";
import projectsRouter from "./projects";
import proposalsRouter from "./proposals";
import votesRouter from "./votes";
import adminsRouter from "./admins";

const router: IRouter = Router();

router.use(healthRouter);
router.use(projectsRouter);
router.use(proposalsRouter);
router.use(votesRouter);
router.use(adminsRouter);

export default router;
