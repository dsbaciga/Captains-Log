import { useEffect, useState, useId } from "react";
import { Link } from "react-router-dom";
import userService from "../services/user.service";
import tagService from "../services/tag.service";
import apiService from "../services/api.service";
import { useAuthStore } from "../store/authStore";
import type { ActivityCategory } from "../types/user";
import type { TripTag } from "../types/tag";
import toast from "react-hot-toast";
import ImmichSettings from "../components/ImmichSettings";
import WeatherSettings from "../components/WeatherSettings";
import EmojiPicker from "../components/EmojiPicker";
import { useConfirmDialog } from "../hooks/useConfirmDialog";

export default function SettingsPage() {
  const { updateUser } = useAuthStore();
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();
  const [categories, setCategories] = useState<ActivityCategory[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [newCategoryEmoji, setNewCategoryEmoji] = useState("😀");
  const [timezone, setTimezone] = useState("UTC");
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [tags, setTags] = useState<TripTag[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#3B82F6");
  const [newTagTextColor, setNewTagTextColor] = useState("#FFFFFF");
  const [editingTagId, setEditingTagId] = useState<number | null>(null);
  const [editingTagColor, setEditingTagColor] = useState("#3B82F6");
  const [editingTagTextColor, setEditingTagTextColor] = useState("#FFFFFF");
  const [backendVersion, setBackendVersion] = useState<string>("");
  const timezoneSelectId = useId();
  const currentUsernameId = useId();
  const newUsernameId = useId();
  const currentPasswordId = useId();
  const newPasswordId = useId();
  const confirmPasswordId = useId();
  const newTagColorId = useId();
  const newTagTextColorId = useId();

  useEffect(() => {
    loadSettings();
    loadTags();
    loadBackendVersion();
  }, []);

  const loadSettings = async () => {
    try {
      const user = await userService.getMe();
      setCategories(user.activityCategories || []);
      setTimezone(user.timezone || "UTC");
      setUsername(user.username);
      setNewUsername(user.username);
    } catch (error) {
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const loadTags = async () => {
    try {
      const allTags = await tagService.getAllTags();
      setTags(allTags);
    } catch (error) {
      toast.error("Failed to load tags");
    }
  };

  const loadBackendVersion = async () => {
    try {
      const versionInfo = await apiService.getVersion();
      setBackendVersion(versionInfo.version);
    } catch (error) {
      console.error("Failed to load backend version:", error);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    try {
      await tagService.createTag({
        name: newTagName.trim(),
        color: newTagColor,
        textColor: newTagTextColor,
      });
      setNewTagName("");
      setNewTagColor("#3B82F6");
      setNewTagTextColor("#FFFFFF");
      await loadTags();
      toast.success("Tag created");
    } catch (error) {
      toast.error("Failed to create tag");
    }
  };

  const handleDeleteTag = async (tagId: number) => {
    const confirmed = await confirm({
      title: 'Delete Tag',
      message: 'Delete this tag? It will be removed from all trips.',
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (!confirmed) return;

    try {
      await tagService.deleteTag(tagId);
      await loadTags();
      toast.success("Tag deleted");
    } catch (error) {
      toast.error("Failed to delete tag");
    }
  };

  const handleStartEditTag = (tag: TripTag) => {
    setEditingTagId(tag.id);
    setEditingTagColor(tag.color || "#3B82F6");
    setEditingTagTextColor(tag.textColor || "#FFFFFF");
  };

  const handleCancelEditTag = () => {
    setEditingTagId(null);
    setEditingTagColor("#3B82F6");
    setEditingTagTextColor("#FFFFFF");
  };

  const handleSaveTagColors = async (tagId: number) => {
    try {
      await tagService.updateTag(tagId, {
        color: editingTagColor,
        textColor: editingTagTextColor,
      });
      await loadTags();
      setEditingTagId(null);
      toast.success("Tag colors updated");
    } catch (error) {
      toast.error("Failed to update tag colors");
    }
  };

  const handleAddCategory = () => {
    if (!newCategory.trim()) return;
    if (
      categories.some(
        (c) => c.name.toLowerCase() === newCategory.trim().toLowerCase()
      )
    ) {
      toast.error("Category already exists");
      return;
    }
    setCategories([
      ...categories,
      { name: newCategory.trim(), emoji: newCategoryEmoji },
    ]);
    setNewCategory("");
    setNewCategoryEmoji("😀");
  };

  const handleRemoveCategory = (categoryName: string) => {
    setCategories(categories.filter((c) => c.name !== categoryName));
  };

  const handleUpdateCategoryEmoji = (
    categoryName: string,
    newEmoji: string
  ) => {
    setCategories(
      categories.map((c) =>
        c.name === categoryName ? { ...c, emoji: newEmoji } : c
      )
    );
  };

  const handleSave = async () => {
    try {
      await userService.updateSettings({
        activityCategories: categories,
        timezone: timezone,
      });
      toast.success("Settings saved");
    } catch (error) {
      toast.error("Failed to save settings");
    }
  };

  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || newUsername === username) return;

    try {
      const result = await userService.updateUsername(newUsername.trim());
      setUsername(result.username);
      setNewUsername(result.username);
      // Update the username in the auth store so navbar reflects change
      updateUser({ username: result.username });
      toast.success(result.message);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update username");
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword) {
      toast.error("Please fill in all password fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }

    try {
      const result = await userService.updatePassword(
        currentPassword,
        newPassword
      );
      toast.success(result.message);
      // Clear password fields
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update password");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="max-w-7xl mx-auto px-6 py-8">
        <Link
          to="/dashboard"
          className="text-blue-600 dark:text-blue-400 hover:underline mb-6 inline-block"
        >
          ← Back to Dashboard
        </Link>

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Settings
          </h1>
          <div className="text-sm text-gray-500 dark:text-gray-400 text-right">
            <div>
              Frontend: <span className="font-mono">{__APP_VERSION__}</span>
            </div>
            <div>
              Backend:{" "}
              <span className="font-mono">
                {backendVersion || "Loading..."}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Name */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Name
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Change your name (must be 3-50 characters).
            </p>
            <form onSubmit={handleUpdateUsername} className="space-y-4">
              <div>
                <label className="label" htmlFor={currentUsernameId}>
                  Current Name
                </label>
                <input
                  type="text"
                  id={currentUsernameId}
                  value={username}
                  disabled
                  className="input w-full max-w-md bg-gray-100 dark:bg-gray-700"
                />
              </div>
              <div>
                <label className="label" htmlFor={newUsernameId}>
                  New Name
                </label>
                <input
                  type="text"
                  id={newUsernameId}
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="input w-full max-w-md"
                  minLength={3}
                  maxLength={50}
                  required
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!newUsername.trim() || newUsername === username}
              >
                Update Name
              </button>
            </form>
          </div>

          {/* Password */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Change Password
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Update your password (minimum 6 characters).
            </p>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="label" htmlFor={currentPasswordId}>
                  Current Password
                </label>
                <input
                  type="password"
                  id={currentPasswordId}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="input w-full max-w-md"
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor={newPasswordId}>
                  New Password
                </label>
                <input
                  type="password"
                  id={newPasswordId}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input w-full max-w-md"
                  minLength={6}
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor={confirmPasswordId}>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  id={confirmPasswordId}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input w-full.max-w-md"
                  minLength={6}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary">
                Update Password
              </button>
            </form>
          </div>

          {/* Immich Integration */}
          <ImmichSettings />

          {/* Weather Settings */}
          <WeatherSettings />

          {/* Timezone Setting */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Timezone
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Set your home timezone to ensure dates are displayed correctly.
            </p>
            <label htmlFor={timezoneSelectId} className="sr-only">
              Timezone
            </label>
            <select
              id={timezoneSelectId}
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="input w-full max-w-md"
            >
              <option value="UTC">UTC (Coordinated Universal Time)</option>
              <option value="America/New_York">
                Eastern Time (US & Canada)
              </option>
              <option value="America/Chicago">
                Central Time (US & Canada)
              </option>
              <option value="America/Denver">
                Mountain Time (US & Canada)
              </option>
              <option value="America/Los_Angeles">
                Pacific Time (US & Canada)
              </option>
              <option value="America/Anchorage">Alaska</option>
              <option value="Pacific/Honolulu">Hawaii</option>
              <option value="Europe/London">London</option>
              <option value="Europe/Paris">Paris</option>
              <option value="Europe/Berlin">Berlin</option>
              <option value="Asia/Tokyo">Tokyo</option>
              <option value="Asia/Shanghai">Shanghai</option>
              <option value="Asia/Dubai">Dubai</option>
              <option value="Australia/Sydney">Sydney</option>
              <option value="Pacific/Auckland">Auckland</option>
            </select>
            <div className="mt-4">
              <button onClick={handleSave} className="btn btn-primary">
                Save Timezone
              </button>
            </div>
          </div>

          {/* Activity Categories */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Activity Categories
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Customize the activity categories available when creating
              activities in your trips. Each category requires a name and an
              emoji.
            </p>

            {/* Add New Category */}
            <div className="flex gap-2 mb-4">
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 rounded-lg px-3">
                <EmojiPicker
                  value={newCategoryEmoji}
                  onChange={setNewCategoryEmoji}
                />
              </div>
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAddCategory()}
                placeholder="New category name"
                className="input flex-1"
              />
              <button
                onClick={handleAddCategory}
                type="button"
                className="btn btn-primary"
              >
                Add Category
              </button>
            </div>

            {/* Categories List */}
            <div className="space-y-2">
              {categories.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                  No categories yet. Add your first category above.
                </p>
              ) : (
                categories.map((category) => (
                  <div
                    key={category.name}
                    className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-lg p-3"
                  >
                    <div className="flex items-center gap-3">
                      <EmojiPicker
                        value={category.emoji}
                        onChange={(emoji) =>
                          handleUpdateCategoryEmoji(category.name, emoji)
                        }
                      />
                      <span className="text-gray-900 dark:text-white">
                        {category.name}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemoveCategory(category.name)}
                      className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Save Button */}
            <div className="mt-6">
              <button onClick={handleSave} className="btn btn-primary">
                Save Settings
              </button>
            </div>
          </div>

          {/* Global Tag Management */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Trip Tags
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Create and manage tags that can be assigned to trips. Tags help
              organize and categorize your trips.
            </p>

            {/* Create New Tag */}
            <div className="space-y-3 mb-4">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleCreateTag()}
                placeholder="New tag name"
                className="input w-full"
              />
              <div className="flex gap-4">
                <div className="flex-1">
                  <label
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    htmlFor={newTagColorId}
                  >
                    Background Color
                  </label>
                  <input
                    type="color"
                    id={newTagColorId}
                    value={newTagColor}
                    onChange={(e) => setNewTagColor(e.target.value)}
                    className="h-10 w-full rounded border border-gray-300 dark:border-gray-600"
                  />
                </div>
                <div className="flex-1">
                  <label
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    htmlFor={newTagTextColorId}
                  >
                    Text Color
                  </label>
                  <input
                    type="color"
                    id={newTagTextColorId}
                    value={newTagTextColor}
                    onChange={(e) => setNewTagTextColor(e.target.value)}
                    className="h-10 w-full rounded border border-gray-300 dark:border-gray-600"
                  />
                </div>
              </div>
              <button
                onClick={handleCreateTag}
                className="btn btn-primary w-full"
              >
                Create Tag
              </button>
            </div>

            {/* Tags List */}
            <div className="space-y-2">
              {tags.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                  No tags yet. Create your first tag above.
                </p>
              ) : (
                tags.map((tag) => (
                  <div
                    key={tag.id}
                    className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3"
                  >
                    {editingTagId === tag.id ? (
                      // Edit mode
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <span
                            className="px-3 py-1 rounded-full text-sm font-medium"
                            style={{
                              backgroundColor: editingTagColor,
                              color: editingTagTextColor,
                            }}
                          >
                            {tag.name}
                          </span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            (Preview)
                          </span>
                        </div>
                        <div className="flex gap-4">
                          <div className="flex-1">
                            <label
                              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                              htmlFor={`edit-tag-bg-${tag.id}`}
                            >
                              Background Color
                            </label>
                            <input
                              type="color"
                              id={`edit-tag-bg-${tag.id}`}
                              value={editingTagColor}
                              onChange={(e) =>
                                setEditingTagColor(e.target.value)
                              }
                              className="h-10 w-full rounded border border-gray-300 dark:border-gray-600"
                            />
                          </div>
                          <div className="flex-1">
                            <label
                              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                              htmlFor={`edit-tag-text-${tag.id}`}
                            >
                              Text Color
                            </label>
                            <input
                              type="color"
                              id={`edit-tag-text-${tag.id}`}
                              value={editingTagTextColor}
                              onChange={(e) =>
                                setEditingTagTextColor(e.target.value)
                              }
                              className="h-10 w-full rounded border border-gray-300 dark:border-gray-600"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveTagColors(tag.id)}
                            type="button"
                            className="btn btn-primary text-sm"
                          >
                            Save Colors
                          </button>
                          <button
                            onClick={handleCancelEditTag}
                            type="button"
                            className="btn btn-secondary text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      // View mode
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span
                            className="px-3 py-1 rounded-full text-sm font-medium"
                            style={{
                              backgroundColor: tag.color || "#3B82F6",
                              color: tag.textColor || "#FFFFFF",
                            }}
                          >
                            {tag.name}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleStartEditTag(tag)}
                            type="button"
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            Edit Colors
                          </button>
                          <button
                            onClick={() => handleDeleteTag(tag.id)}
                            type="button"
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        {ConfirmDialogComponent}
      </main>
    </div>
  );
}
