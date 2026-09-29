import React, { useEffect, useState } from 'react';
import { useAuth } from '../components/AuthContext';
import { auth } from '../lib/firebase';
import { Calendar as CalendarIcon, MapPin, ShieldCheck, UserCheck, Trash2, Plus, X, AlertCircle, Edit3, Image as ImageIcon, Sparkles } from 'lucide-react';
import { format } from 'date-fns';

export default function Events() {
  const { token, profile } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [showOrganizerModal, setShowOrganizerModal] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', date: '', location: '', image: '' });
  const [editFormData, setEditFormData] = useState({ title: '', description: '', date: '', location: '', image: '' });
  const [errorMsg, setErrorMsg] = useState('');

  const canCreateEvent = profile?.role === 'SUPERADMIN' || profile?.role === 'ADMIN' || profile?.role === 'EVENT_ORGANIZER';
  const isAdmin = profile?.role === 'ADMIN' || profile?.role === 'SUPERADMIN';

  useEffect(() => {
    fetchEvents();
  }, [token]);

  const fetchEvents = async () => {
    try {
      let currentToken = token;
      if (auth.currentUser) {
        currentToken = await auth.currentUser.getIdToken();
      }
      const res = await fetch('/api/events', { headers: currentToken ? { Authorization: `Bearer ${currentToken}` } : {} });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setEvents(data);
        } else {
          setEvents([]);
        }
      } else if (res.status === 401 && auth.currentUser) {
        const newToken = await auth.currentUser.getIdToken(true);
        const retryRes = await fetch('/api/events', { headers: { Authorization: `Bearer ${newToken}` } });
        if (retryRes.ok) {
          const data = await retryRes.json();
          if (Array.isArray(data)) setEvents(data);
        }
      }
    } catch (e) {
      console.error(e);
      setEvents([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const payload = {
        ...formData,
        date: new Date(formData.date).toISOString()
      };
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowForm(false);
        setFormData({ title: '', description: '', date: '', location: '', image: '' });
        fetchEvents();
      } else {
        const err = await res.json();
        setErrorMsg(err.error || 'Failed to publish event');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;
    try {
      const payload = {
        ...editFormData,
        date: new Date(editFormData.date).toISOString()
      };
      const res = await fetch(`/api/events/${editingEvent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setEditingEvent(null);
        fetchEvents();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update event');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const openEditModal = (event: any) => {
    setEditingEvent(event);
    setEditFormData({
      title: event.title || '',
      description: event.description || '',
      date: event.date ? new Date(event.date).toISOString().slice(0, 16) : '',
      location: event.location || '',
      image: event.image || ''
    });
  };

  const deleteEvent = async (id: number) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    try {
      await fetch(`/api/admin/content/events/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchEvents();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif-luxury font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Casa Mira Community Events
            <span className="px-2.5 py-0.5 bg-teal-100 text-teal-800 text-xs font-bold rounded-full">
              HOA Schedule
            </span>
          </h1>
          <p className="text-slate-500 text-sm">Official sports tournaments, general assemblies, and social gatherings.</p>
        </div>

        {canCreateEvent ? (
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-5 py-2.5 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700 shadow-sm flex items-center gap-2 transition-all self-start sm:self-auto"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            <span>{showForm ? 'Cancel' : 'Create Official Event'}</span>
          </button>
        ) : (
          <button
            onClick={() => setShowOrganizerModal(true)}
            className="px-4 py-2 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold hover:bg-amber-100 flex items-center gap-1.5 transition-all self-start sm:self-auto"
          >
            <UserCheck className="w-4 h-4 text-amber-600" />
            <span>Apply as Event Organizer</span>
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 text-xs font-bold rounded-2xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {!canCreateEvent && (
        <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-500/20 text-teal-400 rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <p className="text-xs text-slate-300">
              <span className="font-bold text-white">Notice:</span> Only verified Event Organizers approved by the HOA Board can publish public community events.
            </p>
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 shadow-xl rounded-3xl border border-slate-200 space-y-4 max-w-xl mx-auto animate-in fade-in">
          <h2 className="font-bold text-slate-900 text-base border-b border-slate-100 pb-2">Publish New Community Event</h2>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Event Title</label>
            <input required type="text" placeholder="e.g. Casa Mira Summer Basketball League" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="block w-full rounded-xl border border-slate-200 p-3 text-xs outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Event Details & Agenda</label>
            <textarea required rows={3} placeholder="Describe schedule, registration fees (if any), and guidelines..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="block w-full rounded-xl border border-slate-200 p-3 text-xs outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Graphic Banner / Hero Image URL (Optional)</label>
            <input type="text" placeholder="https://images.unsplash.com/... or image link" value={formData.image} onChange={e => setFormData({...formData, image: e.target.value})} className="block w-full rounded-xl border border-slate-200 p-3 text-xs outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date & Time</label>
              <input required type="datetime-local" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="block w-full rounded-xl border border-slate-200 p-3 text-xs outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Location Venue</label>
              <input required type="text" placeholder="e.g. Phase 1 Clubhouse Court" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="block w-full rounded-xl border border-slate-200 p-3 text-xs outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
          </div>
          <button type="submit" className="w-full px-4 py-3 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 shadow-md">Publish Event</button>
        </form>
      )}

      <div className="bg-white shadow-sm overflow-hidden rounded-3xl border border-slate-200">
        <ul className="divide-y divide-slate-100">
          {(Array.isArray(events) ? events : []).map((event) => {
            const isAuthorOrAdmin = isAdmin || (profile && event.organizerId === profile.id);
            return (
              <li key={event.id} className="p-6 hover:bg-slate-50/60 transition-colors space-y-3">
                {/* Event Hero Banner if present */}
                {event.image && (
                  <div className="relative h-48 w-full rounded-2xl overflow-hidden shadow-sm border border-slate-200/80 bg-slate-900">
                    <img src={event.image} alt={event.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <span className="absolute bottom-3 left-3 px-2.5 py-1 bg-teal-500/90 text-white text-[10px] font-black uppercase tracking-wider rounded-lg backdrop-blur">
                      FEATURED BANNER
                    </span>
                  </div>
                )}

                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{event.title}</h3>
                    <p className="text-xs text-teal-700 font-semibold mt-0.5 flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5" /> Organized by: {event.organizerName || 'HOA Board'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 text-xs font-extrabold rounded-full bg-teal-50 text-teal-800 border border-teal-200 uppercase tracking-wide">
                      APPROVED EVENT
                    </span>
                    {isAuthorOrAdmin && (
                      <button onClick={() => openEditModal(event)} className="px-2.5 py-1 text-xs font-bold bg-slate-100 text-slate-700 hover:bg-teal-50 hover:text-teal-700 rounded-lg border border-slate-200 flex items-center gap-1 transition-colors" title="Edit Event for Corrections">
                        <Edit3 className="w-3.5 h-3.5" /> Edit
                      </button>
                    )}
                    {isAdmin && (
                      <button onClick={() => deleteEvent(event.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Delete Event">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-500">
                  <span className="flex items-center gap-1 text-slate-700">
                    <MapPin className="h-4 w-4 text-teal-600" />
                    {event.location}
                  </span>
                  <span className="flex items-center gap-1 text-slate-700">
                    <CalendarIcon className="h-4 w-4 text-teal-600" />
                    {format(new Date(event.date), 'MMMM d, yyyy • h:mm a')}
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100">{event.description}</p>
              </li>
            );
          })}

          {events.length === 0 && (
            <li className="p-8 text-center text-slate-400 text-xs">No upcoming events scheduled.</li>
          )}
        </ul>
      </div>

      {/* Edit Approved Event Modal */}
      {editingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl space-y-4 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-teal-600" /> Edit Approved Event (Corrections)
              </h3>
              <button onClick={() => setEditingEvent(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Event Title</label>
                <input required type="text" value={editFormData.title} onChange={e => setEditFormData({...editFormData, title: e.target.value})} className="block w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Event Details</label>
                <textarea required rows={3} value={editFormData.description} onChange={e => setEditFormData({...editFormData, description: e.target.value})} className="block w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date & Time</label>
                  <input required type="datetime-local" value={editFormData.date} onChange={e => setEditFormData({...editFormData, date: e.target.value})} className="block w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Location</label>
                  <input required type="text" value={editFormData.location} onChange={e => setEditFormData({...editFormData, location: e.target.value})} className="block w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Graphic Hero Image URL</label>
                <input type="text" value={editFormData.image} onChange={e => setEditFormData({...editFormData, image: e.target.value})} className="block w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:ring-2 focus:ring-teal-500" placeholder="https://images.unsplash.com/..." />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button type="button" onClick={() => setEditingEvent(null)} className="w-1/2 py-2.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200">
                  Cancel
                </button>
                <button type="submit" className="w-1/2 py-2.5 bg-teal-600 text-white font-bold text-xs rounded-xl hover:bg-teal-700 shadow-md">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Event Organizer Application Modal */}
      {showOrganizerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">HOA Event Organizer Role</h3>
              <button onClick={() => setShowOrganizerModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              To publish sports events, club meetings, or community gatherings in Casa Mira South, residents must be granted the <span className="font-bold text-teal-700">EVENT_ORGANIZER</span> role by the HOA Board / PMO Administrator.
            </p>
            <div className="p-3 bg-amber-50 text-amber-900 rounded-2xl text-xs space-y-1 border border-amber-200">
              <p className="font-bold">How to get approved:</p>
              <p>1. Contact the PMO Admin via the Admin Office or Chat.</p>
              <p>2. Provide your proposed event schedule and club details.</p>
              <p>3. Superadmin will activate your Event Organizer badge.</p>
            </div>
            <button onClick={() => setShowOrganizerModal(false)} className="w-full py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl">
              Understood
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

