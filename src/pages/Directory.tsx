import React, { useEffect, useState } from 'react';
import { useAuth } from '../components/AuthContext';
import { auth } from '../lib/firebase';
import { Search, MapPin, Phone, PhoneCall, Mail, ShieldCheck, Briefcase, Store, Users, Info, Building, Filter, ChevronLeft, ChevronRight, CheckCircle2, User, Eye } from 'lucide-react';
import { BadgeList } from '../components/BadgePill';
import PublicProfileModal from '../components/PublicProfileModal';

export default function Directory() {
  const { token, profile } = useAuth();
  const isAdmin = profile?.role === 'ADMIN' || profile?.role === 'SUPERADMIN';
  const [activeTab, setActiveTab] = useState<'residents' | 'households' | 'businesses' | 'hotlines' | 'my-business'>('residents');

  useEffect(() => {
    if (!isAdmin && activeTab === 'households') {
      setActiveTab('residents');
    }
  }, [isAdmin, activeTab]);
  const [users, setUsers] = useState<any[]>([]);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [selectedProfileModal, setSelectedProfileModal] = useState<any | null>(null);
  
  // Search & Filters state
  const [search, setSearch] = useState('');
  const [phaseFilter, setPhaseFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  
  // Pagination state
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [bizForm, setBizForm] = useState({ businessName: '', category: 'Food & Beverage', description: '', contact: '', location: '' });
  const [isEditingBiz, setIsEditingBiz] = useState(false);

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, phaseFilter, roleFilter, activeTab, itemsPerPage]);

  const fetchData = async () => {
    try {
      let currentToken = token;
      if (auth.currentUser) {
        currentToken = await auth.currentUser.getIdToken();
      }
      const [uRes, bRes] = await Promise.all([
        fetch('/api/directory/users', { headers: currentToken ? { Authorization: `Bearer ${currentToken}` } : {} }),
        fetch('/api/directory/businesses', { headers: currentToken ? { Authorization: `Bearer ${currentToken}` } : {} })
      ]);
      let uData = uRes.ok ? await uRes.json() : [];
      let bData = bRes.ok ? await bRes.json() : [];
      
      const safeUsers = Array.isArray(uData) ? uData : [];
      const safeBusinesses = Array.isArray(bData) ? bData : [];
      
      setUsers(safeUsers);
      setBusinesses(safeBusinesses);
      
      const mine = safeBusinesses.find((b: any) => b.ownerId === profile?.id);
      if (mine && !bizForm.businessName) {
        setBizForm({
          businessName: mine.businessName || '',
          category: mine.category || 'Food & Beverage',
          description: mine.description || '',
          contact: mine.contact || '',
          location: mine.location || ''
        });
      }
    } catch (e) {
      console.error(e);
      setUsers([]);
      setBusinesses([]);
    }
  };

  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = myBusiness ? `/api/directory/businesses/${myBusiness.id}` : '/api/directory/businesses';
      const method = myBusiness ? 'PATCH' : 'POST';
      
      await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(bizForm)
      });
      setIsEditingBiz(false);
      fetchData();
      if (!myBusiness) setActiveTab('businesses');
    } catch (err) {
      console.error(err);
    }
  };

  const safeUsers = Array.isArray(users) ? users : [];
  const safeBusinesses = Array.isArray(businesses) ? businesses : [];
  const myBusiness = safeBusinesses.find(b => b.ownerId === profile?.id);

  // Filtered Lists
  const filteredUsers = safeUsers.filter(u => {
    const query = search.toLowerCase();
    const nameMatch = u.name?.toLowerCase().includes(query) || false;
    const skillsMatch = u.skills?.toLowerCase().includes(query) || false;
    const blockLotMatch = u.blockLot?.toLowerCase().includes(query) || false;
    const phoneMatch = u.phoneNumber?.toLowerCase().includes(query) || false;
    const emailMatch = u.email?.toLowerCase().includes(query) || false;

    const matchesQuery = nameMatch || skillsMatch || blockLotMatch || phoneMatch || emailMatch;

    const matchesPhase = phaseFilter === 'ALL' || (u.phase && u.phase.toUpperCase() === phaseFilter.toUpperCase()) || (u.blockLot && u.blockLot.toUpperCase().includes(phaseFilter.toUpperCase()));
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;

    return matchesQuery && matchesPhase && matchesRole;
  }).sort((a, b) => {
    const roleOrder = ['SUPERADMIN', 'ADMIN', 'EVENT_ORGANIZER', 'SERVICE_PROVIDER', 'RESIDENT'];
    return (roleOrder.indexOf(a.role) > -1 ? roleOrder.indexOf(a.role) : 99) - (roleOrder.indexOf(b.role) > -1 ? roleOrder.indexOf(b.role) : 99);
  });

  const filteredBusinesses = safeBusinesses.filter(b => {
    const query = search.toLowerCase();
    const nameMatch = b.businessName?.toLowerCase().includes(query) || false;
    const catMatch = b.category?.toLowerCase().includes(query) || false;
    const descMatch = b.description?.toLowerCase().includes(query) || false;
    const locationMatch = b.location?.toLowerCase().includes(query) || false;

    return nameMatch || catMatch || descMatch || locationMatch;
  });

  // Emergency Hotlines List
  const emergencyHotlines = [
    { title: 'Gate 1 Main Guardhouse', desc: 'Visitor Logins, Resident Stickers & Gate Security Desk', phone: '+63 912 345 6789', tag: 'SECURITY', location: 'Phase 1 Entrance Gate' },
    { title: 'PMO Administration Office', desc: 'HOA Bill Payments, Construction Clearance & Facility Reservation', phone: '+63 920 888 9900', tag: 'HOA ADMIN', location: 'Phase 2 Clubhouse PMO' },
    { title: 'Subdivision Security Command', desc: '24/7 Roving Guards, Emergency Escalations & Noise Complaints', phone: '+63 917 555 4321', tag: '24/7 HOTLINE', location: 'Subdivision Main Command' },
    { title: 'Barangay Health & Police Precinct', desc: 'PNP Police Sector Station & Emergency Medical First Responders', phone: '+63 932 111 2233', tag: 'EMERGENCY', location: 'Sector 4 Junction' },
    { title: 'Subdivision Water & Utility Desk', desc: 'Booster Pump Monitoring, Line Leaks & Water Meter Support', phone: '+63 945 999 0000', tag: 'UTILITIES', location: 'Water Plant Sector' },
  ];

  // Pagination for Active List
  const currentList = activeTab === 'residents' ? filteredUsers : filteredBusinesses;
  const totalItems = currentList.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = currentList.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Banner & Directory Purpose Explanation */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 p-6 sm:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-3 max-w-3xl">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-teal-500/20 text-teal-300 border border-teal-500/30 font-bold text-xs rounded-full uppercase tracking-wider flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5" /> Official Casa Mira South Directory
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-serif-luxury font-bold tracking-tight text-white">
            Community Roster & Emergency Contacts
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Welcome to the verified subdivision directory. Easily find neighbor contact info by Block & Lot, explore resident-offered skills, reach emergency PMO desks, or connect with verified local neighborhood businesses.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-300">
            <span className="flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-xl backdrop-blur">
              <Users className="w-4 h-4 text-teal-400" /> {safeUsers.length} Enrolled Neighbors
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-xl backdrop-blur">
              <Store className="w-4 h-4 text-emerald-400" /> {safeBusinesses.length} Verified Businesses
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-xl backdrop-blur">
              <ShieldCheck className="w-4 h-4 text-amber-400" /> 1-Tap Emergency Hotlines
            </span>
          </div>
        </div>
      </div>

      {/* Tabs & Search Navigation Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Main Navigation Tabs */}
          <nav className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setActiveTab('residents')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'residents'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Users className="w-4 h-4 text-teal-400" />
              <span>Residents Roster ({filteredUsers.length})</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => setActiveTab('households')}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'households'
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Building className="w-4 h-4 text-amber-400" />
                <span>Family Households</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('businesses')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'businesses'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Store className="w-4 h-4 text-emerald-400" />
              <span>Services & Businesses ({filteredBusinesses.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('hotlines')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'hotlines'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <PhoneCall className="w-4 h-4 text-amber-400" />
              <span>PMO Emergency Hotlines</span>
            </button>

            <button
              onClick={() => setActiveTab('my-business')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'my-business'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'bg-teal-50 text-teal-800 hover:bg-teal-100'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>{myBusiness ? 'Manage My Business' : '+ Register Business'}</span>
            </button>
          </nav>

          {/* Quick Search Input */}
          {activeTab !== 'hotlines' && activeTab !== 'my-business' && (
            <div className="relative w-full md:w-72 shrink-0">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search name, phone, lot..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          )}
        </div>

        {/* Phase & Role Filter Controls for Residents */}
        {activeTab === 'residents' && (
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-700">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Filter className="w-3.5 h-3.5" /> Filter Roster:
            </div>

            {/* Phase Dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Phase:</span>
              <select
                value={phaseFilter}
                onChange={(e) => setPhaseFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="ALL">All Subdivision Phases</option>
                <option value="PHASE 1">Phase 1</option>
                <option value="PHASE 2">Phase 2</option>
                <option value="PHASE 3">Phase 3</option>
              </select>
            </div>

            {/* Role Dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Role:</span>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="ALL">All Resident Roles</option>
                <option value="RESIDENT">Resident</option>
                <option value="SERVICE_PROVIDER">Service Provider</option>
                <option value="EVENT_ORGANIZER">Event Organizer</option>
                <option value="ADMIN">PMO Admin</option>
              </select>
            </div>

            {(search || phaseFilter !== 'ALL' || roleFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setSearch('');
                  setPhaseFilter('ALL');
                  setRoleFilter('ALL');
                }}
                className="text-teal-600 font-bold hover:underline text-[11px]"
              >
                Reset Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content Rendering based on Active Tab */}
      {activeTab === 'households' && (() => {
        const householdGroups: { [address: string]: any[] } = {};
        safeUsers.forEach(u => {
          if (!u.blockLot) return;
          const key = u.blockLot.trim();
          if (!householdGroups[key]) householdGroups[key] = [];
          householdGroups[key].push(u);
        });

        const groups = Object.entries(householdGroups).filter(([_, members]) => {
          if (!search.trim()) return true;
          const q = search.toLowerCase();
          return members.some(m => m.name?.toLowerCase().includes(q) || m.blockLot?.toLowerCase().includes(q));
        });

        return (
          <div className="space-y-6">
            <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between border border-teal-500/30 shadow-md">
              <div>
                <h3 className="font-extrabold text-sm flex items-center gap-2 text-teal-300">
                  <Building className="w-4 h-4 text-amber-400" /> Family Household Auto-Grouping
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Residents sharing the same Phase, Block & Lot address are automatically grouped as Family Household units.
                </p>
              </div>
              <span className="px-3 py-1 bg-amber-500 text-slate-950 font-black text-xs rounded-full uppercase">
                {groups.length} Family Units
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {groups.map(([address, members]) => (
                <div key={address} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 bg-teal-100 text-teal-800 rounded-2xl font-bold">
                        <Building className="w-5 h-5 text-teal-700" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-sm">{address}</h4>
                        <p className="text-[11px] text-slate-500 font-medium">House Type: {members[0]?.houseType || 'A'}</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-teal-50 text-teal-800 border border-teal-200 font-black text-xs rounded-full flex items-center gap-1">
                      👨‍👩‍👧‍👦 {members.length} {members.length === 1 ? 'Resident' : 'Family Members'}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {members.map(m => (
                      <div key={m.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100/80">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-teal-700 text-white font-extrabold text-xs flex items-center justify-center shadow-sm">
                            {m.name?.[0] || 'R'}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                              {m.name}
                              {m.id === profile?.id && <span className="text-[9px] px-1.5 py-0.5 bg-teal-100 text-teal-800 font-black rounded-md">YOU</span>}
                            </p>
                            <p className="text-[10px] text-slate-500 font-medium">{m.phoneNumber || 'No phone number'}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 bg-slate-200/80 text-slate-700 rounded-md">
                          {m.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {activeTab === 'residents' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedItems.length === 0 ? (
              <div className="col-span-full py-12 text-center bg-white rounded-3xl border border-slate-200 p-6 space-y-2">
                <Users className="w-12 h-12 text-slate-300 mx-auto" />
                <p className="font-bold text-slate-700">No residents match your directory search criteria.</p>
                <p className="text-xs text-slate-400">Try adjusting your search terms or clearing phase/role filters.</p>
              </div>
            ) : (
              paginatedItems.map((u: any, idx: number, arr: any[]) => {
                const isFirstOfRole = idx === 0 || arr[idx - 1].role !== u.role;
                return (
                  <React.Fragment key={u.id}>
                    {isFirstOfRole && (
                      <div className="col-span-full mt-4 mb-2">
                        <h3 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2">{u.role.replace('_', ' ')}S</h3>
                      </div>
                    )}
                    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all p-6 flex flex-col space-y-4">
                      {/* Card Top: Avatar, Name, Role Badge */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-14 rounded-2xl bg-teal-100 text-teal-800 font-extrabold text-xl flex items-center justify-center overflow-hidden border border-teal-200 shrink-0">
                            {u.profileImage ? (
                              <img src={u.profileImage} alt={u.name} className="w-full h-full object-cover" />
                            ) : (
                              u.name?.[0] || 'R'
                            )}
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 text-base flex items-center gap-1.5">
                              {u.name}
                              <CheckCircle2 className="w-4 h-4 text-teal-600" title="Verified Resident" />
                            </h3>
                            <p className="text-xs font-semibold text-slate-500 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                              {u.blockLot || 'Casa Mira South'}
                            </p>
                            <div className="mt-1.5">
                              <BadgeList badges={u.badges} size="sm" limit={3} />
                            </div>
                          </div>
                        </div>

                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider shrink-0 ${
                          u.role === 'ADMIN' || u.role === 'SUPERADMIN' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                          u.role === 'SERVICE_PROVIDER' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                          u.role === 'EVENT_ORGANIZER' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                          'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {u.role}
                        </span>
                      </div>

                      {/* Skills / Specialization Badge */}
                      {u.skills && (
                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
                          <p className="font-bold text-slate-700 flex items-center gap-1.5 mb-1">
                            <Briefcase className="w-3.5 h-3.5 text-teal-600" /> Profession & Offerings:
                          </p>
                          <p className="text-slate-600 text-xs leading-relaxed">{u.skills}</p>
                        </div>
                      )}

                      {/* Contact Info Rows with Discreet Privacy Handling */}
                      {(() => {
                        const isAdminViewer = profile?.role === 'ADMIN' || profile?.role === 'SUPERADMIN';
                        const isPublic = u.isContactPublic || u.id === profile?.id;
                        const showFull = isAdminViewer || isPublic;

                        const displayPhone = showFull
                          ? (u.phoneNumber || '+63 918 234 5678')
                          : `•••• ••• ${u.phoneNumber ? u.phoneNumber.slice(-4) : '5678'}`;

                        const displayEmail = showFull
                          ? (u.email || 'homeowner@casamira.ph')
                          : `${u.email ? u.email.split('@')[0].slice(0, 2) + '••••@' + u.email.split('@')[1] : 'h••••@casamira.ph'}`;

                        return (
                          <>
                            <div className="mt-auto pt-3 border-t border-slate-100 space-y-2 text-xs">
                              <div className="flex items-center justify-between text-slate-700">
                                <span className="text-slate-400 font-medium flex items-center gap-1.5">
                                  <Phone className="w-3.5 h-3.5 text-teal-600" /> Phone:
                                </span>
                                <span className="font-bold text-slate-900 font-mono flex items-center gap-1">
                                  {displayPhone}
                                </span>
                              </div>

                              <div className="flex items-center justify-between text-slate-700 truncate">
                                <span className="text-slate-400 font-medium flex items-center gap-1.5 shrink-0">
                                  <Mail className="w-3.5 h-3.5 text-teal-600" /> Email:
                                </span>
                                <span className="font-semibold text-slate-700 truncate ml-2 font-mono">
                                  {displayEmail}
                                </span>
                              </div>
                            </div>

                            {/* Action Call, Email & View Profile Buttons */}
                            <div className="grid grid-cols-2 gap-2 pt-2">
                              <button
                                onClick={() => setSelectedProfileModal(u)}
                                className="col-span-2 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 shadow-sm"
                              >
                                <Eye className="w-3.5 h-3.5 text-teal-400" /> View Profile
                              </button>
                              {showFull && (
                                <>
                                  <a
                                    href={`tel:${u.phoneNumber || '+639182345678'}`}
                                    className="py-2 px-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 shadow-sm"
                                  >
                                    <PhoneCall className="w-3.5 h-3.5" /> Call
                                  </a>
                                  <a
                                    href={`mailto:${u.email || 'homeowner@casamira.ph'}`}
                                    className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5"
                                  >
                                    <Mail className="w-3.5 h-3.5" /> Email
                                  </a>
                                </>
                              )}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </React.Fragment>
                );
              })
            )}
          </div>

          {/* Pagination Controls for Residents */}
          {totalItems > 0 && (
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-700">
              <div className="flex items-center gap-3">
                <span className="text-slate-500">
                  Showing <span className="font-extrabold text-slate-900">{startIndex + 1}</span> to <span className="font-extrabold text-slate-900">{Math.min(startIndex + itemsPerPage, totalItems)}</span> of <span className="font-extrabold text-slate-900">{totalItems}</span> residents
                </span>

                <div className="flex items-center gap-1.5 ml-2">
                  <span className="text-slate-400">Show per page:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value={10}>10 per page</option>
                    <option value={20}>20 per page</option>
                    <option value={30}>30 per page</option>
                    <option value={50}>50 per page</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100 text-slate-700 rounded-lg font-bold transition-all"
                >
                  Previous
                </button>
                <span className="px-3 py-1.5 bg-teal-50 text-teal-800 border border-teal-200 rounded-lg font-extrabold">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100 text-slate-700 rounded-lg font-bold transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Services & Businesses Tab */}
      {activeTab === 'businesses' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedItems.length === 0 ? (
              <div className="col-span-full py-12 text-center bg-white rounded-3xl border border-slate-200 p-6 space-y-2">
                <Store className="w-12 h-12 text-slate-300 mx-auto" />
                <p className="font-bold text-slate-700">No verified businesses match your directory search query.</p>
              </div>
            ) : (
              paginatedItems.map((biz: any) => (
                <div key={biz.id} className="bg-white rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all p-6 flex flex-col space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 flex items-center gap-1.5">
                        {biz.businessName}
                        {biz.verified && <ShieldCheck className="h-4 w-4 text-teal-600" title="Verified Community Business" />}
                      </h3>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-50 text-teal-800 mt-2 border border-teal-100 uppercase tracking-wide">
                        {biz.category}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">{biz.description}</p>

                  <div className="mt-auto pt-3 border-t border-slate-100 space-y-2 text-xs">
                    <div className="flex items-center text-slate-700 font-semibold">
                      <Phone className="h-4 w-4 text-teal-600 mr-2 shrink-0" />
                      <span className="font-mono">{biz.contact}</span>
                    </div>
                    <div className="flex items-center text-slate-700 font-medium">
                      <MapPin className="h-4 w-4 text-teal-600 mr-2 shrink-0" />
                      {biz.location || 'Casa Mira South'}
                    </div>
                  </div>

                  <a
                    href={`tel:${biz.contact}`}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-2 shadow-sm"
                  >
                    <PhoneCall className="w-4 h-4" /> Call / Contact Business
                  </a>
                </div>
              ))
            )}
          </div>

          {/* Pagination for Businesses */}
          {totalItems > 0 && (
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-700">
              <div className="flex items-center gap-3">
                <span className="text-slate-500">
                  Showing <span className="font-extrabold text-slate-900">{startIndex + 1}</span> to <span className="font-extrabold text-slate-900">{Math.min(startIndex + itemsPerPage, totalItems)}</span> of <span className="font-extrabold text-slate-900">{totalItems}</span> businesses
                </span>

                <div className="flex items-center gap-1.5 ml-2">
                  <span className="text-slate-400">Show per page:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value={10}>10 per page</option>
                    <option value={20}>20 per page</option>
                    <option value={30}>30 per page</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100 text-slate-700 rounded-lg font-bold transition-all"
                >
                  Previous
                </button>
                <span className="px-3 py-1.5 bg-teal-50 text-teal-800 border border-teal-200 rounded-lg font-extrabold">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100 text-slate-700 rounded-lg font-bold transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PMO Emergency Hotlines Tab */}
      {activeTab === 'hotlines' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {emergencyHotlines.map((h, idx) => (
            <div key={idx} className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 bg-amber-100 text-amber-900 border border-amber-200 font-extrabold text-[10px] rounded-full uppercase tracking-wider">
                    {h.tag}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">{h.location}</span>
                </div>
                <h3 className="font-extrabold text-slate-900 text-base">{h.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{h.desc}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-3">
                <p className="font-mono font-extrabold text-slate-900 text-base">{h.phone}</p>
                <a
                  href={`tel:${h.phone}`}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-teal-300 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-2 shadow-md"
                >
                  <PhoneCall className="w-4 h-4 text-teal-400" /> Dial Hotline Now
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Register/Manage My Business Tab */}
      {activeTab === 'my-business' && (
        <div className="max-w-3xl mx-auto bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          {myBusiness && !isEditingBiz ? (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    {myBusiness.businessName}
                    {myBusiness.verified && <ShieldCheck className="h-5 w-5 text-teal-600" />}
                  </h2>
                  <span className="inline-block mt-2 px-3 py-1 bg-teal-50 text-teal-700 rounded-full text-xs font-bold uppercase">
                    {myBusiness.category}
                  </span>
                </div>
                <div className="text-right">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase ${myBusiness.verified ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {myBusiness.verified ? 'Verified' : 'Pending Verification'}
                  </span>
                </div>
              </div>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-2">Description</h3>
                  <p className="text-slate-600">{myBusiness.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-6">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 mb-1">Contact Number</h3>
                    <p className="text-slate-600 flex items-center"><Phone className="w-4 h-4 mr-2" />{myBusiness.contact}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 mb-1">Location</h3>
                    <p className="text-slate-600 flex items-center"><MapPin className="w-4 h-4 mr-2" />{myBusiness.location}</p>
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
                <button onClick={() => setIsEditingBiz(true)} className="px-4 py-2 bg-slate-900 text-white font-bold text-sm rounded-lg hover:bg-slate-800">
                  Edit Profile
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 mb-2">{myBusiness ? 'Edit Your Business' : 'Register Your Business'}</h2>
                  <p className="text-slate-500 text-sm mb-6">{myBusiness ? 'Update your community listing details below.' : 'Submit your business or service details to be listed in the Casa Mira South directory. Submissions are subject to administrator approval.'}</p>
                </div>
                {myBusiness && (
                  <button onClick={() => setIsEditingBiz(false)} className="px-4 py-2 bg-slate-100 text-slate-600 font-bold text-sm rounded-lg hover:bg-slate-200">
                    Cancel
                  </button>
                )}
              </div>
              
              <form onSubmit={handleCreateBusiness} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Business Name</label>
                  <input required type="text" value={bizForm.businessName} onChange={e => setBizForm({...bizForm, businessName: e.target.value})} className="w-full rounded-xl border-slate-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 p-3 border outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Category</label>
                  <select value={bizForm.category} onChange={e => setBizForm({...bizForm, category: e.target.value})} className="w-full rounded-xl border-slate-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 p-3 border outline-none text-sm bg-white">
                    <option>Food & Beverage</option>
                    <option>Home Services</option>
                    <option>Professional Services</option>
                    <option>Retail</option>
                    <option>Health & Beauty</option>
                    <option>Others</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
                  <textarea required rows={4} value={bizForm.description} onChange={e => setBizForm({...bizForm, description: e.target.value})} className="w-full rounded-xl border-slate-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 p-3 border outline-none text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Contact Number</label>
                    <input required type="text" value={bizForm.contact} onChange={e => setBizForm({...bizForm, contact: e.target.value})} className="w-full rounded-xl border-slate-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 p-3 border outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Location (Block & Lot)</label>
                    <input required type="text" value={bizForm.location} onChange={e => setBizForm({...bizForm, location: e.target.value})} className="w-full rounded-xl border-slate-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 p-3 border outline-none text-sm" />
                  </div>
                </div>
                <div className="pt-4 flex space-x-4 justify-end">
                  <button type="submit" className="px-6 py-3 bg-teal-600 text-white rounded-xl text-sm font-bold hover:bg-teal-700 shadow-sm">
                    {myBusiness ? 'Save Changes' : 'Submit for Verification'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Public Profile Modal */}
      <PublicProfileModal
        isOpen={!!selectedProfileModal}
        onClose={() => setSelectedProfileModal(null)}
        user={selectedProfileModal}
        isAdminViewer={profile?.role === 'ADMIN' || profile?.role === 'SUPERADMIN'}
      />
    </div>
  );
}
