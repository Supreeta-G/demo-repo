import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Import Pages & Layouts
import LoginPage from './components/LoginPage.jsx';
import SignupPage from './components/SignupPage.jsx';

// Student Forms
import SummerInternshipForm from './components/student/SummerInternshipForm.jsx';
import SixMonthInternshipForm from './components/student/SixMonthInternshipForm.jsx';

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
      {/* Public Routes */}
      <Route path="/" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* Student Application Routes */}
      {/* <Route path="/student/apply/summer" element={
        <ProtectedRoute allowedRoles={['student']} element={<SummerInternshipForm />} />
      } />
      
      <Route path="/student/apply/six-month" element={
        <ProtectedRoute allowedRoles={['student']} element={<SixMonthInternshipForm />} />
      } /> */}

      {/* Protected Layout Routes */}
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