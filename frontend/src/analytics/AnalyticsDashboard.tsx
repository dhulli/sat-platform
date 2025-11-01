import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  CategoryScale,
  LinearScale,
} from "chart.js";
import { Doughnut, Radar, Line } from "react-chartjs-2";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  CategoryScale,
  LinearScale
);

interface AnalyticsRow {
  id: number;
  exam_id: number;
  test_session_id: number;
  rw_score: number;
  math_score: number;
  total_score: number;
  rw_accuracy: number;
  math_accuracy: number;
  avg_time_per_question: number;
  strengths: string | string[];
  weaknesses: string | string[];
  created_at: string;
}

const AnalyticsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<AnalyticsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<AnalyticsRow | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const token = localStorage.getItem("sat_token");
        const res = await fetch("http://localhost:5000/api/analytics", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);

        const parsed = data.data.map((row: any) => {
          const parseField = (val: any) => {
            if (!val) return [];
            try {
              return typeof val === "string" ? JSON.parse(val) : val;
            } catch {
              return val.split(",").map((v: string) => v.trim());
            }
          };
          return {
            ...row,
            strengths: parseField(row.strengths),
            weaknesses: parseField(row.weaknesses),
          };
        });

        setAnalytics(parsed);
      } catch (err) {
        console.error("Failed to load analytics", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen text-gray-600 text-lg">
        Loading analytics...
      </div>
    );

  if (!analytics.length)
    return (
      <div className="flex flex-col justify-center items-center h-screen text-center">
        <p className="text-xl font-semibold text-gray-700 mb-2">No analytics available yet.</p>
        <p className="text-gray-500 mb-6">Complete at least one test to see your progress!</p>
        <button
          onClick={() => navigate("/dashboard")}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
        >
          Back to Dashboard
        </button>
      </div>
    );

  const sorted = [...analytics].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  const first = sorted[0];
  const latest = sorted[sorted.length - 1];
  const avgScore =
    sorted.reduce((acc, a) => acc + (a.total_score || 0), 0) / sorted.length;
  const delta = (latest.total_score || 0) - (first.total_score || 0);
  const trendColor =
    delta > 0 ? "text-green-600" : delta < 0 ? "text-red-600" : "text-gray-600";
  const trendIcon = delta > 0 ? "▲" : delta < 0 ? "▼" : "—";

  return (
    <div className="min-h-screen bg-gray-50 p-8 overflow-x-hidden">
      <div className="max-w-7xl mx-auto bg-white shadow rounded-lg p-6">
        {/* Summary Row */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">📊 Performance Overview</h2>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition"
          >
            ← Back
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8 text-center">
          <div className="bg-blue-50 rounded-lg py-3">
            <div className="text-sm text-gray-600">Latest Total</div>
            <div className="text-2xl font-bold text-blue-700">{latest.total_score ?? "—"}</div>
            <div className="text-xs text-gray-500">
              {new Date(latest.created_at).toLocaleDateString()}
            </div>
          </div>
          <div className="bg-green-50 rounded-lg py-3">
            <div className="text-sm text-gray-600">Improvement</div>
            <div className={`text-2xl font-bold ${trendColor}`}>
              {trendIcon} {Math.abs(delta)} pts
            </div>
          </div>
          <div className="bg-yellow-50 rounded-lg py-3">
            <div className="text-sm text-gray-600">Average</div>
            <div className="text-2xl font-bold text-yellow-700">
              {avgScore.toFixed(0)}
            </div>
          </div>
        </div>

        {/* --- Horizontal Scroll Panels with Arrows --- */}
        <div className="relative">
          {/* Left Arrow */}
          <button
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 border border-gray-300 rounded-full shadow hover:bg-gray-100 w-8 h-8 flex items-center justify-center"
            onClick={() => {
              const container = document.getElementById("scrollContainer");
              container?.scrollBy({ left: -560, behavior: "smooth" });
            }}
            aria-label="Previous panel"
          >
            ‹
          </button>

          {/* Scroll Container */}
          <div
            id="scrollContainer"
            className="flex overflow-x-auto space-x-6 pb-4 snap-x snap-mandatory scroll-smooth items-stretch"
            style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}
          >
            {/* SCORE TREND */}
            <div className="flex-shrink-0 w-[560px] bg-white border border-gray-200 rounded-lg shadow-sm p-4 snap-start">
              <h3 className="text-md font-semibold text-gray-800 mb-3 text-center">
                Total Score Trend
              </h3>
              {/* Fixed-height wrapper prevents infinite growth */}
              <div className="relative h-[280px]">
                <Line
                  data={{
                    labels: analytics
                      .map((a) => new Date(a.created_at).toLocaleDateString())
                      .reverse(),
                    datasets: [
                      {
                        label: "Total Score",
                        data: analytics.map((a) => a.total_score || 0).reverse(),
                        borderColor: "#2563eb",
                        backgroundColor: "rgba(37,99,235,0.1)",
                        fill: true,
                        tension: 0.35,
                        pointRadius: 3,
                        pointHoverRadius: 6,
                      },
                    ],
                  }}
                  options={{
                    maintainAspectRatio: false,
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: {
                      y: {
                        min: 200,
                        suggestedMax:
                          Math.max(
                            ...analytics.map((a) =>
                              Math.max(a.total_score || 0, a.rw_score || 0, a.math_score || 0)
                            )
                          ) + 50,
                        ticks: { stepSize: 100, color: "#6b7280" },
                        grid: { color: "rgba(209,213,219,0.2)" },
                      },
                      x: { ticks: { color: "#6b7280" } },
                    },
                  }}
                />
              </div>
            </div>

            {/* ACCURACY COMPARISON */}
            <div className="flex-shrink-0 w-[560px] bg-white border border-gray-200 rounded-lg shadow-sm p-4 snap-start">
              <h3 className="text-md font-semibold text-gray-800 mb-3 text-center">
                Accuracy Comparison
              </h3>
              <div className="relative h-[280px]">
                <Line
                  data={{
                    labels: analytics
                      .map((a) => new Date(a.created_at).toLocaleDateString())
                      .reverse(),
                    datasets: [
                      {
                        label: "Reading & Writing",
                        data: analytics.map((a) => (a.rw_accuracy ?? 0) * 100).reverse(),
                        borderColor: "#3b82f6",
                        backgroundColor: "rgba(59,130,246,0.1)",
                        fill: true,
                        tension: 0.3,
                      },
                      {
                        label: "Math",
                        data: analytics.map((a) => (a.math_accuracy ?? 0) * 100).reverse(),
                        borderColor: "#10b981",
                        backgroundColor: "rgba(16,185,129,0.1)",
                        fill: true,
                        tension: 0.3,
                      },
                    ],
                  }}
                  options={{
                    maintainAspectRatio: false,
                    responsive: true,
                    plugins: { legend: { position: "bottom" as const } },
                    scales: {
                      y: { min: 0, max: 100, ticks: { stepSize: 20 } },
                    },
                  }}
                />
              </div>
            </div>

            {/* SESSION TABLE */}
            <div className="flex-shrink-0 w-[560px] bg-white border border-gray-200 rounded-lg shadow-sm p-4 snap-start">
              <h3 className="text-md font-semibold text-gray-800 mb-3 text-center">
                Recent Sessions
              </h3>
              <div className="max-h-[280px] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 text-gray-600 sticky top-0">
                    <tr>
                      <th className="py-1 px-2 text-left">Date</th>
                      <th className="py-1 px-2 text-left">Total</th>
                      <th className="py-1 px-2 text-left">RW</th>
                      <th className="py-1 px-2 text-left">Math</th>
                      <th className="py-1 px-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.slice(0, 8).map((a) => (
                      <tr key={a.id} className="border-t hover:bg-gray-50 transition">
                        <td className="py-1 px-2">
                          {new Date(a.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-1 px-2 font-semibold text-gray-800">
                          {a.total_score}
                        </td>
                        <td className="py-1 px-2 text-blue-600">{a.rw_score}</td>
                        <td className="py-1 px-2 text-green-600">{a.math_score}</td>
                        <td className="py-1 px-2">
                          <button
                            onClick={() => setSelectedSession(a)}
                            className="text-blue-600 hover:underline"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Arrow */}
          <button
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 border border-gray-300 rounded-full shadow hover:bg-gray-100 w-8 h-8 flex items-center justify-center"
            onClick={() => {
              const container = document.getElementById("scrollContainer");
              container?.scrollBy({ left: 560, behavior: "smooth" });
            }}
            aria-label="Next panel"
          >
            ›
          </button>
        </div>
      </div>

      {selectedSession && (
        <SessionDetailModal
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
        />
      )}
    </div>
  );
};

// ----------------------
// Modal for Session Detail
// ----------------------
const SessionDetailModal: React.FC<{
  session: AnalyticsRow;
  onClose: () => void;
}> = ({ session, onClose }) => {
  const rw = session.rw_score ?? 0;
  const math = session.math_score ?? 0;
  const total = session.total_score ?? 0;

  const doughnutData = {
    labels: ["Reading & Writing", "Math"],
    datasets: [
      {
        data: [rw, math],
        backgroundColor: ["#3b82f6", "#10b981"],
        hoverBackgroundColor: ["#2563eb", "#059669"],
      },
    ],
  };

  const radarData = {
    labels: [
      ...(session.strengths as string[]).slice(0, 3),
      ...(session.weaknesses as string[]).slice(0, 3),
    ],
    datasets: [
      {
        label: "Performance Insights",
        data: [80, 75, 90, 50, 40, 35],
        backgroundColor: "rgba(59,130,246,0.2)",
        borderColor: "#3b82f6",
        pointBackgroundColor: "#3b82f6",
      },
    ],
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-[700px] max-h-[90vh] overflow-y-auto p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>

        <h2 className="text-xl font-semibold mb-1">
          Session #{session.test_session_id}
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Completed on {new Date(session.created_at).toLocaleString()}
        </p>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 p-3 rounded-lg text-center">
            <div className="text-sm text-gray-600">Reading & Writing</div>
            <div className="text-lg font-bold text-blue-600">{rw}</div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg text-center">
            <div className="text-sm text-gray-600">Math</div>
            <div className="text-lg font-bold text-green-600">{math}</div>
          </div>
          <div className="bg-yellow-50 p-3 rounded-lg text-center">
            <div className="text-sm text-gray-600">Total</div>
            <div className="text-lg font-bold text-yellow-600">{total}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="text-md font-semibold mb-2 text-gray-700">Score Distribution</h3>
            <Doughnut data={doughnutData} />
          </div>
          <div>
            <h3 className="text-md font-semibold mb-2 text-gray-700">Skill Insights</h3>
            <Radar data={radarData} />
          </div>
        </div>

        <div className="mb-4">
          <h3 className="font-semibold text-gray-700 mb-2">Strengths</h3>
          <div className="flex flex-wrap gap-2">
            {(session.strengths as string[]).map((s, i) => (
              <span
                key={i}
                className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium"
              >
                {s}
              </span>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <h3 className="font-semibold text-gray-700 mb-2">Weaknesses</h3>
          <div className="flex flex-wrap gap-2">
            {(session.weaknesses as string[]).map((w, i) => (
              <span
                key={i}
                className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium"
              >
                {w}
              </span>
            ))}
          </div>
        </div>

        <div className="text-right mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
