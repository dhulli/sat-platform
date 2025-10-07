import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';

const TestProtectedRoutes: React.FC = () => {
  const { user, token } = useAuth();
  
  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>🔐 Protected Routes Test</h2>
      <div style={{ marginBottom: '10px' }}>
        <strong>User:</strong> {user ? JSON.stringify(user) : 'null'}
      </div>
      <div style={{ marginBottom: '10px' }}>
        <strong>Token:</strong> {token ? '***' + token.slice(-10) : 'null'}
      </div>
      <div style={{ marginBottom: '10px' }}>
        <strong>Local Storage Token:</strong> {localStorage.getItem('sat_token') ? 'PRESENT' : 'MISSING'}
      </div>
    </div>
  );
};

export const TestApp: React.FC = () => {
  return (
    <AuthProvider>
      <TestProtectedRoutes />
    </AuthProvider>
  );
};