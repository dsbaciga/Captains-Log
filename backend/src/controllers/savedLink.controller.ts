import savedLinkService from '../services/savedLink.service';
import {
  bulkDeleteSavedLinksSchema,
  createSavedLinkSchema,
  listSavedLinksQuerySchema,
  updateSavedLinkSchema,
} from '../types/savedLink.types';
import { createCrudController } from '../prisma/crudHelpers';
import { parseId } from '../http/parseId';

export const savedLinkController = createCrudController({
  service: savedLinkService,
  handlers: {
    createSavedLink: {
      method: 'createSavedLink',
      statusCode: 201,
      bodySchema: createSavedLinkSchema,
      buildArgs: (userId, _req, body) => [userId, body],
    },
    getSavedLinks: {
      method: 'getSavedLinks',
      buildArgs: (userId, req) => [
        userId,
        listSavedLinksQuerySchema.parse(req.query),
      ],
    },
    getSavedLinksByTrip: {
      method: 'getSavedLinksByTrip',
      buildArgs: (userId, req) => [userId, parseId(req.params.tripId, 'tripId')],
    },
    getSavedLinkById: {
      method: 'getSavedLinkById',
      buildArgs: (userId, req) => [userId, parseId(req.params.id)],
    },
    updateSavedLink: {
      method: 'updateSavedLink',
      bodySchema: updateSavedLinkSchema,
      buildArgs: (userId, req, body) => [userId, parseId(req.params.id), body],
    },
    deleteSavedLink: {
      method: 'deleteSavedLink',
      buildArgs: (userId, req) => [userId, parseId(req.params.id)],
    },
    bulkDeleteSavedLinks: {
      method: 'bulkDeleteSavedLinks',
      bodySchema: bulkDeleteSavedLinksSchema,
      buildArgs: (userId, _req, body) => [userId, body],
    },
    deleteUnassignedSavedLinks: {
      method: 'deleteUnassignedSavedLinks',
      buildArgs: (userId) => [userId],
    },
    refreshMetadata: {
      method: 'refreshMetadata',
      buildArgs: (userId, req) => [userId, parseId(req.params.id)],
    },
    getInboxCount: {
      method: 'getInboxCount',
      buildArgs: (userId) => [userId],
    },
  },
});
