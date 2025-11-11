import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

interface ReviewQuestion {
  id: number;
  question_id: number;
  module: string;
  type: "mcq" | "passage_mcq" | "numeric";
  passage_text?: string | null;
  question_text: string;
  options?: string[];
  user_answer?: string;
  correct_answer: string;
  explanation?: string;
  is_correct: boolean;
  time_spent?: number;
}

interface ReviewData {
  test_session_id: number;
  exam_name: string;
  total_score: number;
  completed_at: string;
  questions: ReviewQuestion[];
}

const ReviewDetail: React.FC = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [review, setReview] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(true);

  // The active module and the index WITHIN that module
  const [currentModule, setCurrentModule] = useState<string>("");
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  useEffect(() => {
    const fetchReview = async () => {
      try {
        const token = localStorage.getItem("sat_token");
        const res = await fetch(
          `http://localhost:5000/api/review/reviews/${sessionId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
        const payload: ReviewData = data.data;

        setReview(payload);

        // default to first module present
        const firstModule = payload.questions[0]?.module ?? "";
        setCurrentModule(firstModule);
        setCurrentIndex(0);
      } catch (err) {
        console.error("Failed to load review", err);
      } finally {
        setLoading(false);
      }
    };
    fetchReview();
  }, [sessionId]);

  // modules available in this review, in canonical order
  const modules = useMemo(() => {
    if (!review) return [];
    const order = [
      "reading_writing_1",
      "reading_writing_2",
      "math_1",
      "math_2",
    ];
    const present = Array.from(new Set(review.questions.map((q) => q.module)));
    // keep desired order while including only present modules
    return order.filter((m) => present.includes(m));
  }, [review]);

  // questions for current module (derived)
  const moduleQuestions = useMemo(() => {
    if (!review || !currentModule) return [];
    return review.questions.filter((q) => q.module === currentModule);
  }, [review, currentModule]);

  // the active question (derived from module + index)
  const q = moduleQuestions[currentIndex];

  const readableModule = (m: string) => {
    switch (m) {
      case "reading_writing_1":
        return "Reading & Writing 1";
      case "reading_writing_2":
        return "Reading & Writing 2";
      case "math_1":
        return "Math 1";
      case "math_2":
        return "Math 2";
      default:
        return m;
    }
  };

  const handleModuleChange = (module: string) => {
    if (module === currentModule) return;
    setCurrentModule(module);
    setCurrentIndex(0); // always start at first question of that module
  };

  const handleNext = () => {
    if (currentIndex < moduleQuestions.length - 1) {
      setCurrentIndex((i) => i + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen text-gray-600 text-lg">
        Loading review...
      </div>
    );
  }

  if (!review || !q) {
    return (
      <div className="flex flex-col justify-center items-center h-screen text-center">
        <p className="text-lg text-gray-700 mb-4">Review data not found.</p>
        <button
          onClick={() => navigate("/review")}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Back to Review Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center p-6 border-b bg-white shadow-sm flex-none">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            {review.exam_name}
          </h2>
          <p className="text-gray-600">
            {readableModule(currentModule)} — Question {currentIndex + 1} of{" "}
            {moduleQuestions.length}
          </p>
        </div>
        <button
          onClick={() => navigate("/review")}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
        >
          ← Back to Reviews
        </button>
      </div>

      {/* Module tabs */}
      <div className="flex justify-center gap-3 py-3 bg-gray-100 border-b flex-none">
        {modules.map((m) => (
          <button
            key={m}
            onClick={() => handleModuleChange(m)}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              currentModule === m
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 border"
            }`}
          >
            {readableModule(m)}
          </button>
        ))}
      </div>

      {/* Question area */}
      <div
        className={`flex flex-1 overflow-hidden ${
          q.type === "passage_mcq" ? "flex-col md:flex-row" : "flex-col"
        }`}
      >
        {/* Passage (left) */}
        {q.type === "passage_mcq" && (
          <div className="md:w-1/2 p-6 overflow-y-auto border-r bg-gray-50 text-gray-800 text-left leading-relaxed">
            <h3 className="text-lg font-semibold mb-3">Passage</h3>
            <p className="whitespace-pre-line">{q.passage_text}</p>
          </div>
        )}

        {/* Question + answers (right) */}
        <div className="flex-1 p-6 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 text-left">
              {q.question_text}
            </h3>

            {["mcq", "passage_mcq"].includes(q.type) ? (
              <ul className="space-y-3 text-left">
                {q.options?.map((opt, idx) => {
                  const letter = String.fromCharCode(65 + idx); // A, B, C, ...
                  const norm = (s?: string | null) =>
                    (s ?? "").trim().toUpperCase();
                  const optNorm = opt.trim().toUpperCase();

                  const matches = (ans?: string | null) =>
                    norm(ans) === optNorm || norm(ans) === letter;

                  const isUserAnswer = matches(q.user_answer);
                  const isCorrectAnswer = matches(q.correct_answer);

                  const base =
                    isUserAnswer && isCorrectAnswer
                      ? "bg-green-100 border-green-400"
                      : isUserAnswer && !isCorrectAnswer
                      ? "bg-red-100 border-red-400"
                      : isCorrectAnswer
                      ? "bg-green-50 border-green-300"
                      : "border-gray-200";

                  return (
                    <li
                      key={idx}
                      className={`px-4 py-2 rounded-md border cursor-default ${base}`}
                    >
                      <span className="font-semibold mr-2">{letter}.</span>{" "}
                      {opt}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="text-left">
                <p
                  className={`inline-block px-4 py-2 border rounded-md ${
                    q.is_correct
                      ? "bg-green-100 text-green-800 border-green-300"
                      : "bg-red-100 text-red-800 border-red-300"
                  }`}
                >
                  Your answer: {q.user_answer || "—"}
                </p>
              </div>
            )}

            {/* Correct answer + explanation */}
            <div className="mt-6 border-t pt-4 text-left overflow-y-auto max-h-32">
              <p className="text-sm font-semibold text-gray-700 mb-1">
                ✅ Correct Answer:{" "}
                <span className="font-normal text-gray-800">
                  {q.correct_answer}
                </span>
              </p>
              <p className="text-sm text-gray-700 whitespace-pre-line">
                💡 Explanation: {q.explanation || "No explanation provided."}
              </p>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center mt-4 pt-3 border-t flex-none">
            <button
              onClick={handlePrev}
              disabled={currentIndex <= 0}
              className={`px-4 py-2 rounded-md text-sm ${
                currentIndex <= 0
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-700"
              }`}
            >
              ← Previous
            </button>
            <button
              onClick={handleNext}
              disabled={currentIndex >= moduleQuestions.length - 1}
              className={`px-4 py-2 rounded-md text-sm ${
                currentIndex >= moduleQuestions.length - 1
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewDetail;
