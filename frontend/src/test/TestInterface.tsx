import { Flag } from "lucide-react";
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useExam } from "../context/ExamContext";

interface Question {
  id: number;
  exam_id: number;
  module: string;
  difficulty: number;
  skill_category: string;
  question_text: string;
  options: string[];
  explanation?: string;
}

const TestInterface: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { user } = useAuth();
  const { getSessionStatus } = useExam();
  const navigate = useNavigate();

  const [currentQuestion, setCurrentQuestion] = useState<number>(1);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [userAnswers, setUserAnswers] = useState<{ [key: number]: string }>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());
  const [timeRemaining, setTimeRemaining] = useState<number>(64 * 60);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [testSession, setTestSession] = useState<any>(null);

  const [isReviewMode, setIsReviewMode] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  // ---------- Load test data ----------
  useEffect(() => {
    const loadTestData = async () => {
      if (!sessionId) return;
      try {
        setIsLoading(true);
        const session = await getSessionStatus(parseInt(sessionId));
        setTestSession(session);

        const mockQuestions: Question[] = [
          {
            id: 1,
            exam_id: 1,
            module: "reading_writing_1",
            difficulty: 3,
            skill_category: "Words in Context",
            question_text:
              'The author uses the word "ubiquitous" to suggest that the phenomenon is:',
            options: [
              "rare and unusual",
              "widespread and common",
              "complex and confusing",
              "temporary and fleeting",
            ],
          },
          {
            id: 2,
            exam_id: 1,
            module: "reading_writing_1",
            difficulty: 2,
            skill_category: "Command of Evidence",
            question_text:
              "Which choice provides the best evidence for the answer to the previous question?",
            options: ["Lines 5-8", "Lines 12-15", "Lines 20-23", "Lines 30-33"],
          },
          {
            id: 3,
            exam_id: 1,
            module: "math_1",
            difficulty: 2,
            skill_category: "Algebra",
            question_text: "If 3x + 5 = 20, what is the value of x?",
            options: ["3", "4", "5", "6"],
          },
          {
            id: 4,
            exam_id: 1,
            module: "math_1",
            difficulty: 4,
            skill_category: "Advanced Math",
            question_text: "What is the solution to the equation x² - 5x + 6 = 0?",
            options: ["x = 2, 3", "x = 1, 6", "x = -2, -3", "x = -1, -6"],
          },
        ];

        setQuestions(mockQuestions);
        setIsLoading(false);
      } catch (error) {
        console.error("Error loading test data:", error);
        alert("Failed to load test. Returning to dashboard.");
        navigate("/dashboard");
      }
    };

    loadTestData();
  }, [sessionId, getSessionStatus, navigate]);

  // ---------- Timer ----------
  useEffect(() => {
    if (timeRemaining <= 0) return;
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeRemaining]);

  // ---------- Fetch state for resume ----------
  useEffect(() => {
    const fetchState = async () => {
      if (!sessionId) return;
      try {
        const token = localStorage.getItem("sat_token");
        const res = await fetch(
          `http://localhost:5000/api/exams/sessions/${sessionId}/state`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        const json = await res.json();
        if (json.success) {
          const { session, responses } = json.data;
          if (session.status === "paused") {
            setTimeRemaining(session.time_remaining);
          }
          const ans: Record<number, string> = {};
          const flags = new Set<number>();
          responses.forEach((r: any) => {
            ans[r.question_id] = r.user_answer;
            if (r.is_flagged) flags.add(r.question_id);
          });
          setUserAnswers(ans);
          setFlaggedQuestions(flags);
        }
      } catch (err) {
        console.error("Failed to fetch session state:", err);
      }
    };
    fetchState();
  }, [sessionId]);

  // ---------- Save answer ----------
  const saveAnswer = async (
    questionId: number,
    userAnswer: string,
    isFlagged?: boolean
  ) => {
    if (!sessionId) return;
    const token = localStorage.getItem("sat_token");
    if (!token) return;

    try {
      await fetch(
        `http://localhost:5000/api/exams/sessions/${sessionId}/answers`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            question_id: questionId,
            user_answer: userAnswer,
            time_spent: 0,
            sequence_number: 0,
            is_flagged: isFlagged ?? flaggedQuestions.has(questionId),
          }),
        }
      );
    } catch (err) {
      console.error("Failed to save answer:", err);
    }
  };

  // ---------- Handlers ----------
  const handleAnswerSelect = (questionId: number, answer: string) => {
    setUserAnswers((prev) => ({ ...prev, [questionId]: answer }));
    saveAnswer(questionId, answer);
  };

  const handleFlagQuestion = (questionId: number) => {
    setFlaggedQuestions((prev) => {
      const newSet = new Set(prev);
      const willBeFlagged = !newSet.has(questionId);
      if (willBeFlagged) newSet.add(questionId);
      else newSet.delete(questionId);
      saveAnswer(questionId, userAnswers[questionId] || "", willBeFlagged);
      return newSet;
    });
  };

  const handleNavigation = (questionNumber: number) => {
    setCurrentQuestion(questionNumber);
  };

  const handleAutoSubmit = () => {
    alert("Time is up! Your answers have been automatically submitted.");
    navigate("/dashboard");
  };

  const handleReviewAnswers = () => setIsReviewMode(true);

  const handleExitTest = async () => {
    if (!sessionId) return;
    const confirmExit = window.confirm("Exit test? Progress will be saved.");
    if (!confirmExit) return;
    try {
      const token = localStorage.getItem("sat_token");
      await fetch(`http://localhost:5000/api/exams/sessions/${sessionId}/pause`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ time_remaining: timeRemaining }),
      });
    } catch (e) {
      console.error("Pause failed", e);
    } finally {
      navigate("/dashboard");
    }
  };

  const handleSubmitTest = async () => {
    try {
      const token = localStorage.getItem("sat_token");
      if (!token) throw new Error("Not authenticated");

      const submissions = Object.entries(userAnswers).map(
        ([questionId, userAnswer], index) => ({
          questionId: parseInt(questionId),
          userAnswer,
          sequenceNumber: index + 1,
          timeSpent: 0,
          isFlagged: flaggedQuestions.has(parseInt(questionId)),
        })
      );

      for (const answer of submissions) {
        await fetch(
          `http://localhost:5000/api/exams/sessions/${sessionId}/answers`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(answer),
          }
        );
      }

      await fetch(
        `http://localhost:5000/api/exams/sessions/${sessionId}/complete`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const correctAnswers: { [key: number]: string } = {
        1: "B",
        2: "B",
        3: "C",
        4: "A",
      };

      let correctCount = 0;
      Object.keys(correctAnswers).forEach((qid) => {
        const qNum = parseInt(qid);
        if (userAnswers[qNum] === correctAnswers[qNum]) correctCount++;
      });

      setScore(correctCount);
      setIsSubmitted(true);
      setIsReviewMode(false);
    } catch (error) {
      console.error("Submit test error:", error);
      alert("Failed to submit test. Please try again.");
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  // ---------- Styles ----------
  const questionNumberStyle = (questionId: number): React.CSSProperties => ({
    padding: "0.5rem",
    border: "1px solid #e0e0e0",
    borderRadius: "4px",
    textAlign: "center",
    cursor: "pointer",
    backgroundColor:
      currentQuestion === questionId
        ? "#2563eb"
        : userAnswers[questionId]
        ? "#10b981"
        : "transparent",
    color: currentQuestion === questionId ? "white" : "inherit",
    fontWeight: currentQuestion === questionId ? "bold" : "normal",
    position: "relative",
  });

  const optionStyle = (questionId: number, optionIndex: number): React.CSSProperties => {
    const optionLetter = String.fromCharCode(65 + optionIndex);
    const isSelected = userAnswers[questionId] === optionLetter;
    return {
      padding: "1rem",
      border: `2px solid ${isSelected ? "#2563eb" : "#e0e0e0"}`,
      borderRadius: "8px",
      marginBottom: "0.5rem",
      cursor: "pointer",
      backgroundColor: isSelected ? "#dbeafe" : "white",
      transition: "all 0.2s",
    };
  };

  if (isLoading)
    return (
      <div style={{ height: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <div>Loading test...</div>
      </div>
    );

  const currentQuestionData = questions.find((q) => q.id === currentQuestion);

  // ---------- Review mode ----------
  if (isReviewMode) {
    return (
      <div style={{ padding: "2rem" }}>
        <h2>Review Your Answers</h2>
        {questions.map((q, idx) => (
          <div key={q.id} style={{ marginBottom: "1.5rem" }}>
            <h3>Question {idx + 1}</h3>
            <p>{q.question_text}</p>
            {q.options.map((opt, i) => {
              const letter = String.fromCharCode(65 + i);
              const selected = userAnswers[q.id] === letter;
              return (
                <div
                  key={i}
                  style={{
                    padding: "0.5rem",
                    backgroundColor: selected ? "#dbeafe" : "#f9fafb",
                    borderRadius: "6px",
                    marginBottom: "0.25rem",
                  }}
                >
                  {letter}. {opt}
                </div>
              );
            })}
          </div>
        ))}
        <button
          style={{
            backgroundColor: "#2563eb",
            color: "white",
            padding: "0.75rem 1.5rem",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
          onClick={handleSubmitTest}
        >
          Submit Test
        </button>
      </div>
    );
  }

  // ---------- Submitted mode ----------
  if (isSubmitted) {
    return (
      <div style={{ textAlign: "center", padding: "3rem" }}>
        <h2>Test Results</h2>
        <h3>
          Your Score: {score} / {questions.length}
        </h3>
        <button
          style={{
            backgroundColor: "#2563eb",
            color: "white",
            padding: "0.75rem 1.5rem",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
          onClick={() => navigate("/dashboard")}
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  // ---------- Main test interface ----------
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <header
        style={{
          backgroundColor: "white",
          borderBottom: "1px solid #e0e0e0",
          padding: "1rem 2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>SAT Practice Test</h2>
          <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
            Questions: 1-{questions.length}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
              Time Remaining
            </div>
            <div
              style={{
                fontSize: "1.5rem",
                fontWeight: "bold",
                color: timeRemaining < 300 ? "#dc2626" : "#1f2937",
              }}
            >
              {formatTime(timeRemaining)}
            </div>
          </div>
          <button
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#dc2626",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
            onClick={() => handleExitTest()}
          >
            Exit Test
          </button>
        </div>
      </header>

      {/* Main layout */}
      <div style={{ display: "flex", flex: 1 }}>
        {/* Left panel */}
        <div
          style={{
            width: "250px",
            backgroundColor: "white",
            borderRight: "1px solid #e0e0e0",
            padding: "1rem",
            overflowY: "auto",
          }}
        >
          <h3 style={{ marginBottom: "1rem" }}>Questions</h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: "0.5rem",
              marginBottom: "1rem",
            }}
          >
            {questions.map((question, index) => (
              <div
                key={question.id}
                style={questionNumberStyle(question.id)}
                onClick={() => handleNavigation(question.id)}
                title={`Question ${index + 1}`}
              >
                {index + 1}
                {flaggedQuestions.has(question.id) && (
                  <div
                    style={{
                      position: "absolute",
                      top: "-3px",
                      right: "-3px",
                      zIndex: 5,
                      backgroundColor: "white",
                      borderRadius: "50%",
                      padding: "2px",
                    }}
                  >
                    <Flag size={12} color="#f59e0b" strokeWidth={2} />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <div
                style={{
                  width: "12px",
                  height: "12px",
                  backgroundColor: "#2563eb",
                  marginRight: "0.5rem",
                }}
              ></div>
              Current
            </div>
            <div style={{ display: "flex", alignItems: "center" }}>
              <div
                style={{
                  width: "12px",
                  height: "12px",
                  backgroundColor: "#10b981",
                  marginRight: "0.5rem",
                }}
              ></div>
              Answered
            </div>
            <div style={{ display: "flex", alignItems: "center" }}>
              <Flag size={12} color="#f59e0b" style={{ marginRight: "0.5rem" }} />
              Flagged
            </div>
          </div>
        </div>

        {/* Question content */}
        <div style={{ flex: 1, padding: "2rem" }}>
          {currentQuestionData && (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "2rem",
                }}
              >
                <h2>
                  Question {questions.findIndex((q) => q.id === currentQuestion) + 1} of{" "}
                  {questions.length}
                </h2>
                <button
                  style={{
                    padding: "0.5rem 1rem",
                    border: `2px solid ${
                      flaggedQuestions.has(currentQuestionData.id)
                        ? "#f59e0b"
                        : "#e0e0e0"
                    }`,
                    backgroundColor: flaggedQuestions.has(currentQuestionData.id)
                      ? "#fef3c7"
                      : "white",
                    borderRadius: "4px",
                    cursor: "pointer",
                    color: "#92400e",
                    fontWeight: "bold",
                  }}
                  onClick={() => handleFlagQuestion(currentQuestionData.id)}
                >
                  {flaggedQuestions.has(currentQuestionData.id)
                    ? "★ Flagged"
                    : "☆ Flag"}
                </button>
              </div>

              <div style={{ marginBottom: "2rem" }}>
                <div
                  style={{
                    backgroundColor: "#f3f4f6",
                    padding: "0.5rem 1rem",
                    borderRadius: "4px",
                    display: "inline-block",
                    marginBottom: "1rem",
                  }}
                >
                  {currentQuestionData.skill_category}
                </div>

                <div style={{ fontSize: "1.125rem", marginBottom: "2rem" }}>
                  {currentQuestionData.question_text}
                </div>

                <div>
                  {currentQuestionData.options.map((option, index) => {
                    const optionLetter = String.fromCharCode(65 + index);
                    return (
                      <div
                        key={index}
                        style={optionStyle(currentQuestionData.id, index)}
                        onClick={() =>
                          handleAnswerSelect(currentQuestionData.id, optionLetter)
                        }
                      >
                        <div style={{ display: "flex", alignItems: "flex-start" }}>
                          <div
                            style={{
                              width: "24px",
                              height: "24px",
                              border: `2px solid ${
                                userAnswers[currentQuestionData.id] === optionLetter
                                  ? "#2563eb"
                                  : "#9ca3af"
                              }`,
                              borderRadius: "4px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              marginRight: "1rem",
                              flexShrink: 0,
                              backgroundColor:
                                userAnswers[currentQuestionData.id] === optionLetter
                                  ? "#2563eb"
                                  : "white",
                              color:
                                userAnswers[currentQuestionData.id] === optionLetter
                                  ? "white"
                                  : "#9ca3af",
                              fontWeight: "bold",
                              fontSize: "0.875rem",
                            }}
                          >
                            {optionLetter}
                          </div>
                          <div style={{ lineHeight: "1.5", color: "#374151" }}>
                            {option}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Navigation buttons */}
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <button
                  style={{
                    padding: "0.75rem 1.5rem",
                    border: "1px solid #d1d5db",
                    backgroundColor: "white",
                    borderRadius: "4px",
                    cursor: currentQuestion > 1 ? "pointer" : "not-allowed",
                    color: currentQuestion > 1 ? "#374151" : "#9ca3af",
                  }}
                  onClick={() =>
                    currentQuestion > 1 && handleNavigation(currentQuestion - 1)
                  }
                  disabled={currentQuestion <= 1}
                >
                  ← Previous
                </button>

                <button
                  style={{
                    padding: "0.75rem 1.5rem",
                    backgroundColor: "#2563eb",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontWeight: "bold",
                  }}
                  onClick={() => {
                    if (currentQuestion < questions.length)
                      handleNavigation(currentQuestion + 1);
                    else handleReviewAnswers();
                  }}
                >
                  {currentQuestion < questions.length ? "Next →" : "Review Answers"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestInterface;
