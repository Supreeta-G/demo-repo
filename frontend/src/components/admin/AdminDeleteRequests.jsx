import React, { useState, useEffect } from 'react';
import api from '../../api.js';
import { Trash2, Unlock, RefreshCw } from 'lucide-react';

const AdminDeleteRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/delete-requests');
      setRequests(data);
    } catch (err) {
      console.error(err);
      alert("Failed to load delete requests");
    } finally {
      setLoading(false);
    }
  };

const handleDelete = async (application_id) => {
  if (!confirm("⚠️ Permanently delete this application? This action cannot be undone.")) 
    return;

  try {
    // Correct endpoint
    await api.delete(`/admin/applications/${application_id}`);
    alert("✅ Application deleted successfully!");
    loadRequests();           // Refresh the list
  } catch (err) {
    console.error(err);
    alert(err.response?.data?.error || "Failed to delete application. Please check console.");
  }
};

 const handleUnlock = async (application_id) => {
  if (!confirm("Unlock this form for student editing?")) return;

  try {
    await api.post('/admin/unlock', { application_id });
    alert("✅ Form unlocked successfully!");
    loadRequests();
  } catch (err) {
    alert(err.response?.data?.error || "Failed to unlock form");
  }
};

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-fern" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto page-enter">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-forest">Delete Requests</h1>
        <p className="text-sage/70 mt-1">
          Review and act on student deletion requests
        </p>
      </div>

      {requests.length === 0 ? (
        <div className="card text-center py-20">
          <p className="text-2xl text-sage/60 mb-2">No pending delete requests</p>
          <p className="text-sage/50">All clear!</p>
        </div>
      ) : (
        <div className="space-y-5">
          {requests.map((app) => (
            <div 
              key={app.application_id} 
              className="bg-white rounded-3xl shadow-sm border border-sage/20 p-6 hover:shadow-md transition-all"
            >
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-bold text-xl text-forest">{app.student_name}</span>
                    <span className="text-sm text-sage/70 font-mono">({app.roll_number})</span>
                  </div>
                  
                  <p className="text-fern font-medium text-lg">
                    {app.company_name || app.company_name_manual}
                  </p>
                  
                  {app.delete_reason && (
                    <div className="mt-3 p-4 bg-red-50 border border-red-100 rounded-2xl">
                      <p className="text-red-700 text-sm">
                        <strong>Reason:</strong> {app.delete_reason}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => handleUnlock(app.application_id)}
                    disabled={actionLoading === app.application_id}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl transition disabled:opacity-70 min-w-[140px]"
                  >
                    <Unlock className="w-4 h-4" />
                    Unlock Form
                  </button>

                  <button
                    onClick={() => handleDelete(app.application_id)}
                    disabled={actionLoading === app.application_id}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl transition disabled:opacity-70 min-w-[140px]"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Permanently
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminDeleteRequests;