import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { Save, Send, Building2, Calendar, User, BookOpen, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../api.js';

const SixMonthInternshipForm = () => {
  const navigate = useNavigate();

  const [companies, setCompanies] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [profile, setProfile] = useState(null);
  const [savedId, setSavedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  const [companyMode, setCompanyMode] = useState('select');

  const [form, setForm] = useState({
    company_id: '',
    company_name_manual: '',
    role_title: '',
    company_address: '',
    work_mode: 'on_site',
    start_date: '',
    end_date: '',
    guide_name_industry: '',
    guide_contact: '',
    cgpa: '',
    semester_completed: '',
    ra_courses: '',
    pending_courses: '',
    has_declined_other: false,
    declined_company_name: '',
    declined_start_date: '',
    declined_end_date: '',
    declined_guide_name: '',
    tutor_id: '',
    duration_type: 'six_month',
  });

  const setField = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  // Load initial data
  useEffect(() => {
    Promise.all([
      api.get('/companies'),
      api.get('/tutors'),
      api.get('/student/profile')
    ]).then(([cRes, tRes, pRes]) => {
      setCompanies(cRes.data.map(co => ({ value: co.company_id, label: co.name })));
      setTutors(tRes.data.map(tu => ({ value: tu.user_id, label: tu.full_name })));
      setProfile(pRes.data);
      setField('cgpa', pRes.data?.cgpa || '');
    }).catch(err => console.error("Load error:", err));
  }, []);

  const handleSaveDraft = async () => {
    if (!form.company_id && !form.company_name_manual) {
      alert("Please select or enter a company");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/applications/draft', form);
      setSavedId(data.application_id);
      alert("✅ Draft saved successfully!");
    } catch (err) {
      alert(err.response?.data?.error || "Failed to save draft");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!savedId) return alert("Please save as draft first");
    if (!form.tutor_id) return alert("Please select a tutor");

    setSubmitLoading(true);
    try {
      await api.post('/applications/submit', { application_id: savedId });
      alert("✅ Application submitted! Tutor has been notified.");
      navigate('/student/applications');
    } catch (err) {
      alert(err.response?.data?.error || "Submission failed");
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button 
        onClick={() => navigate('/student/home')}
        className="flex items-center gap-2 text-fern mb-6 hover:underline"
      >
        <ArrowLeft className="w-5 h-5" /> Back to Dashboard
      </button>

      <h1 className="text-3xl font-bold text-forest mb-1">Final Semester Internship</h1>
      <p className="text-gray-600 mb-8">6-Month Project Work Application</p>

      {/* Company Details */}
      <div className="bg-white rounded-3xl shadow p-8 mb-6">
        <h3 className="text-xl font-semibold mb-6 flex items-center gap-3">
          <Building2 className="w-6 h-6 text-fern" /> Company Details
        </h3>

        <div className="flex gap-3 mb-5">
          {['select', 'manual'].map(m => (
            <button
              key={m}
              onClick={() => { setCompanyMode(m); setField('company_id', ''); setField('company_name_manual', ''); }}
              className={`px-5 py-2.5 rounded-2xl text-sm font-medium transition-all ${
                companyMode === m ? 'bg-fern text-white' : 'border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {m === 'select' ? 'Select from List' : 'Enter Manually'}
            </button>
          ))}
        </div>

        {companyMode === 'select' ? (
          <Select 
            options={companies} 
            onChange={opt => setField('company_id', opt?.value)} 
            placeholder="Search company..." 
          />
        ) : (
          <input 
            className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:border-fern" 
            value={form.company_name_manual} 
            onChange={e => setField('company_name_manual', e.target.value)} 
            placeholder="Enter Company Name" 
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div>
            <label className="block text-sm font-medium mb-2">Role / Position</label>
            <input className="w-full px-4 py-3 border border-gray-300 rounded-2xl" value={form.role_title} onChange={e => setField('role_title', e.target.value)} placeholder="Software Engineer Intern" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Work Mode</label>
            <select className="w-full px-4 py-3 border border-gray-300 rounded-2xl" value={form.work_mode} onChange={e => setField('work_mode', e.target.value)}>
              <option value="on_site">On-Site</option>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>
        </div>
      </div>

      {/* Duration */}
      <div className="bg-white rounded-3xl shadow p-8 mb-6">
        <h3 className="text-xl font-semibold mb-6 flex items-center gap-3">
          <Calendar className="w-6 h-6 text-fern" /> Internship Period
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">Start Date *</label>
            <input type="date" className="w-full px-4 py-3 border border-gray-300 rounded-2xl" value={form.start_date} onChange={e => setField('start_date', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">End Date *</label>
            <input type="date" className="w-full px-4 py-3 border border-gray-300 rounded-2xl" value={form.end_date} onChange={e => setField('end_date', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Industry Guide */}
      <div className="bg-white rounded-3xl shadow p-8 mb-6">
        <h3 className="text-xl font-semibold mb-6 flex items-center gap-3">
          <User className="w-6 h-6 text-fern" /> Industry Guide
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">Guide Name</label>
            <input className="w-full px-4 py-3 border border-gray-300 rounded-2xl" value={form.guide_name_industry} onChange={e => setField('guide_name_industry', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Guide Contact</label>
            <input className="w-full px-4 py-3 border border-gray-300 rounded-2xl" value={form.guide_contact} onChange={e => setField('guide_contact', e.target.value)} placeholder="Email / Phone" />
          </div>
        </div>
      </div>

      {/* Academic Details */}
      <div className="bg-white rounded-3xl shadow p-8 mb-8">
        <h3 className="text-xl font-semibold mb-6 flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-fern" /> Academic Details
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">CGPA *</label>
            <input type="number" step="0.01" className="w-full px-4 py-3 border border-gray-300 rounded-2xl" value={form.cgpa} onChange={e => setField('cgpa', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Semesters Completed</label>
            <input type="number" className="w-full px-4 py-3 border border-gray-300 rounded-2xl" value={form.semester_completed} onChange={e => setField('semester_completed', e.target.value)} />
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-medium mb-2">RA / Arrear Courses</label>
          <input className="w-full px-4 py-3 border border-gray-300 rounded-2xl" value={form.ra_courses} onChange={e => setField('ra_courses', e.target.value)} placeholder="MA101 - Mathematics, CS202 - Data Structures" />
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium mb-2">Pending Courses (Current Semester)</label>
          <input className="w-full px-4 py-3 border border-gray-300 rounded-2xl" value={form.pending_courses} onChange={e => setField('pending_courses', e.target.value)} placeholder="CS789 - Artificial Intelligence" />
        </div>
      </div>

      {/* Tutor Selection */}
      <div className="bg-white rounded-3xl shadow p-8 mb-8">
        <h3 className="text-xl font-semibold mb-6 flex items-center gap-3">
          <User className="w-6 h-6 text-fern" /> Faculty Tutor
        </h3>
        <Select 
          options={tutors} 
          onChange={opt => setField('tutor_id', opt?.value)} 
          placeholder="Select your tutor..." 
        />
      </div>

      {/* Buttons */}
      <div className="flex gap-4">
        <button 
          onClick={handleSaveDraft} 
          disabled={loading}
          className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 rounded-2xl font-semibold flex items-center justify-center gap-2 disabled:opacity-70"
        >
          <Save className="w-5 h-5" /> {loading ? 'Saving...' : 'Save Draft'}
        </button>

        <button 
          onClick={handleSubmit} 
          disabled={submitLoading || !savedId}
          className="flex-1 py-4 bg-gradient-to-r from-fern to-hunter text-white rounded-2xl font-semibold flex items-center justify-center gap-2 disabled:opacity-70"
        >
          <Send className="w-5 h-5" /> Submit for Tutor Approval
        </button>
      </div>
    </div>
  );
};

export default SixMonthInternshipForm;