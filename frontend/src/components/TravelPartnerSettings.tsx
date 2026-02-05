import { useState, useEffect, useCallback, useRef } from 'react';
import userService from '../services/user.service';
import { useConfirmDialog } from '../hooks/useConfirmDialog';
import type { TravelPartnerSettings as TravelPartnerSettingsType, UserSearchResult } from '../types/user';
import toast from 'react-hot-toast';

export default function TravelPartnerSettings() {
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();
  const [settings, setSettings] = useState<TravelPartnerSettingsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [permission, setPermission] = useState<'view' | 'edit' | 'admin'>('edit');
  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  // Cleanup timeout and abort controller on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadSettings = async () => {
    try {
      const data = await userService.getTravelPartnerSettings();
      setSettings(data);
      setPermission(data.defaultPartnerPermission || 'edit');
    } catch (error) {
      console.error('Failed to load travel partner settings:', error);
      toast.error('Failed to load travel partner settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = useCallback(async (query: string) => {
    // Require at least 3 characters to reduce unnecessary requests
    if (query.length < 3) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    // Abort any previous pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsSearching(true);
    try {
      const results = await userService.searchUsers(query, abortController.signal);
      // Only update state if this request wasn't aborted
      if (!abortController.signal.aborted) {
        setSearchResults(results);
        setShowDropdown(results.length > 0);
      }
    } catch (error) {
      // Ignore abort errors
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      console.error('Failed to search users:', error);
    } finally {
      // Only update loading state if this request wasn't aborted
      if (!abortController.signal.aborted) {
        setIsSearching(false);
      }
    }
  }, []);

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    // Debounce search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(query);
    }, 300);
  };

  const handleSelectPartner = async (user: UserSearchResult) => {
    setIsSaving(true);
    try {
      const result = await userService.updateTravelPartnerSettings({
        travelPartnerId: user.id,
        defaultPartnerPermission: permission,
      });
      setSettings(result);
      setSearchQuery('');
      setSearchResults([]);
      setShowDropdown(false);
      toast.success(`${user.username} is now your travel partner!`);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to set travel partner');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemovePartner = async () => {
    if (!settings?.travelPartner) return;

    const confirmed = await confirm({
      title: 'Remove Travel Partner',
      message: `Are you sure you want to remove ${settings.travelPartner.username} as your travel partner? This will also remove you as their travel partner.`,
      confirmLabel: 'Remove',
      variant: 'danger',
    });

    if (!confirmed) return;

    setIsSaving(true);
    try {
      const result = await userService.updateTravelPartnerSettings({
        travelPartnerId: null,
      });
      setSettings(result);
      toast.success('Travel partner removed');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to remove travel partner');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePermission = async (newPermission: 'view' | 'edit' | 'admin') => {
    setPermission(newPermission);

    // Only update if there's an existing partner
    if (!settings?.travelPartnerId) return;

    setIsSaving(true);
    try {
      const result = await userService.updateTravelPartnerSettings({
        defaultPartnerPermission: newPermission,
      });
      setSettings(result);
      toast.success('Permission level updated');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to update permission');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <p className="text-gray-600 dark:text-gray-400">Loading travel partner settings...</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        Travel Partner
      </h2>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Set a default travel partner who will automatically be added as a collaborator
        to all new trips you create. This is a mutual relationship - you'll also be
        added to their new trips.
      </p>

      {settings?.travelPartner ? (
        // Partner is set - show current partner
        <div className="space-y-4">
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
            <div className="flex items-center gap-4">
              {settings.travelPartner.avatarUrl ? (
                <img
                  src={settings.travelPartner.avatarUrl}
                  alt={settings.travelPartner.username}
                  className="w-12 h-12 rounded-full"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold text-lg">
                  {settings.travelPartner.username.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white">
                  {settings.travelPartner.username}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {settings.travelPartner.email}
                </p>
              </div>
              <button
                onClick={handleRemovePartner}
                disabled={isSaving}
                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm"
              >
                Remove
              </button>
            </div>
            <p className="mt-3 text-sm text-green-700 dark:text-green-300">
              You and {settings.travelPartner.username} are travel partners. New trips will be automatically shared.
            </p>
          </div>

          {/* Permission Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Default Permission Level for Shared Trips
            </label>
            <select
              value={permission}
              onChange={(e) => handleUpdatePermission(e.target.value as 'view' | 'edit' | 'admin')}
              disabled={isSaving}
              className="input w-full max-w-xs"
            >
              <option value="view">View Only - Can view trip details</option>
              <option value="edit">Edit - Can add and modify trip content</option>
              <option value="admin">Admin - Full access including collaborator management</option>
            </select>
          </div>
        </div>
      ) : (
        // No partner - show search
        <div className="space-y-4">
          <div ref={searchRef} className="relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Find a Travel Partner
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchInputChange}
              placeholder="Search by username or email..."
              className="input w-full"
            />

            {/* Search Results Dropdown */}
            {showDropdown && (
              <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 max-h-60 overflow-y-auto">
                {isSearching ? (
                  <div className="p-3 text-center text-gray-500 dark:text-gray-400">
                    Searching...
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="p-3 text-center text-gray-500 dark:text-gray-400">
                    No users found
                  </div>
                ) : (
                  searchResults.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleSelectPartner(user)}
                      disabled={isSaving}
                      className="w-full flex items-center gap-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-left"
                    >
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user.username}
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {user.username}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {user.email}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Permission Level (for new partner) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Permission Level for Auto-Shared Trips
            </label>
            <select
              value={permission}
              onChange={(e) => setPermission(e.target.value as 'view' | 'edit' | 'admin')}
              className="input w-full max-w-xs"
            >
              <option value="view">View Only - Can view trip details</option>
              <option value="edit">Edit - Can add and modify trip content</option>
              <option value="admin">Admin - Full access including collaborator management</option>
            </select>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              This permission level will be applied when trips are automatically shared.
            </p>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
        <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
          How Travel Partners Work
        </h3>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
          <li>When you set a travel partner, both of you automatically share new trips with each other</li>
          <li>You can still exclude specific trips from auto-sharing when creating them</li>
          <li>Existing trips are not affected - only new trips will be automatically shared</li>
          <li>Either partner can remove the connection at any time</li>
        </ul>
      </div>

      <ConfirmDialogComponent />
    </div>
  );
}
