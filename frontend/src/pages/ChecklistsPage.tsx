import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Checklist, DefaultChecklistStatus, ChecklistType } from '../types/checklist';
import checklistService from '../services/checklist.service';
import ChecklistSelectorModal from '../components/ChecklistSelectorModal';

export default function ChecklistsPage() {
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newChecklistName, setNewChecklistName] = useState('');
  const [newChecklistDescription, setNewChecklistDescription] = useState('');
  const [isInitializing, setIsInitializing] = useState(false);
  const [isAutoChecking, setIsAutoChecking] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showSelectorModal, setShowSelectorModal] = useState(false);
  const [selectorMode, setSelectorMode] = useState<'add' | 'remove'>('add');
  const [defaultChecklistsStatus, setDefaultChecklistsStatus] = useState<DefaultChecklistStatus[]>([]);

  useEffect(() => {
    loadChecklists();
    loadDefaultsStatus();
  }, []);

  const loadChecklists = async () => {
    try {
      const data = await checklistService.getChecklists();
      setChecklists(data);
    } catch (error) {
      console.error('Failed to load checklists:', error);
      alert('Failed to load checklists');
    } finally {
      setIsLoading(false);
    }
  };

  const loadDefaultsStatus = async () => {
    try {
      const status = await checklistService.getDefaultsStatus();
      setDefaultChecklistsStatus(status);
    } catch (error) {
      console.error('Failed to load defaults status:', error);
    }
  };

  const handleInitializeDefaults = async () => {
    if (!confirm('This will create default checklists for Airports, Countries, and Cities. Continue?')) {
      return;
    }

    setIsInitializing(true);
    try {
      await checklistService.initializeDefaults();
      await loadChecklists();
      alert('Default checklists initialized successfully!');
    } catch (error) {
      console.error('Failed to initialize defaults:', error);
      alert('Failed to initialize default checklists. They may already exist.');
    } finally {
      setIsInitializing(false);
    }
  };

  const handleAutoCheck = async () => {
    setIsAutoChecking(true);
    try {
      const result = await checklistService.autoCheckFromTrips();
      await loadChecklists();
      alert(`Successfully auto-checked ${result.updated} items based on your trips!`);
    } catch (error) {
      console.error('Failed to auto-check items:', error);
      alert('Failed to auto-check items from trips');
    } finally {
      setIsAutoChecking(false);
    }
  };

  const handleCreateChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistName.trim()) return;

    try {
      await checklistService.createChecklist({
        name: newChecklistName,
        description: newChecklistDescription || null,
        type: 'custom',
      });

      setNewChecklistName('');
      setNewChecklistDescription('');
      setShowCreateForm(false);
      await loadChecklists();
    } catch (error) {
      console.error('Failed to create checklist:', error);
      alert('Failed to create checklist');
    }
  };

  const handleDeleteChecklist = async (id: number) => {
    if (!confirm('Are you sure you want to delete this checklist? This cannot be undone.')) {
      return;
    }

    try {
      await checklistService.deleteChecklist(id);
      await loadChecklists();
    } catch (error) {
      console.error('Failed to delete checklist:', error);
      alert('Failed to delete checklist');
    }
  };

  const handleRemoveDefaults = async () => {
    if (!confirm('This will remove all default checklists (Airports, Countries, Cities, US States). Are you sure?')) {
      return;
    }

    setIsRemoving(true);
    try {
      const result = await checklistService.removeDefaults();
      await loadChecklists();
      alert(`Successfully removed ${result.removed} default checklists`);
    } catch (error) {
      console.error('Failed to remove defaults:', error);
      alert('Failed to remove default checklists');
    } finally {
      setIsRemoving(false);
    }
  };

  const handleRestoreDefaults = async () => {
    if (!confirm('This will restore any missing default checklists. Continue?')) {
      return;
    }

    setIsRestoring(true);
    try {
      const result = await checklistService.restoreDefaults();
      await loadChecklists();
      await loadDefaultsStatus();
      alert(`Successfully restored ${result.restored} default checklists`);
    } catch (error) {
      console.error('Failed to restore defaults:', error);
      alert('Failed to restore default checklists');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleOpenAddModal = () => {
    setSelectorMode('add');
    setShowSelectorModal(true);
  };

  const handleOpenRemoveModal = () => {
    setSelectorMode('remove');
    setShowSelectorModal(true);
  };

  const handleSelectorConfirm = async (selectedTypes: ChecklistType[]) => {
    if (selectorMode === 'add') {
      const result = await checklistService.addDefaults(selectedTypes);
      await loadChecklists();
      await loadDefaultsStatus();
      alert(`Successfully added ${result.added} default checklists`);
    } else {
      const result = await checklistService.removeDefaultsByType(selectedTypes);
      await loadChecklists();
      await loadDefaultsStatus();
      alert(`Successfully removed ${result.removed} default checklists`);
    }
  };

  const getChecklistIcon = (type: string) => {
    switch (type) {
      case 'airports':
        return '✈️';
      case 'countries':
        return '🌍';
      case 'cities':
        return '🏙️';
      case 'us_states':
        return '🗽';
      default:
        return '📋';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-6 py-8 text-gray-900 dark:text-white">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Checklists</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Track your travel achievements
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {checklists.length === 0 && (
              <button
                onClick={handleInitializeDefaults}
                disabled={isInitializing}
                className="btn btn-secondary"
              >
                {isInitializing ? 'Initializing...' : 'Initialize All Defaults'}
              </button>
            )}
            {defaultChecklistsStatus.some(c => !c.exists) && (
              <button
                onClick={handleOpenAddModal}
                className="btn btn-secondary text-green-600 dark:text-green-400"
              >
                + Add Defaults
              </button>
            )}
            {checklists.some(c => c.isDefault) && (
              <button
                onClick={handleOpenRemoveModal}
                className="btn btn-secondary text-red-600 dark:text-red-400"
              >
                - Remove Defaults
              </button>
            )}
            <button
              onClick={handleAutoCheck}
              disabled={isAutoChecking || checklists.length === 0}
              className="btn btn-secondary"
            >
              {isAutoChecking ? 'Auto-checking...' : 'Auto-check from Trips'}
            </button>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="btn btn-primary"
            >
              {showCreateForm ? 'Cancel' : '+ Create Custom List'}
            </button>
          </div>
        </div>

        {showCreateForm && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Create Custom Checklist
            </h2>
            <form onSubmit={handleCreateChecklist}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name*
                </label>
                <input
                  type="text"
                  value={newChecklistName}
                  onChange={(e) => setNewChecklistName(e.target.value)}
                  className="input"
                  placeholder="e.g., National Parks, UNESCO Sites"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={newChecklistDescription}
                  onChange={(e) => setNewChecklistDescription(e.target.value)}
                  className="input"
                  rows={3}
                  placeholder="Optional description..."
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn btn-primary">
                  Create Checklist
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {checklists.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No Checklists Yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Get started by initializing default lists or creating your own custom checklist
            </p>
            <button
              onClick={handleInitializeDefaults}
              disabled={isInitializing}
              className="btn btn-primary"
            >
              {isInitializing ? 'Initializing...' : 'Initialize Default Lists'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {checklists.map((checklist) => (
              <Link
                key={checklist.id}
                to={`/checklists/${checklist.id}`}
                className="block bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-3xl">{getChecklistIcon(checklist.type)}</span>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {checklist.name}
                        </h3>
                        {checklist.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {checklist.description}
                          </p>
                        )}
                      </div>
                    </div>
                    {!checklist.isDefault && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          handleDeleteChecklist(checklist.id);
                        }}
                        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                        title="Delete checklist"
                      >
                        🗑️
                      </button>
                    )}
                  </div>

                  {checklist.stats && (
                    <div className="mt-4">
                      <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                        <span>
                          {checklist.stats.checked} / {checklist.stats.total} completed
                        </span>
                        <span>{checklist.stats.percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all"
                          style={{ width: `${checklist.stats.percentage}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        <ChecklistSelectorModal
          isOpen={showSelectorModal}
          onClose={() => setShowSelectorModal(false)}
          onConfirm={handleSelectorConfirm}
          availableChecklists={defaultChecklistsStatus}
          mode={selectorMode}
        />
      </div>
    </div>
  );
}
