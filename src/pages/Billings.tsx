import React, { useEffect, useState } from 'react';
import { useAuth } from '../components/AuthContext';
import { auth } from '../lib/firebase';
import { 
  Receipt, Droplets, CreditCard, Upload, CheckCircle2, AlertCircle, 
  Clock, FileText, Download, ShieldCheck, QrCode, Eye, Copy, Check, 
  Building, Sparkles, ArrowUpDown, ChevronLeft, ChevronRight, Lock, Users, Star
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import CalculationSummaryModal from '../components/CalculationSummaryModal';
import HouseholdManagementModal from '../components/HouseholdManagementModal';

export default function Billings() {
  const { token, profile } = useAuth();
  const [billings, setBillings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBill, setSelectedBill] = useState<any | null>(null);
  const [paymentType, setPaymentType] = useState<'FULL' | 'WATER' | 'HOA'>('FULL');
  const [summaryModalBill, setSummaryModalBill] = useState<any | null>(null);
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentProof, setPaymentProof] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [copiedAccountId, setCopiedAccountId] = useState(false);

  // Separate Table Controls: HOA Table
  const [hoaMonthFilter, setHoaMonthFilter] = useState('ALL');
  const [hoaSortOrder, setHoaSortOrder] = useState<'LATEST' | 'OLDEST'>('LATEST');
  const [hoaPage, setHoaPage] = useState(1);

  // Separate Table Controls: Water Table
  const [waterMonthFilter, setWaterMonthFilter] = useState('ALL');
  const [waterSortOrder, setWaterSortOrder] = useState<'LATEST' | 'OLDEST'>('LATEST');
  const [waterPage, setWaterPage] = useState(1);
  const [isHouseholdModalOpen, setIsHouseholdModalOpen] = useState(false);
  const [displayMode, setDisplayMode] = useState<'CARDS' | 'TABLE'>('CARDS');

  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    fetchMyBillings();
  }, [token]);

  const fetchMyBillings = async () => {
    try {
      let currentToken = token;
      if (auth.currentUser) {
        currentToken = await auth.currentUser.getIdToken();
      }
      const res = await fetch('/api/billings/my', {
        headers: currentToken ? { Authorization: `Bearer ${currentToken}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setBillings(Array.isArray(data) ? data : []);
      } else if (res.status === 401 && auth.currentUser) {
        const newToken = await auth.currentUser.getIdToken(true);
        const retryRes = await fetch('/api/billings/my', { headers: { Authorization: `Bearer ${newToken}` } });
        if (retryRes.ok) {
          const data = await retryRes.json();
          setBillings(Array.isArray(data) ? data : []);
        } else {
          setBillings([]);
        }
      } else {
        setBillings([]);
      }
    } catch (e) {
      console.error(e);
      setBillings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPaymentProof(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBill) return;

    setSubmitting(true);
    try {
      const defaultAmt = paymentType === 'WATER'
        ? (selectedBill.totalWaterPayable || selectedBill.waterAmount)
        : paymentType === 'HOA'
        ? (selectedBill.totalHoaPayable || selectedBill.hoaDues)
        : selectedBill.totalAmount;

      const res = await fetch(`/api/billings/${selectedBill.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ 
          paymentType,
          paymentProof, 
          paymentRef, 
          amountPaid: paymentAmount || defaultAmt
        })
      });

      if (res.ok) {
        setSuccessMsg(`Payment receipt for ${paymentType === 'WATER' ? 'Water Bill' : paymentType === 'HOA' ? 'HOA Monthly Dues' : 'Full Statement'} submitted successfully! PMO Accounting will review and clear your balance.`);
        setSelectedBill(null);
        setPaymentProof('');
        setPaymentRef('');
        setPaymentAmount('');
        fetchMyBillings();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const safeBillings = Array.isArray(billings) ? billings : [];
  
  // The latest bill (most recent statement in date order)
  const latestBill = safeBillings[0];

  // Derive standardized Household Account ID & Household declared Unit Type
  const householdAccountId = latestBill?.accountNo || (() => {
    if (!profile?.blockLot) return `CMS-HH-${profile?.id || 1000}`;
    const pStr = profile.phase ? (profile.phase.match(/\d+/) ? `P${profile.phase.match(/\d+/)?.[0]}` : 'P1') : 'P1';
    const bMatch = profile.blockLot.match(/B(?:lock)?\s*(\d+)/i);
    const lMatch = profile.blockLot.match(/L(?:ot)?\s*(\d+)/i);
    const blStr = (bMatch && lMatch) ? `B${bMatch[1]}L${lMatch[1]}` : profile.blockLot.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    return `CMS-${pStr}-${blStr}`;
  })();

  const declaredUnitType = latestBill?.residentHouseType || profile?.houseType || 'A';

  const handleCopyAccountId = () => {
    navigator.clipboard.writeText(householdAccountId);
    setCopiedAccountId(true);
    setTimeout(() => setCopiedAccountId(false), 2500);
  };

  const availableMonths = Array.from(new Set(safeBillings.map(b => b.billingMonth)));

  // --- HOA TABLE FILTERING, SORTING, PAGINATION ---
  const filteredHoaBillings = safeBillings.filter(b => {
    const hasHoaComponent = parseFloat(b.hoaDues || '0') > 0 || parseFloat(b.totalHoaPayable || '0') > 0;
    if (!hasHoaComponent) return false;
    return hoaMonthFilter === 'ALL' || b.billingMonth === hoaMonthFilter;
  });
  const sortedHoaBillings = [...filteredHoaBillings].sort((a, b) => {
    const timeA = new Date(a.createdAt || a.dueDate || 0).getTime();
    const timeB = new Date(b.createdAt || b.dueDate || 0).getTime();
    return hoaSortOrder === 'LATEST' ? timeB - timeA : timeA - timeB;
  });
  const totalHoaPages = Math.max(1, Math.ceil(sortedHoaBillings.length / ITEMS_PER_PAGE));
  const paginatedHoaBillings = sortedHoaBillings.slice((hoaPage - 1) * ITEMS_PER_PAGE, hoaPage * ITEMS_PER_PAGE);

  // --- WATER TABLE FILTERING, SORTING, PAGINATION ---
  const filteredWaterBillings = safeBillings.filter(b => {
    const hasWaterComponent = parseFloat(b.waterAmount || '0') > 0 || parseFloat(b.waterUsage || '0') > 0 || parseFloat(b.totalWaterPayable || '0') > 0;
    if (!hasWaterComponent) return false;
    return waterMonthFilter === 'ALL' || b.billingMonth === waterMonthFilter;
  });
  const sortedWaterBillings = [...filteredWaterBillings].sort((a, b) => {
    const timeA = new Date(a.createdAt || a.dueDate || 0).getTime();
    const timeB = new Date(b.createdAt || b.dueDate || 0).getTime();
    return waterSortOrder === 'LATEST' ? timeB - timeA : timeA - timeB;
  });
  const totalWaterPages = Math.max(1, Math.ceil(sortedWaterBillings.length / ITEMS_PER_PAGE));
  const paginatedWaterBillings = sortedWaterBillings.slice((waterPage - 1) * ITEMS_PER_PAGE, waterPage * ITEMS_PER_PAGE);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Frozen / Delinquent Alert Banner */}
      {profile?.isFrozen && (
        <div className="p-5 bg-red-600 text-white rounded-3xl shadow-lg border border-red-700 flex items-center justify-between gap-4 animate-bounce">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-8 h-8 shrink-0" />
            <div>
              <h3 className="font-bold text-base">ACCOUNT FROZEN & INACTIVE</h3>
              <p className="text-xs text-red-100">
                This account has exceeded 12 months of unpaid dues. Amenity access and water services are suspended. Please visit PMO Accounting to settle your balance.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Household Header Badge & Payment Options */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl border border-slate-800 space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-teal-500/10 to-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 bg-teal-500/20 text-teal-300 font-extrabold text-xs rounded-full border border-teal-500/30 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-teal-400" />
                Casa Mira South Resident
              </span>
              <span className="px-3 py-1 bg-sky-500/20 text-sky-300 font-bold text-xs rounded-full border border-sky-500/30">
                Household Unit Type {declaredUnitType}
              </span>
            </div>
            <h1 className="text-2xl font-black text-white mt-2">
              {profile?.name || 'Resident Homeowner'}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Property Address: <strong className="text-slate-200">{profile?.blockLot || 'Casa Mira Phase 1'}</strong>
            </p>
          </div>

          {/* Household Account ID Badge */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              onClick={() => setIsHouseholdModalOpen(true)}
              className="px-4 py-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-2xl font-extrabold text-xs transition-all flex items-center justify-center gap-2 shadow-sm"
              title="View and manage household account claims and Leader controls"
            >
              <Users className="w-4 h-4 text-amber-400" />
              <span>Household Members ⭐</span>
            </button>

            <div className="p-3.5 bg-slate-800/80 border border-slate-700/80 rounded-2xl flex items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider block">
                  Household Billing ID
                </span>
                <span className="text-base font-black text-white font-mono">{householdAccountId}</span>
              </div>
              <button
                onClick={handleCopyAccountId}
                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-slate-950 font-black text-xs rounded-xl transition-all flex items-center gap-1 shadow-sm active:scale-95"
              >
                {copiedAccountId ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedAccountId ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </div>

        {/* Separated Quick Payment Cards for LATEST SOA */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {/* Card 1: HOA Monthly Dues */}
          <div className="p-4 bg-white/5 border border-teal-500/30 rounded-2xl backdrop-blur flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-1">
                <span className="flex items-center gap-1 text-teal-300">
                  <Receipt className="w-4 h-4" /> HOA Monthly Dues
                </span>
                <span className={`px-2 py-0.5 text-[9px] font-black rounded uppercase ${
                  latestBill?.hoaStatus === 'PAID' ? 'bg-emerald-500/30 text-emerald-300' :
                  latestBill?.hoaStatus === 'PENDING_VERIFICATION' ? 'bg-amber-500/30 text-amber-300' : 'bg-rose-500/30 text-rose-300'
                }`}>
                  {latestBill?.hoaStatus || 'UNPAID'}
                </span>
              </div>
              <p className="text-2xl font-black text-teal-300">
                ₱{latestBill ? (latestBill.totalHoaPayable || latestBill.hoaDues) : '0.00'}
              </p>
              <p className="text-[11px] text-slate-300 mt-1">
                Unit Type {declaredUnitType} Fixed Dues: ₱{latestBill?.hoaDues || '0.00'}
                {parseFloat(latestBill?.hoaArrears || '0') > 0 && (
                  <span className="text-amber-300 font-bold block">
                    + ₱{latestBill.hoaArrears} previous HOA arrears carried over
                  </span>
                )}
              </p>
            </div>
            {latestBill && latestBill.hoaStatus !== 'PAID' ? (
              <button
                onClick={() => {
                  setSelectedBill(latestBill);
                  setPaymentType('HOA');
                  setPaymentAmount(latestBill.totalHoaPayable || latestBill.hoaDues);
                }}
                className="w-full py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5 active:scale-95"
              >
                <Receipt className="w-4 h-4" /> Pay HOA Dues (₱{latestBill.totalHoaPayable || latestBill.hoaDues})
              </button>
            ) : (
              <span className="px-3 py-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> HOA Dues Settled
              </span>
            )}
          </div>

          {/* Card 2: Water Charges */}
          <div className="p-4 bg-white/5 border border-sky-500/30 rounded-2xl backdrop-blur flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-1">
                <span className="flex items-center gap-1 text-sky-300">
                  <Droplets className="w-4 h-4" /> Water Meter Charges
                </span>
                <span className={`px-2 py-0.5 text-[9px] font-black rounded uppercase ${
                  latestBill?.waterStatus === 'PAID' ? 'bg-emerald-500/30 text-emerald-300' :
                  latestBill?.waterStatus === 'PENDING_VERIFICATION' ? 'bg-amber-500/30 text-amber-300' : 'bg-rose-500/30 text-rose-300'
                }`}>
                  {latestBill?.waterStatus || 'UNPAID'}
                </span>
              </div>
              <p className="text-2xl font-black text-sky-300">
                ₱{latestBill ? (latestBill.totalWaterPayable || latestBill.waterAmount) : '0.00'}
              </p>
              <p className="text-[11px] text-slate-300 mt-1">
                Current: ₱{latestBill?.waterAmount || '0.00'} ({latestBill?.waterUsage || 0}m³)
                {parseFloat(latestBill?.waterArrears || '0') > 0 && (
                  <span className="text-amber-300 font-bold block">
                    + ₱{latestBill.waterArrears} previous water arrears carried over
                  </span>
                )}
              </p>
            </div>
            {latestBill && latestBill.waterStatus !== 'PAID' ? (
              <button
                onClick={() => {
                  setSelectedBill(latestBill);
                  setPaymentType('WATER');
                  setPaymentAmount(latestBill.totalWaterPayable || latestBill.waterAmount);
                }}
                className="w-full py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5 active:scale-95"
              >
                <Droplets className="w-4 h-4" /> Pay Water Bill (₱{latestBill.totalWaterPayable || latestBill.waterAmount})
              </button>
            ) : (
              <span className="px-3 py-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Water Bill Settled
              </span>
            )}
          </div>

          {/* Card 3: Combined SOA Full Settlement */}
          <div className="p-4 bg-white/10 border border-emerald-500/30 rounded-2xl backdrop-blur flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-1">
                <span className="flex items-center gap-1 text-emerald-300">
                  <CreditCard className="w-4 h-4" /> Combined SOA Statement
                </span>
                <span className="text-[10px] text-teal-300 font-mono">HOA + Water</span>
              </div>
              <p className="text-2xl font-black text-emerald-300">
                ₱{latestBill ? latestBill.totalAmount : '0.00'}
              </p>
              <p className="text-[11px] text-slate-300 mt-1">
                Total net statement for {latestBill?.billingMonth || 'Current SOA'}
              </p>
            </div>
            {latestBill && latestBill.status !== 'PAID' ? (
              <button
                onClick={() => {
                  setSelectedBill(latestBill);
                  setPaymentType('FULL');
                  setPaymentAmount(latestBill.totalAmount);
                }}
                className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5 active:scale-95"
              >
                <Sparkles className="w-4 h-4" /> Pay Full SOA (₱{latestBill.totalAmount})
              </button>
            ) : (
              <span className="px-3 py-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Statement Fully Settled
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Carried Over Balances Notice Banner */}
      {latestBill && (parseFloat(latestBill.totalArrearsCarriedOver || latestBill.arrearsAmount || '0') > 0 || parseFloat(latestBill.hoaArrears || '0') > 0 || parseFloat(latestBill.waterArrears || '0') > 0) && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-amber-500 text-white rounded-xl shrink-0 font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-amber-950 text-xs sm:text-sm">
                🔄 Carried-Over Unpaid Balance Active ({latestBill.billingMonth})
              </h4>
              <p className="text-xs text-amber-900 mt-0.5">
                Previous unpaid HOA dues and water utility balances are automatically carried forward into your latest statement. Older bills are disabled to prevent double payment:
              </p>
              <div className="flex flex-wrap gap-2.5 mt-2 text-[11px] font-bold text-amber-950">
                {parseFloat(latestBill.hoaArrears || '0') > 0 && (
                  <span className="bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-300 flex items-center gap-1">
                    <Receipt className="w-3.5 h-3.5 text-teal-700" /> Carried HOA Arrears: +₱{latestBill.hoaArrears}
                  </span>
                )}
                {parseFloat(latestBill.waterArrears || '0') > 0 && (
                  <span className="bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-300 flex items-center gap-1">
                    <Droplets className="w-3.5 h-3.5 text-sky-700" /> Carried Water Arrears: +₱{latestBill.waterArrears}
                  </span>
                )}
                {parseFloat(latestBill.penaltyAmount || '0') > 0 && (
                  <span className="bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-300 text-rose-950 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-700" /> Overdue Penalties: +₱{latestBill.penaltyAmount}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="text-left sm:text-right shrink-0 border-t sm:border-t-0 border-amber-200 pt-2 sm:pt-0 w-full sm:w-auto">
            <span className="text-[10px] font-bold text-amber-800 uppercase block">Total Carried Over</span>
            <span className="text-xl font-black text-amber-950">
              ₱{latestBill.totalArrearsCarriedOver || latestBill.arrearsAmount}
            </span>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-700 hover:underline font-extrabold">
            Dismiss
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TABLE 1: HOA MONTHLY DUES STATEMENT HISTORY TABLE                         */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm space-y-0">
        {/* Table Controls Header */}
        <div className="p-5 bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-extrabold text-base flex items-center gap-2 text-white">
              <Receipt className="w-5 h-5 text-teal-400" />
              HOA Monthly Dues Statement History
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Fixed HOA monthly dues statements per household declared Unit Type <strong className="text-teal-300 font-mono">{declaredUnitType}</strong>
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Filter Month */}
            <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
              <span className="text-[11px] font-bold text-slate-300">Month:</span>
              <select
                value={hoaMonthFilter}
                onChange={e => { setHoaMonthFilter(e.target.value); setHoaPage(1); }}
                className="bg-transparent text-xs font-bold text-white outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-slate-900 text-white">All Months</option>
                {availableMonths.map(m => (
                  <option key={`hoa-m-${m}`} value={m} className="bg-slate-900 text-white">{m}</option>
                ))}
              </select>
            </div>

            {/* Sort Order Toggle */}
            <button
              onClick={() => {
                setHoaSortOrder(prev => prev === 'LATEST' ? 'OLDEST' : 'LATEST');
                setHoaPage(1);
              }}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-teal-400" />
              Sort: {hoaSortOrder === 'LATEST' ? 'Latest' : 'Oldest'}
            </button>

            {/* View Mode Toggle: Cards vs Table */}
            <div className="flex items-center bg-slate-800 p-0.5 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => setDisplayMode('CARDS')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  displayMode === 'CARDS' ? 'bg-teal-500 text-slate-950 font-black shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
              >
                🎴 Cards Grid
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('TABLE')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  displayMode === 'TABLE' ? 'bg-teal-500 text-slate-950 font-black shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
              >
                📑 Table
              </button>
            </div>
          </div>
        </div>

        {/* Display: Cards Grid (Mobile-First) or Classic Table */}
        {displayMode === 'CARDS' ? (
          <div className="p-4 sm:p-5 bg-slate-50/60">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {paginatedHoaBillings.map((bill) => {
                const isPaid = bill.hoaStatus === 'PAID';
                const isPending = bill.hoaStatus === 'PENDING_VERIFICATION';
                const isLatestHoaStatement = latestBill && bill.id === latestBill.id;
                const hoaPayable = bill.totalHoaPayable || bill.hoaDues;

                return (
                  <div key={`hoa-card-${bill.id}`} className="bg-white rounded-2xl border border-slate-200/90 hover:border-teal-400 p-5 shadow-xs transition-all space-y-3.5">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <span className="text-[10px] font-extrabold text-teal-700 uppercase tracking-wider block font-mono">SOA #{bill.id}</span>
                        <h4 className="font-extrabold text-base text-slate-900 leading-tight">{bill.billingMonth}</h4>
                      </div>
                      {isPaid ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-black rounded-full uppercase">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Settled
                        </span>
                      ) : isPending ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-black rounded-full uppercase">
                          <Clock className="w-3.5 h-3.5 text-amber-600" /> PMO Verifying
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-rose-100 text-rose-800 border border-rose-200 text-[10px] font-black rounded-full uppercase">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600" /> Unpaid
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 py-1 text-center">
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-500 font-bold block">Unit</span>
                        <span className="text-xs font-black text-slate-900 font-mono">Type {declaredUnitType}</span>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-500 font-bold block">Monthly Base</span>
                        <span className="text-xs font-black text-slate-900 font-mono">₱{bill.hoaDues}</span>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-500 font-bold block">Arrears</span>
                        <span className={`text-xs font-black font-mono ${parseFloat(bill.hoaArrears || '0') > 0 ? 'text-amber-700' : 'text-slate-500'}`}>
                          ₱{bill.hoaArrears || '0'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Net HOA Payable</span>
                        <span className="text-lg font-black text-slate-900 font-mono">₱{hoaPayable}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSummaryModalBill(bill)}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-teal-600" /> Details
                        </button>

                        {!isPaid && (
                          isLatestHoaStatement ? (
                            <button
                              onClick={() => {
                                setSelectedBill(bill);
                                setPaymentType('HOA');
                                setPaymentAmount(hoaPayable);
                              }}
                              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
                            >
                              <Receipt className="w-3.5 h-3.5" /> Pay HOA
                            </button>
                          ) : (
                            <span 
                              className="px-2.5 py-1.5 bg-slate-100 text-slate-500 border border-slate-200 rounded-xl text-[10px] font-bold flex items-center gap-1 opacity-80"
                            >
                              <Lock className="w-3 h-3 text-slate-400" /> Carried Over
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {sortedHoaBillings.length === 0 && !loading && (
              <div className="py-12 text-center text-slate-400 text-xs">No HOA Monthly Dues records found.</div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                  <th className="py-3.5 px-5">SOA Month & ID</th>
                  <th className="py-3.5 px-5">Household Unit Type</th>
                  <th className="py-3.5 px-5">Base HOA Dues</th>
                  <th className="py-3.5 px-5">Carried-Over HOA Arrears</th>
                  <th className="py-3.5 px-5 text-right">Total Net HOA Payable</th>
                  <th className="py-3.5 px-5 text-center">HOA Status</th>
                  <th className="py-3.5 px-5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paginatedHoaBillings.map((bill) => {
                  const isPaid = bill.hoaStatus === 'PAID';
                  const isPending = bill.hoaStatus === 'PENDING_VERIFICATION';
                  const isLatestHoaStatement = latestBill && bill.id === latestBill.id;
                  const hoaPayable = bill.totalHoaPayable || bill.hoaDues;

                  return (
                    <tr key={`hoa-table-${bill.id}`} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-5 whitespace-nowrap">
                        <span className="font-extrabold text-slate-900 block text-sm">{bill.billingMonth}</span>
                        <span className="text-[10px] text-teal-700 font-mono font-bold block mt-0.5">
                          Account: {householdAccountId} • SOA #{bill.id}
                        </span>
                      </td>

                      <td className="py-4 px-5 whitespace-nowrap">
                        <span className="px-2.5 py-1 bg-teal-50 text-teal-800 border border-teal-200 text-[11px] font-extrabold rounded-lg font-mono">
                          Unit Type {declaredUnitType}
                        </span>
                      </td>

                      <td className="py-4 px-5 whitespace-nowrap">
                        <span className="font-bold text-slate-800 text-sm">₱{bill.hoaDues}</span>
                        <span className="text-[10px] text-slate-400 block">Monthly Fixed Rate</span>
                      </td>

                      <td className="py-4 px-5 whitespace-nowrap">
                        <span className={`font-bold block text-sm ${parseFloat(bill.hoaArrears || '0') > 0 ? 'text-amber-700' : 'text-slate-500'}`}>
                          ₱{bill.hoaArrears || '0.00'}
                        </span>
                        {parseFloat(bill.hoaArrears || '0') > 0 && (
                          <span className="text-[10px] text-amber-700 font-bold block">Carried forward into this SOA</span>
                        )}
                      </td>

                      <td className="py-4 px-5 text-right whitespace-nowrap">
                        <span className="text-base font-black text-slate-900 block">₱{hoaPayable}</span>
                        <span className="text-[10px] text-slate-400 block">Due: {bill.dueDate ? new Date(bill.dueDate).toLocaleDateString() : '30th'}</span>
                      </td>

                      <td className="py-4 px-5 text-center whitespace-nowrap">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-black rounded-full uppercase">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Settled
                          </span>
                        ) : isPending ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-black rounded-full uppercase">
                            <Clock className="w-3.5 h-3.5 text-amber-600" /> PMO Verifying
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-rose-100 text-rose-800 border border-rose-200 text-[10px] font-black rounded-full uppercase">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-600" /> Unpaid
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setSummaryModalBill(bill)}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                            title="View HOA Dues calculation details"
                          >
                            <Eye className="w-3.5 h-3.5 text-teal-600" /> Details
                          </button>

                          {!isPaid && (
                            isLatestHoaStatement ? (
                              <button
                                onClick={() => {
                                  setSelectedBill(bill);
                                  setPaymentType('HOA');
                                  setPaymentAmount(hoaPayable);
                                }}
                                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white font-extrabold text-[11px] rounded-lg shadow-sm transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
                              >
                                <Receipt className="w-3.5 h-3.5" /> Pay HOA Dues
                              </button>
                            ) : (
                              <span 
                                className="px-3 py-1.5 bg-slate-100 text-slate-500 border border-slate-200 rounded-lg text-[10px] font-bold flex items-center gap-1 opacity-80"
                                title="Previous bill balance carried forward to latest SOA statement. Please settle via the latest statement."
                              >
                                <Lock className="w-3 h-3 text-slate-400" /> Carried Over (Pay via Latest SOA)
                              </span>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {sortedHoaBillings.length === 0 && !loading && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                      No HOA Monthly Dues records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* HOA Table Pagination Controls (Max 10 per page) */}
        {sortedHoaBillings.length > 0 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="text-slate-600 font-medium">
              Showing <strong className="text-slate-900">{(hoaPage - 1) * ITEMS_PER_PAGE + 1}</strong> to <strong className="text-slate-900">{Math.min(hoaPage * ITEMS_PER_PAGE, sortedHoaBillings.length)}</strong> of <strong className="text-slate-900">{sortedHoaBillings.length}</strong> HOA statements
            </span>

            <div className="flex items-center gap-1.5">
              <button
                disabled={hoaPage === 1}
                onClick={() => setHoaPage(p => Math.max(1, p - 1))}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              
              <span className="px-3 py-1.5 font-extrabold text-slate-800">
                Page {hoaPage} of {totalHoaPages}
              </span>

              <button
                disabled={hoaPage >= totalHoaPages}
                onClick={() => setHoaPage(p => Math.min(totalHoaPages, p + 1))}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 flex items-center gap-1"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* TABLE 2: WATER METER CHARGES STATEMENT HISTORY TABLE                      */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm space-y-0">
        {/* Table Controls Header */}
        <div className="p-5 bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-extrabold text-base flex items-center gap-2 text-white">
              <Droplets className="w-5 h-5 text-sky-400" />
              Water Meter Charges Statement History
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Meter reading log, cubic meter consumption brackets, and water charges
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Filter Month */}
            <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
              <span className="text-[11px] font-bold text-slate-300">Month:</span>
              <select
                value={waterMonthFilter}
                onChange={e => { setWaterMonthFilter(e.target.value); setWaterPage(1); }}
                className="bg-transparent text-xs font-bold text-white outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-slate-900 text-white">All Months</option>
                {availableMonths.map(m => (
                  <option key={`water-m-${m}`} value={m} className="bg-slate-900 text-white">{m}</option>
                ))}
              </select>
            </div>

            {/* Sort Order Toggle */}
            <button
              onClick={() => {
                setWaterSortOrder(prev => prev === 'LATEST' ? 'OLDEST' : 'LATEST');
                setWaterPage(1);
              }}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-sky-400" />
              Sort: {waterSortOrder === 'LATEST' ? 'Latest First' : 'Oldest First'}
            </button>
          </div>
        </div>

        {/* Display: Cards Grid (Mobile-First) or Classic Table */}
        {displayMode === 'CARDS' ? (
          <div className="p-4 sm:p-5 bg-slate-50/60">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {paginatedWaterBillings.map((bill) => {
                const isPaid = bill.waterStatus === 'PAID';
                const isPending = bill.waterStatus === 'PENDING_VERIFICATION';
                const isLatestWaterStatement = latestBill && bill.id === latestBill.id;
                const waterPayable = bill.totalWaterPayable || bill.waterAmount;

                return (
                  <div key={`water-card-${bill.id}`} className="bg-white rounded-2xl border border-slate-200/90 hover:border-sky-400 p-5 shadow-xs transition-all space-y-3.5">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <span className="text-[10px] font-extrabold text-sky-700 uppercase tracking-wider block font-mono">
                          SOA #{bill.id} · {householdAccountId}
                        </span>
                        <h4 className="font-extrabold text-base text-slate-900 leading-tight">{bill.billingMonth}</h4>
                      </div>
                      {isPaid ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-black rounded-full uppercase">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Settled
                        </span>
                      ) : isPending ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-black rounded-full uppercase">
                          <Clock className="w-3.5 h-3.5 text-amber-600" /> PMO Verifying
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-rose-100 text-rose-800 border border-rose-200 text-[10px] font-black rounded-full uppercase">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600" /> Unpaid
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 py-1 text-center">
                      <div className="p-2.5 bg-sky-50/70 rounded-xl border border-sky-100">
                        <span className="text-[10px] text-sky-800 font-bold block uppercase">Usage</span>
                        <span className="text-xs font-black text-sky-950 font-mono">{bill.waterUsage || 0} m³</span>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-500 font-bold block uppercase">Base Water</span>
                        <span className="text-xs font-black text-slate-900 font-mono">₱{bill.waterAmount}</span>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-500 font-bold block uppercase">Arrears</span>
                        <span className={`text-xs font-black font-mono ${parseFloat(bill.waterArrears || '0') > 0 ? 'text-amber-700' : 'text-slate-500'}`}>
                          ₱{bill.waterArrears || '0.00'}
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-500 font-mono flex items-center justify-between px-1">
                      <span>Meter Readings:</span>
                      <span className="font-semibold text-slate-700">{bill.prevReading || '0.00'} m³ → {bill.currReading || '0.00'} m³</span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Net Water Payable</span>
                        <span className="text-lg font-black text-slate-900 font-mono">₱{waterPayable}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSummaryModalBill(bill)}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-sky-600" /> Details
                        </button>

                        {!isPaid && (
                          isLatestWaterStatement ? (
                            <button
                              onClick={() => {
                                setSelectedBill(bill);
                                setPaymentType('WATER');
                                setPaymentAmount(waterPayable);
                              }}
                              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
                            >
                              <Droplets className="w-3.5 h-3.5" /> Pay Water
                            </button>
                          ) : (
                            <span 
                              className="px-2.5 py-1.5 bg-slate-100 text-slate-500 border border-slate-200 rounded-xl text-[10px] font-bold flex items-center gap-1 opacity-80"
                            >
                              <Lock className="w-3 h-3 text-slate-400" /> Carried Over
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {sortedWaterBillings.length === 0 && !loading && (
              <div className="py-12 text-center text-slate-400 text-xs">No Water Charges records found.</div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                  <th className="py-3.5 px-5">SOA Month & ID</th>
                  <th className="py-3.5 px-5">Meter Reading & Usage</th>
                  <th className="py-3.5 px-5">Base Water Charge</th>
                  <th className="py-3.5 px-5">Carried-Over Water Arrears</th>
                  <th className="py-3.5 px-5 text-right">Total Net Water Payable</th>
                  <th className="py-3.5 px-5 text-center">Water Status</th>
                  <th className="py-3.5 px-5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paginatedWaterBillings.map((bill) => {
                  const isPaid = bill.waterStatus === 'PAID';
                  const isPending = bill.waterStatus === 'PENDING_VERIFICATION';
                  const isLatestWaterStatement = latestBill && bill.id === latestBill.id;
                  const waterPayable = bill.totalWaterPayable || bill.waterAmount;

                  return (
                    <tr key={`water-table-${bill.id}`} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-5 whitespace-nowrap">
                        <span className="font-extrabold text-slate-900 block text-sm">{bill.billingMonth}</span>
                        <span className="text-[10px] text-sky-700 font-mono font-bold block mt-0.5">
                          Account: {householdAccountId} • SOA #{bill.id}
                        </span>
                      </td>

                      <td className="py-4 px-5 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <span className="px-2.5 py-0.5 bg-sky-50 text-sky-900 border border-sky-200 text-[11px] font-extrabold rounded-lg font-mono inline-block">
                            {bill.waterUsage || 0} m³ Consumption
                          </span>
                          <p className="text-[10px] text-slate-500 font-mono">
                            Readings: {bill.prevReading || '0.00'} → {bill.currReading || '0.00'}
                          </p>
                        </div>
                      </td>

                      <td className="py-4 px-5 whitespace-nowrap">
                        <span className="font-bold text-slate-800 text-sm">₱{bill.waterAmount}</span>
                        <span className="text-[10px] text-slate-400 block">Current Consumption Charge</span>
                      </td>

                      <td className="py-4 px-5 whitespace-nowrap">
                        <span className={`font-bold block text-sm ${parseFloat(bill.waterArrears || '0') > 0 ? 'text-amber-700' : 'text-slate-500'}`}>
                          ₱{bill.waterArrears || '0.00'}
                        </span>
                        {parseFloat(bill.waterArrears || '0') > 0 && (
                          <span className="text-[10px] text-amber-700 font-bold block">Carried forward into this SOA</span>
                        )}
                      </td>

                      <td className="py-4 px-5 text-right whitespace-nowrap">
                        <span className="text-base font-black text-slate-900 block">₱{waterPayable}</span>
                        <span className="text-[10px] text-slate-400 block">Due: {bill.dueDate ? new Date(bill.dueDate).toLocaleDateString() : '30th'}</span>
                      </td>

                      <td className="py-4 px-5 text-center whitespace-nowrap">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-black rounded-full uppercase">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Settled
                          </span>
                        ) : isPending ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-black rounded-full uppercase">
                            <Clock className="w-3.5 h-3.5 text-amber-600" /> PMO Verifying
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-rose-100 text-rose-800 border border-rose-200 text-[10px] font-black rounded-full uppercase">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-600" /> Unpaid
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setSummaryModalBill(bill)}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1"
                            title="View Water Charges calculation breakdown"
                          >
                            <Eye className="w-3.5 h-3.5 text-sky-600" /> Details
                          </button>

                          {!isPaid && (
                            isLatestWaterStatement ? (
                              <button
                                onClick={() => {
                                  setSelectedBill(bill);
                                  setPaymentType('WATER');
                                  setPaymentAmount(waterPayable);
                                }}
                                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-[11px] rounded-lg shadow-sm transition-all flex items-center gap-1 active:scale-95"
                              >
                                <Droplets className="w-3.5 h-3.5" /> Pay Water Bill
                              </button>
                            ) : (
                              <span 
                                className="px-3 py-1.5 bg-slate-100 text-slate-500 border border-slate-200 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-not-allowed opacity-80"
                                title="Previous bill balance carried forward to latest SOA statement. Please settle via the latest statement."
                              >
                                <Lock className="w-3 h-3 text-slate-400" /> Carried Over (Pay via Latest SOA)
                              </span>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {sortedWaterBillings.length === 0 && !loading && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                      No Water Charges records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Water Table Pagination Controls (Max 10 per page) */}
        {sortedWaterBillings.length > 0 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="text-slate-600 font-medium">
              Showing <strong className="text-slate-900">{(waterPage - 1) * ITEMS_PER_PAGE + 1}</strong> to <strong className="text-slate-900">{Math.min(waterPage * ITEMS_PER_PAGE, sortedWaterBillings.length)}</strong> of <strong className="text-slate-900">{sortedWaterBillings.length}</strong> water statements
            </span>

            <div className="flex items-center gap-1.5">
              <button
                disabled={waterPage === 1}
                onClick={() => setWaterPage(p => Math.max(1, p - 1))}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              
              <span className="px-3 py-1.5 font-extrabold text-slate-800">
                Page {waterPage} of {totalWaterPages}
              </span>

              <button
                disabled={waterPage >= totalWaterPages}
                onClick={() => setWaterPage(p => Math.min(totalWaterPages, p + 1))}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 flex items-center gap-1"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Streamlined Payment Modal */}
      {selectedBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-teal-400 uppercase tracking-widest block mb-0.5">
                  PMO Account Settlement Portal
                </span>
                <h3 className="font-extrabold text-lg">
                  {paymentType === 'HOA' ? 'Pay HOA Monthly Dues' : paymentType === 'WATER' ? 'Pay Water Charges' : 'Pay Combined Full Statement'}
                </h3>
                <p className="text-xs text-teal-300 font-mono mt-0.5">
                  Household Account ID: <strong>{householdAccountId}</strong> • SOA Month: <strong>{selectedBill.billingMonth}</strong>
                </p>
              </div>
              <button
                onClick={() => setSelectedBill(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-full transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePaySubmit} className="p-6 space-y-4">
              {/* PMO QR Code & Account Info */}
              <div className="p-4 bg-teal-50 border border-teal-100 rounded-2xl flex flex-col sm:flex-row items-center gap-4">
                <div className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-200 shrink-0">
                  <QRCodeSVG value={`CasaMiraPMO-${householdAccountId}`} size={110} />
                </div>
                <div className="space-y-1 text-center sm:text-left text-xs">
                  <p className="font-extrabold text-slate-900 text-sm">Official PMO Payment QR</p>
                  <p className="text-slate-600"><span className="font-bold">GCash Account:</span> 0917-123-4567</p>
                  <p className="text-slate-600"><span className="font-bold">Account Name:</span> Casa Mira South HOA</p>
                  <p className="text-slate-600"><span className="font-bold">BDO Account:</span> 0012-3456-7890</p>
                  <div className="p-2 bg-amber-100/80 border border-amber-200 rounded-lg text-[10px] text-amber-900 font-bold mt-1">
                    💡 Please include Account ID <strong className="font-mono">{householdAccountId}</strong> in your transfer reference note.
                  </div>
                </div>
              </div>

              {/* Separated Payment Item Selector Tabs */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  Select Billing Option to Settle:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {/* Option 1: HOA Dues Only */}
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentType('HOA');
                      setPaymentAmount(selectedBill.totalHoaPayable || selectedBill.hoaDues);
                    }}
                    className={`p-3 rounded-2xl text-left border transition-all ${
                      paymentType === 'HOA' 
                        ? 'bg-teal-600 text-white border-teal-700 shadow-md font-extrabold ring-2 ring-teal-300' 
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <p className="text-[10px] uppercase opacity-80 flex items-center gap-1 font-bold">
                      <Receipt className="w-3 h-3" /> HOA Dues
                    </p>
                    <p className="text-xs font-black">₱{selectedBill.totalHoaPayable || selectedBill.hoaDues}</p>
                  </button>

                  {/* Option 2: Water Charges Only */}
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentType('WATER');
                      setPaymentAmount(selectedBill.totalWaterPayable || selectedBill.waterAmount);
                    }}
                    className={`p-3 rounded-2xl text-left border transition-all ${
                      paymentType === 'WATER' 
                        ? 'bg-sky-600 text-white border-sky-700 shadow-md font-extrabold ring-2 ring-sky-300' 
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <p className="text-[10px] uppercase opacity-80 flex items-center gap-1 font-bold">
                      <Droplets className="w-3 h-3" /> Water Charges
                    </p>
                    <p className="text-xs font-black">₱{selectedBill.totalWaterPayable || selectedBill.waterAmount}</p>
                  </button>

                  {/* Option 3: Full Combined Statement */}
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentType('FULL');
                      setPaymentAmount(selectedBill.totalAmount);
                    }}
                    className={`p-3 rounded-2xl text-left border transition-all ${
                      paymentType === 'FULL' 
                        ? 'bg-slate-900 text-white border-slate-950 shadow-md font-extrabold ring-2 ring-teal-400' 
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <p className="text-[10px] uppercase opacity-80 flex items-center gap-1 font-bold">
                      <CreditCard className="w-3 h-3" /> Full SOA
                    </p>
                    <p className="text-xs font-black">₱{selectedBill.totalAmount}</p>
                  </button>
                </div>
              </div>

              {/* Itemized Calculation Summary Box */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                {paymentType === 'HOA' && (
                  <div>
                    <span className="font-bold text-teal-900 block">HOA Dues Settlement Calculation:</span>
                    <p className="text-slate-600">
                      Current HOA Dues: <strong>₱{selectedBill.hoaDues}</strong>
                      {parseFloat(selectedBill.hoaArrears || '0') > 0 && (
                        <span> + Previous Carried Over HOA Arrears: <strong className="text-amber-800">₱{selectedBill.hoaArrears}</strong></span>
                      )}
                    </p>
                    <p className="font-black text-teal-950 pt-0.5">
                      Total HOA Payable: ₱{selectedBill.totalHoaPayable || selectedBill.hoaDues}
                    </p>
                  </div>
                )}

                {paymentType === 'WATER' && (
                  <div>
                    <span className="font-bold text-sky-900 block">Water Charges Settlement Calculation:</span>
                    <p className="text-slate-600">
                      Current Water Charges: <strong>₱{selectedBill.waterAmount}</strong> ({selectedBill.waterUsage}m³)
                      {parseFloat(selectedBill.waterArrears || '0') > 0 && (
                        <span> + Previous Carried Over Water Arrears: <strong className="text-amber-800">₱{selectedBill.waterArrears}</strong></span>
                      )}
                    </p>
                    <p className="font-black text-sky-950 pt-0.5">
                      Total Water Payable: ₱{selectedBill.totalWaterPayable || selectedBill.waterAmount}
                    </p>
                  </div>
                )}

                {paymentType === 'FULL' && (
                  <div>
                    <span className="font-bold text-slate-900 block">Combined Full SOA Settlement Calculation:</span>
                    <p className="text-slate-600">
                      HOA Dues: <strong>₱{selectedBill.hoaDues}</strong> + Water: <strong>₱{selectedBill.waterAmount}</strong>
                      {parseFloat(selectedBill.totalArrearsCarriedOver || selectedBill.arrearsAmount || '0') > 0 && (
                        <span> + Carried-Over Arrears: <strong className="text-amber-800">₱{selectedBill.totalArrearsCarriedOver || selectedBill.arrearsAmount}</strong></span>
                      )}
                    </p>
                    <p className="font-black text-slate-950 pt-0.5">
                      Total Net Payable: ₱{selectedBill.totalAmount}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Payment Amount (₱)
                </label>
                <input
                  required
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs font-black text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none"
                  placeholder="Payment amount"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Upload Payment Receipt Screenshot
                </label>
                <input
                  required
                  type="file"
                  accept="image/*"
                  onChange={handleProofUpload}
                  className="block w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                />
                {paymentProof && (
                  <img src={paymentProof} alt="Proof" className="mt-3 h-32 w-full object-cover rounded-xl border border-slate-200 shadow-sm" />
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  GCash / Bank Reference Number
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. 1002 9384 7561"
                  value={paymentRef}
                  onChange={e => setPaymentRef(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs font-mono font-bold focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedBill(null)}
                  className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl text-xs font-black shadow-md transition-all active:scale-95"
                >
                  {submitting ? 'Submitting...' : 'Submit Receipt for Verification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full Calculation Summary Modal */}
      <CalculationSummaryModal
        isOpen={!!summaryModalBill}
        onClose={() => setSummaryModalBill(null)}
        billing={summaryModalBill}
        userProfile={profile}
      />

      {/* Household Management Modal */}
      <HouseholdManagementModal
        isOpen={isHouseholdModalOpen}
        onClose={() => setIsHouseholdModalOpen(false)}
      />
    </div>
  );
}
