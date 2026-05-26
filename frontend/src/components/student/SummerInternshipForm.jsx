import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { Save, Send, Building2, Calendar, User, ArrowLeft, Plus, FileDown } from 'lucide-react';
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
   const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  const [isLocked, setIsLocked] = useState(false);

  const [parentPermissionUrl, setParentPermissionUrl] = useState('');

  const [form, setForm] = useState({
    company_id: '',
    //company_name_manual: '',
    offer_letter_url: '',
    parent_permission_url: '',
    role_title: '',
    intern_type: 'industry',
    how_obtained: '',
    company_address: '',
    company_city: '',
    company_state: '',
    company_country: 'India',
    company_phone: '',
    duration_type: 'summer',
    work_mode: 'on_site',
    start_date: '',
    end_date: '',
    attendance_days: '',
    guide_allocated: false,
    guide_name_industry: '',
    guide_contact: '',
    stipend: '',
    cgpa: '',
    semester_completed: '',
    tutor_id: '',
    tutor_email: '',
    tutor_name: '',
  });

  const setField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

// Load Companies, Tutors, Profile
useEffect(() => {
  Promise.all([
    api.get('/companies'),
    api.get('/tutors'),
    api.get('/student/profile')
  ]).then(([cRes, tRes, pRes]) => {
    setCompanies(cRes.data.map(co => ({
      value: co.company_id,
      label: co.name
    })));
    setTutors(tRes.data.map(tu => ({ value: tu.user_id, label: tu.full_name })));
    setProfile(pRes.data);

    // ✅ Only set CGPA from profile if NOT in edit mode
    if (!editId) {
      setField('cgpa', pRes.data?.cgpa || '');
    }
  }).catch(err => console.error(err));
}, [editId]);   // ← Also added editId as dependency

// Load Existing Application when editing
// Load Existing Application if editing
useEffect(() => {
  if (editId) {
    setIsEditing(true);
    api.get(`/applications/${editId}`)
      .then(({ data }) => {
        setSavedId(data.application_id);
        setIsLocked(data.locked || false);

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
          guide_allocated: data.guide_allocated || false,
          guide_name_industry: data.guide_name_industry || '',
          guide_contact: data.guide_contact || '',
          stipend: data.stipend || data.stipend_amount || '',
          cgpa: data.cgpa || '',
          semester_completed: data.semester_completed || '',
          tutor_id: data.tutor_id || '',
          tutor_name: data.tutor_name || '',  
          tutor_email: data.tutor_email || '',
          parent_permission_url: data.parent_permission_url || '',
          offer_letter_url: data.offer_letter_url || '',
        });
      })
      .catch(err => console.error("Failed to load application for edit", err));
  }
}, [editId]);
  // Auto attendance calculation
 // Auto attendance calculation — excludes Saturdays & Sundays
useEffect(() => {
  if (form.start_date && form.end_date) {
    const start = new Date(form.start_date);
    const end   = new Date(form.end_date);
    if (end <= start) return;

    let workingDays = 0;
    const current = new Date(start);

    while (current <= end) {
      const day = current.getDay(); // 0 = Sun, 6 = Sat
      if (day !== 0 && day !== 6) workingDays++;
      current.setDate(current.getDate() + 1);
    }

    setField('attendance_days', workingDays);
  }
}, [form.start_date, form.end_date]);

 // Updated Save Draft - Now allows upload first
const handleSaveDraft = async () => {
  if (isLocked && !isEditing) return alert("This form is locked.");

  // ====================== MANDATORY FIELD VALIDATION ======================
  if (!form.role_title || form.role_title.trim() === '') {
    return alert("Role / Position is required");
  }
  if (!form.company_address || form.company_address.trim() === '') {
    return alert("Full Company Address is required");
  }
  if (!form.intern_type) {
    return alert("Type of Internship is required");
  }
  if (!form.stipend || form.stipend.trim() === '') {
    return alert("Stipend field is required (enter 0 if no stipend)");
  }
  if (!form.start_date) {
    return alert("Start Date is required");
  }
  if (!form.end_date) {
    return alert("End Date is required");
  }
  if (!form.company_city) {
    return alert("City is required");
  }
  if (!form.company_state) {
    return alert("State is required");
  }
  if (!form.company_country) {
    return alert("Country is required");
  }
  if (!form.company_phone || form.company_phone.length !== 10) {
    return alert("Phone number must be exactly 10 digits");
  }
  if (!form.tutor_name?.trim() && !form.tutor_id) {
    return alert("Please enter Tutor Name");
  }
  if (!form.tutor_email) {
    return alert("Please enter tutor email");
  }
  if (!form.offer_letter_url) {
    return alert("Please upload Offer Letter");
  }
  if (!form.parent_permission_url) {
    return alert("Please upload Parent's Permission Letter");
  }

  // ✅ NEW: Conditional Guide Name Validation
  if (form.guide_allocated && (!form.guide_name_industry || form.guide_name_industry.trim() === '')) {
    return alert("Guide Name is required when Guide is Allocated");
  }

  // CGPA and Semester (always required)
  if (!form.cgpa) {
    return alert("CGPA is required");
  }
  if (!form.semester_completed) {
    return alert("Semester Completed is required");
  }

  setLoading(true);
  try {
    const payload = {
      ...form,
      application_id: savedId || editId,
      status: 'draft',
      locked: false
    };

    const { data } = await api.post('/applications/draft', payload);
    
    if (data.application_id) {
      setSavedId(data.application_id);
    }

    alert(`✅ Draft ${isEditing ? 'Updated' : 'Saved'} Successfully!`);
  } catch (err) {
    alert(err.response?.data?.error || "Failed to save draft");
  } finally {
    setLoading(false);
  }
};

  const handleSubmit = async () => {
  if (isLocked && !isEditing) return alert("This form is locked.");

  // Use either savedId or editId
  const currentAppId = savedId || editId;
  if (!currentAppId) {
    return alert("Please click 'Save Draft' first!");
  }

  // ====================== ALL MANDATORY VALIDATION ======================
  if (!form.role_title?.trim()) return alert("Role / Position is required");
  if (!form.company_address?.trim()) return alert("Full Company Address is required");
  if (!form.intern_type) return alert("Type of Internship is required");
  if (!form.stipend?.trim()) return alert("Stipend field is required (enter 0 if none)");
  if (!form.start_date) return alert("Start Date is required");
  if (!form.end_date) return alert("End Date is required");
  if (form.guide_allocated && (!form.guide_name_industry || form.guide_name_industry.trim() === '')) {
  return alert("Guide Name is required when Guide is Allocated");}
  if (!form.cgpa) return alert("CGPA is required");
  if (!form.semester_completed) return alert("Semester Completed is required");
  if (!form.company_city) return alert("City is required");
  if (!form.company_state) return alert("State is required");
  if (!form.company_country) return alert("Country is required");
  if (!form.company_phone || form.company_phone.length !== 10) {
    return alert("Phone number must be exactly 10 digits");
  }
  if (!form.tutor_name?.trim() && !form.tutor_id) {
    return alert("Please enter Tutor Name or select a tutor");
  }
  if (!form.tutor_email) return alert("Tutor Email is required");
  if (!form.offer_letter_url) return alert("Please upload Offer Letter");
  if (!form.parent_permission_url) return alert("Please upload Parent's Permission Letter");  
  setSubmitLoading(true);
  try {
    await api.post('/applications/submit', { 
      application_id: savedId || editId,  // ← Keep same ID
      stipend_amount: form.stipend,
      tutor_name: form.tutor_name,
  tutor_email: form.tutor_email
         
    });
    
    alert("✅ Application Submitted Successfully!\nTutor has been notified.");
    navigate('/student/applications');
  } catch (err) {
    alert(err.response?.data?.error || "Submission failed.");
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
const handleOfferLetterUpload = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    return alert("File size must be less than 5MB");
  }

  const formData = new FormData();
  formData.append('offer_letter', file);

  if (savedId || editId) {
    formData.append('application_id', savedId || editId);
  }

  try {
    const { data } = await api.post('/applications/upload-offer', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    setForm(prev => ({ ...prev, offer_letter_url: data.url }));
    alert("✅ Offer Letter uploaded successfully!");
  } catch (err) {
    console.error(err);
    alert(err.response?.data?.error || "Upload failed");
  }
};
const handleParentPermissionUpload = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    return alert("File size must be less than 5MB");
  }

  const formData = new FormData();
  formData.append('parent_permission', file);

  // If we have savedId or editId, send it. Otherwise backend will handle temp ID
  if (savedId || editId) {
    formData.append('application_id', savedId || editId);
  }

  try {
    const { data } = await api.post('/applications/upload-parent-permission', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    // Store the uploaded URL
    setForm(prev => ({ ...prev, parent_permission_url: data.url }));

    alert("✅ Parent Permission Letter uploaded successfully!");
  } catch (err) {
    console.error(err);
    alert(err.response?.data?.error || "Failed to upload Parent Permission Letter");
  }
};;
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
          ⚠️ This application is locked. You can edit because it was rejected.
        </div>
      )}

      {/* Company Details */}
      <div className="bg-white rounded-3xl shadow p-8 mb-6">
        <h3 className="text-xl font-semibold mb-6 flex items-center gap-3">
          <Building2 className="w-6 h-6 text-fern" /> Company Details
        </h3>

        <div className="flex justify-between mb-3">
          <label className="font-medium">Select Company <span className="text-red-500">*</span></label>
          <button onClick={requestNewCompany} className="text-blue-600 hover:underline text-sm flex items-center gap-1" disabled={isLocked && !isEditing}>
            <Plus className="w-4 h-4" /> Request New Company
          </button>
        </div>

        <Select 
          options={companies} 
          value={companies.find(c => c.value === form.company_id) || null}
          onChange={opt => {
            setField('company_id', opt?.value || null);
            setField('company_name_manual', '');
          }} 
          placeholder="Search company..." 
          isDisabled={isLocked && !isEditing}
        />

        {/* {!form.company_id && (
          <input 
            className="w-full px-4 py-3 border border-gray-300 rounded-2xl mt-3" 
            value={form.company_name_manual} 
            onChange={e => setField('company_name_manual', e.target.value)} 
            placeholder="Enter Company Name Manually" 
            disabled={isLocked && !isEditing}
          />
        )} */}

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">Role / Position <span className="text-red-500">*</span></label>
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
          <div className="mt-6">
  <label className="block text-sm font-medium mb-2">Work Mode <span className="text-red-500">*</span></label>
  <select 
    className="w-full px-4 py-3 border border-gray-300 rounded-2xl" 
    value={form.work_mode} 
    onChange={e => setField('work_mode', e.target.value)} 
    disabled={isLocked && !isEditing}
  >
    <option value="on_site">On-Site</option>
    <option value="remote">Remote</option>
    <option value="hybrid">Hybrid</option>
  </select>
</div>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-medium mb-2">Full Company Address <span className="text-red-500">*</span></label>
          <textarea className="w-full px-4 py-3 border border-gray-300 rounded-2xl h-24" value={form.company_address} onChange={e => setField('company_address', e.target.value)} placeholder="Full address as per offer letter" disabled={isLocked && !isEditing} />
        </div>

<div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
    <div>
      <label className="block text-sm font-medium mb-2">City <span className="text-red-500">*</span></label>
      <input className="w-full px-4 py-3 border border-gray-300 rounded-2xl" 
             value={form.company_city} 
             onChange={e => setField('company_city', e.target.value)} 
             required 
             disabled={isLocked && !isEditing} />
    </div>
    <div>
      <label className="block text-sm font-medium mb-2">State <span className="text-red-500">*</span></label>
      <input className="w-full px-4 py-3 border border-gray-300 rounded-2xl" 
             value={form.company_state} 
             onChange={e => setField('company_state', e.target.value)} 
             required 
             disabled={isLocked && !isEditing} />
    </div>
    <div>
      <label className="block text-sm font-medium mb-2">Country <span className="text-red-500">*</span></label>
      <input className="w-full px-4 py-3 border border-gray-300 rounded-2xl" 
             value={form.company_country} 
             onChange={e => setField('company_country', e.target.value)} 
             placeholder="India" 
             required 
             disabled={isLocked && !isEditing} />
    </div>
  </div>

  <div className="mt-6">
    <label className="block text-sm font-medium mb-2">Phone Number <span className="text-red-500">*</span></label>
    <input 
      type="tel" 
      className="w-full px-4 py-3 border border-gray-300 rounded-2xl" 
      value={form.company_phone} 
      onChange={e => setField('company_phone', e.target.value)} 
      placeholder="9876543210" 
      maxLength={10}
      disabled={isLocked && !isEditing} 
    />
  </div>
      </div>

      {/* Internship Type & Period */}
      <div className="bg-white rounded-3xl shadow p-8 mb-6">
        <h3 className="text-xl font-semibold mb-6 flex items-center gap-3">
          <Calendar className="w-6 h-6 text-fern" /> Internship Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">Type of Internship<span className="text-red-500">*</span></label>
            <select className="w-full px-4 py-3 border border-gray-300 rounded-2xl" value={form.intern_type} onChange={e => setField('intern_type', e.target.value)} disabled={isLocked && !isEditing}>
              <option value="industry">Industry Internship</option>
              <option value="research">Research Internship</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Stipend (if any)<span className="text-red-500">*</span></label>
            <input className="w-full px-4 py-3 border border-gray-300 rounded-2xl" value={form.stipend} onChange={e => setField('stipend', e.target.value)} placeholder="₹15,000 / month" disabled={isLocked && !isEditing} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium mb-2">Start Date *</label>
            <input 
              type="date" 
              className="w-full px-4 py-3 border border-gray-300 rounded-2xl" 
              value={form.start_date} 
              onChange={e => setField('start_date', e.target.value)} 
              min={new Date().toISOString().split('T')[0]}   // ← Disable past dates
              disabled={isLocked && !isEditing} 
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium mb-2">End Date *</label>
            <input 
              type="date" 
              className="w-full px-4 py-3 border border-gray-300 rounded-2xl" 
              value={form.end_date} 
              onChange={e => setField('end_date', e.target.value)} 
              min={form.start_date || new Date().toISOString().split('T')[0]}   // ← Cannot be before start date
              disabled={isLocked && !isEditing} 
            />
          </div>
        </div>
        {form.attendance_days && (
          <p className="mt-4 text-emerald-600 font-medium">Expected Attendance: {form.attendance_days} days</p>
        )}
      </div>
      

      {/* ==================== Industry Guide ==================== */}
<div className="bg-white rounded-3xl shadow p-8 mb-6">
  <h3 className="text-xl font-semibold mb-6 flex items-center gap-3">
    <User className="w-6 h-6 text-fern" /> Industry Guide
  </h3>

  <div className="mb-6">
    <label className="block text-sm font-medium mb-2">
      Guide Allocation Status <span className="text-red-500">*</span>
    </label>
    <select
      className="w-full px-4 py-3 border border-gray-300 rounded-2xl"
      value={form.guide_allocated ? "allocated" : "not_allocated"}
      onChange={(e) => {
        const isAllocated = e.target.value === "allocated";
        setField('guide_allocated', isAllocated);
        if (!isAllocated) {
          setField('guide_name_industry', '');
          setField('guide_contact', '');
        }
      }}
      disabled={isLocked && !isEditing}
    >
      <option value="not_allocated">Yet to be Allocated</option>
      <option value="allocated">Guide Allocated</option>
    </select>
  </div>

  {form.guide_allocated && (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <label className="block text-sm font-medium mb-2">
          Guide Name <span className="text-red-500">*</span>
        </label>
        <input
          className="w-full px-4 py-3 border border-gray-300 rounded-2xl"
          value={form.guide_name_industry}
          onChange={e => setField('guide_name_industry', e.target.value)}
          disabled={isLocked && !isEditing}
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Guide Contact</label>
        <input
          className="w-full px-4 py-3 border border-gray-300 rounded-2xl"
          value={form.guide_contact}
          onChange={e => setField('guide_contact', e.target.value)}
          placeholder="Email / Phone"
          disabled={isLocked && !isEditing}
        />
      </div>
    </div>
  )}

  {!form.guide_allocated && (
    <div className="bg-gray-50 border border-dashed border-gray-300 rounded-2xl p-6 text-center">
      <p className="text-gray-500">Guide is yet to be allocated</p>
    </div>
  )}
</div>

{/* ==================== Academic Details ==================== */}
<div className="bg-white rounded-3xl shadow p-8 mb-8">
  <h3 className="text-xl font-semibold mb-6 flex items-center gap-3">
    <User className="w-6 h-6 text-fern" /> Academic Details
  </h3>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <div>
      <label className="block text-sm font-medium mb-2">CGPA <span className="text-red-500">*</span></label>
      <input 
        type="number" 
        step="0.01" 
        min="0" 
        max="10"
        className="w-full px-4 py-3 border border-gray-300 rounded-2xl" 
        value={form.cgpa} 
        onChange={e => setField('cgpa', e.target.value)}
        disabled={isLocked && !isEditing} 
      />
    </div>
    <div>
      <label className="block text-sm font-medium mb-2">Semesters Completed <span className="text-red-500">*</span></label>
      <input 
        type="number" 
        min="1" 
        max="8"
        className="w-full px-4 py-3 border border-gray-300 rounded-2xl" 
        value={form.semester_completed} 
        onChange={e => setField('semester_completed', e.target.value)}
        disabled={isLocked && !isEditing} 
      />
    </div>
  </div>
</div>

{/* Faculty Tutor Selection */}
{/* <div className="bg-white rounded-3xl shadow p-8 mb-8">
  <h3 className="text-xl font-semibold mb-6 flex items-center gap-3">
    <User className="w-6 h-6 text-fern" /> Tutor Name
  </h3>
  <Select
    options={tutors}
    value={tutors.find(t => t.value === form.tutor_id) || null}
    onChange={opt => {
      setField('tutor_id', opt?.value || '');
      // Auto fill email if tutor has email in data
      if (opt) setField('tutor_email', opt.email || '');
    }}
    placeholder="Select your tutor..."
    isDisabled={isLocked && !isEditing}
  />
  
</div> */}

{/* Faculty Tutor Details */}
{/* Faculty Tutor Details - Manual Entry */}
<div className="bg-white rounded-3xl shadow p-8 mb-8">
  <h3 className="text-xl font-semibold mb-6 flex items-center gap-3">
    <User className="w-6 h-6 text-fern" /> Faculty Tutor
  </h3>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <div>
      <label className="block text-sm font-medium mb-2">Tutor Name <span className="text-red-500">*</span></label>
      <input
        className="w-full px-4 py-3 border border-gray-300 rounded-2xl"
        value={form.tutor_name || ''}
        onChange={e => setField('tutor_name', e.target.value)}
        placeholder="Dr. V. S. K"
        disabled={isLocked && !isEditing}
      />
    </div>
    <div>
      <label className="block text-sm font-medium mb-2">Tutor Email ID <span className="text-red-500">*</span></label>
      <input
        type="email"
        className="w-full px-4 py-3 border border-gray-300 rounded-2xl"
        value={form.tutor_email}
        onChange={e => setField('tutor_email', e.target.value)}
        placeholder="vsk@psgtech.ac.in"
        disabled={isLocked && !isEditing}
      />
    </div>
  </div>
</div>
      <div className="bg-white rounded-3xl shadow p-8 mb-6">
        <h3 className="text-xl font-semibold mb-6 flex items-center gap-3">
        <FileDown className="w-6 h-6 text-fern" /> Offer Letter <span className="text-red-500">*</span>        </h3>
        <p className="text-sm text-gray-600 mb-4">Upload your official offer letter (PDF, max 5MB)</p>

        <input 
          type="file" 
          accept=".pdf" 
          onChange={handleOfferLetterUpload}
          disabled={isLocked && !isEditing}
          className="block w-full text-sm text-gray-500 
                     file:mr-4 file:py-3 file:px-6 file:rounded-2xl 
                     file:border-0 file:text-sm file:font-semibold 
                     file:bg-fern file:text-white hover:file:bg-hunter cursor-pointer"
        />

                {form.offer_letter_url && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-2xl flex items-center gap-3">
                    <FileDown className="w-5 h-5 text-green-600" />
                    <span className="text-sm">Offer Letter Uploaded</span>
                    <a 
                      href={`http://localhost:5001${form.offer_letter_url}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-fern underline text-sm ml-auto flex items-center gap-1"
                    >
                      📄 View File
                    </a>
          </div>
        )}
      </div>
     {/* Parents Permission Letter */}
      <div className="bg-white rounded-3xl shadow p-8 mb-6">
        <h3 className="text-xl font-semibold mb-6 flex items-center gap-3">
          <FileDown className="w-6 h-6 text-fern" /> 
          Parents Permission Letter <span className="text-red-500">*</span>
        </h3>
        <p className="text-sm text-gray-600 mb-4">Upload signed parent's consent letter (PDF, max 5MB)</p>

        <input 
          type="file" 
          accept=".pdf" 
          onChange={handleParentPermissionUpload}
          disabled={isLocked && !isEditing}
          className="block w-full text-sm text-gray-500 
                    file:mr-4 file:py-3 file:px-6 file:rounded-2xl 
                    file:border-0 file:text-sm file:font-semibold 
                    file:bg-fern file:text-white hover:file:bg-hunter cursor-pointer"
        />

        {form.parent_permission_url && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-2xl flex items-center gap-3">
            <FileDown className="w-5 h-5 text-green-600" />
            <span className="text-sm">Parent Permission Letter Uploaded</span>
            <a 
              href={`http://localhost:5001${form.parent_permission_url}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-fern underline text-sm ml-auto"
            >
              📄 View File
            </a>
          </div>
        )}
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