import { useState, useEffect, useMemo } from 'react';
import companionService from '../services/companion.service';
import type { Companion } from '../types/companion';
import toast from 'react-hot-toast';
import { useManagerCRUD } from '../hooks/useManagerCRUD';
import CompanionAvatar from './CompanionAvatar';
import FormModal from './FormModal';

interface CompanionManagerProps {
  tripId: number;
  onUpdate?: () => void;
}

export default function CompanionManager({ tripId, onUpdate }: CompanionManagerProps) {
  // Service adapter for trip companions (companions linked to this trip) - memoized to prevent infinite loops
  const tripCompanionServiceAdapter = useMemo(() => ({
    getByTrip: companionService.getCompanionsByTrip,
    create: async () => { throw new Error("Use handleCreateCompanion instead"); },
    update: async () => { throw new Error("Use handleUpdateCompanion instead"); },
    delete: async () => { throw new Error("Use handleDeleteCompanion instead"); },
  }), []);

  // Initialize CRUD hook for trip companions
  const manager = useManagerCRUD<Companion>(tripCompanionServiceAdapter, tripId, {
    itemName: "companion",
  });

  const [companions, setCompanions] = useState<Companion[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [editingCompanion, setEditingCompanion] = useState<Companion | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadAllCompanions();
  }, [tripId]);

  const loadAllCompanions = async () => {
    try {
      const allCompanions = await companionService.getCompanionsByUser();
      setCompanions(allCompanions);
    } catch {
      toast.error('Failed to load companions');
    }
  };

  const handleCreateCompanion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newCompanion = await companionService.createCompanion({
        name,
        email: email || undefined,
        phone: phone || undefined,
        notes: notes || undefined,
      });
      toast.success('Companion created');
      resetForm();
      await loadAllCompanions();
      // Automatically link the new companion to this trip
      await handleLinkCompanion(newCompanion.id);
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
      loadAllCompanions();
      manager.loadItems();
      onUpdate?.();
    } catch {
      toast.error('Failed to update companion');
    }
  };

  const handleLinkCompanion = async (companionId: number) => {
    try {
      await companionService.linkCompanionToTrip(tripId, companionId);
      toast.success('Companion added to trip');
      manager.loadItems();
      onUpdate?.();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      if (error.response?.data?.message?.includes('already linked')) {
        toast.error('Companion already added to this trip');
      } else {
        toast.error('Failed to add companion');
      }
    }
  };

  const handleUnlinkCompanion = async (companionId: number) => {
    try {
      await companionService.unlinkCompanionFromTrip(tripId, companionId);
      toast.success('Companion removed from trip');
      manager.loadItems();
      onUpdate?.();
    } catch {
      toast.error('Failed to remove companion');
    }
  };

  const startEdit = (companion: Companion) => {
    setEditingCompanion(companion);
    setName(companion.name);
    setEmail(companion.email || '');
    setPhone(companion.phone || '');
    setNotes(companion.notes || '');
    manager.openCreateForm();
  };

  const resetForm = () => {
    manager.closeForm();
    setEditingCompanion(null);
    setName('');
    setEmail('');
    setPhone('');
    setNotes('');
  };

  if (manager.loading) {
    return <div className="text-center py-4">Loading companions...</div>;
  }

  const availableCompanions = companions.filter(
    (companion) => !manager.items.find((tc) => tc.id === companion.id)
  );

  // Filter available companions based on search query
  const filteredCompanions = availableCompanions.filter((companion) =>
    companion.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white min-w-0 flex-1 truncate">Travel Companions</h2>
        <button
          onClick={() => manager.openCreateForm()}
          className="btn btn-primary whitespace-nowrap flex-shrink-0"
        >
          + Add New Companion
        </button>
      </div>

      {/* Create/Edit Companion Form Modal */}
      <FormModal
        isOpen={manager.showForm}
        onClose={resetForm}
        title={editingCompanion ? "Edit Companion" : "Add Companion"}
        icon="👥"
        maxWidth="lg"
        footer={
          <>
            <button
              type="button"
              onClick={resetForm}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="companion-form"
              className="btn btn-primary"
            >
              {editingCompanion ? 'Update' : 'Add'} Companion
            </button>
          </>
        }
      >
        <form
          id="companion-form"
          onSubmit={editingCompanion ? handleUpdateCompanion : handleCreateCompanion}
          className="space-y-4"
        >
          <div>
            <label htmlFor="companion-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name *
            </label>
            <input
              type="text"
              id="companion-name"
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
              <label htmlFor="companion-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <input
                type="email"
                id="companion-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="john@example.com"
              />
            </div>
            <div>
              <label htmlFor="companion-phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Phone
              </label>
              <input
                type="tel"
                id="companion-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input"
                placeholder="+1 (555) 123-4567"
                maxLength={20}
              />
            </div>
          </div>
          <div>
            <label htmlFor="companion-notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes
            </label>
            <textarea
              id="companion-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input"
              rows={3}
              placeholder="Additional information..."
              maxLength={1000}
            />
          </div>
        </form>
      </FormModal>

      {/* Trip Companions */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Companions on this trip</h3>
        {manager.items.length === 0 ? (
          <div className="text-center py-8 text-gray-600 dark:text-gray-400">
            <div className="text-4xl mb-2">👥</div>
            <p>No companions added yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Sort companions to show "Myself" first */}
            {[...manager.items].sort((a, b) => {
              if (a.isMyself && !b.isMyself) return -1;
              if (!a.isMyself && b.isMyself) return 1;
              return a.name.localeCompare(b.name);
            }).map((companion) => {
              const isExpanded = expandedId === companion.id;
              return (
                <div key={companion.id} className={`border rounded-lg p-4 ${
                  companion.isMyself
                    ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <CompanionAvatar companion={companion} size="md" />
                        <h4 className="font-semibold text-lg text-gray-900 dark:text-white">{companion.name}</h4>
                        {companion.isMyself && (
                          <span className="text-xs bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                            You
                          </span>
                        )}
                      </div>
                      {(companion.email || companion.phone || companion.notes) && (
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : companion.id)}
                          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {isExpanded ? 'Show less ↑' : 'Show details ↓'}
                        </button>
                      )}
                      {isExpanded && (
                        <div className="mt-3 space-y-2 text-sm">
                          {companion.email && (
                            <div>
                              <span className="font-medium text-gray-600 dark:text-gray-400">Email: </span>
                              <a href={`mailto:${companion.email}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                                {companion.email}
                              </a>
                            </div>
                          )}
                          {companion.phone && (
                            <div>
                              <span className="font-medium text-gray-600 dark:text-gray-400">Phone: </span>
                              <a href={`tel:${companion.phone}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                                {companion.phone}
                              </a>
                            </div>
                          )}
                          {companion.notes && (
                            <div>
                              <span className="font-medium text-gray-600 dark:text-gray-400">Notes: </span>
                              <p className="text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-wrap">{companion.notes}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0 self-start">
                      <button
                        onClick={() => startEdit(companion)}
                        className="px-3 py-1 text-xs sm:text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800 whitespace-nowrap"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleUnlinkCompanion(companion.id)}
                        className="px-3 py-1 text-xs sm:text-sm bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800 whitespace-nowrap"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Search and Add Existing Companions */}
      {availableCompanions.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Add existing companions</h3>

          {/* Search Input */}
          <div className="mb-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search companions by name..."
              className="input w-full"
            />
          </div>

          {/* Filtered Results */}
          {searchQuery && (
            <div className="space-y-2">
              {filteredCompanions.length > 0 ? (
                [...filteredCompanions].sort((a, b) => {
                  if (a.isMyself && !b.isMyself) return -1;
                  if (!a.isMyself && b.isMyself) return 1;
                  return a.name.localeCompare(b.name);
                }).map((companion) => (
                  <div
                    key={companion.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      companion.isMyself
                        ? 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border-blue-300 dark:border-blue-700'
                        : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <CompanionAvatar companion={companion} size="sm" />
                      <span className="font-medium text-gray-900 dark:text-white">{companion.name}</span>
                      {companion.isMyself && (
                        <span className="text-xs bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                          You
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        handleLinkCompanion(companion.id);
                        setSearchQuery(''); // Clear search after adding
                      }}
                      className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800"
                    >
                      Add to Trip
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                  No companions found matching "{searchQuery}"
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
