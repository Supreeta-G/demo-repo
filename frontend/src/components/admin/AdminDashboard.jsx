import React, { useEffect, useState } from 'react';
import { Users, FileText, CheckCircle, Clock, Building2, XCircle, TrendingUp, Shield } from 'lucide-react';
import api from '../../api.js';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/stats').then(({ data }) => setStats(data)).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <span className="w-9 h-9 border-2 border-sage/30 border-t-fern rounded-full animate-spin" />
    </div>
  );

  const statCards = [
    { label: 'Total Students', value: stats?.total_students || 0, icon: Users, color: 'text-fern', bg: 'bg-fern/10', border: 'border-fern/20' },
    { label: 'Total Tutors', value: stats?.total_tutors || 0, icon: Shield, color: 'text-hunter', bg: 'bg-hunter/10', border: 'border-hunter/20' },
    { label: 'Total Applications', value: stats?.total_applications || 0, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
    { label: 'Approved', value: stats?.approved || 0, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    { label: 'Pending Review', value: stats?.pending || 0, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
    { label: 'Rejected', value: stats?.rejected || 0, icon: XCircle, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-200' },
    { label: 'Companies', value: stats?.total_companies || 0, icon: Building2, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
    {
      label: 'Approval Rate',
      value: stats?.total_applications > 0 ? `${Math.round((stats.approved / stats.total_applications) * 100)}%` : '—',
      icon: TrendingUp,
      color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200'
    },
  ];

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto page-enter">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display text-forest">Admin Dashboard</h1>
        <p className="text-sage/80 text-sm mt-1">Overview of PSG Tech Internship Portal activity</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {statCards.map((s, i) => (
          <div key={s.label}
            className={`stat-card border ${s.border} animate-slide-up`}
            style={{ animationDelay: `${i * 0.05}s` }}>
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="grid sm:grid-cols-2 gap-4">
        {[
          { title: 'Manage Applications', desc: 'View, filter and manage all student applications', link: '/admin/applications', icon: FileText, color: 'from-fern/20 to-sage/10' },
          { title: 'Manage Users', desc: 'View students, tutors; create new accounts', link: '/admin/users', icon: Users, color: 'from-hunter/20 to-forest/10' },
          { title: 'Manage Companies', desc: 'Add or manage company listings for students', link: '/admin/companies', icon: Building2, color: 'from-purple-400/20 to-purple-300/10' },
        ].map((q, i) => (
          <a key={q.title} href={q.link}
            className={`card-hover bg-gradient-to-br ${q.color} border border-sage/20 group animate-slide-up block`}
            style={{ animationDelay: `${i * 0.08 + 0.3}s` }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-fern/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <q.icon className="w-5 h-5 text-fern" />
              </div>
              <h3 className="font-bold text-forest">{q.title}</h3>
            </div>
            <p className="text-sm text-hunter/60">{q.desc}</p>
          </a>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
