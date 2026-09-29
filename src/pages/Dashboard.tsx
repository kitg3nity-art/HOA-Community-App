import React, { useEffect, useState } from 'react';
import { useAuth } from '../components/AuthContext';
import { 
  Megaphone, Calendar, Store, Sparkles, MapPin, 
  Receipt, QrCode, AlertTriangle, Heart, Users, Bot, 
  ShieldCheck, Droplets, Phone, ChevronRight, CheckCircle2,
  Clock, Shield, ArrowUpRight, Flame, Check
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react';
import welcomeBannerAsset from '../assets/images/dashboard_welcome_banner_1786372728954.jpg';
import { BadgeList } from '../components/BadgePill';
import ResidentPassModal from '../components/ResidentPassModal';
import CasaMiraLogo from '../components/CasaMiraLogo';

export default function Dashboard() {
  const { profile, token } = useAuth();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [myBills, setMyBills] = useState<any[]>([]);
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);
  const [isPassFlipped, setIsPassFlipped] = useState(false);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'ALL' | 'WATER' | 'PMO' | 'SECURITY' | 'EVENT'>('ALL');

  useEffect(() => {
    if (token) fetchDashboardData();
  }, [token]);

  const fetchDashboardData = async () => {
    try {
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      const fetchAnnouncements = async () => {
        try {
          const res = await fetch('/api/announcements', { headers });
          if (res.ok) {
            const data = await res.json();
            setAnnouncements(Array.isArray(data) ? data.slice(0, 6) : []);
          }
        } catch (e) {
          console.error("Announcements fetch error", e);
        }
      };

      const fetchEvents = async () => {
        try {
          const res = await fetch('/api/events', { headers });
          if (res.ok) {
            const data = await res.json();
            setEvents(Array.isArray(data) ? data.slice(0, 4) : []);
          }
        } catch (e) {
          console.error("Events fetch error", e);
        }
      };

      const fetchListings = async () => {
        try {
          const res = await fetch('/api/listings', { headers });
          if (res.ok) {
            const data = await res.json();
            setListings(Array.isArray(data) ? data.slice(0, 4) : []);
          }
        } catch (e) {
          console.error("Listings fetch error", e);
        }
      };

      const fetchBillings = async () => {
        try {
          const res = await fetch('/api/billings/my', { headers });
          if (res.ok) {
            const data = await res.json();
            setMyBills(Array.isArray(data) ? data : []);
          }
        } catch (e) {
          console.error("Billings fetch error", e);
        }
      };

      await Promise.all([fetchAnnouncements(), fetchEvents(), fetchListings(), fetchBillings()]);
    } catch (err) {
      console.error(err);
    }
  };

  const latestBill = myBills[0] || null;
  const isLatestSettled = latestBill ? (latestBill.status === 'PAID' || (latestBill.hoaStatus === 'PAID' && latestBill.waterStatus === 'PAID')) : true;
  const isLatestPending = latestBill ? (latestBill.status === 'PENDING_VERIFICATION' || latestBill.hoaStatus === 'PENDING_VERIFICATION' || latestBill.waterStatus === 'PENDING_VERIFICATION') : false;

  const householdCode = profile?.blockLot 
    ? `CMS-${(profile?.phase || 'P1').replace(/\s+/g, '').toUpperCase()}-${profile.blockLot.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)}`
    : `CMS-RES-${profile?.id || '1001'}`;

  const passVerificationUrl = `${window.location.origin}/verify-pass?code=${encodeURIComponent(profile?.uid || 'CMS-RESIDENT')}`;

  const filteredAnnouncements = announcements.filter(item => {
    if (activeCategoryFilter === 'ALL') return true;
    const cat = (item.category || '').toUpperCase();
    return cat.includes(activeCategoryFilter);
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Resident Digital Gate Pass Modal */}
      <ResidentPassModal isOpen={isPassModalOpen} onClose={() => setIsPassModalOpen(false)} />

      {/* ============================================================== */}
      {/* 1. MOBILE-FIRST RESIDENT IDENTITY & DIGITAL PASS CARD          */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Digital RFID / QR Resident ID Card (Interactive Flip) */}
        <div className="lg:col-span-7">
          <div className="relative rounded-3xl overflow-hidden shadow-xl bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 border border-teal-500/30 text-white p-6 sm:p-7 flex flex-col justify-between min-h-[260px]">
            {/* Background subtle glow patterns */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

            {/* Top row: Crest & Status Chips */}
            <div className="flex items-center justify-between gap-3 relative z-10">
              <div className="flex items-center gap-3">
                <CasaMiraLogo className="w-10 h-10 shrink-0" variant="badge" />
                <div>
                  <h3 className="font-extrabold text-sm tracking-tight text-white uppercase leading-none">
                    Casa Mira South
                  </h3>
                  <span className="text-[10px] font-bold tracking-wider text-teal-400 uppercase mt-0.5 block">
                    Digital Resident Access Card
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-teal-500/20 text-teal-300 border border-teal-500/40 rounded-full text-[10px] font-extrabold uppercase flex items-center gap-1 shadow-xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-400" /> Verified
                </span>
                <button
                  onClick={() => setIsPassFlipped(!isPassFlipped)}
                  className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-slate-200 border border-white/20 rounded-full text-[10px] font-bold transition-all cursor-pointer"
                  title="Toggle QR Gate Code"
                >
                  {isPassFlipped ? 'Show Info' : 'Show QR'}
                </button>
              </div>
            </div>

            {/* Mid Section: QR Code or Resident Identity */}
            <div className="py-4 relative z-10">
              {!isPassFlipped ? (
                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block font-semibold">
                      Registered Homeowner / Member
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
                      {profile?.name || 'Resident Member'}
                    </h2>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/80">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Household Code</span>
                      <span className="font-mono font-bold text-teal-300 text-xs truncate block">{householdCode}</span>
                    </div>
                    <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/80">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Phase & Lot</span>
                      <span className="font-bold text-white text-xs truncate block">{profile?.blockLot || 'Phase 1 Block 1 Lot 1'}</span>
                    </div>
                    <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/80 col-span-2 sm:col-span-1">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Declared Unit</span>
                      <span className="font-mono font-bold text-amber-300 text-xs">Unit Type {profile?.houseType || 'A'}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4 bg-slate-900/90 p-3 rounded-2xl border border-teal-500/40">
                  <div className="p-2 bg-white rounded-xl shrink-0 shadow-md">
                    <QRCodeSVG value={passVerificationUrl} size={84} level="M" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold uppercase text-amber-400 tracking-wider block">
                      Gate Guard Scanner QR
                    </span>
                    <p className="text-xs text-slate-200 font-medium leading-relaxed">
                      Present at Gate 1 or Gate 2 RFID scanner for express resident clearance.
                    </p>
                    <span className="text-[10px] font-mono text-teal-300 font-bold block">
                      ID: {profile?.uid?.slice(0, 16)}...
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Row: Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10 relative z-10 text-xs">
              <div className="flex items-center gap-2 text-slate-300 font-mono text-[11px]">
                <MapPin className="w-3.5 h-3.5 text-teal-400" />
                <span>Naga City, Cebu · Subdivision Gate Pass</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPassModalOpen(true)}
                  className="px-3.5 py-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Enlarge for Guard</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Live HOA Dues & Utilities Snapshot Card (Mobile-First Card, No Tables!) */}
        <div className="lg:col-span-5">
          <div className="h-full bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-50 text-amber-700 rounded-xl">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 leading-tight">My HOA & Utility Account</h3>
                  <span className="text-[10px] font-bold text-slate-500">{latestBill?.billingMonth || 'Current Period'}</span>
                </div>
              </div>

              {isLatestSettled ? (
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full text-[10px] font-extrabold uppercase flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> All Paid
                </span>
              ) : isLatestPending ? (
                <span className="px-2.5 py-1 bg-amber-100 text-amber-800 border border-amber-200 rounded-full text-[10px] font-extrabold uppercase flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" /> PMO Verifying
                </span>
              ) : (
                <span className="px-2.5 py-1 bg-rose-100 text-rose-800 border border-rose-200 rounded-full text-[10px] font-extrabold uppercase flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Due
                </span>
              )}
            </div>

            {/* Current Balance Display */}
            <div className="py-4 my-auto">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Outstanding Statement Balance
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-black text-slate-900 font-mono tracking-tight">
                  ₱{latestBill && !isLatestSettled ? latestBill.totalAmount : '0.00'}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {latestBill && !isLatestSettled ? `due by ${latestBill.dueDate ? new Date(latestBill.dueDate).toLocaleDateString() : 'month-end'}` : 'account in good standing'}
                </span>
              </div>

              {/* Utility Metric Breakdown Cards Grid */}
              <div className="grid grid-cols-2 gap-2.5 mt-4">
                <div className="p-3 bg-sky-50/70 border border-sky-100 rounded-2xl">
                  <div className="flex items-center justify-between text-sky-800 mb-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wide flex items-center gap-1">
                      <Droplets className="w-3.5 h-3.5 text-sky-600" /> Water
                    </span>
                    <span className="text-xs font-black font-mono">₱{latestBill?.waterAmount || '0'}</span>
                  </div>
                  <span className="text-[10px] text-slate-600 block">
                    {latestBill?.waterUsage || '0'} m³ consumed
                  </span>
                </div>

                <div className="p-3 bg-teal-50/70 border border-teal-100 rounded-2xl">
                  <div className="flex items-center justify-between text-teal-800 mb-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wide flex items-center gap-1">
                      <Receipt className="w-3.5 h-3.5 text-teal-600" /> HOA Dues
                    </span>
                    <span className="text-xs font-black font-mono">₱{latestBill?.hoaDues || '240'}</span>
                  </div>
                  <span className="text-[10px] text-slate-600 block">
                    Unit Type {profile?.houseType || 'A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick 1-tap Pay action */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
              <Link
                to="/billings"
                className="text-xs font-bold text-teal-700 hover:text-teal-900 hover:underline flex items-center gap-1"
              >
                Statement History →
              </Link>

              <Link
                to="/billings"
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 active:scale-95"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>{latestBill && !isLatestSettled ? `Pay ₱${latestBill.totalAmount}` : 'View Statements'}</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. RESIDENT SERVICES & QUICK ACTIONS GRID                      */}
      {/* ============================================================== */}
      <section aria-labelledby="services-grid-heading">
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <h2 id="services-grid-heading" className="text-base font-extrabold text-slate-900 tracking-tight">
              Community Services & Quick Access
            </h2>
            <p className="text-xs text-slate-500">Touch cards designed for quick mobile homeowner access</p>
          </div>
          <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
            8 Services Active
          </span>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 sm:gap-3">
          {/* Card 1: Gate Pass */}
          <button
            onClick={() => setIsPassModalOpen(true)}
            className="p-3 bg-white hover:bg-teal-50/60 border border-slate-200/90 hover:border-teal-300 rounded-2xl transition-all text-center flex flex-col items-center justify-between shadow-xs cursor-pointer group active:scale-95"
          >
            <div className="w-11 h-11 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center group-hover:scale-105 transition-transform mb-1.5 shadow-2xs">
              <QrCode className="w-5 h-5" />
            </div>
            <p className="text-xs font-extrabold text-slate-900 leading-tight">Gate Pass</p>
            <span className="text-[9.5px] text-slate-400 mt-0.5">RFID & QR</span>
          </button>

          {/* Card 2: Dues & Bills */}
          <Link
            to="/billings"
            className="p-3 bg-white hover:bg-amber-50/60 border border-slate-200/90 hover:border-amber-300 rounded-2xl transition-all text-center flex flex-col items-center justify-between shadow-xs group active:scale-95"
          >
            <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center group-hover:scale-105 transition-transform mb-1.5 shadow-2xs">
              <Receipt className="w-5 h-5" />
            </div>
            <p className="text-xs font-extrabold text-slate-900 leading-tight">Pay Dues</p>
            <span className="text-[9.5px] text-slate-400 mt-0.5">Water & HOA</span>
          </Link>

          {/* Card 3: Announcements */}
          <Link
            to="/announcements"
            className="p-3 bg-white hover:bg-emerald-50/60 border border-slate-200/90 hover:border-emerald-300 rounded-2xl transition-all text-center flex flex-col items-center justify-between shadow-xs group active:scale-95"
          >
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition-transform mb-1.5 shadow-2xs">
              <Megaphone className="w-5 h-5" />
            </div>
            <p className="text-xs font-extrabold text-slate-900 leading-tight">Bulletins</p>
            <span className="text-[9.5px] text-slate-400 mt-0.5">PMO Alerts</span>
          </Link>

          {/* Card 4: Marketplace */}
          <Link
            to="/marketplace"
            className="p-3 bg-white hover:bg-purple-50/60 border border-slate-200/90 hover:border-purple-300 rounded-2xl transition-all text-center flex flex-col items-center justify-between shadow-xs group active:scale-95"
          >
            <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center group-hover:scale-105 transition-transform mb-1.5 shadow-2xs">
              <Store className="w-5 h-5" />
            </div>
            <p className="text-xs font-extrabold text-slate-900 leading-tight">Market</p>
            <span className="text-[9.5px] text-slate-400 mt-0.5">Local Goods</span>
          </Link>

          {/* Card 5: Report Hazard */}
          <Link
            to="/reports"
            className="p-3 bg-white hover:bg-rose-50/60 border border-slate-200/90 hover:border-rose-300 rounded-2xl transition-all text-center flex flex-col items-center justify-between shadow-xs group active:scale-95"
          >
            <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center group-hover:scale-105 transition-transform mb-1.5 shadow-2xs">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <p className="text-xs font-extrabold text-slate-900 leading-tight">Report</p>
            <span className="text-[9.5px] text-slate-400 mt-0.5">Repairs & PMO</span>
          </Link>

          {/* Card 6: Pet Tags */}
          <Link
            to="/pets"
            className="p-3 bg-white hover:bg-pink-50/60 border border-slate-200/90 hover:border-pink-300 rounded-2xl transition-all text-center flex flex-col items-center justify-between shadow-xs group active:scale-95"
          >
            <div className="w-11 h-11 rounded-2xl bg-pink-50 text-pink-700 flex items-center justify-center group-hover:scale-105 transition-transform mb-1.5 shadow-2xs">
              <Heart className="w-5 h-5" />
            </div>
            <p className="text-xs font-extrabold text-slate-900 leading-tight">Pet Tags</p>
            <span className="text-[9.5px] text-slate-400 mt-0.5">Registry</span>
          </Link>

          {/* Card 7: Directory */}
          <Link
            to="/directory"
            className="p-3 bg-white hover:bg-sky-50/60 border border-slate-200/90 hover:border-sky-300 rounded-2xl transition-all text-center flex flex-col items-center justify-between shadow-xs group active:scale-95"
          >
            <div className="w-11 h-11 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center group-hover:scale-105 transition-transform mb-1.5 shadow-2xs">
              <Users className="w-5 h-5" />
            </div>
            <p className="text-xs font-extrabold text-slate-900 leading-tight">Neighbors</p>
            <span className="text-[9.5px] text-slate-400 mt-0.5">Directory</span>
          </Link>

          {/* Card 8: Mirai AI Concierge */}
          <Link
            to="/assistant"
            className="p-3 bg-white hover:bg-emerald-50/60 border border-slate-200/90 hover:border-emerald-300 rounded-2xl transition-all text-center flex flex-col items-center justify-between shadow-xs group active:scale-95"
          >
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center group-hover:scale-105 transition-transform mb-1.5 shadow-xs">
              <Bot className="w-5 h-5" />
            </div>
            <p className="text-xs font-extrabold text-slate-900 leading-tight">Mirai AI</p>
            <span className="text-[9.5px] text-slate-400 mt-0.5">Assistant</span>
          </Link>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 3. COMMUNITY ADVISORIES & ANNOUNCEMENTS (CARDS & GRIDS)        */}
      {/* ============================================================== */}
      <section aria-labelledby="bulletins-heading" className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
          <div>
            <h2 id="bulletins-heading" className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-teal-600" />
              Community Announcements & Advisories
            </h2>
            <p className="text-xs text-slate-500">Official bulletins broadcast by PMO and HOA Board</p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {(['ALL', 'WATER', 'PMO', 'SECURITY', 'EVENT'] as const).map(cat => (
              <button
                key={`cat-${cat}`}
                onClick={() => setActiveCategoryFilter(cat)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  activeCategoryFilter === cat
                    ? 'bg-slate-900 text-white font-extrabold shadow-2xs'
                    : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {cat === 'ALL' ? 'All Bulletins' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Announcements Grid (Cards - Not Rows) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredAnnouncements.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-400 text-xs bg-white rounded-3xl border border-dashed border-slate-200">
              No bulletins found in this category.
            </div>
          ) : (
            filteredAnnouncements.map(ann => {
              const isHigh = ann.priority === 'HIGH';
              return (
                <article
                  key={`ann-${ann.id}`}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between shadow-xs hover:shadow-md ${
                    isHigh
                      ? 'bg-gradient-to-br from-rose-50/90 to-white border-rose-200/90 ring-1 ring-rose-400/30'
                      : 'bg-white border-slate-200/90 hover:border-teal-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider ${
                        isHigh ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-teal-50 text-teal-800 border border-teal-200'
                      }`}>
                        {ann.category || 'PMO Advisory'}
                      </span>
                      <time className="text-[10px] text-slate-400 font-mono font-medium">
                        {format(new Date(ann.createdDate || ann.createdAt || Date.now()), 'MMM d, yyyy')}
                      </time>
                    </div>

                    <h3 className="font-extrabold text-sm text-slate-900 leading-snug line-clamp-2">
                      {ann.title}
                    </h3>

                    <p className="text-xs text-slate-600 mt-2 line-clamp-3 leading-relaxed">
                      {ann.description}
                    </p>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10.5px] font-bold text-slate-400">Official Notice</span>
                    <Link
                      to="/announcements"
                      className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1 group"
                    >
                      <span>Read More</span>
                      <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </Link>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>

      {/* ============================================================== */}
      {/* 4. MARKETPLACE & EVENTS CARDS & GRIDS                          */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Community Marketplace Visual Cards Grid */}
        <section className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Store className="w-5 h-5 text-purple-600" />
                Community Marketplace & Services
              </h2>
              <p className="text-xs text-slate-500">Verified resident items and home services</p>
            </div>
            <Link to="/marketplace" className="text-xs font-bold text-teal-700 hover:underline">
              See All ({listings.length}) →
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
            {listings.length === 0 ? (
              <div className="col-span-full py-8 text-center text-slate-400 text-xs">No active listings</div>
            ) : (
              listings.slice(0, 4).map(item => (
                <Link
                  key={`item-${item.id}`}
                  to="/marketplace"
                  className="p-3 rounded-2xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 hover:border-purple-200 transition-all flex flex-col justify-between group shadow-2xs"
                >
                  <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-200 mb-2 relative">
                    {item.image ? (
                      <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-purple-700 bg-purple-50">
                        <Store className="w-6 h-6" />
                      </div>
                    )}
                    <span className="absolute bottom-1.5 right-1.5 px-2 py-0.5 bg-slate-950/85 backdrop-blur-sm text-white font-mono font-black text-[11px] rounded-lg">
                      ₱{item.price}
                    </span>
                  </div>

                  <div>
                    <span className="text-[9.5px] font-extrabold uppercase text-purple-700 block tracking-wide">{item.category || 'Goods'}</span>
                    <h4 className="text-xs font-extrabold text-slate-900 truncate mt-0.5 group-hover:text-purple-700 transition-colors">
                      {item.title}
                    </h4>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        {/* Upcoming Community Activities Cards Grid */}
        <section className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-sky-600" />
                Subdivision Events
              </h2>
              <p className="text-xs text-slate-500">Upcoming gatherings & activities</p>
            </div>
            <Link to="/events" className="text-xs font-bold text-teal-700 hover:underline">
              Calendar →
            </Link>
          </div>

          <div className="space-y-2.5">
            {events.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">No upcoming events scheduled</div>
            ) : (
              events.slice(0, 3).map(evt => (
                <div key={`evt-${evt.id}`} className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3 hover:bg-sky-50/50 transition-colors">
                  <div className="w-11 h-11 rounded-xl bg-sky-100 text-sky-900 flex flex-col items-center justify-center shrink-0 border border-sky-200 font-mono">
                    <span className="text-[9px] uppercase font-bold text-sky-600 leading-none">
                      {format(new Date(evt.date || Date.now()), 'MMM')}
                    </span>
                    <span className="text-sm font-black leading-tight">
                      {format(new Date(evt.date || Date.now()), 'd')}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-extrabold text-slate-900 truncate">{evt.title}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{format(new Date(evt.date || Date.now()), 'h:mm a')}</span>
                      {evt.location && <span>• {evt.location}</span>}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <Link
              to="/events"
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition-all"
            >
              <span>Explore All Community Events</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>
      </div>

      {/* ============================================================== */}
      {/* 5. SUBDIVISION HOTLINES & SECURITY TAP-TO-CALL CARD            */}
      {/* ============================================================== */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 border border-slate-800 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0 border border-teal-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-teal-400 uppercase tracking-widest block">24/7 Security & Support</span>
              <h3 className="font-extrabold text-sm text-white">Casa Mira South Emergency Dispatch</h3>
            </div>
          </div>

          {/* Quick Tap-To-Call Chips */}
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="tel:+639123456789"
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              <Phone className="w-3.5 h-3.5 text-amber-400" />
              <span>Gate 1 Guard: +63 912 345 6789</span>
            </a>
            <a
              href="tel:+639178889900"
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              <Droplets className="w-3.5 h-3.5 text-sky-400" />
              <span>PMO Office: +63 917 888 9900</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

