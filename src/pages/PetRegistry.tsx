import React, { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthContext';
import { Heart, Plus, Search, ShieldCheck, CheckCircle2, QrCode, Trash2, Tag, Calendar, AlertCircle, Edit3, X, Sparkles } from 'lucide-react';

export default function PetRegistry() {
  const { profile, token } = useAuth();

  const [myPets, setMyPets] = useState<any[]>([]);
  const [communityPets, setCommunityPets] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'my' | 'community'>('my');

  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [form, setForm] = useState({
    petName: '',
    species: 'Dog',
    breed: '',
    color: '',
    age: '1 year',
    rabiesVaccinated: true,
    vaccineDate: new Date().toISOString().split('T')[0],
    photo: '',
    notes: ''
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPets();
  }, [token]);

  const fetchPets = async () => {
    if (!token) return;
    setLoading(true);
    try {
      // Fetch user's pets
      const myRes = await fetch('/api/pets/my', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (myRes.ok) {
        const myData = await myRes.json();
        setMyPets(Array.isArray(myData) ? myData : []);
      }

      // Fetch all community pets
      const commRes = await fetch('/api/pets', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (commRes.ok) {
        const commData = await commRes.json();
        setCommunityPets(Array.isArray(commData) ? commData : []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterPet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/pets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(form)
      });

      if (res.ok) {
        alert('🎉 Pet registered successfully! HOA Digital Pet Tag issued.');
        setForm({
          petName: '',
          species: 'Dog',
          breed: '',
          color: '',
          age: '1 year',
          rabiesVaccinated: true,
          vaccineDate: new Date().toISOString().split('T')[0],
          photo: '',
          notes: ''
        });
        setShowForm(false);
        fetchPets();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to register pet.');
      }
    } catch (err: any) {
      alert(err.message || 'Error connecting to server.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePet = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to remove pet registration for "${name}"?`)) return;
    try {
      if (!token) return;
      const res = await fetch(`/api/pets/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchPets();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredCommunityPets = communityPets.filter(p => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (p.petName || '').toLowerCase().includes(q) ||
           (p.ownerName || '').toLowerCase().includes(q) ||
           (p.species || '').toLowerCase().includes(q) ||
           (p.breed || '').toLowerCase().includes(q) ||
           (p.tagNumber || '').toLowerCase().includes(q) ||
           (p.blockLot || '').toLowerCase().includes(q);
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-teal-700 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-200 text-xs font-bold uppercase tracking-wider mb-1">
            <Heart className="w-4 h-4 text-amber-300" /> Community Pet Safety & Registry
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-serif-luxury">Casa Mira South Pet Registry</h1>
          <p className="text-xs sm:text-sm text-amber-100 mt-1 max-w-2xl">
            Register your furry family members, obtain official HOA Digital Pet Tag IDs, and ensure rabies vaccination compliance across all phases.
          </p>
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-5 py-3 bg-white text-orange-950 font-black rounded-2xl shadow-lg hover:bg-orange-50 transition-all active:scale-95 shrink-0 text-xs sm:text-sm"
        >
          <Plus className="w-5 h-5 text-orange-600" />
          <span>Register New Pet</span>
        </button>
      </div>

      {/* Tabs bar */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('my')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'my'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <Heart className="w-4 h-4 text-orange-500" />
            <span>My Registered Pets ({myPets.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('community')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'community'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-teal-500" />
            <span>Community Directory ({communityPets.length})</span>
          </button>
        </div>

        {activeTab === 'community' && (
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by pet, tag, breed, owner..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-orange-500 outline-none"
            />
          </div>
        )}
      </div>

      {/* Add Pet Modal / Drawer */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-orange-100 text-orange-600 rounded-xl">
                  <Heart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Register Pet for HOA Tag</h3>
                  <p className="text-xs text-slate-500">Official Casa Mira South Resident Pet Identification</p>
                </div>
              </div>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterPet} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Pet Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Milo, Luna, Buddy"
                    value={form.petName}
                    onChange={e => setForm({ ...form, petName: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Species / Animal *</label>
                  <select
                    value={form.species}
                    onChange={e => setForm({ ...form, species: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="Dog">🐶 Dog</option>
                    <option value="Cat">🐱 Cat</option>
                    <option value="Bird">🦜 Bird</option>
                    <option value="Exotic">🐢 Exotic / Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Breed</label>
                  <input
                    type="text"
                    placeholder="e.g. Shih Tzu, Domestic Short Hair"
                    value={form.breed}
                    onChange={e => setForm({ ...form, breed: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Color / Markings</label>
                  <input
                    type="text"
                    placeholder="e.g. Brown & White, Black"
                    value={form.color}
                    onChange={e => setForm({ ...form, color: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Pet Age / Birth Year</label>
                  <input
                    type="text"
                    placeholder="e.g. 2 years old"
                    value={form.age}
                    onChange={e => setForm({ ...form, age: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Photo URL (Optional)</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={form.photo}
                    onChange={e => setForm({ ...form, photo: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-600" /> Rabies Vaccination Compliance
                  </span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.rabiesVaccinated}
                      onChange={e => setForm({ ...form, rabiesVaccinated: e.target.checked })}
                      className="w-4 h-4 accent-orange-600 rounded"
                    />
                    <span className="font-extrabold text-amber-950">Vaccinated</span>
                  </label>
                </div>

                {form.rabiesVaccinated && (
                  <div>
                    <label className="block text-[11px] text-amber-800 font-bold mb-1">Most Recent Vaccination Date</label>
                    <input
                      type="date"
                      value={form.vaccineDate}
                      onChange={e => setForm({ ...form, vaccineDate: e.target.value })}
                      className="w-full p-2 bg-white border border-amber-300 rounded-xl font-bold text-amber-950"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Additional Notes / Special Needs</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Friendly, wears blue collar, microchipped..."
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-extrabold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  {submitting ? 'Registering...' : 'Complete Pet Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MY PETS VIEW */}
      {activeTab === 'my' && (
        <div className="space-y-4">
          {myPets.length === 0 ? (
            <div className="p-12 bg-white rounded-3xl border border-slate-200 text-center space-y-3">
              <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto">
                <Heart className="w-8 h-8" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-base">No Pets Registered Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Keep the community safe! Register your pet to receive an official HOA Digital Pet Pass & ID Tag.
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="px-4 py-2.5 bg-orange-600 text-white font-bold rounded-xl text-xs shadow-md hover:bg-orange-700"
              >
                + Register First Pet
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myPets.map(pet => (
                <div key={pet.id} className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4 hover:shadow-md transition-all relative overflow-hidden">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-2xl bg-orange-100 text-orange-800 font-black text-xl flex items-center justify-center overflow-hidden border border-orange-200 shrink-0">
                        {pet.photo ? (
                          <img src={pet.photo} alt={pet.petName} className="w-full h-full object-cover" />
                        ) : (
                          pet.species === 'Dog' ? '🐶' : pet.species === 'Cat' ? '🐱' : pet.species === 'Bird' ? '🦜' : '🐾'
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-slate-900 text-lg">{pet.petName}</h3>
                          <span className="px-2.5 py-0.5 bg-orange-100 text-orange-900 font-extrabold text-[10px] rounded-full uppercase">
                            {pet.species}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-500">{pet.breed || 'Mixed Breed'} • {pet.color || 'N/A'}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Owner: {pet.ownerName} ({pet.blockLot})</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeletePet(pet.id, pet.petName)}
                      className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-all"
                      title="Remove Pet"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Digital HOA Pet Pass Tag Card */}
                  <div className="p-3.5 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl border border-teal-500/30 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-teal-400 uppercase tracking-widest block">HOA DIGITAL PET TAG ID</span>
                      <p className="font-mono font-extrabold text-sm text-amber-300 mt-0.5">{pet.tagNumber || `CMS-PET-${pet.id}`}</p>
                      <p className="text-[10px] text-slate-300 mt-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        {pet.rabiesVaccinated ? `Vaccinated (${pet.vaccineDate || 'Valid'})` : 'Vaccination Pending'}
                      </p>
                    </div>

                    <div className="p-2 bg-white rounded-xl text-slate-900 shadow-inner shrink-0 text-center">
                      <QrCode className="w-8 h-8 text-slate-900" />
                      <span className="text-[9px] font-extrabold text-slate-500 block mt-0.5">CMS PASSPORT</span>
                    </div>
                  </div>

                  {pet.notes && (
                    <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 italic">
                      "{pet.notes}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* COMMUNITY PETS DIRECTORY */}
      {activeTab === 'community' && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Casa Mira South Registered Community Pets</h3>
              <p className="text-xs text-slate-500">Official registry of pets across all subdivision phases.</p>
            </div>
            <span className="text-xs font-bold text-teal-700 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
              {filteredCommunityPets.length} Active Records
            </span>
          </div>

          {filteredCommunityPets.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs font-medium">
              No registered community pets found matching your query.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                  <tr>
                    <th className="p-4">Pet Details</th>
                    <th className="p-4">Owner & Address</th>
                    <th className="p-4">HOA Tag Number</th>
                    <th className="p-4">Rabies Vaccination</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCommunityPets.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-all">
                      <td className="p-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-800 font-extrabold text-base flex items-center justify-center overflow-hidden shrink-0 border border-orange-200">
                            {p.photo ? <img src={p.photo} alt="" className="w-full h-full object-cover" /> : (p.species === 'Dog' ? '🐶' : '🐱')}
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-900">{p.petName}</p>
                            <p className="text-[10px] text-slate-500">{p.species} • {p.breed || 'Mixed'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="font-bold text-slate-900">{p.ownerName || 'Resident'}</p>
                        <p className="text-[10px] text-slate-500">{p.blockLot || 'Casa Mira South'}</p>
                      </td>
                      <td className="p-4 font-mono font-bold text-teal-800">
                        {p.tagNumber || `CMS-PET-${p.id}`}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1 w-fit ${
                          p.rabiesVaccinated ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          <ShieldCheck className="w-3 h-3" />
                          {p.rabiesVaccinated ? 'COMPLIANT' : 'PENDING'}
                        </span>
                      </td>
                      <td className="p-4 font-extrabold text-emerald-700">
                        {p.status || 'APPROVED'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
