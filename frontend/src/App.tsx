import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AcceptInvitePage from './pages/AcceptInvitePage';
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
import ErrorBoundary from './components/ErrorBoundary';
import { debugLogger } from './utils/debugLogger';
import { migrateFromLocalStorage } from './utils/authMigration';
import { cleanupExpiredDrafts } from './utils/draftStorage';
import { useAuthStore } from './store/authStore';
import {
  getQueryClient,
  getQueryPersister,
  getMaxCacheAge,
  PersistQueryClientProvider,
  dehydrateQueryFilter,
} from './lib/queryClientSetup';

// Get the configured query client and persister for PWA offline support
const queryClient = getQueryClient();
const persister = getQueryPersister();
const maxAge = getMaxCacheAge();

function App() {
  const { initializeAuth, isInitialized } = useAuthStore();

  // Initialize auth on app mount (handles page refresh)
  useEffect(() => {
    // Migrate from localStorage to secure storage (one-time cleanup)
    migrateFromLocalStorage();
    // Clean up expired draft form data
    cleanupExpiredDrafts();
    // Initialize auth via silent refresh using httpOnly cookie
    initializeAuth();
  }, [initializeAuth]);

  // Global error handler for unhandled errors
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      debugLogger.error('🚨 Global unhandled error', event.error, {
        component: 'App',
        operation: 'window.onerror',
        data: {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack,
        },
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      debugLogger.error('🚨 Global unhandled promise rejection', event.reason, {
        component: 'App',
        operation: 'window.onunhandledrejection',
        data: {
          reason: event.reason,
          promise: event.promise,
        },
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    console.log('[DEBUG] Global error handlers installed');
    console.log('[DEBUG] Access window.__debugLogger.getRecentContext() to see recent debug logs');

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Show loading state while checking auth
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-50 dark:bg-navy-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-navy-600 dark:text-cream-200">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge,
        dehydrateOptions: {
          shouldDehydrateQuery: dehydrateQueryFilter,
        },
      }}
      onSuccess={() => {
        // Called when the cache has been restored
        console.log('[QueryPersist] Cache restored from IndexedDB');
      }}
    >
      <BrowserRouter>
        <ErrorBoundary
          onError={(error, errorInfo) => {
            debugLogger.error('ErrorBoundary caught error', error, {
              component: 'App',
              operation: 'ErrorBoundary',
              data: { componentStack: errorInfo.componentStack },
            });
          }}
        >
          <ScrollToTop />
          <Toaster position="top-right" containerClassName="z-[100]" />
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
              <Route path="/accept-invite" element={<AcceptInvitePage />} />
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
                    <ErrorBoundary>
                      <TripDetailPage />
                    </ErrorBoundary>
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
                    <ErrorBoundary>
                      <AlbumDetailPage />
                    </ErrorBoundary>
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
        </ErrorBoundary>
      </BrowserRouter>
    </PersistQueryClientProvider>
  );
}

export default App;
