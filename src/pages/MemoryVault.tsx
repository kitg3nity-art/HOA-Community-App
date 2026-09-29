import React, { useEffect, useState } from 'react';
import { useAuth } from '../components/AuthContext';
import { auth } from '../lib/firebase';
import { Archive, Plus } from 'lucide-react';
import { format } from 'date-fns';

export default function MemoryVault() {
  const { token, profile } = useAuth();
  const [memories, setMemories] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ title: '', story: '', date: '', images: '' });

  useEffect(() => {
    fetchMemories();
  }, [token]);

  const fetchMemories = async () => {
    try {
      const res = await fetch('/api/memory-vault', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (res.ok) {
        const data = await res.json();
        setMemories(Array.isArray(data) ? data : []);
      } else {
        setMemories([]);
      }
    } catch (e) {
      console.error(e);
      setMemories([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const imageUrls = formData.images.split(',').map(url => url.trim()).filter(url => url !== '').slice(0, 5);
      await fetch('/api/memory-vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...formData, images: JSON.stringify(imageUrls) })
      });
      setShowForm(false);
      setFormData({ title: '', story: '', date: '', images: '' });
      fetchMemories();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="text-center space-y-4 bg-white p-12 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-50 rounded-full opacity-50 blur-3xl pointer-events-none -mr-32 -mt-32"></div>
        <Archive className="w-12 h-12 text-teal-600 mx-auto relative z-10" />
        <h1 className="text-3xl font-serif-luxury font-bold text-slate-900 relative z-10 tracking-tight">Casa Mira South Memory Vault</h1>
        <p className="text-slate-600 max-w-2xl mx-auto relative z-10 leading-relaxed">
          Preserving our community identity. Share and explore the history, milestones, and resident experiences that make our subdivision special.
        </p>
        <div className="pt-4 relative z-10">
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center px-6 py-3 bg-teal-600 text-white rounded-xl text-sm font-bold hover:bg-teal-700 shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Memory
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-8 shadow-sm rounded-2xl border border-slate-200 space-y-6 max-w-2xl mx-auto">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Memory Title</label>
            <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="block w-full rounded-xl border-slate-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm border p-3 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Date of Memory</label>
            <input required type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="block w-full rounded-xl border-slate-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm border p-3 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">The Story</label>
            <textarea required rows={5} value={formData.story} onChange={e => setFormData({...formData, story: e.target.value})} className="block w-full rounded-xl border-slate-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm border p-3 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Image URLs (comma separated, max 5)</label>
            <input type="text" value={formData.images} onChange={e => setFormData({...formData, images: e.target.value})} placeholder="https://..., https://..." className="block w-full rounded-xl border-slate-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm border p-3 outline-none" />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={() => setShowForm(false)} className="px-6 py-3 border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors">Cancel</button>
            <button type="submit" className="px-6 py-3 bg-teal-600 text-white rounded-xl text-sm font-bold hover:bg-teal-700 shadow-sm transition-colors">Save Memory</button>
          </div>
        </form>
      )}

      <div className="relative wrap overflow-hidden p-10 h-full">
        <div className="border-2-2 absolute border-opacity-20 border-slate-300 h-full border" style={{ left: '50%' }}></div>
        {(Array.isArray(memories) ? memories : []).map((memory, index) => {
          let parsedImages: string[] = [];
          try { if (memory.images) parsedImages = JSON.parse(memory.images); } catch (e) {}

          return (
            <div key={memory.id} className={`mb-8 flex justify-between items-center w-full ${index % 2 === 0 ? 'flex-row-reverse' : ''}`}>
              <div className="order-1 w-5/12"></div>
              <div className="z-20 flex items-center order-1 bg-amber-500 shadow-sm border-4 border-slate-50 w-6 h-6 rounded-full"></div>
              <div className="order-1 bg-white rounded-2xl shadow-sm border border-slate-200 w-5/12 p-6 transition-transform hover:-translate-y-1">
                <h3 className="mb-2 font-bold text-slate-900 text-xl">{memory.title}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{memory.story}</p>
                {parsedImages.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {parsedImages.map((img, i) => (
                      <img key={i} src={img} alt={`Memory ${i}`} className="rounded-xl w-full h-32 object-cover border border-slate-200" referrerPolicy="no-referrer" />
                    ))}
                  </div>
                )}
                <p className="mt-4 text-xs font-bold text-teal-600 uppercase tracking-wide">{format(new Date(memory.date || Date.now()), 'MMMM d, yyyy')}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
