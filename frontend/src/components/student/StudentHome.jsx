import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Calendar, FileText, Clock, CheckCircle, XCircle, ArrowRight, Sparkles, User } from 'lucide-react';
import api from '../../api.js';

const StudentHome = () => {
  const [profile, setProfile] = useState(null);
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [profileRes, appsRes] = await Promise.all([
          api.get('/student/profile'),
          api.get('/student/applications')
        ]);
        
        setProfile(profileRes.data);
        setApps(appsRes.data || []);
      } catch (err) {
        console.error("Failed to load dashboard:", err);
        setError("Failed to load data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  })();

  const rollNumber = user.email?.split('@')[0] || '';
  const displayName = profile?.full_name 
    ? `${rollNumber} – ${profile.full_name}` 
    : rollNumber || "Student";

  const statusCount = (status) => apps.filter(a => a.status === status).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-sage/30 border-t-fern rounded-full animate-spin" />
      </div>
    );
  }

  const internTypes = [
    {
      id: 'summer',
      icon: Sun,
      title: 'Summer Internship',
      subtitle: 'Short Duration • Up to 2 months',
      desc: 'For internships during vacation period. Generates official PSG summer permission letter.',
      color: 'from-amber-500/20 to-orange-500/10',
      border: 'border-amber-200',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      tag: '☀️ Summer',
      tagClass: 'bg-amber-100 text-amber-700',
    },
    {
      id: 'six-month',
      icon: Calendar,
      title: 'Final Semester Internship',
      subtitle: '6-Month Project • Final Year',
      desc: 'For final semester project work in industry. Generates official PSG undertaking form.',
      color: 'from-fern/20 to-sage/10',
      border: 'border-sage/40',
      iconBg: 'bg-fern/10',
      iconColor: 'text-fern',
      tag: '🎓 6-Month',
      tagClass: 'bg-fern/10 text-fern',
    },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Welcome Header */}
      <div className="mb-8">
        <div className="flex items-start gap-4 p-6 bg-gradient-to-br from-forest to-hunter rounded-2xl shadow-lg text-white relative overflow-hidden">
          <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0 border border-white/20">
            <Sparkles className="w-7 h-7 text-sage" />
          </div>
          <div>
            <p className="text-white/70 text-sm">Welcome back,</p>
            <h1 className="text-3xl font-bold mt-1">{displayName}</h1>
            {profile?.programme && (
              <p className="text-white/70 mt-1">{profile.programme} • {profile.department}</p>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        {[
          { label: 'Total', value: apps.length, icon: FileText, color: 'text-fern' },
          { label: 'Pending', value: statusCount('pending_tutor'), icon: Clock, color: 'text-amber-600' },
          { label: 'Approved', value: statusCount('approved'), icon: CheckCircle, color: 'text-emerald-600' },
          { label: 'Rejected', value: statusCount('rejected'), icon: XCircle, color: 'text-red-500' },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <stat.icon className={`w-8 h-8 ${stat.color} mb-3`} />
            <p className="text-3xl font-bold text-forest">{stat.value}</p>
            <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Choose Internship Type */}
      <div className="mb-10">
        <h2 className="text-xl font-bold text-forest mb-2">Start New Application</h2>
        <p className="text-sage/70 mb-6">Choose the type of internship you want to apply for</p>

        <div className="grid md:grid-cols-2 gap-6">
          {internTypes.map((type, i) => (
            <button
              key={type.id}
              onClick={() => navigate(`/student/apply/${type.id}`)}
              className={`group text-left p-8 rounded-3xl border-2 ${type.border} bg-gradient-to-br ${type.color} hover:shadow-xl transition-all duration-300`}
            >
              <div className={`w-16 h-16 rounded-2xl ${type.iconBg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                <type.icon className={`w-8 h-8 ${type.iconColor}`} />
              </div>
              <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mb-3 ${type.tagClass}`}>
                {type.tag}
              </div>
              <h3 className="text-xl font-bold text-forest mb-2">{type.title}</h3>
              <p className="text-sm text-hunter/70 mb-1">{type.subtitle}</p>
              <p className="text-sm text-hunter/70 leading-relaxed">{type.desc}</p>
              <div className="mt-6 text-fern font-semibold flex items-center gap-2 group-hover:gap-3 transition-all">
                Start Application <ArrowRight className="w-4 h-4" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Applications */}
      {apps.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-forest">Recent Applications</h2>
            <button
              onClick={() => navigate('/student/applications')}
              className="text-fern hover:text-hunter font-medium flex items-center gap-1"
            >
              View All <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            {apps.slice(0, 4).map(app => (
              <div key={app.application_id} className="bg-white rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                <div className={`w-3 h-12 rounded-full flex-shrink-0 ${
                  app.status === 'approved' ? 'bg-emerald-500' :
                  app.status === 'rejected' ? 'bg-red-500' : 'bg-amber-500'
                }`} />
                <div className="flex-1">
                  <p className="font-semibold text-forest">{app.company_name || app.company_name_manual || 'Untitled Application'}</p>
                  <p className="text-sm text-gray-500">
                    {app.duration_type === 'summer' ? 'Summer Internship' : '6-Month Internship'} • 
                    {new Date(app.created_at).toLocaleDateString('en-IN')}
                  </p>
                </div>
                <span className={`px-4 py-1.5 rounded-full text-xs font-semibold ${
                  app.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                  app.status === 'rejected' ? 'bg-red-100 text-red-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {app.status?.replace('_', ' ').toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentHome;