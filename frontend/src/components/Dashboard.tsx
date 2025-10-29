import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useExam } from '../context/ExamContext';
import { useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const { exams, loading, loadExams, startExam } = useExam();
  const navigate = useNavigate();

  // Load exams when component mounts
  React.useEffect(() => {
    const loadExamsOnce = async () => {
      if (exams.length === 0 && !loading) {
        await loadExams();
      }
    };
    
    loadExamsOnce();
  }, [exams.length, loading, loadExams]);

  const handleLogout = () => {
    logout();
  };

  const handleStartExam = async (examId: number, examName: string) => {
    try {
      const response: any = await startExam(examId);

      if (response.requiresConfirmation && response.existingSession) {
        // create a simple custom dialog instead of window.confirm
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
        box.style.borderRadius = "0.5rem";
        box.style.textAlign = "center";
        box.style.maxWidth = "400px";
        box.style.fontFamily = "system-ui, sans-serif";

        box.innerHTML = `
          <h3 style="margin-bottom: 1rem;">You already have an unfinished session for <b>${examName}</b>.</h3>
          <p style="color:#4b5563; margin-bottom:1.5rem;">
            Do you want to resume your previous attempt or start a new test?
          </p>
        `;

        const resumeBtn = document.createElement("button");
        resumeBtn.textContent = "Resume";
        resumeBtn.style.background = "#2563eb";
        resumeBtn.style.color = "white";
        resumeBtn.style.padding = "0.5rem 1rem";
        resumeBtn.style.border = "none";
        resumeBtn.style.borderRadius = "0.375rem";
        resumeBtn.style.marginRight = "0.5rem";
        resumeBtn.style.cursor = "pointer";

        const newBtn = document.createElement("button");
        newBtn.textContent = "Start New";
        newBtn.style.background = "#dc2626";
        newBtn.style.color = "white";
        newBtn.style.padding = "0.5rem 1rem";
        newBtn.style.border = "none";
        newBtn.style.borderRadius = "0.375rem";
        newBtn.style.cursor = "pointer";

        box.appendChild(resumeBtn);
        box.appendChild(newBtn);
        modal.appendChild(box);
        document.body.appendChild(modal);

        const cleanup = () => modal.remove();

        resumeBtn.onclick = () => {
          cleanup();
          navigate(`/test/${response.existingSession.id}`);
        };

        newBtn.onclick = async () => {
          cleanup();
          const newRes: any = await startExam(examId, true);
          const newSession = newRes.session || newRes;
          navigate(`/test/${newSession.id}`);
        };

        return;
      }

      const session = response.session || response;
      navigate(`/test/${session.id}`);
    } catch (error: any) {
      alert("❌ Failed to start exam: " + error.message);
    }
  };

  // Inline styles
  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    backgroundColor: '#f3f4f6'
  };

  const headerStyle: React.CSSProperties = {
    backgroundColor: 'white',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
  };

  const headerInnerStyle: React.CSSProperties = {
    maxWidth: '80rem',
    margin: '0 auto',
    padding: '0 1rem'
  };

  const badgeStyle: React.CSSProperties = {
    padding: '0.25rem 0.75rem',
    borderRadius: '9999px',
    fontSize: '0.875rem',
    fontWeight: 500,
    backgroundColor: user?.subscriptionType === 'premium' ? '#fef3c7' : '#f3f4f6',
    color: user?.subscriptionType === 'premium' ? '#92400e' : '#374151'
  };

  const buttonStyle: React.CSSProperties = {
    backgroundColor: '#6b7280',
    color: 'white',
    padding: '0.5rem 1rem',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    border: 'none',
    cursor: 'pointer'
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '0.5rem',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    border: '1px solid #e5e7eb'
  };

  const examCardStyle: React.CSSProperties = {
    border: '1px solid #e5e7eb',
    borderRadius: '0.5rem',
    padding: '1rem',
    backgroundColor: '#f9fafb',
    marginBottom: '0.75rem'
  };

  const startButtonStyle: React.CSSProperties = {
    backgroundColor: '#2563eb',
    color: 'white',
    padding: '0.5rem 1rem',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    border: 'none',
    cursor: 'pointer',
    width: '100%',
    marginTop: '0.5rem'
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <header style={headerStyle}>
        <div style={headerInnerStyle}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: '1.5rem 0' 
          }}>
            <div>
              <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>
                SAT Platform
              </h1>
              <p style={{ color: '#6b7280', margin: '0.25rem 0 0 0' }}>
                Welcome back, {user?.firstName || user?.email}!
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={badgeStyle}>
                {user?.subscriptionType === 'premium' ? '⭐ Premium' : 'Free Plan'}
              </span>
              <button onClick={handleLogout} style={buttonStyle}>
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '80rem', margin: '0 auto', padding: '1.5rem 1rem' }}>
        <div style={{ 
          border: '4px dashed #e5e7eb', 
          borderRadius: '0.5rem', 
          padding: '2rem',
          backgroundColor: 'white'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', marginBottom: '1rem' }}>
              Welcome to Your SAT Prep Dashboard
            </h2>
            <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
              Ready to start your SAT preparation journey? Access practice tests, track your progress, and improve your scores.
            </p>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
              gap: '1.5rem', 
              maxWidth: '64rem', 
              margin: '0 auto' 
            }}>
              {/* Practice Tests Card */}
              <div style={cardStyle}>
                <div style={{ color: '#2563eb', fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  Practice Tests {exams.length > 0 ? `(${exams.length} available)` : ''}
                </div>
                <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
                  Take full-length adaptive SAT practice tests
                </p>
                
                {loading ? (
                  <div style={{ textAlign: 'center', color: '#6b7280', padding: '1rem' }}>
                    Loading exams...
                  </div>
                ) : exams.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#6b7280', padding: '1rem' }}>
                    No exams available
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {exams.map(exam => (
                      <div key={exam.id} style={examCardStyle}>
                        <div style={{ fontWeight: 600, color: '#111827', marginBottom: '0.25rem' }}>
                          {exam.name}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                          {exam.total_questions} questions • {exam.description}
                        </div>
                        <button 
                          style={startButtonStyle}
                          onClick={() => handleStartExam(exam.id, exam.name)}
                        >
                          Start Test
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Performance Analytics Card */}
              <div style={cardStyle}>
                <div style={{ color: '#059669', fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  Performance Analytics
                </div>
                <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
                  Track your progress and identify weak areas
                </p>
                <button onClick={() => navigate("/analytics")}
                  style={{ 
                  marginTop: '1rem', 
                  backgroundColor: '#059669', 
                  color: 'white', 
                  padding: '0.5rem 1rem', 
                  borderRadius: '0.375rem', 
                  fontSize: '0.875rem', 
                  width: '100%',
                  border: 'none',
                  cursor: 'pointer'
                }}>
                  View Analytics
                </button>
              </div>
              
              {/* Study Plan Card */}
              <div style={cardStyle}>
                <div style={{ color: '#7c3aed', fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  Study Plan
                </div>
                <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
                  Personalized recommendations based on your performance
                </p>
                <button style={{ 
                  marginTop: '1rem', 
                  backgroundColor: '#7c3aed', 
                  color: 'white', 
                  padding: '0.5rem 1rem', 
                  borderRadius: '0.375rem', 
                  fontSize: '0.875rem', 
                  width: '100%',
                  border: 'none',
                  cursor: 'pointer'
                }}>
                  View Plan
                </button>
              </div>
            </div>

            {/* Quick Stats */}
            <div style={{ 
              marginTop: '3rem', 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
              gap: '1rem', 
              maxWidth: '32rem', 
              margin: '3rem auto 0 auto' 
            }}>
              <div style={cardStyle}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827' }}>0</div>
                <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>Tests Taken</div>
              </div>
              <div style={cardStyle}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827' }}>-</div>
                <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>Best Score</div>
              </div>
              <div style={cardStyle}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827' }}>0</div>
                <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>Hours Practiced</div>
              </div>
              <div style={cardStyle}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827' }}>{exams.length}</div>
                <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>Tests Available</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;