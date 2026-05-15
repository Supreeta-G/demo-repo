import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { Save, Send, Building2, Calendar, User, Phone, MapPin, Award, ArrowLeft, Plus } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api.js';

const SummerInternshipForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');

  const [companies, setCompanies] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [profile, setProfile] = useState(null);
  const [savedId, setSavedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  const [isLocked, setIsLocked] = useState(false);
  const [lockMessage, setLockMessage] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const [form, setForm] = useState({
    company_id: '',
    role_title: '',
    intern_type: 'industry',
    company_address: '',
    company_city: '',
    company_state: '',
    company_country: 'India',
    company_phone: '',
    duration_type: 'summer',
    work_mode: 'on_site',
    how_obtained: '',
    start_date: '',
    end_date: '',
    attendance_days: '',
    guide_name_industry: '',
    guide_contact: '',
    stipend: '',
    cgpa: '',
    semester_completed: '',
    tutor_id: '',
    tutor_email: '',
  });

  const setField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  // Load Data (Companies, Tutors, Profile)
  useEffect(() => {
    Promise.all([
      api.get('/companies'),
      api.get('/tutors'),
      api.get('/student/profile')
    ]).then(([cRes, tRes, pRes]) => {
      setCompanies(cRes.data.map(co => ({
        value: co.company_id,
        label: co.name,
        address: co.address || '',
        city: co.city || '',
        state: co.state || ''
      })));
      setTutors(tRes.data.map(tu => ({ value: tu.user_id, label: tu.full_name })));
      setProfile(pRes.data);
      setField('cgpa', pRes.data?.cgpa || '');
    }).catch(err => console.error(err));
  }, []);

  // Load Existing Application when editing (This is the main fix)
  useEffect(() => {
    if (editId) {
      setIsEditing(true);
      api.get(`/applications/${editId}`)
        .then(({ data }) => {
          setSavedId(data.application_id);
          setIsLocked(data.locked || false);

          // Fill the form with existing data
          setForm({
            company_id: data.company_id || '',
            role_title: data.role_title || '',
            intern_type: data.intern_type || 'industry',
            company_address: data.company_address || '',
            company_city: data.company_city || '',
            company_state: data.company_state || '',
            company_country: data.company_country || 'India',
            company_phone: data.company_phone || '',
            duration_type: data.duration_type || 'summer',
            work_mode: data.work_mode || 'on_site',
            how_obtained: data.how_obtained || '',
            start_date: data.start_date ? data.start_date.split('T')[0] : '',
            end_date: data.end_date ? data.end_date.split('T')[0] : '',
            attendance_days: data.attendance_days || '',
            guide_name_industry: data.guide_name_industry || '',
            guide_contact: data.guide_contact || '',
            stipend: data.stipend || '',
            cgpa: data.cgpa || '',
            semester_completed: data.semester_completed || '',
            tutor_id: data.tutor_id || '',
            tutor_email: data.tutor_email || '',
          });
        })
        .catch(err => console.error("Failed to load application for edit", err));
    }
  }, [editId]);

  // Auto attendance calculation
  useEffect(() => {
    if (form.start_date && form.end_date) {
      const diff = Math.ceil((new Date(form.end_date) - new Date(form.start_date)) / (1000 * 60 * 60 * 24));
      if (diff > 0) setField('attendance_days', diff);
    }
  }, [form.start_date, form.end_date]);

  const handleSaveDraft = async () => {
    if (isLocked && !isEditing) return alert("This form is locked.");
    if (!form.company_id) return alert("Please select a company");
    if (!form.tutor_email) return alert("Please enter tutor email");

    setLoading(true);
    try {
      const { data } = await api.post('/applications/draft', form);
      setSavedId(data.application_id);
      alert(`✅ Draft saved successfully!\n\nApplication ID: ${data.application_id}`);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to save draft");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (isLocked && !isEditing) return alert("This form is locked.");
    if (!savedId) return alert("❌ Please click 'Save Draft' first!");
    if (!form.tutor_email) return alert("❌ Please enter Tutor Email");

    setSubmitLoading(true);
    try {
      await api.post('/applications/submit', { application_id: savedId });
      alert("✅ Application Submitted Successfully!\nTutor has been notified.\nForm is now locked.");
      navigate('/student/applications');
    } catch (err) {
      alert(err.response?.data?.error || "Submission failed. Check console (F12).");
    } finally {
      setSubmitLoading(false);
    }
  };

  const requestNewCompany = () => {
    const name = prompt("Enter the new company name to request from Admin:");
    if (name) {
      alert(`✅ Request for "${name}" has been sent to Admin.`);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button onClick={() => navigate('/student/home')} className="flex items-center gap-2 text-fern mb-6 hover:underline">
        <ArrowLeft className="w-5 h-5" /> Back to Dashboard
      </button>

      <h1 className="text-3xl font-bold text-forest mb-1">
        {isEditing ? "Edit Summer Internship Application" : "Summer Internship Application"}
      </h1>
      <p className="text-gray-600 mb-8">Short Duration / Vacation Period</p>

      {isLocked && !isEditing && (
        <div className="bg-amber-100 border border-amber-400 text-amber-700 px-4 py-3 rounded-xl mb-6">
          ⚠️ <strong>This application is locked.</strong> {lockMessage || "You cannot edit until the tutor rejects it or admin unlocks."}
        </div>
      )}

      {/* Company Details */}
      <div className="bg-white rounded-3xl shadow p-8 mb-6">
        <h3 className="text-xl font-semibold mb-6 flex items-center gap-3">
          <Building2 className="w-6 h-6 text-fern" /> Company Details
        </h3>
        <div className="flex justify-between mb-3">
          <label className="font-medium">Select Company *</label>
          <button onClick={requestNewCompany} className="text-blue-600 hover:underline text-sm flex items-center gap-1" disabled={isLocked && !isEditing}>
            <Plus className="w-4 h-4" /> Request New Company
          </button>
        </div>
        <Select
          options={companies}
          onChange={opt => {
            setField('company_id', opt?.value);
            setField('company_address', opt?.address || '');
            setField('company_city', opt?.city || '');
            setField('company_state', opt?.state || '');
          }}
          placeholder="Search company..."
          isDisabled={isLocked && !isEditing}
        />
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">Role / Position *</label>
            <input className="w-full px-4 py-3 border border-gray-300 rounded-2xl" value={form.role_title} onChange={e => setField('role_title', e.target.value)} placeholder="e.g. Software Engineering Intern" disabled={isLocked && !isEditing} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">How did you get this offer?</label>
            <select className="w-full px-4 py-3 border border-gray-300 rounded-2xl" value={form.how_obtained} onChange={e => setField('how_obtained', e.target.value)} disabled={isLocked && !isEditing}>
              <option value="">Select Option</option>
              <option value="campus">Campus Placement</option>
              <option value="referral">Referral</option>
              <option value="tutor">Through Faculty/Tutor</option>
              <option value="online">Online Application</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
        <div className="mt-6">
          <label className="block text-sm font-medium mb-2">Full Company Address *</label>
          <textarea className="w-full px-4 py-3 border border-gray-300 rounded-2xl h-24" value={form.company_address} onChange={e => setField('company_address', e.target.value)} placeholder="Full address as per offer letter" disabled={isLocked && !isEditing} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <div>
            <label className="block text-sm font-medium mb-2">City</label>
            <input className="w-full px-4 py-3 border border-gray-300 rounded-2xl" value={form.company_city} onChange={e => setField('company_city', e.target.value)} disabled={isLocked && !isEditing} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">State</label>
            <input className="w-full px-4 py-3 border border-gray-300 rounded-2xl" value={form.company_state} onChange={e => setField('company_state', e.target.value)} disabled={isLocked && !isEditing} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Phone Number</label>
            <input className="w-full px-4 py-3 border border-gray-300 rounded-2xl" value={form.company_phone} onChange={e => setField('company_phone', e.target.value)} placeholder="Company Contact" disabled={isLocked && !isEditing} />
          </div>
        </div>
      </div>

      {/* Internship Type & Period */}
      <div className="bg-white rounded-3xl shadow p-8 mb-6">
        <h3 className="text-xl font-semibold mb-6 flex items-center gap-3">
          <Calendar className="w-6 h-6 text-fern" /> Internship Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">Type of Internship</label>
            <select className="w-full px-4 py-3 border border-gray-300 rounded-2xl" value={form.intern_type} onChange={e => setField('intern_type', e.target.value)} disabled={isLocked && !isEditing}>
              <option value="industry">Industry Internship</option>
              <option value="research">Research Internship</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Stipend (if any)</label>
            <input className="w-full px-4 py-3 border border-gray-300 rounded-2xl" value={form.stipend} onChange={e => setField('stipend', e.target.value)} placeholder="₹15,000 / month" disabled={isLocked && !isEditing} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div>
            <label className="block text-sm font-medium mb-2">Start Date *</label>
            <input type="date" className="w-full px-4 py-3 border border-gray-300 rounded-2xl" value={form.start_date} onChange={e => setField('start_date', e.target.value)} disabled={isLocked && !isEditing} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">End Date *</label>
            <input type="date" className="w-full px-4 py-3 border border-gray-300 rounded-2xl" value={form.end_date} onChange={e => setField('end_date', e.target.value)} disabled={isLocked && !isEditing} />
          </div>
        </div>
        {form.attendance_days && (
          <p className="mt-4 text-emerald-600 font-medium">Expected Attendance: {form.attendance_days} days</p>
        )}
      </div>

      {/* Industry Guide & Academic */}
      <div className="bg-white rounded-3xl shadow p-8 mb-8">
        <h3 className="text-xl font-semibold mb-6 flex items-center gap-3">
          <User className="w-6 h-6 text-fern" /> Industry Guide & Academic Info
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">Guide Name *</label>
            <input className="w-full px-4 py-3 border border-gray-300 rounded-2xl" value={form.guide_name_industry} onChange={e => setField('guide_name_industry', e.target.value)} disabled={isLocked && !isEditing} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Guide Contact</label>
            <input className="w-full px-4 py-3 border border-gray-300 rounded-2xl" value={form.guide_contact} onChange={e => setField('guide_contact', e.target.value)} placeholder="Email / Mobile" disabled={isLocked && !isEditing} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div>
            <label className="block text-sm font-medium mb-2">CGPA *</label>
            <input type="number" step="0.01" className="w-full px-4 py-3 border border-gray-300 rounded-2xl" value={form.cgpa} onChange={e => setField('cgpa', e.target.value)} disabled={isLocked && !isEditing} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Semesters Completed</label>
            <input type="number" className="w-full px-4 py-3 border border-gray-300 rounded-2xl" value={form.semester_completed} onChange={e => setField('semester_completed', e.target.value)} disabled={isLocked && !isEditing} />
          </div>
        </div>
      </div>

      {/* Tutor Selection + Email */}
      <div className="bg-white rounded-3xl shadow p-8 mb-8">
        <h3 className="text-xl font-semibold mb-6 flex items-center gap-3">
          <User className="w-6 h-6 text-fern" /> Faculty Tutor
        </h3>
        <Select
          options={tutors}
          onChange={opt => setField('tutor_id', opt?.value)}
          placeholder="Select your tutor..."
          isDisabled={isLocked && !isEditing}
        />
      </div>

      <div className="bg-white rounded-3xl shadow p-8 mb-8">
        <h3 className="text-xl font-semibold mb-6 flex items-center gap-3">
          <User className="w-6 h-6 text-fern" /> Faculty Tutor Details
        </h3>
        <label className="block text-sm font-medium mb-2">Tutor Email ID *</label>
        <input
          type="email"
          className="w-full px-4 py-3 border border-gray-300 rounded-2xl"
          value={form.tutor_email}
          onChange={e => setField('tutor_email', e.target.value)}
          placeholder="tutorname@psgtech.ac.in"
          disabled={isLocked && !isEditing}
        />
        <p className="text-xs text-gray-500 mt-2">The application will be sent to this email</p>
      </div>

      <div className="flex gap-4">
        <button onClick={handleSaveDraft} disabled={loading || (isLocked && !isEditing)} className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 rounded-2xl font-semibold">
          {loading ? 'Saving...' : 'Save Draft'}
        </button>
        <button onClick={handleSubmit} disabled={submitLoading || !savedId || (isLocked && !isEditing)} className="flex-1 py-4 bg-gradient-to-r from-fern to-hunter text-white rounded-2xl font-semibold">
          Submit for Tutor Approval
        </button>
      </div>
    </div>
  );
};

export default SummerInternshipForm;