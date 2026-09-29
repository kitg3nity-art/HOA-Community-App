import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { auth } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { X, Camera, Image, Phone, MapPin, User, LogOut, CheckCircle2, Save, Users, Home } from 'lucide-react';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileSettingsModal({ isOpen, onClose }: ProfileSettingsModalProps) {
  const { profile, token, logout } = useAuth();
  const navigate = useNavigate();

  const [householdMembers, setHouseholdMembers] = useState<any[]>([]);
  const [availablePhases, setAvailablePhases] = useState<string[]>(['Phase 1', 'Phase 2', 'Phase 3', 'Phase 3A', 'Phase 3B', 'Phase 3A.2']);

  useEffect(() => {
    fetch('/api/utility-settings')
      .then(res => res.json())
      .then(data => {
        if (data.phases) {
          const parsed = typeof data.phases === 'string' ? JSON.parse(data.phases) : data.phases;
          if (Array.isArray(parsed) && parsed.length > 0) {
            setAvailablePhases(parsed);
          }
        }
      })
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    if (isOpen && token) {
      fetch('/api/household/members', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setHouseholdMembers(data);
        })
        .catch(err => console.error("Error fetching household members:", err));
    }
  }, [isOpen, token, profile?.blockLot]);

  const parseAddress = (initialPhase?: string, initialBlockLot?: string) => {
    let phase = initialPhase || 'Phase 1';
    let block = '1';
    let lot = '1';

    if (initialBlockLot) {
      const phaseMatch = initialBlockLot.match(/Phase\s*([0-9A-Z\.]+)/i);
      if (phaseMatch && phaseMatch[1]) {
        phase = `Phase ${phaseMatch[1]}`;
      }
      const blockMatch = initialBlockLot.match(/(?:Block|B)\s*(\d+)/i);
      if (blockMatch && blockMatch[1]) {
        block = blockMatch[1];
      }
      const lotMatch = initialBlockLot.match(/(?:Lot|L)\s*(\d+)/i);
      if (lotMatch && lotMatch[1]) {
        lot = lotMatch[1];
      }
    }

    return { phase, block, lot };
  };

  const parsedAddr = parseAddress(profile?.phase, profile?.blockLot);
  const [addressPhase, setAddressPhase] = useState(parsedAddr.phase);
  const [addressBlock, setAddressBlock] = useState(parsedAddr.block);
  const [addressLot, setAddressLot] = useState(parsedAddr.lot);

  const [formData, setFormData] = useState({
    name: profile?.name || '',
    phoneNumber: profile?.phoneNumber || '',
    profileImage: profile?.profileImage || '',
    coverImage: profile?.coverImage || '',
    skills: profile?.skills || '',
    servicesOffered: profile?.servicesOffered || '',
    contactPreference: profile?.contactPreference || ''
  });

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const coverPresets = [
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80'
  ];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'profileImage' | 'coverImage') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, [field]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formattedBlockLot = `${addressPhase} Block ${addressBlock} Lot ${addressLot}`;
      const payload = {
        ...formData,
        phase: addressPhase,
        blockLot: formattedBlockLot
      };

      let currentToken = token;
      let res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {})
        },
        body: JSON.stringify(payload)
      });

      if (res.status === 401 && auth.currentUser) {
        const freshToken = await auth.currentUser.getIdToken(true);
        res = await fetch('/api/users/me', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${freshToken}`
          },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          onClose();
          window.location.reload();
        }, 1000);
      }
    } catch (err) {
      console.error("Failed to update profile", err);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        
        {/* Cover Photo Header */}
        <div className="relative h-44 bg-slate-800 overflow-hidden">
          {formData.coverImage ? (
            <img src={formData.coverImage} alt="Cover" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-teal-600 via-teal-700 to-emerald-800 flex items-center justify-center">
              <span className="text-white/40 font-semibold text-sm">No Cover Photo Set</span>
            </div>
          )}
          <div className="absolute inset-0 bg-black/20" />
          
          <button 
            type="button"
            onClick={onClose} 
            className="absolute top-4 right-4 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Upload Cover Photo Trigger */}
          <label className="absolute bottom-3 right-3 px-3 py-1.5 bg-black/50 hover:bg-black/70 backdrop-blur-md text-white text-xs font-semibold rounded-lg cursor-pointer flex items-center gap-1.5 transition-colors border border-white/20">
            <Image className="w-3.5 h-3.5" />
            <span>Change Cover</span>
            <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, 'coverImage')} />
          </label>
        </div>

        {/* Profile Image Avatar Positioned */}
        <div className="px-6 relative pb-4">
          <div className="flex items-end justify-between -mt-12 mb-4">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full border-4 border-white shadow-md bg-slate-100 overflow-hidden flex items-center justify-center">
                {formData.profileImage ? (
                  <img src={formData.profileImage} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full bg-teal-100 text-teal-800 font-bold text-2xl flex items-center justify-center">
                    {formData.name?.[0] || 'U'}
                  </div>
                )}
              </div>
              <label className="absolute bottom-0 right-0 p-2 bg-teal-600 hover:bg-teal-700 text-white rounded-full cursor-pointer shadow-md transition-all">
                <Camera className="w-4 h-4" />
                <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, 'profileImage')} />
              </label>
            </div>

            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-teal-50 text-teal-700 border border-teal-200 text-xs font-bold rounded-full uppercase tracking-wide">
                {profile?.role || 'Resident'}
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Quick Cover Photo Presets */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Quick Cover Photo Presets</label>
              <div className="grid grid-cols-4 gap-2">
                {coverPresets.map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setFormData(p => ({ ...p, coverImage: url }))}
                    className={`h-12 rounded-lg overflow-hidden border-2 transition-all ${formData.coverImage === url ? 'border-teal-600 ring-2 ring-teal-500/30' : 'border-slate-200 hover:border-teal-400'}`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
              </div>

              {/* Address Dropdowns: Phase, Block, Lot */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <label className="text-xs font-black uppercase text-slate-800 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-teal-600" />
                    <span>Address & Location (Phase, Block, Lot Dropdowns)</span>
                  </label>
                  <span className="text-[10px] font-extrabold text-teal-800 px-2.5 py-0.5 bg-teal-100 border border-teal-200 rounded-md">
                    {addressPhase}, Block {addressBlock}, Lot {addressLot}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Phase Dropdown */}
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                      Subdivision Phase
                    </label>
                    <select
                      value={addressPhase}
                      onChange={e => setAddressPhase(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none shadow-sm cursor-pointer"
                    >
                      {Array.from(new Set([...availablePhases, addressPhase])).map(ph => (
                        <option key={ph} value={ph}>{ph}</option>
                      ))}
                    </select>
                  </div>

                  {/* Block Dropdown */}
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                      Block Number
                    </label>
                    <select
                      value={addressBlock}
                      onChange={e => setAddressBlock(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none shadow-sm cursor-pointer"
                    >
                      {Array.from({ length: 80 }, (_, i) => String(i + 1)).map(num => (
                        <option key={num} value={num}>Block {num}</option>
                      ))}
                    </select>
                  </div>

                  {/* Lot Dropdown */}
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                      Lot Number
                    </label>
                    <select
                      value={addressLot}
                      onChange={e => setAddressLot(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none shadow-sm cursor-pointer"
                    >
                      {Array.from({ length: 80 }, (_, i) => String(i + 1)).map(num => (
                        <option key={num} value={num}>Lot {num}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Household Family Group Section */}
            <div className="p-4 bg-teal-900/10 border border-teal-200/80 rounded-2xl space-y-3">
              <div className="flex items-center justify-between border-b border-teal-200/60 pb-2">
                <span className="text-xs font-black uppercase text-teal-800 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-teal-600" />
                  <span>Household Family Group ({profile?.blockLot || 'Address Pending'})</span>
                </span>
                <span className="text-[10px] font-black px-2 py-0.5 bg-teal-600 text-white rounded-md uppercase tracking-wider">
                  {householdMembers.length} {householdMembers.length === 1 ? 'Member' : 'Members'}
                </span>
              </div>

              {householdMembers.length > 0 ? (
                <div className="space-y-2">
                  {householdMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 font-black text-xs flex items-center justify-center overflow-hidden shrink-0 border border-teal-200">
                          {member.profileImage ? (
                            <img src={member.profileImage} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            member.name?.[0] || 'M'
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                            {member.name}
                            {member.id === profile?.id && (
                              <span className="text-[9px] font-extrabold px-1.5 py-0.2 bg-teal-100 text-teal-800 rounded">You</span>
                            )}
                          </p>
                          <p className="text-[10px] text-slate-500 font-semibold">{member.email || member.username || 'Resident'}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md uppercase">
                        {member.role || 'Resident'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">
                  No other family members registered under this address yet.
                </p>
              )}

              <div className="flex items-center justify-between text-[11px] text-teal-700 pt-1 font-semibold">
                <span>All family accounts sharing {profile?.blockLot || 'this unit'} are automatically grouped.</span>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate('/directory');
                  }}
                  className="text-xs font-extrabold text-teal-800 hover:text-teal-900 underline underline-offset-2"
                >
                  View in Directory &rarr;
                </button>
              </div>
            </div>
            <div className="p-4 bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-black uppercase text-teal-400 flex items-center gap-1.5">
                  Homeowner Login & Gate Pass Credentials
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-teal-500/20 text-teal-300 rounded-md">
                  VERIFIED
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Username Format</span>
                  <span className="font-mono font-extrabold text-amber-300 text-sm">{profile?.username || profile?.blockLot || 'P3A2B15L21'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Access Pass PIN</span>
                  <span className="font-mono font-extrabold text-teal-300 text-sm">{profile?.tempAccessPin || 'CM3A21'}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px]">Connected Email: <strong className="text-white">{profile?.email || 'Not connected'}</strong></span>
                <button
                  type="button"
                  onClick={() => {
                    const newEmail = prompt('Enter email address to link to your homeowner username account:', profile?.email || '');
                    if (newEmail) {
                      fetch('/api/users/me/link-email', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({ email: newEmail })
                      }).then(() => alert('Email linked successfully! You can now log in via Username or Email.'));
                    }
                  }}
                  className="px-3 py-1 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-lg text-[11px] transition-all"
                >
                  Connect Email / Google
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number (for Community SMS Announcements)</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="e.g. +63 917 123 4567"
                  value={formData.phoneNumber}
                  onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">SMS Text Subscription & Notification Preference</label>
              <select
                value={formData.contactPreference || 'BOTH'}
                onChange={e => setFormData({ ...formData, contactPreference: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500 outline-none bg-white font-medium"
              >
                <option value="BOTH">📱 Subscribed: Both SMS Text Messages & Email Alerts (Recommended)</option>
                <option value="SMS">💬 Subscribed: SMS Text Messages Only</option>
                <option value="EMAIL">📧 Subscribed: Email Alerts Only</option>
                <option value="NONE">🔕 Unsubscribed: Mute All Notifications</option>
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                Only homeowners who select <strong>SMS & Email</strong> or <strong>SMS Only</strong> will receive text alerts on their mobile phone for new community announcements.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Skills & Specialties</label>
                <input
                  type="text"
                  placeholder="e.g. Electrical, Plumbing, Baking"
                  value={formData.skills}
                  onChange={e => setFormData({ ...formData, skills: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Services Offered</label>
                <input
                  type="text"
                  placeholder="e.g. AC Cleaning, Catering"
                  value={formData.servicesOffered}
                  onChange={e => setFormData({ ...formData, servicesOffered: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>
            </div>

            {success && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Profile & Cover Photo updated successfully!
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={handleSignOut}
                className="px-4 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 font-bold text-xs rounded-xl flex items-center gap-2 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
