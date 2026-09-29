import React, { useEffect, useState } from 'react';
import { useAuth } from '../components/AuthContext';
import { auth } from '../lib/firebase';
import { Store, Tag, MapPin, Phone, User, CheckCircle2, X, Plus, Sparkles, MessageSquare, PhoneCall, ShieldCheck, Image, Info, Star, Trash2, Award } from 'lucide-react';
import { BadgeList } from '../components/BadgePill';

interface ListingItem {
  id: number;
  sellerId: number;
  title: string;
  description: string;
  price: string;
  category: string;
  image: string;
  status: string;
  featured?: boolean;
  createdAt: string;
  sellerName: string;
  sellerImage: string;
  sellerCover: string;
  sellerBlockLot: string;
  sellerPhone: string;
  sellerSkills: string;
  sellerServices: string;
  sellerRole: string;
  sellerEmail: string;
  sellerBadges?: string;
}

export default function Marketplace() {
  const { token, profile } = useAuth();
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedItem, setSelectedItem] = useState<ListingItem | null>(null);

  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const isAdmin = profile?.role === 'ADMIN' || profile?.role === 'SUPERADMIN';

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: 'Food & Bakery',
    image: ''
  });

  useEffect(() => {
    fetchListings();
  }, [token]);

  const fetchListings = async () => {
    try {
      let currentToken = token;
      if (auth.currentUser) {
        currentToken = await auth.currentUser.getIdToken();
      }
      const res = await fetch('/api/listings', { headers: currentToken ? { Authorization: `Bearer ${currentToken}` } : {} });
      if (res.ok) {
        const data = await res.json();
        setListings(Array.isArray(data) ? data : []);
      } else if (res.status === 401 && auth.currentUser) {
        const newToken = await auth.currentUser.getIdToken(true);
        const retryRes = await fetch('/api/listings', { headers: { Authorization: `Bearer ${newToken}` } });
        if (retryRes.ok) {
          const data = await retryRes.json();
          setListings(Array.isArray(data) ? data : []);
        } else {
          setListings([]);
        }
      } else {
        setListings([]);
      }
    } catch (e) {
      console.error(e);
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleFeatured = async (id: number, currentFeatured: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/admin/content/listings/${id}/featured`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ featured: !currentFeatured })
      });
      if (res.ok) fetchListings();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteListing = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this listing?')) return;
    try {
      const res = await fetch(`/api/listings/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchListings();
    } catch (err) {
      console.error(err);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Image exceeds the maximum allowed size of 2MB.");
        e.target.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData)
      });
      setShowForm(false);
      setFormData({ title: '', description: '', price: '', category: 'Food & Bakery', image: '' });
      fetchListings();
    } catch (e) {
      console.error(e);
    }
  };

  const categories = ['ALL', 'Food & Bakery', 'Services', 'Plants & Garden', 'Appliances', 'Furniture', 'Others'];

  const safeListings = Array.isArray(listings) ? listings : [];
  let filtered = selectedCategory === 'ALL'
    ? safeListings
    : safeListings.filter(item => item.category === selectedCategory);

  filtered = [...filtered].sort((a, b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return new Date(b.createdDate || 0).getTime() - new Date(a.createdDate || 0).getTime();
  });

  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = filtered.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif-luxury font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Casa Mira Resident Marketplace
            <span className="px-2.5 py-0.5 bg-teal-100 text-teal-800 text-xs font-bold rounded-full">
              Verified Neighbors
            </span>
          </h1>
          <p className="text-slate-500 text-sm">Buy, sell, and hire services from verified Casa Mira South residents.</p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setShowGuidelines(!showGuidelines)}
            className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all"
          >
            <Info className="w-4 h-4 text-amber-500" />
            <span>Posting Guidelines</span>
          </button>

          <button
            onClick={() => setShowForm(!showForm)}
            className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 transition-all"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            <span>{showForm ? 'Close Form' : 'Post Item or Service'}</span>
          </button>
        </div>
      </div>

      {/* Collapsible Marketplace Guidelines */}
      {showGuidelines && (
        <div className="bg-amber-50/90 border border-amber-200 p-5 rounded-3xl space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-amber-200/80 pb-2">
            <div className="flex items-center gap-2 text-amber-900 font-extrabold text-sm">
              <ShieldCheck className="w-5 h-5 text-amber-600" />
              <span>Casa Mira South Resident Marketplace Guidelines & Safety Rules</span>
            </div>
            <button onClick={() => setShowGuidelines(false)} className="text-amber-800 hover:text-amber-950 font-bold text-xs">
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-amber-950">
            <div className="p-3 bg-white/80 rounded-2xl border border-amber-100 space-y-1">
              <p className="font-bold text-amber-900">1. Verification Requirement</p>
              <p>Only verified HOA homeowners and residents can post listings or offer neighborhood services.</p>
            </div>
            <div className="p-3 bg-white/80 rounded-2xl border border-amber-100 space-y-1">
              <p className="font-bold text-amber-900">2. Clear Photos & Fair Pricing</p>
              <p>Include actual photos of your product/service banner. State exact prices with no hidden charges.</p>
            </div>
            <div className="p-3 bg-white/80 rounded-2xl border border-amber-100 space-y-1">
              <p className="font-bold text-amber-900">3. Community Safety Standards</p>
              <p>Prohibited items: illegal substances, hazardous materials, firearms, and false service claims.</p>
            </div>
          </div>
        </div>
      )}

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
              selectedCategory === cat
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Post Listing Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 shadow-xl rounded-3xl border border-slate-200 space-y-4 max-w-2xl mx-auto animate-in fade-in zoom-in-95">
          <h2 className="font-bold text-slate-900 text-base pb-2 border-b border-slate-100">Post New Item or Service Banner</h2>
          
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Product or Service Banner Photo</label>
            <p className="text-[10px] text-slate-500 mb-2">Recommended dimensions: 800x600 pixels (4:3 ratio) for best display. Maximum file size: 2MB.</p>
            <input type="file" accept="image/*" onChange={handleImageUpload} className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100" />
            {formData.image && <img src={formData.image} alt="Preview" className="mt-3 h-40 w-full object-cover rounded-2xl border border-slate-200" />}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Listing Title</label>
            <input required type="text" placeholder="e.g. Fresh Baked Mango Sansrival or AC Cleaning Service" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full rounded-xl border border-slate-200 p-3 text-xs focus:ring-2 focus:ring-teal-500 outline-none" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description & Specs</label>
            <textarea required rows={3} placeholder="Describe your product ingredients, delivery details, or service scope..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full rounded-xl border border-slate-200 p-3 text-xs focus:ring-2 focus:ring-teal-500 outline-none" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Price (PHP ₱)</label>
              <input required type="number" step="0.01" placeholder="e.g. 250" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full rounded-xl border border-slate-200 p-3 text-xs focus:ring-2 focus:ring-teal-500 outline-none" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
              <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full rounded-xl border border-slate-200 p-3 text-xs focus:ring-2 focus:ring-teal-500 outline-none bg-white">
                <option>Food & Bakery</option>
                <option>Services</option>
                <option>Plants & Garden</option>
                <option>Appliances</option>
                <option>Furniture</option>
                <option>Others</option>
              </select>
            </div>
          </div>

          <button type="submit" className="w-full px-4 py-3 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 shadow-md">
            Submit Marketplace Listing
          </button>
        </form>
      )}

      {/* Cards Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {paginatedItems.map((item) => (
          <div 
            key={item.id} 
            onClick={() => setSelectedItem(item)}
            className="bg-white overflow-hidden shadow-sm hover:shadow-xl rounded-3xl border border-slate-200/80 flex flex-col transition-all duration-200 cursor-pointer group"
          >
            {/* Banner Image */}
            <div className="h-48 bg-slate-100 relative overflow-hidden">
              {item.image ? (
                <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              ) : (
                <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-400">
                  <Store className="w-12 h-12 stroke-1" />
                </div>
              )}
              
              <div className="absolute top-3 right-3 px-3 py-1 bg-black/60 backdrop-blur-md text-white font-extrabold text-xs rounded-full shadow-md">
                ₱{item.price}
              </div>

              <div className="absolute top-3 left-3 flex flex-col gap-1 items-start">
                <span className="px-2.5 py-1 bg-white/90 backdrop-blur text-slate-800 font-bold text-[10px] rounded-full uppercase tracking-wider shadow-sm">
                  {item.category}
                </span>

                {item.featured && (
                  <span className="px-2.5 py-1 bg-amber-500 text-slate-950 font-black text-[10px] rounded-full uppercase tracking-wider shadow-md flex items-center gap-1">
                    <Star className="w-3 h-3 fill-slate-950" /> Featured Store
                  </span>
                )}
              </div>

              {/* Moderation / Owner Actions */}
              {(isAdmin || profile?.id === item.sellerId) && (
                <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-slate-900/80 backdrop-blur p-1 rounded-xl">
                  {isAdmin && (
                    <button
                      onClick={(e) => toggleFeatured(item.id, !!item.featured, e)}
                      title={item.featured ? 'Remove Featured Status' : 'Mark as Featured Store'}
                      className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${
                        item.featured ? 'bg-amber-400 text-slate-950' : 'text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <Award className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={(e) => deleteListing(item.id, e)}
                    title="Delete Listing"
                    className="p-1.5 rounded-lg text-red-400 hover:text-white hover:bg-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Listing Details */}
            <div className="p-5 flex-1 flex flex-col">
              <h3 className="text-base font-bold text-slate-900 group-hover:text-teal-700 transition-colors line-clamp-1 mb-1">
                {item.title}
              </h3>

              <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">
                {item.description}
              </p>

              {/* Seller Profile Footer Card */}
              <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center overflow-hidden border border-teal-200 shrink-0">
                    {item.sellerImage ? (
                      <img src={item.sellerImage} alt="" className="w-full h-full object-cover" />
                    ) : (
                      item.sellerName?.[0] || 'S'
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 line-clamp-1">{item.sellerName}</p>
                    <p className="text-[10px] text-slate-400">{item.sellerBlockLot}</p>
                    <div className="mt-1">
                      <BadgeList badges={item.sellerBadges} size="sm" limit={2} />
                    </div>
                  </div>
                </div>

                <span className="text-[10px] text-teal-600 font-bold hover:underline shrink-0 ml-1">View →</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Controls */}
      {totalItems > 0 && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-700">
          <div className="flex items-center gap-3">
            <span className="text-slate-500">
              Showing <span className="font-extrabold text-slate-900">{startIndex + 1}</span> to <span className="font-extrabold text-slate-900">{Math.min(startIndex + itemsPerPage, totalItems)}</span> of <span className="font-extrabold text-slate-900">{totalItems}</span> items
            </span>

            <div className="flex items-center gap-1.5 ml-2">
              <span className="text-slate-400">Show per page:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value={10}>10 items</option>
                <option value={20}>20 items</option>
                <option value={30}>30 items</option>
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

      {/* Seller & Item Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95">
            
            {/* Seller Profile Cover Header */}
            <div className="relative h-40 bg-slate-800">
              {selectedItem.sellerCover ? (
                <img src={selectedItem.sellerCover} alt="Cover" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-teal-700 to-emerald-800 flex items-center justify-center text-white/30 font-bold">
                  Casa Mira Verified Resident Seller
                </div>
              )}
              <div className="absolute inset-0 bg-black/30" />

              <button 
                onClick={() => setSelectedItem(null)}
                className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Seller Avatar Overlap */}
            <div className="px-6 relative pb-4">
              <div className="flex items-end justify-between -mt-10 mb-4">
                <div className="w-20 h-20 rounded-full border-4 border-white shadow-md bg-slate-100 overflow-hidden flex items-center justify-center">
                  {selectedItem.sellerImage ? (
                    <img src={selectedItem.sellerImage} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full bg-teal-100 text-teal-800 font-bold text-xl flex items-center justify-center">
                      {selectedItem.sellerName?.[0]}
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-teal-50 text-teal-700 border border-teal-200 text-xs font-bold rounded-full">
                    <ShieldCheck className="w-3.5 h-3.5" /> Verified Casa Mira Resident
                  </span>
                </div>
              </div>

              {/* Seller Information */}
              <div className="mb-4">
                <h3 className="text-lg font-bold text-slate-900">{selectedItem.sellerName}</h3>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-teal-600" /> {selectedItem.sellerBlockLot}
                </p>
                <div className="mt-2">
                  <BadgeList badges={selectedItem.sellerBadges} size="md" />
                </div>

                {(selectedItem.sellerSkills || selectedItem.sellerServices) && (
                  <div className="mt-2 p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                    {selectedItem.sellerSkills && (
                      <p><span className="font-bold text-slate-700">Specialties:</span> {selectedItem.sellerSkills}</p>
                    )}
                    {selectedItem.sellerServices && (
                      <p><span className="font-bold text-slate-700">Services Offered:</span> {selectedItem.sellerServices}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Item Card Box */}
              <div className="p-4 bg-teal-50/50 border border-teal-100 rounded-2xl flex flex-col sm:flex-row gap-4 mb-4">
                {selectedItem.image && (
                  <img src={selectedItem.image} alt="" className="w-full sm:w-32 h-32 object-cover rounded-xl shrink-0" />
                )}
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700">{selectedItem.category}</span>
                      <h4 className="font-bold text-base text-slate-900">{selectedItem.title}</h4>
                    </div>
                    <span className="text-lg font-extrabold text-teal-700">₱{selectedItem.price}</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed mt-2">{selectedItem.description}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex gap-2">
                {selectedItem.sellerPhone && selectedItem.sellerPhone !== 'N/A' ? (
                  <a
                    href={`tel:${selectedItem.sellerPhone}`}
                    className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm"
                  >
                    <PhoneCall className="w-4 h-4" /> Call / SMS Seller ({selectedItem.sellerPhone})
                  </a>
                ) : (
                  <div className="flex-1 py-3 bg-slate-100 text-slate-500 font-bold text-xs rounded-xl text-center">
                    Phone number not publicly provided
                  </div>
                )}

                <button
                  onClick={() => setSelectedItem(null)}
                  className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
