import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { auth } from '../lib/firebase';
import { Home, Megaphone, Users, Store, Calendar, AlertTriangle, Archive, Bot, LogOut, Menu, X, Shield, MapPin, Bell, MessageSquare, Settings, CheckCircle2, Receipt, QrCode, ShieldCheck, Heart, Lock, LayoutGrid, Phone, ChevronRight, Sparkles } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import ProfileSettingsModal from './ProfileSettingsModal';
import ResidentPassModal from './ResidentPassModal';
import TermsPrivacyModal from './TermsPrivacyModal';
import PendingLockDashboard from './PendingLockDashboard';
import CasaMiraLogo from './CasaMiraLogo';
import MemberMobileApp from './MemberMobileApp';

interface NotificationItem {
  id: number;
  userId: number | null;
  type: string;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

export default function Layout() {
  const { user, profile, token, isSuperadminTester, switchDemoRole, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isServicesHubOpen, setIsServicesHubOpen] = useState(false);
  const [isMobileFrameView, setIsMobileFrameView] = useState(false);

  // Staff or Admin Role Flag
  const isStaffOrAdmin = profile?.role === 'ADMIN' || profile?.role === 'SUPERADMIN' || profile?.role === 'PMO' || profile?.role === 'HOA-BOD';
  const [adminWantsMemberView, setAdminWantsMemberView] = useState(false);

  // Real-time Notifications state
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotificationsPopover, setShowNotificationsPopover] = useState(false);
  const [toastNotification, setToastNotification] = useState<NotificationItem | null>(null);
  const lastNotifIdRef = useRef<number>(0);

  const fetchNotifications = async () => {
    try {
      const currentToken = token;
      if (!currentToken) {
        setNotifications([]);
        return;
      }
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      
      const isJson = res.headers.get('content-type')?.includes('application/json');

      if (res.ok && isJson) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setNotifications(data);

          // Check for new incoming notification to display toast
          if (data.length > 0) {
            const newest = data[0];
            if (lastNotifIdRef.current > 0 && newest.id > lastNotifIdRef.current) {
              setToastNotification(newest);
              setTimeout(() => setToastNotification(null), 5000);
            }
            lastNotifIdRef.current = newest.id;
          }
        } else {
          setNotifications([]);
        }
      } else if (res.status === 401 && auth.currentUser) {
        const newToken = await auth.currentUser.getIdToken(true);
        const retryRes = await fetch('/api/notifications', { headers: { Authorization: `Bearer ${newToken}` } });
        if (retryRes.ok && retryRes.headers.get('content-type')?.includes('application/json')) {
          const data = await retryRes.json();
          if (Array.isArray(data)) setNotifications(data);
        }
      }
    } catch {
      // Ignore transient fetch errors
    }
  };

  useEffect(() => {
    if (!token && !auth.currentUser) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 4000);
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    if (profile?.role === 'ADMIN' || profile?.role === 'SUPERADMIN') {
      const fetchPendingContent = async () => {
        try {
          const currentToken = token;
          if (!currentToken) return;
          const res = await fetch('/api/admin/content', {
            headers: { Authorization: `Bearer ${currentToken}` }
          });
          if (res.ok) {
            const data = await res.json();
            if (data && typeof data === 'object') {
              const count = Object.values(data).reduce((acc: number, curr: any) => acc + (Array.isArray(curr) ? curr.length : 0), 0);
              setPendingCount(count);
            }
          }
        } catch {
          // Ignore transient fetch errors
        }
      };
      fetchPendingContent();
      const interval = setInterval(fetchPendingContent, 30000);
      return () => clearInterval(interval);
    }
  }, [profile?.role, token]);

  const handleSignOut = async () => {
    await logout();
    navigate('/login');
  };

  const markAllAsRead = async () => {
    try {
      let currentToken = token;
      const unreadList = (Array.isArray(notifications) ? notifications : []).filter(n => !n.read);
      await Promise.all(unreadList.map(n => 
        fetch(`/api/notifications/${n.id}/read`, {
          method: 'PATCH',
          headers: currentToken ? { Authorization: `Bearer ${currentToken}` } : {}
        })
      ));
      setNotifications(prev => (Array.isArray(prev) ? prev : []).map(n => ({ ...n, read: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const handleNotificationClick = async (n: NotificationItem) => {
    try {
      if (!n.read) {
        await fetch(`/api/notifications/${n.id}/read`, {
          method: 'PATCH',
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, read: true } : item));
      }
    } catch (e) {
      console.error(e);
    }

    let targetLink = n.link;
    if (!targetLink) {
      const lowerTitle = (n.title || '').toLowerCase();
      if (n.type === 'REPORT' || lowerTitle.includes('report') || lowerTitle.includes('incident') || lowerTitle.includes('hazard')) {
        targetLink = '/admin?tab=reports';
      } else if (n.type === 'REGISTRATION' || lowerTitle.includes('registration') || lowerTitle.includes('pending resident') || lowerTitle.includes('address')) {
        targetLink = '/admin?tab=residents';
      } else if (n.type === 'BILLING' || lowerTitle.includes('billing') || lowerTitle.includes('payment') || lowerTitle.includes('soa')) {
        targetLink = '/admin?tab=billings';
      } else if (n.type === 'MARKETPLACE' || lowerTitle.includes('listing') || lowerTitle.includes('item')) {
        targetLink = '/admin?tab=content';
      } else if (n.type === 'PET' || lowerTitle.includes('pet')) {
        targetLink = '/admin?tab=pets';
      } else {
        targetLink = '/announcements';
      }
    }

    setShowNotificationsPopover(false);
    if (targetLink) {
      navigate(targetLink);
    }
  };

  const unreadNotifCount = notifications.filter(n => !n.read).length;

  const navItems = [
    { name: 'Dashboard', path: '/', icon: Home },
    { name: 'Announcements', path: '/announcements', icon: Megaphone },
    { name: 'Water & HOA Dues', path: '/billings', icon: Receipt },
    { name: 'Directory', path: '/directory', icon: Users },
    { name: 'Marketplace', path: '/marketplace', icon: Store },
    { name: 'Events', path: '/events', icon: Calendar },
    { name: 'Map & Contacts', path: '/map', icon: MapPin },
    { name: 'Reports', path: '/reports', icon: AlertTriangle },
    { name: 'Pet Registry', path: '/pets', icon: Heart },
    { name: 'Memory Vault', path: '/memory-vault', icon: Archive },
    { name: 'Ask Mirai', path: '/assistant', icon: Bot },
  ];

  if (profile?.role === 'ADMIN' || profile?.role === 'SUPERADMIN' || profile?.role === 'PMO' || profile?.role === 'HOA-BOD') {
    navItems.push({ name: 'Admin', path: '/admin', icon: Shield });
  }

  // 1. Pending Approval Gate for unapproved residents
  if (profile?.approvalStatus === 'PENDING' || profile?.approvalStatus === 'REJECTED') {
    return <PendingLockDashboard />;
  }

  // 2. Regular HOA Member View (Separated Native Mobile App View matching reference mockup)
  // Regular members (RESIDENT, HOMEOWNER, etc.) always receive the dedicated mobile app view.
  // Admins & PMO staff can also preview it when adminWantsMemberView is active.
  if (!isStaffOrAdmin || (adminWantsMemberView && location.pathname !== '/admin')) {
    return <MemberMobileApp />;
  }

  return (
    <div className="h-screen w-full bg-slate-50 font-sans flex overflow-hidden relative">
      {/* Real-time Toast Floating Banner */}
      {toastNotification && (
        <div className="fixed top-4 right-4 z-50 max-w-sm bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-teal-500/30 flex items-start gap-3 animate-bounce">
          <div className="p-2 bg-teal-600 rounded-xl text-white">
            <Bell className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-teal-400 uppercase tracking-wider">{toastNotification.type}</p>
            <p className="font-bold text-sm text-white mb-1">{toastNotification.title}</p>
            <p className="text-xs text-slate-300">{toastNotification.message}</p>
          </div>
          <button onClick={() => setToastNotification(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Profile & Settings Modal */}
      <ProfileSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <ResidentPassModal isOpen={isPassModalOpen} onClose={() => setIsPassModalOpen(false)} />
      <TermsPrivacyModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:block ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6">
          <div className="flex flex-col mb-8 mt-2">
            <div className="flex items-center justify-between">
              <Link to="/" className="flex items-center gap-3 group">
                <CasaMiraLogo className="w-10 h-10" variant="badge" animate={true} />
                <div className="flex flex-col">
                  <h1 className="font-black text-slate-900 text-[15px] leading-tight tracking-tight uppercase group-hover:text-amber-600 transition-colors">
                    Casa Mira
                  </h1>
                  <span className="text-[10px] uppercase font-extrabold text-teal-700 tracking-wider">
                    South HOA All-in-App
                  </span>
                </div>
              </Link>
              <button className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100" onClick={() => setMobileMenuOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              const isLocked = (profile?.approvalStatus === 'PENDING' || profile?.approvalStatus === 'REJECTED') && item.path !== '/';
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md font-medium text-sm ${
                    isActive
                      ? 'bg-teal-50 text-teal-700'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? 'text-teal-700' : 'text-slate-500'}`} />
                  <span className="flex-1">{item.name}</span>
                  {isLocked && <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto p-4 border-t border-slate-100 space-y-2">
          {/* Quick link to Guard / Non-resident QR Scanner App */}
          <Link
            to="/verify-pass"
            target="_blank"
            className="flex items-center gap-2 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-teal-300 rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <QrCode className="w-4 h-4 text-teal-400 shrink-0" />
            <span className="truncate">Gate QR Scanner App</span>
          </Link>

          {/* Terms, Safety & Privacy Trigger */}
          <button
            onClick={() => setIsTermsOpen(true)}
            className="w-full text-left flex items-center gap-2 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold transition-all"
          >
            <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
            <span className="truncate">Terms & Privacy Policy</span>
          </button>

          <div className="bg-slate-900 rounded-xl p-3 text-xs">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1">Emergency Hotline</p>
            <p className="text-white font-bold">Gate Guardhouse</p>
            <p className="text-teal-400 font-mono text-xs">+63 912 345 6789</p>
          </div>

          <div className="pt-2 text-center">
            <p className="text-[9.5px] text-slate-400 font-medium leading-tight">
              © 2026 Kieth Ryan Gonzales
            </p>
            <p className="text-[8.5px] text-slate-400/80 leading-tight">
              AI Systems Design & Automated Web Development.
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Navigation Bar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-3 sm:px-8 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl focus:outline-none lg:hidden"
              title="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <Link to="/" className="flex items-center gap-2 lg:hidden">
              <CasaMiraLogo className="w-8 h-8" variant="badge" />
              <div className="leading-tight">
                <span className="font-black text-xs text-slate-900 uppercase block tracking-tight">Casa Mira South</span>
                <span className="text-[9.5px] font-bold text-teal-700 block truncate max-w-[130px]">
                  {profile?.blockLot || 'Resident Member'}
                </span>
              </div>
            </Link>

            <div className="hidden sm:flex items-center bg-slate-100 px-4 py-2 rounded-full w-80 lg:w-96">
              <svg className="w-4 h-4 text-slate-400 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              <input type="text" placeholder="Ask Mirai: 'Who can repair my AC?'" className="bg-transparent border-none text-xs sm:text-sm w-full focus:ring-0 outline-none" />
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Resident Digital QR Pass Quick Button */}
            <button
              onClick={() => setIsPassModalOpen(true)}
              className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
              title="Show Scannable Digital Resident ID Pass"
            >
              <QrCode className="w-4 h-4 text-teal-700" />
              <span className="hidden md:inline">Resident ID Pass</span>
            </button>

            {/* Realtime Notification Bell Menu */}
            <div className="relative">
              <button 
                onClick={() => setShowNotificationsPopover(!showNotificationsPopover)}
                className="relative p-2 text-slate-500 hover:text-slate-700 transition-colors focus:outline-none"
                title="Community Notifications"
              >
                <Bell className="w-6 h-6" />
                {unreadNotifCount > 0 && (
                  <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 bg-teal-600 text-white text-[10px] font-bold rounded-full border border-white animate-pulse">
                    {unreadNotifCount}
                  </span>
                )}
              </button>

              {showNotificationsPopover && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
                  <div className="p-3 bg-slate-900 text-white flex items-center justify-between">
                    <span className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-teal-400" /> Notifications
                    </span>
                    {unreadNotifCount > 0 && (
                      <button onClick={markAllAsRead} className="text-[11px] text-teal-400 font-bold hover:underline">
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400">No notifications yet</div>
                    ) : (
                      notifications.slice(0, 10).map(n => {
                        const isActionable = !n.read || n.type === 'REPORT' || n.type === 'REGISTRATION' || n.type === 'BILLING' || n.type === 'MARKETPLACE';
                        return (
                          <button
                            key={n.id}
                            onClick={() => handleNotificationClick(n)}
                            className={`w-full text-left p-3 text-xs transition-all hover:bg-slate-100 flex flex-col gap-1 ${
                              n.read ? 'bg-white' : 'bg-teal-50/70 border-l-4 border-teal-500'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 w-full">
                              <span className="font-bold text-slate-900 line-clamp-1">{n.title}</span>
                              <span className="text-[10px] text-slate-400 shrink-0">
                                {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-slate-600 text-[11px] leading-normal line-clamp-2">{n.message}</p>
                            {isActionable && (
                              <div className="mt-1 flex items-center justify-between text-[10px] font-bold">
                                <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white flex items-center gap-1 shadow-sm">
                                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                  Action Needed
                                </span>
                                <span className="text-teal-700 hover:underline flex items-center gap-0.5 font-bold">
                                  Open Module →
                                </span>
                              </div>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {(profile?.role === 'ADMIN' || profile?.role === 'SUPERADMIN' || profile?.role === 'PMO' || profile?.role === 'HOA-BOD') && (
              <Link to="/admin" className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none" title="Admin Control Center">
                <Shield className="w-6 h-6 text-teal-700" />
                {pendingCount > 0 && (
                  <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 bg-amber-500 text-white text-[10px] font-bold rounded-full border border-white">
                    {pendingCount}
                  </span>
                )}
              </Link>
            )}

            {isSuperadminTester && profile?.role !== 'SUPERADMIN' && (
              <div className="hidden lg:flex items-center gap-1.5 bg-amber-100 border border-amber-300 text-amber-900 px-2.5 py-1 rounded-full text-xs font-bold shadow-sm">
                <span>🧪 Demo View: <strong className="uppercase">{profile?.role}</strong></span>
                <button
                  onClick={async () => {
                    const success = await switchDemoRole('SUPERADMIN');
                    if (success) navigate('/admin');
                  }}
                  className="ml-1 px-2 py-0.5 bg-amber-900 text-amber-100 hover:bg-amber-800 text-[10px] font-extrabold rounded-md transition-all"
                  title="Return to SuperAdmin account"
                >
                  Reset
                </button>
              </div>
            )}

            {/* Direct Switch to Dedicated HOA Member Mobile View */}
            {isStaffOrAdmin && (
              <button
                onClick={() => {
                  setAdminWantsMemberView(true);
                  navigate('/');
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 shadow-2xs cursor-pointer"
                title="Switch to Dedicated HOA Regular Member Mobile App View"
              >
                <span>📱 HOA Member Mobile App</span>
              </button>
            )}

            {/* Mobile View Toggle for Desktop Testers */}
            <button
              onClick={() => setIsMobileFrameView(!isMobileFrameView)}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 shadow-2xs cursor-pointer"
              title="Toggle mobile device frame"
            >
              <span>{isMobileFrameView ? '🖥️ Desktop Grid' : '📱 Mobile App View'}</span>
            </button>

            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-slate-900">{profile?.name || 'Resident'}</p>
              <p className="text-xs text-slate-500 capitalize">{profile?.role?.toLowerCase() || 'Resident'} • {profile?.blockLot || 'Casa Mira South'}</p>
            </div>
            
            <div className="relative group">
              <button className="w-10 h-10 rounded-full bg-slate-200 border-2 border-teal-600/20 shadow-sm overflow-hidden flex items-center justify-center focus:outline-none">
                {profile?.profileImage ? (
                  <img src={profile.profileImage} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold">
                    {profile?.name?.[0] || 'U'}
                  </div>
                )}
              </button>
              
              <div className={`absolute right-0 mt-2 ${isSuperadminTester || profile?.role === 'SUPERADMIN' ? 'w-72 sm:w-80' : 'w-56'} bg-white rounded-2xl shadow-xl border border-slate-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 overflow-hidden`}>
                <div className="p-2 space-y-1 max-h-[85vh] overflow-y-auto">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-sm font-bold text-slate-900">{profile?.name}</p>
                    <p className="text-xs text-slate-500 capitalize">{profile?.role?.toLowerCase()}</p>
                  </div>

                  {/* SuperAdmin Demo Accounts / Role Switcher Panel */}
                  {(profile?.role === 'SUPERADMIN' || isSuperadminTester) && (
                    <div className="p-2.5 my-1.5 bg-slate-900 text-white rounded-xl space-y-2 border border-slate-700 shadow-inner">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-extrabold uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5 text-amber-400" /> SuperAdmin Demo Roles
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 bg-amber-500/20 text-amber-300 font-bold rounded border border-amber-400/30">
                          TEST VIEWS
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-300 leading-tight">
                        Switch accounts instantly to test restricted views and role-based permissions:
                      </p>

                      <div className="space-y-1 pt-1">
                        {[
                          { role: 'SUPERADMIN', label: '👑 SuperAdmin (Carlos Mendoza)', desc: 'Full Unrestricted Control' },
                          { role: 'ADMIN', label: '🛡️ Subdivision Admin (Ana Roxas)', desc: 'General HOA Control Center' },
                          { role: 'PMO', label: '🏢 PMO Staff (Officer Miguel Tan)', desc: 'Restricted PMO Admin View' },
                          { role: 'HOA-BOD', label: '📋 HOA Board (Dir. Ramon Villamor)', desc: 'Restricted Board Admin View' },
                          { role: 'EVENT_ORGANIZER', label: '🎪 Event Organizer (Capt. Dalisay)', desc: 'Events & Community Lead' },
                          { role: 'RESIDENT', label: '🏠 Homeowner Resident (Maria Santos)', desc: 'Standard Resident View' },
                          { role: 'SERVICE_PROVIDER', label: '🛠️ Service Provider (Arch. Marco)', desc: 'Marketplace Vendor View' },
                        ].map(r => {
                          const isCurrent = profile?.role === r.role;
                          return (
                            <button
                              key={r.role}
                              onClick={async () => {
                                const success = await switchDemoRole(r.role);
                                if (success) {
                                  if (r.role === 'SUPERADMIN' || r.role === 'ADMIN' || r.role === 'PMO' || r.role === 'HOA-BOD') {
                                    navigate('/admin');
                                  } else {
                                    navigate('/');
                                  }
                                }
                              }}
                              className={`w-full text-left p-2 rounded-lg text-xs font-bold flex items-center justify-between transition-all ${
                                isCurrent 
                                  ? 'bg-amber-500 text-slate-950 shadow-sm' 
                                  : 'bg-slate-800/90 hover:bg-slate-800 text-slate-200'
                              }`}
                            >
                              <div className="truncate pr-2">
                                <p className="leading-tight truncate">{r.label}</p>
                                <p className={`text-[9.5px] truncate font-normal ${isCurrent ? 'text-slate-900 font-semibold' : 'text-slate-400'}`}>{r.desc}</p>
                              </div>
                              {isCurrent && <span className="text-[9px] px-1.5 py-0.5 bg-slate-950 text-amber-400 font-black rounded shrink-0">ACTIVE</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <button 
                    onClick={() => setIsSettingsOpen(true)} 
                    className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-teal-50 hover:text-teal-700 rounded-xl flex items-center font-medium transition-colors"
                  >
                    <Settings className="w-4 h-4 mr-2 text-slate-500" />
                    Profile & Settings
                  </button>

                  <button 
                    onClick={() => setIsTermsOpen(true)} 
                    className="w-full text-left px-3 py-2 text-sm text-amber-900 hover:bg-amber-50 rounded-xl flex items-center font-medium transition-colors"
                  >
                    <ShieldCheck className="w-4 h-4 mr-2 text-amber-700" />
                    Terms, Safety & Privacy
                  </button>

                  <button 
                    onClick={handleSignOut} 
                    className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl flex items-center font-medium transition-colors border-t border-slate-100 mt-1"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Content Grid */}
        <div className={`flex-1 overflow-y-auto ${isMobileFrameView ? 'max-w-[420px] w-full mx-auto my-3 bg-white rounded-[32px] shadow-2xl border-[6px] border-slate-900 p-4 pb-28' : 'p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8'} flex flex-col justify-between transition-all duration-300`}>
          <div className="flex-1">
            {(profile?.approvalStatus === 'PENDING' || profile?.approvalStatus === 'REJECTED') ? (
              <PendingLockDashboard />
            ) : (
              <Outlet />
            )}
          </div>

          {/* Platform Global Footer */}
          <footer className="mt-8 pt-4 pb-2 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500 font-medium shrink-0">
            <div className="flex items-center gap-2">
              <CasaMiraLogo className="w-5 h-5" variant="badge" />
              <span className="font-bold text-slate-700">Casa Mira South HOA All-in-App</span>
            </div>
            <p className="text-center sm:text-right text-slate-400 text-[10.5px]">
              © 2026 Kieth Ryan Gonzales - AI Systems Design & Automated Web Development.
            </p>
          </footer>
        </div>

        {/* Services Hub Mobile Bottom Sheet Drawer */}
        {isServicesHubOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs animate-in fade-in" onClick={() => setIsServicesHubOpen(false)}>
            <div 
              className={`bg-white rounded-t-3xl w-full ${isMobileFrameView ? 'max-w-[420px] rounded-b-3xl mb-3' : 'max-w-md'} max-h-[85vh] overflow-y-auto p-5 shadow-2xl border-t border-slate-200 animate-in slide-in-from-bottom duration-200`}
              onClick={e => e.stopPropagation()}
            >
              {/* Drag Handle */}
              <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-4" />

              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2.5">
                  <CasaMiraLogo className="w-7 h-7" variant="badge" />
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 leading-tight">Community Services Hub</h3>
                    <p className="text-[10.5px] text-slate-500 font-medium">Casa Mira South Homeowner Modules</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsServicesHubOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Household Member Card Banner */}
              <div className="p-3 bg-gradient-to-r from-slate-900 to-teal-950 text-white rounded-2xl mb-4 flex items-center justify-between">
                <div>
                  <span className="text-[9.5px] uppercase font-bold text-teal-400 tracking-wider block">Homeowner Account</span>
                  <p className="font-black text-xs text-white truncate max-w-[200px]">{profile?.name || 'Resident Member'}</p>
                  <p className="text-[10px] text-slate-300">{profile?.blockLot || 'Phase 1 Block 1 Lot 1'} • Type {profile?.houseType || 'A'}</p>
                </div>
                <button
                  onClick={() => {
                    setIsServicesHubOpen(false);
                    setIsPassModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1 shadow-sm active:scale-95 transition-all"
                >
                  <QrCode className="w-3.5 h-3.5" /> Pass
                </button>
              </div>

              {/* Services Cards Grid (Grouped by Touch Cards) */}
              <div className="grid grid-cols-3 gap-2.5 mb-5">
                {[
                  { name: 'Advisories', path: '/announcements', icon: Megaphone, color: 'text-emerald-700 bg-emerald-50' },
                  { name: 'Dues & Water', path: '/billings', icon: Receipt, color: 'text-amber-700 bg-amber-50' },
                  { name: 'Marketplace', path: '/marketplace', icon: Store, color: 'text-purple-700 bg-purple-50' },
                  { name: 'Report Hazard', path: '/reports', icon: AlertTriangle, color: 'text-rose-700 bg-rose-50' },
                  { name: 'Pet Registry', path: '/pets', icon: Heart, color: 'text-pink-700 bg-pink-50' },
                  { name: 'Directory', path: '/directory', icon: Users, color: 'text-sky-700 bg-sky-50' },
                  { name: 'Subdivision Map', path: '/map', icon: MapPin, color: 'text-teal-700 bg-teal-50' },
                  { name: 'Events Calendar', path: '/events', icon: Calendar, color: 'text-indigo-700 bg-indigo-50' },
                  { name: 'Ask Mirai AI', path: '/assistant', icon: Bot, color: 'text-teal-700 bg-teal-50' },
                ].map(svc => {
                  const Icon = svc.icon;
                  return (
                    <button
                      key={svc.name}
                      onClick={() => {
                        setIsServicesHubOpen(false);
                        navigate(svc.path);
                      }}
                      className="p-3 bg-white hover:bg-slate-50 border border-slate-200/90 hover:border-teal-300 rounded-2xl flex flex-col items-center justify-center text-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer"
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${svc.color} shadow-2xs`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] font-extrabold text-slate-800 leading-tight">{svc.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Emergency Guard Hotlines Quick Cards */}
              <div className="p-3.5 bg-slate-900 text-white rounded-2xl mb-4 space-y-2">
                <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider block">24/7 Security Dispatch</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <a
                    href="tel:+639123456789"
                    className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold flex items-center gap-1.5 transition-all"
                  >
                    <Phone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="truncate text-[11px]">Gate 1 Guard</span>
                  </a>
                  <a
                    href="tel:+639178889900"
                    className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold flex items-center gap-1.5 transition-all"
                  >
                    <Phone className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span className="truncate text-[11px]">PMO Office</span>
                  </a>
                </div>
              </div>

              {/* Account Quick Settings */}
              <div className="space-y-1.5 border-t border-slate-100 pt-3">
                <button
                  onClick={() => {
                    setIsServicesHubOpen(false);
                    setIsSettingsOpen(true);
                  }}
                  className="w-full text-left p-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-slate-500" /> Profile & Household Settings
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>

                <button
                  onClick={() => {
                    setIsServicesHubOpen(false);
                    setIsTermsOpen(true);
                  }}
                  className="w-full text-left p-2.5 text-xs font-bold text-amber-900 hover:bg-amber-50 rounded-xl flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-600" /> Terms, Privacy & Safety
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>

                <button
                  onClick={() => {
                    setIsServicesHubOpen(false);
                    handleSignOut();
                  }}
                  className="w-full text-left p-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <LogOut className="w-4 h-4" /> Sign Out
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sticky Mobile App Bottom Navigation Bar for Resident Access */}
        <nav className={`fixed bottom-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-lg px-2 py-1.5 flex items-center justify-around ${
          isMobileFrameView ? 'w-[408px] left-1/2 -translate-x-1/2 rounded-b-[26px]' : 'left-0 right-0 lg:hidden'
        }`}>
          <Link
            to="/"
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all ${
              location.pathname === '/' ? 'text-teal-700 font-black' : 'text-slate-500 hover:text-slate-900 font-medium'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] tracking-tight">Home</span>
            {location.pathname === '/' && <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />}
          </Link>

          <Link
            to="/billings"
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all ${
              location.pathname === '/billings' ? 'text-teal-700 font-black' : 'text-slate-500 hover:text-slate-900 font-medium'
            }`}
          >
            <Receipt className="w-5 h-5" />
            <span className="text-[10px] tracking-tight">Dues</span>
            {location.pathname === '/billings' && <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />}
          </Link>

          {/* Elevated Center Gate Pass Action */}
          <button
            onClick={() => setIsPassModalOpen(true)}
            className="-mt-5 flex flex-col items-center group cursor-pointer focus:outline-none"
            title="Scan or Present Resident Gate Pass"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-700 via-teal-600 to-emerald-500 text-white shadow-lg shadow-teal-700/30 flex items-center justify-center transform group-hover:scale-105 active:scale-95 transition-all border-2 border-white">
              <QrCode className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-extrabold text-slate-800 mt-0.5">Gate Pass</span>
          </button>

          <Link
            to="/marketplace"
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all ${
              location.pathname === '/marketplace' ? 'text-teal-700 font-black' : 'text-slate-500 hover:text-slate-900 font-medium'
            }`}
          >
            <Store className="w-5 h-5" />
            <span className="text-[10px] tracking-tight">Market</span>
            {location.pathname === '/marketplace' && <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />}
          </Link>

          {/* 5th Tab: Services Hub Bottom Sheet */}
          <button
            onClick={() => setIsServicesHubOpen(true)}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all cursor-pointer ${
              isServicesHubOpen ? 'text-teal-700 font-black' : 'text-slate-500 hover:text-slate-900 font-medium'
            }`}
          >
            <LayoutGrid className="w-5 h-5" />
            <span className="text-[10px] tracking-tight">Services</span>
            {isServicesHubOpen && <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />}
          </button>
        </nav>
      </main>
    </div>
  );
}

