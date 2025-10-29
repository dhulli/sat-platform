import { Flag } from "lucide-react";
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
// using your existing auth + exam context only for tokenless bits
// you don’t need useExam here; we hit the backend directly

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

interface ServerSession {
  id: number;
  user_id: number;
  exam_id: number;
  status: "in_progress" | "completed" | "paused";
  time_remaining: number;
  module1_score?: number | null;
  module2_difficulty?: "easy" | "medium" | "hard" | null;
  current_module?: string | null; // if you added this column, fine; if not, we compute on backend
}

interface GetSessionStatusResponse {
  success: boolean;
  data: {
    session: ServerSession;
    responses: Array<{
      test_session_id: number;
      question_id: number;
      user_answer?: string | null;
      is_flagged: boolean;
    }>;
    currentModule: "reading_writing_1" | "reading_writing_2" | "math_1" | "math_2";
  };
}

const TestInterface: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  // near top of TestInterface component
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());

  // header info
  const [examName] = useState("SAT Practice Test");

  // module + questions
  const [currentModule, setCurrentModule] = useState<
    "reading_writing_1" | "reading_writing_2" | "math_1" | "math_2"
  >("reading_writing_1");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<number>(1);
  // track start time per question
  useEffect(() => {
    setQuestionStartTime(Date.now());
  }, [currentQuestion]);

  // answers/flags
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());

  // timer + session
  const [timeRemaining, setTimeRemaining] = useState<number>(64 * 60);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [session, setSession] = useState<ServerSession | null>(null);

  // UI
  const [pickerOpen, setPickerOpen] = useState(false);
  const [moduleInfoOpen, setModuleInfoOpen] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);

  // ---------------- Load session + decide module + load questions ----------------
  useEffect(() => {
    const load = async () => {
      if (!sessionId) return;
      try {
        setIsLoading(true);
        const token = localStorage.getItem("sat_token");

        // get session status (includes currentModule computed on backend)
        const res = await fetch(`http://localhost:5000/api/exams/sessions/${sessionId}`, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
        const json: GetSessionStatusResponse = await res.json();
        if (!json.success) throw new Error("Failed to fetch session status");

        const { session: s, responses, currentModule } = json.data;
        setSession(s);

        // resume timer from paused state
        if (s.status === "paused" && typeof s.time_remaining === "number") {
          setTimeRemaining(s.time_remaining);
        } else {
          // default per first module
          setTimeRemaining(
            currentModule.startsWith("reading_writing") ? 32 * 60 : 35 * 60
          );
        }

        // set module
        setCurrentModule(currentModule);

        // restore answers and flags from prior responses
        const restoredAnswers: Record<number, string> = {};
        const restoredFlags = new Set<number>();
        for (const r of responses || []) {
          if (r.user_answer) restoredAnswers[r.question_id] = r.user_answer;
          if (r.is_flagged) restoredFlags.add(r.question_id);
        }
        setUserAnswers(restoredAnswers);
        setFlaggedQuestions(restoredFlags);

        // fetch questions for this module
        const qRes = await fetch(
          `http://localhost:5000/api/exams/sessions/${sessionId}/modules/${currentModule}/questions`,
          { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
        );
        const qJson = await qRes.json();
        if (!qJson.success) throw new Error("Failed to fetch questions");
        setQuestions(qJson.data.questions || []);
        if (qJson.data.questions?.length) {
          setCurrentQuestion(qJson.data.questions[0].id);
        }
      } catch (e) {
        console.error("load error", e);
        alert("Failed to load test. Returning to dashboard.");
        navigate("/dashboard");
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [sessionId, navigate]);

  // ---------------- Timer ----------------
  useEffect(() => {
    if (timeRemaining <= 0) return;
    const t = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(t);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [timeRemaining]);
 

  // ---------------- Helpers ----------------
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const saveAnswer = async (questionId: number, userAnswer: string, isFlagged?: boolean,timeSpent?: number) => {
    if (!sessionId) return;
    const token = localStorage.getItem("sat_token");
    try {
      await fetch(
        `http://localhost:5000/api/exams/sessions/${sessionId}/answers`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            question_id: questionId,
            user_answer: userAnswer,
            time_spent: timeSpent ?? 0,
            sequence_number: 0,
            is_flagged: isFlagged ?? flaggedQuestions.has(questionId),
          })
        }
      );
    } catch (err) {
      console.error("Failed to save answer:", err);
    }
  };

  const handleAnswerSelect = (questionId: number, answer: string) => {
    setUserAnswers(prev => ({ ...prev, [questionId]: answer }));
    saveAnswer(questionId, answer);
  };

  const handleFlagQuestion = (questionId: number) => {
    setFlaggedQuestions(prev => {
      const ns = new Set(prev);
      const willFlag = !ns.has(questionId);
      if (willFlag) ns.add(questionId);
      else ns.delete(questionId);
      saveAnswer(questionId, userAnswers[questionId] || "", willFlag);
      return ns;
    });
  };

  const handleExitTest = async () => {
    if (!sessionId) return;
    const confirmExit = window.confirm("Exit test? Progress will be saved.");
    if (!confirmExit) return;
    try {
      const token = localStorage.getItem("sat_token");
      await fetch(`http://localhost:5000/api/exams/sessions/${sessionId}/pause`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ time_remaining: timeRemaining }),
      });
    } catch (e) {
      console.error("Pause failed", e);
    } finally {
      navigate("/dashboard");
    }
  };

  const handleAutoSubmit = () => {
    //alert("Time is up. Your progress has been saved.");
    completeCurrentModule();
  };

  // ---------------- Complete current module and route to next ----------------
  const completeCurrentModule = async () => {
    if (!sessionId) return;
    try {
      const token = localStorage.getItem("sat_token");

      // Grade just this module and get nextModule + difficulty
      const res = await fetch(
        `http://localhost:5000/api/exams/sessions/${sessionId}/modules/${currentModule}/complete`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        }
      );
      const json = await res.json();
      if (!json.success) {
        alert("Failed to complete module");
        return;
      }

      // backend will usually return nextModule for *_1 → *_2
      let nextModule: "reading_writing_2" | "math_1" | "math_2" | null = json.data.nextModule;

      // enforce full exam flow:
      // RW1 → RW2 → Math1 → Math2 → finalize
      if (currentModule === "reading_writing_2") nextModule = "math_1";
      else if (currentModule === "math_1") nextModule = "math_2";
      else if (currentModule === "math_2") nextModule = null;

      if (!nextModule) {
        // finalize entire test (no UI score), then go to dashboard
        await fetch(
          `http://localhost:5000/api/exams/sessions/${sessionId}/complete`,
          { method: "POST", headers: { Authorization: `Bearer ${token}` } }
        );
        navigate("/dashboard");
        return;
      }

      // reset timer for the next module
      const nextTimer = nextModule.startsWith("reading_writing") ? 32 * 60 : 35 * 60;
      setTimeRemaining(nextTimer);
      setIsReviewMode(false);
      setCurrentModule(nextModule);

      // fetch questions for nextModule
      const qRes = await fetch(
        `http://localhost:5000/api/exams/sessions/${sessionId}/modules/${nextModule}/questions`,
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
      );
      const qJson = await qRes.json();
      if (!qJson.success) {
        alert("Failed to load next module questions");
        return;
      }
      setQuestions(qJson.data.questions || []);
      if (qJson.data.questions?.length) {
        setCurrentQuestion(qJson.data.questions[0].id);
      }
    } catch (err) {
      console.error("completeCurrentModule error", err);
      alert("Error completing module");
    }
  };

  // ---------------- Render helpers ----------------
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
      padding: "0.9rem",
      border: `2px solid ${isSelected ? "#2563eb" : "#e0e0e0"}`,
      borderRadius: "8px",
      marginBottom: "0.5rem",
      cursor: "pointer",
      backgroundColor: isSelected ? "#dbeafe" : "white",
      transition: "all 0.2s",
    };
  };

  if (isLoading) {
    return (
      <div style={{ height: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <div>Loading test...</div>
      </div>
    );
  }

  const currentQuestionData = questions.find(q => q.id === currentQuestion);
  const isLastQuestion = currentQuestion === questions[questions.length - 1]?.id;
  const isModule1 =
    currentModule === "reading_writing_1" || currentModule === "math_1";

  // ---------------- Review mode (grid panel + legend, click to jump back) ----------------
  if (isReviewMode) {
    return (
      <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
        <header
          style={{
            backgroundColor: "white",
            borderBottom: "1px solid #e5e7eb",
            padding: "1rem 2rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>{examName}</h2>
            <div style={{ fontSize: "0.9rem", color: "#6b7280" }}>
              Review: {currentModule.replaceAll("_", " ")}
            </div>
          </div>
          <div style={{ display: "flex", gap: "1rem" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                Time Remaining
              </div>
              <div style={{ fontSize: "1.5rem", fontWeight: "bold" }}>
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
              onClick={handleExitTest}
            >
              Exit Test
            </button>
          </div>
        </header>

        <div style={{ padding: "1.5rem", flex: 1, overflowY: "auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(9, 1fr)",
              gap: "0.5rem",
              marginBottom: "1rem",
            }}
          >
            {questions.map((q, index) => (
              <div
                key={q.id}
                style={questionNumberStyle(q.id)}
                onClick={() => {
                  setCurrentQuestion(q.id);
                  setIsReviewMode(false);
                }}
                title={`Question ${index + 1}`}
              >
                {index + 1}
                {flaggedQuestions.has(q.id) && (
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

          <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: "0.25rem" }}>
              <div style={{ width: "12px", height: "12px", backgroundColor: "#2563eb", marginRight: "0.5rem" }} />
              Current Question
            </div>
            <div style={{ display: "flex", alignItems: "center", marginBottom: "0.25rem" }}>
              <div style={{ width: "12px", height: "12px", backgroundColor: "#10b981", marginRight: "0.5rem" }} />
              Answered
            </div>
            <div style={{ display: "flex", alignItems: "center" }}>
              <Flag size={12} color="#f59e0b" style={{ marginRight: "0.5rem" }} />
              Flagged
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1.5rem" }}>
            <button
              style={{
                padding: "0.75rem 1.5rem",
                border: "1px solid #d1d5db",
                backgroundColor: "white",
                borderRadius: "4px",
              }}
              onClick={() => {
                // go back to last question of the module
                if (questions.length) {
                  setCurrentQuestion(questions[questions.length - 1].id);
                  setIsReviewMode(false);
                }
              }}
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
                fontWeight: "bold",
              }}
              onClick={completeCurrentModule}
            >
              Continue →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------- Main test interface ----------------
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
          <h2 style={{ margin: 0 }}>{examName}</h2>
          <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
            Module:{" "}
            <button
              onClick={() => setModuleInfoOpen(true)}
              style={{
                background: "none",
                border: "none",
                color: "#2563eb",
                cursor: "pointer",
                padding: 0,
              }}
            >
              {currentModule.replaceAll("_", " ")}
            </button>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>Time Remaining</div>
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
            onClick={handleExitTest}
          >
            Exit Test
          </button>
        </div>
      </header>

      {/* Module Info Popup */}
      {moduleInfoOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: 8,
              padding: "1rem 1.25rem",
              maxWidth: 560,
              width: "95%",
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>
              {currentModule.replaceAll("_", " ")}
            </h3>
            <p style={{ color: "#374151", marginTop: 0 }}>
              {currentModule === "reading_writing_1" &&
                "32 minutes • 27 questions. Your performance here sets Module 2 difficulty."}
              {currentModule === "reading_writing_2" &&
                "32 minutes • 27 questions. Difficulty is adaptive based on Module 1."}
              {currentModule === "math_1" &&
                "35 minutes • 22 questions. Your performance here sets Math Module 2 difficulty."}
              {currentModule === "math_2" &&
                "35 minutes • 22 questions. Difficulty is adaptive based on Math Module 1."}
            </p>
            <div style={{ textAlign: "right" }}>
              <button
                onClick={() => setModuleInfoOpen(false)}
                style={{
                  background: "#2563eb",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  padding: "0.5rem 0.75rem",
                  fontWeight: 600,
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Body */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "1.5rem 2rem" }}>
        {/* Top row: question selector + flag */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
          <button
            onClick={() => 
              {
                const now = Date.now();
                const timeSpent = (now - questionStartTime) / 1000; // seconds
                // save time for current question before moving
                saveAnswer(currentQuestion, userAnswers[currentQuestion] || "", flaggedQuestions.has(currentQuestion), timeSpent);
                setQuestionStartTime(now);
                setPickerOpen(true)}}
            style={{
              border: "1px solid #d1d5db",
              borderRadius: 6,
              padding: "0.5rem 0.75rem",
              background: "white",
              cursor: "pointer",
            }}
          >
            Question {questions.findIndex((q) => q.id === currentQuestion) + 1} of {questions.length} ▾
          </button>

          <button
            onClick={() => handleFlagQuestion(currentQuestion)}
            style={{
              border: "2px solid #f59e0b",
              borderRadius: 6,
              background: flaggedQuestions.has(currentQuestion) ? "#fef3c7" : "white",
              color: "#92400e",
              padding: "0.35rem 0.75rem",
              fontWeight: 600,
            }}
          >
            {flaggedQuestions.has(currentQuestion) ? "★ Flagged" : "☆ Flag"}
          </button>
        </div>

        {/* Question block */}
        {currentQuestionData && (
          <>
            <div style={{ fontSize: "1.1rem", marginBottom: "1rem" }}>
              {currentQuestionData.question_text}
            </div>

            <div>
              {currentQuestionData.options.map((option, index) => {
                const optionLetter = String.fromCharCode(65 + index);
                return (
                  <div
                    key={index}
                    style={optionStyle(currentQuestionData.id, index)}
                    onClick={() => handleAnswerSelect(currentQuestionData.id, optionLetter)}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start" }}>
                      <div
                        style={{
                          width: "24px",
                          height: "24px",
                          border: `2px solid ${
                            userAnswers[currentQuestionData.id] === optionLetter ? "#2563eb" : "#9ca3af"
                          }`,
                          borderRadius: "4px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          marginRight: "1rem",
                          flexShrink: 0,
                          backgroundColor:
                            userAnswers[currentQuestionData.id] === optionLetter ? "#2563eb" : "white",
                          color: userAnswers[currentQuestionData.id] === optionLetter ? "white" : "#9ca3af",
                          fontWeight: "bold",
                          fontSize: "0.875rem",
                        }}
                      >
                        {optionLetter}
                      </div>
                      <div style={{ lineHeight: "1.5", color: "#374151" }}>{option}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Bottom nav */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1rem" }}>
          <button
            style={{
              padding: "0.75rem 1.5rem",
              border: "1px solid #d1d5db",
              backgroundColor: "white",
              borderRadius: "4px",
              cursor: currentQuestion !== questions[0]?.id ? "pointer" : "not-allowed",
              color: currentQuestion !== questions[0]?.id ? "#374151" : "#9ca3af",
            }}
            disabled={currentQuestion === questions[0]?.id}
            onClick={() => {
              const now = Date.now();
              const timeSpent = (now - questionStartTime) / 1000; // seconds
              // save time for current question before moving
              saveAnswer(currentQuestion, userAnswers[currentQuestion] || "", flaggedQuestions.has(currentQuestion), timeSpent);
              setQuestionStartTime(now);
              const idx = questions.findIndex(q => q.id === currentQuestion);
              if (idx > 0) setCurrentQuestion(questions[idx - 1].id);
            }}
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
              const now = Date.now();
              const timeSpent = (now - questionStartTime) / 1000; // seconds
              // save time for current question before moving
              saveAnswer(currentQuestion, userAnswers[currentQuestion] || "", flaggedQuestions.has(currentQuestion), timeSpent);
              setQuestionStartTime(now);

              if (!isLastQuestion) {
                const idx = questions.findIndex(q => q.id === currentQuestion);
                setCurrentQuestion(questions[idx + 1].id);
                return;
              }
              // last question → go to review grid
              setIsReviewMode(true);
            }}
          >
            {isLastQuestion ? (isModule1 ? "Review Answers" : "Review Answers") : "Next →"}
          </button>
        </div>
      </div>

      {/* Question Picker Popup (Bluebook-like) */}
      {pickerOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
          onClick={() => setPickerOpen(false)}
        >
          <div
            style={{
              background: "white",
              borderRadius: 8,
              padding: "1rem",
              maxWidth: 700,
              width: "95%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>Jump to Question</h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(9, 1fr)",
                gap: 8,
                marginTop: 8,
              }}
            >
              {questions.map((q, i) => (
                <button
                  key={q.id}
                  onClick={() => {
                    setCurrentQuestion(q.id);
                    setPickerOpen(false);
                  }}
                  style={{
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    background:
                      currentQuestion === q.id
                        ? "#2563eb"
                        : userAnswers[q.id]
                        ? "#10b981"
                        : "white",
                    color: currentQuestion === q.id ? "white" : "#111827",
                    position: "relative",
                    padding: "0.5rem",
                    cursor: "pointer",
                  }}
                  title={`Question ${i + 1}`}
                >
                  {i + 1}
                  {flaggedQuestions.has(q.id) && (
                    <span
                      style={{
                        position: "absolute",
                        top: -4,
                        right: -4,
                        background: "white",
                        borderRadius: "50%",
                        padding: 2,
                      }}
                    >
                      <Flag size={12} color="#f59e0b" />
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
                <div style={{ width: 12, height: 12, background: "#2563eb", marginRight: 8 }} />
                Current Question
              </div>
              <div style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
                <div style={{ width: 12, height: 12, background: "#10b981", marginRight: 8 }} />
                Answered
              </div>
              <div style={{ display: "flex", alignItems: "center" }}>
                <Flag size={12} color="#f59e0b" style={{ marginRight: 8 }} />
                Flagged
              </div>
            </div>

            <div style={{ textAlign: "right", marginTop: 12 }}>
              <button
                onClick={() => setPickerOpen(false)}
                style={{
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  background: "white",
                  padding: "0.4rem 0.9rem",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestInterface;