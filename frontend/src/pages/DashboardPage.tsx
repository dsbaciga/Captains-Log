import { useAuthStore } from '../store/authStore';
import { useNavigate, Link } from 'react-router-dom';
import PlacesVisitedMap from '../components/PlacesVisitedMap';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Dashboard</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-8">
            Welcome to Captain's Log, {user?.username}! Your travel documentation platform is ready.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link
              to="/trips"
              className="p-6 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-lg transition-all cursor-pointer group bg-white dark:bg-gray-800"
            >
              <div className="text-4xl mb-3">🗺️</div>
              <h3 className="font-semibold text-lg mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 text-gray-900 dark:text-white">Trips</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Create and manage your trips</p>
            </Link>
            <Link
              to="/trips"
              className="p-6 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-lg transition-all cursor-pointer group bg-white dark:bg-gray-800"
            >
              <div className="text-4xl mb-3">📸</div>
              <h3 className="font-semibold text-lg mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 text-gray-900 dark:text-white">Photos</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Upload and organize photos from your trips</p>
            </Link>
            <div className="p-6 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700">
              <div className="text-4xl mb-3 opacity-50">📔</div>
              <h3 className="font-semibold text-lg mb-2 text-gray-400 dark:text-gray-500">Journal</h3>
              <p className="text-gray-500 dark:text-gray-600 text-sm">Write about your adventures (Coming soon)</p>
            </div>
          </div>
        </div>

        <PlacesVisitedMap />
      </main>
    </div>
  );
}
