import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, ShieldCheck, QrCode, CheckCircle2, Download, MapPin, Building, Sparkles } from 'lucide-react';
import { useAuth } from './AuthContext';

interface ResidentPassModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ResidentPassModal({ isOpen, onClose }: ResidentPassModalProps) {
  const { profile, user } = useAuth();

  if (!isOpen || !profile) return null;

  const verificationPayload = JSON.stringify({
    app: "CasaMiraSouthOS",
    uid: profile.uid,
    name: profile.name,
    blockLot: profile.blockLot,
    role: profile.role,
    status: profile.approvalStatus,
    issuedAt: new Date().toISOString()
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto animate-in fade-in">
      <div className="relative w-full max-w-sm bg-slate-900 rounded-3xl shadow-2xl border border-teal-500/30 overflow-hidden my-auto text-white">
        
        {/* Holographic Top Banner */}
        <div className="bg-gradient-to-r from-teal-700 via-emerald-600 to-teal-800 p-5 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.2),transparent)]" />
          
          <button 
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 bg-black/30 hover:bg-black/50 text-white rounded-full transition-colors z-10"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center justify-center gap-1.5 text-teal-200 text-[10px] font-black uppercase tracking-widest mb-1">
            <Sparkles className="w-3.5 h-3.5" /> Official Digital Community ID Pass
          </div>
          <h2 className="text-xl font-extrabold tracking-tight text-white">CASA MIRA SOUTH</h2>
          <p className="text-[11px] text-teal-100 font-semibold">Homeowners Association • PMO Verified</p>
        </div>

        {/* Resident Identity */}
        <div className="p-6 text-center space-y-4">
          <div className="relative inline-block">
            <div className="w-24 h-24 mx-auto rounded-2xl bg-slate-800 border-2 border-teal-400 p-1 shadow-lg overflow-hidden">
              {profile.profileImage ? (
                <img src={profile.profileImage} alt={profile.name} className="w-full h-full object-cover rounded-xl" />
              ) : (
                <div className="w-full h-full bg-teal-900/60 text-teal-300 font-bold text-2xl flex items-center justify-center rounded-xl">
                  {profile.name?.[0] || 'R'}
                </div>
              )}
            </div>

            <span className="absolute -bottom-2 -right-2 p-1.5 bg-teal-500 text-slate-950 rounded-full shadow-md">
              <ShieldCheck className="w-4 h-4" />
            </span>
          </div>

          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">{profile.name}</h3>
            <p className="text-xs text-teal-300 font-medium flex items-center justify-center gap-1 mt-0.5">
              <MapPin className="w-3.5 h-3.5" /> {profile.blockLot || 'Casa Mira South Phase 1-3'}
            </p>
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-teal-950/80 border border-teal-500/40 text-teal-300 rounded-full text-xs font-extrabold uppercase tracking-wider">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
              {profile.role?.replace('_', ' ')} • VERIFIED RESIDENT
            </div>
          </div>

          {/* Scannable QR Code */}
          <div className="p-4 bg-white rounded-2xl shadow-inner max-w-[200px] mx-auto flex flex-col items-center">
            <QRCodeSVG 
              value={`${window.location.origin}/guard-verify?code=${encodeURIComponent(profile.username || profile.blockLot || profile.uid)}`}
              size={160}
              level="H"
              includeMargin={false}
            />
            <p className="text-[10px] text-slate-500 font-mono font-semibold mt-2 truncate w-full text-center uppercase">
              PASS: {profile.username || profile.blockLot || profile.uid.slice(0, 10)}
            </p>
          </div>

          {/* Access Clearances */}
          <div className="grid grid-cols-2 gap-2 text-left text-[11px] font-medium pt-2 border-t border-slate-800 text-slate-300">
            <div className="p-2 bg-slate-800/80 rounded-xl flex items-center gap-2 border border-slate-700">
              <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
              <span>Guard Gate Access</span>
            </div>
            <div className="p-2 bg-slate-800/80 rounded-xl flex items-center gap-2 border border-slate-700">
              <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
              <span>Swimming Pool Pass</span>
            </div>
            <div className="p-2 bg-slate-800/80 rounded-xl flex items-center gap-2 border border-slate-700">
              <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
              <span>Clubhouse Amenities</span>
            </div>
            <div className="p-2 bg-slate-800/80 rounded-xl flex items-center gap-2 border border-slate-700">
              <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
              <span>PMO Water Billing</span>
            </div>
          </div>

          <p className="text-[10px] text-slate-500">
            Show this QR code to Guard Gate Officers or PMO Staff for verification.
          </p>
        </div>
      </div>
    </div>
  );
}
