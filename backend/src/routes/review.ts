import { Router } from "express";
import { getAllReviews, getReviewById } from "../controllers/ReviewController";
import { authenticateToken } from "../middleware/auth";

const router = Router();
router.use(authenticateToken);

router.get("/reviews", getAllReviews);
router.get("/reviews/:sessionId", getReviewById);

export default router;
