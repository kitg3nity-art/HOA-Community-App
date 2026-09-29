import React from 'react';
import { X, MapPin, Mail, Phone, Briefcase, Sparkles, ShieldCheck, CheckCircle2, User, PhoneCall, Building2, Award, Heart, Shield } from 'lucide-react';
import { BadgeList } from './BadgePill';

interface PublicProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  isAdminViewer?: boolean;
}

export default function PublicProfileModal({
  isOpen,
  onClose,
  user,
  isAdminViewer = false
}: PublicProfileModalProps) {
  if (!isOpen || !user) return null;

  // Extract Phase only (e.g. Phase 1 / Phase 2 / Phase 3) from phase or blockLot
  const getPublicPhaseOnly = () => {
    if (user.phase) return user.phase;
    if (user.blockLot) {
      const match = user.blockLot.match(/Phase\s*\d+/i);
      if (match) return match[0];
    }
    return 'Phase 1';
  };

  const publicPhase = getPublicPhaseOnly();

  // Contact privacy logic
  const isPublicContact = user.isContactPublic || isAdminViewer;
  const displayPhone = isPublicContact
    ? (user.phoneNumber || 'Not disclosed')
    : `•••• ••• ${user.phoneNumber ? user.phoneNumber.slice(-4) : '5678'}`;

  const displayEmail = isPublicContact
    ? (user.email || 'Not disclosed')
    : `${user.email ? user.email.split('@')[0].slice(0, 2) + '••••@' + user.email.split('@')[1] : 'h••••@casamira.ph'}`;

  const skillsList = user.skills ? user.skills.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
  const servicesList = user.servicesOffered ? user.servicesOffered.split(',').map((s: string) => s.trim()).filter(Boolean) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        
        {/* Modal Header Bar with Close Button */}
        <div className="px-6 pt-5 pb-2 flex items-center justify-between border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2 text-slate-600 bg-slate-100 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider">
            <Building2 className="w-3.5 h-3.5 text-teal-600" />
            <span>Resident Directory Profile</span>
          </div>

          <button
            onClick={onClose}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-full transition-all"
            title="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Profile Card Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          
          {/* Avatar & Key Header Info */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-600 to-slate-800 text-white p-0.5 shadow-md border border-slate-200 shrink-0 relative">
                <div className="w-full h-full rounded-[14px] bg-slate-800 text-white font-black text-xl flex items-center justify-center overflow-hidden">
                  {user.profileImage ? (
                    <img src={user.profileImage} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    user.name?.[0] || 'R'
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-teal-500 text-white rounded-full flex items-center justify-center ring-2 ring-white" title="Verified Resident">
                  <CheckCircle2 className="w-3 h-3" />
                </div>
              </div>

              <div className="space-y-1">
                <h2 className="font-extrabold text-slate-900 text-xl leading-tight">
                  {user.name}
                </h2>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                    user.role === 'ADMIN' || user.role === 'SUPERADMIN' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                    user.role === 'SERVICE_PROVIDER' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                    user.role === 'EVENT_ORGANIZER' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                    'bg-slate-100 text-slate-800 border border-slate-200'
                  }`}>
                    {user.role ? user.role.replace('_', ' ') : 'RESIDENT'}
                  </span>
                  <span className="px-2 py-0.5 bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-bold rounded-lg">
                    Unit Type {user.houseType || 'A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Badges Pill Row */}
            <div className="shrink-0">
              <BadgeList badges={user.badges} size="sm" />
            </div>
          </div>

          {/* Residence & Subdivision Location Card */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-teal-100 text-teal-800 rounded-xl">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Neighborhood Location</span>
                <span className="font-extrabold text-slate-900 text-sm">{publicPhase} • Casa Mira South</span>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-teal-50 text-teal-800 border border-teal-200 font-extrabold text-[10px] rounded-lg flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-teal-600" /> Phase Secured
            </span>
          </div>

          {/* Services Provided & Skills Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase text-slate-600 tracking-wider flex items-center gap-1.5">
              <Briefcase className="w-4 h-4 text-teal-600" /> Offered Services & Skills
            </h4>

            {servicesList.length > 0 || skillsList.length > 0 ? (
              <div className="space-y-2.5">
                {servicesList.length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block mb-1">Services Offered to Community:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {servicesList.map((svc: string, i: number) => (
                        <span key={i} className="px-3 py-1 bg-emerald-50 text-emerald-950 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1">
                          💼 {svc}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {skillsList.length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block mb-1">Expertise & Professional Skills:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {skillsList.map((sk: string, i: number) => (
                        <span key={i} className="px-3 py-1 bg-teal-50 text-teal-950 border border-teal-200 rounded-xl text-xs font-bold flex items-center gap-1">
                          ⚡ {sk}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs text-slate-400">
                No specific services or professional skills listed on public profile.
              </div>
            )}
          </div>

          {/* Bio / Community Interests */}
          {user.interests && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Heart className="w-3 h-3 text-teal-600" /> Community Bio & Interests
              </span>
              <p className="text-slate-700 font-medium leading-relaxed italic">{user.interests}</p>
            </div>
          )}

          {/* Direct Contact Hub */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <h4 className="text-xs font-black uppercase text-slate-600 tracking-wider">Public Contact Info</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <span className="text-slate-400 font-medium flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-teal-600" /> Phone:
                </span>
                <span className="font-bold text-slate-900 font-mono">{displayPhone}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between truncate">
                <span className="text-slate-400 font-medium flex items-center gap-1.5 shrink-0">
                  <Mail className="w-3.5 h-3.5 text-teal-600" /> Email:
                </span>
                <span className="font-bold text-slate-900 font-mono truncate ml-1">{displayEmail}</span>
              </div>
            </div>

            {isPublicContact && user.phoneNumber ? (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <a
                  href={`tel:${user.phoneNumber}`}
                  className="py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-2 shadow-sm"
                >
                  <PhoneCall className="w-4 h-4" /> Call Direct
                </a>
                <a
                  href={`mailto:${user.email}`}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-2"
                >
                  <Mail className="w-4 h-4" /> Send Email
                </a>
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 text-center italic bg-slate-50 p-2 rounded-xl">
                Contact details masked for resident privacy preferences.
              </p>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-md"
          >
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
}
