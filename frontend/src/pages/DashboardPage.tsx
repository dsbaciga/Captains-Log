import { useAuthStore } from '../store/authStore';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import UpcomingTripsWidget from '../components/widgets/UpcomingTripsWidget';
import TravelStatsWidget from '../components/widgets/TravelStatsWidget';
import RecentPhotosWidget from '../components/widgets/RecentPhotosWidget';
import QuickActionsWidget from '../components/widgets/QuickActionsWidget';
import { usePullToRefresh, PullToRefreshIndicator } from '../hooks/usePullToRefresh';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = async () => {
    // Trigger refresh by updating key (causes widgets to reload)
    await new Promise(resolve => setTimeout(resolve, 500)); // Minimum refresh time for better UX
    setRefreshKey(prev => prev + 1);
  };

  const [containerRef, { pullDistance, isRefreshing }] = usePullToRefresh<HTMLDivElement>({
    onRefresh: handleRefresh,
    threshold: 80,
  });

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-gradient-to-br from-cream to-parchment dark:from-navy-900 dark:to-navy-800 overflow-y-auto"
    >
      <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />
      <main className="max-w-7xl mx-auto px-6 py-16 pt-24">
        {/* Hero Section */}
        <div className="mb-12 animate-fade-in">
          <h1 className="text-5xl md:text-7xl font-display font-bold text-primary-600 dark:text-sky tracking-tight leading-none mb-4">
            Welcome back,<br />
            <span className="text-accent-500 dark:text-warm-gray">{user?.username}</span>
          </h1>
          <p className="text-xl text-slate dark:text-warm-gray font-body max-w-2xl">
            Your adventures await. Continue documenting your journey.
          </p>
        </div>

        {/* Widgets Grid */}
        <div key={refreshKey} className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
          {/* Upcoming Trips - Takes 2 columns on xl screens */}
          <div className="xl:col-span-2 animate-fade-in">
            <UpcomingTripsWidget />
          </div>

          {/* Travel Stats */}
          <div className="animate-fade-in stagger-1">
            <TravelStatsWidget />
          </div>

          {/* Recent Photos - Takes 2 columns on xl screens */}
          <div className="xl:col-span-2 animate-fade-in stagger-2">
            <RecentPhotosWidget />
          </div>

          {/* Quick Actions */}
          <div className="animate-fade-in stagger-3">
            <QuickActionsWidget />
          </div>
        </div>

        {/* Quick Links Section */}
        <div className="mb-8 animate-fade-in stagger-4">
          <h2 className="text-2xl font-display font-bold text-gray-900 dark:text-white mb-4">
            Quick Links
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              to="/trips"
              className="block group"
            >
              <div className="h-24 bg-white/80 dark:bg-navy-800/80 backdrop-blur-sm rounded-xl p-4 shadow-md hover:shadow-lg transition-all duration-300 border-2 border-primary-500/10 dark:border-sky/10 hover:border-accent-400 dark:hover:border-accent-400">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">🗺️</div>
                  <div>
                    <h3 className="font-display font-bold text-primary-600 dark:text-sky group-hover:text-accent-500 dark:group-hover:text-accent-400 transition-colors">
                      Trips
                    </h3>
                    <p className="text-xs text-slate dark:text-warm-gray">
                      View all trips
                    </p>
                  </div>
                </div>
              </div>
            </Link>

            <Link
              to="/companions"
              className="block group"
            >
              <div className="h-24 bg-white/80 dark:bg-navy-800/80 backdrop-blur-sm rounded-xl p-4 shadow-md hover:shadow-lg transition-all duration-300 border-2 border-primary-500/10 dark:border-sky/10 hover:border-accent-400 dark:hover:border-accent-400">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">👥</div>
                  <div>
                    <h3 className="font-display font-bold text-primary-600 dark:text-sky group-hover:text-accent-500 dark:group-hover:text-accent-400 transition-colors">
                      Companions
                    </h3>
                    <p className="text-xs text-slate dark:text-warm-gray">
                      Travel buddies
                    </p>
                  </div>
                </div>
              </div>
            </Link>

            <Link
              to="/places-visited"
              className="block group"
            >
              <div className="h-24 bg-white/80 dark:bg-navy-800/80 backdrop-blur-sm rounded-xl p-4 shadow-md hover:shadow-lg transition-all duration-300 border-2 border-primary-500/10 dark:border-sky/10 hover:border-accent-400 dark:hover:border-accent-400">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">📍</div>
                  <div>
                    <h3 className="font-display font-bold text-primary-600 dark:text-sky group-hover:text-accent-500 dark:group-hover:text-accent-400 transition-colors">
                      Places
                    </h3>
                    <p className="text-xs text-slate dark:text-warm-gray">
                      Explore map
                    </p>
                  </div>
                </div>
              </div>
            </Link>

            <Link
              to="/checklists"
              className="block group"
            >
              <div className="h-24 bg-white/80 dark:bg-navy-800/80 backdrop-blur-sm rounded-xl p-4 shadow-md hover:shadow-lg transition-all duration-300 border-2 border-primary-500/10 dark:border-sky/10 hover:border-accent-400 dark:hover:border-accent-400">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">✅</div>
                  <div>
                    <h3 className="font-display font-bold text-primary-600 dark:text-sky group-hover:text-accent-500 dark:group-hover:text-accent-400 transition-colors">
                      Checklists
                    </h3>
                    <p className="text-xs text-slate dark:text-warm-gray">
                      Stay organized
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
