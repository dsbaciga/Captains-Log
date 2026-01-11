import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import TripsPage from './pages/TripsPage';
import TripFormPage from './pages/TripFormPage';
import TripDetailPage from './pages/TripDetailPage';
import AlbumDetailPage from './pages/AlbumDetailPage';
import GlobalAlbumsPage from './pages/GlobalAlbumsPage';
import CompanionsPage from './pages/CompanionsPage';
import PlacesVisitedPage from './pages/PlacesVisitedPage';
import SettingsPage from './pages/SettingsPage';
import ChecklistsPage from './pages/ChecklistsPage';
import ChecklistDetailPage from './pages/ChecklistDetailPage';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import MobileBottomNav from './components/MobileBottomNav';
import ScrollToTop from './components/ScrollToTop';

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Toaster position="top-right" />
      {/* Skip to content link for accessibility */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <Navbar />
      <main id="main-content" className="pt-16 sm:pt-20 pb-16 md:pb-0" tabIndex={-1}>
        <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/trips"
          element={
            <ProtectedRoute>
              <TripsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/trips/new"
          element={
            <ProtectedRoute>
              <TripFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/trips/:id"
          element={
            <ProtectedRoute>
              <TripDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/trips/:id/edit"
          element={
            <ProtectedRoute>
              <TripFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/trips/:tripId/albums/:albumId"
          element={
            <ProtectedRoute>
              <AlbumDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/albums"
          element={
            <ProtectedRoute>
              <GlobalAlbumsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/companions"
          element={
            <ProtectedRoute>
              <CompanionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/places-visited"
          element={
            <ProtectedRoute>
              <PlacesVisitedPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/checklists"
          element={
            <ProtectedRoute>
              <ChecklistsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/checklists/:id"
          element={
            <ProtectedRoute>
              <ChecklistDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        </Routes>
      </main>
      <MobileBottomNav />
    </BrowserRouter>
  );
}

export default App;
