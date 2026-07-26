import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock the service before importing the controller
jest.mock('../../services/travelPartnerRequest.service', () => ({
  travelPartnerRequestService: {
    sendRequest: jest.fn(),
    getRequests: jest.fn(),
    acceptRequest: jest.fn(),
    declineRequest: jest.fn(),
    cancelRequest: jest.fn(),
  },
}));

import { travelPartnerRequestService } from '../../services/travelPartnerRequest.service';
import { travelPartnerRequestController } from '../travelPartnerRequest.controller';
import {
  createAuthenticatedControllerArgs,
  createUnauthenticatedControllerArgs,
  expectSuccessResponse,
  expectAppError,
  type MockResponse,
} from '../../__tests__/mockBuilders/requests';
import { testUsers } from '../../__tests__/fixtures/users';

/**
 * These handlers answer 200s with a bare `res.json(...)` (the userController house
 * style) rather than `res.status(200).json(...)`, so `expectSuccessResponse` -- which
 * asserts on `res.status` -- only fits the 201 case. This checks the envelope directly.
 */
const expectJsonSuccess = (res: MockResponse, expectedData: unknown) => {
  expect(res.json).toHaveBeenCalledWith({ status: 'success', data: expectedData });
};

const caller = testUsers.user1;
const other = testUsers.user2;

const pendingRequest = {
  id: 7,
  status: 'PENDING' as const,
  message: null,
  shareExistingTrips: false,
  respondedAt: null,
  createdAt: new Date('2026-07-01T00:00:00.000Z'),
  requester: { id: caller.id, username: caller.username, avatarUrl: null },
  recipient: { id: other.id, username: other.username, avatarUrl: null },
};

const acceptResult = {
  travelPartnerId: other.id,
  defaultPartnerPermission: 'edit',
  travelPartner: {
    id: other.id,
    username: other.username,
    email: other.email,
    avatarUrl: null,
  },
  sharedTripCount: 0,
  receivedTripCount: 0,
};

describe('travelPartnerRequest.controller', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('sendRequest', () => {
    it('should send a request for the authenticated user and return 201', async () => {
      jest.mocked(travelPartnerRequestService.sendRequest).mockResolvedValue(pendingRequest);

      const { req, res, next } = createAuthenticatedControllerArgs(caller, {
        body: { recipientId: other.id, message: 'Lets travel together' },
      });
      await travelPartnerRequestController.sendRequest(req, res, next);

      expect(next).not.toHaveBeenCalled();
      // The requester is always taken from the token, never from the body.
      expect(travelPartnerRequestService.sendRequest).toHaveBeenCalledWith(caller.id, {
        recipientId: other.id,
        message: 'Lets travel together',
      });
      expectSuccessResponse(res, 201, pendingRequest);
    });

    it('should forward the requester shareExistingTrips opt-in', async () => {
      jest
        .mocked(travelPartnerRequestService.sendRequest)
        .mockResolvedValue({ ...pendingRequest, shareExistingTrips: true });

      const { req, res, next } = createAuthenticatedControllerArgs(caller, {
        body: { recipientId: other.id, shareExistingTrips: true },
      });
      await travelPartnerRequestController.sendRequest(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(travelPartnerRequestService.sendRequest).toHaveBeenCalledWith(caller.id, {
        recipientId: other.id,
        shareExistingTrips: true,
      });
    });

    it('should reject an unauthenticated caller', async () => {
      const { req, res, next } = createUnauthenticatedControllerArgs({
        body: { recipientId: other.id },
      });
      await travelPartnerRequestController.sendRequest(req, res, next);

      expectAppError(next, { statusCode: 401 });
      expect(travelPartnerRequestService.sendRequest).not.toHaveBeenCalled();
    });

    it('should pass validation errors to next()', async () => {
      const { req, res, next } = createAuthenticatedControllerArgs(caller, {
        body: { recipientId: 'not-a-number' },
      });
      await travelPartnerRequestController.sendRequest(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(travelPartnerRequestService.sendRequest).not.toHaveBeenCalled();
    });
  });

  describe('getRequests', () => {
    it('should return the caller incoming and outgoing requests', async () => {
      const payload = { incoming: [pendingRequest], outgoing: [] };
      jest.mocked(travelPartnerRequestService.getRequests).mockResolvedValue(payload);

      const { req, res, next } = createAuthenticatedControllerArgs(caller);
      await travelPartnerRequestController.getRequests(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(travelPartnerRequestService.getRequests).toHaveBeenCalledWith(caller.id);
      expectJsonSuccess(res, payload);
    });
  });

  describe('acceptRequest', () => {
    it('should accept using the caller id from the token', async () => {
      jest.mocked(travelPartnerRequestService.acceptRequest).mockResolvedValue(acceptResult);

      const { req, res, next } = createAuthenticatedControllerArgs(caller, {
        params: { requestId: '7' },
      });
      await travelPartnerRequestController.acceptRequest(req, res, next);

      expect(next).not.toHaveBeenCalled();
      // An empty body means "do not back-share my existing trips".
      expect(travelPartnerRequestService.acceptRequest).toHaveBeenCalledWith(caller.id, 7, {});
      expectJsonSuccess(res, {
        message: 'Travel partner request accepted',
        ...acceptResult,
      });
    });

    it('should forward the recipient shareExistingTrips opt-in', async () => {
      jest.mocked(travelPartnerRequestService.acceptRequest).mockResolvedValue({
        ...acceptResult,
        sharedTripCount: 3,
      });

      const { req, res, next } = createAuthenticatedControllerArgs(caller, {
        params: { requestId: '7' },
        body: { shareExistingTrips: true },
      });
      await travelPartnerRequestController.acceptRequest(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(travelPartnerRequestService.acceptRequest).toHaveBeenCalledWith(caller.id, 7, {
        shareExistingTrips: true,
      });
    });

    it('should reject a non-boolean shareExistingTrips', async () => {
      const { req, res, next } = createAuthenticatedControllerArgs(caller, {
        params: { requestId: '7' },
        body: { shareExistingTrips: 'yes' },
      });
      await travelPartnerRequestController.acceptRequest(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(travelPartnerRequestService.acceptRequest).not.toHaveBeenCalled();
    });

    it('should reject a non-numeric request id', async () => {
      const { req, res, next } = createAuthenticatedControllerArgs(caller, {
        params: { requestId: 'abc' },
      });
      await travelPartnerRequestController.acceptRequest(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(travelPartnerRequestService.acceptRequest).not.toHaveBeenCalled();
    });
  });

  describe('declineRequest', () => {
    it('should decline using the caller id from the token', async () => {
      jest.mocked(travelPartnerRequestService.declineRequest).mockResolvedValue({
        message: 'Travel partner request declined',
      });

      const { req, res, next } = createAuthenticatedControllerArgs(caller, {
        params: { requestId: '7' },
      });
      await travelPartnerRequestController.declineRequest(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(travelPartnerRequestService.declineRequest).toHaveBeenCalledWith(caller.id, 7);
      expectJsonSuccess(res, { message: 'Travel partner request declined' });
    });
  });

  describe('cancelRequest', () => {
    it('should cancel using the caller id from the token', async () => {
      jest.mocked(travelPartnerRequestService.cancelRequest).mockResolvedValue({
        message: 'Travel partner request cancelled',
      });

      const { req, res, next } = createAuthenticatedControllerArgs(caller, {
        params: { requestId: '7' },
      });
      await travelPartnerRequestController.cancelRequest(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(travelPartnerRequestService.cancelRequest).toHaveBeenCalledWith(caller.id, 7);
      expectJsonSuccess(res, { message: 'Travel partner request cancelled' });
    });

    it('should reject an unauthenticated caller', async () => {
      const { req, res, next } = createUnauthenticatedControllerArgs({
        params: { requestId: '7' },
      });
      await travelPartnerRequestController.cancelRequest(req, res, next);

      expectAppError(next, { statusCode: 401 });
      expect(travelPartnerRequestService.cancelRequest).not.toHaveBeenCalled();
    });
  });
});
