import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import entityLinkService from '../services/entityLink.service';
import type { EnrichedEntityLink, LinkRelationship } from '../types/entityLink';
import {
  ENTITY_TYPE_CONFIG,
  RELATIONSHIP_CONFIG,
  ALL_RELATIONSHIP_TYPES,
  getRelationshipLabel,
} from '../lib/entityConfig';
import toast from 'react-hot-toast';

interface LinkEditModalProps {
  tripId: number;
  link: EnrichedEntityLink;
  onClose: () => void;
  onSuccess: () => void;
}

export default function LinkEditModal({
  tripId,
  link,
  onClose,
  onSuccess,
}: LinkEditModalProps) {
  const [relationship, setRelationship] = useState<LinkRelationship>(link.relationship);
  const [notes, setNotes] = useState(link.notes || '');

  const updateMutation = useMutation({
    mutationFn: () =>
      entityLinkService.updateLink(tripId, link.id, {
        relationship,
        notes: notes.trim() || null,
      }),
    onSuccess: () => {
      toast.success('Link updated');
      onSuccess();
    },
    onError: () => {
      toast.error('Failed to update link');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate();
  };

  const sourceConfig = ENTITY_TYPE_CONFIG[link.sourceType];
  const targetConfig = ENTITY_TYPE_CONFIG[link.targetType];
  const sourceName = link.sourceEntity?.name || link.sourceEntity?.title || link.sourceEntity?.caption || `ID: ${link.sourceId}`;
  const targetName = link.targetEntity?.name || link.targetEntity?.title || link.targetEntity?.caption || `ID: ${link.targetId}`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Edit Link
          </h3>
          <button
            onClick={onClose}
            type="button"
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Link visualization */}
          <div className="flex items-center justify-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="text-center">
              <span className="text-xl">{sourceConfig.emoji}</span>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 max-w-[100px] truncate">
                {sourceName}
              </div>
            </div>
            <div className="flex items-center gap-1 text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </div>
            <div className="text-center">
              <span className="text-xl">{targetConfig.emoji}</span>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 max-w-[100px] truncate">
                {targetName}
              </div>
            </div>
          </div>

          {/* Relationship type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Relationship Type
            </label>
            <select
              value={relationship}
              onChange={(e) => setRelationship(e.target.value as LinkRelationship)}
              className="input w-full"
            >
              {ALL_RELATIONSHIP_TYPES.map((type) => (
                <option key={type} value={type}>
                  {getRelationshipLabel(type)} - {RELATIONSHIP_CONFIG[type].description}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add a note about this link..."
              rows={3}
              maxLength={1000}
              className="input w-full resize-none"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {notes.length}/1000 characters
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="btn btn-primary flex-1"
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
