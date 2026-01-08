import './App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useDynamicFavicon } from './hooks/use-dynamic-favicon';

import { PublicWorkshopsList } from './pages/PublicWorkshopsList';
import { WorkshopDetail } from './pages/WorkshopDetail';
import { WorkshopDetailOrganizer } from './pages/WorkshopDetailOrganizer';
import { WorkshopRegistration } from './pages/WorkshopRegistration';
import { Login } from './pages/Login';
import { Home } from './pages/Home';
import { Dashboard } from './pages/Dashboard';
import { UserProfile } from './pages/UserProfile';
import { ProfileWorkshops } from './pages/ProfileWorkshops';
import { MyJourney } from './pages/MyJourney';
import { Accounting } from './pages/Accounting';
import { Formation } from './pages/Formation';
import { ResourcesFDFP } from './pages/ResourcesFDFP';
import { ResourcesHD } from './pages/ResourcesHD';
import { Shop } from './pages/Shop';
import { Support } from './pages/Support';
import { Settings } from './pages/Settings';
import { ExchangeParticipation } from './pages/ExchangeParticipation';
import { AdminConsole } from './pages/AdminConsole';
import { AdminConfiguration } from './pages/AdminConfiguration';
import { SuperAdminConsole } from './pages/SuperAdminConsole';
import { Toaster } from './components/ui/toaster';
import { Toaster as Sonner } from './components/ui/sonner';

function LoginRedirect() {
  const { profile } = useAuth();

  // Si l'utilisateur est déjà connecté, rediriger vers /home
  if (profile) {
    return <Navigate to="/home" replace />;
  }

  // Toujours afficher la page Login - elle gère son propre état
  // Ne pas retourner null pendant le loading pour éviter l'écran blanc
  return <Login />;
}

function FormationRedirectFDFP() {
  return <Navigate to="/formation/FDFP" replace />;
}

function FormationRedirectHD() {
  return <Navigate to="/formation/HD" replace />;
}

function AppContent() {
  useDynamicFavicon();

  return (
    <Routes>
          {/* Routes publiques */}
          <Route path="/" element={<PublicWorkshopsList />} />
          <Route path="/login" element={<LoginRedirect />} />
          <Route path="/workshops/:id" element={<WorkshopDetail />} />
          <Route path="/workshops/:id/register" element={<WorkshopRegistration />} />

          {/* Toutes les routes protégées partagent le même layout */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            {/* Ici commencent les routes AVEC sidebar + layout */}

            <Route path="/home" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<UserProfile />} />
            <Route path="/profile/workshops" element={<ProfileWorkshops />} />
            <Route path="/my-journey" element={<MyJourney />} />
            <Route path="/accounting" element={<Accounting />} />
            <Route path="/formation/:familyCode" element={<Formation />} />
            <Route path="/app/parcours/fdfp" element={<FormationRedirectFDFP />} />
            <Route path="/app/parcours/hd" element={<FormationRedirectHD />} />
            <Route path="/resources/fdfp" element={<ResourcesFDFP />} />
            <Route path="/resources/hd" element={<ResourcesHD />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/support" element={<Support />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/participations/:id/exchange" element={<ExchangeParticipation />} />
            <Route path="/admin" element={<AdminConsole />} />
            <Route path="/admin/config" element={<AdminConfiguration />} />
            <Route path="/super-admin" element={<SuperAdminConsole />} />

            {/* Atelier côté organisateur, dans le même layout */}
            <Route path="/organizer/workshops/:id" element={<WorkshopDetailOrganizer />} />
          </Route>
        </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
        <Toaster />
        <Sonner />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;