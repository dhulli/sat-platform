import { Request, Response } from "express";
import { ResponseModel } from "../models/Exam";
import ReviewModel from "../models/ReviewModel";

export const getAllReviews = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }
    const reviews = await ReviewModel.getAllReviews(userId);
    res.json({ success: true, data: reviews });
  } catch (err) {
    console.error("Error fetching review list:", err);
    res.status(500).json({ success: false, message: "Failed to load reviews" });
  }
};

export const getReviewById = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }
    const sessionId = Number(req.params.sessionId);
    const session = await ReviewModel.getReviewById(userId, sessionId);
    if (!session) {
      return res
        .status(404)
        .json({ success: false, message: "Review not found" });
    }

    const questions = await ResponseModel.getReviewQuestionsBySession(sessionId);
    res.json({ success: true, data: { ...session, questions } });
  } catch (err) {
    console.error("Error fetching review:", err);
    res.status(500).json({ success: false, message: "Failed to load review" });
  }
};
