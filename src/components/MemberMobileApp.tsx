import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Heart, MessageCircle, Share2, Plus, ArrowLeft, MoreVertical, 
  Send, QrCode, Receipt, Droplets, ShieldCheck, CheckCircle2, 
  AlertTriangle, Store, Calendar, Users, MapPin, Phone, 
  Search, Bell, X, Camera, Sparkles, LogOut, Settings, Clock, 
  ChevronRight, Filter, Eye, Check, ExternalLink, Shield
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import CasaMiraLogo from './CasaMiraLogo';
import ResidentPassModal from './ResidentPassModal';
import ProfileSettingsModal from './ProfileSettingsModal';
import TermsPrivacyModal from './TermsPrivacyModal';

interface PostItem {
  id: string;
  authorName: string;
  authorAvatar?: string;
  authorRole: string;
  authorLocation: string;
  timeAgo: string;
  category: 'FEED' | 'ADVISORY' | 'MARKET' | 'EVENT' | 'SECURITY' | 'QUESTION';
  title?: string;
  content: string;
  image?: string;
  likes: number;
  commentsCount: number;
  shares: number;
  isLiked?: boolean;
  comments?: CommentItem[];
  isPinned?: boolean;
  priority?: 'HIGH' | 'NORMAL';
}

interface CommentItem {
  id: string;
  authorName: string;
  authorAvatar?: string;
  timeAgo: string;
  text: string;
}

export default function MemberMobileApp() {
  const { profile, token, logout, isSuperadminTester, switchDemoRole } = useAuth();
  const navigate = useNavigate();

  // Active Top Filter Tab (matching Screen 2 in reference image)
  const [activeTab, setActiveTab] = useState<'Feed' | 'Advisories' | 'Dues' | 'Gate Pass' | 'Market' | 'Events'>('Feed');

  // Active Bottom Navigation Tab
  const [bottomNav, setBottomNav] = useState<'home' | 'dues' | 'pass' | 'market' | 'profile'>('home');

  // Modals & Drawers
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [activeCommentsPost, setActiveCommentsPost] = useState<PostItem | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Pass Flip state
  const [isPassFlipped, setIsPassFlipped] = useState(false);

  // Device Frame Toggle for Desktop Viewers
  const [isExpandedDesktop, setIsExpandedDesktop] = useState(false);

  // New Post Form State
  const [newPostCategory, setNewPostCategory] = useState<'FEED' | 'QUESTION' | 'MARKET' | 'SECURITY'>('FEED');
  const [newPostText, setNewPostText] = useState('');
  const [newPostImage, setNewPostImage] = useState('');

  // Data states from backend
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [myBills, setMyBills] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [feedPosts, setFeedPosts] = useState<PostItem[]>([]);

  // Payment Modal inside Member App
  const [selectedBillForPayment, setSelectedBillForPayment] = useState<any | null>(null);
  const [paymentType, setPaymentType] = useState<'FULL' | 'WATER' | 'HOA'>('FULL');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentProof, setPaymentProof] = useState('');
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState('');

  useEffect(() => {
    if (token) {
      loadMemberData();
    }
  }, [token]);

  const loadMemberData = async () => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const [annRes, billRes, listRes, evtRes, notifRes] = await Promise.all([
        fetch('/api/announcements', { headers }).catch(() => null),
        fetch('/api/billings/my', { headers }).catch(() => null),
        fetch('/api/listings', { headers }).catch(() => null),
        fetch('/api/events', { headers }).catch(() => null),
        fetch('/api/notifications', { headers }).catch(() => null)
      ]);

      const annData = annRes && annRes.ok ? await annRes.json() : [];
      const billData = billRes && billRes.ok ? await billRes.json() : [];
      const listData = listRes && listRes.ok ? await listRes.json() : [];
      const evtData = evtRes && evtRes.ok ? await evtRes.json() : [];
      const notifData = notifRes && notifRes.ok ? await notifRes.json() : [];

      setAnnouncements(Array.isArray(annData) ? annData : []);
      setMyBills(Array.isArray(billData) ? billData : []);
      setListings(Array.isArray(listData) ? listData : []);
      setEvents(Array.isArray(evtData) ? evtData : []);
      setNotifications(Array.isArray(notifData) ? notifData : []);

      // Build Community Feed posts from live announcements and interactive sample community cards
      buildFeedPosts(annData, listData);
    } catch (e) {
      console.error("Error loading member mobile data", e);
    }
  };

  const buildFeedPosts = (annList: any[], listList: any[]) => {
    const defaultPosts: PostItem[] = [
      {
        id: 'post-1',
        authorName: 'Alana Piyas',
        authorAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=160&q=80',
        authorRole: 'Resident',
        authorLocation: 'Phase 2 Block 14 Lot 3',
        timeAgo: 'Posted · 2d ago',
        category: 'QUESTION',
        content: 'Hi neighbors! Are there any centers or tutor services offering online language classes or after-school math tutoring for kids here in Casa Mira South?',
        likes: 142,
        commentsCount: 18,
        shares: 6,
        comments: [
          {
            id: 'c-1',
            authorName: 'Rabart Chies',
            authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=160&q=80',
            timeAgo: '2m ago',
            text: 'Teacher Jenny over at Phase 1 Block 8 conducts tutoring sessions! You can check her post on the Directory.'
          },
          {
            id: 'c-2',
            authorName: 'Miles Sather',
            authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80',
            timeAgo: '1d ago',
            text: 'I can recommend the learning hub near the Naga City public plaza. Very reasonable rates.'
          }
        ]
      },
      {
        id: 'post-2',
        authorName: 'Grace Ella',
        authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80',
        authorRole: 'Resident & Pet Lover',
        authorLocation: 'Phase 1 Block 9 Lot 12',
        timeAgo: 'Posted · 13h ago',
        category: 'FEED',
        content: 'Brought our Golden Retriever "Milo" for morning socialization at the Phase 1 park! He made 3 new furry friends today. Remember to pick up after your pets so our lawns stay clean! 🐶✨',
        image: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=800&q=80',
        likes: 384,
        commentsCount: 29,
        shares: 14,
        comments: [
          {
            id: 'c-3',
            authorName: 'Rabart Chies',
            authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=160&q=80',
            timeAgo: '2m',
            text: 'Your content always feels so refreshing! Milo is such a good boy!'
          },
          {
            id: 'c-4',
            authorName: 'Miles Sather',
            authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80',
            timeAgo: '1d',
            text: 'You always know how to capture the perfect moment, amazing shot!'
          },
          {
            id: 'c-5',
            authorName: 'Karlos Bunny',
            authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=160&q=80',
            timeAgo: '2d',
            text: 'Every time you post, your photos just keep getting better and better!'
          }
        ]
      }
    ];

    // Convert PMO announcements into feed cards
    if (Array.isArray(annList) && annList.length > 0) {
      const annPosts: PostItem[] = annList.map(ann => ({
        id: `ann-${ann.id}`,
        authorName: 'Casa Mira PMO Desk',
        authorAvatar: undefined,
        authorRole: 'Official Advisory',
        authorLocation: 'PMO Administration · Naga City',
        timeAgo: ann.createdAt ? new Date(ann.createdAt).toLocaleDateString() : 'Recent Advisory',
        category: 'ADVISORY',
        title: ann.title,
        content: ann.description,
        priority: ann.priority,
        likes: ann.priority === 'HIGH' ? 245 : 88,
        commentsCount: 12,
        shares: 31,
        comments: [
          {
            id: `c-ann-${ann.id}-1`,
            authorName: 'Ramon Diaz',
            authorAvatar: undefined,
            timeAgo: '3h ago',
            text: 'Acknowledged PMO. Will store adequate water ahead of the scheduled pipeline maintenance.'
          }
        ]
      }));
      setFeedPosts([...annPosts, ...defaultPosts]);
    } else {
      setFeedPosts(defaultPosts);
    }
  };

  const handleLikePost = (postId: string) => {
    setFeedPosts(prev => prev.map(p => {
      if (p.id === postId) {
        const nextLiked = !p.isLiked;
        return {
          ...p,
          isLiked: nextLiked,
          likes: nextLiked ? p.likes + 1 : Math.max(0, p.likes - 1)
        };
      }
      return p;
    }));

    if (activeCommentsPost && activeCommentsPost.id === postId) {
      setActiveCommentsPost(prev => {
        if (!prev) return null;
        const nextLiked = !prev.isLiked;
        return {
          ...prev,
          isLiked: nextLiked,
          likes: nextLiked ? prev.likes + 1 : Math.max(0, prev.likes - 1)
        };
      });
    }
  };

  const handleAddComment = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!commentInput.trim() || !activeCommentsPost) return;

    const newComment: CommentItem = {
      id: `c-${Date.now()}`,
      authorName: profile?.name || 'Resident Member',
      authorAvatar: profile?.profileImage || undefined,
      timeAgo: 'Just now',
      text: commentInput.trim()
    };

    const updatedComments = [...(activeCommentsPost.comments || []), newComment];
    const updatedPost = {
      ...activeCommentsPost,
      comments: updatedComments,
      commentsCount: updatedComments.length
    };

    setActiveCommentsPost(updatedPost);
    setFeedPosts(prev => prev.map(p => p.id === activeCommentsPost.id ? updatedPost : p));
    setCommentInput('');
  };

  const handleCreatePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostText.trim()) return;

    const createdPost: PostItem = {
      id: `post-${Date.now()}`,
      authorName: profile?.name || 'Resident Member',
      authorAvatar: profile?.profileImage || undefined,
      authorRole: 'Resident',
      authorLocation: profile?.blockLot || 'Casa Mira South',
      timeAgo: 'Just now',
      category: newPostCategory,
      content: newPostText.trim(),
      image: newPostImage.trim() || undefined,
      likes: 1,
      isLiked: true,
      commentsCount: 0,
      shares: 0,
      comments: []
    };

    setFeedPosts([createdPost, ...feedPosts]);
    setNewPostText('');
    setNewPostImage('');
    setIsCreatePostOpen(false);
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBillForPayment) return;

    setPaymentSubmitting(true);
    try {
      const defaultAmt = paymentType === 'WATER'
        ? (selectedBillForPayment.totalWaterPayable || selectedBillForPayment.waterAmount)
        : paymentType === 'HOA'
        ? (selectedBillForPayment.totalHoaPayable || selectedBillForPayment.hoaDues)
        : selectedBillForPayment.totalAmount;

      const res = await fetch(`/api/billings/${selectedBillForPayment.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          paymentType,
          paymentProof,
          paymentRef,
          amountPaid: defaultAmt
        })
      });

      if (res.ok) {
        setPaymentSuccess('Payment proof submitted! PMO Accounting is verifying.');
        setSelectedBillForPayment(null);
        setPaymentProof('');
        setPaymentRef('');
        loadMemberData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const latestBill = myBills[0] || null;
  const isLatestSettled = latestBill ? (latestBill.status === 'PAID' || (latestBill.hoaStatus === 'PAID' && latestBill.waterStatus === 'PAID')) : true;

  const householdCode = profile?.blockLot 
    ? `CMS-${(profile?.phase || 'P1').replace(/\s+/g, '').toUpperCase()}-${profile.blockLot.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)}`
    : `CMS-RES-${profile?.id || '1001'}`;

  const passVerificationUrl = `${window.location.origin}/verify-pass?code=${encodeURIComponent(profile?.uid || 'CMS-RESIDENT')}`;

  // Filter posts based on active category tab
  const displayedPosts = feedPosts.filter(p => {
    if (activeTab === 'Feed') return true;
    if (activeTab === 'Advisories') return p.category === 'ADVISORY' || p.category === 'SECURITY';
    if (activeTab === 'Market') return p.category === 'MARKET';
    return true;
  });

  return (
    <div className="min-h-screen bg-[#F0F2F6] flex flex-col items-center justify-start p-0 sm:p-4 md:p-6 antialiased font-sans text-slate-800">
      {/* Modals */}
      <ResidentPassModal isOpen={isPassModalOpen} onClose={() => setIsPassModalOpen(false)} />
      <ProfileSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <TermsPrivacyModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />

      {/* Top Banner for Admin & SuperAdmin Switcher */}
      {(profile?.role === 'SUPERADMIN' || profile?.role === 'ADMIN' || isSuperadminTester) && (
        <div className="w-full max-w-[420px] bg-slate-900 text-white px-4 py-2 text-xs font-bold flex items-center justify-between shadow-md sm:rounded-t-2xl z-40 border-b border-slate-800">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] text-teal-300">Client HOA Mobile View</span>
          </div>
          <button
            onClick={() => navigate('/admin')}
            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-black rounded-lg transition-all flex items-center gap-1 cursor-pointer"
          >
            <Shield className="w-3 h-3" /> Admin Portal →
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* SMARTPHONE DEVICE CONTAINER (Matching Attached Image Mockup)   */}
      {/* ============================================================== */}
      <div className={`w-full ${isExpandedDesktop ? 'max-w-2xl' : 'max-w-[420px]'} bg-[#FAFAFC] sm:rounded-[36px] sm:shadow-2xl sm:border-[8px] sm:border-slate-900/90 overflow-hidden flex flex-col relative min-h-screen sm:min-h-[860px] max-h-none sm:max-h-[92vh]`}>
        
        {/* ============================================================== */}
        {/* VIEW 1 & 2: MAIN MEMBER FEED SCREEN (SCREEN 2 IN REFERENCE)     */}
        {/* ============================================================== */}
        {!activeCommentsPost && (
          <div className="flex-1 flex flex-col overflow-y-auto pb-24">
            
            {/* Native Mobile Status Notch & Header (Matching "Floxly" header) */}
            <header className="sticky top-0 z-30 bg-[#FAFAFC]/95 backdrop-blur-md px-5 pt-3 pb-3 border-b border-slate-100 flex items-center justify-between">
              {/* Brand Logo & Name */}
              <div className="flex items-center gap-2.5">
                <CasaMiraLogo className="w-8 h-8 shrink-0" variant="badge" />
                <div className="leading-tight">
                  <h1 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-1">
                    Casa Mira
                  </h1>
                  <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider block">
                    {profile?.blockLot || 'South HOA Portal'}
                  </span>
                </div>
              </div>

              {/* Header Action Icons: Messages & Round Blue Plus Button (Matching Image Screen 2) */}
              <div className="flex items-center gap-2">
                {/* Desktop width expander */}
                <button
                  onClick={() => setIsExpandedDesktop(!isExpandedDesktop)}
                  className="hidden sm:flex p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors"
                  title="Toggle Mobile / Expanded Width"
                >
                  <Filter className="w-4 h-4" />
                </button>

                {/* Notifications & PMO Messages */}
                <button
                  onClick={() => setActiveTab('Advisories')}
                  className="relative w-10 h-10 rounded-full bg-white border border-slate-200/80 shadow-xs flex items-center justify-center text-slate-700 hover:text-teal-700 hover:border-teal-300 transition-colors cursor-pointer"
                  title="Notifications & Alerts"
                >
                  <MessageCircle className="w-5 h-5" />
                  {announcements.length > 0 && (
                    <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-teal-600 animate-pulse" />
                  )}
                </button>

                {/* Round Vibrant Blue Plus Button (Exact Match to Image Screen 2) */}
                <button
                  onClick={() => setIsCreatePostOpen(true)}
                  className="w-10 h-10 rounded-full bg-[#4F46E5] hover:bg-[#4338CA] active:scale-95 text-white shadow-md shadow-indigo-500/30 flex items-center justify-center transition-all cursor-pointer"
                  title="Create Post or Inquiry"
                >
                  <Plus className="w-5 h-5 stroke-[2.5]" />
                </button>
              </div>
            </header>

            {/* Horizontal Filter Tabs (Matching "Feed", "Popular", "Games", "Latest" in Image) */}
            <div className="px-5 py-3 overflow-x-auto scrollbar-none flex items-center gap-2 bg-[#FAFAFC]">
              {(['Feed', 'Advisories', 'Dues', 'Gate Pass', 'Market', 'Events'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    if (tab === 'Dues') setBottomNav('dues');
                    else if (tab === 'Gate Pass') setBottomNav('pass');
                    else if (tab === 'Market') setBottomNav('market');
                    else setBottomNav('home');
                  }}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    activeTab === tab
                      ? 'bg-[#EEF2FF] text-[#4F46E5] font-black shadow-xs'
                      : 'bg-white hover:bg-slate-50 text-slate-500 border border-slate-200/60'
                  }`}
                >
                  {tab === 'Dues' ? 'Dues & Water' : tab}
                </button>
              ))}
            </div>

            {/* Content Area Based on Active Tab */}
            <div className="px-4 space-y-4 pt-1">
              
              {/* ======================================================= */}
              {/* TAB: DUES & WATER (Grouped Statement Cards & Pay Modal) */}
              {/* ======================================================= */}
              {activeTab === 'Dues' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* Current Net Balance Card */}
                  <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
                          Statement of Account
                        </span>
                        <h3 className="text-base font-black text-slate-900 leading-tight">
                          {latestBill?.billingMonth || 'Current Billing Period'}
                        </h3>
                      </div>
                      {isLatestSettled ? (
                        <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black rounded-full uppercase border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> All Settled
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-rose-50 text-rose-700 text-[10px] font-black rounded-full uppercase border border-rose-200 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> Balance Due
                        </span>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Net Outstanding Amount
                      </span>
                      <span className="text-3xl font-black text-slate-900 font-mono tracking-tight block mt-0.5">
                        ₱{latestBill && !isLatestSettled ? latestBill.totalAmount : '0.00'}
                      </span>
                      <span className="text-xs text-slate-500 font-medium block mt-1">
                        Household Account: <strong className="font-mono text-slate-800">{householdCode}</strong>
                      </span>
                    </div>

                    {/* Breakdown 2-Column Cards Grid */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="p-3 bg-sky-50/80 rounded-2xl border border-sky-100">
                        <div className="flex items-center justify-between text-sky-800 mb-0.5">
                          <span className="text-[10px] font-extrabold uppercase flex items-center gap-1">
                            <Droplets className="w-3.5 h-3.5 text-sky-600" /> Water
                          </span>
                          <span className="font-mono font-bold text-xs">₱{latestBill?.waterAmount || '0'}</span>
                        </div>
                        <span className="text-[10.5px] text-slate-600 block">
                          {latestBill?.waterUsage || '0'} m³ consumed
                        </span>
                      </div>

                      <div className="p-3 bg-teal-50/80 rounded-2xl border border-teal-100">
                        <div className="flex items-center justify-between text-teal-800 mb-0.5">
                          <span className="text-[10px] font-extrabold uppercase flex items-center gap-1">
                            <Receipt className="w-3.5 h-3.5 text-teal-600" /> HOA Dues
                          </span>
                          <span className="font-mono font-bold text-xs">₱{latestBill?.hoaDues || '240'}</span>
                        </div>
                        <span className="text-[10.5px] text-slate-600 block">
                          Unit Type {profile?.houseType || 'A'}
                        </span>
                      </div>
                    </div>

                    {/* 1-Tap Pay Action Button */}
                    {latestBill && !isLatestSettled ? (
                      <button
                        onClick={() => {
                          setSelectedBillForPayment(latestBill);
                          setPaymentType('FULL');
                        }}
                        className="w-full py-3 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-black text-xs rounded-2xl shadow-md shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                      >
                        <Receipt className="w-4 h-4" /> Pay Full SOA (₱{latestBill.totalAmount})
                      </button>
                    ) : (
                      <div className="p-3 bg-emerald-50 rounded-2xl text-center text-xs font-bold text-emerald-800 border border-emerald-100">
                        ✓ All HOA dues and water meter accounts are fully settled.
                      </div>
                    )}
                  </div>

                  {/* Statement History Cards (No Tables!) */}
                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 px-1">
                      Recent Statement History
                    </h4>
                    {myBills.slice(0, 4).map(bill => (
                      <div key={bill.id} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-mono text-teal-700 font-bold block">SOA #{bill.id}</span>
                          <h5 className="font-extrabold text-sm text-slate-900">{bill.billingMonth}</h5>
                          <span className="text-[11px] text-slate-500 font-mono font-medium">₱{bill.totalAmount} · {bill.waterUsage || 0} m³</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {bill.status === 'PAID' ? (
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black rounded-full uppercase border border-emerald-100">
                              Paid
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedBillForPayment(bill);
                                setPaymentType('FULL');
                              }}
                              className="px-3 py-1.5 bg-[#4F46E5] text-white font-black text-[11px] rounded-xl shadow-xs active:scale-95"
                            >
                              Pay
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ======================================================= */}
              {/* TAB: GATE PASS (Scannable RFID/QR Resident ID Card)    */}
              {/* ======================================================= */}
              {activeTab === 'Gate Pass' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 rounded-3xl p-6 text-white border border-teal-500/30 shadow-xl relative overflow-hidden">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <CasaMiraLogo className="w-8 h-8 shrink-0" variant="badge" />
                        <div>
                          <h4 className="font-black text-xs uppercase tracking-tight text-white">Casa Mira South</h4>
                          <span className="text-[9.5px] font-bold text-teal-400 uppercase tracking-wider block">Official Gate Pass</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setIsPassFlipped(!isPassFlipped)}
                        className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-slate-200 border border-white/20 rounded-full text-[10px] font-bold transition-all cursor-pointer"
                      >
                        {isPassFlipped ? 'Show Details' : 'Show QR'}
                      </button>
                    </div>

                    {!isPassFlipped ? (
                      <div className="space-y-3 py-2">
                        <div>
                          <span className="text-[10px] font-mono uppercase text-slate-400 block">Registered Homeowner</span>
                          <h3 className="text-xl font-black text-white">{profile?.name || 'Resident Member'}</h3>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/80">
                            <span className="text-[9px] text-slate-400 block uppercase font-bold">Household Code</span>
                            <span className="font-mono font-bold text-teal-300 text-xs truncate block">{householdCode}</span>
                          </div>
                          <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/80">
                            <span className="text-[9px] text-slate-400 block uppercase font-bold">Address</span>
                            <span className="font-bold text-white text-xs truncate block">{profile?.blockLot || 'Phase 1'}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="py-2 flex items-center gap-3 bg-slate-900/90 p-3 rounded-2xl border border-teal-500/30">
                        <div className="p-2 bg-white rounded-xl shrink-0 shadow-md">
                          <QRCodeSVG value={passVerificationUrl} size={80} level="M" />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider block">Gate Scanner QR</span>
                          <p className="text-[11px] text-slate-300 leading-snug">Present at Gate 1 or Gate 2 scanner for express resident clearance.</p>
                        </div>
                      </div>
                    )}

                    <div className="pt-3 mt-3 border-t border-white/10 flex items-center justify-between">
                      <span className="text-[10px] text-teal-400 font-bold flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> PMO Verified Pass
                      </span>
                      <button
                        onClick={() => setIsPassModalOpen(true)}
                        className="px-3 py-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1 active:scale-95 cursor-pointer"
                      >
                        <QrCode className="w-3.5 h-3.5" /> Fullscreen QR
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ======================================================= */}
              {/* TAB: COMMUNITY FEED (Matches Attached Image Screen 2)   */}
              {/* ======================================================= */}
              {(activeTab === 'Feed' || activeTab === 'Advisories' || activeTab === 'Market') && (
                <div className="space-y-4">
                  {displayedPosts.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs bg-white rounded-3xl border border-slate-100">
                      No posts found in this category. Tap the blue + button to create a post!
                    </div>
                  ) : (
                    displayedPosts.map(post => {
                      const isAdvisory = post.category === 'ADVISORY' || post.category === 'SECURITY';
                      const isHigh = post.priority === 'HIGH';

                      return (
                        <article
                          key={post.id}
                          className={`bg-white rounded-3xl p-5 border shadow-sm transition-all duration-200 ${
                            isHigh 
                              ? 'border-rose-200 ring-1 ring-rose-400/20 bg-gradient-to-br from-rose-50/50 to-white' 
                              : 'border-slate-100'
                          }`}
                        >
                          {/* Post Card Header (Matching Author Avatar, Name, Time, Menu in Image Screen 2) */}
                          <div className="flex items-center justify-between gap-3 mb-3">
                            <div className="flex items-center gap-3">
                              {post.authorAvatar ? (
                                <img
                                  src={post.authorAvatar}
                                  alt={post.authorName}
                                  className="w-10 h-10 rounded-full object-cover border border-slate-100 shadow-2xs"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-[#EEF2FF] text-[#4F46E5] font-black text-sm flex items-center justify-center border border-indigo-100">
                                  {post.authorName[0]}
                                </div>
                              )}
                              <div>
                                <h3 className="font-extrabold text-sm text-slate-900 leading-tight">
                                  {post.authorName}
                                </h3>
                                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                                  <span>{post.timeAgo}</span>
                                  {post.authorLocation && (
                                    <>
                                      <span>·</span>
                                      <span className="truncate max-w-[140px]">{post.authorLocation}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Three dots menu */}
                            <button className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Post Title & Text */}
                          {post.title && (
                            <h4 className="font-black text-sm text-slate-900 mb-1 leading-snug">
                              {post.title}
                            </h4>
                          )}
                          <p className="text-xs text-slate-700 leading-relaxed font-normal">
                            {post.content}
                          </p>

                          {/* Optional Media Image with Rounded Corners (Matching Image Screen 2 Milo Dog Photo) */}
                          {post.image && (
                            <div className="mt-3 rounded-2xl overflow-hidden bg-slate-100 border border-slate-100">
                              <img
                                src={post.image}
                                alt="Post media"
                                className="w-full h-auto max-h-72 object-cover"
                              />
                            </div>
                          )}

                          {/* Interactive Action Row (👍 9.4k · 💬 120 · ↗️ 17) Matching Image Screen 2 */}
                          <div className="flex items-center gap-6 mt-4 pt-3 border-t border-slate-50 text-slate-500 text-xs font-bold">
                            {/* Like Button */}
                            <button
                              onClick={() => handleLikePost(post.id)}
                              className={`flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95 ${
                                post.isLiked ? 'text-rose-600 font-black' : 'text-slate-500 hover:text-slate-800'
                              }`}
                            >
                              <Heart className={`w-4 h-4 ${post.isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                              <span>{post.likes}</span>
                            </button>

                            {/* Comment Button (Opens Screen 3 Comments View) */}
                            <button
                              onClick={() => setActiveCommentsPost(post)}
                              className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer active:scale-95"
                            >
                              <MessageCircle className="w-4 h-4" />
                              <span>{post.commentsCount}</span>
                            </button>

                            {/* Share Button */}
                            <button className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer">
                              <Share2 className="w-4 h-4" />
                              <span>{post.shares}</span>
                            </button>
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              )}

              {/* ======================================================= */}
              {/* TAB: EVENTS                                            */}
              {/* ======================================================= */}
              {activeTab === 'Events' && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  {events.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs bg-white rounded-3xl border border-slate-100">
                      No upcoming subdivision events scheduled.
                    </div>
                  ) : (
                    events.map(evt => (
                      <div key={evt.id} className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm flex items-start gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 flex flex-col items-center justify-center shrink-0 border border-indigo-100">
                          <span className="text-[9px] uppercase font-bold text-indigo-500">
                            {new Date(evt.date || Date.now()).toLocaleDateString('en-US', { month: 'short' })}
                          </span>
                          <span className="text-base font-black leading-tight">
                            {new Date(evt.date || Date.now()).getDate()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-extrabold text-sm text-slate-900 truncate">{evt.title}</h4>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{evt.description}</p>
                          <div className="flex items-center gap-2 mt-2 text-[10.5px] text-slate-400 font-medium">
                            <Clock className="w-3.5 h-3.5 text-teal-600" />
                            <span>{new Date(evt.date || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {evt.location && <span>• {evt.location}</span>}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 3: DEDICATED COMMENTS VIEW (SCREEN 3 IN REFERENCE IMAGE)   */}
        {/* ============================================================== */}
        {activeCommentsPost && (
          <div className="flex-1 flex flex-col h-full bg-[#FAFAFC] animate-in slide-in-from-right duration-200">
            {/* Top Bar with Back Arrow, "Comments", Three-Dot Menu (Matching Image Screen 3) */}
            <header className="sticky top-0 z-30 bg-[#FAFAFC]/95 backdrop-blur-md px-4 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <button
                onClick={() => setActiveCommentsPost(null)}
                className="p-1.5 -ml-1 text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h2 className="font-black text-sm text-slate-900 tracking-tight">Comments</h2>
              <button className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
                <MoreVertical className="w-4 h-4" />
              </button>
            </header>

            {/* Scrollable Post Snippet & Comments List */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 pb-28">
              
              {/* Original Post Card Preview with Engagement Stats */}
              <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm space-y-3">
                <div className="flex items-center gap-3">
                  {activeCommentsPost.authorAvatar ? (
                    <img src={activeCommentsPost.authorAvatar} alt="" className="w-9 h-9 rounded-full object-cover border" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center">
                      {activeCommentsPost.authorName[0]}
                    </div>
                  )}
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900">{activeCommentsPost.authorName}</h4>
                    <span className="text-[10px] text-slate-400">{activeCommentsPost.timeAgo}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed font-normal">{activeCommentsPost.content}</p>

                {activeCommentsPost.image && (
                  <div className="rounded-2xl overflow-hidden bg-slate-100 max-h-48 border">
                    <img src={activeCommentsPost.image} alt="" className="w-full h-full object-cover" />
                  </div>
                )}

                <div className="flex items-center gap-6 pt-2 border-t border-slate-50 text-xs font-bold text-slate-400">
                  <span className="flex items-center gap-1.5 text-rose-600">
                    <Heart className="w-4 h-4 fill-rose-500 text-rose-500" /> {activeCommentsPost.likes}
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <MessageCircle className="w-4 h-4" /> {activeCommentsPost.commentsCount}
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <Share2 className="w-4 h-4" /> {activeCommentsPost.shares}
                  </span>
                </div>
              </div>

              {/* Comments Thread List (Rabart Chies, Miles Sather, Karlos Bunny in Image Screen 3) */}
              <div className="space-y-3 pt-1">
                {(activeCommentsPost.comments || []).map(comment => (
                  <div key={comment.id} className="flex items-start gap-3 bg-white p-3.5 rounded-2xl border border-slate-100 shadow-2xs">
                    {comment.authorAvatar ? (
                      <img src={comment.authorAvatar} alt="" className="w-8 h-8 rounded-full object-cover shrink-0 border" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                        {comment.authorName[0]}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h5 className="font-extrabold text-xs text-slate-900">{comment.authorName}</h5>
                        <span className="text-[10px] text-slate-400 shrink-0">{comment.timeAgo}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed font-normal">{comment.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sticky Bottom Comment Bar with Circular Send Button (Exact Match to Image Screen 3) */}
            <form onSubmit={handleAddComment} className="fixed sm:absolute bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md px-4 py-3 border-t border-slate-200/80 flex items-center gap-2.5">
              {profile?.profileImage ? (
                <img src={profile.profileImage} alt="" className="w-8 h-8 rounded-full object-cover shrink-0 border" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center shrink-0">
                  {profile?.name?.[0] || 'U'}
                </div>
              )}

              <input
                type="text"
                value={commentInput}
                onChange={e => setCommentInput(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 bg-slate-100 px-4 py-2.5 rounded-full text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/40"
              />

              {/* Blue Circular Send Button with Airplane Icon (Matching Image Screen 3) */}
              <button
                type="submit"
                disabled={!commentInput.trim()}
                className="w-10 h-10 rounded-full bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-40 disabled:hover:bg-[#4F46E5] text-white flex items-center justify-center shadow-md shadow-indigo-500/30 transition-all cursor-pointer shrink-0 active:scale-95"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </button>
            </form>
          </div>
        )}

        {/* ============================================================== */}
        {/* BOTTOM MOBILE APP DOCK (MATCHING SCREEN 2 FLOATING DOCK)        */}
        {/* ============================================================== */}
        {!activeCommentsPost && (
          <nav className="fixed sm:absolute bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-lg px-3 py-2 flex items-center justify-around">
            {/* Home / Feed */}
            <button
              onClick={() => {
                setBottomNav('home');
                setActiveTab('Feed');
              }}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all cursor-pointer ${
                bottomNav === 'home' ? 'text-[#4F46E5] font-black' : 'text-slate-400 hover:text-slate-700 font-medium'
              }`}
            >
              <div className={`p-1 rounded-full ${bottomNav === 'home' ? 'bg-[#EEF2FF]' : ''}`}>
                <CasaMiraLogo className="w-5 h-5" variant="badge" />
              </div>
              <span className="text-[10px] tracking-tight">Home</span>
            </button>

            {/* Dues */}
            <button
              onClick={() => {
                setBottomNav('dues');
                setActiveTab('Dues');
              }}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all cursor-pointer ${
                bottomNav === 'dues' ? 'text-[#4F46E5] font-black' : 'text-slate-400 hover:text-slate-700 font-medium'
              }`}
            >
              <Receipt className="w-5 h-5" />
              <span className="text-[10px] tracking-tight">Dues</span>
            </button>

            {/* Elevated Center Gate Pass */}
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

            {/* Market */}
            <button
              onClick={() => {
                setBottomNav('market');
                setActiveTab('Market');
              }}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all cursor-pointer ${
                bottomNav === 'market' ? 'text-[#4F46E5] font-black' : 'text-slate-400 hover:text-slate-700 font-medium'
              }`}
            >
              <Store className="w-5 h-5" />
              <span className="text-[10px] tracking-tight">Market</span>
            </button>

            {/* Profile & Settings */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all cursor-pointer ${
                bottomNav === 'profile' ? 'text-[#4F46E5] font-black' : 'text-slate-400 hover:text-slate-700 font-medium'
              }`}
            >
              {profile?.profileImage ? (
                <img src={profile.profileImage} alt="" className="w-5 h-5 rounded-full object-cover border" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center">
                  {profile?.name?.[0] || 'U'}
                </div>
              )}
              <span className="text-[10px] tracking-tight">Profile</span>
            </button>
          </nav>
        )}
      </div>

      {/* ============================================================== */}
      {/* CREATE POST MODAL SHEET (Triggered by Blue + Button)            */}
      {/* ============================================================== */}
      {isCreatePostOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in" onClick={() => setIsCreatePostOpen(false)}>
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-5 shadow-2xl space-y-4 animate-in slide-in-from-bottom duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-sm text-slate-900">Create Community Post</h3>
              <button onClick={() => setIsCreatePostOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePostSubmit} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Category</label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {[
                    { id: 'FEED', label: 'Community' },
                    { id: 'QUESTION', label: 'Question' },
                    { id: 'MARKET', label: 'Marketplace' },
                  ].map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setNewPostCategory(c.id as any)}
                      className={`py-2 px-3 rounded-xl font-bold transition-all text-center cursor-pointer ${
                        newPostCategory === c.id ? 'bg-[#4F46E5] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">What's on your mind?</label>
                <textarea
                  rows={4}
                  required
                  value={newPostText}
                  onChange={e => setNewPostText(e.target.value)}
                  placeholder="Share a neighborhood update, recommendation, or question..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Image URL (Optional)</label>
                <input
                  type="url"
                  value={newPostImage}
                  onChange={e => setNewPostImage(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-black text-xs rounded-2xl shadow-md transition-all active:scale-95 cursor-pointer"
              >
                Publish to Community Feed
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 1-TAP PAY SOA MODAL (For settling dues from mobile view)         */}
      {/* ============================================================== */}
      {selectedBillForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-teal-700 uppercase block font-mono">GCash / BDO Settlement</span>
                <h4 className="font-black text-sm text-slate-900">{selectedBillForPayment.billingMonth}</h4>
              </div>
              <button onClick={() => setSelectedBillForPayment(null)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePaySubmit} className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Payable Total</span>
                <span className="text-2xl font-black text-slate-900 font-mono block">₱{selectedBillForPayment.totalAmount}</span>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">GCash / Bank Reference #</label>
                <input
                  type="text"
                  required
                  value={paymentRef}
                  onChange={e => setPaymentRef(e.target.value)}
                  placeholder="e.g. 10023491823"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono text-xs outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Upload Receipt Screenshot</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => setPaymentProof(reader.result as string);
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                />
              </div>

              <button
                type="submit"
                disabled={paymentSubmitting}
                className="w-full py-3 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-black text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {paymentSubmitting ? 'Submitting Receipt...' : 'Confirm Payment Submission'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
