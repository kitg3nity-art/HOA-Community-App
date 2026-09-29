import React, { useState, useEffect } from 'react';
import { ShieldCheck, QrCode, Search, CheckCircle2, AlertTriangle, User, MapPin, Phone, Building, Calendar, ArrowLeft, RefreshCw, Sparkles, Camera, ShieldAlert, FileText, Check, ExternalLink } from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import CasaMiraLogo from '../components/CasaMiraLogo';

interface ScanResult {
  valid: boolean;
  verificationStatus: string;
  name?: string;
  username?: string;
  phase?: string;
  blockLot?: string;
  role?: string;
  profileImage?: string;
  phoneNumber?: string;
  email?: string;
  tempAccessPin?: string;
  passType?: string;
  scannedAt?: string;
  message?: string;
}

export default function GuardVerify() {
  const [searchParams] = useSearchParams();
  const [inputCode, setInputCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [recentScans, setRecentScans] = useState<any[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [guardPost, setGuardPost] = useState('Gate 1 Main Guardhouse');

  useEffect(() => {
    fetchRecentScans();
    
    // Auto verify if opened via QR link / URL parameters
    const queryCode = searchParams.get('code') || searchParams.get('uid') || searchParams.get('pass');
    if (queryCode) {
      setInputCode(queryCode);
      handleVerify(queryCode);
    }
  }, [searchParams]);

  const fetchRecentScans = async () => {
    try {
      const res = await fetch('/api/public/verify-pass?code=P3A2B15L21');
      if (res.ok) {
        const data = await res.json();
        if (data.valid) {
          setRecentScans([
            { id: 1, name: data.name, blockLot: data.blockLot, phase: data.phase, time: '2 mins ago', status: 'VERIFIED' },
            { id: 2, name: 'Juan Dela Cruz', blockLot: 'Phase 1 Block 4 Lot 12', phase: 'Phase 1', time: '14 mins ago', status: 'VERIFIED' },
            { id: 3, name: 'Engr. Carlos Mendoza', blockLot: 'Phase 1 Block 1 Lot 1', phase: 'Phase 1', time: '28 mins ago', status: 'PMO OFFICIAL' }
          ]);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleVerify = async (codeToVerify?: string) => {
    const code = (codeToVerify || inputCode).trim();
    if (!code) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/public/verify-pass?code=${encodeURIComponent(code)}`);
      if (res.ok) {
        const data = await res.json();
        setResult(data);
        if (data.valid) {
          setRecentScans(prev => [
            {
              id: Date.now(),
              name: data.name,
              blockLot: data.blockLot,
              phase: data.phase,
              time: 'Just now',
              status: data.verificationStatus
            },
            ...prev.slice(0, 4)
          ]);
        }
      } else {
        setResult({
          valid: false,
          verificationStatus: 'INVALID',
          message: 'Error connecting to verification server.'
        });
      }
    } catch (err) {
      setResult({
        valid: false,
        verificationStatus: 'INVALID',
        message: 'Network error. Please check gate terminal connection.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoScan = (demoUsername: string) => {
    setInputCode(demoUsername);
    handleVerify(demoUsername);
  };

  const handleLogGateEntry = async () => {
    if (!result || !result.name) return;
    try {
      await fetch('/api/public/log-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codeScanned: result.username || inputCode,
          residentName: result.name,
          blockLot: result.blockLot,
          phase: result.phase,
          guardLocation: guardPost,
          verificationStatus: result.verificationStatus
        })
      });
      alert(`Gate entry logged for ${result.name} at ${guardPost}!`);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-teal-500 selection:text-white flex flex-col">
      {/* Top Guard Bar Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/" className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <CasaMiraLogo className="w-10 h-10" variant="badge" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-tight text-white uppercase">Casa Mira Gate Security</h1>
              <span className="px-2 py-0.5 bg-teal-500/20 border border-teal-500/40 text-teal-300 text-[10px] font-extrabold rounded-full uppercase">
                Public Guard Terminal
              </span>
            </div>
            <p className="text-xs text-slate-400">Non-login Proof of Residency & QR Gate Verification System</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={guardPost}
            onChange={(e) => setGuardPost(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-teal-500"
          >
            <option value="Gate 1 Main Guardhouse">Gate 1 Main Guardhouse</option>
            <option value="Gate 2 Resident Expressway">Gate 2 Resident Expressway</option>
            <option value="Grand Clubhouse & Infinity Pool Checkpoint (Utility Officer)">Grand Clubhouse Pool Checkpoint (Utility)</option>
            <option value="Covered Basketball & Sports Court Post (Utility Officer)">Covered Sports Court Access (Utility)</option>
            <option value="Phase 3 Security Checkpoint">Phase 3 Security Checkpoint</option>
            <option value="Town Center Pedestrian Gate">Town Center Pedestrian Gate</option>
          </select>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            Terminal Online
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: QR Scanner & Manual Input */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Scanner Viewport */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center">
            <div className="flex items-center justify-between w-full mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-teal-400" /> Optical Pass Scanner
              </span>
              <button
                onClick={() => setIsScanning(!isScanning)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  isScanning ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-teal-500/20 text-teal-300 border border-teal-500/40 hover:bg-teal-500/30'
                }`}
              >
                {isScanning ? 'Stop Camera' : 'Start Live Camera'}
              </button>
            </div>

            {/* Viewport Canvas Simulation */}
            <div className="w-full h-64 bg-slate-950 border-2 border-dashed border-slate-800 rounded-2xl relative flex flex-col items-center justify-center overflow-hidden group">
              {isScanning ? (
                <>
                  <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-teal-400 to-transparent shadow-lg shadow-teal-500/50 animate-bounce" style={{ animationDuration: '2s' }} />
                  <Camera className="w-12 h-12 text-teal-400/50 animate-pulse mb-2" />
                  <p className="text-xs text-teal-400 font-medium">Position Resident QR Code inside frame...</p>
                  <span className="text-[10px] text-slate-500 mt-1">Auto-focusing camera sensor</span>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-slate-600 mb-3 group-hover:scale-110 transition-transform">
                    <QrCode className="w-8 h-8 text-teal-500" />
                  </div>
                  <p className="text-xs font-bold text-slate-300">Scan QR Code or Type Username</p>
                  <p className="text-[11px] text-slate-500 mt-1 text-center max-w-xs">Scan physical RFID pass or enter Phase, Block & Lot code e.g. P3A2B15L21</p>
                </>
              )}
            </div>

            {/* Manual Form Search */}
            <form onSubmit={(e) => { e.preventDefault(); handleVerify(); }} className="w-full mt-6 space-y-3">
              <label className="text-xs font-bold text-slate-300 block">Manual Code / Username Lookup</label>
              <div className="relative">
                <input
                  type="text"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  placeholder="Enter Username e.g. P3A2B15L21 or Pass Pin"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3.5 text-sm font-bold text-white placeholder-slate-600 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 uppercase tracking-wide"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="absolute right-2 top-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Verify
                </button>
              </div>
            </form>
          </div>

          {/* Gate Terminal Quick Info */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-400" /> Security Guard Guidelines
            </h3>
            <ul className="text-xs text-slate-400 space-y-2 list-disc list-inside leading-relaxed">
              <li>Verify Homeowner photo avatar and Phase, Block & Lot matching physical ID or RFID tag.</li>
              <li>Valid active status displays a green checkmark banner.</li>
              <li>Logged entry scans are recorded in PMO security audit logs automatically.</li>
            </ul>
          </div>

        </div>

        {/* Right Column: Verification Result & Details */}
        <div className="lg:col-span-7 space-y-6">
          
          {result ? (
            result.valid ? (
              /* Verified Resident Card */
              <div className="bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border-2 border-emerald-500/50 rounded-3xl p-6 lg:p-8 shadow-2xl relative overflow-hidden animate-in fade-in duration-300">
                {/* Background Glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                
                {/* Status Banner */}
                <div className="flex items-center justify-between pb-6 border-b border-emerald-500/20">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-black text-emerald-400 tracking-tight uppercase">VERIFIED RESIDENT</span>
                        <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-extrabold rounded-full">
                          ACTIVE
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">Proof of Residency Confirmed • Official Casa Mira Pass</p>
                    </div>
                  </div>

                  <span className="text-xs font-bold text-slate-400 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800">
                    {result.passType}
                  </span>
                </div>

                {/* Resident Details Body */}
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
                  
                  {/* Photo Avatar & QR Code Column */}
                  <div className="sm:col-span-4 flex flex-col items-center text-center space-y-3">
                    <div className="w-28 h-28 rounded-3xl overflow-hidden border-4 border-emerald-500/40 shadow-xl relative bg-slate-950">
                      <img
                        src={result.profileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400'}
                        alt={result.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-2 right-2 bg-emerald-500 text-white p-1 rounded-full shadow-md">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    </div>

                    {/* Minimal Embedded Pass QR Code */}
                    <div className="p-3 bg-white rounded-2xl shadow-lg border border-slate-200 flex flex-col items-center">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(window.location.origin + '/guard-verify?code=' + (result.username || result.blockLot))}`}
                        alt="Pass QR Code"
                        className="w-24 h-24 object-contain"
                      />
                      <span className="text-[9px] font-mono text-slate-600 font-extrabold mt-1 uppercase tracking-tight">
                        {result.username || 'CMS-PASS'}
                      </span>
                    </div>
                  </div>

                  {/* Info Breakdown */}
                  <div className="sm:col-span-8 space-y-4">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Resident Full Name</span>
                      <h2 className="text-2xl font-black text-white">{result.name}</h2>
                    </div>

                    <div className="grid grid-cols-2 gap-3 bg-slate-950/80 p-4 rounded-2xl border border-slate-800/80">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                          <Building className="w-3 h-3 text-teal-400" /> Phase Assignment
                        </span>
                        <p className="text-sm font-extrabold text-teal-300 mt-0.5">{result.phase}</p>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-teal-400" /> Block & Lot
                        </span>
                        <p className="text-sm font-extrabold text-white mt-0.5">{result.blockLot}</p>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-teal-400" /> Contact Phone
                        </span>
                        <p className="text-xs font-bold text-slate-300 mt-0.5">{result.phoneNumber || 'Discreet (Admin Only)'}</p>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                          <QrCode className="w-3 h-3 text-teal-400" /> Temp Access PIN
                        </span>
                        <p className="text-xs font-mono font-bold text-amber-400 mt-0.5">{result.tempAccessPin}</p>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Gate Action Controls */}
                <div className="mt-8 pt-6 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
                  <div className="text-xs text-slate-400">
                    Scanned at: <span className="font-bold text-slate-200">{new Date().toLocaleTimeString()}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleLogGateEntry}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold transition-all shadow-lg shadow-emerald-600/30 flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4" /> Log Gate Entry
                    </button>
                    <button
                      onClick={() => setResult(null)}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all"
                    >
                      Scan Next
                    </button>
                  </div>
                </div>

              </div>
            ) : (
              /* Invalid Pass Alert */
              <div className="bg-gradient-to-br from-red-950/40 via-slate-900 to-slate-900 border-2 border-red-500/50 rounded-3xl p-6 lg:p-8 shadow-2xl space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/30">
                    <AlertTriangle className="w-7 h-7" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-red-400 tracking-tight uppercase">UNVERIFIED PASS / INVALID CODE</h2>
                    <p className="text-xs text-slate-400">{result.message}</p>
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs text-slate-300">
                  <p className="font-bold text-red-400 mb-1">Gate Officer Protocol:</p>
                  <p>1. Please ask the driver/visitor to present a physical government ID.</p>
                  <p>2. Advise visitor to contact the homeowner or PMO office for gate endorsement.</p>
                </div>

                <button
                  onClick={() => setResult(null)}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all"
                >
                  Clear & Try Again
                </button>
              </div>
            )
          ) : (
            /* Idle Terminal Welcome Card */
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center flex flex-col items-center justify-center min-h-[380px]">
              <div className="w-20 h-20 bg-slate-800/80 rounded-3xl flex items-center justify-center text-teal-400 mb-4 border border-slate-700">
                <ShieldCheck className="w-10 h-10" />
              </div>
              <h2 className="text-xl font-extrabold text-white tracking-tight">Gate Verification Standby</h2>
              <p className="text-xs text-slate-400 max-w-sm mt-2 leading-relaxed">
                Scan a resident's QR code or enter their Phase, Block & Lot username (e.g. <span className="text-teal-400 font-extrabold">P3A2B15L21</span>) to display their instant proof of residency.
              </p>
            </div>
          )}

          {/* Recent Scans Logs */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-400" /> Recent Terminal Entries Log
              </h3>
              <span className="text-[10px] text-slate-500 font-bold">{guardPost}</span>
            </div>

            <div className="space-y-2.5">
              {recentScans.map((scan) => (
                <div key={scan.id} className="p-3 bg-slate-950 border border-slate-800/80 rounded-2xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center font-bold">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-white">{scan.name}</p>
                      <p className="text-[11px] text-slate-400">{scan.phase} • {scan.blockLot}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-extrabold rounded-full">
                      {scan.status}
                    </span>
                    <p className="text-[10px] text-slate-500 mt-1">{scan.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Guard Terminal Footer */}
        <footer className="mt-12 pt-6 pb-4 border-t border-slate-800 text-center">
          <p className="text-[11px] text-slate-500 font-medium">
            © 2026 Kieth Ryan Gonzales - AI Systems Design & Automated Web Development.
          </p>
        </footer>
      </main>
    </div>
  );
}
