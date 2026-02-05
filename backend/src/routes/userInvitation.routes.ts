import { Router } from 'express';
import { userInvitationController } from '../controllers/userInvitation.controller';
import { authenticate } from '../middleware/auth';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting for invitation endpoints
const invitationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 invitations per 15 minutes
  message: { status: 'error', message: 'Too many invitation requests. Please try again later.' },
});

const publicInvitationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per 15 minutes
  message: { status: 'error', message: 'Too many requests. Please try again later.' },
});

// ============================================
// AUTHENTICATED ROUTES (require login)
// ============================================

// Get email configuration status
router.get('/email-status', authenticate, userInvitationController.getEmailStatus);

// Get all invitations sent by the current user
router.get('/', authenticate, userInvitationController.getSentInvitations);

// Send a new invitation
router.post('/', authenticate, invitationLimiter, userInvitationController.sendInvitation);

// Cancel a pending invitation
router.delete('/:invitationId', authenticate, userInvitationController.cancelInvitation);

// Resend an invitation
router.post('/:invitationId/resend', authenticate, invitationLimiter, userInvitationController.resendInvitation);

// ============================================
// PUBLIC ROUTES (no login required)
// ============================================
//
// CSRF PROTECTION STRATEGY FOR PUBLIC ENDPOINTS:
//
// These endpoints are accessible to unauthenticated users who don't have
// CSRF tokens. Instead of traditional CSRF protection, security is provided by:
//
// 1. INVITATION TOKEN AS CSRF EQUIVALENT:
//    - The invitation token is cryptographically random (crypto.randomBytes)
//    - Only the invitation recipient knows the token (sent via email)
//    - Tokens are single-use (consumed on accept/decline)
//    - Tokens expire after the configured period
//    - An attacker cannot forge or guess valid tokens
//
// 2. RATE LIMITING:
//    - 20 requests per 15 minutes per IP address
//    - Prevents brute-force token guessing
//    - Makes token enumeration attacks impractical
//
// 3. CORS CONFIGURATION:
//    - Only allowed origins can make requests
//    - Prevents cross-origin attacks from malicious websites
//
// 4. INPUT VALIDATION:
//    - All inputs are validated with Zod schemas
//    - Token format and existence are verified before processing
//
// The CSRF middleware in src/utils/csrf.ts explicitly skips these routes
// because the invitation token provides equivalent protection.
// ============================================

// Get invitation details by token (for viewing before accepting)
router.get('/token/:token', publicInvitationLimiter, userInvitationController.getInvitationByToken);

// Accept an invitation and create account
router.post('/accept', publicInvitationLimiter, userInvitationController.acceptInvitation);

// Decline an invitation
router.post('/decline/:token', publicInvitationLimiter, userInvitationController.declineInvitation);

export default router;
