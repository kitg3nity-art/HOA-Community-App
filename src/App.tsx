import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Announcements from './pages/Announcements';
import Directory from './pages/Directory';
import Marketplace from './pages/Marketplace';
import Events from './pages/Events';
import Reports from './pages/Reports';
import MemoryVault from './pages/MemoryVault';
import AIAssistant from './pages/AIAssistant';
import Admin from './pages/Admin';
import Billings from './pages/Billings';
import GuardVerify from './pages/GuardVerify';
import PetRegistry from './pages/PetRegistry';
import MapDirectory from './pages/Map';
import CasaMiraLogo from './components/CasaMiraLogo';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, token, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="relative mb-4">
          <CasaMiraLogo className="w-16 h-16 animate-pulse" variant="badge" />
          <div className="absolute -inset-1 rounded-3xl border-2 border-teal-500/40 animate-spin border-t-transparent pointer-events-none" />
        </div>
        <p className="text-xs font-black text-amber-400 uppercase tracking-widest">Casa Mira South</p>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Loading Community Portal...</p>
      </div>
    );
  }

  const isAuthenticated = !!user || (!!token && !!profile);
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/verify-pass" element={<GuardVerify />} />
          <Route path="/guard-verify" element={<GuardVerify />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="announcements" element={<Announcements />} />
            <Route path="directory" element={<Directory />} />
            <Route path="marketplace" element={<Marketplace />} />
            <Route path="events" element={<Events />} />
            <Route path="reports" element={<Reports />} />
            <Route path="memory-vault" element={<MemoryVault />} />
            <Route path="assistant" element={<AIAssistant />} />
            <Route path="map" element={<MapDirectory />} />
            <Route path="billings" element={<Billings />} />
            <Route path="pets" element={<PetRegistry />} />
            <Route path="admin" element={<Admin />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
