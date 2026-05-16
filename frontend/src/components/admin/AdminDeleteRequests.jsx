import React, { useState, useEffect } from 'react';
import api from '../../api.js';
import { Trash2, Unlock, CheckCircle, XCircle } from 'lucide-react';

const AdminDeleteRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const { data } = await api.get('/admin/delete-requests');
      setRequests(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (application_id) => {
    if (!confirm("Are you sure you want to permanently delete this application?")) return;

    try {
      await api.delete(`/admin/applications/${application_id}`);
      alert("Application deleted successfully");
      loadRequests();
    } catch (err) {
      alert("Failed to delete application");
    }
  };

  const handleUnlock = async (application_id) => {
    try {
      await api.post('/admin/unlock-form', { application_id });
      alert("Form unlocked successfully. Student can now edit it.");
      loadRequests();
    } catch (err) {
      alert("Failed to unlock form");
    }
  };

  if (loading) return <div className="p-8 text-center">Loading delete requests...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-forest mb-2">Delete Requests</h1>
      <p className="text-sage/70 mb-8">Students have requested to delete these applications</p>

      {requests.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl">
          <p className="text-2xl text-sage/60">No delete requests at the moment</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((app) => (
            <div key={app.application_id} className="bg-white rounded-3xl shadow p-6 flex items-center gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-lg">{app.student_name}</span>
                  <span className="text-sm text-gray-500">({app.roll_number})</span>
                </div>
                <p className="text-fern font-medium">{app.company_name}</p>
                <p className="text-sm text-red-600 mt-2">
                  Reason: <span className="font-medium">{app.delete_reason || "No reason provided"}</span>
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleUnlock(app.application_id)}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition"
                >
                  <Unlock className="w-4 h-4" /> Unlock Form
                </button>

                <button
                  onClick={() => handleDelete(app.application_id)}
                  className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-2xl hover:bg-red-700 transition"
                >
                  <Trash2 className="w-4 h-4" /> Delete Permanently
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminDeleteRequests;