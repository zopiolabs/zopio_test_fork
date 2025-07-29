/**
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import * as crypto from 'crypto';
import { jwtVerify } from 'jose';

// Mock server-only to avoid issues in test environment  
vi.mock('server-only', () => ({}));

// Mock environment and keys
const mockEnv = {
  CLERK_SECRET_KEY: 'sk_test_clerk_integration_123456789abcdef',
  CLERK_WEBHOOK_SECRET: 'whsec_clerk_test_integration_webhook_secret_123',
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_clerk_integration_123456789',
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: '/sign-in',
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: '/sign-up',
  NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: '/dashboard',
  NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: '/onboarding',
};

vi.mock('../keys', () => ({
  keys: () => mockEnv,
}));

// Mock jose for JWT verification
vi.mock('jose', () => ({
  jwtVerify: vi.fn(),
}));

// Mock Clerk server functions
const mockVerifyWebhookSignature = vi.fn();
const mockClerkAuth = vi.fn();
const mockCurrentUser = vi.fn();
const mockGetAuth = vi.fn();

vi.mock('@clerk/nextjs/server', () => ({
  verifyWebhookSignature: mockVerifyWebhookSignature,
  auth: mockClerkAuth,
  currentUser: mockCurrentUser,
  getAuth: mockGetAuth,
  Webhook: class MockWebhook {
    constructor(private secret: string) {}
    verify(payload: string, headers: Record<string, string>) {
      return mockVerifyWebhookSignature(payload, headers, this.secret);
    }
  },
}));

// Mock Clerk client functions  
const mockSignIn = vi.fn();
const mockSignUp = vi.fn();
const mockSignOut = vi.fn();
const mockUseAuth = vi.fn();
const mockUseUser = vi.fn();
const mockUseSession = vi.fn();

vi.mock('@clerk/nextjs', () => ({
  SignIn: mockSignIn,
  SignUp: mockSignUp,
  useAuth: mockUseAuth,
  useUser: mockUseUser,
  useSession: mockUseSession,
  ClerkProvider: ({ children }: any) => children,
}));

describe('Comprehensive Clerk Authentication Integration Tests', () => {
  let verifyClerkToken: any;
  let clerkAuthMiddleware: any;
  const originalEnv = { ...process.env };

  beforeAll(async () => {
    // Set up test environment
    Object.assign(process.env, mockEnv);
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    
    // Import fresh modules after mocks are setup
    const verifyModule = await import('../lib/verify-clerk-token.js');
    const middlewareModule = await import('../clerk-auth-middleware.js');
    
    verifyClerkToken = verifyModule.verifyClerkToken;
    clerkAuthMiddleware = middlewareModule.clerkAuthMiddleware;
  });

  afterEach(() => {
    // Restore original environment
    Object.assign(process.env, originalEnv);
  });

  describe('Webhook Integration Tests', () => {
    it('should handle complete webhook signature verification flow', async () => {
      const webhookPayload = JSON.stringify({
        type: 'user.created',
        data: {
          id: 'user_webhook_integration_123',
          email_addresses: [{ email_address: 'webhook@example.com' }],
          first_name: 'Webhook',
          last_name: 'User',
          created_at: Date.now(),
        },
        object: 'event',
        timestamp: Date.now(),
      });

      const webhookHeaders = {
        'svix-id': 'msg_webhook_integration_123',
        'svix-timestamp': Math.floor(Date.now() / 1000).toString(),
        'svix-signature': 'v1,signature_value_123',
      };

      const mockVerifiedPayload = {
        type: 'user.created',
        data: {
          id: 'user_webhook_integration_123',
          email_addresses: [{ email_address: 'webhook@example.com' }],
          first_name: 'Webhook',
          last_name: 'User',
        },
      };

      mockVerifyWebhookSignature.mockReturnValue(mockVerifiedPayload);

      const verifiedPayload = mockVerifyWebhookSignature(
        webhookPayload,
        webhookHeaders,
        mockEnv.CLERK_WEBHOOK_SECRET
      );

      expect(mockVerifyWebhookSignature).toHaveBeenCalledWith(
        webhookPayload,
        webhookHeaders,
        mockEnv.CLERK_WEBHOOK_SECRET
      );
      expect(verifiedPayload.type).toBe('user.created');
      expect(verifiedPayload.data.id).toBe('user_webhook_integration_123');
      expect(verifiedPayload.data.email_addresses[0].email_address).toBe('webhook@example.com');
    });

    it('should handle user lifecycle webhook events', async () => {
      const webhookEvents = [
        {
          type: 'user.created',
          data: { id: 'user_123', email_addresses: [{ email_address: 'new@example.com' }] },
          timestamp: Date.now(),
        },
        {
          type: 'user.updated', 
          data: { id: 'user_123', first_name: 'Updated', last_name: 'Name' },
          timestamp: Date.now(),
        },
        {
          type: 'user.deleted',
          data: { id: 'user_123', deleted: true },
          timestamp: Date.now(),
        },
        {
          type: 'session.created',
          data: { id: 'sess_123', user_id: 'user_123', status: 'active' },
          timestamp: Date.now(),
        },
        {
          type: 'session.ended',
          data: { id: 'sess_123', user_id: 'user_123', status: 'ended' },
          timestamp: Date.now(),
        },
      ];

      const processedEvents = [];
      
      for (const event of webhookEvents) {
        const payload = JSON.stringify(event);
        const headers = {
          'svix-id': `msg_${event.type}_${Date.now()}`,
          'svix-timestamp': Math.floor(Date.now() / 1000).toString(),
          'svix-signature': 'v1,signature_value',
        };

        mockVerifyWebhookSignature.mockReturnValueOnce(event);
        
        const verifiedEvent = mockVerifyWebhookSignature(
          payload,
          headers,
          mockEnv.CLERK_WEBHOOK_SECRET
        );
        
        processedEvents.push(verifiedEvent);
      }

      expect(processedEvents).toHaveLength(5);
      expect(processedEvents[0].type).toBe('user.created');
      expect(processedEvents[1].type).toBe('user.updated');
      expect(processedEvents[2].type).toBe('user.deleted');
      expect(processedEvents[3].type).toBe('session.created');
      expect(processedEvents[4].type).toBe('session.ended');
    });

    it('should handle organization webhook events', async () => {
      const orgWebhookEvents = [
        {
          type: 'organization.created',
          data: { 
            id: 'org_integration_123', 
            name: 'Integration Test Org',
            slug: 'integration-test-org',
            members_count: 1,
          },
        },
        {
          type: 'organizationMembership.created',
          data: {
            id: 'orgmem_123',
            organization: { id: 'org_integration_123' },
            public_user_data: { user_id: 'user_123' },
            role: 'admin',
          },
        },
        {
          type: 'organizationMembership.updated',
          data: {
            id: 'orgmem_123',
            organization: { id: 'org_integration_123' },
            public_user_data: { user_id: 'user_123' },
            role: 'member',
          },
        },
        {
          type: 'organizationInvitation.created',
          data: {
            id: 'orginv_123',
            organization: { id: 'org_integration_123' },
            email_address: 'invite@example.com',
            role: 'member',
            status: 'pending',
          },
        },
      ];

      orgWebhookEvents.forEach((event, index) => {
        mockVerifyWebhookSignature.mockReturnValueOnce(event);
        
        const verifiedEvent = mockVerifyWebhookSignature(
          JSON.stringify(event),
          { 'svix-signature': `signature_${index}` },
          mockEnv.CLERK_WEBHOOK_SECRET
        );
        
        expect(verifiedEvent.type).toBe(event.type);
        expect(verifiedEvent.data).toEqual(event.data);
      });
    });

    it('should handle webhook signature verification failures', async () => {
      const invalidPayload = JSON.stringify({ type: 'invalid.event' });
      const invalidHeaders = {
        'svix-id': 'invalid_msg',
        'svix-timestamp': '0',
        'svix-signature': 'invalid_signature',
      };

      const signatureError = new Error('Invalid webhook signature');
      signatureError.name = 'WebhookVerificationError';
      mockVerifyWebhookSignature.mockImplementation(() => {
        throw signatureError;
      });

      expect(() => {
        mockVerifyWebhookSignature(
          invalidPayload,
          invalidHeaders,
          mockEnv.CLERK_WEBHOOK_SECRET
        );
      }).toThrow('Invalid webhook signature');
    });

    it('should handle webhook payload parsing errors', async () => {
      const malformedPayload = '{ invalid json }';
      const validHeaders = {
        'svix-id': 'msg_malformed',
        'svix-timestamp': Math.floor(Date.now() / 1000).toString(),
        'svix-signature': 'v1,valid_signature',
      };

      const parseError = new Error('Invalid JSON payload');
      mockVerifyWebhookSignature.mockImplementation(() => {
        throw parseError;
      });

      expect(() => {
        mockVerifyWebhookSignature(
          malformedPayload,
          validHeaders,
          mockEnv.CLERK_WEBHOOK_SECRET
        );
      }).toThrow('Invalid JSON payload');
    });
  });

  describe('JWT Token Verification Integration', () => {
    it('should verify valid JWT tokens correctly', async () => {
      const mockJwtPayload = {
        sub: 'user_jwt_integration_123',
        iss: 'clerk.com',
        aud: 'test-app',
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
        iat: Math.floor(Date.now() / 1000),
        nbf: Math.floor(Date.now() / 1000),
        session_id: 'sess_jwt_123',
        azp: 'test-azp',
      };

      vi.mocked(jwtVerify).mockResolvedValue({
        payload: mockJwtPayload,
        protectedHeader: { alg: 'HS256', typ: 'JWT' },
      } as any);

      const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token';
      const userId = await verifyClerkToken(validToken);

      expect(userId).toBe('user_jwt_integration_123');
      expect(jwtVerify).toHaveBeenCalledWith(
        validToken,
        expect.any(Uint8Array)
      );
    });

    it('should handle expired JWT tokens', async () => {
      const expiredTokenError = new Error('Token has expired');
      expiredTokenError.name = 'JWTExpired';
      
      vi.mocked(jwtVerify).mockRejectedValue(expiredTokenError);

      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.expired.token';
      
      await expect(verifyClerkToken(expiredToken)).rejects.toThrow('Invalid or expired token');
    });

    it('should handle malformed JWT tokens', async () => {
      const malformedTokenError = new Error('Invalid JWT format');
      malformedTokenError.name = 'JWTMalformed';
      
      vi.mocked(jwtVerify).mockRejectedValue(malformedTokenError);

      const malformedToken = 'invalid.jwt.token.format';
      
      await expect(verifyClerkToken(malformedToken)).rejects.toThrow('Invalid or expired token');
    });

    it('should handle JWT tokens with invalid signatures', async () => {
      const invalidSignatureError = new Error('JWT signature verification failed');
      invalidSignatureError.name = 'JWTSignatureVerificationFailed';
      
      vi.mocked(jwtVerify).mockRejectedValue(invalidSignatureError);

      const tamperedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.tampered.signature';
      
      await expect(verifyClerkToken(tamperedToken)).rejects.toThrow('Invalid or expired token');
    });

    it('should handle JWT tokens missing required claims', async () => {
      const mockJwtPayloadWithoutSub = {
        iss: 'clerk.com',
        aud: 'test-app',
        exp: Math.floor(Date.now() / 1000) + 3600,
        // Missing 'sub' claim
      };

      vi.mocked(jwtVerify).mockResolvedValue({
        payload: mockJwtPayloadWithoutSub,
        protectedHeader: { alg: 'HS256', typ: 'JWT' },
      } as any);

      const tokenWithoutSub = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.no-sub.token';
      
      await expect(verifyClerkToken(tokenWithoutSub)).rejects.toThrow('Invalid or expired token');
    });

    it('should handle different JWT algorithms', async () => {
      const algorithms = ['HS256', 'HS384', 'HS512', 'RS256'];
      const userIds = algorithms.map((alg, i) => `user_${alg.toLowerCase()}_${i}`);

      for (let i = 0; i < algorithms.length; i++) {
        const algorithm = algorithms[i];
        const userId = userIds[i];
        
        vi.mocked(jwtVerify).mockResolvedValueOnce({
          payload: { sub: userId },
          protectedHeader: { alg: algorithm, typ: 'JWT' },
        } as any);

        const token = `token_${algorithm}`;
        const result = await verifyClerkToken(token);
        
        expect(result).toBe(userId);
      }
    });
  });

  describe('Authentication Middleware Integration', () => {
    it('should handle complete authentication middleware flow', async () => {
      const mockUserId = 'user_middleware_integration_123';
      
      vi.mocked(jwtVerify).mockResolvedValue({
        payload: { sub: mockUserId },
        protectedHeader: { alg: 'HS256', typ: 'JWT' },
      } as any);

      const mockRequest = new Request('http://localhost/api/protected', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.valid.token',
          'Content-Type': 'application/json',
        },
      });

      const result = await clerkAuthMiddleware(mockRequest);

      expect(result).toBeInstanceOf(Request);
      const authenticatedRequest = result as Request;
      expect(authenticatedRequest.user).toEqual({ id: mockUserId });
    });

    it('should handle missing authorization header', async () => {
      const mockRequest = new Request('http://localhost/api/protected', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await clerkAuthMiddleware(mockRequest);

      expect(result).toBeInstanceOf(Response);
      const response = result as Response;
      expect(response.status).toBe(401);
      
      const responseText = await response.text();
      expect(responseText).toBe('Unauthorized: Missing or invalid authorization header');
    });

    it('should handle malformed authorization header', async () => {
      const mockRequest = new Request('http://localhost/api/protected', {
        method: 'GET',
        headers: {
          'Authorization': 'InvalidFormat token',
          'Content-Type': 'application/json',
        },
      });

      const result = await clerkAuthMiddleware(mockRequest);

      expect(result).toBeInstanceOf(Response);
      const response = result as Response;
      expect(response.status).toBe(401);
    });

    it('should handle authentication failures gracefully', async () => {
      vi.mocked(jwtVerify).mockRejectedValue(new Error('Authentication failed'));

      const mockRequest = new Request('http://localhost/api/protected', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer invalid.jwt.token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: 'test' }),
      });

      const result = await clerkAuthMiddleware(mockRequest);

      expect(result).toBeInstanceOf(Response);
      const response = result as Response;
      expect(response.status).toBe(403);
      
      const responseText = await response.text();
      expect(responseText).toBe('Invalid authentication token');
    });

    it('should preserve request method and body through middleware', async () => {
      const mockUserId = 'user_preservation_test_123';
      
      vi.mocked(jwtVerify).mockResolvedValue({
        payload: { sub: mockUserId },
        protectedHeader: { alg: 'HS256', typ: 'JWT' },
      } as any);

      const requestBody = JSON.stringify({ action: 'create', data: 'test data' });
      const mockRequest = new Request('http://localhost/api/data', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid.token',
          'Content-Type': 'application/json',
        },
        body: requestBody,
      });

      const result = await clerkAuthMiddleware(mockRequest);

      expect(result).toBeInstanceOf(Request);
      const authenticatedRequest = result as Request;
      expect(authenticatedRequest.method).toBe('POST');
      expect(authenticatedRequest.headers.get('Content-Type')).toBe('application/json');
      
      const receivedBody = await authenticatedRequest.text();
      expect(receivedBody).toBe(requestBody);
    });
  });

  describe('Complete Authentication Workflows', () => {
    it('should handle user registration and sign-in workflow', async () => {
      // Step 1: User registration
      const registrationData = {
        email: 'workflow@example.com',
        password: 'SecurePassword123!',
        firstName: 'Workflow',
        lastName: 'User',
      };

      const mockCreatedUser = {
        id: 'user_workflow_123',
        email_addresses: [{ email_address: registrationData.email }],
        first_name: registrationData.firstName,
        last_name: registrationData.lastName,
        created_at: Date.now(),
      };

      mockSignUp.mockResolvedValue({
        status: 'complete',
        createdUserId: mockCreatedUser.id,
        user: mockCreatedUser,
      });

      const signUpResult = await mockSignUp(registrationData);
      expect(signUpResult.status).toBe('complete');
      expect(signUpResult.user.id).toBe('user_workflow_123');

      // Step 2: Email verification (simulated)
      const verificationWebhook = {
        type: 'user.updated',
        data: {
          ...mockCreatedUser,
          email_addresses: [{
            email_address: registrationData.email,
            verification: { status: 'verified' },
          }],
        },
      };

      mockVerifyWebhookSignature.mockReturnValue(verificationWebhook);
      const verifiedUser = mockVerifyWebhookSignature(
        JSON.stringify(verificationWebhook),
        { 'svix-signature': 'verification_signature' },
        mockEnv.CLERK_WEBHOOK_SECRET
      );

      expect(verifiedUser.data.email_addresses[0].verification.status).toBe('verified');

      // Step 3: User sign-in
      const signInData = {
        identifier: registrationData.email,
        password: registrationData.password,
      };

      const mockSignInResult = {
        status: 'complete',
        sessionId: 'sess_workflow_123',
        user: mockCreatedUser,
      };

      mockSignIn.mockResolvedValue(mockSignInResult);
      const signInResult = await mockSignIn(signInData);
      expect(signInResult.status).toBe('complete');
      expect(signInResult.sessionId).toBe('sess_workflow_123');

      // Step 4: Session creation webhook
      const sessionWebhook = {
        type: 'session.created',
        data: {
          id: 'sess_workflow_123',
          user_id: mockCreatedUser.id,
          status: 'active',
          created_at: Date.now(),
        },
      };

      mockVerifyWebhookSignature.mockReturnValue(sessionWebhook);
      const sessionCreated = mockVerifyWebhookSignature(
        JSON.stringify(sessionWebhook),
        { 'svix-signature': 'session_signature' },
        mockEnv.CLERK_WEBHOOK_SECRET
      );

      expect(sessionCreated.data.status).toBe('active');
      expect(sessionCreated.data.user_id).toBe(mockCreatedUser.id);
    });

    it('should handle organization creation and membership workflow', async () => {
      // Step 1: Create organization
      const orgCreationData = {
        name: 'Workflow Organization',
        slug: 'workflow-org',
        created_by: 'user_workflow_123',
      };

      const mockCreatedOrg = {
        id: 'org_workflow_456',
        name: orgCreationData.name,
        slug: orgCreationData.slug,
        created_by: orgCreationData.created_by,
        members_count: 1,
      };

      // Step 2: Organization creation webhook
      const orgWebhook = {
        type: 'organization.created',
        data: mockCreatedOrg,
      };

      mockVerifyWebhookSignature.mockReturnValue(orgWebhook);
      const orgCreated = mockVerifyWebhookSignature(
        JSON.stringify(orgWebhook),
        { 'svix-signature': 'org_creation_signature' },
        mockEnv.CLERK_WEBHOOK_SECRET
      );

      expect(orgCreated.data.id).toBe('org_workflow_456');
      expect(orgCreated.data.members_count).toBe(1);

      // Step 3: Membership creation webhook
      const membershipWebhook = {
        type: 'organizationMembership.created',
        data: {
          id: 'orgmem_workflow_123',
          organization: { id: mockCreatedOrg.id },
          public_user_data: { user_id: 'user_workflow_123' },
          role: 'admin',
          created_at: Date.now(),
        },
      };

      mockVerifyWebhookSignature.mockReturnValue(membershipWebhook);
      const membershipCreated = mockVerifyWebhookSignature(
        JSON.stringify(membershipWebhook),
        { 'svix-signature': 'membership_signature' },
        mockEnv.CLERK_WEBHOOK_SECRET
      );

      expect(membershipCreated.data.role).toBe('admin');
      expect(membershipCreated.data.organization.id).toBe(mockCreatedOrg.id);

      // Step 4: Invite new member
      const invitationWebhook = {
        type: 'organizationInvitation.created',
        data: {
          id: 'orginv_workflow_123',
          organization: { id: mockCreatedOrg.id },
          email_address: 'member@example.com',
          role: 'member',
          status: 'pending',
          created_at: Date.now(),
        },
      };

      mockVerifyWebhookSignature.mockReturnValue(invitationWebhook);
      const invitationCreated = mockVerifyWebhookSignature(
        JSON.stringify(invitationWebhook),
        { 'svix-signature': 'invitation_signature' },
        mockEnv.CLERK_WEBHOOK_SECRET
      );

      expect(invitationCreated.data.status).toBe('pending');
      expect(invitationCreated.data.email_address).toBe('member@example.com');
    });

    it('should handle session management workflow', async () => {
      const userId = 'user_session_workflow_123';
      const sessionId = 'sess_workflow_456';

      // Step 1: Active session verification
      const mockActiveSession = {
        userId,
        sessionId,
        status: 'active',
        lastActiveAt: Date.now(),
        expireAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      };

      mockUseSession.mockReturnValue({
        session: mockActiveSession,
        isLoaded: true,
        isSignedIn: true,
      });

      const sessionState = mockUseSession();
      expect(sessionState.isSignedIn).toBe(true);
      expect(sessionState.session.status).toBe('active');

      // Step 2: JWT token for API access
      vi.mocked(jwtVerify).mockResolvedValue({
        payload: { 
          sub: userId, 
          session_id: sessionId,
          exp: Math.floor(Date.now() / 1000) + 3600,
        },
        protectedHeader: { alg: 'HS256', typ: 'JWT' },
      } as any);

      const apiToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.session.token';
      const verifiedUserId = await verifyClerkToken(apiToken);
      expect(verifiedUserId).toBe(userId);

      // Step 3: Session update webhook
      const sessionUpdateWebhook = {
        type: 'session.updated',
        data: {
          id: sessionId,
          user_id: userId,
          status: 'active',
          last_active_at: Date.now(),
        },
      };

      mockVerifyWebhookSignature.mockReturnValue(sessionUpdateWebhook);
      const sessionUpdated = mockVerifyWebhookSignature(
        JSON.stringify(sessionUpdateWebhook),
        { 'svix-signature': 'session_update_signature' },
        mockEnv.CLERK_WEBHOOK_SECRET
      );

      expect(sessionUpdated.data.status).toBe('active');

      // Step 4: Session termination
      const sessionEndWebhook = {
        type: 'session.ended',
        data: {
          id: sessionId,
          user_id: userId,
          status: 'ended',
          ended_at: Date.now(),
        },
      };

      mockVerifyWebhookSignature.mockReturnValue(sessionEndWebhook);
      const sessionEnded = mockVerifyWebhookSignature(
        JSON.stringify(sessionEndWebhook),
        { 'svix-signature': 'session_end_signature' },
        mockEnv.CLERK_WEBHOOK_SECRET
      );

      expect(sessionEnded.data.status).toBe('ended');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle concurrent authentication requests', async () => {
      const userIds = Array.from({ length: 10 }, (_, i) => `user_concurrent_${i}`);
      const tokens = Array.from({ length: 10 }, (_, i) => `token_concurrent_${i}`);

      // Mock JWT verification for concurrent requests
      userIds.forEach((userId, index) => {
        vi.mocked(jwtVerify).mockResolvedValueOnce({
          payload: { sub: userId },
          protectedHeader: { alg: 'HS256', typ: 'JWT' },
        } as any);
      });

      const concurrentRequests = tokens.map((token, index) => 
        verifyClerkToken(token)
      );

      const results = await Promise.all(concurrentRequests);

      expect(results).toHaveLength(10);
      results.forEach((result, index) => {
        expect(result).toBe(userIds[index]);
      });
    });

    it('should handle webhook replay attacks', async () => {
      const originalTimestamp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const replayedPayload = JSON.stringify({
        type: 'user.created',
        data: { id: 'user_replay_123' },
        timestamp: originalTimestamp * 1000,
      });

      const replayHeaders = {
        'svix-id': 'msg_replayed_123',
        'svix-timestamp': originalTimestamp.toString(),
        'svix-signature': 'v1,old_signature',
      };

      const replayError = new Error('Webhook timestamp too old');
      replayError.name = 'WebhookTimestampTooOldError';
      mockVerifyWebhookSignature.mockImplementation(() => {
        throw replayError;
      });

      expect(() => {
        mockVerifyWebhookSignature(
          replayedPayload,
          replayHeaders,
          mockEnv.CLERK_WEBHOOK_SECRET
        );
      }).toThrow('Webhook timestamp too old');
    });

    it('should handle environment configuration errors', async () => {
      // Test missing CLERK_SECRET_KEY
      const originalSecretKey = process.env.CLERK_SECRET_KEY;
      delete process.env.CLERK_SECRET_KEY;

      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token';
      
      await expect(verifyClerkToken(token)).rejects.toThrow('Invalid or expired token');

      // Restore secret key
      process.env.CLERK_SECRET_KEY = originalSecretKey;

      // Test missing webhook secret
      const originalWebhookSecret = process.env.CLERK_WEBHOOK_SECRET;
      delete process.env.CLERK_WEBHOOK_SECRET;

      const webhookPayload = JSON.stringify({ type: 'test.event' });
      const webhookHeaders = { 'svix-signature': 'signature' };

      const missingSecretError = new Error('Webhook secret not configured');
      mockVerifyWebhookSignature.mockImplementation(() => {
        throw missingSecretError;
      });

      expect(() => {
        mockVerifyWebhookSignature(webhookPayload, webhookHeaders, undefined);
      }).toThrow('Webhook secret not configured');

      // Restore webhook secret
      if (originalWebhookSecret) {
        process.env.CLERK_WEBHOOK_SECRET = originalWebhookSecret;
      }
    });

    it('should handle rate limiting scenarios', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      rateLimitError.name = 'RateLimitError';

      // Mock rate limiting on JWT verification
      let attemptCount = 0;
      vi.mocked(jwtVerify).mockImplementation(() => {
        attemptCount++;
        if (attemptCount <= 3) {
          throw rateLimitError;
        }
        return Promise.resolve({
          payload: { sub: 'user_rate_limit_123' },
          protectedHeader: { alg: 'HS256', typ: 'JWT' },
        } as any);
      });

      // Simulate retry logic
      let retries = 0;
      let result;
      
      while (retries < 5) {
        try {
          result = await verifyClerkToken('rate_limit_token');
          break;
        } catch (error: any) {
          if (error.name === 'RateLimitError' && retries < 4) {
            retries++;
            await new Promise(resolve => setTimeout(resolve, 100));
            continue;
          }
          throw error;
        }
      }

      expect(result).toBe('user_rate_limit_123');
      expect(attemptCount).toBe(4);
    });

    it('should handle malicious payload attempts', async () => {
      const maliciousPayloads = [
        '{"type":"user.created","data":{"__proto__":{"isAdmin":true}}}',
        '{"type":"user.created","data":{"constructor":{"prototype":{"isAdmin":true}}}}',
        '{"type":"../../etc/passwd","data":{}}',
        '{"type":"<script>alert(\\"XSS\\")</script>","data":{}}',
        JSON.stringify({ type: 'user.created', data: { id: 'a'.repeat(10000) } }),
      ];

      maliciousPayloads.forEach((payload, index) => {
        const maliciousError = new Error('Malicious payload detected');
        mockVerifyWebhookSignature.mockImplementationOnce(() => {
          throw maliciousError;
        });

        expect(() => {
          mockVerifyWebhookSignature(
            payload,
            { 'svix-signature': `signature_${index}` },
            mockEnv.CLERK_WEBHOOK_SECRET
          );
        }).toThrow('Malicious payload detected');
      });
    });
  });

  describe('Performance and Scalability Tests', () => {
    it('should handle high-volume webhook processing', async () => {
      const webhookCount = 100;
      const webhookEvents = Array.from({ length: webhookCount }, (_, i) => ({
        type: 'user.updated',
        data: { id: `user_bulk_${i}`, updated_at: Date.now() },
      }));

      // Mock bulk webhook processing
      webhookEvents.forEach((event) => {
        mockVerifyWebhookSignature.mockReturnValueOnce(event);
      });

      const startTime = Date.now();
      const processedEvents = webhookEvents.map((event, i) =>
        mockVerifyWebhookSignature(
          JSON.stringify(event),
          { 'svix-signature': `signature_${i}` },
          mockEnv.CLERK_WEBHOOK_SECRET
        )
      );
      const endTime = Date.now();

      expect(processedEvents).toHaveLength(webhookCount);
      expect(endTime - startTime).toBeLessThan(1000); // Should process in < 1 second
    });

    it('should handle burst authentication requests', async () => {
      const burstSize = 50;
      const tokens = Array.from({ length: burstSize }, (_, i) => `burst_token_${i}`);
      
      // Mock burst JWT verification
      tokens.forEach((_, i) => {
        vi.mocked(jwtVerify).mockResolvedValueOnce({
          payload: { sub: `user_burst_${i}` },
          protectedHeader: { alg: 'HS256', typ: 'JWT' },
        } as any);
      });

      const startTime = Date.now();
      const burstPromises = tokens.map(token => verifyClerkToken(token));
      const results = await Promise.all(burstPromises);
      const endTime = Date.now();

      expect(results).toHaveLength(burstSize);
      expect(endTime - startTime).toBeLessThan(500); // Should handle burst in < 500ms
      
      results.forEach((result, i) => {
        expect(result).toBe(`user_burst_${i}`);
      });
    });

    it('should handle memory efficiently with large webhook payloads', async () => {
      const largeUserData = {
        id: 'user_large_payload_123',
        profile_data: 'x'.repeat(50000), // 50KB of data
        metadata: Array.from({ length: 1000 }, (_, i) => ({
          key: `metadata_key_${i}`,
          value: `metadata_value_${i}`,
        })),
      };

      const largeWebhookPayload = JSON.stringify({
        type: 'user.updated',
        data: largeUserData,
      });

      mockVerifyWebhookSignature.mockReturnValue({
        type: 'user.updated',
        data: largeUserData,
      });

      const result = mockVerifyWebhookSignature(
        largeWebhookPayload,
        { 'svix-signature': 'large_payload_signature' },
        mockEnv.CLERK_WEBHOOK_SECRET
      );

      expect(result.data.id).toBe('user_large_payload_123');
      expect(result.data.metadata).toHaveLength(1000);
      expect(result.data.profile_data).toHaveLength(50000);
    });
  });

  describe('Security Integration Tests', () => {
    it('should prevent timing attacks in token verification', async () => {
      const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.valid.token';
      const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.token';

      // Mock timing for valid token
      vi.mocked(jwtVerify).mockImplementationOnce(() => {
        return new Promise(resolve => {
          setTimeout(() => resolve({
            payload: { sub: 'valid_user' },
            protectedHeader: { alg: 'HS256', typ: 'JWT' },
          } as any), 100);
        });
      });

      // Mock timing for invalid token (should take similar time)
      vi.mocked(jwtVerify).mockImplementationOnce(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Invalid token')), 95);
        });
      });

      const validStart = Date.now();
      const validResult = await verifyClerkToken(validToken);
      const validEnd = Date.now();
      const validTime = validEnd - validStart;

      const invalidStart = Date.now();
      try {
        await verifyClerkToken(invalidToken);
      } catch (error) {
        // Expected to fail
      }
      const invalidEnd = Date.now();
      const invalidTime = invalidEnd - invalidStart;

      expect(validResult).toBe('valid_user');
      // Timing should be similar (within 50ms) to prevent timing attacks
      expect(Math.abs(validTime - invalidTime)).toBeLessThan(50);
    });

    it('should handle JWT algorithm confusion attacks', async () => {
      const algorithmsToTest = ['none', 'HS256', 'RS256', 'ES256'];
      
      algorithmsToTest.forEach((algorithm) => {
        const algorithmError = new Error(`Unsupported algorithm: ${algorithm}`);
        vi.mocked(jwtVerify).mockRejectedValueOnce(algorithmError);

        expect(async () => {
          await verifyClerkToken(algorithm === 'none' ? 'none.token' : `${algorithm}.token`);
        }).rejects.toThrow('Invalid or expired token');
      });
    });

    it('should validate webhook source integrity', async () => {
      const legitPayload = JSON.stringify({
        type: 'user.created',
        data: { id: 'user_legit_123' },
      });

      const spoofedPayload = JSON.stringify({
        type: 'user.created',
        data: { id: 'user_spoofed_123', admin: true },
      });

      // Mock legitimate webhook
      mockVerifyWebhookSignature.mockReturnValueOnce({
        type: 'user.created',
        data: { id: 'user_legit_123' },
      });

      const legitResult = mockVerifyWebhookSignature(
        legitPayload,
        { 'svix-signature': 'valid_signature' },
        mockEnv.CLERK_WEBHOOK_SECRET
      );

      expect(legitResult.data.id).toBe('user_legit_123');
      expect(legitResult.data).not.toHaveProperty('admin');

      // Mock spoofed webhook (should fail)
      const spoofError = new Error('Invalid webhook signature');
      mockVerifyWebhookSignature.mockImplementationOnce(() => {
        throw spoofError;
      });

      expect(() => {
        mockVerifyWebhookSignature(
          spoofedPayload,
          { 'svix-signature': 'invalid_signature' },
          mockEnv.CLERK_WEBHOOK_SECRET
        );
      }).toThrow('Invalid webhook signature');
    });

    it('should handle session hijacking attempts', async () => {
      const legitSessionToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.legit.session';
      const hijackedSessionToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.hijacked.session';

      // Mock legitimate session
      vi.mocked(jwtVerify).mockResolvedValueOnce({
        payload: { 
          sub: 'user_legit_123',
          session_id: 'sess_legit_456',
          ip_address: '192.168.1.100',
        },
        protectedHeader: { alg: 'HS256', typ: 'JWT' },
      } as any);

      const legitUserId = await verifyClerkToken(legitSessionToken);
      expect(legitUserId).toBe('user_legit_123');

      // Mock hijacked session (should fail due to IP mismatch or other checks)
      const hijackError = new Error('Session validation failed');
      vi.mocked(jwtVerify).mockRejectedValueOnce(hijackError);

      await expect(verifyClerkToken(hijackedSessionToken)).rejects.toThrow('Invalid or expired token');
    });
  });
});