import { useAuthStore } from '../store/authStore';
import { useNavigate, Link } from 'react-router-dom';
import PlacesVisitedMap from '../components/PlacesVisitedMap';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream to-parchment dark:from-navy-900 dark:to-navy-800">
      <main className="max-w-7xl mx-auto px-6 py-16 pt-24">
        {/* Hero Section */}
        <div className="mb-16 animate-fade-in-up">
          <h1 className="text-5xl md:text-7xl font-display font-bold text-primary-600 dark:text-gold tracking-tight leading-none mb-4">
            Welcome back,<br />
            <span className="text-accent-500 dark:text-warm-gray">{user?.username}</span>
          </h1>
          <p className="text-xl text-slate dark:text-warm-gray font-body max-w-2xl">
            Your adventures await. Continue documenting your journey.
          </p>
        </div>

        {/* Staggered Card Grid */}
        <div className="grid grid-cols-12 gap-6 mb-12">
          {/* Large featured card - Trips */}
          <Link
            to="/trips"
            className="col-span-12 md:col-span-7 group animate-fade-in-up stagger-1"
          >
            <div className="h-80 bg-white/80 dark:bg-navy-800/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-primary-500/10 dark:border-gold/10 hover:border-accent-400 dark:hover:border-accent-400 relative overflow-hidden">
              <div className="relative z-10">
                <div className="text-6xl mb-4">🗺️</div>
                <h3 className="text-3xl font-display font-bold mb-3 text-primary-600 dark:text-gold group-hover:text-accent-500 dark:group-hover:text-accent-400 transition-colors">
                  Your Trips
                </h3>
                <p className="text-slate dark:text-warm-gray font-body text-lg">
                  Plan, document, and relive your journeys
                </p>
              </div>

              {/* Hover arrow */}
              <div className="absolute bottom-8 right-8 w-12 h-12 rounded-full bg-accent-500 dark:bg-accent-400 flex items-center justify-center transform translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          {/* Smaller cards column */}
          <div className="col-span-12 md:col-span-5 space-y-6">
            {/* Photos card */}
            <Link
              to="/trips"
              className="block group animate-fade-in-up stagger-2"
            >
              <div className="h-36 bg-white/80 dark:bg-navy-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-primary-500/10 dark:border-gold/10 hover:border-accent-400 dark:hover:border-accent-400 relative overflow-hidden">
                <div className="flex items-center space-x-4">
                  <div className="text-4xl">📸</div>
                  <div>
                    <h3 className="text-xl font-display font-bold text-primary-600 dark:text-gold group-hover:text-accent-500 dark:group-hover:text-accent-400 transition-colors">
                      Photos
                    </h3>
                    <p className="text-slate dark:text-warm-gray font-body text-sm">
                      Capture your memories
                    </p>
                  </div>
                </div>
              </div>
            </Link>

            {/* Companions card */}
            <Link
              to="/companions"
              className="block group animate-fade-in-up stagger-3"
            >
              <div className="h-36 bg-white/80 dark:bg-navy-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-primary-500/10 dark:border-gold/10 hover:border-accent-400 dark:hover:border-accent-400 relative overflow-hidden">
                <div className="flex items-center space-x-4">
                  <div className="text-4xl">👥</div>
                  <div>
                    <h3 className="text-xl font-display font-bold text-primary-600 dark:text-gold group-hover:text-accent-500 dark:group-hover:text-accent-400 transition-colors">
                      Companions
                    </h3>
                    <p className="text-slate dark:text-warm-gray font-body text-sm">
                      Travel companions
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Additional cards row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Link
            to="/places-visited"
            className="block group animate-fade-in-up stagger-4"
          >
            <div className="h-36 bg-white/80 dark:bg-navy-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-primary-500/10 dark:border-gold/10 hover:border-accent-400 dark:hover:border-accent-400 relative overflow-hidden">
              <div className="flex items-center space-x-4">
                <div className="text-4xl">📍</div>
                <div>
                  <h3 className="text-xl font-display font-bold text-primary-600 dark:text-gold group-hover:text-accent-500 dark:group-hover:text-accent-400 transition-colors">
                    Places Visited
                  </h3>
                  <p className="text-slate dark:text-warm-gray font-body text-sm">
                    Explore your map
                  </p>
                </div>
              </div>
            </div>
          </Link>

          <Link
            to="/checklists"
            className="block group animate-fade-in-up stagger-5"
          >
            <div className="h-36 bg-white/80 dark:bg-navy-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-primary-500/10 dark:border-gold/10 hover:border-accent-400 dark:hover:border-accent-400 relative overflow-hidden">
              <div className="flex items-center space-x-4">
                <div className="text-4xl">✅</div>
                <div>
                  <h3 className="text-xl font-display font-bold text-primary-600 dark:text-gold group-hover:text-accent-500 dark:group-hover:text-accent-400 transition-colors">
                    Checklists
                  </h3>
                  <p className="text-slate dark:text-warm-gray font-body text-sm">
                    Stay organized
                  </p>
                </div>
              </div>
            </div>
          </Link>

          <Link
            to="/settings"
            className="block group animate-fade-in-up stagger-5"
          >
            <div className="h-36 bg-white/80 dark:bg-navy-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-primary-500/10 dark:border-gold/10 hover:border-accent-400 dark:hover:border-accent-400 relative overflow-hidden">
              <div className="flex items-center space-x-4">
                <div className="text-4xl">⚙️</div>
                <div>
                  <h3 className="text-xl font-display font-bold text-primary-600 dark:text-gold group-hover:text-accent-500 dark:group-hover:text-accent-400 transition-colors">
                    Settings
                  </h3>
                  <p className="text-slate dark:text-warm-gray font-body text-sm">
                    Customize your experience
                  </p>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Map section */}
        <div className="animate-fade-in-up">
          <PlacesVisitedMap />
        </div>
      </main>
    </div>
  );
}
