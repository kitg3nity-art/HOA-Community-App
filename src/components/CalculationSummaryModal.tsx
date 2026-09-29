import React from 'react';
import { X, Receipt, Droplets, Clock, AlertCircle, CheckCircle2, ShieldCheck, FileText, User, MapPin } from 'lucide-react';

interface CalculationSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  billing: any;
  userProfile?: any;
  titlePrefix?: string;
}

export default function CalculationSummaryModal({
  isOpen,
  onClose,
  billing,
  userProfile,
  titlePrefix = 'Statement'
}: CalculationSummaryModalProps) {
  if (!isOpen || !billing) return null;

  const residentName = billing.residentName || userProfile?.name || 'Homeowner';
  const blockLot = billing.residentBlockLot || userProfile?.blockLot || 'Casa Mira South';
  const houseType = billing.residentHouseType || userProfile?.houseType || 'A';

  const hoaDuesNum = parseFloat(billing.hoaDues || '0');
  const waterAmountNum = parseFloat(billing.waterAmount || '0');
  const arrearsNum = parseFloat(billing.arrearsAmount || '0');
  const penaltyNum = parseFloat(billing.penaltyAmount || '0');
  const advanceCreditNum = parseFloat(billing.advanceCreditApplied || '0');
  const totalAmountNum = parseFloat(billing.totalAmount || '0');

  const prevReading = billing.prevReading || '0.00';
  const currReading = billing.currReading || '0.00';
  const waterUsage = billing.waterUsage || '0.00';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-500/20 text-teal-400 rounded-2xl border border-teal-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider block">
                Official PMO Calculation Summary
              </span>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-white leading-tight">
                  {titlePrefix}: {billing.billingMonth}
                </h3>
                <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-md ${
                  hoaDuesNum > 0 && waterAmountNum === 0 ? 'bg-teal-500 text-slate-950' :
                  waterAmountNum > 0 && hoaDuesNum === 0 ? 'bg-sky-400 text-slate-950' :
                  'bg-indigo-400 text-slate-950'
                }`}>
                  {hoaDuesNum > 0 && waterAmountNum === 0 ? 'HOA Statement' :
                   waterAmountNum > 0 && hoaDuesNum === 0 ? 'Water Statement' :
                   'Combined SOA'}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Account Overview */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Homeowner Account</span>
              <p className="font-extrabold text-slate-900 text-sm">{residentName}</p>
              <p className="text-slate-500 flex items-center gap-1 font-medium">
                <MapPin className="w-3.5 h-3.5 text-teal-600" /> {blockLot}
              </p>
            </div>
            <div className="text-right">
              <span className="px-2.5 py-1 bg-teal-100 text-teal-900 font-extrabold text-[10px] rounded-lg border border-teal-200 inline-block">
                Unit Type {houseType}
              </span>
              <p className="text-[10px] text-slate-400 mt-1 font-mono">
                SOA ID: #{billing.id}
              </p>
            </div>
          </div>

          {/* Breakdown Items */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase text-slate-600 tracking-wider flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-teal-600" /> Calculation Line Items
            </h4>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white text-xs">
              {/* 1. HOA Monthly Dues */}
              <div className="p-3.5 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 block">HOA Monthly Dues</span>
                  <span className="text-[10px] text-slate-500">
                    Standard fixed dues for Unit-Type {houseType} ({houseType === 'C' ? '₱480.00' : houseType === 'B' ? '₱320.00' : '₱240.00'})
                  </span>
                </div>
                <span className="font-extrabold text-slate-900">₱{hoaDuesNum.toFixed(2)}</span>
              </div>

              {/* 2. Water Meter Consumption */}
              <div className="p-3.5 space-y-1 bg-sky-50/30">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sky-950 flex items-center gap-1">
                    <Droplets className="w-3.5 h-3.5 text-sky-600" /> Water Meter Reading Charge
                  </span>
                  <span className="font-extrabold text-sky-950">₱{waterAmountNum.toFixed(2)}</span>
                </div>
                <div className="text-[10px] text-slate-600 grid grid-cols-3 gap-2 pt-1 font-mono bg-white p-2 rounded-xl border border-sky-100">
                  <div>Previous: <span className="font-bold text-slate-900">{prevReading} m³</span></div>
                  <div>Current: <span className="font-bold text-slate-900">{currReading} m³</span></div>
                  <div>Net Usage: <span className="font-bold text-sky-700">{waterUsage} m³</span></div>
                </div>
              </div>

              {/* 3. Arrears */}
              {arrearsNum > 0 && (
                <div className="p-3.5 flex items-center justify-between bg-amber-50/50">
                  <div>
                    <span className="font-bold text-amber-950 block">Past Unpaid Arrears</span>
                    <span className="text-[10px] text-amber-800">Balance brought forward from previous billing cycles</span>
                  </div>
                  <span className="font-extrabold text-amber-900">+₱{arrearsNum.toFixed(2)}</span>
                </div>
              )}

              {/* 4. Penalties */}
              {penaltyNum > 0 && (
                <div className="p-3.5 flex items-center justify-between bg-rose-50/50">
                  <div>
                    <span className="font-bold text-rose-950 block">Late Payment Penalty</span>
                    <span className="text-[10px] text-rose-800">5% monthly penalty (&gt;3 months overdue)</span>
                  </div>
                  <span className="font-extrabold text-rose-900">+₱{penaltyNum.toFixed(2)}</span>
                </div>
              )}

              {/* 5. Advance Credit */}
              {advanceCreditNum > 0 && (
                <div className="p-3.5 flex items-center justify-between bg-emerald-50/50">
                  <div>
                    <span className="font-bold text-emerald-950 block">Advance Credit Deduction</span>
                    <span className="text-[10px] text-emerald-800">Applied credit from previous overpayments</span>
                  </div>
                  <span className="font-extrabold text-emerald-700">-₱{advanceCreditNum.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Grand Net Total */}
          <div className="p-4 bg-teal-900 text-white rounded-2xl flex items-center justify-between shadow-md">
            <div>
              <span className="text-[10px] font-bold text-teal-300 uppercase tracking-wider block">Net Payable Amount</span>
              <span className="text-xs text-teal-100">Official Total Statement Balance</span>
            </div>
            <span className="text-2xl font-black text-teal-300">₱{totalAmountNum.toFixed(2)}</span>
          </div>

          {/* Payment & Status Info */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Due Date:</span>
              <span className="font-bold text-slate-900">{billing.dueDate ? new Date(billing.dueDate).toLocaleDateString() : '30th of the month'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Statement Status:</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                billing.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' :
                billing.status === 'PENDING_VERIFICATION' ? 'bg-amber-100 text-amber-800' :
                'bg-rose-100 text-rose-800'
              }`}>
                {billing.status.replace('_', ' ')}
              </span>
            </div>
            {billing.paymentRef && (
              <div className="flex items-center justify-between border-t border-slate-200 pt-2">
                <span className="text-slate-500 font-medium">Payment Reference:</span>
                <span className="font-mono font-bold text-teal-700">{billing.paymentRef}</span>
              </div>
            )}
            {billing.paidAt && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Payment Date:</span>
                <span className="font-bold text-slate-900">{new Date(billing.paidAt).toLocaleDateString()}</span>
              </div>
            )}
            {billing.paymentProof && (
              <div className="pt-2 border-t border-slate-200">
                <span className="text-slate-500 font-medium block mb-1">Attached Receipt Proof:</span>
                <a href={billing.paymentProof} target="_blank" rel="noopener noreferrer">
                  <img src={billing.paymentProof} alt="Proof" className="h-28 w-full object-cover rounded-xl border border-slate-200 hover:opacity-90 transition-all" />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all"
          >
            Close Summary
          </button>
        </div>
      </div>
    </div>
  );
}
