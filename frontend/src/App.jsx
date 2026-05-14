import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Import Pages
import LoginPage from './components/LoginPage.jsx';     // ← New Login Page (with Signup tab + Forgot Password)
import SignupPage from './components/SignupPage.jsx';   // ← Keep your old separate signup if needed

import StudentLayout from './components/student/StudentLayout.jsx';
import TutorLayout from './components/tutor/TutorLayout.jsx';
import AdminLayout from './components/admin/AdminLayout.jsx';

// Protected Route
export const getUser = () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp * 1000 < Date.now()) {
      localStorage.clear();
      return null;
    }
    return payload;
  } catch {
    return null;
  }
};

const ProtectedRoute = ({ allowedRoles, element }) => {
  const user = getUser();
  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return element;
};

const App = () => (
  <BrowserRouter>
    <Routes>
      {/* Main Login Page (includes Login, Signup Tab, and Forgot Password) */}
      <Route path="/" element={<LoginPage />} />

      {/* Keep separate signup route (optional - you can remove if not needed) */}
      <Route path="/signup" element={<SignupPage />} />

      {/* Protected Routes */}
      <Route 
        path="/student/*" 
        element={
          <ProtectedRoute 
            allowedRoles={['student']} 
            element={<StudentLayout />} 
          />
        } 
      />

      <Route 
        path="/tutor/*" 
        element={
          <ProtectedRoute 
            allowedRoles={['tutor']} 
            element={<TutorLayout />} 
          />
        } 
      />

      <Route 
        path="/admin/*" 
        element={
          <ProtectedRoute 
            allowedRoles={['admin']} 
            element={<AdminLayout />} 
          />
        } 
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
);

export default App;