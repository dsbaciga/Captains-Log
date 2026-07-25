import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import savedLinkService from "../services/savedLink.service";
import tripService from "../services/trip.service";
import {
  savedLinkDisplayTitle,
  savedLinkHostname,
  type SavedLink,
} from "../types/savedLink";
import { useConfirmDialog } from "../hooks/useConfirmDialog";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import { ListItemSkeleton } from "../components/SkeletonLoader";

/**
 * The saved-links inbox: links that exist but have not been assigned to a trip.
 *
 * This is the triage surface for the feature. Links arrive here from the
 * "Add Link" form below and (once email ingest ships) from forwarded mail.
 * Assigning a trip moves the link onto that trip's Links tab, where it can be
 * attached to individual entities.
 */
export default function SavedLinksInboxPage() {
  const queryClient = useQueryClient();
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();

  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [assigning, setAssigning] = useState<number | null>(null);

  const { data: links, isLoading } = useQuery({
    queryKey: ["savedLinks", "inbox"],
    queryFn: () => savedLinkService.getSavedLinks("none"),
  });

  // Include archived trips: a link may well belong to a past trip.
  const { data: tripsResponse } = useQuery({
    queryKey: ["trips", "savedLinkPicker"],
    queryFn: () => tripService.getTrips({ archived: "all", limit: 200 }),
  });
  const trips = tripsResponse?.trips;

  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: ["savedLinks"] });
    queryClient.invalidateQueries({ queryKey: ["savedLinksInboxCount"] });
  };

  const handleAdd = async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      toast.error("A URL is required");
      return;
    }

    setSaving(true);
    try {
      await savedLinkService.createSavedLink({
        url: trimmed,
        notes: notes.trim() || undefined,
      });
      setUrl("");
      setNotes("");
      toast.success("Link saved — fetching preview");
      refreshData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save link");
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = async (link: SavedLink, tripId: number) => {
    setAssigning(link.id);
    try {
      await savedLinkService.updateSavedLink(link.id, { tripId });
      toast.success("Link moved to trip");
      refreshData();
    } catch {
      toast.error("Failed to assign link");
    } finally {
      setAssigning(null);
    }
  };

  const handleDelete = async (link: SavedLink) => {
    const confirmed = await confirm({
      title: "Delete link?",
      message: `"${savedLinkDisplayTitle(link)}" will be permanently removed.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!confirmed) return;

    try {
      await savedLinkService.deleteSavedLink(link.id);
      toast.success("Link deleted");
      refreshData();
    } catch {
      toast.error("Failed to delete link");
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <PageHeader
        title="Saved Links"
        subtitle="Pages you've saved that aren't attached to a trip yet"
      />

      {/* Quick add */}
      <div className="card mb-8 space-y-4">
        <div>
          <label className="label label-required" htmlFor="inbox-url">
            URL
          </label>
          <input
            id="inbox-url"
            type="url"
            className="input"
            placeholder="https://example.com/somewhere-worth-remembering"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !saving) handleAdd();
            }}
          />
          <p className="mt-1 text-xs text-slate dark:text-gray-400">
            Tracking parameters (utm_*, fbclid, and similar) are stripped
            automatically.
          </p>
        </div>

        <div>
          <label className="label" htmlFor="inbox-notes">
            Notes
          </label>
          <input
            id="inbox-notes"
            type="text"
            className="input"
            placeholder="Optional"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            className="btn-primary"
            onClick={handleAdd}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save Link"}
          </button>
        </div>
      </div>

      {isLoading ? (
        <ListItemSkeleton count={3} />
      ) : !links || links.length === 0 ? (
        <EmptyState
          icon="📥"
          message="Inbox is empty"
          subMessage="Links you save without picking a trip will land here"
        />
      ) : (
        <div className="space-y-4">
          {links.map((link) => (
            <div key={link.id} className="card flex gap-4">
              {link.imageUrl && (
                <img
                  src={link.imageUrl}
                  alt=""
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              )}

              <div className="min-w-0 flex-1">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="font-medium text-charcoal dark:text-gray-100 hover:text-primary-600 dark:hover:text-gold line-clamp-2"
                >
                  {savedLinkDisplayTitle(link)}
                </a>

                <p className="text-xs text-slate dark:text-gray-400 mt-0.5">
                  {savedLinkHostname(link)}
                  {link.source === "EMAIL" && " · from email"}
                </p>

                {link.description && (
                  <p className="text-sm text-slate dark:text-gray-400 mt-2 line-clamp-2">
                    {link.description}
                  </p>
                )}

                {link.notes && (
                  <p className="text-sm text-charcoal dark:text-gray-300 mt-2 italic line-clamp-2">
                    {link.notes}
                  </p>
                )}

                <div className="flex items-center gap-3 mt-3 flex-wrap">
                  <select
                    className="input py-1.5 text-sm max-w-[16rem]"
                    value=""
                    disabled={assigning === link.id}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      if (value) handleAssign(link, value);
                    }}
                    aria-label={`Assign "${savedLinkDisplayTitle(link)}" to a trip`}
                  >
                    <option value="">
                      {assigning === link.id ? "Moving…" : "Assign to trip…"}
                    </option>
                    {(trips ?? []).map((trip) => (
                      <option key={trip.id} value={trip.id}>
                        {trip.title}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    className="text-xs px-2 py-1 text-red-600 dark:text-red-400 hover:underline"
                    onClick={() => handleDelete(link)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialogComponent />
    </div>
  );
}
