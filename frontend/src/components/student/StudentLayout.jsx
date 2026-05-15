import React, { useState } from 'react';
import { Routes, Route, NavLink, useNavigate, Navigate } from 'react-router-dom';
import { Home, FileText, ClipboardList, LogOut, Leaf, Menu, X, ChevronRight, User } from 'lucide-react';
import StudentHome from './StudentHome.jsx';
import SummerInternshipForm from './SummerInternshipForm.jsx';
import SixMonthInternshipForm from './SixMonthInternshipForm.jsx';
import MyApplications from './MyApplications.jsx';

const StudentLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const user = (() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
  })();

  const logout = () => {
    localStorage.clear();
    navigate('/');
  };

  const navItems = [
    { to: '/student/home', icon: Home, label: 'Dashboard' },
    { to: '/student/apply', icon: FileText, label: 'Apply / Form' },
    { to: '/student/applications', icon: ClipboardList, label: 'My Applications' },
  ];

  const Sidebar = ({ mobile = false }) => (
    <aside className={`flex flex-col h-full ${mobile ? '' : 'w-64'}`}
      style={{ background: 'linear-gradient(180deg, #344E41 0%, #3A5A40 60%, #588157 100%)' }}>
      
      {/* Logo */}
      <div className="px-5 py-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center border border-white/20 flex-shrink-0">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-white font-bold text-sm leading-tight truncate">PSG Tech</p>
            <p className="text-white/50 text-[10px] uppercase tracking-wider">Internship Portal</p>
          </div>
        </div>
      </div>

      {/* User info */}
      <div className="px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-3 p-3 bg-white/10 rounded-xl">
          <div className="w-9 h-9 rounded-full bg-sage/40 flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm truncate">{user.full_name || 'Student'}</p>
            <p className="text-white/50 text-xs truncate">{user.email || ''}</p>
            {user.roll_number && (
              <p className="text-sage text-[10px] font-mono mt-0.5">{user.roll_number}</p>
            )}
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            onClick={() => mobile && setSidebarOpen(false)}>
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{label}</span>
            <ChevronRight className="w-3.5 h-3.5 opacity-40" />
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-white/10">
        <button onClick={logout}
          className="w-full sidebar-link text-red-300 hover:text-red-200 hover:bg-red-500/10">
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-bone">
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-50 w-72 flex flex-col">
            <button onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 text-white/60 hover:text-white z-50">
              <X className="w-5 h-5" />
            </button>
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-forest text-white shadow-md">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg hover:bg-white/10">
            <Menu className="w-5 h-5" />
          </button>
          <Leaf className="w-5 h-5 text-sage" />
          <span className="font-semibold text-sm">Internship Portal</span>
        </div>

        <main className="flex-1 overflow-y-auto">
          <div className="page-enter">
            <Routes>
              <Route path="home" element={<StudentHome />} />
              <Route path="apply" element={<InternshipForm />} />
              <Route path="applications" element={<MyApplications />} />
              <Route path="*" element={<Navigate to="home" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
};

export default StudentLayout;