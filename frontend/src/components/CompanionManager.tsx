import { useState, useEffect, useMemo } from 'react';
import companionService from '../services/companion.service';
import type { Companion } from '../types/companion';
import toast from 'react-hot-toast';
import { useManagerCRUD } from '../hooks/useManagerCRUD';
import { useConfirmDialog } from '../hooks/useConfirmDialog';

interface CompanionManagerProps {
  tripId: number;
}

export default function CompanionManager({ tripId }: CompanionManagerProps) {
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

  const { confirm, ConfirmDialogComponent } = useConfirmDialog();
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
      toast.error('Failed to update companion');
    }
  };

  const handleDeleteCompanion = async (companionId: number) => {
    const confirmed = await confirm({
      title: 'Delete Companion',
      message: 'Delete this companion? They will be removed from all trips.',
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (!confirmed) return;

    try {
      await companionService.deleteCompanion(companionId);
      toast.success('Companion deleted');
      loadAllCompanions();
      manager.loadItems();
    } catch (error) {
      toast.error('Failed to delete companion');
    }
  };

  const handleLinkCompanion = async (companionId: number) => {
    try {
      await companionService.linkCompanionToTrip(tripId, companionId);
      toast.success('Companion added to trip');
      manager.loadItems();
    } catch (error: any) {
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
    } catch (error) {
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
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Travel Companions</h2>
        <button
          onClick={() => manager.toggleForm()}
          className="btn btn-primary"
        >
          {manager.showForm ? 'Cancel' : '+ Add New Companion'}
        </button>
      </div>

      {/* Create/Edit Companion Form */}
      {manager.showForm && (
        <form
          onSubmit={editingCompanion ? handleUpdateCompanion : handleCreateCompanion}
          className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
        >
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
            <div className="grid grid-cols-2 gap-4">
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
                placeholder="Additional information..."
                maxLength={1000}
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary">
                {editingCompanion ? 'Update Companion' : 'Add Companion'}
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
            {manager.items.map((companion) => {
              const isExpanded = expandedId === companion.id;
              return (
                <div key={companion.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">👤</span>
                        <h4 className="font-semibold text-lg text-gray-900 dark:text-white">{companion.name}</h4>
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
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => startEdit(companion)}
                        className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleUnlinkCompanion(companion.id)}
                        className="px-3 py-1 text-sm bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800"
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
                filteredCompanions.map((companion) => (
                  <div
                    key={companion.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">👤</span>
                      <span className="font-medium text-gray-900 dark:text-white">{companion.name}</span>
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
      {ConfirmDialogComponent}
    </div>
  );
}
