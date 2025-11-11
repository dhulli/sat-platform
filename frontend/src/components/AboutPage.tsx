import React from "react";
import { useNavigate } from "react-router-dom";

const AboutPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col">
      <header className="bg-white shadow-sm py-4 px-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-blue-700">SAT Platform</h1>
        <button
          onClick={() => navigate("/dashboard")}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm transition"
        >
          Back to Dashboard
        </button>
      </header>

      <main className="flex-grow flex flex-col items-center text-center px-6 py-12 max-w-4xl mx-auto">
        <h2 className="text-4xl font-extrabold text-gray-900 mb-4 leading-tight">
          Your Future Deserves Precision.
        </h2>
        <p className="text-lg text-gray-600 mb-10 max-w-2xl">
          Welcome to <span className="font-semibold text-blue-700">SAT Platform</span> —  
          not just another prep app, but your personal accelerator for elite SAT performance.
          We built this system for students who refuse to settle for average.
        </p>

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <div className="bg-white shadow-md rounded-lg p-6 border border-gray-100">
            <h3 className="text-xl font-semibold text-blue-700 mb-2">
              🎯 Smart Adaptive Testing
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Every test adapts dynamically to your ability level.  
              You’ll be challenged just enough to grow — never overwhelmed, never bored.
            </p>
          </div>
          <div className="bg-white shadow-md rounded-lg p-6 border border-gray-100">
            <h3 className="text-xl font-semibold text-green-600 mb-2">
              📊 Real-Time Performance Analytics
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Track your scores, accuracy, and timing across every session.  
              Watch your progress curve climb like your ambition.
            </p>
          </div>
          <div className="bg-white shadow-md rounded-lg p-6 border border-gray-100">
            <h3 className="text-xl font-semibold text-purple-600 mb-2">
              🧠 Personalized Study Plans
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Our engine dissects your strengths and weaknesses to craft  
              a study plan so targeted it feels human — but faster and tireless.
            </p>
          </div>
          <div className="bg-white shadow-md rounded-lg p-6 border border-gray-100">
            <h3 className="text-xl font-semibold text-amber-600 mb-2">
              💡 Review Like a Pro
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Instantly review your tests with highlighted answers,  
              detailed explanations, and a breakdown that actually teaches.
            </p>
          </div>
        </div>

        <div className="max-w-3xl mb-16">
          <h3 className="text-2xl font-bold text-gray-800 mb-3">
            How to Use the Platform
          </h3>
          <ul className="text-gray-600 text-left list-disc list-inside leading-relaxed text-sm">
            <li>Go to your dashboard and select a practice test.</li>
            <li>Choose your module, difficulty, and start your session.</li>
            <li>Monitor your progress under <b>Performance Analytics</b>.</li>
            <li>Visit <b>Review Dashboard</b> to analyze mistakes and explanations.</li>
            <li>Generate a <b>Study Plan</b> tailored to your weak areas.</li>
          </ul>
        </div>

        <div className="bg-blue-600 text-white rounded-xl shadow-lg px-8 py-8 max-w-2xl">
          <h3 className="text-2xl font-semibold mb-3">
            Your SAT Success is No Longer Optional.
          </h3>
          <p className="text-sm text-blue-100 mb-5">
            SAT Platform isn’t another study app. It’s the missing oxygen in your preparation — 
            the precision tool that turns stress into strategy and doubt into data.
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-white text-blue-700 px-5 py-2 rounded-md font-medium hover:bg-gray-100 transition"
          >
            Start Your Journey
          </button>
        </div>
      </main>

      <footer className="bg-gray-100 text-gray-500 text-sm text-center py-4">
        © {new Date().getFullYear()} SAT Platform. Built for excellence.
      </footer>
    </div>
  );
};

export default AboutPage;
