import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { Shield, Check, X, Users, CreditCard, Droplets, Trash2, Edit2, Edit3, Award, FileSpreadsheet, Search, CheckCircle2, AlertCircle, Clock, QrCode, ShieldAlert, ShieldCheck, History, MessageSquare, Megaphone, Calendar, Store, Phone, Key, Save, Eye, EyeOff, Printer, Plus, Sparkles, Building, Lock, Menu, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Wrench, RefreshCw, MapPin, Receipt, ArrowUpDown, Star } from 'lucide-react';
import { auth } from '../lib/firebase';
import { BadgeList, renderBadgeIcon } from '../components/BadgePill';
import { BADGE_DEFINITIONS, parseBadges } from '../lib/badges';
import ConfirmModal from '../components/ConfirmModal';
import CalculationSummaryModal from '../components/CalculationSummaryModal';

export default function Admin() {
  const { profile, token } = useAuth();
  const isSuperadmin = profile?.role === 'SUPERADMIN';

  const [users, setUsers] = useState<any[]>([]);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [content, setContent] = useState<any>({
    announcements: [], events: [], listings: [], memoryVault: [], reports: []
  });
  const [contacts, setContacts] = useState<any[]>([]);
  const [smsLogs, setSmsLogs] = useState<any[]>([]);
  const [flaggedMsgs, setFlaggedMsgs] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [adminBillings, setAdminBillings] = useState<any[]>([]);
  const [summaryModalBill, setSummaryModalBill] = useState<any | null>(null);
  const [isSuperadminPanelOpen, setIsSuperadminPanelOpen] = useState(false);

  // PMO Billing Search Filter, Sort, and Pagination
  const [pmoResidentSearch, setPmoResidentSearch] = useState('');
  const [pmoHoaSortOrder, setPmoHoaSortOrder] = useState<'LATEST' | 'OLDEST'>('LATEST');
  const [pmoHoaPage, setPmoHoaPage] = useState(1);
  const [pmoWaterSortOrder, setPmoWaterSortOrder] = useState<'LATEST' | 'OLDEST'>('LATEST');
  const [pmoWaterPage, setPmoWaterPage] = useState(1);

  // System Confirmation Modal State
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'success' | 'info' | 'primary';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const triggerConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    variant: 'danger' | 'warning' | 'success' | 'info' | 'primary' = 'danger',
    confirmText = 'Confirm'
  ) => {
    setConfirmState({
      isOpen: true,
      title,
      message,
      confirmText,
      variant,
      onConfirm
    });
  };

  // Editing Marketplace Listing State
  const [editingListing, setEditingListing] = useState<any | null>(null);
  const [editListingForm, setEditListingForm] = useState({
    title: '',
    price: '',
    category: 'Goods',
    description: '',
    status: 'APPROVED'
  });

  // Billing Month & Year dropdown state
  const monthsList = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const yearsList = ["2025", "2026", "2027", "2028", "2029", "2030"];

  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toLocaleString('default', { month: 'long' })
  );
  const [selectedYear, setSelectedYear] = useState<string>(
    new Date().getFullYear().toString()
  );

  // Unit-Type HOA Monthly Dues options
  const unitTypeOptions = [
    { type: 'A', label: 'Unit-Type A — ₱240.00 / mo', amount: '240.00' },
    { type: 'B', label: 'Unit-Type B — ₱320.00 / mo', amount: '320.00' },
    { type: 'C', label: 'Unit-Type C — ₱480.00 / mo', amount: '480.00' },
  ];
  const [selectedUnitType, setSelectedUnitType] = useState<string>('A');

  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(urlTab || 'residents');
  const [isSandwichOpen, setIsSandwichOpen] = useState(false);

  useEffect(() => {
    if (urlTab) {
      setActiveTab(urlTab);
    }
  }, [urlTab]);

  // Pagination state for Resident Approvals (Max 100 per page)
  const [usersPerPage, setUsersPerPage] = useState(10);
  const [usersCurrentPage, setUsersCurrentPage] = useState(1);

  // Pagination state for Homeowner Credentials (Max 100 per page)
  const [homeownersPerPage, setHomeownersPerPage] = useState(10);
  const [homeownersCurrentPage, setHomeownersCurrentPage] = useState(1);
  
  // Homeowner Credentials state
  const [homeowners, setHomeowners] = useState<any[]>([]);
  const [revealedPins, setRevealedPins] = useState<{ [key: number]: boolean }>({});
  const [newHomeownerForm, setNewHomeownerForm] = useState({
    name: '', phase: 'Phase 1', blockNo: '1', lotNo: '1', email: '', phoneNumber: ''
  });

  // PMO Settings state
  const [pmoSettings, setPmoSettings] = useState({
    hoaDuesRate: '500.00',
    waterRate: '35.00',
    lateFeePercent: '5',
    gateScannerActive: true,
    smsAlertsEnabled: true,
    visitorPassExpiryHours: '24'
  });
  const [settingsChanged, setSettingsChanged] = useState(false);
  const [settingsSavedSuccess, setSettingsSavedSuccess] = useState(false);

  // New contact form state
  const [newContact, setNewContact] = useState({ name: '', number: '', category: 'Emergency' });

  // Community Broadcast Suite State (Email & SMS)
  const [broadcastChannel, setBroadcastChannel] = useState<'EMAIL' | 'SMS'>('EMAIL');
  const [emailLogsList, setEmailLogsList] = useState<any[]>([]);

  // Email Blast Broadcast State
  const [emailRecipientType, setEmailRecipientType] = useState<'ALL' | 'VERIFIED' | 'PHASE' | 'SPECIFIC'>('ALL');
  const [emailCustomAddress, setEmailCustomAddress] = useState('');
  const [emailTargetPhase, setEmailTargetPhase] = useState('Phase 1');
  const [emailSubject, setEmailSubject] = useState('[Casa Mira South] Official HOA Community Advisory');
  const [emailMessage, setEmailMessage] = useState(
`Dear Homeowners & Residents,

Please be advised of the following official community update from the Property Management Office (PMO):

• Announcement: Essential Subdivision Maintenance & Service Advisory
• Scope: All Casa Mira South homeowners and residents
• Guidelines: Please keep gate passes updated and check the portal for latest schedules.

For any inquiries, please contact the PMO Office at +63 917 888 9900 or Main Gate 1 at +63 912 345 6789.

Warm regards,
Property Management Office (PMO)
Casa Mira South Homeowners Association`
  );
  const [emailSending, setEmailSending] = useState(false);
  const [emailSuccessMsg, setEmailSuccessMsg] = useState('');

  // SMS Blast Broadcast state
  const [smsRecipientType, setSmsRecipientType] = useState<'ALL' | 'VERIFIED' | 'PHASE' | 'SPECIFIC'>('ALL');
  const [smsCustomPhone, setSmsCustomPhone] = useState('+639272815880');
  const [smsTargetPhase, setSmsTargetPhase] = useState('Phase 1');
  const [smsTitle, setSmsTitle] = useState('Casa Mira South Alert');
  const [smsMessage, setSmsMessage] = useState('Casa Mira South PMO: Important community announcement dispatched. Please check your resident dashboard portal.');
  const [smsSending, setSmsSending] = useState(false);
  const [smsSuccessMsg, setSmsSuccessMsg] = useState('');

  const handleSendEmailBlast = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!emailSubject.trim()) return alert('Please enter an email subject line.');
    if (!emailMessage.trim()) return alert('Please enter email message content.');

    setEmailSending(true);
    setEmailSuccessMsg('');
    try {
      const res = await fetch('/api/admin/email/send-blast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          recipientType: emailRecipientType,
          customEmail: emailCustomAddress,
          targetPhase: emailTargetPhase,
          subject: emailSubject,
          message: emailMessage
        })
      });

      if (res.ok) {
        const data = await res.json();
        setEmailSuccessMsg(`Email Broadcast dispatched successfully to ${data.recipientsCount} recipient(s) via ${data.details?.provider || 'Gateway'}!`);
        fetchEmailLogs();
      } else {
        const err = await res.json();
        alert(`Email Dispatch Failed: ${err.error || 'Server error'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to send email blast.');
    } finally {
      setEmailSending(false);
    }
  };

  const handleSendSmsBlast = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!smsMessage.trim()) return alert('Please enter SMS message content.');

    setSmsSending(true);
    setSmsSuccessMsg('');
    try {
      const res = await fetch('/api/admin/sms/send-blast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          recipientType: smsRecipientType,
          customPhone: smsCustomPhone,
          targetPhase: smsTargetPhase,
          title: smsTitle,
          message: smsMessage
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSmsSuccessMsg(`SMS Broadcast dispatched successfully to ${data.recipientsCount} recipient(s) via ${data.details?.provider || 'SMS Gateway'}!`);
        fetchSmsLogs();
      } else {
        const err = await res.json();
        alert(`SMS Dispatch Failed: ${err.error || 'Server error'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to send SMS blast.');
    } finally {
      setSmsSending(false);
    }
  };

  // Billing Generator Form state
  const [issuanceType, setIssuanceType] = useState<'HOA' | 'WATER'>('HOA');
  const [billingForm, setBillingForm] = useState({
    userId: '',
    billingMonth: `${new Date().toLocaleString('default', { month: 'long' })} ${new Date().getFullYear()}`,
    hoaDues: '240.00',
    prevReading: '0.00',
    currReading: '15.00',
    overridePrevReading: '',
    dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]
  });
  const [residentMeterInfo, setResidentMeterInfo] = useState<any>(null);
  const [useReadingBypass, setUseReadingBypass] = useState(false);

  // QR Pass Scanner state
  const [scannerUid, setScannerUid] = useState('');
  const [scannerResult, setScannerResult] = useState<any>(null);
  const [scannerLoading, setScannerLoading] = useState(false);

  // System Auto-Fix state
  const [autofixLoading, setAutofixLoading] = useState(false);
  const [autofixResult, setAutofixResult] = useState<any>(null);

  // Admin Pet Registry & Search state
  const [adminPets, setAdminPets] = useState<any[]>([]);
  const [residentSearchQuery, setResidentSearchQuery] = useState('');
  const [showLeadersOnly, setShowLeadersOnly] = useState(false);
  const [petSearchQuery, setPetSearchQuery] = useState('');

  const handleRunAutofix = async () => {
    if (!confirm('Run System & Database Auto-Fix routine? This will check all tables, fix missing schema columns, repair pending database constraints, and verify initial system data.')) return;
    setAutofixLoading(true);
    setAutofixResult(null);
    try {
      if (!token) return;
      const res = await fetch('/api/admin/autofix', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setAutofixResult(data);
      if (res.ok) {
        fetchAllAdminData();
      }
    } catch (err: any) {
      setAutofixResult({ error: err?.message || 'Failed to trigger auto-fix routine' });
    } finally {
      setAutofixLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchAllAdminData();
    }
  }, [token]);

  const fetchAllAdminData = () => {
    fetchUsers();
    fetchHomeowners();
    fetchBusinesses();
    fetchContent();
    fetchContacts();
    fetchSmsLogs();
    fetchEmailLogs();
    fetchFlaggedMessages();
    fetchAuditLogs();
    fetchAdminBillings();
    fetchAdminPets();
  };

  const handleToggleDelinquent = async (userId: number, currentDelinquent: boolean) => {
    const reason = currentDelinquent
      ? ''
      : prompt('Enter reason for setting delinquent status (e.g. Unsettled PMO Water/HOA Dues):', 'Unsettled PMO Water/HOA Dues');
    if (!currentDelinquent && reason === null) return;

    try {
      if (!token) return;
      const res = await fetch(`/api/admin/users/${userId}/toggle-delinquent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isDelinquent: !currentDelinquent, reason })
      });
      if (res.ok) {
        fetchUsers();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update delinquent status');
      }
    } catch (err) {
      console.error(err);
      alert('Network error updating delinquent status');
    }
  };

  const handleReactivateAccount = async (userId: number) => {
    if (!confirm('Reactivate / unfreeze this account and restore active gate pass privileges?')) return;
    try {
      if (!token) return;
      const res = await fetch(`/api/admin/users/${userId}/reactivate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchUsers();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to reactivate account');
      }
    } catch (err) {
      console.error(err);
      alert('Error reactivating account');
    }
  };

  const fetchAdminPets = async () => {
    try {
      if (!token) return;
      const res = await fetch('/api/admin/pets', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setAdminPets(Array.isArray(data) ? data : []);
      }
    } catch (err) { console.error(err); }
  };

  const fetchHomeowners = async () => {
    try {
      if (!token) return;
      const res = await fetch('/api/admin/homeowners', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setHomeowners(Array.isArray(data) ? data : []);
      }
    } catch (err) { console.error(err); }
  };

  const handleRegisterHomeowner = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!token) return;
      const res = await fetch('/api/admin/homeowners/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newHomeownerForm)
      });
      if (res.ok) {
        alert('New Homeowner account created successfully!');
        setNewHomeownerForm({ name: '', phase: 'Phase 1', blockNo: '1', lotNo: '1', email: '', phoneNumber: '' });
        fetchHomeowners();
        fetchUsers();
      }
    } catch (err) { console.error(err); }
  };

  const handleRegeneratePin = async (userId: number) => {
    if (!confirm('Regenerate short Access Pass PIN for this Homeowner?')) return;
    try {
      if (!token) return;
      const res = await fetch('/api/admin/homeowners/regenerate-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId })
      });
      if (res.ok) {
        fetchHomeowners();
      }
    } catch (err) { console.error(err); }
  };

  const togglePinReveal = (userId: number) => {
    setRevealedPins(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  const handleSavePmoSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSavedSuccess(true);
    setSettingsChanged(false);
    setTimeout(() => setSettingsSavedSuccess(false), 3000);
  };

  const fetchUsers = async () => {
    try {
      if (!token) return;
      if (!token) return;
      const res = await fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const fetchBusinesses = async () => {
    try {
      if (!token) return;
      if (!token) return;
      const res = await fetch('/api/admin/businesses', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setBusinesses(Array.isArray(data) ? data : []);
      }
    } catch (err) { console.error(err); }
  };

  const fetchContent = async () => {
    try {
      if (!token) return;
      if (!token) return;
      const res = await fetch('/api/admin/content', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setContent({
          announcements: Array.isArray(data.announcements) ? data.announcements : [],
          events: Array.isArray(data.events) ? data.events : [],
          listings: Array.isArray(data.listings) ? data.listings : [],
          memoryVault: Array.isArray(data.memoryVault) ? data.memoryVault : [],
          reports: Array.isArray(data.reports) ? data.reports : []
        });
      }
    } catch (err) { console.error(err); }
  };

  const fetchContacts = async () => {
    try {
      if (!token) return;
      if (!token) return;
      const res = await fetch('/api/contacts', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setContacts(Array.isArray(data) ? data : []);
      }
    } catch (err) { console.error(err); }
  };

  const fetchSmsLogs = async () => {
    try {
      if (!token) return;
      const res = await fetch('/api/admin/sms-logs', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setSmsLogs(Array.isArray(data) ? data : []);
      }
    } catch (e) { console.error(e); }
  };

  const fetchEmailLogs = async () => {
    try {
      if (!token) return;
      const res = await fetch('/api/admin/email-logs', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setEmailLogsList(Array.isArray(data) ? data : []);
      }
    } catch (e) { console.error(e); }
  };

  const fetchFlaggedMessages = async () => {
    try {
      if (!token) return;
      if (!token) return;
      const res = await fetch('/api/admin/chat/flagged', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setFlaggedMsgs(Array.isArray(data) ? data : []);
      }
    } catch (e) { console.error(e); }
  };

  const fetchAuditLogs = async () => {
    try {
      if (!token) return;
      if (!token) return;
      const res = await fetch('/api/admin/audit-logs', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(Array.isArray(data) ? data : []);
      }
    } catch (e) { console.error(e); }
  };

  const fetchAdminBillings = async () => {
    try {
      if (!token) return;
      if (!token) return;
      const res = await fetch('/api/admin/billings', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setAdminBillings(Array.isArray(data) ? data : []);
      }
    } catch (e) { console.error(e); }
  };

  // User Actions
  const handleApproveUser = async (userId: number, status: string) => {
    try {
      if (!token) return;
      await fetch(`/api/admin/users/${userId}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      fetchUsers();
    } catch (err) { console.error(err); }
  };

  const handleRoleChange = async (userId: number, role: string) => {
    try {
      if (!token) return;
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role })
      });
      if (res.ok) {
        fetchUsers();
        fetchAuditLogs();
      }
    } catch (err) { console.error(err); }
  };

  // Badge Management State & Handler
  const [editingBadgesUser, setEditingBadgesUser] = useState<any | null>(null);
  const [selectedBadges, setSelectedBadges] = useState<string[]>([]);

  useEffect(() => {
    if (editingBadgesUser) {
      setSelectedBadges(parseBadges(editingBadgesUser.badges));
    }
  }, [editingBadgesUser]);

  const handleSaveBadges = async () => {
    if (!editingBadgesUser || !token) return;
    try {
      const res = await fetch(`/api/admin/users/${editingBadgesUser.id}/badges`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ badges: selectedBadges })
      });
      if (res.ok) {
        alert(`Badges updated successfully for ${editingBadgesUser.name}!`);
        setEditingBadgesUser(null);
        fetchUsers();
        fetchAuditLogs();
      } else {
        alert('Failed to update resident badges.');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating resident badges.');
    }
  };

  const handleDeleteUser = async (userId: number, userName?: string) => {
    if (!confirm(`PMO ADMIN CONFIRMATION: Are you sure you want to permanently delete resident account ${userName ? `"${userName}"` : `#${userId}`}?\n\nThis will remove their profile, listings, marketplace items, reports, and clear account access.`)) return;
    try {
      if (!token) return;
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        alert(data.message || 'Resident account permanently removed.');
        fetchUsers();
        fetchAuditLogs();
      } else {
        alert(`Deletion error: ${data.error || res.statusText}`);
      }
    } catch (err) {
      console.error(err);
      alert('Error communicating with server while deleting resident account.');
    }
  };

  useEffect(() => {
    setBillingForm(prev => ({
      ...prev,
      billingMonth: `${selectedMonth} ${selectedYear}`
    }));
  }, [selectedMonth, selectedYear]);

  const handleUnitTypeChange = (type: string) => {
    setSelectedUnitType(type);
    const found = unitTypeOptions.find(u => u.type === type);
    if (found) {
      setBillingForm(prev => ({ ...prev, hoaDues: found.amount }));
    }
  };

  const handleOpenEditListing = (listing: any) => {
    setEditingListing(listing);
    setEditListingForm({
      title: listing.title || '',
      price: listing.price ? listing.price.toString() : '',
      category: listing.category || 'Goods',
      description: listing.description || '',
      status: listing.status || 'APPROVED'
    });
  };

  const handleSaveListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingListing || !token) return;
    try {
      const res = await fetch(`/api/listings/${editingListing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(editListingForm)
      });
      if (res.ok) {
        setEditingListing(null);
        fetchContent();
        fetchAuditLogs();
      } else {
        alert('Failed to update listing.');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating listing.');
    }
  };

  const handleUpdateContentStatus = async (type: string, id: number, status: string) => {
    try {
      if (!token) return;
      const res = await fetch(`/api/admin/content/${type}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchContent();
        fetchAuditLogs();
      }
    } catch (err) { console.error(err); }
  };

  const handleResidentSelectForBilling = async (uId: string) => {
    setBillingForm(prev => ({ ...prev, userId: uId }));
    if (!uId) {
      setResidentMeterInfo(null);
      return;
    }
    try {
      if (!token) return;
      const res = await fetch(`/api/admin/resident-meter-info/${uId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const info = await res.json();
        setResidentMeterInfo(info);
        const hType = (info.houseType || 'A').toUpperCase();
        setSelectedUnitType(hType);
        const found = unitTypeOptions.find(u => u.type === hType);
        setBillingForm(prev => ({
          ...prev,
          prevReading: info.suggestedPrevReading || '0.00',
          hoaDues: found ? found.amount : (info.suggestedHoaDues || '240.00')
        }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleConfirmReportInAdmin = async (reportId: number) => {
    try {
      if (!token) return;
      const res = await fetch(`/api/admin/reports/${reportId}/confirm`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isConfirmed: true, status: 'IN_PROGRESS' })
      });
      if (res.ok) {
        fetchContent();
        fetchAuditLogs();
      }
    } catch (e) { console.error(e); }
  };

  // SuperAdmin Clear Data
  const handleClearData = async (target: string) => {
    const confirmMsg = target === 'ALL_TEST_DATA'
      ? 'SUPERADMIN ACTION: Are you sure you want to PURGE ALL TEST DATA across all modules? This action cannot be undone.'
      : `SUPERADMIN ACTION: Clear all data for module [${target}]?`;
    if (!confirm(confirmMsg)) return;

    try {
      if (!token) return;
      const res = await fetch('/api/admin/clear-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ target })
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || `Successfully cleared ${target}`);
        fetchContent();
        fetchAdminBillings();
        fetchAuditLogs();
        fetchSmsLogs();
      } else {
        alert(data.error || 'Failed to clear data');
      }
    } catch (err) {
      console.error(err);
      alert('Error purging data');
    }
  };

  // PMO Billings Actions
  const handleGenerateBillings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!token) return;
      const payload = {
        ...billingForm,
        issuanceType,
        overridePrevReading: useReadingBypass ? billingForm.overridePrevReading : undefined
      };
      const res = await fetch('/api/admin/billings/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert(`${issuanceType === 'HOA' ? 'HOA Monthly Dues' : 'Water Meter'} Statement(s) issued successfully!`);
        fetchAdminBillings();
        fetchAuditLogs();
      }
    } catch (err) { console.error(err); }
  };

  const handleVerifyPayment = async (billingId: number, status: string, verifyItem: 'HOA' | 'WATER' | 'BOTH' = 'BOTH') => {
    const pmoNotes = prompt(`Enter PMO Accounting notes for ${verifyItem} status [${status}]:`, status === 'PAID' ? `Verified ${verifyItem} payment receipt.` : `Payment receipt unreadable for ${verifyItem}.`);
    try {
      if (!token) return;
      const res = await fetch(`/api/admin/billings/${billingId}/verify`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, pmoNotes, verifyItem })
      });
      if (res.ok) {
        fetchAdminBillings();
        fetchAuditLogs();
      }
    } catch (err) { console.error(err); }
  };

  const exportBillingsCSV = () => {
    if (adminBillings.length === 0) return alert('No billing data to export.');
    const headers = ['ID', 'Resident Name', 'Block & Lot', 'Month', 'HOA Dues', 'Water Usage', 'Water Amount', 'Total Dues', 'Status', 'Payment Ref', 'Issued At'];
    const rows = adminBillings.map(b => [
      b.id,
      `"${b.residentName}"`,
      `"${b.residentBlockLot}"`,
      `"${b.billingMonth}"`,
      b.hoaDues,
      b.waterUsage,
      b.waterAmount,
      b.totalAmount,
      b.status,
      `"${b.paymentRef || ''}"`,
      `"${new Date(b.createdAt).toLocaleDateString()}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CasaMiraSouth_PMO_Billings_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Content Actions
  const handleDeleteContent = async (type: string, id: number) => {
    if (!confirm(`Delete this ${type} item?`)) return;
    try {
      if (!token) return;
      await fetch(`/api/admin/content/${type}/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchContent();
      fetchAuditLogs();
    } catch (err) { console.error(err); }
  };

  // Chat Actions
  const handleDeleteChatMessage = async (id: number) => {
    try {
      if (!token) return;
      await fetch(`/api/admin/chat/messages/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      fetchFlaggedMessages();
    } catch (e) { console.error(e); }
  };

  const handleToggleMute = async (userId: number, currentMuted: boolean) => {
    try {
      if (!token) return;
      await fetch(`/api/admin/users/${userId}/mute`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isMuted: !currentMuted })
      });
      fetchFlaggedMessages();
      fetchUsers();
    } catch (e) { console.error(e); }
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!token) return;
      const res = await fetch('/api/admin/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newContact)
      });
      if (res.ok) {
        setNewContact({ name: '', number: '', category: 'Emergency' });
        fetchContacts();
      }
    } catch (e) { console.error(e); }
  };

  // QR Verification Search
  const handleVerifyQR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannerUid) return;
    setScannerLoading(true);
    try {
      const res = await fetch(`/api/resident-pass/verify/${scannerUid.trim()}`);
      setScannerResult(await res.json());
    } catch (e) {
      setScannerResult({ valid: false, message: 'Scan failed or server error' });
    } finally {
      setScannerLoading(false);
    }
  };

  // Utility Rates & Bracket Configurator state
  const [waterTiers, setWaterTiers] = useState<any[]>([
    { id: 1, min: 0, max: 10, isFlatMin: true, minRate: 180, ratePerCuM: 0, label: '0-10 cu.m Minimum' },
    { id: 2, min: 11, max: 20, isFlatMin: false, minRate: 0, ratePerCuM: 22, label: '11-20 cu.m Bracket' },
    { id: 3, min: 21, max: 30, isFlatMin: false, minRate: 0, ratePerCuM: 26, label: '21-30 cu.m Bracket' },
    { id: 4, min: 31, max: 999, isFlatMin: false, minRate: 0, ratePerCuM: 32, label: '31+ cu.m Excess' }
  ]);
  const [phasesList, setPhasesList] = useState<string[]>(['Phase 1', 'Phase 2', 'Phase 3', 'Phase 3A', 'Phase 3B', 'Phase 3A.2']);
  const [newPhaseInput, setNewPhaseInput] = useState('');
  const [editingPhaseIdx, setEditingPhaseIdx] = useState<number | null>(null);
  const [editingPhaseVal, setEditingPhaseVal] = useState('');

  const [hoaDuesTypeA, setHoaDuesTypeA] = useState('240.00');
  const [hoaDuesTypeB, setHoaDuesTypeB] = useState('320.00');
  const [hoaDuesTypeC, setHoaDuesTypeC] = useState('480.00');
  const [gcashNumber, setGcashNumber] = useState('0917-123-4567');
  const [bdoAccount, setBdoAccount] = useState('0012-3456-7890');
  const [accountName, setAccountName] = useState('Casa Mira South HOA');

  // Incident Reports filter
  const [reportFilter, setReportFilter] = useState('ALL');
  const [reportSearch, setReportSearch] = useState('');

  useEffect(() => {
    fetchUtilitySettings();
  }, []);

  const fetchUtilitySettings = async () => {
    try {
      const res = await fetch('/api/utility-settings');
      if (res.ok) {
        const data = await res.json();
        if (data.waterTiers) {
          try {
            setWaterTiers(typeof data.waterTiers === 'string' ? JSON.parse(data.waterTiers) : data.waterTiers);
          } catch (e) {}
        }
        if (data.phases) {
          try {
            const parsedPh = typeof data.phases === 'string' ? JSON.parse(data.phases) : data.phases;
            if (Array.isArray(parsedPh) && parsedPh.length > 0) {
              setPhasesList(parsedPh);
            }
          } catch (e) {}
        }
        if (data.hoaDuesTypeA) setHoaDuesTypeA(data.hoaDuesTypeA);
        if (data.hoaDuesTypeB) setHoaDuesTypeB(data.hoaDuesTypeB);
        if (data.hoaDuesTypeC) setHoaDuesTypeC(data.hoaDuesTypeC);
        if (data.gcashNumber) setGcashNumber(data.gcashNumber);
        if (data.bdoAccount) setBdoAccount(data.bdoAccount);
        if (data.accountName) setAccountName(data.accountName);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddPhase = () => {
    const trimmed = newPhaseInput.trim();
    if (!trimmed) return;
    if (phasesList.map(p => p.toLowerCase()).includes(trimmed.toLowerCase())) {
      alert('This Phase option already exists.');
      return;
    }
    setPhasesList([...phasesList, trimmed]);
    setNewPhaseInput('');
  };

  const handleStartEditPhase = (index: number) => {
    setEditingPhaseIdx(index);
    setEditingPhaseVal(phasesList[index]);
  };

  const handleSaveEditPhase = (index: number) => {
    const trimmed = editingPhaseVal.trim();
    if (!trimmed) return;
    const copy = [...phasesList];
    copy[index] = trimmed;
    setPhasesList(copy);
    setEditingPhaseIdx(null);
    setEditingPhaseVal('');
  };

  const handleDeletePhase = (index: number) => {
    if (phasesList.length <= 1) {
      alert('At least one Phase option must remain.');
      return;
    }
    const target = phasesList[index];
    if (confirm(`Remove "${target}" from available Phase options?`)) {
      setPhasesList(phasesList.filter((_, i) => i !== index));
    }
  };

  const handleSaveUtilitySettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      if (!token) return;
      const res = await fetch('/api/admin/utility-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          waterTiers: JSON.stringify(waterTiers),
          phases: JSON.stringify(phasesList),
          hoaDuesTypeA,
          hoaDuesTypeB,
          hoaDuesTypeC,
          gcashNumber,
          bdoAccount,
          accountName
        })
      });
      if (res.ok) {
        alert('Phase options, water bracket tiers, and HOA dues rates updated successfully!');
        fetchUtilitySettings();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateHouseType = async (userId: number, houseType: string) => {
    try {
      if (!token) return;
      const res = await fetch(`/api/admin/users/${userId}/house-type`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ houseType })
      });
      if (res.ok) {
        fetchUsers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateReportStatus = async (reportId: number, status: string) => {
    try {
      if (!token) return;
      const res = await fetch(`/api/admin/reports/${reportId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchContent();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteReport = async (reportId: number) => {
    if (!confirm('Are you sure you want to permanently delete this incident report?')) return;
    try {
      if (!token) return;
      const res = await fetch(`/api/admin/reports/${reportId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchContent();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const userRole = profile?.role || 'RESIDENT';

  const rawAdminModules = [
    { 
      id: 'residents', 
      label: 'Resident Directory & Access', 
      icon: Users, 
      badge: users?.filter((u: any) => u.approvalStatus === 'PENDING').length || 0, 
      desc: 'Manage HO approvals, accounts, roles & short PIN logins',
      subTabs: [
        { id: 'residents', label: '📋 Resident Directory & Roles' },
        { id: 'credentials', label: '🔑 Login Credentials & Short PINs' }
      ]
    },
    { 
      id: 'billings', 
      label: 'Billings & Utility Rates', 
      icon: CreditCard, 
      badge: adminBillings?.filter((b: any) => b.paymentStatus === 'PENDING_VERIFICATION' || b.paymentStatus === 'SUBMITTED' || b.hoaStatus === 'PENDING_VERIFICATION' || b.waterStatus === 'PENDING_VERIFICATION').length || 0, 
      desc: 'Verify SOA payments, receipts & PMO water rates',
      subTabs: [
        { id: 'billings', label: '📑 Statements & Receipts Queue' },
        { id: 'pmo-settings', label: '⚙️ PMO Rates & Settings' }
      ]
    },
    { 
      id: 'operations', 
      label: 'Gate & Operations', 
      icon: ShieldAlert, 
      badge: (content.reports?.filter((r: any) => r.status === 'PENDING').length || 0) + (adminPets?.filter((p: any) => p.status === 'PENDING').length || 0), 
      desc: 'Incidents, Gate QR scanner, Pet registrations & SMS logs',
      subTabs: [
        { id: 'reports', label: '⚠️ Incident & Hazard Reports' },
        { id: 'scanner', label: '📲 Gate QR Pass Scanner' },
        { id: 'pets', label: '🐾 Pet Registrations & Tags' },
        { id: 'sms', label: '💬 Emergency SMS Broadcasts' }
      ]
    },
    { 
      id: 'content', 
      label: 'Content & Security Logs', 
      icon: Megaphone, 
      badge: ((content.listings?.filter((l: any) => l.status === 'PENDING').length || 0) + (content.memoryVault?.filter((m: any) => m.status === 'PENDING').length || 0)), 
      desc: 'Moderate announcements, events, posts & audit security logs',
      subTabs: [
        { id: 'content', label: '📣 Community Moderation' },
        { id: 'audit', label: '📜 System Security & Audit Logs' }
      ]
    },
  ];

  const adminModules = rawAdminModules.filter(mod => {
    if (userRole === 'SUPERADMIN' || userRole === 'ADMIN') return true;
    if (userRole === 'PMO') {
      return ['residents', 'billings', 'operations'].includes(mod.id);
    }
    if (userRole === 'HOA-BOD') {
      return ['residents', 'operations', 'content'].includes(mod.id);
    }
    return true;
  });

  const activeModule = adminModules.find(m => m.subTabs.some(st => st.id === activeTab)) || adminModules[0];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Admin Title Banner */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl border border-teal-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-teal-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Shield className="w-4 h-4" /> HOA Board & PMO Management Suite
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">Admin Operations Center</h1>
          <p className="text-xs text-slate-400 mt-1">Logged in as {profile?.name} ({profile?.role})</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRunAutofix}
            disabled={autofixLoading}
            className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black shadow-md border border-emerald-400/30 transition-all active:scale-95 disabled:opacity-50"
            title="Auto-repair database tables, missing columns, and system data"
          >
            <Wrench className={`w-4 h-4 ${autofixLoading ? 'animate-spin' : ''}`} />
            <span>{autofixLoading ? 'Fixing System...' : '🛠️ Run System Auto-Fix'}</span>
          </button>

          {isSuperadmin && (
            <span className="px-3 py-1 bg-amber-500 text-slate-950 font-black text-xs rounded-full uppercase tracking-wider shadow-md">
              ★ SUPERADMIN
            </span>
          )}
        </div>
      </div>

      {/* Auto-Fix Results Banner */}
      {autofixResult && (
        <div className={`p-4 rounded-2xl border text-xs ${
          autofixResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
        }`}>
          <div className="flex items-center justify-between font-bold text-sm mb-1">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>{autofixResult.message || 'Auto-Fix Process Completed'}</span>
            </div>
            <button onClick={() => setAutofixResult(null)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          {autofixResult.logs && autofixResult.logs.length > 0 && (
            <div className="mt-2 space-y-1 bg-white/70 p-3 rounded-xl border border-emerald-100 font-mono text-[11px] max-h-32 overflow-y-auto">
              {autofixResult.logs.map((log: string, idx: number) => (
                <div key={idx} className="flex items-center gap-1 text-slate-700">
                  <span className="text-teal-600">✓</span> {log}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SuperAdmin Clear Data Controls (Placed directly below Banner) */}
      {profile?.role === 'SUPERADMIN' && (
        <div className="bg-slate-900 text-white rounded-2xl border border-rose-500/30 overflow-hidden shadow-md transition-all">
          <button
            type="button"
            onClick={() => setIsSuperadminPanelOpen(!isSuperadminPanelOpen)}
            className="w-full p-4 flex items-center justify-between hover:bg-slate-800/80 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-0.5 bg-rose-500 text-white text-[10px] font-black uppercase tracking-wider rounded-md">
                SuperAdmin Control Center
              </span>
              <span className="text-xs text-rose-300 font-bold hidden sm:inline">Data Purge & System Wipes</span>
              <span className="text-[11px] text-slate-400 font-medium">
                ({isSuperadminPanelOpen ? 'Expanded - Danger Zone Active' : 'Collapsed by default'})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-slate-300 flex items-center gap-1 bg-rose-950/60 border border-rose-500/30 px-2.5 py-1 rounded-lg">
                <Lock className="w-3.5 h-3.5 text-rose-400" />
                {isSuperadminPanelOpen ? 'Lock Panel' : 'Unlock Purge Controls'}
              </span>
              {isSuperadminPanelOpen ? <ChevronUp className="w-4 h-4 text-rose-300" /> : <ChevronDown className="w-4 h-4 text-rose-300" />}
            </div>
          </button>

          {isSuperadminPanelOpen && (
            <div className="p-5 border-t border-rose-500/20 bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 space-y-3 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div>
                  <p className="text-xs text-rose-200 font-bold flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-rose-400" /> Warning: Data Purge Operations
                  </p>
                  <p className="text-xs text-slate-300 mt-1 font-medium">
                    Reset system test data module by module or perform a complete data wipe for clean demo testing.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleClearData('ALL_TEST_DATA')}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5 border border-rose-400 shrink-0"
                >
                  <Trash2 className="w-4 h-4" /> PURGE ALL DEMO DATA
                </button>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <span className="text-[11px] font-bold text-slate-400 self-center mr-1">Individual Module Purge:</span>
                <button type="button" onClick={() => handleClearData('billings')} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/10 transition-all flex items-center gap-1">
                  <Trash2 className="w-3 h-3 text-rose-400" /> Statements
                </button>
                <button type="button" onClick={() => handleClearData('reports')} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/10 transition-all flex items-center gap-1">
                  <Trash2 className="w-3 h-3 text-rose-400" /> Reports
                </button>
                <button type="button" onClick={() => handleClearData('announcements')} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/10 transition-all flex items-center gap-1">
                  <Trash2 className="w-3 h-3 text-rose-400" /> Announcements
                </button>
                <button type="button" onClick={() => handleClearData('events')} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/10 transition-all flex items-center gap-1">
                  <Trash2 className="w-3 h-3 text-rose-400" /> Events
                </button>
                <button type="button" onClick={() => handleClearData('marketplace')} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/10 transition-all flex items-center gap-1">
                  <Trash2 className="w-3 h-3 text-rose-400" /> Marketplace
                </button>
                <button type="button" onClick={() => handleClearData('businesses')} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/10 transition-all flex items-center gap-1">
                  <Trash2 className="w-3 h-3 text-rose-400" /> Directory
                </button>
                <button type="button" onClick={() => handleClearData('pets')} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/10 transition-all flex items-center gap-1">
                  <Trash2 className="w-3 h-3 text-rose-400" /> Pets
                </button>
                <button type="button" onClick={() => handleClearData('audit_logs')} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/10 transition-all flex items-center gap-1">
                  <Trash2 className="w-3 h-3 text-rose-400" /> Audit Logs
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Consolidated Admin Navigation Suite */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-sm space-y-4">
        {/* Module Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-slate-900 text-teal-400 rounded-xl">
              {React.createElement(activeModule.icon, { className: 'w-4 h-4' })}
            </span>
            <div>
              <h2 className="font-extrabold text-slate-900 text-sm">{activeModule.label}</h2>
              <p className="text-[11px] text-slate-500">{activeModule.desc}</p>
            </div>
          </div>

          <button
            onClick={() => setIsSandwichOpen(!isSandwichOpen)}
            className="self-start sm:self-auto flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
          >
            <Menu className="w-3.5 h-3.5 text-teal-600" />
            <span>{isSandwichOpen ? 'Hide All Modules' : 'Overview Drawer'}</span>
          </button>
        </div>

        {/* 4 Primary Module Buttons */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {adminModules.map(mod => {
            const Icon = mod.icon;
            const isModActive = mod.id === activeModule.id;
            const hasAction = (mod.badge || 0) > 0;

            return (
              <button
                key={mod.id}
                onClick={() => setActiveTab(mod.subTabs[0].id)}
                className={`p-3.5 rounded-2xl text-left transition-all relative flex flex-col justify-between border ${
                  isModActive
                    ? 'bg-slate-900 text-white border-slate-950 shadow-md ring-2 ring-teal-400'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className={`p-2 rounded-xl ${isModActive ? 'bg-teal-500/20 text-teal-300' : 'bg-white text-teal-700 border border-slate-200'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  {hasAction && (
                    <span className="px-2 py-0.5 bg-rose-500 text-white text-[10px] font-black rounded-full shadow-sm flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      {mod.badge}
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-xs font-black tracking-tight">{mod.label}</p>
                  <p className={`text-[10px] truncate ${isModActive ? 'text-slate-400' : 'text-slate-500'}`}>
                    {mod.subTabs.length} Sub-modules
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Sub-Tab Navigation Bar for Active Module */}
        <div className="pt-2 border-t border-slate-100 flex items-center gap-2 overflow-x-auto">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
            Section:
          </span>
          {activeModule.subTabs.map(subTab => {
            const isSubActive = activeTab === subTab.id;
            return (
              <button
                key={subTab.id}
                onClick={() => setActiveTab(subTab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                  isSubActive
                    ? 'bg-teal-600 text-white shadow-sm font-extrabold'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/60'
                }`}
              >
                <span>{subTab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Sandwich Drawer Expansion */}
        {isSandwichOpen && (
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 animate-in fade-in zoom-in-95 duration-200">
            {adminModules.map(mod => {
              const Icon = mod.icon;
              const isModActive = mod.id === activeModule.id;
              return (
                <div key={`drawer-${mod.id}`} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-teal-600" />
                    <span className="text-xs font-black text-slate-900">{mod.label}</span>
                  </div>
                  <div className="space-y-1">
                    {mod.subTabs.map(st => (
                      <button
                        key={st.id}
                        onClick={() => {
                          setActiveTab(st.id);
                          setIsSandwichOpen(false);
                        }}
                        className={`w-full text-left p-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                          activeTab === st.id
                            ? 'bg-teal-600 text-white font-extrabold'
                            : 'hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        <span>{st.label}</span>
                        <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* TAB 1: RESIDENTS & ROLE MANAGEMENT */}
      {activeTab === 'residents' && (() => {
        const safeUsers = (Array.isArray(users) ? users : []).filter(u => {
          if (showLeadersOnly && !u.isHouseholdLeader) return false;
          if (!residentSearchQuery.trim()) return true;
          const q = residentSearchQuery.toLowerCase();
          return (u.name || '').toLowerCase().includes(q) ||
                 (u.email || '').toLowerCase().includes(q) ||
                 (u.blockLot || '').toLowerCase().includes(q) ||
                 (u.phase || '').toLowerCase().includes(q) ||
                 (u.role || '').toLowerCase().includes(q) ||
                 (u.phoneNumber || '').toLowerCase().includes(q);
        });
        const totalUsers = safeUsers.length;
        const totalUserPages = Math.ceil(totalUsers / usersPerPage) || 1;
        const userStartIndex = (usersCurrentPage - 1) * usersPerPage;
        const paginatedUsers = safeUsers.slice(userStartIndex, userStartIndex + usersPerPage);

        return (
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm space-y-4">
            {/* Household Leader Banner Notice */}
            <div className="p-4 mx-6 mt-6 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-950">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 font-black flex items-center justify-center shrink-0 text-base shadow-sm">
                  ⭐
                </div>
                <div>
                  <p className="font-extrabold text-slate-900 text-sm">
                    Household Main Account Holder Assignment
                  </p>
                  <p className="text-slate-600 mt-0.5 font-medium leading-relaxed">
                    To assign or declare a resident as the <strong>Main Account Holder ⭐</strong> for their address, click the <strong className="text-amber-900">"Set Leader"</strong> / <strong className="text-amber-900">"⭐ Leader"</strong> button in their row below. Household Leaders can view household SOAs, manage occupants, and remove/freeze unauthorized account claims.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowLeadersOnly(!showLeadersOnly);
                  setUsersCurrentPage(1);
                }}
                className={`px-3.5 py-2 rounded-xl font-extrabold text-xs shrink-0 border transition-all flex items-center gap-1.5 shadow-sm ${
                  showLeadersOnly
                    ? 'bg-amber-600 text-white border-amber-700'
                    : 'bg-white text-amber-900 border-amber-300 hover:bg-amber-100'
                }`}
              >
                <span>⭐</span>
                <span>{showLeadersOnly ? 'Show All Residents' : 'Show Leaders Only'}</span>
              </button>
            </div>

            <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Resident Approvals & Role Permissions</h3>
                <p className="text-xs text-slate-500">Assign roles (Superadmin, Admin, Event Organizer, Resident, Service Provider) & Household Leaders.</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search name, email, block/lot..."
                    value={residentSearchQuery}
                    onChange={e => {
                      setResidentSearchQuery(e.target.value);
                      setUsersCurrentPage(1);
                    }}
                    className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-500 w-48 sm:w-64"
                  />
                </div>
                <button
                  onClick={fetchUsers}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all"
                  title="Reload Residents"
                >
                  <span>🔄 Refresh</span>
                </button>
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl">{totalUsers} Found</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                  <tr>
                    <th className="p-4">Resident</th>
                    <th className="p-4">Block & Lot</th>
                    <th className="p-4">Unit Type (Dues)</th>
                    <th className="p-4">Earned Badges</th>
                    <th className="p-4">Approval Status</th>
                    <th className="p-4">Role Assignment</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedUsers.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50/60">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center overflow-hidden shrink-0">
                            {u.profileImage ? <img src={u.profileImage} alt="" className="w-full h-full object-cover" /> : u.name?.[0]}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-bold text-slate-900">{u.name}</p>
                              {u.isHouseholdLeader && (
                                <span className="px-1.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded text-[9px] font-black flex items-center gap-0.5" title="Declared Household Main Account Holder">
                                  ⭐ Leader
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-semibold text-slate-700">{u.blockLot || 'Casa Mira South'}</td>
                      <td className="p-4">
                        <select
                          value={u.houseType || 'A'}
                          onChange={(e) => handleUpdateHouseType(u.id, e.target.value)}
                          className="p-1.5 rounded-xl border border-slate-200 text-xs font-black text-teal-800 bg-teal-50/60 focus:outline-none focus:ring-2 focus:ring-teal-500"
                          title="Assigned Unit Type defines default monthly HOA dues"
                        >
                          <option value="A">Type A (₱240 Dues)</option>
                          <option value="B">Type B (₱320 Dues)</option>
                          <option value="C">Type C (₱480 Dues)</option>
                        </select>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <BadgeList badges={u.badges} size="sm" limit={2} />
                          <button
                            onClick={() => setEditingBadgesUser(u)}
                            className="px-2 py-0.5 hover:bg-amber-100 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-[10px] font-extrabold flex items-center gap-1 transition-all"
                            title="Award or Revoke Badges"
                          >
                            <Award className="w-3 h-3 text-amber-600" />
                            <span>Badges</span>
                          </button>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            u.approvalStatus === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {u.approvalStatus}
                          </span>
                          {u.isDelinquent && (
                            <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-rose-600 text-white shadow-sm" title={u.delinquentReason || 'Unsettled Dues'}>
                              ⚠️ DELINQUENT
                            </span>
                          )}
                          {u.isFrozen && (
                            <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-slate-800 text-rose-300 shadow-sm" title="Inactive >2 Yrs - Frozen">
                              ❄️ FROZEN
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <select
                          value={u.role}
                          disabled={u.role === 'SUPERADMIN' && profile?.role !== 'SUPERADMIN'}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          className="p-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-60 disabled:bg-slate-200"
                        >
                          <option value="RESIDENT">RESIDENT</option>
                          <option value="EVENT_ORGANIZER">EVENT_ORGANIZER</option>
                          <option value="SERVICE_PROVIDER">SERVICE_PROVIDER</option>
                          <option value="PMO">PMO STAFF</option>
                          <option value="HOA-BOD">HOA-BOD MEMBER</option>
                          <option value="ADMIN">ADMIN</option>
                          {profile?.role === 'SUPERADMIN' && (
                            <option value="SUPERADMIN">★ SUPERADMIN</option>
                          )}
                        </select>
                      </td>
                      <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                        {u.approvalStatus === 'PENDING' ? (
                          <button onClick={() => handleApproveUser(u.id, 'APPROVED')} className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg font-bold text-[10px]">
                            Approve
                          </button>
                        ) : (
                          <button onClick={() => handleApproveUser(u.id, 'PENDING')} className="px-2.5 py-1 bg-slate-200 text-slate-700 rounded-lg font-bold text-[10px]">
                            Revoke
                          </button>
                        )}

                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch(`/api/admin/users/${u.id}/set-household-leader`, {
                                method: 'PATCH',
                                headers: { Authorization: `Bearer ${token}` }
                              });
                              if (res.ok) {
                                fetchUsers();
                              }
                            } catch (e) {
                              console.error(e);
                            }
                          }}
                          className={`px-2 py-1 rounded-lg font-bold text-[10px] border transition-all ${
                            u.isHouseholdLeader
                              ? 'bg-amber-100 text-amber-950 border-amber-300 font-extrabold'
                              : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-amber-50 hover:text-amber-800'
                          }`}
                          title="PMO Declare/Unset Main Account Holder for this household"
                        >
                          {u.isHouseholdLeader ? '⭐ Leader' : 'Set Leader'}
                        </button>

                        <button
                          onClick={() => handleToggleDelinquent(u.id, u.isDelinquent)}
                          className={`px-2 py-1 rounded-lg font-bold text-[10px] border transition-all ${
                            u.isDelinquent
                              ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                              : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                          }`}
                          title="Toggle Delinquent status (deactivates gate pass & amenities)"
                        >
                          {u.isDelinquent ? 'Clear Delinquent' : 'Flag Delinquent'}
                        </button>

                        {(u.isFrozen || u.isDelinquent) && (
                          <button
                            onClick={() => handleReactivateAccount(u.id)}
                            className="px-2 py-1 bg-teal-600 text-white rounded-lg font-bold text-[10px] hover:bg-teal-700"
                            title="Reactivate/Unfreeze Account"
                          >
                            Unfreeze
                          </button>
                        )}

                        {!(u.role === 'SUPERADMIN' && profile?.role !== 'SUPERADMIN') && (
                          <button
                            onClick={() => handleDeleteUser(u.id, u.name)}
                            className="px-2 py-1 text-red-600 hover:bg-red-50 bg-red-50/50 border border-red-200 rounded-lg font-bold text-[10px] inline-flex items-center gap-1 transition-all"
                            title="Permanently Delete Resident Account"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination controls for Users */}
            {totalUsers > 0 && (
              <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-700">
                <div className="flex items-center gap-3">
                  <span className="text-slate-500">
                    Showing <span className="font-extrabold text-slate-900">{userStartIndex + 1}</span> to <span className="font-extrabold text-slate-900">{Math.min(userStartIndex + usersPerPage, totalUsers)}</span> of <span className="font-extrabold text-slate-900">{totalUsers}</span> accounts
                  </span>

                  <div className="flex items-center gap-1.5 ml-2">
                    <span className="text-slate-400">Max per page:</span>
                    <select
                      value={usersPerPage}
                      onChange={(e) => {
                        setUsersPerPage(Number(e.target.value));
                        setUsersCurrentPage(1);
                      }}
                      className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value={10}>10 per page</option>
                      <option value={25}>25 per page</option>
                      <option value={50}>50 per page</option>
                      <option value={100}>100 per page (Max)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={usersCurrentPage === 1}
                    onClick={() => setUsersCurrentPage(p => Math.max(1, p - 1))}
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-700 rounded-lg font-bold transition-all"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1.5 bg-teal-50 text-teal-800 border border-teal-200 rounded-lg font-extrabold">
                    Page {usersCurrentPage} of {totalUserPages}
                  </span>
                  <button
                    disabled={usersCurrentPage >= totalUserPages}
                    onClick={() => setUsersCurrentPage(p => Math.min(totalUserPages, p + 1))}
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-700 rounded-lg font-bold transition-all"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* TAB: HOMEOWNER CREDENTIALS & ACCESS PINS */}
      {activeTab === 'credentials' && (
        <div className="space-y-6">
          {/* Register New Homeowner Card */}
          <form onSubmit={handleRegisterHomeowner} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Plus className="w-5 h-5 text-teal-600" /> Register New Homeowner & Auto-Generate Access Pass
                </h3>
                <p className="text-xs text-slate-500">Generates default username format (e.g. P3A2B15L21) and short 6-8 char Access Pass PIN.</p>
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
              >
                <Key className="w-4 h-4" /> Issue Homeowner Pass
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Resident Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maria Clara Santos"
                  value={newHomeownerForm.name}
                  onChange={e => setNewHomeownerForm({ ...newHomeownerForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Phase Assignment</label>
                <select
                  value={newHomeownerForm.phase}
                  onChange={e => setNewHomeownerForm({ ...newHomeownerForm, phase: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none font-bold"
                >
                  <option value="Phase 1">Phase 1</option>
                  <option value="Phase 2">Phase 2</option>
                  <option value="Phase 3">Phase 3</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Block No.</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 15"
                    value={newHomeownerForm.blockNo}
                    onChange={e => setNewHomeownerForm({ ...newHomeownerForm, blockNo: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Lot No.</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 21"
                    value={newHomeownerForm.lotNo}
                    onChange={e => setNewHomeownerForm({ ...newHomeownerForm, lotNo: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address (Optional)</label>
                <input
                  type="email"
                  placeholder="homeowner@gmail.com"
                  value={newHomeownerForm.email}
                  onChange={e => setNewHomeownerForm({ ...newHomeownerForm, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="+63 918 234 5678"
                  value={newHomeownerForm.phoneNumber}
                  onChange={e => setNewHomeownerForm({ ...newHomeownerForm, phoneNumber: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-teal-800 text-[11px] font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-600 shrink-0" />
                Preview Username: P{newHomeownerForm.phase.replace(/[^0-9]/g, '')}B{newHomeownerForm.blockNo}L{newHomeownerForm.lotNo}
              </div>
            </div>
          </form>

          {/* Directory Table of Homeowner Pass Credentials */}
          {(() => {
            const safeHomeowners = Array.isArray(homeowners) ? homeowners : [];
            const totalHomeowners = safeHomeowners.length;
            const totalHomeownerPages = Math.ceil(totalHomeowners / homeownersPerPage) || 1;
            const hoStartIndex = (homeownersCurrentPage - 1) * homeownersPerPage;
            const paginatedHomeowners = safeHomeowners.slice(hoStartIndex, hoStartIndex + homeownersPerPage);

            return (
              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm space-y-4">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">PMO Homeowner Credential Pull & Pass Directory</h3>
                    <p className="text-xs text-slate-500">Pull individual resident logins, reveal access PINs, or print digital gate cards.</p>
                  </div>
                  <span className="text-xs font-bold text-teal-700 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
                    {totalHomeowners} Homeowners Enrolled
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                      <tr>
                        <th className="p-4">Homeowner Name</th>
                        <th className="p-4">Phase / Sector</th>
                        <th className="p-4">Block & Lot Location</th>
                        <th className="p-4">Default Username</th>
                        <th className="p-4">Access Pass PIN</th>
                        <th className="p-4">Connected Email</th>
                        <th className="p-4 text-right">PMO Credential Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedHomeowners.map(ho => (
                        <tr key={ho.id} className="hover:bg-slate-50/60">
                          <td className="p-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-800 font-bold flex items-center justify-center overflow-hidden">
                                {ho.profileImage ? <img src={ho.profileImage} alt="" className="w-full h-full object-cover" /> : ho.name?.[0]}
                              </div>
                              <div>
                                <p className="font-extrabold text-slate-900">{ho.name}</p>
                                <p className="text-[10px] text-slate-400 font-mono">{ho.phoneNumber || 'No phone'}</p>
                              </div>
                            </div>
                          </td>

                          <td className="p-4 font-bold text-teal-700">{ho.phase || 'Phase 1'}</td>

                          <td className="p-4 font-medium text-slate-700">{ho.blockLot || 'Casa Mira South'}</td>

                          <td className="p-4">
                            <span className="px-2.5 py-1 bg-slate-900 text-amber-300 font-mono font-bold rounded-lg text-xs">
                              {ho.username || ho.blockLot || 'P3A2B15L21'}
                            </span>
                          </td>

                          <td className="p-4">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-extrabold text-slate-900 text-xs">
                                {revealedPins[ho.id] ? (ho.tempAccessPin || ho.password || 'CM9900') : '••••••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() => togglePinReveal(ho.id)}
                                className="p-1 text-slate-400 hover:text-slate-700 rounded-md"
                                title={revealedPins[ho.id] ? "Hide PIN" : "Reveal PIN"}
                              >
                                {revealedPins[ho.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </td>

                          <td className="p-4 text-slate-600 font-medium">
                            {ho.email ? (
                              <span className="text-emerald-700 font-bold flex items-center gap-1">
                                <Check className="w-3 h-3 text-emerald-600" /> {ho.email}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Not connected</span>
                            )}
                          </td>

                          <td className="p-4 text-right space-x-2">
                            <button
                              onClick={() => handleRegeneratePin(ho.id)}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-[10px] transition-all"
                            >
                              Reset PIN
                            </button>
                            <button
                              onClick={() => {
                                const printWindow = window.open('', '_blank');
                                if (printWindow) {
                                  printWindow.document.write(`
                                    <html>
                                      <head>
                                        <title>CASA MIRA SOUTH - HOMEOWNER PASS CARD</title>
                                        <style>
                                          body { font-family: sans-serif; padding: 40px; text-align: center; background: #0f172a; color: #fff; }
                                          .card { border: 3px solid #14b8a6; padding: 30px; border-radius: 20px; max-width: 400px; margin: 0 auto; background: #1e293b; }
                                          .title { color: #14b8a6; font-size: 20px; font-weight: 900; margin-bottom: 5px; }
                                          .subtitle { color: #94a3b8; font-size: 12px; margin-bottom: 20px; }
                                          .field { font-size: 12px; color: #94a3b8; margin-top: 10px; }
                                          .val { font-size: 18px; font-weight: 900; color: #facc15; font-family: monospace; }
                                        </style>
                                      </head>
                                      <body>
                                        <div className="card">
                                          <div className="title">CASA MIRA SOUTH</div>
                                          <div className="subtitle">RESIDENT PROOF OF RESIDENCY GATE PASS</div>
                                          <hr style="border-color: #334155; margin: 20px 0;"/>
                                          <div className="field">NAME</div>
                                          <div className="val" style="color:#fff;">${ho.name}</div>
                                          <div className="field">PHASE & LOCATION</div>
                                          <div className="val" style="color:#2dd4bf;">${ho.phase || 'Phase 1'} • ${ho.blockLot}</div>
                                          <div className="field">DEFAULT USERNAME</div>
                                          <div className="val">${ho.username || 'P3A2B15L21'}</div>
                                          <div className="field">ACCESS PASS PIN</div>
                                          <div className="val" style="color:#38bdf8;">${ho.tempAccessPin || 'CM9900'}</div>
                                        </div>
                                        <script>window.print();</script>
                                      </body>
                                    </html>
                                  `);
                                  printWindow.document.close();
                                }
                              }}
                              className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white font-extrabold rounded-xl text-[10px] shadow-sm transition-all"
                            >
                              <Printer className="w-3 h-3 inline mr-1" /> Pull Pass Card
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls for Homeowners */}
                {totalHomeowners > 0 && (
                  <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-700">
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500">
                        Showing <span className="font-extrabold text-slate-900">{hoStartIndex + 1}</span> to <span className="font-extrabold text-slate-900">{Math.min(hoStartIndex + homeownersPerPage, totalHomeowners)}</span> of <span className="font-extrabold text-slate-900">{totalHomeowners}</span> homeowners
                      </span>

                      <div className="flex items-center gap-1.5 ml-2">
                        <span className="text-slate-400">Max per page:</span>
                        <select
                          value={homeownersPerPage}
                          onChange={(e) => {
                            setHomeownersPerPage(Number(e.target.value));
                            setHomeownersCurrentPage(1);
                          }}
                          className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-teal-500"
                        >
                          <option value={10}>10 per page</option>
                          <option value={25}>25 per page</option>
                          <option value={50}>50 per page</option>
                          <option value={100}>100 per page (Max)</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        disabled={homeownersCurrentPage === 1}
                        onClick={() => setHomeownersCurrentPage(p => Math.max(1, p - 1))}
                        className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-700 rounded-lg font-bold transition-all"
                      >
                        Previous
                      </button>
                      <span className="px-3 py-1.5 bg-teal-50 text-teal-800 border border-teal-200 rounded-lg font-extrabold">
                        Page {homeownersCurrentPage} of {totalHomeownerPages}
                      </span>
                      <button
                        disabled={homeownersCurrentPage >= totalHomeownerPages}
                        onClick={() => setHomeownersCurrentPage(p => Math.min(totalHomeownerPages, p + 1))}
                        className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-700 rounded-lg font-bold transition-all"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* TAB: PET REGISTRATION & TAG MANAGEMENT */}
      {activeTab === 'pets' && (() => {
        const filtered = adminPets.filter(p => {
          if (!petSearchQuery.trim()) return true;
          const q = petSearchQuery.toLowerCase();
          return (p.petName || '').toLowerCase().includes(q) ||
                 (p.ownerName || '').toLowerCase().includes(q) ||
                 (p.species || '').toLowerCase().includes(q) ||
                 (p.breed || '').toLowerCase().includes(q) ||
                 (p.tagNumber || '').toLowerCase().includes(q) ||
                 (p.blockLot || '').toLowerCase().includes(q);
        });

        const vaccinatedCount = adminPets.filter(p => p.rabiesVaccinated).length;

        const handleToggleVaccine = async (petId: number, current: boolean) => {
          try {
            if (!token) return;
            const res = await fetch(`/api/admin/pets/${petId}/status`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ rabiesVaccinated: !current })
            });
            if (res.ok) fetchAdminPets();
          } catch (e) { console.error(e); }
        };

        return (
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm space-y-4">
            <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-orange-600 text-xs font-bold uppercase tracking-wider mb-1">
                  <Sparkles className="w-4 h-4" /> HOA Pet Registry & Rabies Control
                </div>
                <h3 className="font-extrabold text-slate-900 text-lg">Community Pet Records & Tag IDs</h3>
                <p className="text-xs text-slate-500">Monitor pet vaccination compliance and issue subdivision tag passports.</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1.5 bg-orange-50 text-orange-800 font-extrabold text-xs rounded-xl border border-orange-200">
                  🐾 {adminPets.length} Registered
                </span>
                <span className="px-3 py-1.5 bg-emerald-50 text-emerald-800 font-extrabold text-xs rounded-xl border border-emerald-200">
                  🛡️ {vaccinatedCount} Rabies Vaccinated
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter by pet name, tag, owner, or block/lot..."
                  value={petSearchQuery}
                  onChange={e => setPetSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <button
                onClick={fetchAdminPets}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs border border-slate-200 shadow-sm flex items-center gap-1.5 transition-all"
              >
                <span>🔄 Refresh Pet Registry</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                  <tr>
                    <th className="p-4">Pet Details</th>
                    <th className="p-4">Owner & Phase</th>
                    <th className="p-4">HOA Digital Tag ID</th>
                    <th className="p-4">Rabies Vaccination</th>
                    <th className="p-4 text-right">Admin Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400 text-xs">
                        No pet records found in registry.
                      </td>
                    </tr>
                  ) : (
                    filtered.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/60 transition-all">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-800 font-black text-lg flex items-center justify-center overflow-hidden border border-orange-200 shrink-0">
                              {p.photo ? <img src={p.photo} alt="" className="w-full h-full object-cover" /> : (p.species === 'Dog' ? '🐶' : '🐱')}
                            </div>
                            <div>
                              <p className="font-extrabold text-slate-900 text-sm">{p.petName}</p>
                              <p className="text-[10px] text-slate-500 font-semibold">{p.species} • {p.breed || 'Mixed'} ({p.color || 'N/A'})</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <p className="font-extrabold text-slate-900">{p.ownerName || 'Resident'}</p>
                          <p className="text-[10px] text-teal-700 font-bold">{p.phase || 'Phase 1'} • {p.blockLot}</p>
                        </td>
                        <td className="p-4 font-mono font-extrabold text-teal-800 text-xs">
                          {p.tagNumber || `CMS-PET-${p.id}`}
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => handleToggleVaccine(p.id, p.rabiesVaccinated)}
                            className={`px-3 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1.5 transition-all ${
                              p.rabiesVaccinated
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300'
                                : 'bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300'
                            }`}
                            title="Click to toggle vaccination status"
                          >
                            <ShieldCheck className="w-3 h-3" />
                            {p.rabiesVaccinated ? 'VACCINATED' : 'NOT VACCINATED'}
                          </button>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={async () => {
                              if (!confirm(`Delete pet record for "${p.petName}"?`)) return;
                              await fetch(`/api/pets/${p.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
                              fetchAdminPets();
                            }}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[10px] rounded-lg transition-all"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* TAB: INCIDENT & HAZARD REPORTS */}
      {activeTab === 'reports' && (() => {
        const rawReports = content.reports || [];
        const filtered = rawReports.filter((r: any) => {
          const q = reportSearch.toLowerCase();
          const matchesQuery = (r.category || '').toLowerCase().includes(q) ||
                               (r.description || '').toLowerCase().includes(q) ||
                               (r.location || '').toLowerCase().includes(q) ||
                               (r.reporterName || '').toLowerCase().includes(q) ||
                               (r.reporterBlockLot || '').toLowerCase().includes(q);
          const matchesStatus = reportFilter === 'ALL' || r.status === reportFilter;
          return matchesQuery && matchesStatus;
        });

        const pendingCount = rawReports.filter((r: any) => r.status === 'PENDING').length;
        const inProgressCount = rawReports.filter((r: any) => r.status === 'IN_PROGRESS').length;
        const resolvedCount = rawReports.filter((r: any) => r.status === 'RESOLVED').length;

        const exportReportsCSV = () => {
          const headers = ["Report ID", "Category", "Location", "Reporter Name", "Block/Lot", "Phone", "Description", "Status", "Reported Date"];
          const rows = filtered.map((r: any) => [
            r.id,
            `"${r.category || ''}"`,
            `"${r.location || ''}"`,
            `"${r.reporterName || 'Resident'}"`,
            `"${r.reporterBlockLot || 'Casa Mira'}"`,
            `"${r.reporterPhone || ''}"`,
            `"${(r.description || '').replace(/"/g, '""')}"`,
            r.status || 'PENDING',
            new Date(r.createdAt).toLocaleDateString()
          ]);
          const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
          const encodedUri = encodeURI(csvContent);
          const link = document.createElement("a");
          link.setAttribute("href", encodedUri);
          link.setAttribute("download", `CasaMira_Incident_Reports_${new Date().toISOString().split('T')[0]}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        };

        return (
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm space-y-4">
            <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-rose-600 text-xs font-bold uppercase tracking-wider mb-1">
                  <ShieldAlert className="w-4 h-4" /> HOA Emergency & Maintenance Desk
                </div>
                <h3 className="font-extrabold text-slate-900 text-lg">Incident & Hazard Reports Moderation</h3>
                <p className="text-xs text-slate-500">Review resident hazards, assign PMO dispatch teams, and update case resolution statuses.</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1.5 bg-amber-50 text-amber-900 font-black text-xs rounded-xl border border-amber-200">
                  ⚠️ {pendingCount} Pending
                </span>
                <span className="px-3 py-1.5 bg-blue-50 text-blue-900 font-black text-xs rounded-xl border border-blue-200">
                  ⚙️ {inProgressCount} In Progress
                </span>
                <span className="px-3 py-1.5 bg-emerald-50 text-emerald-900 font-black text-xs rounded-xl border border-emerald-200">
                  ✓ {resolvedCount} Resolved
                </span>
                <button
                  onClick={exportReportsCSV}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Export CSV
                </button>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
                {['ALL', 'PENDING', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED'].map(st => (
                  <button
                    key={st}
                    onClick={() => setReportFilter(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      reportFilter === st
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {st.replace('_', ' ')}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search location, description, or reporter..."
                  value={reportSearch}
                  onChange={e => setReportSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            {/* Reports List Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                  <tr>
                    <th className="p-4">Category & Photo</th>
                    <th className="p-4">Reporter & Location</th>
                    <th className="p-4">Description</th>
                    <th className="p-4">Resolution Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400 text-xs">
                        No incident reports found matching your filter.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((r: any) => (
                      <tr key={r.id} className="hover:bg-slate-50/60 transition-all">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center font-bold text-slate-400">
                              {r.image ? (
                                <img src={r.image} alt="Report attachment" className="w-full h-full object-cover" />
                              ) : (
                                <ShieldAlert className="w-6 h-6 text-rose-500" />
                              )}
                            </div>
                            <div>
                              <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded font-black text-[10px] uppercase">
                                {r.category || 'HAZARD'}
                              </span>
                              <p className="text-[10px] text-slate-400 font-semibold mt-1">
                                {new Date(r.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <p className="font-extrabold text-slate-900">{r.reporterName || 'Resident'}</p>
                          <p className="text-[10px] text-teal-700 font-bold">{r.reporterBlockLot || 'Casa Mira South'}</p>
                          <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-400" /> {r.location || 'Subdivision Grounds'}
                          </p>
                        </td>
                        <td className="p-4 max-w-xs">
                          <p className="text-slate-700 text-xs line-clamp-2 leading-relaxed">{r.description}</p>
                        </td>
                        <td className="p-4">
                          <select
                            value={r.status || 'PENDING'}
                            onChange={e => handleUpdateReportStatus(r.id, e.target.value)}
                            className={`p-1.5 rounded-xl text-xs font-black outline-none border transition-all ${
                              r.status === 'RESOLVED' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                              r.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-800 border-blue-300' :
                              r.status === 'DISMISSED' ? 'bg-slate-100 text-slate-600 border-slate-300' :
                              'bg-amber-50 text-amber-900 border-amber-300'
                            }`}
                          >
                            <option value="PENDING">PENDING REVIEW</option>
                            <option value="IN_PROGRESS">IN PROGRESS (PMO DISPATCHED)</option>
                            <option value="RESOLVED">RESOLVED ✓</option>
                            <option value="DISMISSED">DISMISSED</option>
                          </select>
                        </td>
                        <td className="p-4 text-right flex items-center justify-end gap-2">
                          {!r.isConfirmed && (
                            <button
                              onClick={() => handleConfirmReportInAdmin(r.id)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] rounded-lg shadow-sm transition-all flex items-center gap-1"
                              title="Confirm validity so report is visible on public incident board"
                            >
                              <ShieldCheck className="w-3 h-3" /> Confirm & Publish
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteReport(r.id)}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[10px] rounded-lg transition-all"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}
      {activeTab === 'pmo-settings' && (
        <form onSubmit={handleSavePmoSettings} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-4">
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                <Save className="w-5 h-5 text-teal-600" /> PMO Rates & System Controls
              </h3>
              <p className="text-xs text-slate-500">Configure community billing rates, security gate parameters, and automated dispatches.</p>
            </div>

            <div className="flex items-center gap-3">
              {settingsChanged && (
                <span className="text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Unsaved changes pending
                </span>
              )}

              <button
                type="submit"
                className="px-6 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-teal-600/30 flex items-center gap-2 transition-all"
              >
                <Save className="w-4 h-4" /> Save PMO Settings
              </button>
            </div>
          </div>

          {settingsSavedSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              PMO System parameters & billing rates saved successfully!
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Financial Dues & House Type HOA Dues */}
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-teal-600" /> HOA Monthly Dues by House Type (Editable)
              </h4>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-1">House Type A (₱)</label>
                  <input
                    type="number"
                    value={hoaDuesTypeA}
                    onChange={e => setHoaDuesTypeA(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none"
                    placeholder="240.00"
                  />
                  <span className="text-[10px] text-slate-400">Default: ₱240</span>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-1">House Type B (₱)</label>
                  <input
                    type="number"
                    value={hoaDuesTypeB}
                    onChange={e => setHoaDuesTypeB(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none"
                    placeholder="320.00"
                  />
                  <span className="text-[10px] text-slate-400">Default: ₱320</span>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-1">House Type C (₱)</label>
                  <input
                    type="number"
                    value={hoaDuesTypeC}
                    onChange={e => setHoaDuesTypeC(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none"
                    placeholder="480.00"
                  />
                  <span className="text-[10px] text-slate-400">Default: ₱480</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/60">
                <label className="block text-xs font-bold text-slate-700 mb-1">Late Payment Penalty Rate (%)</label>
                <input
                  type="text"
                  value={pmoSettings.lateFeePercent}
                  onChange={e => {
                    setPmoSettings({ ...pmoSettings, lateFeePercent: e.target.value });
                    setSettingsChanged(true);
                  }}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">GCash / Banking Payment Desk</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <input
                    type="text"
                    value={gcashNumber}
                    onChange={e => setGcashNumber(e.target.value)}
                    placeholder="GCash Number"
                    className="px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold"
                  />
                  <input
                    type="text"
                    value={bdoAccount}
                    onChange={e => setBdoAccount(e.target.value)}
                    placeholder="BDO Account No."
                    className="px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Security Gate & Broadcast Controls */}
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-600" /> Security Gate & Notification Controls
              </h4>

              <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200">
                <div>
                  <p className="text-xs font-bold text-slate-900">Security Guard QR Scanner Active</p>
                  <p className="text-[11px] text-slate-500">Allows non-login guards to scan resident passes.</p>
                </div>
                <input
                  type="checkbox"
                  checked={pmoSettings.gateScannerActive}
                  onChange={e => {
                    setPmoSettings({ ...pmoSettings, gateScannerActive: e.target.checked });
                    setSettingsChanged(true);
                  }}
                  className="w-5 h-5 text-teal-600 rounded focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200">
                <div>
                  <p className="text-xs font-bold text-slate-900">SMS Broadcast Dispatches</p>
                  <p className="text-[11px] text-slate-500">Auto-send SMS for urgent maintenance alerts.</p>
                </div>
                <input
                  type="checkbox"
                  checked={pmoSettings.smsAlertsEnabled}
                  onChange={e => {
                    setPmoSettings({ ...pmoSettings, smsAlertsEnabled: e.target.checked });
                    setSettingsChanged(true);
                  }}
                  className="w-5 h-5 text-teal-600 rounded focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Temporary Visitor Pass Validity (Hours)</label>
                <input
                  type="text"
                  value={pmoSettings.visitorPassExpiryHours}
                  onChange={e => {
                    setPmoSettings({ ...pmoSettings, visitorPassExpiryHours: e.target.value });
                    setSettingsChanged(true);
                  }}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Water Meter Tier Brackets Configurator */}
          <div className="p-5 bg-teal-950 text-white rounded-3xl border border-teal-800 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-teal-800/80 pb-3">
              <div>
                <h4 className="text-sm font-black text-teal-300 uppercase tracking-wider flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-teal-400" /> Water Consumption Bracket Calculation Rates (Editable)
                </h4>
                <p className="text-xs text-slate-300">
                  Admins can add custom consumption brackets (e.g. 0-10 cu.m = ₱180 minimum, 11-20 cu.m = ₱22/cu.m, 21-30 cu.m = ₱26/cu.m).
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  const newId = waterTiers.length + 1;
                  setWaterTiers([
                    ...waterTiers,
                    { id: newId, min: 31, max: 50, isFlatMin: false, minRate: 0, ratePerCuM: 30, label: 'Custom Bracket' }
                  ]);
                }}
                className="px-3.5 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md transition-all self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" /> Add Bracket Tier
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-teal-800/80 text-teal-300 font-extrabold uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3">Bracket Label</th>
                    <th className="py-2.5 px-3">Min Volume (cu.m)</th>
                    <th className="py-2.5 px-3">Max Volume (cu.m)</th>
                    <th className="py-2.5 px-3">Rate Type</th>
                    <th className="py-2.5 px-3">Flat Minimum (₱)</th>
                    <th className="py-2.5 px-3">Rate / cu.m (₱)</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-teal-800/40">
                  {waterTiers.map((tier, idx) => (
                    <tr key={tier.id || idx} className="hover:bg-teal-900/40">
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={tier.label || ''}
                          onChange={e => {
                            const copy = [...waterTiers];
                            copy[idx].label = e.target.value;
                            setWaterTiers(copy);
                          }}
                          className="px-2.5 py-1 bg-teal-900/80 border border-teal-700/80 rounded-lg text-xs font-bold text-white w-36 outline-none focus:ring-1 focus:ring-teal-400"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          value={tier.min}
                          onChange={e => {
                            const copy = [...waterTiers];
                            copy[idx].min = Number(e.target.value);
                            setWaterTiers(copy);
                          }}
                          className="px-2 py-1 bg-teal-900/80 border border-teal-700/80 rounded-lg text-xs font-bold text-white w-20 outline-none"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          value={tier.max}
                          onChange={e => {
                            const copy = [...waterTiers];
                            copy[idx].max = Number(e.target.value);
                            setWaterTiers(copy);
                          }}
                          className="px-2 py-1 bg-teal-900/80 border border-teal-700/80 rounded-lg text-xs font-bold text-white w-20 outline-none"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <select
                          value={tier.isFlatMin ? 'FLAT' : 'PER_CUM'}
                          onChange={e => {
                            const copy = [...waterTiers];
                            copy[idx].isFlatMin = e.target.value === 'FLAT';
                            setWaterTiers(copy);
                          }}
                          className="px-2 py-1 bg-teal-900/80 border border-teal-700/80 rounded-lg text-xs font-extrabold text-teal-200 outline-none"
                        >
                          <option value="FLAT">Flat Minimum Rate</option>
                          <option value="PER_CUM">Per cu.m Usage</option>
                        </select>
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          value={tier.minRate}
                          disabled={!tier.isFlatMin}
                          onChange={e => {
                            const copy = [...waterTiers];
                            copy[idx].minRate = Number(e.target.value);
                            setWaterTiers(copy);
                          }}
                          className="px-2 py-1 bg-teal-900/80 border border-teal-700/80 rounded-lg text-xs font-bold text-white w-24 outline-none disabled:opacity-40"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          value={tier.ratePerCuM}
                          disabled={tier.isFlatMin}
                          onChange={e => {
                            const copy = [...waterTiers];
                            copy[idx].ratePerCuM = Number(e.target.value);
                            setWaterTiers(copy);
                          }}
                          className="px-2 py-1 bg-teal-900/80 border border-teal-700/80 rounded-lg text-xs font-bold text-white w-24 outline-none disabled:opacity-40"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            if (waterTiers.length <= 1) return alert('At least 1 bracket tier is required.');
                            setWaterTiers(waterTiers.filter((_, i) => i !== idx));
                          }}
                          className="p-1.5 text-rose-300 hover:bg-rose-900/40 rounded-lg font-bold transition-all"
                          title="Remove Bracket"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => handleSaveUtilitySettings()}
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" /> Update Water Tiers & HOA Rates
              </button>
            </div>
          </div>

          {/* Subdivision Phase Options Configurator (Add, Edit, Delete Phases) */}
          <div className="p-5 bg-slate-900 text-white rounded-3xl border border-slate-800 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-sm font-black text-teal-400 uppercase tracking-wider flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-teal-400" /> Subdivision Phase Options (Add/Edit/Delete)
                </h4>
                <p className="text-xs text-slate-300">
                  Manage available subdivision phases used across Resident Registration, Profile Settings, and Address Dropdowns (e.g. Phase 1, Phase 2, Phase 3A, Phase 3B, Phase 3A.2).
                </p>
              </div>

              {/* Add New Phase Input */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="e.g. Phase 3A.2"
                  value={newPhaseInput}
                  onChange={e => setNewPhaseInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddPhase(); } }}
                  className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white outline-none focus:ring-1 focus:ring-teal-400"
                />
                <button
                  type="button"
                  onClick={handleAddPhase}
                  className="px-3 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1 shadow-md transition-all shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Phase
                </button>
              </div>
            </div>

            {/* Active Phase Badges Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
              {phasesList.map((ph, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-800/80 border border-slate-700/80 rounded-2xl">
                  {editingPhaseIdx === idx ? (
                    <div className="flex items-center gap-1.5 w-full">
                      <input
                        type="text"
                        value={editingPhaseVal}
                        onChange={e => setEditingPhaseVal(e.target.value)}
                        className="px-2 py-1 bg-slate-900 border border-teal-500/80 rounded-lg text-xs font-bold text-white w-full outline-none"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEditPhase(idx)}
                        className="p-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg text-xs font-bold"
                        title="Save"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingPhaseIdx(null)}
                        className="p-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-bold"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-teal-400" />
                        <span className="text-xs font-black text-white">{ph}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleStartEditPhase(idx)}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
                          title="Edit Phase Name"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePhase(idx)}
                          className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-900/40 rounded-lg transition-all"
                          title="Delete Phase"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => handleSaveUtilitySettings()}
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" /> Save Phase Options & Settings
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              className="px-8 py-3 bg-teal-600 hover:bg-teal-500 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-teal-600/30 flex items-center gap-2 transition-all"
            >
              <Save className="w-4 h-4" /> Save PMO Settings
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: PMO DUES & WATER BILLING */}
      {activeTab === 'billings' && (
        <div className="space-y-6">
          {/* Issue Billing Statement Form */}
          <form onSubmit={handleGenerateBillings} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-teal-600" /> PMO Statement Issuance
                </h3>
                <p className="text-xs text-slate-500">Issue separate HOA Monthly Dues and Water Meter Statements per community policy.</p>
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('residents')}
                  className="px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 border border-amber-300 rounded-xl text-xs font-black shadow-sm flex items-center gap-1.5 transition-all"
                  title="Switch to Resident Directory to assign Main Account Holders"
                >
                  <Star className="w-4 h-4 text-amber-600 fill-amber-500" />
                  <span>Assign Household Leaders ⭐</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleClearData('billings')}
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-xl text-xs font-black shadow-sm flex items-center gap-1.5 transition-all"
                  title="Purge all generated billing statements and reset sequence back to #1"
                >
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  <span>Purge Statements (Reset #1)</span>
                </button>

                <button
                  type="button"
                  onClick={exportBillingsCSV}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-4 h-4" /> Export CSV
                </button>
              </div>
            </div>

            {/* Statement Type Selection Buttons */}
            <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl">
              <button
                type="button"
                onClick={() => setIssuanceType('HOA')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                  issuanceType === 'HOA'
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <Receipt className="w-4 h-4 text-teal-400" /> HOA Monthly Dues Generator
              </button>
              <button
                type="button"
                onClick={() => setIssuanceType('WATER')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                  issuanceType === 'WATER'
                    ? 'bg-sky-600 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <Droplets className="w-4 h-4 text-sky-200" /> Water Meter Statement Generator
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Resident Account</label>
                <select
                  value={billingForm.userId}
                  onChange={e => handleResidentSelectForBilling(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-teal-500 outline-none font-medium"
                >
                  <option value="">BULK GENERATE FOR ALL RESIDENTS</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.blockLot || 'Casa Mira'}) - Type {u.houseType || 'A'}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Billing Month & Year</label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={selectedMonth}
                    onChange={e => setSelectedMonth(e.target.value)}
                    className="p-2.5 rounded-xl border border-slate-200 text-xs bg-white font-bold text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none"
                  >
                    {monthsList.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <select
                    value={selectedYear}
                    onChange={e => setSelectedYear(e.target.value)}
                    className="p-2.5 rounded-xl border border-slate-200 text-xs bg-white font-bold text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none"
                  >
                    {yearsList.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              {issuanceType === 'HOA' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">HOA Monthly Dues (₱) (Auto-Set)</label>
                  <select
                    value={selectedUnitType}
                    onChange={e => handleUnitTypeChange(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white font-bold text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none"
                  >
                    {unitTypeOptions.map(opt => (
                      <option key={opt.type} value={opt.type}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Due Date (Every 30th)</label>
                  <input
                    required
                    type="date"
                    value={billingForm.dueDate}
                    onChange={e => setBillingForm({...billingForm, dueDate: e.target.value})}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none font-bold"
                  />
                </div>
              )}
            </div>

            {/* Resident Meter Info Card */}
            {residentMeterInfo && (
              <div className="p-4 bg-teal-50/80 border border-teal-200 rounded-2xl text-xs space-y-2">
                <div className="flex items-center justify-between font-bold text-teal-900">
                  <span className="flex items-center gap-1.5"><Droplets className="w-4 h-4 text-teal-600" /> Account Meter Summary: {residentMeterInfo.user?.name}</span>
                  <span className="px-2 py-0.5 bg-teal-100 text-teal-800 rounded-full text-[10px]">Unit Type {residentMeterInfo.houseType}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-700">
                  <div>Auto Previous Reading: <span className="font-bold text-slate-900">{residentMeterInfo.suggestedPrevReading} m³</span></div>
                  <div>Unpaid Arrears: <span className="font-bold text-rose-700">₱{residentMeterInfo.unpaidArrears}</span> ({residentMeterInfo.unpaidMonthsCount} mos)</div>
                  <div>Penalties Status: <span className="font-bold text-amber-700">{residentMeterInfo.hasPenalties ? '5% Monthly Penalty Active' : 'No Penalties'}</span></div>
                  <div>Advance Credit: <span className="font-bold text-emerald-700">₱{residentMeterInfo.advanceCredit}</span></div>
                </div>
              </div>
            )}

            {issuanceType === 'WATER' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Prev Meter Reading (Auto-Detected)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={!useReadingBypass}
                    value={useReadingBypass ? billingForm.overridePrevReading : billingForm.prevReading}
                    onChange={e => setBillingForm({...billingForm, overridePrevReading: e.target.value})}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none disabled:bg-slate-100 font-bold"
                  />
                  <div className="flex items-center gap-1.5 mt-1">
                    <input
                      type="checkbox"
                      id="bypassCheckbox"
                      checked={useReadingBypass}
                      onChange={e => setUseReadingBypass(e.target.checked)}
                      className="rounded text-teal-600 focus:ring-teal-500"
                    />
                    <label htmlFor="bypassCheckbox" className="text-[10px] text-slate-600 font-bold cursor-pointer">
                      Bypass / Manual Correct Previous Reading (Human Error Correction)
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Current Meter Reading (m³)</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={billingForm.currReading}
                    onChange={e => setBillingForm({...billingForm, currReading: e.target.value})}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none font-bold"
                  />
                </div>
              </div>
            )}

            {issuanceType === 'HOA' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Due Date (Every 30th)</label>
                  <input
                    required
                    type="date"
                    value={billingForm.dueDate}
                    onChange={e => setBillingForm({...billingForm, dueDate: e.target.value})}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none font-bold"
                  />
                </div>
              </div>
            )}

            <button type="submit" className={`w-full py-3 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2 transition-all ${
              issuanceType === 'HOA' ? 'bg-slate-900 hover:bg-slate-800' : 'bg-sky-700 hover:bg-sky-800'
            }`}>
              {issuanceType === 'HOA' ? (
                <><Receipt className="w-4 h-4 text-teal-400" /> Issue & Release HOA Monthly Dues Statement</>
              ) : (
                <><Droplets className="w-4 h-4 text-sky-200" /> Issue & Release Water Meter Statement</>
              )}
            </button>
          </form>

          {/* PMO Resident Search Filter Bar */}
          <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-md border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Search className="w-5 h-5 text-teal-400 shrink-0" />
              <div>
                <h4 className="font-extrabold text-sm text-white">PMO Resident Search Filter</h4>
                <p className="text-[11px] text-slate-400">Search by resident name, block/lot, account ID, or billing month across all statements</p>
              </div>
            </div>
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                placeholder="Search resident (e.g. Grace)..."
                value={pmoResidentSearch}
                onChange={e => {
                  setPmoResidentSearch(e.target.value);
                  setPmoHoaPage(1);
                  setPmoWaterPage(1);
                }}
                className="w-full pl-9 pr-8 py-2 bg-slate-800 text-white border border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-teal-400 placeholder:text-slate-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              {pmoResidentSearch && (
                <button
                  onClick={() => { setPmoResidentSearch(''); setPmoHoaPage(1); setPmoWaterPage(1); }}
                  className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-white font-bold"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* TABLE 1: HOA MONTHLY DUES ISSUED STATEMENTS QUEUE */}
          {(() => {
            const rawBillings = Array.isArray(adminBillings) ? adminBillings : [];
            const filteredHOA = rawBillings.filter(b => {
              const hasHoaComponent = parseFloat(b.hoaDues || '0') > 0 || parseFloat(b.totalHoaPayable || '0') > 0;
              if (!hasHoaComponent) return false;
              if (!pmoResidentSearch.trim()) return true;
              const q = pmoResidentSearch.toLowerCase().trim();
              return (
                (b.residentName && b.residentName.toLowerCase().includes(q)) ||
                (b.residentBlockLot && b.residentBlockLot.toLowerCase().includes(q)) ||
                (b.accountNo && b.accountNo.toLowerCase().includes(q)) ||
                (b.billingMonth && b.billingMonth.toLowerCase().includes(q))
              );
            }).sort((a, b) => {
              const timeA = new Date(a.createdAt || a.dueDate || 0).getTime();
              const timeB = new Date(b.createdAt || b.dueDate || 0).getTime();
              return pmoHoaSortOrder === 'LATEST' ? timeB - timeA : timeA - timeB;
            });

            const totalHoaPages = Math.max(1, Math.ceil(filteredHOA.length / 10));
            const paginatedHOA = filteredHOA.slice((pmoHoaPage - 1) * 10, pmoHoaPage * 10);

            return (
              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-5 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-teal-400" />
                    <div>
                      <h4 className="font-extrabold text-base">HOA Monthly Dues Statements Queue</h4>
                      <p className="text-[11px] text-slate-400">Fixed HOA monthly dues verification and payment receipts.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setPmoHoaSortOrder(prev => prev === 'LATEST' ? 'OLDEST' : 'LATEST');
                        setPmoHoaPage(1);
                      }}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all"
                    >
                      <ArrowUpDown className="w-3.5 h-3.5 text-teal-400" />
                      Sort: {pmoHoaSortOrder === 'LATEST' ? 'Latest First' : 'Oldest First'}
                    </button>
                    <span className="px-3 py-1 bg-teal-500/20 text-teal-300 font-bold text-xs rounded-full border border-teal-500/30">
                      {filteredHOA.length} Records
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-slate-100">
                  {paginatedHOA.map(b => {
                    const hoaSt = b.hoaStatus || b.status;
                    const hoaProof = b.hoaPaymentProof || b.paymentProof;
                    const hoaRef = b.hoaPaymentRef || b.paymentRef;

                    return (
                      <div key={`admin-hoa-${b.id}`} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/60">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 text-sm">{b.residentName}</span>
                            <span className="text-xs text-slate-500">({b.residentBlockLot})</span>
                            <span className="px-2 py-0.5 bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-bold rounded-md">
                              Unit Type {b.residentHouseType || 'A'}
                            </span>
                            <span className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full uppercase ${
                              hoaSt === 'PAID' ? 'bg-emerald-100 text-emerald-800' : hoaSt === 'PENDING_VERIFICATION' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {hoaSt.replace('_', ' ')}
                            </span>
                          </div>

                          <p className="text-xs text-slate-600">
                            Statement Month: <span className="font-semibold text-slate-900">{b.billingMonth}</span> • Dues Rate: ₱{b.hoaDues}
                            {parseFloat(b.hoaArrears || '0') > 0 && (
                              <span className="text-amber-800 font-bold ml-2">• Carried Arrears: +₱{b.hoaArrears}</span>
                            )}
                          </p>

                          {hoaRef && (
                            <p className="text-xs font-mono font-bold text-teal-800">
                              HOA Payment Ref #: {hoaRef} {b.hoaAmountPaid ? `(₱${b.hoaAmountPaid})` : ''}
                            </p>
                          )}

                          {hoaProof && (
                            <a href={hoaProof} target="_blank" rel="noreferrer" className="inline-block text-xs font-bold text-teal-600 hover:underline mt-1">
                              🖼️ View Uploaded Receipt Screenshot →
                            </a>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setSummaryModalBill(b)}
                            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5 text-teal-600" /> View Summary
                          </button>

                          <div className="text-right">
                            <span className="text-base font-extrabold text-slate-900 block">₱{b.totalHoaPayable || b.hoaDues}</span>
                            <span className="text-[10px] text-slate-400">Due: {new Date(b.dueDate).toLocaleDateString()}</span>
                          </div>

                          {hoaSt !== 'PAID' ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleVerifyPayment(b.id, 'PAID', 'HOA')}
                                className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-sm"
                              >
                                Verify HOA Paid
                              </button>
                              <button
                                onClick={() => handleVerifyPayment(b.id, 'UNPAID', 'HOA')}
                                className="px-3 py-1.5 bg-red-100 text-red-800 rounded-xl text-xs font-bold"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Verified
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {filteredHOA.length === 0 && (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      No HOA statements found for search criteria.
                    </div>
                  )}
                </div>

                {filteredHOA.length > 0 && (
                  <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                    <span className="text-slate-600 font-medium">
                      Showing <strong className="text-slate-900">{(pmoHoaPage - 1) * 10 + 1}</strong> to <strong className="text-slate-900">{Math.min(pmoHoaPage * 10, filteredHOA.length)}</strong> of <strong className="text-slate-900">{filteredHOA.length}</strong> HOA statements
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        disabled={pmoHoaPage === 1}
                        onClick={() => setPmoHoaPage(p => Math.max(1, p - 1))}
                        className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 flex items-center gap-1"
                      >
                        <ChevronLeft className="w-4 h-4" /> Prev
                      </button>

                      <span className="px-3 py-1.5 font-extrabold text-slate-800">
                        Page {pmoHoaPage} of {totalHoaPages}
                      </span>

                      <button
                        disabled={pmoHoaPage >= totalHoaPages}
                        onClick={() => setPmoHoaPage(p => Math.min(totalHoaPages, p + 1))}
                        className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 flex items-center gap-1"
                      >
                        Next <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* TABLE 2: WATER METER ISSUED STATEMENTS QUEUE */}
          {(() => {
            const rawBillings = Array.isArray(adminBillings) ? adminBillings : [];
            const filteredWater = rawBillings.filter(b => {
              const hasWaterComponent = parseFloat(b.waterAmount || '0') > 0 || parseFloat(b.waterUsage || '0') > 0 || parseFloat(b.totalWaterPayable || '0') > 0;
              if (!hasWaterComponent) return false;
              if (!pmoResidentSearch.trim()) return true;
              const q = pmoResidentSearch.toLowerCase().trim();
              return (
                (b.residentName && b.residentName.toLowerCase().includes(q)) ||
                (b.residentBlockLot && b.residentBlockLot.toLowerCase().includes(q)) ||
                (b.accountNo && b.accountNo.toLowerCase().includes(q)) ||
                (b.billingMonth && b.billingMonth.toLowerCase().includes(q))
              );
            }).sort((a, b) => {
              const timeA = new Date(a.createdAt || a.dueDate || 0).getTime();
              const timeB = new Date(b.createdAt || b.dueDate || 0).getTime();
              return pmoWaterSortOrder === 'LATEST' ? timeB - timeA : timeA - timeB;
            });

            const totalWaterPages = Math.max(1, Math.ceil(filteredWater.length / 10));
            const paginatedWater = filteredWater.slice((pmoWaterPage - 1) * 10, pmoWaterPage * 10);

            return (
              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-5 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Droplets className="w-5 h-5 text-sky-400" />
                    <div>
                      <h4 className="font-extrabold text-base">Water Meter Statements Queue</h4>
                      <p className="text-[11px] text-slate-400">Meter reading calculations, usage brackets, and water bill verification.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setPmoWaterSortOrder(prev => prev === 'LATEST' ? 'OLDEST' : 'LATEST');
                        setPmoWaterPage(1);
                      }}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all"
                    >
                      <ArrowUpDown className="w-3.5 h-3.5 text-sky-400" />
                      Sort: {pmoWaterSortOrder === 'LATEST' ? 'Latest First' : 'Oldest First'}
                    </button>
                    <span className="px-3 py-1 bg-sky-500/20 text-sky-300 font-bold text-xs rounded-full border border-sky-500/30">
                      {filteredWater.length} Records
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-slate-100">
                  {paginatedWater.map(b => {
                    const waterSt = b.waterStatus || b.status;
                    const waterProof = b.waterPaymentProof || b.paymentProof;
                    const waterRef = b.waterPaymentRef || b.paymentRef;

                    return (
                      <div key={`admin-water-${b.id}`} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/60">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 text-sm">{b.residentName}</span>
                            <span className="text-xs text-slate-500">({b.residentBlockLot})</span>
                            <span className="px-2 py-0.5 bg-sky-50 text-sky-900 border border-sky-200 text-[10px] font-bold rounded-md font-mono">
                              {b.waterUsage} m³ ({b.prevReading} → {b.currReading})
                            </span>
                            <span className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full uppercase ${
                              waterSt === 'PAID' ? 'bg-emerald-100 text-emerald-800' : waterSt === 'PENDING_VERIFICATION' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {waterSt.replace('_', ' ')}
                            </span>
                          </div>

                          <p className="text-xs text-slate-600">
                            Statement Month: <span className="font-semibold text-slate-900">{b.billingMonth}</span> • Water Charges: ₱{b.waterAmount}
                            {parseFloat(b.waterArrears || '0') > 0 && (
                              <span className="text-amber-800 font-bold ml-2">• Carried Arrears: +₱{b.waterArrears}</span>
                            )}
                          </p>

                          {waterRef && (
                            <p className="text-xs font-mono font-bold text-teal-800">
                              Water Payment Ref #: {waterRef} {b.waterAmountPaid ? `(₱${b.waterAmountPaid})` : ''}
                            </p>
                          )}

                          {waterProof && (
                            <a href={waterProof} target="_blank" rel="noreferrer" className="inline-block text-xs font-bold text-teal-600 hover:underline mt-1">
                              🖼️ View Uploaded Receipt Screenshot →
                            </a>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setSummaryModalBill(b)}
                            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5 text-sky-600" /> View Summary
                          </button>

                          <div className="text-right">
                            <span className="text-base font-extrabold text-slate-900 block">₱{b.totalWaterPayable || b.waterAmount}</span>
                            <span className="text-[10px] text-slate-400">Due: {new Date(b.dueDate).toLocaleDateString()}</span>
                          </div>

                          {waterSt !== 'PAID' ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleVerifyPayment(b.id, 'PAID', 'WATER')}
                                className="px-3 py-1.5 bg-sky-600 text-white rounded-xl text-xs font-bold shadow-sm"
                              >
                                Verify Water Paid
                              </button>
                              <button
                                onClick={() => handleVerifyPayment(b.id, 'UNPAID', 'WATER')}
                                className="px-3 py-1.5 bg-red-100 text-red-800 rounded-xl text-xs font-bold"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Verified
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {filteredWater.length === 0 && (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      No Water statements found for search criteria.
                    </div>
                  )}
                </div>

                {filteredWater.length > 0 && (
                  <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                    <span className="text-slate-600 font-medium">
                      Showing <strong className="text-slate-900">{(pmoWaterPage - 1) * 10 + 1}</strong> to <strong className="text-slate-900">{Math.min(pmoWaterPage * 10, filteredWater.length)}</strong> of <strong className="text-slate-900">{filteredWater.length}</strong> Water statements
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        disabled={pmoWaterPage === 1}
                        onClick={() => setPmoWaterPage(p => Math.max(1, p - 1))}
                        className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 flex items-center gap-1"
                      >
                        <ChevronLeft className="w-4 h-4" /> Prev
                      </button>

                      <span className="px-3 py-1.5 font-extrabold text-slate-800">
                        Page {pmoWaterPage} of {totalWaterPages}
                      </span>

                      <button
                        disabled={pmoWaterPage >= totalWaterPages}
                        onClick={() => setPmoWaterPage(p => Math.min(totalWaterPages, p + 1))}
                        className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 flex items-center gap-1"
                      >
                        Next <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* TAB 3: CHAT MODERATION */}
      {activeTab === 'moderation' && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-slate-900 text-base border-b border-slate-100 pb-3">
            Flagged Chat Messages & Resident Mutes
          </h3>

          {flaggedMsgs.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No offensive or flagged chat messages reported.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {(Array.isArray(flaggedMsgs) ? flaggedMsgs : []).map(m => (
                <div key={m.id} className="py-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold text-slate-900">{m.senderName} ({m.senderBlockLot})</p>
                    <p className="text-xs text-red-600 bg-red-50 p-2 rounded-xl border border-red-100 mt-1">{m.content}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{new Date(m.createdAt).toLocaleString()}</p>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => handleToggleMute(m.userId, false)} className="px-3 py-1.5 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl">
                      Mute Resident
                    </button>
                    <button onClick={() => handleDeleteChatMessage(m.id)} className="px-3 py-1.5 bg-red-600 text-white font-bold text-xs rounded-xl">
                      Delete Message
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: CONTENT MANAGER */}
      {activeTab === 'content' && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm p-6 space-y-6">
          <h3 className="font-bold text-slate-900 text-base border-b border-slate-100 pb-3">
            Community Content Moderator
          </h3>

          {/* Announcements */}
          <div className="space-y-2">
            <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider">Announcements ({content.announcements?.length || 0})</h4>
            <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl">
              {content.announcements?.map((a: any) => (
                <div key={a.id} className="p-3 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-slate-900">{a.title}</p>
                    <p className="text-slate-500 line-clamp-1">{a.content}</p>
                  </div>
                  <button onClick={() => handleDeleteContent('announcements', a.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Marketplace Listings & Services */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span>Marketplace Posted Items & Services ({content.listings?.length || 0})</span>
              <span className="text-[10px] text-slate-400 font-normal">Actions: Approve, Reject, Edit, Delete</span>
            </h4>
            <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden bg-white">
              {content.listings?.map((l: any) => (
                <div key={l.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-slate-50/50">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-extrabold text-slate-900">{l.title}</p>
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md text-[11px]">₱{l.price}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        l.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                        l.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {l.status || 'PENDING'}
                      </span>
                    </div>
                    <p className="text-slate-500 text-[11px]">
                      Category: <span className="font-semibold text-slate-700">{l.category}</span>
                      {l.description && ` • ${l.description.slice(0, 90)}...`}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {l.status !== 'APPROVED' && (
                      <button
                        onClick={() => triggerConfirm(
                          'Approve Marketplace Listing',
                          `Approve listing "${l.title}" to make it visible on the community marketplace?`,
                          () => handleUpdateContentStatus('listings', l.id, 'APPROVED'),
                          'primary',
                          'Approve'
                        )}
                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] rounded-lg shadow-sm transition-all flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" /> Approve
                      </button>
                    )}

                    {l.status !== 'REJECTED' && (
                      <button
                        onClick={() => triggerConfirm(
                          'Reject Marketplace Listing',
                          `Reject listing "${l.title}"?`,
                          () => handleUpdateContentStatus('listings', l.id, 'REJECTED'),
                          'warning',
                          'Reject'
                        )}
                        className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-[10px] rounded-lg transition-all flex items-center gap-1"
                      >
                        <X className="w-3 h-3" /> Reject
                      </button>
                    )}

                    <button
                      onClick={() => handleOpenEditListing(l)}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all"
                      title="Edit Item/Service"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDeleteContent('listings', l.id)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                      title="Delete Listing"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SYSTEM AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100 font-bold text-slate-900 text-sm">
            System Operational Audit History
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                <tr>
                  <th className="p-4">Timestamp</th>
                  <th className="p-4">Admin Actor</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Action Type</th>
                  <th className="p-4">Target Entity</th>
                  <th className="p-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(Array.isArray(auditLogs) ? auditLogs : []).map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/60">
                    <td className="p-4 text-slate-400 font-mono text-[11px]">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="p-4 font-bold text-slate-900">{log.actorName}</td>
                    <td className="p-4"><span className="px-2 py-0.5 bg-slate-100 font-bold text-[10px] rounded-md">{log.actorRole}</span></td>
                    <td className="p-4 font-extrabold text-teal-700">{log.action}</td>
                    <td className="p-4 text-slate-800 font-medium">{log.target}</td>
                    <td className="p-4 text-slate-600">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: GATE DIGITAL QR PASS SCANNER */}
      {activeTab === 'scanner' && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm p-6 space-y-6 max-w-xl mx-auto">
          <div className="text-center space-y-1">
            <div className="w-12 h-12 bg-teal-100 text-teal-800 rounded-2xl mx-auto flex items-center justify-center mb-2">
              <QrCode className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg">Gate Pass Verification Scanner</h3>
            <p className="text-xs text-slate-500">Scan or enter resident UID code to verify HOA access clearance.</p>
          </div>

          <form onSubmit={handleVerifyQR} className="space-y-3">
            <input
              required
              type="text"
              placeholder="Paste or scan Resident UID..."
              value={scannerUid}
              onChange={e => setScannerUid(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-teal-500 outline-none"
            />
            <button type="submit" disabled={scannerLoading} className="w-full py-3 bg-slate-900 text-white text-xs font-bold rounded-xl shadow-md">
              {scannerLoading ? 'Verifying Resident...' : 'Verify Gate Pass'}
            </button>
          </form>

          {scannerResult && (
            <div className={`p-5 rounded-2xl border text-xs space-y-2 ${scannerResult.valid ? 'bg-emerald-50 border-emerald-200 text-emerald-950' : 'bg-red-50 border-red-200 text-red-950'}`}>
              <div className="flex items-center gap-2 font-bold text-sm">
                {scannerResult.valid ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <ShieldAlert className="w-5 h-5 text-red-600" />}
                <span>{scannerResult.valid ? 'VERIFIED CASA MIRA RESIDENT' : 'ACCESS DENIED / UNVERIFIED'}</span>
              </div>
              {scannerResult.name && <p><span className="font-bold">Name:</span> {scannerResult.name}</p>}
              {scannerResult.blockLot && <p><span className="font-bold">Phase / Lot:</span> {scannerResult.blockLot}</p>}
              {scannerResult.role && <p><span className="font-bold">Community Role:</span> {scannerResult.role}</p>}
            </div>
          )}
        </div>
      )}

      {/* TAB 7: SMS LOGS & BLAST DISPATCH COMPOSER */}
      {activeTab === 'sms' && (
        <div className="space-y-6">
          {/* SMS BLAST DISPATCH CARD */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 text-white rounded-3xl border border-teal-500/30 p-6 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-teal-500/20 text-teal-400 rounded-2xl border border-teal-500/30">
                  <Phone className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider block">Official PMO Dispatch Engine</span>
                  <h3 className="font-extrabold text-lg text-white">Send Instant SMS Announcement Blast</h3>
                  <p className="text-xs text-slate-300">Broadcast text alerts directly to mobile phones (+63 Philippines carriers).</p>
                </div>
              </div>
              
              <button
                type="button"
                onClick={() => {
                  setSmsRecipientType('SPECIFIC');
                  setSmsCustomPhone('+639272815880');
                  setSmsTitle('[Casa Mira South] Urgent Announcement');
                  setSmsMessage('Official Notice: Water & HOA Dues portal updated and SMS broadcast system online for +639272815880.');
                }}
                className="px-3.5 py-2 bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 self-start sm:self-auto"
              >
                📱 Preset Test Blast (+639272815880)
              </button>
            </div>

            {smsSuccessMsg && (
              <div className="p-4 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl text-emerald-200 text-xs font-bold flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>{smsSuccessMsg}</span>
                </div>
                <button onClick={() => setSmsSuccessMsg('')} className="text-emerald-300 hover:underline">Dismiss</button>
              </div>
            )}

            <form onSubmit={handleSendSmsBlast} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Recipient Broadcast Scope</label>
                  <select
                    value={smsRecipientType}
                    onChange={e => setSmsRecipientType(e.target.value as 'ALL' | 'SPECIFIC')}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs font-bold text-white outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="SPECIFIC">Direct Mobile Number (+63...)</option>
                    <option value="ALL">All Subscribed Residents (Subdivision Blast)</option>
                  </select>
                </div>

                {smsRecipientType === 'SPECIFIC' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Target Mobile Phone Number</label>
                    <input
                      required
                      type="text"
                      value={smsCustomPhone}
                      onChange={e => setSmsCustomPhone(e.target.value)}
                      placeholder="+639272815880"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs font-mono font-bold text-teal-300 outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">SMS Announcement Title Header</label>
                <input
                  type="text"
                  value={smsTitle}
                  onChange={e => setSmsTitle(e.target.value)}
                  placeholder="[Casa Mira South] Official Alert"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs font-bold text-white outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-slate-300">SMS Text Message Content</label>
                  <span className="text-[10px] text-teal-400 font-mono">{smsMessage.length}/160 Chars</span>
                </div>
                <textarea
                  required
                  rows={3}
                  maxLength={160}
                  value={smsMessage}
                  onChange={e => setSmsMessage(e.target.value)}
                  placeholder="Enter message text to send via SMS..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={smsSending}
                  className="px-6 py-3 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center gap-2"
                >
                  <Phone className="w-4 h-4" />
                  {smsSending ? 'Dispatching Blast SMS...' : `Dispatch SMS Blast Now (${smsRecipientType === 'SPECIFIC' ? smsCustomPhone : 'All Subscribers'})`}
                </button>
              </div>
            </form>
          </div>

          {/* LOGS TABLE */}
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm space-y-0">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-white">SMS Dispatch Broadcast Logs</h3>
                <p className="text-xs text-slate-400">Audit history of emergency text alerts and community blasts.</p>
              </div>
              <span className="px-3 py-1 bg-teal-500/20 text-teal-300 font-bold text-xs rounded-full border border-teal-500/30">
                {(Array.isArray(smsLogs) ? smsLogs : []).length} Logs
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[650px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold uppercase text-slate-500 tracking-wider">
                    <th className="py-3.5 px-5">Broadcast Header</th>
                    <th className="py-3.5 px-5">Recipients / Message Details</th>
                    <th className="py-3.5 px-5 text-center">Recipients</th>
                    <th className="py-3.5 px-5 text-center">Status</th>
                    <th className="py-3.5 px-5 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {(Array.isArray(smsLogs) ? smsLogs : []).map(s => (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-5 font-bold text-slate-900 whitespace-nowrap">
                        {s.title}
                      </td>
                      <td className="py-4 px-5 text-slate-600 max-w-xs break-words">
                        {s.message}
                      </td>
                      <td className="py-4 px-5 text-center font-mono font-bold text-slate-800">
                        {s.recipientsCount || 1}
                      </td>
                      <td className="py-4 px-5 text-center">
                        <span className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full uppercase ${
                          s.status === 'SENT' || s.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-red-100 text-red-800 border border-red-200'
                        }`}>
                          {s.status || 'SENT'}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        {new Date(s.sentAt || s.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}

                  {(Array.isArray(smsLogs) ? smsLogs : []).length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400 text-xs">
                        No SMS logs recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* BADGE MANAGEMENT MODAL */}
      {editingBadgesUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Manage Resident Badges</h3>
                  <p className="text-xs text-slate-500">Award contribution badges for {editingBadgesUser.name}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingBadgesUser(null)}
                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              <p className="text-xs text-slate-600">Select badges to grant to this resident profile:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {Object.values(BADGE_DEFINITIONS).map(badge => {
                  const isChecked = selectedBadges.includes(badge.id);
                  return (
                    <label
                      key={badge.id}
                      onClick={() => {
                        setSelectedBadges(prev =>
                          prev.includes(badge.id)
                            ? prev.filter(b => b !== badge.id)
                            : [...prev, badge.id]
                        );
                      }}
                      className={`p-3 rounded-2xl border text-xs cursor-pointer transition-all flex items-start gap-2.5 ${
                        isChecked
                          ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-400/20 shadow-sm'
                          : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/80 opacity-75'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                      />
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                          {renderBadgeIcon(badge.iconName, 'w-3.5 h-3.5 text-amber-600')}
                          <span>{badge.name}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-tight">{badge.description}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingBadgesUser(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveBadges}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>Save Badge Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Calculation Summary Modal */}
      <CalculationSummaryModal
        isOpen={!!summaryModalBill}
        onClose={() => setSummaryModalBill(null)}
        billing={summaryModalBill}
      />
    </div>
  );
}
