import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Line as MiniLine } from "react-chartjs-2";
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


ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler
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

        // Safe parsing for JSON or comma strings
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen text-gray-600 text-lg">
        Loading analytics...
      </div>
    );
  }

  if (!analytics.length) {
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
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto bg-white shadow rounded-lg p-6">      
        {/* --- Progress Tracker (Final Polished Layout) --- */}
        {analytics.length > 1 && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-10 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
            <div>
                <h3 className="text-xl font-bold text-gray-800">
                📈 Score Progress Over Time
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                Track how your SAT scores have evolved across practice sessions.
                </p>
            </div>
            <button
                onClick={() => navigate("/dashboard")}
                className="mt-4 sm:mt-0 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition"
            >
                Back to Dashboard
            </button>
            </div>
            {/* --- Summary Row (with sparklines) --- */}
            {analytics.length > 0 && (() => {
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

            const baseOptions = {
                plugins: { legend: { display: false }, tooltip: { enabled: false } },
                scales: {
                x: { display: false },
                y: { display: false },
                },
                elements: { point: { radius: 0 } },
            };

            return (
                <div className="grid grid-cols-3 gap-4 mb-6 text-center">
                {/* Latest Total */}
                <div className="bg-blue-50 rounded-lg py-3">
                    <div className="text-sm text-gray-600">Latest Total</div>
                    <div className="text-2xl font-bold text-blue-700">
                    {latest.total_score ?? "—"}
                    </div>
                    <div className="h-10 mt-1">
                    <MiniLine
                        data={{
                        labels: sorted.map((_, i) => i),
                        datasets: [
                            {
                            data: sorted.map((a) => a.total_score || 0),
                            borderColor: "#2563eb",
                            backgroundColor: "rgba(37,99,235,0.1)",
                            fill: true,
                            tension: 0.3,
                            },
                        ],
                        }}
                        options={baseOptions}
                    />
                    </div>
                </div>

                {/* Improvement */}
                <div className="bg-green-50 rounded-lg py-3">
                    <div className="text-sm text-gray-600">Improvement</div>
                    <div className={`text-2xl font-bold ${trendColor}`}>
                    {trendIcon} {Math.abs(delta)} pts
                    </div>
                    <div className="h-10 mt-1">
                    <MiniLine
                        data={{
                        labels: sorted.map((_, i) => i),
                        datasets: [
                            {
                            data: sorted.map((a) => a.total_score || 0),
                            borderColor: delta >= 0 ? "#10b981" : "#dc2626",
                            backgroundColor:
                                delta >= 0
                                ? "rgba(16,185,129,0.15)"
                                : "rgba(220,38,38,0.15)",
                            fill: true,
                            tension: 0.3,
                            },
                        ],
                        }}
                        options={baseOptions}
                    />
                    </div>
                </div>

                {/* Average */}
                <div className="bg-yellow-50 rounded-lg py-3">
                    <div className="text-sm text-gray-600">Average</div>
                    <div className="text-2xl font-bold text-yellow-700">
                    {avgScore.toFixed(0)}
                    </div>
                    <div className="h-10 mt-1">
                    <MiniLine
                        data={{
                        labels: sorted.map((_, i) => i),
                        datasets: [
                            {
                            data: sorted.map((a) => a.avg_time_per_question || 0),
                            borderColor: "#f59e0b",
                            backgroundColor: "rgba(245,158,11,0.15)",
                            fill: true,
                            tension: 0.3,
                            },
                        ],
                        }}
                        options={baseOptions}
                    />
                    </div>
                </div>
                </div>
            );
            })()}

            <div className="relative h-[340px] sm:h-[380px] w-full">
            <Line
                data={{
                labels: analytics
                    .map((a) =>
                    new Date(a.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                    })
                    )
                    .reverse(),
                datasets: [
                    {
                    label: "Total Score",
                    data: analytics.map((a) => a.total_score || 0).reverse(),
                    borderColor: "#1d4ed8",
                    backgroundColor: "rgba(37,99,235,0.1)",
                    tension: 0.4,
                    fill: true,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    },
                    {
                    label: "Reading & Writing",
                    data: analytics.map((a) => a.rw_score || 0).reverse(),
                    borderColor: "#3b82f6",
                    borderDash: [6, 4],
                    tension: 0.4,
                    fill: false,
                    pointRadius: 3,
                    pointHoverRadius: 5,
                    },
                    {
                    label: "Math",
                    data: analytics.map((a) => a.math_score || 0).reverse(),
                    borderColor: "#059669",
                    borderDash: [4, 3],
                    tension: 0.4,
                    fill: false,
                    pointRadius: 3,
                    pointHoverRadius: 5,
                    },
                ],
                }}
                options={{
                maintainAspectRatio: false,
                responsive: true,
                plugins: {
                    legend: {
                    position: "bottom" as const,
                    labels: {
                        usePointStyle: true,
                        pointStyle: "circle",
                        color: "#374151",
                        padding: 15,
                        font: { size: 13, weight: 500 },
                    },
                    },
                    tooltip: {
                    backgroundColor: "#111827",
                    titleColor: "#fff",
                    bodyColor: "#e5e7eb",
                    borderColor: "#2563eb",
                    borderWidth: 1,
                    padding: 10,
                    displayColors: false,
                    },
                },
                scales: {
                    y: {
                    min: 200,
                    // Dynamically compute the upper limit with a little headroom
                    suggestedMax:
                        Math.max(
                        ...analytics.map(
                            (a) => Math.max(a.total_score || 0, a.rw_score || 0, a.math_score || 0)
                        )
                        ) + 50,
                    ticks: {
                        stepSize: 100,
                        color: "#6b7280",
                    },
                    grid: {
                        color: "rgba(209,213,219,0.2)",
                    },
                    title: {
                        display: true,
                        text: "Score",
                        color: "#374151",
                        font: { weight: 600 },
                    },
                    },
                    x: {
                    ticks: { color: "#6b7280" },
                    grid: { color: "rgba(209,213,219,0.1)" },
                    },
                },
                }}
            />
            </div>
        </div>
        )}

        {/* --- Accuracy Comparison Chart --- */}
        {analytics.length > 1 && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm mt-10 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
            Section Accuracy Over Time
            </h3>
            <Line
            data={{
                labels: analytics
                .map((a) => new Date(a.created_at).toLocaleDateString())
                .reverse(),
                datasets: [
                {
                    label: "Reading & Writing Accuracy (%)",
                    data: analytics.map((a) => (a.rw_accuracy ?? 0) * 100).reverse(),
                    borderColor: "#3b82f6",
                    backgroundColor: "rgba(59,130,246,0.1)",
                    fill: true,
                    tension: 0.3,
                },
                {
                    label: "Math Accuracy (%)",
                    data: analytics.map((a) => (a.math_accuracy ?? 0) * 100).reverse(),
                    borderColor: "#10b981",
                    backgroundColor: "rgba(16,185,129,0.1)",
                    fill: true,
                    tension: 0.3,
                },
                ],
            }}
            options={{
                responsive: true,
                plugins: {
                legend: { position: "bottom" as const },
                tooltip: {
                    callbacks: {
                    label: (ctx) => `${ctx.dataset.label}: ${(ctx.parsed.y ?? 0).toFixed(1)}%`,
                    },
                },
                },
                scales: {
                y: {
                    min: 0,
                    max: 100,
                    title: { display: true, text: "Accuracy (%)" },
                    ticks: { stepSize: 10 },
                },
                },
            }}
            />
        </div>
        )}

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Performance Analytics</h2>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition"
          >
            ← Back
          </button>
        </div>

        <table className="w-full border border-gray-200 rounded-lg overflow-hidden text-sm">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="py-2 px-4 text-left">Date</th>
              <th className="py-2 px-4 text-left">Total Score</th>
              <th className="py-2 px-4 text-left">RW Score</th>
              <th className="py-2 px-4 text-left">Math Score</th>
              <th className="py-2 px-4 text-left">Avg Time (s)</th>
              <th className="py-2 px-4 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {analytics.map((a) => (
              <tr key={a.id} className="border-t hover:bg-gray-50 transition">
                <td className="py-2 px-4">
                  {new Date(a.created_at).toLocaleDateString()}
                </td>
                <td className="py-2 px-4 font-semibold text-gray-900">
                  {a.total_score ?? "-"}
                </td>
                <td className="py-2 px-4">{a.rw_score ?? "-"}</td>
                <td className="py-2 px-4">{a.math_score ?? "-"}</td>
                <td className="py-2 px-4">
                  {a.avg_time_per_question?.toFixed(1) ?? "-"}
                </td>
                <td className="py-2 px-4">
                  <button
                    onClick={() => setSelectedSession(a)}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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

// -----------------------------------
// 📊 Session Detail Modal Component
// -----------------------------------
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
        data: [80, 75, 90, 50, 40, 35], // sample visualization, can be extended with real metrics
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

        <h2 className="text-xl font-semibold mb-1">Session #{session.test_session_id}</h2>
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
