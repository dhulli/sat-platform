import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

interface ReviewQuestion {
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
  const [currentModule, setCurrentModule] = useState<string>("");
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  useEffect(() => {
    const fetchReview = async () => {
      try {
        const token = localStorage.getItem("sat_token");
        const res = await fetch(`http://localhost:5000/api/review/reviews/${sessionId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
        setReview(data.data);
        if (data.data.questions.length > 0) {
          setCurrentModule(data.data.questions[0].module);
          setCurrentIndex(0);
        }
      } catch (err) {
        console.error("Failed to load review", err);
      } finally {
        setLoading(false);
      }
    };
    fetchReview();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen text-gray-600 text-lg">
        Loading review...
      </div>
    );
  }

  if (!review) {
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

  const questionsInModule = review.questions.filter(
    (q) => q.module === currentModule
  );
  const q = questionsInModule[currentIndex];

  const handleNext = () => {
    if (currentIndex < questionsInModule.length - 1)
      setCurrentIndex(currentIndex + 1);
  };

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const handleModuleChange = (module: string) => {
    setCurrentModule(module);
    const firstIdx = review.questions.findIndex((q) => q.module === module);
    setCurrentIndex(firstIdx !== -1 ? firstIdx : 0);
  };

  const modules = [
    "reading_writing_1",
    "reading_writing_2",
    "math_1",
    "math_2",
  ].filter((m) => review.questions.some((q) => q.module === m));

  const readableModule = (m: string) => {
    if (m.startsWith("reading_writing")) return "Reading & Writing";
    if (m.startsWith("math")) return "Math";
    return m;
  };

  const formatQuestionNumber = (index: number, module: string) => {
    if (module.includes("reading_writing")) return index + 1; // 1–27
    return index + 1; // 1–22
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex justify-between items-center p-6 border-b bg-white shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{review.exam_name}</h2>
          <p className="text-gray-600">
            {readableModule(currentModule)} — Question{" "}
            {formatQuestionNumber(currentIndex, currentModule)}
          </p>
        </div>
        <button
          onClick={() => navigate("/review-dashboard")}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
        >
          ← Back to Reviews
        </button>
      </div>

      {/* --- Module Navigation Tabs --- */}
      <div className="flex justify-center gap-3 py-3 bg-gray-100 border-b">
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
            {readableModule(m)} {m.includes("reading_writing") ? (m.endsWith("1") ? "1" : "2") : m.endsWith("1") ? "1" : "2"}
          </button>
        ))}
      </div>

      {/* --- Question Area --- */}
      {q && (
        <div
          className={`flex flex-col md:flex-row flex-1 overflow-hidden ${
            q.type === "passage_mcq" ? "md:flex-row" : ""
          }`}
        >
          {/* Left panel for passage */}
          {q.type === "passage_mcq" && (
            <div className="md:w-1/2 p-6 overflow-y-auto border-r bg-gray-50 text-gray-800 text-left leading-relaxed">
              <h3 className="text-lg font-semibold mb-3">Passage</h3>
              <p className="whitespace-pre-line">{q.passage_text}</p>
            </div>
          )}

          {/* Right panel for question */}
          <div className="flex-1 p-6 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 text-left">
              {q.question_text}
            </h3>

            {q.type === "numeric" ? (
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
            ) : (
              <ul className="space-y-3 text-left">
                {q.options?.map((opt, idx) => {
                  const isUserAnswer = q.user_answer === opt;
                  const isCorrectAnswer = q.correct_answer === opt;
                  return (
                    <li
                      key={idx}
                      className={`px-4 py-2 rounded-md border cursor-default ${
                        isUserAnswer && q.is_correct
                          ? "bg-green-100 border-green-400"
                          : isUserAnswer && !q.is_correct
                          ? "bg-red-100 border-red-400"
                          : isCorrectAnswer
                          ? "bg-green-50 border-green-300"
                          : "border-gray-200"
                      }`}
                    >
                      {opt}
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Correct Answer + Explanation */}
            <div className="mt-6 border-t pt-4 text-left">
              <p className="text-sm font-semibold text-gray-700 mb-1">
                ✅ Correct Answer: <span className="font-normal text-gray-800">{q.correct_answer}</span>
              </p>
              <p className="text-sm text-gray-700 whitespace-pre-line">
                💡 Explanation: {q.explanation || "No explanation provided."}
              </p>
            </div>

            {/* Navigation */}
            <div className="flex justify-between items-center mt-8">
              <button
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className={`px-4 py-2 rounded-md text-sm ${
                  currentIndex === 0
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                }`}
              >
                ← Previous
              </button>
              <button
                onClick={handleNext}
                disabled={currentIndex === questionsInModule.length - 1}
                className={`px-4 py-2 rounded-md text-sm ${
                  currentIndex === questionsInModule.length - 1
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewDetail;
