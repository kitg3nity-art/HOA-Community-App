import React, { useEffect, useState } from 'react';
import { useAuth } from '../components/AuthContext';
import { MapPin, Phone, ZoomIn, ZoomOut, RotateCcw, Compass, Navigation, Shield, Info, Plus, X, PhoneCall, Sparkles, Building2, Church, Dumbbell, Store, Trees } from 'lucide-react';
import { auth } from '../lib/firebase';
import mapAsset from '../assets/images/casamira_masterplan_1786033399687.jpg';

interface Landmark {
  id: string;
  name: string;
  category: 'Security' | 'Amenities' | 'Worship' | 'Commercial' | 'Admin';
  phase: 'Phase 1' | 'Phase 2' | 'Town Center';
  x: number; // percentage
  y: number; // percentage
  icon: any;
  image: string;
  desc: string;
  hours: string;
  hotline?: string;
  features: string[];
}

export default function MapDirectory() {
  const { profile, token } = useAuth();
  const [contacts, setContacts] = useState<any[]>([]);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [activeLandmark, setActiveLandmark] = useState<Landmark | null>(null);

  // Admin contact modal
  const [showAddContact, setShowAddContact] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', category: 'EMERGENCY', number: '', description: '' });

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      if (!token) return;
      const res = await fetch('/api/contacts', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setContacts(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!token) return;
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(contactForm)
      });
      if (res.ok) {
        setShowAddContact(false);
        setContactForm({ name: '', category: 'EMERGENCY', number: '', description: '' });
        fetchContacts();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const landmarks: Landmark[] = [
    {
      id: 'lm-1',
      name: 'Phase 1 Guard House & Gate',
      category: 'Security',
      phase: 'Phase 1',
      x: 22,
      y: 74,
      icon: Shield,
      image: 'https://images.unsplash.com/photo-1541888946425-d0fbb186a5b7?auto=format&fit=crop&w=800&q=80',
      desc: '24/7 RFID-controlled main subdivision access point with security personnel, visitor logging, and emergency hotline station.',
      hours: '24 Hours / 7 Days',
      hotline: '+63 912 345 6789',
      features: ['RFID Gate Control', '24/7 Security Patrol', 'CCTV Monitored', 'Visitor Logging']
    },
    {
      id: 'lm-2',
      name: 'Phase 2 Guard House & Gate',
      category: 'Security',
      phase: 'Phase 2',
      x: 76,
      y: 68,
      icon: Shield,
      image: 'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=800&q=80',
      desc: 'Secondary gated entrance for Phase 2 residents with security check post and visitor parking bay.',
      hours: '24 Hours / 7 Days',
      hotline: '+63 912 345 6790',
      features: ['24/7 Security Guard', 'Boom Barrier', 'Resident Lane']
    },
    {
      id: 'lm-3',
      name: 'Grand Clubhouse & Infinity Pool',
      category: 'Amenities',
      phase: 'Phase 1',
      x: 48,
      y: 45,
      icon: Building2,
      image: 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=800&q=80',
      desc: 'Central community hub featuring multi-purpose function halls, adult lap pool, kiddie pool, lounge deck, and HOA administrative wing.',
      hours: '6:00 AM – 10:00 PM',
      hotline: '+63 932 888 1000',
      features: ['Swimming Pools', 'Event Halls', 'Lounge Deck', 'Free Wi-Fi Zone']
    },
    {
      id: 'lm-4',
      name: 'Our Lady of Mt. Carmel Chapel',
      category: 'Worship',
      phase: 'Phase 1',
      x: 34,
      y: 35,
      icon: Church,
      image: 'https://images.unsplash.com/photo-1548625149-fc4a29cf7092?auto=format&fit=crop&w=800&q=80',
      desc: 'Serene community chapel hosting weekly Sunday mass, neighborhood spiritual gatherings, and religious novenas.',
      hours: '5:00 AM – 9:00 PM (Mass: Sun 9:00 AM)',
      features: ['Air-Conditioned', 'Spiritual Retreat Space', 'Weekly Holy Mass']
    },
    {
      id: 'lm-5',
      name: 'Covered Basketball & Sports Court',
      category: 'Amenities',
      phase: 'Phase 2',
      x: 64,
      y: 38,
      icon: Dumbbell,
      image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=800&q=80',
      desc: 'Full-sized covered basketball court with electronic scoreboard, LED floodlights, and spectator bleachers for sports tournaments.',
      hours: '6:00 AM – 10:00 PM',
      features: ['Scoreboard', 'Night Floodlights', 'Bleacher Seating', 'Volleyball Ready']
    },
    {
      id: 'lm-6',
      name: 'Linear Park & Kid Playground',
      category: 'Amenities',
      phase: 'Phase 1',
      x: 42,
      y: 62,
      icon: Trees,
      image: 'https://images.unsplash.com/photo-1588072432836-e10032774350?auto=format&fit=crop&w=800&q=80',
      desc: 'Lush green linear parkway equipped with children play equipment, outdoor fitness gym machines, and jogging pathways.',
      hours: 'Open 24 Hours',
      features: ['Outdoor Gym', 'Child Play Sets', 'Jogging Loop', 'Pet Friendly']
    },
    {
      id: 'lm-7',
      name: 'Casa Mira Town Center & Shops',
      category: 'Commercial',
      phase: 'Town Center',
      x: 20,
      y: 84,
      icon: Store,
      image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
      desc: 'Commercial strip with convenience stores, laundry shops, cafes, water refilling stations, and resident artisan stalls.',
      hours: '7:00 AM – 11:00 PM',
      features: ['Convenience Store', 'Laundry Hub', 'Water Station', 'ATM Spot']
    },
    {
      id: 'lm-8',
      name: 'HOA Administrative Office & PMO',
      category: 'Admin',
      phase: 'Phase 1',
      x: 55,
      y: 58,
      icon: Building2,
      image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80',
      desc: 'Property Management Office (PMO) handling resident sticker applications, HOA monthly dues payment, and facility reservations.',
      hours: 'Mon - Sat: 8:00 AM – 5:00 PM',
      hotline: '+63 917 888 9900',
      features: ['Dues Payment Window', 'Sticker Release', 'Facility Reservation']
    }
  ];

  const filteredLandmarks = selectedCategory === 'ALL' 
    ? landmarks 
    : landmarks.filter(l => l.category === selectedCategory);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Casa Mira South 3D Interactive Map
            <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs font-extrabold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> Pixar 3D Style
            </span>
          </h1>
          <p className="text-slate-500 text-sm">Explore interactive 3D landmarks, gates, amenities, and editable emergency hotlines.</p>
        </div>

        <div className="flex items-center gap-2">
          {(profile?.role === 'ADMIN' || profile?.role === 'SUPERADMIN') && (
            <button
              onClick={() => setShowAddContact(true)}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" /> Add Emergency Hotline
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Map + Contacts Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 3D Map Canvas */}
        <div className="lg:col-span-2 bg-slate-900 rounded-3xl border border-slate-800 shadow-xl overflow-hidden flex flex-col h-[650px] relative">
          
          {/* Map Controls Top Bar */}
          <div className="p-4 bg-slate-900/90 backdrop-blur border-b border-slate-800 flex items-center justify-between z-20 shrink-0">
            <div className="flex items-center gap-1.5 overflow-x-auto py-1">
              {['ALL', 'Security', 'Amenities', 'Worship', 'Commercial', 'Admin'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    selectedCategory === cat
                      ? 'bg-teal-500 text-white shadow-md'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700 shrink-0 ml-2">
              <button 
                onClick={() => setZoomLevel(prev => Math.min(prev + 0.25, 2.0))} 
                className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-700" 
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setZoomLevel(prev => Math.max(prev - 0.25, 0.8))} 
                className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-700" 
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setZoomLevel(1)} 
                className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-700" 
                title="Reset View"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Interactive 3D Canvas Area */}
          <div className="flex-1 relative overflow-auto bg-slate-950 flex items-center justify-center p-4">
            <div 
              className="relative transition-transform duration-300 ease-out origin-center select-none"
              style={{
                width: '100%',
                maxWidth: '900px',
                transform: `scale(${zoomLevel})`
              }}
            >
              {/* Pixar 3D Map Base Image */}
              <img 
                src={mapAsset} 
                alt="Casa Mira South 3D Pixar Map" 
                className="w-full h-auto rounded-2xl shadow-2xl border border-slate-700/50 object-cover"
              />

              {/* Landmark Interactive Pins */}
              {filteredLandmarks.map((lm) => {
                const IconComponent = lm.icon;
                return (
                  <div
                    key={lm.id}
                    onClick={() => setActiveLandmark(lm)}
                    style={{ top: `${lm.y}%`, left: `${lm.x}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer z-10"
                  >
                    {/* Pin Badge */}
                    <div className="relative flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/90 hover:bg-teal-600 text-white border-2 border-teal-400 rounded-2xl shadow-xl transition-all duration-200 group-hover:scale-110 group-hover:z-30">
                      <IconComponent className="w-4 h-4 text-teal-300 group-hover:text-white" />
                      <span className="text-[11px] font-extrabold whitespace-nowrap">{lm.name.split(' ')[0]} {lm.name.split(' ')[1]}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Map Footer Note */}
          <div className="px-4 py-2 bg-slate-950/80 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-teal-400" /> Casa Mira South Subdivision 3D Masterplan
            </span>
            <span>Click any pin for facilities & hotline</span>
          </div>
        </div>

        {/* Right Contacts & Hotline Panel */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[650px]">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Phone className="w-5 h-5 text-red-500" />
                Emergency & HOA Hotlines
              </h2>
              <p className="text-xs text-slate-500">Official contacts for officers, guards & PMO</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {contacts.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No emergency contacts registered yet.
              </div>
            ) : (
              contacts.map(c => (
                <div 
                  key={c.id} 
                  className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl flex items-center justify-between group hover:border-teal-500 hover:bg-teal-50/50 transition-all"
                >
                  <div>
                    <span className="inline-block px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-md uppercase tracking-wide mb-1">
                      {c.category}
                    </span>
                    <h4 className="font-bold text-sm text-slate-900">{c.name}</h4>
                    {c.description && <p className="text-xs text-slate-500 mt-0.5">{c.description}</p>}
                    <p className="text-xs font-mono font-bold text-teal-700 mt-1">{c.number}</p>
                  </div>

                  <a 
                    href={`tel:${c.number}`}
                    className="w-10 h-10 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center shadow-md transition-all shrink-0"
                    title={`Call ${c.name}`}
                  >
                    <PhoneCall className="w-4 h-4" />
                  </a>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Landmark Detail Modal Drawer */}
      {activeLandmark && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Image Header */}
            <div className="relative h-48 bg-slate-800">
              <img 
                src={activeLandmark.image} 
                alt={activeLandmark.name} 
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              
              <button 
                onClick={() => setActiveLandmark(null)}
                className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="absolute bottom-4 left-6 right-6 text-white">
                <span className="px-2.5 py-0.5 bg-teal-500/90 text-white text-[10px] font-bold rounded-full uppercase tracking-wider">
                  {activeLandmark.category} • {activeLandmark.phase}
                </span>
                <h3 className="text-xl font-bold mt-1 text-white">{activeLandmark.name}</h3>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-4">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">About Facility</h4>
                <p className="text-xs text-slate-600 leading-relaxed">{activeLandmark.desc}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">Hours of Operation</span>
                  <span className="font-bold text-slate-800">{activeLandmark.hours}</span>
                </div>
                {activeLandmark.hotline && (
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px] uppercase">Direct Gate Hotline</span>
                    <span className="font-mono font-bold text-teal-700">{activeLandmark.hotline}</span>
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Amenities & Specs</h4>
                <div className="flex flex-wrap gap-1.5">
                  {activeLandmark.features.map((feat, idx) => (
                    <span key={idx} className="px-2.5 py-1 bg-teal-50 text-teal-800 border border-teal-200 text-xs font-semibold rounded-lg">
                      ✓ {feat}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex gap-2">
                {activeLandmark.hotline && (
                  <a
                    href={`tel:${activeLandmark.hotline}`}
                    className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm"
                  >
                    <PhoneCall className="w-4 h-4" /> Call Gate / Guard Post
                  </a>
                )}
                <button
                  onClick={() => setActiveLandmark(null)}
                  className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Add Emergency Contact Modal */}
      {showAddContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Add Emergency Hotline</h3>
              <button onClick={() => setShowAddContact(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddContact} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Name / Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Guard House Phase 1"
                  value={contactForm.name}
                  onChange={e => setContactForm({ ...contactForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                <select
                  value={contactForm.category}
                  onChange={e => setContactForm({ ...contactForm, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                >
                  <option value="EMERGENCY">EMERGENCY</option>
                  <option value="GUARD POST">GUARD POST</option>
                  <option value="PMO OFFICE">PMO OFFICE</option>
                  <option value="HOA OFFICERS">HOA OFFICERS</option>
                  <option value="UTILITIES">UTILITIES</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone / Mobile Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. +63 912 345 6789"
                  value={contactForm.number}
                  onChange={e => setContactForm({ ...contactForm, number: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Station Details</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Main Gate RFID Officer Duty"
                  value={contactForm.description}
                  onChange={e => setContactForm({ ...contactForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddContact(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-sm"
                >
                  Save Hotline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
