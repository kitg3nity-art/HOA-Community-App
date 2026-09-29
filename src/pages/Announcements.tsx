import React, { useEffect, useState } from 'react';
import { useAuth } from '../components/AuthContext';
import { auth } from '../lib/firebase';
import { Megaphone } from 'lucide-react';
import { format } from 'date-fns';

export default function Announcements() {
  const { token, profile } = useAuth();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('HOA');
  const [priority, setPriority] = useState('NORMAL');
  const [sendSms, setSendSms] = useState(true);

  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchAnnouncements();
  }, [token]);

  const fetchAnnouncements = async () => {
    try {
      let currentToken = token;
      if (auth.currentUser) {
        currentToken = await auth.currentUser.getIdToken();
      }
      const res = await fetch('/api/announcements', {
        headers: currentToken ? { Authorization: `Bearer ${currentToken}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(Array.isArray(data) ? data : []);
      } else if (res.status === 401 && auth.currentUser) {
        const newToken = await auth.currentUser.getIdToken(true);
        const retryRes = await fetch('/api/announcements', { headers: { Authorization: `Bearer ${newToken}` } });
        if (retryRes.ok) {
          const data = await retryRes.json();
          setAnnouncements(Array.isArray(data) ? data : []);
        } else {
          setAnnouncements([]);
        }
      } else {
        setAnnouncements([]);
      }
    } catch (e) {
      console.error(e);
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ title, description, category, priority, sendSms })
      });
      setShowForm(false);
      setTitle('');
      setDescription('');
      fetchAnnouncements();
    } catch (e) {
      console.error(e);
    }
  };

  const canCreate = profile?.role === 'ADMIN' || profile?.role === 'SUPERADMIN';

  const safeAnnouncements = Array.isArray(announcements) ? announcements : [];
  const totalItems = safeAnnouncements.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAnnouncements = safeAnnouncements.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-serif-luxury font-bold text-slate-900">Community Announcements</h1>
        {canCreate && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-bold hover:bg-teal-700 shadow-sm flex items-center gap-2"
          >
            <Megaphone className="w-4 h-4" />
            {showForm ? 'Cancel' : 'New Announcement'}
          </button>
        )}
      </div>

      {/* Mobile SMS Notification Subscription Status Box */}
      {(() => {
        const pref = (profile?.contactPreference || 'BOTH').toUpperCase();
        const isSubscribed = (pref === 'SMS' || pref === 'BOTH') && profile?.phoneNumber;
        return (
          <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
            isSubscribed ? 'bg-teal-50/80 border-teal-200 text-teal-900' : 'bg-amber-50/80 border-amber-200 text-amber-900'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl text-white ${isSubscribed ? 'bg-teal-600' : 'bg-amber-600'}`}>
                <Megaphone className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm">
                    {isSubscribed ? 'Mobile SMS Broadcast Subscription Active' : 'Mobile SMS Text Updates Unsubscribed'}
                  </span>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    isSubscribed ? 'bg-teal-200 text-teal-900' : 'bg-amber-200 text-amber-900'
                  }`}>
                    {isSubscribed ? 'SUBSCRIBED' : 'NOT SUBSCRIBED'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  {isSubscribed ? (
                    <>Text alerts dispatched to registered mobile: <strong className="font-mono text-teal-800">{profile?.phoneNumber}</strong></>
                  ) : (
                    <>You will not receive text updates on your mobile phone. Edit your profile settings to enable SMS alerts.</>
                  )}
                </p>
              </div>
            </div>
          </div>
        );
      })()}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 shadow-xl rounded-2xl border border-slate-200 space-y-4">
          <h3 className="font-bold text-slate-900 border-b pb-2">Publish Community Announcement</h3>
          <div>
            <label className="block text-sm font-semibold text-slate-700">Title</label>
            <input required type="text" value={title} onChange={e => setTitle(e.target.value)} className="mt-1 block w-full rounded-xl border-slate-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm border p-3 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700">Description</label>
            <textarea required rows={4} value={description} onChange={e => setDescription(e.target.value)} className="mt-1 block w-full rounded-xl border-slate-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm border p-3 outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="mt-1 block w-full rounded-xl border-slate-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm border p-3 outline-none bg-white">
                <option value="HOA">HOA</option>
                <option value="Security">Security</option>
                <option value="Utilities">Utilities</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Events">Events</option>
                <option value="Emergency">Emergency</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700">Priority Level</label>
              <select value={priority} onChange={e => setPriority(e.target.value)} className="mt-1 block w-full rounded-xl border-slate-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm border p-3 outline-none bg-white">
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>

          <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="sendSms"
                checked={sendSms}
                onChange={e => setSendSms(e.target.checked)}
                className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
              />
              <label htmlFor="sendSms" className="text-xs font-bold text-teal-900 cursor-pointer">
                Dispatch Real-time SMS Alert to Residents' Registered Phones
              </label>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-teal-200 text-teal-800 rounded-full">
              SMS Integrated
            </span>
          </div>

          <button type="submit" className="w-full px-4 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 shadow-sm">
            Publish & Broadcast Announcement
          </button>
        </form>
      )}

      <div className="space-y-4">
        {loading ? (
          <p className="text-slate-500">Loading...</p>
        ) : safeAnnouncements.length === 0 ? (
          <p className="text-slate-500 text-center py-8 bg-white rounded-2xl shadow-sm border border-slate-200">No announcements found.</p>
        ) : (
          paginatedAnnouncements.map((ann) => (
            <div key={ann.id} className="bg-white shadow-sm rounded-2xl border border-slate-200 overflow-hidden relative">
              {ann.priority === 'URGENT' && <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>}
              {ann.priority === 'HIGH' && <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>}
              {ann.priority === 'NORMAL' && <div className="absolute top-0 left-0 w-1 h-full bg-teal-500"></div>}
              <div className="p-6 pl-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 uppercase tracking-wide">
                      {ann.category}
                    </span>
                    {ann.priority !== 'NORMAL' && (
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${ann.priority === 'URGENT' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}>
                        {ann.priority}
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-slate-400 font-medium">
                    {format(new Date(ann.createdDate || ann.createdAt || Date.now()), 'MMM d, yyyy')}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{ann.title}</h3>
                <p className="text-slate-600 whitespace-pre-wrap">{ann.description}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination Controls */}
      {totalItems > 0 && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-700">
          <div className="flex items-center gap-3">
            <span className="text-slate-500">
              Showing <span className="font-extrabold text-slate-900">{startIndex + 1}</span> to <span className="font-extrabold text-slate-900">{Math.min(startIndex + itemsPerPage, totalItems)}</span> of <span className="font-extrabold text-slate-900">{totalItems}</span> announcements
            </span>

            <div className="flex items-center gap-1.5 ml-2">
              <span className="text-slate-400">Show per page:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value={5}>5 per page</option>
                <option value={10}>10 per page</option>
                <option value={20}>20 per page</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100 text-slate-700 rounded-lg font-bold transition-all"
            >
              Previous
            </button>
            <span className="px-3 py-1.5 bg-teal-50 text-teal-800 border border-teal-200 rounded-lg font-extrabold">
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100 text-slate-700 rounded-lg font-bold transition-all"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
