import React from 'react';
import { Shield, Lock, FileText, CheckCircle2, X, Eye, ShieldCheck, Heart } from 'lucide-react';

interface TermsPrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TermsPrivacyModal({ isOpen, onClose }: TermsPrivacyModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-amber-900/10 overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-6 bg-amber-950 text-white flex items-center justify-between shrink-0 border-b border-amber-900/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-amber-50">Terms, Safety & Privacy Policy</h2>
              <p className="text-xs text-amber-200/80">Casa Mira South Subdivision Resident Data Protection</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-amber-200/60 hover:text-white hover:bg-amber-900/50 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs leading-relaxed text-slate-700 font-sans">
          
          {/* Security Guarantee Banner */}
          <div className="p-4 bg-amber-50/80 border border-amber-200/80 rounded-2xl flex items-start gap-3 text-amber-950">
            <Lock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold text-xs text-amber-900">100% Secure & Encrypted Infrastructure</p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                All homeowner data, contact details, billing records, and pass QR codes are encrypted with industry-grade security protocols. Only authorized HOA board officers and verified PMO administrators have strict access.
              </p>
            </div>
          </div>

          {/* Section 1 */}
          <div className="space-y-2">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-700" />
              1. Terms of Use for Casa Mira Residency Portal
            </h3>
            <p>
              By accessing the Casa Mira South Subdivision Portal, residents, property owners, and authorized officers agree to maintain account confidentiality. Passwords, short access PINs, and personal QR passes must not be shared with unauthorized third parties.
            </p>
          </div>

          {/* Section 2 */}
          <div className="space-y-2">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-700" />
              2. Protection of Personal Information (Data Privacy Act)
            </h3>
            <p>
              In compliance with national data privacy standards (Republic Act 10173), we collect only necessary homeowner details (Full Name, Phase No., Block & Lot No., Contact Number, and Payment Proofs) strictly for community security, gate access verification, and monthly billing management.
            </p>
            <ul className="list-disc list-inside text-slate-600 pl-2 space-y-1">
              <li>Your personal contact information is never sold or shared with external marketers.</li>
              <li>Public directory listings respect individual resident contact preferences.</li>
              <li>Financial transactions and payment GCash receipts are handled under encrypted PMO audit logs.</li>
            </ul>
          </div>

          {/* Section 3 */}
          <div className="space-y-2">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Eye className="w-4 h-4 text-amber-700" />
              3. Gate & Facility QR Verification Protocols
            </h3>
            <p>
              Security guards and utility personnel (pool and sports court officers) scan QR passes solely to verify proof of residency and validate amenity usage rights. No private personal data beyond name, phase, block, and lot is publicly displayed on public gate terminals.
            </p>
          </div>

          {/* Section 4 */}
          <div className="space-y-2">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Heart className="w-4 h-4 text-amber-700" />
              4. Warm & Safe Community Standards
            </h3>
            <p>
              Our community chat, marketplace, memory vault, and report modules promote respectful, heartwarming neighborly interactions. Profanity, harassment, or unauthorized solicitation will result in account moderation by the HOA Board.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div>
            <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Protected & Verified Policy
            </span>
            <p className="text-[9.5px] text-slate-400 mt-0.5">
              © 2026 Kieth Ryan Gonzales - AI Systems Design & Automated Web Development.
            </p>
          </div>

          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-amber-950 hover:bg-amber-900 text-amber-100 font-bold text-xs rounded-xl shadow-md transition-all shrink-0"
          >
            I Accept & Understand
          </button>
        </div>

      </div>
    </div>
  );
}
