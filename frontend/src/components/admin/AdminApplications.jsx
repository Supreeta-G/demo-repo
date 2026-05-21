import React, { useState, useEffect } from 'react';
import { Search, Download, Unlock, Trash2, Eye } from 'lucide-react';
import api from '../../api.js';
//import { generateInternshipPDF } from '../student/pdfGenerator.js';

const AdminApplications = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;

      const { data } = await api.get('/admin/applications', { params });
      setApplications(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [search, statusFilter]);

  const handleUnlock = async (id) => {
    if (!confirm("Unlock this application for student editing?")) return;
    setActionLoading(id);
    try {
      await api.post('/admin/unlock', { application_id: id });
      alert("✅ Application unlocked successfully");
      fetchApplications();
    } catch (err) {
      alert("Failed to unlock");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Permanently delete this application?")) return;
    setActionLoading(id);
    try {
      await api.delete(`/admin/applications/${id}`);
      alert("✅ Application deleted");
      fetchApplications();
    } catch (err) {
      alert("Failed to delete");
    } finally {
      setActionLoading(null);
    }
  };

  const handlePDF = async (app) => {
    try {
      const { data } = await api.get(`/applications/${app.application_id}`);
      await generateInternshipPDF(data, true);
    } catch (e) {
      alert("Failed to generate PDF");
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-forest">All Applications</h1>
          <p className="text-sage/70">Manage & monitor student internship applications</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 w-4 h-4 text-sage" />
            <input
              type="text"
              placeholder="Search student or company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input pl-10 w-full"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="form-input w-full sm:w-48"
          >
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="pending_tutor">Pending Tutor</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <span className="w-9 h-9 border-2 border-sage/30 border-t-fern rounded-full animate-spin" />
        </div>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-sage/20 text-left text-xs uppercase tracking-widest text-hunter/70">
                  <th className="p-4">Student</th>
                  <th className="p-4">Company</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr key={app.application_id} className="border-b border-sage/10 hover:bg-bone/50">
                    <td className="p-4">
                      <div>
                        <p className="font-medium">{app.student_name}</p>
                        <p className="text-xs text-sage/70">{app.roll_number}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="font-medium">{app.company_name || app.company_name_manual}</p>
                    </td>
                    <td className="p-4">
                      <span className="text-xs px-3 py-1 rounded-full bg-fern/10 text-fern">
                        {app.duration_type === 'summer' ? '☀️ Summer' : '🎓 6-Month'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`badge ${
                        app.status === 'approved' ? 'badge-approved' :
                        app.status === 'rejected' ? 'badge-rejected' : 'badge-pending'
                      }`}>
                        {app.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handlePDF(app)}
                          className="btn-secondary text-xs px-3 py-1.5"
                          title="Download PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>

                        {app.status !== 'approved' && (
                          <button
                            onClick={() => handleUnlock(app.application_id)}
                            disabled={actionLoading === app.application_id}
                            className="btn-secondary text-xs px-3 py-1.5 text-amber-600 hover:text-amber-700"
                            title="Unlock for editing"
                          >
                            <Unlock className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => handleDelete(app.application_id)}
                          disabled={actionLoading === app.application_id}
                          className="btn-secondary text-xs px-3 py-1.5 text-red-600 hover:text-red-700"
                          title="Delete Application"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {applications.length === 0 && (
              <div className="text-center py-12 text-sage/70">
                No applications found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminApplications;