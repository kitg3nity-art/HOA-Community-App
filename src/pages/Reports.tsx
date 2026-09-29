import React, { useEffect, useState } from 'react';
import { useAuth } from '../components/AuthContext';
import { auth } from '../lib/firebase';
import { AlertTriangle, MapPin, CheckCircle, ShieldAlert, ShieldCheck, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function Reports() {
  const { token, profile } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ category: 'Security', description: '', location: '' });

  useEffect(() => {
    fetchReports();
  }, [token]);

  const fetchReports = async () => {
    try {
      let currentToken = token;
      if (auth.currentUser) {
        currentToken = await auth.currentUser.getIdToken();
      }
      const res = await fetch('/api/reports', { headers: currentToken ? { Authorization: `Bearer ${currentToken}` } : {} });
      if (res.ok) {
        const data = await res.json();
        setReports(Array.isArray(data) ? data : []);
      } else if (res.status === 401 && auth.currentUser) {
        const newToken = await auth.currentUser.getIdToken(true);
        const retryRes = await fetch('/api/reports', { headers: { Authorization: `Bearer ${newToken}` } });
        if (retryRes.ok) {
          const data = await retryRes.json();
          setReports(Array.isArray(data) ? data : []);
        } else {
          setReports([]);
        }
      } else {
        setReports([]);
      }
    } catch (e) {
      console.error(e);
      setReports([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData)
      });
      setShowForm(false);
      setFormData({ category: 'Security', description: '', location: '' });
      alert("Report submitted! PMO officers will review and confirm your report before it is published on the community feed.");
      fetchReports();
    } catch (e) {
      console.error(e);
    }
  };

  const handleConfirmReport = async (reportId: number) => {
    try {
      const res = await fetch(`/api/admin/reports/${reportId}/confirm`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isConfirmed: true, status: 'IN_PROGRESS' })
      });
      if (res.ok) {
        fetchReports();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const isAdmin = profile?.role === 'ADMIN' || profile?.role === 'SUPERADMIN';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif-luxury font-bold text-slate-900">Community Report Center</h1>
          <p className="text-slate-500 text-sm mt-1">Submit hazards, maintenance issues, or security concerns to PMO Desk</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-bold hover:bg-teal-700 shadow-sm flex items-center justify-center gap-2 self-start sm:self-auto"
        >
          {showForm ? 'Cancel' : 'Submit Report'}
        </button>
      </div>

      {/* Verification Protocol Notice */}
      <div className="p-4 bg-teal-50/80 border border-teal-200 rounded-2xl flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
        <div className="text-xs text-teal-900 leading-relaxed">
          <span className="font-bold">PMO Verification Protocol:</span> To prevent false reports, all submitted incident and hazard reports are reviewed and confirmed by PMO Officers before appearing publicly on the community feed.
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 shadow-sm rounded-2xl border border-slate-200 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700">Category</label>
              <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="mt-1 block w-full rounded-xl border-slate-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm border p-3 outline-none bg-white">
                <option>Security</option>
                <option>Maintenance</option>
                <option>Suggestions</option>
                <option>Lost and Found</option>
                <option>Water Leak / Utility</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700">Location</label>
              <input type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="mt-1 block w-full rounded-xl border-slate-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm border p-3 outline-none" placeholder="e.g. Phase 2 Park / Block 12 Lot 4" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700">Description</label>
            <textarea required rows={4} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="mt-1 block w-full rounded-xl border-slate-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm border p-3 outline-none" placeholder="Please describe the issue..." />
          </div>
          <button type="submit" className="w-full px-4 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 shadow-sm">Submit Incident Report</button>
        </form>
      )}

      <div className="space-y-4">
        {(Array.isArray(reports) ? reports : []).map((report) => (
          <div key={report.id} className="bg-white shadow-sm rounded-2xl border border-slate-200 p-6 flex flex-col sm:flex-row sm:items-start space-y-4 sm:space-y-0 sm:space-x-4">
            <div className={`p-4 rounded-xl flex-shrink-0 ${report.status === 'RESOLVED' ? 'bg-teal-50 text-teal-600' : 'bg-amber-50 text-amber-500'}`}>
              {report.status === 'RESOLVED' ? <CheckCircle className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-slate-900">{report.category}</h3>
                  {report.isConfirmed ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800">
                      <ShieldCheck className="w-3 h-3" /> PMO Confirmed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                      <Clock className="w-3 h-3" /> Pending PMO Verification
                    </span>
                  )}
                </div>

                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${report.status === 'RESOLVED' ? 'bg-teal-100 text-teal-800' : report.status === 'IN_PROGRESS' || report.status === 'PROCESSING' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-800'}`}>
                  {report.status}
                </span>
              </div>

              <p className="text-sm text-slate-600 leading-relaxed">{report.description}</p>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-4 text-xs font-medium text-slate-400 pt-3 border-t border-slate-100">
                <div className="flex items-center space-x-6">
                  <span className="flex items-center"><MapPin className="w-4 h-4 mr-1.5 text-teal-600" /> {report.location || 'Not specified'}</span>
                  <span>{format(new Date(report.createdAt || Date.now()), 'MMM d, yyyy h:mm a')}</span>
                  {report.reporterName && <span className="text-slate-600 font-semibold">By: {report.reporterName}</span>}
                </div>

                {isAdmin && !report.isConfirmed && (
                  <button
                    onClick={() => handleConfirmReport(report.reportId || report.id)}
                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold text-xs shadow-sm flex items-center gap-1"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" /> Confirm & Publish
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
