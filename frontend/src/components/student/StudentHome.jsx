import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Calendar, FileText, Clock, CheckCircle, XCircle, ArrowRight, Sparkles } from 'lucide-react';
import api from '../../api.js';

const StudentHome = () => {
  const [profile, setProfile] = useState(null);
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.get('/student/profile'),
      api.get('/student/applications'),
    ]).then(([p, a]) => {
      setProfile(p.data);
      setApps(a.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const user = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } })();

  // Extract display name from email like 24pw35@psgtech.ac.in → "24pw35"
  // Combined with full_name: "24pw35 - Subhaharini P"
  const rollNumber = user.email?.split('@')[0] || '';
  const displayName = profile?.full_name
    ? `${rollNumber} – ${profile.full_name}`
    : rollNumber;

  const statusCount = (s) => apps.filter(a => a.status === s).length;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-3 border-sage/30 border-t-fern rounded-full animate-spin" />
    </div>
  );

  const internTypes = [
    {
      id: 'summer',
      icon: Sun,
      title: 'Summer Internship',
      subtitle: 'Short Duration · Up to 2 months',
      desc: 'For internships during vacation period. Generates PSG summer internship permission letter.',
      color: 'from-amber-500/20 to-orange-500/10',
      border: 'border-amber-200',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      tag: '☀️ Summer',
      tagClass: 'bg-amber-100 text-amber-700',
    },
    {
      id: 'six_month',
      icon: Calendar,
      title: 'Final Semester Internship',
      subtitle: '6-Month Project · Final Year',
      desc: 'For final semester project work in industry. Generates PSG final semester undertaking form.',
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
      {/* Welcome */}
      <div className="mb-8 animate-slide-up">
        <div className="flex items-start gap-4 p-6 bg-gradient-to-br from-forest to-hunter rounded-2xl shadow-lg text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-2 right-8 text-8xl font-display font-bold text-white select-none">PSG</div>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0 border border-white/20">
            <Sparkles className="w-7 h-7 text-sage" />
          </div>
          <div>
            <p className="text-white/60 text-xs uppercase tracking-widest mb-1">Welcome back</p>
            <h1 className="text-2xl font-bold font-display mb-0.5">{displayName}</h1>
            {profile?.programme && (
              <p className="text-white/60 text-sm">{profile.programme} · {profile.department}</p>
            )}
            {profile?.cgpa && (
              <p className="text-sage text-sm mt-1">CGPA: <strong className="text-white">{profile.cgpa}</strong></p>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Total', value: apps.length, icon: FileText, color: 'text-fern', bg: 'bg-fern/10' },
          { label: 'Pending', value: statusCount('pending_tutor'), icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Approved', value: statusCount('approved'), icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Rejected', value: statusCount('rejected'), icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' },
        ].map((s, i) => (
          <div key={s.label} className="stat-card animate-slide-up" style={{ animationDelay: `${i * 0.08}s` }}>
            <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Internship type selection */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-forest mb-1">Start Your Application</h2>
        <p className="text-sm text-sage/80 mb-4">Choose your internship type to begin</p>
        <div className="grid sm:grid-cols-2 gap-4">
          {internTypes.map((type, i) => (
            <button
              key={type.id}
              onClick={() => navigate('/student/apply', { state: { duration_type: type.id } })}
              className={`card-hover text-left bg-gradient-to-br ${type.color} border-2 ${type.border} group animate-slide-up`}
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl ${type.iconBg} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                  <type.icon className={`w-6 h-6 ${type.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${type.tagClass}`}>{type.tag}</span>
                  </div>
                  <h3 className="font-bold text-forest text-base">{type.title}</h3>
                  <p className="text-xs text-hunter/60 mb-2">{type.subtitle}</p>
                  <p className="text-sm text-hunter/70">{type.desc}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 mt-4 text-fern text-sm font-semibold group-hover:gap-2 transition-all">
                Apply Now <ArrowRight className="w-4 h-4" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Recent applications */}
      {apps.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-forest">Recent Applications</h2>
            <button onClick={() => navigate('/student/applications')}
              className="text-fern hover:text-hunter text-sm font-semibold flex items-center gap-1 transition-colors">
              View All <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-3">
            {apps.slice(0, 3).map(app => (
              <div key={app.application_id} className="card flex items-center gap-4 animate-slide-in">
                <div className={`w-2 h-10 rounded-full flex-shrink-0 ${
                  app.status === 'approved' ? 'bg-emerald-400' :
                  app.status === 'rejected' ? 'bg-red-400' :
                  app.status === 'pending_tutor' ? 'bg-amber-400' : 'bg-gray-300'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-forest text-sm truncate">{app.company_name || 'Draft'}</p>
                  <p className="text-xs text-sage/80">
                    {app.duration_type === 'summer' ? '☀️ Summer' : '🎓 6-Month'} · 
                    {new Date(app.created_at).toLocaleDateString('en-IN')}
                  </p>
                </div>
                <span className={`badge ${
                  app.status === 'approved' ? 'badge-approved' :
                  app.status === 'rejected' ? 'badge-rejected' :
                  app.status === 'pending_tutor' ? 'badge-pending' : 'badge-draft'
                }`}>
                  {app.status?.replace('_', ' ')}
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
