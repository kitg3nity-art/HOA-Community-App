import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { Users, Star, UserX, ShieldAlert, CheckCircle2, AlertCircle, X, Shield, Lock, RefreshCw, Phone, Mail } from 'lucide-react';

interface HouseholdManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HouseholdManagementModal({ isOpen, onClose }: HouseholdManagementModalProps) {
  const { token, profile } = useAuth();
  const [householdData, setHouseholdData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen && token) {
      fetchMembers();
    }
  }, [isOpen, token]);

  const fetchMembers = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/household/members', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHouseholdData(data);
      } else {
        setErrorMsg('Failed to load household members');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Network error fetching household details');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (targetUser: any) => {
    if (!confirm(`Are you sure you want to remove "${targetUser.name}" from your household (${householdData?.householdAddress})? They will no longer share your household SOA or access household records.`)) {
      return;
    }
    setActionMsg('');
    setErrorMsg('');
    try {
      const res = await fetch('/api/household/remove-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ targetUserId: targetUser.id })
      });
      const data = await res.json();
      if (res.ok) {
        setActionMsg(data.message || `Removed ${targetUser.name} from household.`);
        fetchMembers();
      } else {
        setErrorMsg(data.error || 'Failed to remove household member');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to complete member removal');
    }
  };

  const handleFreezeMember = async (targetUser: any) => {
    const actionText = targetUser.isFrozen ? 'Re-enable' : 'Temporarily disable';
    if (!confirm(`${actionText} the account for "${targetUser.name}"? ${targetUser.isFrozen ? '' : 'This will temporarily block unauthorized account claims.'}`)) {
      return;
    }
    setActionMsg('');
    setErrorMsg('');
    try {
      const res = await fetch('/api/household/freeze-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ targetUserId: targetUser.id })
      });
      const data = await res.json();
      if (res.ok) {
        setActionMsg(data.message || `Updated account state for ${targetUser.name}.`);
        fetchMembers();
      } else {
        setErrorMsg(data.error || 'Failed to update member status');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to update member account status');
    }
  };

  if (!isOpen) return null;

  const isCallerLeader = householdData?.isCallerLeader || profile?.role === 'ADMIN' || profile?.role === 'SUPERADMIN';
  const members = householdData?.members || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-2xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white">Household Registry & Members</h3>
                <span className="px-2.5 py-0.5 bg-teal-500/20 text-teal-300 font-bold text-[11px] rounded-full border border-teal-500/30">
                  {householdData?.householdAddress || 'Household Address'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage accounts claiming occupancy for this Casa Mira South property address.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action / Error Banners */}
        {actionMsg && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold rounded-2xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-900 text-xs font-bold rounded-2xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Main Account Holder Indicator Banner */}
          <div className="p-4 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-black text-lg shrink-0 border border-amber-300">
                ⭐
              </div>
              <div>
                <span className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider block">
                  Designated Main Account Holder
                </span>
                <p className="font-extrabold text-slate-900 text-sm">
                  {householdData?.leader ? householdData.leader.name : 'No Household Leader Declared (PMO Managed)'}
                </p>
              </div>
            </div>
            {isCallerLeader && (
              <span className="px-3 py-1 bg-amber-500/20 text-amber-900 border border-amber-400/40 text-xs font-black rounded-full">
                You are Leader ⭐
              </span>
            )}
          </div>

          {/* Leader Permissions Notice */}
          {isCallerLeader && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600 flex items-start gap-2">
              <Shield className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              <span>
                As the <strong>Household Leader ⭐</strong>, you can remove former or pretend occupants from your address and temporarily disable unauthorized account claims.
              </span>
            </div>
          )}

          {/* Members List */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
              <span>Registered Accounts ({members.length})</span>
              <button
                onClick={fetchMembers}
                className="text-teal-700 hover:underline flex items-center gap-1 font-bold"
              >
                <RefreshCw className="w-3 h-3" /> Refresh List
              </button>
            </div>

            {loading ? (
              <div className="p-8 text-center text-slate-400 text-xs font-bold flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-teal-600" /> Loading household members...
              </div>
            ) : members.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No accounts registered for this household address.
              </div>
            ) : (
              members.map((m: any) => {
                const isLeader = m.isHouseholdLeader;
                const isSelf = m.id === profile?.id;

                return (
                  <div
                    key={`hh-member-${m.id}`}
                    className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      isLeader ? 'bg-amber-50/60 border-amber-200' : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/80'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-800 font-bold flex items-center justify-center overflow-hidden shrink-0 text-base">
                        {m.profileImage ? <img src={m.profileImage} alt="" className="w-full h-full object-cover" /> : m.name?.[0]}
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-slate-900 text-sm">{m.name}</span>
                          {isSelf && (
                            <span className="px-2 py-0.5 bg-teal-100 text-teal-800 text-[10px] font-bold rounded-md">
                              You
                            </span>
                          )}
                          {isLeader && (
                            <span className="px-2 py-0.5 bg-amber-200 text-amber-950 font-black text-[10px] rounded-md flex items-center gap-0.5 shadow-sm">
                              ⭐ Main Account Holder
                            </span>
                          )}
                          {m.isFrozen && (
                            <span className="px-2 py-0.5 bg-rose-100 text-rose-800 font-black text-[10px] rounded-md flex items-center gap-0.5">
                              ❄️ Temporarily Disabled
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium">
                          {m.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-slate-400" /> {m.email}</span>}
                          {m.phoneNumber && <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" /> {m.phoneNumber}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Actions for Household Leader */}
                    {isCallerLeader && !isSelf && (
                      <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                        <button
                          onClick={() => handleFreezeMember(m)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                            m.isFrozen
                              ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300'
                              : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                          }`}
                          title={m.isFrozen ? 'Re-enable account' : 'Temporarily disable pretended account claim'}
                        >
                          <Lock className="w-3.5 h-3.5" />
                          {m.isFrozen ? 'Re-enable' : 'Disable Account'}
                        </button>

                        <button
                          onClick={() => handleRemoveMember(m)}
                          className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-900 border border-rose-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                          title="Remove from household address"
                        >
                          <UserX className="w-3.5 h-3.5 text-rose-700" />
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Household Unit Type Dues synchronized automatically per address.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
