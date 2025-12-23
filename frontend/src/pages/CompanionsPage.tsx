import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import companionService from '../services/companion.service';
import tripService from '../services/trip.service';
import type { Companion } from '../types/companion';
import type { Trip } from '../types/trip';
import toast from 'react-hot-toast';
import { useConfirmDialog } from '../hooks/useConfirmDialog';

interface CompanionWithTrips extends Companion {
  tripAssignments?: Array<{
    trip: {
      id: number;
      title: string;
      status: string;
      startDate: string | null;
      endDate: string | null;
    };
  }>;
}

export default function CompanionsPage() {
  const [companions, setCompanions] = useState<Companion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [editingCompanion, setEditingCompanion] = useState<Companion | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showTripsModal, setShowTripsModal] = useState(false);
  const [selectedCompanionTrips, setSelectedCompanionTrips] = useState<CompanionWithTrips | null>(null);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [showAddToTripModal, setShowAddToTripModal] = useState(false);
  const [selectedCompanionForTrip, setSelectedCompanionForTrip] = useState<Companion | null>(null);
  const [allTrips, setAllTrips] = useState<Trip[]>([]);
  const [loadingAllTrips, setLoadingAllTrips] = useState(false);
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();

  useEffect(() => {
    loadCompanions();
  }, []);

  const loadCompanions = async () => {
    try {
      setLoading(true);
      const allCompanions = await companionService.getCompanionsByUser();
      setCompanions(allCompanions);
    } catch {
      toast.error('Failed to load companions');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCompanion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await companionService.createCompanion({
        name,
        email: email || undefined,
        phone: phone || undefined,
        notes: notes || undefined,
      });
      toast.success('Companion created');
      resetForm();
      await loadCompanions();
    } catch {
      toast.error('Failed to create companion');
    }
  };

  const handleUpdateCompanion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompanion) return;

    try {
      await companionService.updateCompanion(editingCompanion.id, {
        name,
        email: email || null,
        phone: phone || null,
        notes: notes || null,
      });
      toast.success('Companion updated');
      resetForm();
      loadCompanions();
    } catch {
      toast.error('Failed to update companion');
    }
  };

  const handleDeleteCompanion = async (companionId: number) => {
    const confirmed = await confirm({
      title: 'Delete Companion',
      message: 'Delete this companion? They will be removed from all trips.',
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!confirmed) return;

    try {
      await companionService.deleteCompanion(companionId);
      toast.success('Companion deleted');
      loadCompanions();
    } catch {
      toast.error('Failed to delete companion');
    }
  };

  const startEdit = (companion: Companion) => {
    setEditingCompanion(companion);
    setName(companion.name);
    setEmail(companion.email || '');
    setPhone(companion.phone || '');
    setNotes(companion.notes || '');
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingCompanion(null);
    setName('');
    setEmail('');
    setPhone('');
    setNotes('');
  };

  const handleShowTrips = async (companionId: number) => {
    try {
      setLoadingTrips(true);
      setShowTripsModal(true);
      const companionWithTrips = await companionService.getCompanionById(companionId) as CompanionWithTrips;
      setSelectedCompanionTrips(companionWithTrips);
    } catch {
      toast.error('Failed to load trips');
      setShowTripsModal(false);
    } finally {
      setLoadingTrips(false);
    }
  };

  const closeTripsModal = () => {
    setShowTripsModal(false);
    setSelectedCompanionTrips(null);
  };

  const handleOpenAddToTrip = async (companion: Companion) => {
    try {
      setLoadingAllTrips(true);
      setShowAddToTripModal(true);
      setSelectedCompanionForTrip(companion);

      // Fetch all trips and companion details to filter out already assigned trips
      const [tripsData, companionWithTrips] = await Promise.all([
        tripService.getTrips(),
        companionService.getCompanionById(companion.id) as Promise<CompanionWithTrips>
      ]);

      // Filter out trips the companion is already assigned to
      const assignedTripIds = new Set(
        companionWithTrips.tripAssignments?.map(assignment => assignment.trip.id) || []
      );
      const availableTrips = tripsData.trips.filter(trip => !assignedTripIds.has(trip.id));

      setAllTrips(availableTrips);
    } catch {
      toast.error('Failed to load trips');
      setShowAddToTripModal(false);
    } finally {
      setLoadingAllTrips(false);
    }
  };

  const handleAddToTrip = async (tripId: number) => {
    if (!selectedCompanionForTrip) return;

    try {
      await companionService.linkCompanionToTrip(tripId, selectedCompanionForTrip.id);
      toast.success('Companion added to trip');
      setShowAddToTripModal(false);
      setSelectedCompanionForTrip(null);
      setAllTrips([]);
      // Refresh companions to update counts
      loadCompanions();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      if (error.response?.data?.message?.includes('already linked')) {
        toast.error('Companion already added to this trip');
      } else {
        toast.error('Failed to add companion to trip');
      }
    }
  };

  const closeAddToTripModal = () => {
    setShowAddToTripModal(false);
    setSelectedCompanionForTrip(null);
    setAllTrips([]);
  };

  const handleRemoveFromTrip = async (tripId: number, companionId: number, e: React.MouseEvent) => {
    e.preventDefault(); // Prevent Link navigation
    e.stopPropagation(); // Stop event bubbling

    const confirmed = await confirm({
      title: 'Remove from Trip',
      message: 'Remove this companion from the trip?',
      confirmLabel: 'Remove',
      variant: 'warning',
    });
    if (!confirmed) return;

    try {
      await companionService.unlinkCompanionFromTrip(tripId, companionId);
      toast.success('Companion removed from trip');

      // Refresh the companion's trips in the modal
      if (selectedCompanionTrips) {
        const updatedCompanion = await companionService.getCompanionById(companionId) as CompanionWithTrips;
        setSelectedCompanionTrips(updatedCompanion);
      }

      // Refresh companions list to update counts
      loadCompanions();
    } catch {
      toast.error('Failed to remove companion from trip');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="text-4xl mb-4">👥</div>
          <p className="text-gray-600 dark:text-gray-400">Loading companions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <ConfirmDialogComponent />
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Travel Companions</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your travel companions and add them to trips
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn btn-primary"
        >
          {showForm ? 'Cancel' : '+ Add Companion'}
        </button>
      </div>

      {/* Create/Edit Companion Form */}
      {showForm && (
        <form
          onSubmit={editingCompanion ? handleUpdateCompanion : handleCreateCompanion}
          className="mb-6 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
        >
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            {editingCompanion ? 'Edit Companion' : 'Add New Companion'}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="label">Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                placeholder="John Doe"
                maxLength={100}
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className="label">Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="input"
                  placeholder="+1 (555) 123-4567"
                  maxLength={20}
                />
              </div>
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input"
                rows={3}
                placeholder="Additional information about this companion..."
                maxLength={1000}
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary">
                {editingCompanion ? 'Update Companion' : 'Create Companion'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Companions List */}
      <div>
        {companions.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-6xl mb-4">👥</div>
            <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
              No companions yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Add your first travel companion to get started
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="btn btn-primary"
            >
              + Add Your First Companion
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {companions.map((companion) => {
              const isExpanded = expandedId === companion.id;
              return (
                <div
                  key={companion.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-5 bg-white dark:bg-gray-800 hover:shadow-lg transition-shadow relative flex flex-col min-h-[180px]"
                >
                  {/* Add to Trip button in top right corner */}
                  <button
                    onClick={() => handleOpenAddToTrip(companion)}
                    className="absolute top-3 right-3 px-2 py-1 text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-800 font-medium transition-colors"
                  >
                    + Add to trip
                  </button>

                  <div className="flex-1 flex flex-col">
                    <div className="flex items-start gap-3 mb-3 pr-20">
                      <span className="text-3xl">👤</span>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-lg text-gray-900 dark:text-white truncate">
                          {companion.name}
                        </h4>
                        {companion._count && companion._count.tripAssignments > 0 && (
                          <button
                            onClick={() => handleShowTrips(companion.id)}
                            className="text-sm text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                          >
                            {companion._count.tripAssignments} {companion._count.tripAssignments === 1 ? 'trip' : 'trips'}
                          </button>
                        )}
                        {companion._count && companion._count.tripAssignments === 0 && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            0 trips
                          </p>
                        )}
                      </div>
                    </div>

                    {(companion.email || companion.phone || companion.notes) && (
                      <div className="mb-3">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : companion.id)}
                          className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
                        >
                          {isExpanded ? '↑ Hide details' : '↓ Show details'}
                        </button>

                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2 text-sm">
                            {companion.email && (
                              <div>
                                <span className="font-medium text-gray-600 dark:text-gray-400">Email: </span>
                                <a
                                  href={`mailto:${companion.email}`}
                                  className="text-blue-600 dark:text-blue-400 hover:underline break-all"
                                >
                                  {companion.email}
                                </a>
                              </div>
                            )}
                            {companion.phone && (
                              <div>
                                <span className="font-medium text-gray-600 dark:text-gray-400">Phone: </span>
                                <a
                                  href={`tel:${companion.phone}`}
                                  className="text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                  {companion.phone}
                                </a>
                              </div>
                            )}
                            {companion.notes && (
                              <div>
                                <span className="font-medium text-gray-600 dark:text-gray-400 block mb-1">
                                  Notes:
                                </span>
                                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                  {companion.notes}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-auto">
                    <button
                      onClick={() => startEdit(companion)}
                      className="flex-1 px-3 py-2 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800 font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteCompanion(companion.id)}
                      className="flex-1 px-3 py-2 text-sm bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800 font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Trips Modal */}
      {showTripsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {selectedCompanionTrips?.name}'s Trips
              </h3>
              <button
                onClick={closeTripsModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {loadingTrips ? (
                <div className="text-center py-8">
                  <div className="text-gray-600 dark:text-gray-400">Loading trips...</div>
                </div>
              ) : selectedCompanionTrips?.tripAssignments && selectedCompanionTrips.tripAssignments.length > 0 ? (
                <div className="space-y-3">
                  {selectedCompanionTrips.tripAssignments.map((assignment) => (
                    <div
                      key={assignment.trip.id}
                      className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                    >
                      {/* Trash icon button on left */}
                      <button
                        onClick={(e) => handleRemoveFromTrip(assignment.trip.id, selectedCompanionTrips.id, e)}
                        className="flex-shrink-0 p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-colors"
                        title="Remove companion from this trip"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>

                      <Link
                        to={`/trips/${assignment.trip.id}`}
                        onClick={closeTripsModal}
                        className="flex-1 hover:opacity-80 transition-opacity"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                              {assignment.trip.title}
                            </h4>
                            <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                assignment.trip.status === 'Completed' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' :
                                assignment.trip.status === 'In Progress' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' :
                                assignment.trip.status === 'Planned' ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300' :
                                assignment.trip.status === 'Planning' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300' :
                                'bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                              }`}>
                                {assignment.trip.status}
                              </span>
                              {assignment.trip.startDate && (
                                <span>
                                  {new Date(assignment.trip.startDate).toLocaleDateString()}
                                  {assignment.trip.endDate && ` - ${new Date(assignment.trip.endDate).toLocaleDateString()}`}
                                </span>
                              )}
                            </div>
                          </div>
                          <svg className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">🏝️</div>
                  <p className="text-gray-600 dark:text-gray-400">No trips found</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={closeTripsModal}
                className="w-full btn btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add to Trip Modal */}
      {showAddToTripModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Add {selectedCompanionForTrip?.name} to Trip
              </h3>
              <button
                onClick={closeAddToTripModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {loadingAllTrips ? (
                <div className="text-center py-8">
                  <div className="text-gray-600 dark:text-gray-400">Loading available trips...</div>
                </div>
              ) : allTrips.length > 0 ? (
                <div className="space-y-3">
                  {allTrips.map((trip) => (
                    <button
                      key={trip.id}
                      onClick={() => handleAddToTrip(trip.id)}
                      className="w-full text-left p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors border border-gray-200 dark:border-gray-600"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                            {trip.title}
                          </h4>
                          <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              trip.status === 'Completed' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' :
                              trip.status === 'In Progress' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' :
                              trip.status === 'Planned' ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300' :
                              trip.status === 'Planning' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300' :
                              'bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                            }`}>
                              {trip.status}
                            </span>
                            {trip.startDate && (
                              <span>
                                {new Date(trip.startDate).toLocaleDateString()}
                                {trip.endDate && ` - ${new Date(trip.endDate).toLocaleDateString()}`}
                              </span>
                            )}
                          </div>
                        </div>
                        <svg className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">✅</div>
                  <p className="text-gray-900 dark:text-white font-semibold mb-1">
                    All caught up!
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">
                    {selectedCompanionForTrip?.name} is already added to all your trips
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={closeAddToTripModal}
                className="w-full btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
