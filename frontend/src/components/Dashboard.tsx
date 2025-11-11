import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useExam } from "../context/ExamContext";
import { useNavigate } from "react-router-dom";

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const { exams, loading, loadExams, startExam } = useExam();
  const [selectedExam, setSelectedExam] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (exams.length === 0 && !loading) loadExams();
  }, [exams.length, loading, loadExams]);

  // -------------------------------------------
  // Custom modal logic for Start Test
  // -------------------------------------------
  const handleStartExam = async () => {
    if (!selectedExam) {
      alert("Please select a test to start.");
      return;
    }

    const selected = exams.find((e) => e.id === selectedExam);
    if (!selected) return;

    try {
      const response: any = await startExam(selectedExam);

      if (response.requiresConfirmation && response.existingSession) {
        const modal = document.createElement("div");
        modal.style.position = "fixed";
        modal.style.top = "0";
        modal.style.left = "0";
        modal.style.width = "100vw";
        modal.style.height = "100vh";
        modal.style.background = "rgba(0,0,0,0.5)";
        modal.style.display = "flex";
        modal.style.justifyContent = "center";
        modal.style.alignItems = "center";
        modal.style.zIndex = "9999";

        const box = document.createElement("div");
        box.style.background = "white";
        box.style.padding = "2rem";
        box.style.borderRadius = "0.75rem";
        box.style.textAlign = "center";
        box.style.maxWidth = "400px";
        box.style.boxShadow = "0 8px 25px rgba(0,0,0,0.2)";
        box.style.fontFamily = "system-ui, sans-serif";

        box.innerHTML = `
          <h3 style="font-size:1.25rem; font-weight:600; color:#111827; margin-bottom:1rem;">
            Continue your ${selected.name} test?
          </h3>
          <p style="color:#4b5563; font-size:0.9rem; margin-bottom:1.5rem;">
            You already have a session in progress. Resume where you left off, or start fresh.
          </p>
        `;

        const btnRow = document.createElement("div");
        btnRow.style.display = "flex";
        btnRow.style.justifyContent = "center";
        btnRow.style.gap = "0.75rem";

        const resumeBtn = document.createElement("button");
        resumeBtn.textContent = "Resume";
        resumeBtn.style.background = "#2563eb";
        resumeBtn.style.color = "white";
        resumeBtn.style.padding = "0.5rem 1rem";
        resumeBtn.style.border = "none";
        resumeBtn.style.borderRadius = "0.375rem";
        resumeBtn.style.cursor = "pointer";
        resumeBtn.style.fontWeight = "500";

        const newBtn = document.createElement("button");
        newBtn.textContent = "Start New";
        newBtn.style.background = "#dc2626";
        newBtn.style.color = "white";
        newBtn.style.padding = "0.5rem 1rem";
        newBtn.style.border = "none";
        newBtn.style.borderRadius = "0.375rem";
        newBtn.style.cursor = "pointer";
        newBtn.style.fontWeight = "500";

        btnRow.appendChild(resumeBtn);
        btnRow.appendChild(newBtn);
        box.appendChild(btnRow);
        modal.appendChild(box);
        document.body.appendChild(modal);

        const cleanup = () => modal.remove();

        resumeBtn.onclick = () => {
          cleanup();
          navigate(`/test/${response.existingSession.id}`);
        };

        newBtn.onclick = async () => {
          cleanup();
          const newRes: any = await startExam(selectedExam, true);
          const newSession = newRes.session || newRes;
          navigate(`/test/${newSession.id}`);
        };

        return;
      }

      const session = response.session || response;
      navigate(`/test/${session.id}`);
    } catch (err: any) {
      alert("❌ Failed to start exam: " + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm flex-shrink-0">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">SAT Platform</h1>
            <p className="text-sm text-gray-600">
              Welcome back, {user?.firstName || user?.email}!
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                user?.subscriptionType === "premium"
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {user?.subscriptionType === "premium" ? "⭐ Premium" : "Free Plan"}
            </span>

            {/* About Button */}
            <button
              onClick={() => navigate("/about")}
              className="bg-blue-100 text-blue-700 px-3 py-1.5 text-sm rounded-md hover:bg-blue-200 transition"
            >
              About the App
            </button>

            <button
              onClick={logout}
              className="bg-gray-700 text-white px-3 py-1.5 text-sm rounded-md hover:bg-gray-800"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-grow max-w-7xl mx-auto px-6 py-6 grid grid-cols-12 gap-6 items-start overflow-hidden">
        {/* Left Column: Stats + Test Selector */}
        <div className="col-span-12 lg:col-span-7 space-y-5">
          {/* Stats Row */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Tests Taken", value: "0" },
              { label: "Best Score", value: "-" },
              { label: "Hours Practiced", value: "0" },
              { label: "Tests Available", value: exams.length.toString() },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-white border border-gray-200 rounded-md text-center py-4 shadow-sm"
              >
                <div className="text-lg font-semibold text-gray-900">
                  {stat.value}
                </div>
                <div className="text-xs text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Test Selector */}
          <div className="bg-white border border-gray-200 rounded-md p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">
              Start a Practice Test
            </h2>
            <p className="text-sm text-gray-500 mb-3">
              Choose a test to begin or resume your progress.
            </p>

            {loading ? (
              <p className="text-gray-500 text-center py-3">Loading exams...</p>
            ) : exams.length === 0 ? (
              <p className="text-gray-500 text-center py-3">
                No available tests found.
              </p>
            ) : (
              <div className="flex flex-col items-center space-y-4">
                <select
                  value={selectedExam ?? ""}
                  onChange={(e) => setSelectedExam(Number(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="">Select a Test</option>
                  {exams.map((exam) => (
                    <option key={exam.id} value={exam.id}>
                      {exam.name} ({exam.total_questions} questions)
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleStartExam}
                  disabled={!selectedExam}
                  className={`w-full py-2 rounded-md text-white font-medium text-sm transition ${
                    selectedExam
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "bg-gray-400 cursor-not-allowed"
                  }`}
                >
                  Start Test
                </button>

                <button
                  onClick={() => navigate("/review")}
                  className="w-full py-2 border border-green-600 text-green-700 rounded-md hover:bg-green-600 hover:text-white text-sm font-medium transition"
                >
                  Go to Review Dashboard
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Feature Cards */}
        <div className="col-span-12 lg:col-span-5 space-y-5">
          <div className="bg-white p-5 rounded-md border border-gray-200 shadow-sm">
            <h3 className="text-base font-semibold text-green-700 mb-1">
              Performance Analytics
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              View progress, accuracy trends, and section-wise performance.
            </p>
            <button
              onClick={() => navigate("/analytics")}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-md text-sm transition"
            >
              View Analytics
            </button>
          </div>

          <div className="bg-white p-5 rounded-md border border-gray-200 shadow-sm">
            <h3 className="text-base font-semibold text-purple-700 mb-1">
              Study Plan
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Personalized recommendations based on your strengths and
              weaknesses.
            </p>
            <button className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-md text-sm transition">
              View Study Plan
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
