import React, { useEffect, useState } from 'react';
import { Users, FileText, CheckCircle, Clock, Building2, XCircle, TrendingUp, Shield } from 'lucide-react';
import api from '../../api.js';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/admin/stats')
      .then(({ data }) => {
        setStats(data);
        setError(null);
      })
      .catch(err => {
        console.error(err);
        setError("Failed to load statistics");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="w-9 h-9 border-2 border-sage/30 border-t-fern rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-600">
        ⚠️ {error}. Please try refreshing.
      </div>
    );
  }

  const approvalRate = stats?.total_applications > 0 
    ? Math.round((stats.approved / stats.total_applications) * 100) 
    : 0;

  const statCards = [
    { label: 'Total Students', value: stats?.total_students || 0, icon: Users, color: 'text-fern' },
    { label: 'Total Tutors', value: stats?.total_tutors || 0, icon: Shield, color: 'text-hunter' },
    { label: 'Total Applications', value: stats?.total_applications || 0, icon: FileText, color: 'text-blue-600' },
    { label: 'Approved', value: stats?.approved || 0, icon: CheckCircle, color: 'text-emerald-600' },
    { label: 'Pending Review', value: stats?.pending || 0, icon: Clock, color: 'text-amber-600' },
    { label: 'Rejected', value: stats?.rejected || 0, icon: XCircle, color: 'text-red-500' },
    { label: 'Companies', value: stats?.total_companies || 0, icon: Building2, color: 'text-purple-600' },
    { 
      label: 'Approval Rate', 
      value: `${approvalRate}%`, 
      icon: TrendingUp, 
      color: 'text-teal-600' 
    },
  ];

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto page-enter">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-display text-forest">Admin Dashboard</h1>
        <p className="text-sage/70 mt-1">Real-time overview of the Internship Portal</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        {statCards.map((stat, i) => (
          <div 
            key={i}
            className="stat-card border border-sage/20 p-6 hover:shadow-md transition-all"
            style={{ animationDelay: `${i * 0.04}s` }}
          >
            <div className="flex items-center justify-between mb-4">
              <stat.icon className={`w-8 h-8 ${stat.color}`} />
            </div>
            <p className={`text-4xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-sm text-gray-500 mt-1 font-medium">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-4">
        {[
          { 
            title: 'Manage Applications', 
            desc: 'View, search & take action on all submissions', 
            link: '/admin/applications', 
            icon: FileText 
          },
          { 
            title: 'Manage Users', 
            desc: 'Students, Tutors & Account Management', 
            link: '/admin/users', 
            icon: Users 
          },
          { 
            title: 'Company Directory', 
            desc: 'Add / Edit approved companies', 
            link: '/admin/companies', 
            icon: Building2 
          },
        ].map((item, i) => (
          <a
            key={i}
            href={item.link}
            className="card-hover group p-6 bg-white rounded-3xl border border-sage/20 hover:border-fern/30 transition-all"
          >
            <item.icon className="w-10 h-10 text-fern mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="font-semibold text-lg text-forest mb-1">{item.title}</h3>
            <p className="text-sm text-hunter/60">{item.desc}</p>
          </a>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;