import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface ReviewSession {
  test_session_id: number;
  exam_name: string;
  total_score: number;
  completed_at: string;
}

const ReviewDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<ReviewSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompletedTests = async () => {
      try {
        const token = localStorage.getItem("sat_token");
        const res = await fetch("http://localhost:5000/api/review/reviews", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);

        setSessions(data.data);
      } catch (err) {
        console.error("Failed to load completed tests", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCompletedTests();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen text-gray-600 text-lg">
        Loading your completed tests...
      </div>
    );
  }

  if (!sessions.length) {
    return (
      <div className="flex flex-col justify-center items-center h-screen text-center">
        <p className="text-xl font-semibold text-gray-700 mb-2">
          No completed tests yet
        </p>
        <p className="text-gray-500 mb-6">
          Take at least one full test to review your performance.
        </p>
        <button
          onClick={() => navigate("/dashboard")}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">🧾 Review Completed Tests</h2>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition"
          >
            ← Back
          </button>
        </div>

        <table className="w-full border border-gray-200 rounded-lg text-sm">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="py-2 px-4 text-left">Exam Name</th>
              <th className="py-2 px-4 text-left">Total Score</th>
              <th className="py-2 px-4 text-left">Completed On</th>
              <th className="py-2 px-4 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr
                key={s.test_session_id}
                className="border-t hover:bg-gray-50 transition"
              >
                <td className="py-2 px-4 font-semibold text-gray-900">
                  {s.exam_name ?? "SAT Practice Test"}
                </td>
                <td className="py-2 px-4 text-gray-800">{s.total_score ?? "-"}</td>
                <td className="py-2 px-4">
                  {new Date(s.completed_at).toLocaleString()}
                </td>
                <td className="py-2 px-4">
                  <button
                    onClick={() => navigate(`/review/${s.test_session_id}`)}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    View Review
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReviewDashboard;
