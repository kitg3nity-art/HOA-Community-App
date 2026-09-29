import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { 
  Lock, 
  RefreshCw, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  QrCode, 
  Settings, 
  Phone, 
  Mail, 
  Building, 
  MapPin, 
  User, 
  Sparkles,
  ShieldCheck,
  ChevronRight,
  LogOut,
  ExternalLink,
  Home,
  Send,
  Users
} from 'lucide-react';
import ProfileSettingsModal from './ProfileSettingsModal';
import ResidentPassModal from './ResidentPassModal';
import TermsPrivacyModal from './TermsPrivacyModal';

export default function PendingLockDashboard() {
  const { profile, token, setUserAndToken, logout } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);

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
    if (token) {
      fetch('/api/household/members', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setHouseholdMembers(data);
        })
        .catch(err => console.error("Error fetching household members:", err));
    }
  }, [token, profile?.blockLot]);

  // Address Onboarding State
  const [addressForm, setAddressForm] = useState({
    phase: profile?.phase || 'Phase 1',
    blockNo: '1',
    lotNo: '1',
    houseType: profile?.houseType || 'A',
    phoneNumber: profile?.phoneNumber || ''
  });
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressSuccess, setAddressSuccess] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);

  const handleCheckStatus = async () => {
    if (!token) return;
    setIsRefreshing(true);
    setRefreshMessage(null);
    try {
      const res = await fetch('/api/users/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const updatedUser = await res.json();
        setUserAndToken(updatedUser, token);
        if (updatedUser.approvalStatus === 'APPROVED') {
          setRefreshMessage('🎉 Congratulations! Your account has been approved by PMO. Unlocking full resident dashboard...');
          setTimeout(() => {
            window.location.reload();
          }, 1200);
        } else {
          setRefreshMessage(`Status checked at ${new Date().toLocaleTimeString()}: Account is currently under review by PMO/Admins.`);
        }
      } else {
        setRefreshMessage('Unable to connect to PMO server. Please try again.');
      }
    } catch {
      setRefreshMessage('Network error checking status. Please try again.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setAddressLoading(true);
    setAddressError(null);
    setAddressSuccess(null);

    try {
      const res = await fetch('/api/users/me/address-onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(addressForm)
      });

      const data = await res.json();

      if (res.ok && data.user) {
        setUserAndToken(data.user, token);
        setAddressSuccess('🎉 Property address & Unit-Type submitted successfully! Your registration is now pending PMO Admin approval.');
      } else {
        setAddressError(data.error || 'Failed to submit address details.');
      }
    } catch (err) {
      console.error('Submit address error:', err);
      setAddressError('Error submitting address to server.');
    } finally {
      setAddressLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Modals */}
      <ProfileSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <ResidentPassModal isOpen={isPassModalOpen} onClose={() => setIsPassModalOpen(false)} />
      <TermsPrivacyModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />

      {/* Main Lock Hero Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 text-white rounded-3xl p-6 sm:p-10 shadow-2xl border border-amber-500/30 relative overflow-hidden">
        {/* Glow ambient background elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 text-xs font-bold tracking-wider uppercase backdrop-blur-md">
              <Lock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>Verification Pending</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-serif-luxury font-bold text-white tracking-tight leading-tight">
              Pending Dashboard View
            </h1>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Welcome <strong className="text-amber-300">{profile?.name || 'Homeowner'}</strong>! Complete your resident onboarding step below by selecting your Phase, Block, Lot, and Unit-Type. Once approved by the admins, you will have full access to the resident dashboard.
            </p>
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row md:flex-col gap-3 w-full md:w-auto">
            <button
              onClick={handleCheckStatus}
              disabled={isRefreshing}
              className="px-5 py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Checking PMO System...' : 'Check Approval Status'}</span>
            </button>

            <button
              onClick={() => setIsPassModalOpen(true)}
              className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-teal-300 font-bold rounded-2xl text-xs sm:text-sm border border-teal-500/30 flex items-center justify-center gap-2 transition-all"
            >
              <QrCode className="w-4 h-4 text-teal-400" />
              <span>Temporary Resident QR Pass</span>
            </button>
          </div>
        </div>

        {refreshMessage && (
          <div className="mt-6 p-3 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-amber-300 text-center font-medium animate-fadeIn">
            {refreshMessage}
          </div>
        )}
      </div>

      {/* STEP 2: ADDRESS & UNIT-TYPE ONBOARDING FORM */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-amber-400/80 shadow-md space-y-5 relative overflow-hidden">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center">
              <Home className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Next Step: Select Your Address & Unit-Type</h2>
              <p className="text-xs text-slate-500">Provide your Phase, Block, Lot, and House Unit-Type for PMO verification.</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-black uppercase">
            Action Required
          </span>
        </div>

        {addressSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{addressSuccess}</span>
          </div>
        )}

        {addressError && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl text-xs font-bold flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{addressError}</span>
          </div>
        )}

        <form onSubmit={handleAddressSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Phase */}
            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1.5 uppercase tracking-wider">
                1. Subdivision Phase *
              </label>
              <select
                required
                value={addressForm.phase}
                onChange={(e) => setAddressForm({ ...addressForm, phase: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-extrabold text-slate-900 focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20"
              >
                {Array.from(new Set([...availablePhases, addressForm.phase])).map(ph => (
                  <option key={ph} value={ph}>{ph}</option>
                ))}
              </select>
            </div>

            {/* Block No */}
            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1.5 uppercase tracking-wider">
                2. Block Number *
              </label>
              <input
                type="number"
                min="1"
                required
                value={addressForm.blockNo}
                onChange={(e) => setAddressForm({ ...addressForm, blockNo: e.target.value })}
                placeholder="e.g. 5"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            {/* Lot No */}
            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1.5 uppercase tracking-wider">
                3. Lot Number *
              </label>
              <input
                type="number"
                min="1"
                required
                value={addressForm.lotNo}
                onChange={(e) => setAddressForm({ ...addressForm, lotNo: e.target.value })}
                placeholder="e.g. 12"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Unit-Type */}
            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1.5 uppercase tracking-wider">
                4. Unit-Type (House Type) *
              </label>
              <select
                required
                value={addressForm.houseType}
                onChange={(e) => setAddressForm({ ...addressForm, houseType: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-extrabold text-slate-900 focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20"
              >
                <option value="A">Unit Type A (Townhouse Standard — ₱240.00 Dues)</option>
                <option value="B">Unit Type B (Townhouse Deluxe — ₱320.00 Dues)</option>
                <option value="C">Unit Type C (Single Attached / Corner — ₱480.00 Dues)</option>
                <option value="D">Unit Type D (Duplex / Twinhome — ₱380.00 Dues)</option>
                <option value="LOT_ONLY">Unbuilt Lot Only (— ₱180.00 Dues)</option>
              </select>
            </div>

            {/* Mobile Phone */}
            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1.5 uppercase tracking-wider">
                Mobile Number
              </label>
              <input
                type="tel"
                placeholder="09171234567"
                value={addressForm.phoneNumber}
                onChange={(e) => setAddressForm({ ...addressForm, phoneNumber: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 font-medium flex items-center justify-between">
            <span>Generated Address Preview:</span>
            <span className="font-extrabold text-teal-800">
              {addressForm.phase} • Block {addressForm.blockNo}, Lot {addressForm.lotNo} (Type {addressForm.houseType})
            </span>
          </div>

          <button
            type="submit"
            disabled={addressLoading}
            className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-2xl shadow-md transition-all flex items-center justify-center gap-2"
          >
            {addressLoading ? 'Submitting Address to PMO...' : (
              <>Submit Address Details for PMO Approval <Send className="w-4 h-4 text-amber-400" /></>
            )}
          </button>
        </form>
      </div>

      {/* Account Progress Timeline */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
        <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <Clock className="w-5 h-5 text-amber-500" />
          <span>Verification Process Tracker</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
          {/* Step 1 */}
          <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200 flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-md">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-teal-800 uppercase">Step 1 • Completed</p>
              <h3 className="text-sm font-bold text-slate-900 mt-0.5">Account Registered</h3>
              <p className="text-xs text-slate-600 mt-1">Email confirmed & basic profile created.</p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-400 flex items-start gap-3 shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 px-2 py-0.5 bg-amber-400 text-slate-950 font-black text-[9px] uppercase rounded-bl-lg">
              IN PROGRESS
            </div>
            <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-md animate-pulse">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-800 uppercase">Step 2 • Active</p>
              <h3 className="text-sm font-bold text-slate-900 mt-0.5">Address & Unit-Type Verification</h3>
              <p className="text-xs text-slate-600 mt-1">PMO Admins validating Phase/Block/Lot residency records.</p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3 opacity-60">
            <div className="w-8 h-8 rounded-full bg-slate-300 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">Step 3 • Locked</p>
              <h3 className="text-sm font-bold text-slate-700 mt-0.5">Full Resident Dashboard</h3>
              <p className="text-xs text-slate-500 mt-1">Announcements, Marketplace, Billing & Events unlocked.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Details Summary Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4 text-teal-600" /> Your Submitted Information
            </h3>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1 hover:underline"
            >
              <Settings className="w-3.5 h-3.5" /> Edit Profile
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Resident Name:</span>
              <span className="font-bold text-slate-900">{profile?.name || 'Resident'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Email Address:</span>
              <span className="font-bold text-slate-900">{profile?.email || 'N/A'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Block & Lot:</span>
              <span className="font-bold text-slate-900">{profile?.blockLot || 'Casa Mira South'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Subdivision Phase:</span>
              <span className="font-bold text-slate-900">{profile?.phase || 'Phase 1'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500 font-medium">House Unit-Type:</span>
              <span className="font-extrabold text-teal-700">Type {profile?.houseType || 'A'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Account Username:</span>
              <span className="font-mono font-bold text-amber-700">{profile?.username || 'Dynamic Account'}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500 font-medium">Approval Status:</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold uppercase text-[10px]">
                {profile?.approvalStatus || 'PENDING'}
              </span>
            </div>
          </div>
        </div>

        {/* Household Family Group Summary Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-teal-600" /> Household Family Group
              </h3>
              <span className="px-2.5 py-1 bg-teal-50 text-teal-700 font-extrabold text-[10px] rounded-full uppercase">
                {householdMembers.length} {householdMembers.length === 1 ? 'Member' : 'Members'}
              </span>
            </div>

            <p className="text-xs text-slate-500 my-3">
              Residents registered at <strong>{profile?.blockLot || 'your Phase/Block/Lot'}</strong> are automatically linked into a single Family Household account.
            </p>

            {householdMembers.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {householdMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-teal-700 text-white font-black text-xs flex items-center justify-center overflow-hidden shrink-0">
                        {member.profileImage ? (
                          <img src={member.profileImage} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          member.name?.[0] || 'M'
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 flex items-center gap-1">
                          {member.name}
                          {member.id === profile?.id && <span className="text-[9px] font-bold text-teal-700">(You)</span>}
                        </p>
                        <p className="text-[10px] text-slate-500">{member.email || member.username || 'Resident'}</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold px-2 py-0.5 bg-white border border-slate-200 text-slate-600 rounded-lg uppercase">
                      {member.role || 'Resident'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-500 text-center">
                Submit address details above to view and connect with other residents registered under your unit.
              </div>
            )}
          </div>

          <p className="text-[10px] text-slate-400 text-center pt-2 border-t border-slate-100">
            Household units are automatically synced with PMO billing & gate access records.
          </p>
        </div>

        {/* PMO Office Contact & Helpdesk Box */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-slate-100">
              <Building className="w-4 h-4 text-amber-600" /> PMO Verification Desk
            </h3>

            <p className="text-xs text-slate-600 leading-relaxed">
              If you require immediate access or wish to verify your homeowner account directly with property administration, contact the office below:
            </p>

            <div className="space-y-2 text-xs pt-1">
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <Phone className="w-4 h-4 text-teal-600 shrink-0" />
                <div>
                  <p className="font-bold text-slate-900">PMO Admin Office</p>
                  <p className="text-slate-500 font-mono">+63 917 888 9900 / +63 32 411 9000</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <Mail className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <p className="font-bold text-slate-900">Helpdesk Email</p>
                  <p className="text-slate-500 font-mono">pmo@casamirasouth.com</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <MapPin className="w-4 h-4 text-sky-600 shrink-0" />
                <div>
                  <p className="font-bold text-slate-900">PMO Clubhouse Office Hours</p>
                  <p className="text-slate-500">Mon–Sat • 8:00 AM – 5:00 PM</p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={() => setIsTermsOpen(true)}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-slate-500" /> Terms & Privacy
            </button>

            <button
              onClick={logout}
              className="text-xs font-bold text-red-600 hover:text-red-800 flex items-center gap-1 hover:underline"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out Account
            </button>
          </div>
        </div>
      </div>

      {/* Admin Demo Sandbox Note */}
      <div className="p-4 rounded-2xl bg-slate-900 text-slate-200 border border-slate-800 text-xs flex items-start gap-3 shadow-lg">
        <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="flex-1 space-y-1">
          <p className="font-bold text-white">Testing as PMO Administrator or Board Member?</p>
          <p className="text-slate-400 leading-normal">
            To approve pending resident registrations, log in with the PMO Superadmin account using Username <code className="bg-slate-800 px-1.5 py-0.5 rounded text-amber-300 font-mono">P1B1L01</code> (Access PIN: <code className="bg-slate-800 px-1.5 py-0.5 rounded text-amber-300 font-mono">CM9900</code>) and navigate to the PMO Admin Portal.
          </p>
        </div>
      </div>

      {/* Footer Attribution */}
      <footer className="pt-6 pb-2 text-center">
        <p className="text-[11px] text-slate-400 font-medium">
          © 2026 Kieth Ryan Gonzales - AI Systems Design & Automated Web Development.
        </p>
      </footer>
    </div>
  );
}
