import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import type { Checklist, ChecklistItem } from '../types/checklist';
import checklistService from '../services/checklist.service';

export default function ChecklistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [checklistName, setChecklistName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyUnchecked, setShowOnlyUnchecked] = useState(false);

  useEffect(() => {
    loadChecklist();
  }, [id]);

  const loadChecklist = async () => {
    if (!id) return;

    try {
      const data = await checklistService.getChecklistById(parseInt(id));
      setChecklist(data);
      setChecklistName(data.name);
    } catch (error) {
      console.error('Failed to load checklist:', error);
      alert('Failed to load checklist');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleItem = async (item: ChecklistItem) => {
    try {
      await checklistService.updateChecklistItem(item.id, {
        isChecked: !item.isChecked,
      });
      await loadChecklist();
    } catch (error) {
      console.error('Failed to update item:', error);
      alert('Failed to update item');
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newItemName.trim()) return;

    try {
      await checklistService.addChecklistItem(parseInt(id), {
        name: newItemName,
        description: newItemDescription || null,
      });

      setNewItemName('');
      setNewItemDescription('');
      setShowAddForm(false);
      await loadChecklist();
    } catch (error) {
      console.error('Failed to add item:', error);
      alert('Failed to add item');
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    if (!confirm('Are you sure you want to delete this item?')) {
      return;
    }

    try {
      await checklistService.deleteChecklistItem(itemId);
      await loadChecklist();
    } catch (error) {
      console.error('Failed to delete item:', error);
      alert('Failed to delete item');
    }
  };

  const handleSaveName = async () => {
    if (!id || !checklistName.trim()) return;

    try {
      await checklistService.updateChecklist(parseInt(id), {
        name: checklistName,
      });
      setEditingName(false);
      await loadChecklist();
    } catch (error) {
      console.error('Failed to update checklist name:', error);
      alert('Failed to update checklist name');
    }
  };

  const getFilteredItems = () => {
    if (!checklist) return [];

    let items = checklist.items;

    // Filter by search query
    if (searchQuery) {
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by checked status
    if (showOnlyUnchecked) {
      items = items.filter((item) => !item.isChecked);
    }

    return items;
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

  if (!checklist) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-6 py-8 text-gray-900 dark:text-white">
          Checklist not found
        </div>
      </div>
    );
  }

  const filteredItems = getFilteredItems();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <Link
            to="/checklists"
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mb-2 inline-block"
          >
            ← Back to Checklists
          </Link>

          <div className="flex justify-between items-start">
            <div className="flex-1">
              {editingName ? (
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={checklistName}
                    onChange={(e) => setChecklistName(e.target.value)}
                    className="input text-3xl font-bold"
                    autoFocus
                  />
                  <button onClick={handleSaveName} className="btn btn-primary">
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditingName(false);
                      setChecklistName(checklist.name);
                    }}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex gap-2 items-center">
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {checklist.name}
                  </h1>
                  {!checklist.isDefault && (
                    <button
                      onClick={() => setEditingName(true)}
                      className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      ✏️
                    </button>
                  )}
                </div>
              )}
              {checklist.description && (
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  {checklist.description}
                </p>
              )}
            </div>
          </div>

          {checklist.stats && (
            <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                <span>
                  {checklist.stats.checked} / {checklist.stats.total} completed
                </span>
                <span className="font-semibold">{checklist.stats.percentage}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className="bg-blue-600 dark:bg-blue-500 h-3 rounded-full transition-all"
                  style={{ width: `${checklist.stats.percentage}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <div className="flex gap-4 mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input flex-1"
              placeholder="Search items..."
            />
            <button
              onClick={() => setShowOnlyUnchecked(!showOnlyUnchecked)}
              className={`btn ${
                showOnlyUnchecked ? 'btn-primary' : 'btn-secondary'
              }`}
            >
              {showOnlyUnchecked ? 'Show All' : 'Show Unchecked Only'}
            </button>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="btn btn-primary"
            >
              {showAddForm ? 'Cancel' : '+ Add Item'}
            </button>
          </div>

          {showAddForm && (
            <form onSubmit={handleAddItem} className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Item Name*
                </label>
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="input"
                  placeholder="e.g., Grand Canyon"
                  required
                />
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={newItemDescription}
                  onChange={(e) => setNewItemDescription(e.target.value)}
                  className="input"
                  placeholder="Optional description..."
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn btn-primary">
                  Add Item
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="space-y-2">
            {filteredItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                {searchQuery || showOnlyUnchecked
                  ? 'No items match your filters'
                  : 'No items in this checklist yet'}
              </div>
            ) : (
              filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={item.isChecked}
                    onChange={() => handleToggleItem(item)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div
                      className={`font-medium ${
                        item.isChecked
                          ? 'text-gray-500 dark:text-gray-400 line-through'
                          : 'text-gray-900 dark:text-white'
                      }`}
                    >
                      {item.name}
                    </div>
                    {item.description && (
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {item.description}
                      </div>
                    )}
                    {item.checkedAt && (
                      <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        Checked: {new Date(item.checkedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  {!item.isDefault && (
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                      title="Delete item"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
