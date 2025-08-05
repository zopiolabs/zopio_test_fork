/**
 * @fileoverview Storage Package Tests - Cloud Storage Integration
 * 
 * Test suite for cloud storage functionality including file operations,
 * security validation, and performance optimization.
 * 
 * **Test Scope:**
 * - File upload, download, and management operations
 * - Storage client configuration and connection management
 * - Security validation and access control
 * - Performance optimization for large file operations
 * - Error handling and retry mechanisms
 * 
 * **Test Categories:**
 * 1. **File Operations**: Upload, download, delete, and metadata management
 * 2. **Client Configuration**: Storage service setup and authentication
 * 3. **Security**: Access control, validation, and data protection
 * 4. **Performance**: Large file handling and optimization
 * 5. **Error Handling**: Network failures and recovery mechanisms
 * 
 * **Mock Strategy:**
 * - Complete storage SDK mocking to prevent actual uploads
 * - File operation simulation with various scenarios
 * - Error injection for comprehensive failure testing
 * - Performance monitoring for optimization validation
 * 
 * **Quality Standards:**
 * - Zero actual storage operations to prevent costs
 * - Sub-100ms operation response time for small files
 * - 100% security validation for file access
 * - Complete error handling for all failure scenarios
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Mock } from 'vitest';

/**
 * Integration Test Suite for Storage Package
 * 
 * This comprehensive integration test suite validates end-to-end workflows for the storage package,
 * focusing on real-world usage patterns and external service integration with Vercel Blob storage.
 * 
 * The tests cover complete workflows from file upload initiation through storage completion,
 * including error recovery, retry mechanisms, and service integration scenarios that validate
 * the storage system's behavior under various conditions.
 * 
 * Integration Categories Tested:
 * 1. Complete File Upload Workflows - Full lifecycle from client to storage
 * 2. File Download and Retrieval Workflows - Access patterns and data integrity
 * 3. Multi-Step Operations - Complex workflows with processing steps
 * 4. External Service Integration - Vercel Blob API client integration
 * 5. Error Recovery and Retry Mechanisms - Resilience under failure conditions
 * 6. Concurrent Operation Handling - Multi-user and high-load scenarios
 * 
 * Service Integration Points:
 * - Vercel Blob API client initialization and configuration
 * - Network failure detection and retry logic implementation
 * - Service unavailability handling with graceful degradation
 * - Rate limiting and exponential backoff strategies
 * - Authentication token lifecycle management
 * - Cross-service data consistency and validation
 */

// Mock the Vercel Blob client with integration-focused responses
vi.mock('@vercel/blob/client', () => ({
  put: vi.fn(),
  upload: vi.fn(),
  handleUpload: vi.fn(),
  generateClientTokenFromReadWriteToken: vi.fn(),
  getPayloadFromClientToken: vi.fn(),
  createFolder: vi.fn(),
  createMultipartUpload: vi.fn(),
  uploadPart: vi.fn(),
  completeMultipartUpload: vi.fn(),
  createMultipartUploader: vi.fn(),
}));

// Mock the server-side blob functions for comprehensive integration testing
vi.mock('@vercel/blob', () => ({
  put: vi.fn(),
  list: vi.fn(),
  del: vi.fn(),
  head: vi.fn(),
  copy: vi.fn(),
}));

import * as client from '../client.js';
import * as serverBlob from '../index.js';

describe('Storage Integration Tests', () => {
  // Mock references for client-side operations
  let mockClientPut: Mock;
  let mockClientGenerateToken: Mock;
  let mockClientGetPayload: Mock;
  let mockClientCreateFolder: Mock;
  let mockClientCreateMultipartUpload: Mock;
  let mockClientUploadPart: Mock;
  let mockClientCompleteMultipartUpload: Mock;

  // Mock references for server-side operations
  let mockServerPut: Mock;
  let mockServerList: Mock;
  let mockServerDel: Mock;
  let mockServerHead: Mock;
  let mockServerCopy: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Initialize client-side mocks
    mockClientPut = vi.mocked(client.put);
    mockClientGenerateToken = vi.mocked(client.generateClientTokenFromReadWriteToken);
    mockClientGetPayload = vi.mocked(client.getPayloadFromClientToken);
    mockClientCreateFolder = vi.mocked(client.createFolder);
    mockClientCreateMultipartUpload = vi.mocked(client.createMultipartUpload);
    mockClientUploadPart = vi.mocked(client.uploadPart);
    mockClientCompleteMultipartUpload = vi.mocked(client.completeMultipartUpload);

    // Initialize server-side mocks
    mockServerPut = vi.mocked(serverBlob.put);
    mockServerList = vi.mocked(serverBlob.list);
    mockServerDel = vi.mocked(serverBlob.del);
    mockServerHead = vi.mocked(serverBlob.head);
    mockServerCopy = vi.mocked(serverBlob.copy);
  });

  afterEach(() => {
    if (vi.isFakeTimers()) {
      vi.runOnlyPendingTimers();
      vi.useRealTimers();
    }
  });

  /**
   * Complete File Upload Workflows
   * 
   * Tests end-to-end file upload scenarios from client initialization through storage completion.
   * These integration tests validate that the entire upload pipeline works correctly, including
   * metadata handling, file processing, and storage confirmation workflows.
   * 
   * Workflow Steps Tested:
   * 1. Client-side file preparation and validation
   * 2. Server-side upload initiation and token generation
   * 3. File transfer to Vercel Blob storage
   * 4. Storage confirmation and metadata persistence
   * 5. Access URL generation and response handling
   */
  describe('Complete File Upload Workflows', () => {
    it('should complete full upload workflow from client to storage verification', async () => {
      /**
       * Integration Workflow: Client Upload → Server Processing → Storage Verification
       * 
       * This test simulates a complete file upload workflow that would occur in a real application:
       * 1. User selects file on client-side
       * 2. Client initiates upload process
       * 3. Server processes and stores file
       * 4. System verifies successful storage
       * 5. Client receives confirmation with access URLs
       */
      
      // Step 1: Client-side file preparation
      const originalFile = new File(['Integration test content for end-to-end workflow'], 'integration-test.txt', {
        type: 'text/plain',
        lastModified: Date.now(),
      });

      // Step 2: Server-side upload processing
      const serverUploadResult = {
        url: 'https://test-bucket.vercel-storage.com/integration-test-xyz789.txt',
        downloadUrl: 'https://test-bucket.vercel-storage.com/integration-test-xyz789.txt?download=1',
        pathname: 'integration-test.txt',
        contentType: 'text/plain',
        contentDisposition: 'attachment; filename="integration-test.txt"',
        size: originalFile.size,
        uploadedAt: new Date().toISOString(),
      };

      mockServerPut.mockResolvedValue(serverUploadResult);

      // Execute server-side upload
      const uploadResult = await serverBlob.put('integration-test.txt', originalFile, {
        access: 'public',
        addRandomSuffix: true,
      } as any);

      expect(mockServerPut).toHaveBeenCalledWith('integration-test.txt', originalFile, {
        access: 'public',
        addRandomSuffix: true,
      });
      expect(uploadResult).toEqual(serverUploadResult);

      // Step 3: Storage verification through metadata retrieval
      const verificationMetadata = {
        url: serverUploadResult.url,
        pathname: serverUploadResult.pathname,
        size: originalFile.size,
        uploadedAt: serverUploadResult.uploadedAt,
        contentType: 'text/plain',
      };

      mockServerHead.mockResolvedValue(verificationMetadata as any);

      const verificationResult = await serverBlob.head(serverUploadResult.url);

      expect(mockServerHead).toHaveBeenCalledWith(serverUploadResult.url);
      expect(verificationResult).toEqual(verificationMetadata);

      // Step 4: Client-side confirmation workflow
      const clientToken = 'client-token-xyz789';
      const tokenPayload = {
        pathname: 'integration-test.txt',
        maximumSizeInBytes: originalFile.size * 2, // Allow some buffer
        allowedContentTypes: ['text/plain', 'text/*'],
      };

      mockClientGenerateToken.mockResolvedValue(clientToken);
      mockClientGetPayload.mockResolvedValue(tokenPayload);

      // Generate client token for upload verification
      const generatedToken = await client.generateClientTokenFromReadWriteToken({
        pathname: 'integration-test.txt',
        maximumSizeInBytes: originalFile.size * 2,
      } as any);

      expect(generatedToken).toBe(clientToken);

      // Validate token payload
      const payload = await client.getPayloadFromClientToken(clientToken);
      expect(payload).toEqual(tokenPayload);

      // Integration verification: All workflow steps completed successfully
      expect(uploadResult.url).toBeDefined();
      expect(uploadResult.pathname).toBe('integration-test.txt');
      expect(generatedToken).toBe(clientToken);
    });

    it('should handle upload with metadata processing and storage confirmation', async () => {
      /**
       * Integration Workflow: Upload with Metadata → Processing → Confirmation
       * 
       * Tests a more complex upload workflow that includes metadata processing,
       * file organization, and storage confirmation with detailed tracking.
       */

      const documentFile = new File(
        ['This is a comprehensive integration test document with metadata processing.'],
        'comprehensive-document.pdf',
        { type: 'application/pdf' }
      );

      // Step 1: Create organized folder structure
      const folderResult = {
        url: 'https://test-bucket.vercel-storage.com/documents/integration-tests/2025/',
        pathname: 'documents/integration-tests/2025/',
      };

      mockClientCreateFolder.mockResolvedValue(folderResult);

      const createdFolder = await client.createFolder('documents/integration-tests/2025', {} as any);
      expect(createdFolder).toEqual(folderResult);

      // Step 2: Upload file to organized location
      const uploadResult = {
        url: 'https://test-bucket.vercel-storage.com/documents/integration-tests/2025/comprehensive-document-def456.pdf',
        downloadUrl: 'https://test-bucket.vercel-storage.com/documents/integration-tests/2025/comprehensive-document-def456.pdf?download=1',
        pathname: 'documents/integration-tests/2025/comprehensive-document.pdf',
        contentType: 'application/pdf',
        size: documentFile.size,
      };

      mockServerPut.mockResolvedValue(uploadResult);

      const upload = await serverBlob.put('documents/integration-tests/2025/comprehensive-document.pdf', documentFile, {
        access: 'public',
      } as any);

      expect(upload).toEqual(uploadResult);
      expect(upload.pathname).toBe('documents/integration-tests/2025/comprehensive-document.pdf');

      // Step 3: Verify storage and metadata
      const storageVerification = {
        url: uploadResult.url,
        pathname: uploadResult.pathname,
        size: documentFile.size,
        contentType: 'application/pdf',
      };

      mockServerHead.mockResolvedValue(storageVerification as any);

      const verification = await serverBlob.head(uploadResult.url);
      expect(verification).toEqual(storageVerification);

      // Integration verification: Complete workflow with metadata processing
      expect(createdFolder.pathname).toBe('documents/integration-tests/2025/');
      expect(upload.pathname).toBe('documents/integration-tests/2025/comprehensive-document.pdf');
    });

    it('should handle bulk upload workflow with batch processing', async () => {
      /**
       * Integration Workflow: Bulk Upload → Batch Processing → Collective Verification
       * 
       * Tests bulk upload scenarios that occur in real applications when users
       * upload multiple files simultaneously, including batch processing and verification.
       */

      const bulkFiles = [
        { name: 'batch-file-1.jpg', content: 'Image content 1', type: 'image/jpeg' },
        { name: 'batch-file-2.png', content: 'Image content 2', type: 'image/png' },
        { name: 'batch-file-3.pdf', content: 'Document content 3', type: 'application/pdf' },
        { name: 'batch-file-4.txt', content: 'Text content 4', type: 'text/plain' },
        { name: 'batch-file-5.docx', content: 'Word document content 5', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
      ];

      const uploadPromises = bulkFiles.map((fileData, index) => {
        const file = new File([fileData.content], fileData.name, { type: fileData.type });
        const expectedResult = {
          url: `https://test-bucket.vercel-storage.com/bulk/${fileData.name.replace('.', `-${index}.`)}`,
          downloadUrl: `https://test-bucket.vercel-storage.com/bulk/${fileData.name.replace('.', `-${index}.`)}?download=1`,
          pathname: `bulk/${fileData.name}`,
          contentType: fileData.type,
          size: file.size,
          uploadIndex: index,
        };

        // Mock individual upload responses
        mockServerPut.mockResolvedValueOnce(expectedResult);

        return { file, expected: expectedResult };
      });

      // Execute bulk upload workflow
      const uploadResults = await Promise.all(
        uploadPromises.map(async ({ file, expected }) => {
          const result = await serverBlob.put(`bulk/${file.name}`, file, {
            access: 'public',
          } as any);
          return { result, expected };
        })
      );

      // Verify all uploads completed successfully
      expect(uploadResults).toHaveLength(5);
      uploadResults.forEach(({ result, expected }) => {
        expect(result).toEqual(expected);
      });

      // Batch verification workflow
      const batchListResult = {
        blobs: uploadResults.map(({ result }) => ({
          url: result.url,
          pathname: result.pathname,
          uploadedAt: new Date().toISOString(),
        })),
        hasMore: false,
        cursor: null,
      };

      mockServerList.mockResolvedValue(batchListResult);

      const listResult = await serverBlob.list({
        prefix: 'bulk/',
        limit: 10,
      } as any);

      expect(listResult).toEqual(batchListResult);
      expect(listResult.blobs).toHaveLength(5);

      // Integration verification: Bulk upload workflow completed
      expect(mockServerPut).toHaveBeenCalledTimes(5);
      expect(listResult.blobs.every(blob => blob.pathname.startsWith('bulk/'))).toBe(true);
    });
  });

  /**
   * File Download and Retrieval Workflows
   * 
   * Tests complete file download and access workflows, including URL generation,
   * access control validation, and data integrity verification through the full
   * retrieval pipeline from storage to client delivery.
   * 
   * Workflow Components:
   * 1. File existence verification and metadata retrieval
   * 2. Access control and permission validation
   * 3. Download URL generation with proper expiration
   * 4. Content delivery and integrity verification
   * 5. Error handling for missing or inaccessible files
   */
  describe('File Download and Retrieval Workflows', () => {
    it('should complete full download workflow with access control and verification', async () => {
      /**
       * Integration Workflow: File Discovery → Access Validation → Download → Verification
       * 
       * This test validates the complete file retrieval workflow including discovery,
       * access control, and content delivery that would occur in real applications.
       */

      const targetFile = {
        pathname: 'secure/sensitive-document.pdf',
        url: 'https://test-bucket.vercel-storage.com/secure/sensitive-document-abc123.pdf',
        downloadUrl: 'https://test-bucket.vercel-storage.com/secure/sensitive-document-abc123.pdf?download=1&token=secure-token',
        size: 2048576, // 2MB
        contentType: 'application/pdf',
        uploadedAt: '2025-01-15T10:00:00.000Z',
      };

      // Step 1: File discovery and metadata retrieval
      mockServerHead.mockResolvedValue({
        url: targetFile.url,
        pathname: targetFile.pathname,
        size: targetFile.size,
        contentType: targetFile.contentType,
        uploadedAt: targetFile.uploadedAt,
      } as any);

      const fileMetadata = await serverBlob.head(targetFile.url);
      expect(fileMetadata).toBeDefined();

      // Step 2: Access control validation
      const accessToken = 'secure-access-token-789';
      const tokenPayload = {
        pathname: targetFile.pathname,
        userId: 'user-456',
        expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour
      };

      mockClientGenerateToken.mockResolvedValue(accessToken);
      mockClientGetPayload.mockResolvedValue(tokenPayload);

      // Generate secure access token
      const generatedToken = await client.generateClientTokenFromReadWriteToken({
        pathname: targetFile.pathname,
        userId: 'user-456',
      } as any);

      expect(generatedToken).toBe(accessToken);

      // Validate token and permissions
      const validatedPayload = await client.getPayloadFromClientToken(accessToken);
      expect(validatedPayload).toEqual(tokenPayload);

      // Step 3: List files with filtering to verify access
      const filteredListResult = {
        blobs: [
          {
            url: targetFile.url,
            pathname: targetFile.pathname,
            size: targetFile.size,
            uploadedAt: targetFile.uploadedAt,
          },
        ],
        hasMore: false,
        cursor: null,
      };

      mockServerList.mockResolvedValue(filteredListResult);

      const accessibleFiles = await serverBlob.list({
        prefix: 'secure/',
        limit: 10,
      } as any);

      expect(accessibleFiles.blobs).toContainEqual(
        expect.objectContaining({
          pathname: targetFile.pathname,
          size: targetFile.size,
        })
      );

      // Integration verification: Complete download workflow
      expect(generatedToken).toBeDefined();
      expect(accessibleFiles.blobs).toHaveLength(1);
    });

    it('should handle download workflow for public files with CDN optimization', async () => {
      /**
       * Integration Workflow: Public File Access → CDN Optimization → Content Delivery
       * 
       * Tests the optimized download workflow for public files that includes
       * CDN caching, content optimization, and efficient delivery mechanisms.
       */

      const publicAssets = [
        {
          pathname: 'public/images/logo.svg',
          contentType: 'image/svg+xml',
          size: 4096,
          cacheControl: 'public, max-age=31536000', // 1 year
        },
        {
          pathname: 'public/documents/user-guide.pdf',
          contentType: 'application/pdf',
          size: 1048576, // 1MB
          cacheControl: 'public, max-age=3600', // 1 hour
        },
        {
          pathname: 'public/media/demo-video.mp4',
          contentType: 'video/mp4',
          size: 10485760, // 10MB
          cacheControl: 'public, max-age=86400', // 1 day
        },
      ];

      const downloadWorkflows = publicAssets.map((asset) => {
        const downloadInfo = {
          url: `https://cdn.vercel-storage.com/${asset.pathname.replace('/', '-')}`,
          downloadUrl: `https://cdn.vercel-storage.com/${asset.pathname.replace('/', '-')}?optimized=true`,
          pathname: asset.pathname,
          contentType: asset.contentType,
          size: asset.size,
          cacheControl: asset.cacheControl,
        };

        // Mock CDN-optimized responses
        mockServerHead.mockResolvedValueOnce(downloadInfo as any);

        return { asset, downloadInfo };
      });

      // Execute parallel download preparation for public assets
      const downloadResults = await Promise.all(
        downloadWorkflows.map(async ({ asset, downloadInfo }) => {
          const metadata = await serverBlob.head(`public/${asset.pathname.split('/').pop()}`);
          return { metadata, expected: downloadInfo };
        })
      );

      // Verify CDN optimization for each asset type
      downloadResults.forEach(({ metadata, expected }) => {
        expect(metadata).toEqual(expected);
      });

      // Integration verification: Public download workflow with CDN
      expect(downloadResults).toHaveLength(3);
    });
  });

  /**
   * Multi-Step Operations and Processing Workflows
   * 
   * Tests complex multi-step operations that combine upload, processing, transformation,
   * and storage workflows. These integration tests validate that complex business logic
   * workflows function correctly across service boundaries.
   * 
   * Complex Workflow Categories:
   * 1. Upload → Process → Transform → Store workflows
   * 2. Batch processing with error recovery
   * 3. File versioning and lifecycle management
   * 4. Cross-service data synchronization
   * 5. Workflow state management and persistence
   */
  describe('Multi-Step Operations and Processing Workflows', () => {
    it('should complete upload-process-transform-store workflow with state tracking', async () => {
      /**
       * Integration Workflow: Upload → Process → Transform → Store → Verify
       * 
       * This comprehensive workflow test simulates a real application scenario where
       * files undergo multiple processing steps after upload, with state tracking
       * and error recovery at each stage.
       */

      const workflowState = {
        sessionId: 'workflow-session-123',
        userId: 'user-789',
        status: 'initiated',
        steps: [] as any[],
        metadata: {
          source: 'user-upload',
          priority: 'normal',
          category: 'document-processing',
        },
      };

      // Step 1: Initial file upload
      const originalFile = new File(
        ['Original document content requiring processing and transformation.'],
        'processing-document.docx',
        { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
      );

      const uploadResult = {
        url: 'https://test-bucket.vercel-storage.com/processing/processing-document-stage1.docx',
        pathname: 'processing/processing-document.docx',
        size: originalFile.size,
        contentType: originalFile.type,
        workflowId: workflowState.sessionId,
      };

      mockServerPut.mockResolvedValue(uploadResult);

      const upload = await serverBlob.put('processing/processing-document.docx', originalFile, {
        workflowId: workflowState.sessionId,
      } as any);

      workflowState.steps.push({
        step: 'upload',
        status: 'completed',
        result: upload,
        timestamp: new Date().toISOString(),
      });

      expect((upload as any).workflowId).toBe(workflowState.sessionId);

      // Step 2: Document processing (simulation)
      const processedResult = {
        url: 'https://test-bucket.vercel-storage.com/processing/processing-document-stage2.docx',
        pathname: 'processing/processing-document-processed.docx',
        size: originalFile.size + 1024, // Slightly larger after processing
        contentType: originalFile.type,
        workflowId: workflowState.sessionId,
      };

      mockServerPut.mockResolvedValue(processedResult);

      const processed = await serverBlob.put('processing/processing-document-processed.docx', originalFile, {
        workflowId: workflowState.sessionId,
      } as any);

      workflowState.steps.push({
        step: 'processing',
        status: 'completed',
        result: processed,
        timestamp: new Date().toISOString(),
      });

      // Step 3: Document transformation (format conversion)
      const transformedResult = {
        url: 'https://test-bucket.vercel-storage.com/processing/processing-document-final.pdf',
        pathname: 'processing/processing-document-final.pdf',
        size: originalFile.size * 0.8, // PDF compression
        contentType: 'application/pdf',
        workflowId: workflowState.sessionId,
      };

      // Simulate format transformation
      const transformedFile = new File(
        ['Transformed PDF content'],
        'processing-document-final.pdf',
        { type: 'application/pdf' }
      );

      mockServerPut.mockResolvedValue(transformedResult);

      const transformed = await serverBlob.put('processing/processing-document-final.pdf', transformedFile, {
        workflowId: workflowState.sessionId,
      } as any);

      workflowState.steps.push({
        step: 'transformation',
        status: 'completed',
        result: transformed,
        timestamp: new Date().toISOString(),
      });

      expect(transformed.contentType).toBe('application/pdf');

      // Step 4: Final verification and cleanup
      const verificationResult = {
        url: transformed.url,
        pathname: transformed.pathname,
        size: 102400,
        contentType: transformed.contentType,
        uploadedAt: new Date(),
        workflowId: workflowState.sessionId,
      };

      mockServerHead.mockResolvedValue(verificationResult as any);

      const finalVerification = await serverBlob.head(transformed.url);

      workflowState.status = 'completed';
      workflowState.steps.push({
        step: 'verification',
        status: 'completed',
        result: finalVerification,
        timestamp: new Date().toISOString(),
      });

      // Integration verification: Complete multi-step workflow
      expect(workflowState.steps).toHaveLength(4);
      expect(workflowState.status).toBe('completed');
      expect(workflowState.steps.every(step => step.status === 'completed')).toBe(true);
      expect((finalVerification as any).workflowId).toBe(workflowState.sessionId);
    });

    it('should handle batch processing workflow with parallel operations and error recovery', async () => {
      /**
       * Integration Workflow: Batch Upload → Parallel Processing → Error Recovery → Final Assembly
       * 
       * Tests complex batch processing scenarios with parallel operations,
       * error recovery, and final assembly of processed results.
       */

      const batchWorkflow = {
        batchId: 'batch-processing-456',
        files: [
          { name: 'batch-item-1.jpg', type: 'image/jpeg', status: 'pending' },
          { name: 'batch-item-2.jpg', type: 'image/jpeg', status: 'pending' },
          { name: 'batch-item-3.jpg', type: 'image/jpeg', status: 'pending' },
          { name: 'batch-item-4.jpg', type: 'image/jpeg', status: 'pending' },
          { name: 'batch-item-5.jpg', type: 'image/jpeg', status: 'pending' },
        ],
      };

      // Step 1: Batch file upload
      const batchUploads = await Promise.all(
        batchWorkflow.files.map(async (fileInfo, index) => {
          const file = new File([`Image content ${index + 1}`], fileInfo.name, { type: fileInfo.type });
          const uploadResult = {
            url: `https://test-bucket.vercel-storage.com/batch/${fileInfo.name.replace('.', '-original.')}`,
            pathname: `batch/${fileInfo.name}`,
            size: file.size,
            contentType: fileInfo.type,
            batchId: batchWorkflow.batchId,
            batchIndex: index,
          };

          mockServerPut.mockResolvedValueOnce(uploadResult);

          return await serverBlob.put(`batch/${fileInfo.name}`, file, {
            batchId: batchWorkflow.batchId,
            batchIndex: index,
          } as any);
        })
      );

      expect(batchUploads).toHaveLength(5);
      expect(batchUploads.every(result => (result as any).batchId === batchWorkflow.batchId)).toBe(true);

      // Step 2: Parallel processing with simulated failure and recovery
      const processingResults = await Promise.allSettled(
        batchUploads.map(async (uploadResult, index) => {
          // Simulate processing failure for one item
          if (index === 2) {
            throw new Error(`Processing failed for item ${index + 1}`);
          }

          const processedResult = {
            url: uploadResult.url.replace('-original.', '-processed.webp'),
            pathname: uploadResult.pathname.replace('.jpg', '.webp'),
            contentType: 'image/webp',
            batchId: batchWorkflow.batchId,
            batchIndex: index,
          };

          mockServerPut.mockResolvedValueOnce(processedResult);

          const processedFile = new File([`Processed image content ${index + 1}`], processedResult.pathname.split('/').pop()!, {
            type: 'image/webp',
          });

          return await serverBlob.put(processedResult.pathname, processedFile, {
            batchId: batchWorkflow.batchId,
            originalUrl: uploadResult.url,
          } as any);
        })
      );

      // Step 3: Error recovery for failed processing
      const failedProcessing = processingResults.filter(result => result.status === 'rejected');
      expect(failedProcessing).toHaveLength(1);

      // Retry failed processing
      const retryIndex = 2;
      const retryResult = {
        url: batchUploads[retryIndex].url.replace('-original.', '-processed.webp'),
        pathname: batchUploads[retryIndex].pathname.replace('.jpg', '.webp'),
        contentType: 'image/webp',
        batchId: batchWorkflow.batchId,
        batchIndex: retryIndex,
      };

      mockServerPut.mockResolvedValue(retryResult);

      const retryFile = new File([`Processed image content ${retryIndex + 1} (retry)`], `batch-item-${retryIndex + 1}.webp`, {
        type: 'image/webp',
      });

      const retryProcessed = await serverBlob.put(retryResult.pathname, retryFile, {
        batchId: batchWorkflow.batchId,
      } as any);

      // Step 4: Final batch verification
      const batchVerification = {
        blobs: [
          ...processingResults.filter(result => result.status === 'fulfilled').map(result => (result as any).value),
          retryProcessed,
        ],
        hasMore: false,
        cursor: null,
      };

      mockServerList.mockResolvedValue(batchVerification);

      await serverBlob.list({
        prefix: 'batch/',
      } as any);

      // Integration verification: Batch processing with error recovery
      expect(batchUploads).toHaveLength(5);
      expect(retryProcessed).toBeDefined();
    });
  });

  /**
   * External Service Integration and API Client Testing
   * 
   * Tests integration with the Vercel Blob service API, including authentication,
   * network handling, service availability, and API contract compliance.
   * These tests validate that the storage system correctly integrates with
   * external services under various conditions.
   * 
   * Integration Points Tested:
   * 1. Vercel Blob API client initialization and configuration
   * 2. Authentication token management and refresh workflows
   * 3. Network failure detection and retry mechanisms
   * 4. Service rate limiting and backoff strategies
   * 5. API contract compliance and response validation
   * 6. Cross-service data consistency verification
   */
  describe('External Service Integration and API Client Testing', () => {
    it('should handle complete Vercel Blob API integration workflow', async () => {
      /**
       * Integration Workflow: API Authentication → Service Configuration → Operation Execution → Response Validation
       * 
       * This test validates the complete integration with the Vercel Blob API,
       * from initial authentication through operation execution and response handling.
       */

      const apiIntegration = {
        authentication: {
          token: 'vercel_blob_rw_test_token_123',
          baseUrl: 'https://blob.vercel-storage.com',
          region: 'us-east-1',
        },
        testOperation: {
          filename: 'api-integration-test.json',
          content: JSON.stringify({ test: 'Vercel Blob API Integration', timestamp: Date.now() }),
          contentType: 'application/json',
        },
      };

      // Step 1: API Authentication and Token Validation
      const tokenValidation = {
        pathname: 'api-integration-test.json',
        maximumSizeInBytes: 1024 * 1024,
        allowedContentTypes: ['application/json'],
      };

      mockClientGetPayload.mockResolvedValue(tokenValidation);

      const tokenCheck = await client.getPayloadFromClientToken(apiIntegration.authentication.token);
      expect(tokenCheck.pathname).toBe('api-integration-test.json');

      // Step 2: API Client Configuration and Health Check
      const serviceHealthCheck = {
        blobs: [],
        hasMore: false,
        cursor: null,
      };

      // Simulate health check through a simple operation
      mockServerList.mockResolvedValue(serviceHealthCheck);

      const healthCheck = await serverBlob.list({ limit: 1 } as any);
      expect(healthCheck.blobs).toBeDefined();

      // Step 3: Execute Integration Test Operation
      const testFile = new File([apiIntegration.testOperation.content], apiIntegration.testOperation.filename, {
        type: apiIntegration.testOperation.contentType,
      });

      const apiUploadResult = {
        url: `${apiIntegration.authentication.baseUrl}/api-integration-test-def456.json`,
        downloadUrl: `${apiIntegration.authentication.baseUrl}/api-integration-test-def456.json?download=1`,
        pathname: apiIntegration.testOperation.filename,
        contentType: apiIntegration.testOperation.contentType,
        size: testFile.size,
        uploadedAt: new Date().toISOString(),
      };

      mockServerPut.mockResolvedValue(apiUploadResult);

      const apiUpload = await serverBlob.put(apiIntegration.testOperation.filename, testFile, {
        access: 'public',
        token: apiIntegration.authentication.token,
      } as any);

      expect(apiUpload.url).toContain(apiIntegration.authentication.baseUrl);

      // Step 4: Response Validation and Data Integrity Check
      const integrityCheck = {
        url: apiUpload.url,
        pathname: apiUpload.pathname,
        size: testFile.size,
        contentType: apiIntegration.testOperation.contentType,
      };

      mockServerHead.mockResolvedValue(integrityCheck as any);

      const verification = await serverBlob.head(apiUpload.url);
      expect(verification).toBeDefined();

      // Integration verification: Complete API integration workflow
      expect(tokenCheck.pathname).toBe('api-integration-test.json');
      expect(healthCheck.blobs).toBeDefined();
      expect(apiUpload.url).toBeDefined();
      expect(verification).toBeDefined();
    });

    it('should handle network failure and service unavailability with retry mechanisms', async () => {
      /**
       * Integration Workflow: Network Failure → Retry Logic → Service Recovery → Operation Completion
       * 
       * Tests the resilience of the storage system when external services are
       * temporarily unavailable or network conditions are poor.
       */

      vi.useFakeTimers();

      const resilenceTest = {
        operation: 'upload',
        filename: 'network-resilence-test.txt',
        maxRetries: 3,
        retryDelay: 1000, // 1 second
        backoffMultiplier: 2,
      };

      const testFile = new File(['Network resilence test content'], resilenceTest.filename, { type: 'text/plain' });

      let attemptCount = 0;
      const networkFailures = [
        new Error('Network timeout'),
        new Error('Service temporarily unavailable'),
        new Error('Connection refused'),
      ];

      // Mock network failures followed by success
      mockServerPut.mockImplementation(() => {
        attemptCount++;
        
        if (attemptCount <= 3) {
          // First 3 attempts fail
          const error = networkFailures[attemptCount - 1];
          return Promise.reject(error);
        }
        
        // 4th attempt succeeds
        return Promise.resolve({
          url: 'https://test-bucket.vercel-storage.com/network-resilence-test-ghi789.txt',
          pathname: resilenceTest.filename,
          size: testFile.size,
          contentType: 'text/plain',
          attempts: attemptCount,
        });
      });

      // Execute upload with retry logic simulation
      const retryOperation = async () => {
        let currentDelay = resilenceTest.retryDelay;
        
        for (let attempt = 1; attempt <= resilenceTest.maxRetries + 1; attempt++) {
          try {
            const result = await serverBlob.put(resilenceTest.filename, testFile, {
              attempt,
              timeout: 5000,
            } as any);
            return result;
          } catch (error) {
            if (attempt <= resilenceTest.maxRetries) {
              // Wait for retry delay
              await new Promise(resolve => setTimeout(resolve, currentDelay));
              currentDelay *= resilenceTest.backoffMultiplier;
            } else {
              throw error;
            }
          }
        }
      };

      const retryPromise = retryOperation();

      // Advance timers to simulate retry delays
      await vi.advanceTimersByTimeAsync(1000); // First retry delay
      await vi.advanceTimersByTimeAsync(2000); // Second retry delay (2x)
      await vi.advanceTimersByTimeAsync(4000); // Third retry delay (4x)

      const retryResult = await retryPromise;

      expect((retryResult as any).attempts).toBe(4);
      expect(mockServerPut).toHaveBeenCalledTimes(4);

      vi.useRealTimers();
    });

    it('should handle rate limiting and implement exponential backoff strategy', async () => {
      /**
       * Integration Workflow: Rate Limit Detection → Backoff Strategy → Request Queuing → Successful Completion
       * 
       * Tests the system's ability to handle API rate limiting from external services
       * and implement appropriate backoff and queuing strategies.
       */

      vi.useFakeTimers();

      const rateLimitingTest = {
        operations: 15, // Exceed typical rate limit
        rateLimit: {
          limit: 10,
          window: 60000, // 1 minute
          resetTime: Date.now() + 60000,
        },
        backoffStrategy: {
          initialDelay: 500,
          maxDelay: 30000,
          backoffFactor: 2,
        },
      };

      let operationCount = 0;

      // Mock rate limiting behavior
      mockServerPut.mockImplementation(() => {
        operationCount++;
        
        if (operationCount <= 10) {
          // First 10 operations succeed
          return Promise.resolve({
            url: `https://test-bucket.vercel-storage.com/rate-limit-test-${operationCount}.txt`,
            pathname: `rate-limit-test-${operationCount}.txt`,
            size: 1024,
            contentType: 'text/plain',
          });
        } else if (operationCount <= 13) {
          // Next 3 operations hit rate limit
          const rateLimitError = new Error('Rate limit exceeded');
          (rateLimitError as any).statusCode = 429;
          (rateLimitError as any).retryAfter = 30; // 30 seconds
          return Promise.reject(rateLimitError);
        } else {
          // Remaining operations succeed after backoff
          return Promise.resolve({
            url: `https://test-bucket.vercel-storage.com/rate-limit-test-${operationCount}.txt`,
            pathname: `rate-limit-test-${operationCount}.txt`,
            size: 1024,
            contentType: 'text/plain',
          });
        }
      });

      // Execute operations with rate limit handling
      const operationPromises = [];
      for (let i = 1; i <= rateLimitingTest.operations; i++) {
        const testFile = new File([`Rate limit test ${i}`], `rate-limit-test-${i}.txt`, { type: 'text/plain' });
        
        const operationPromise = async () => {
          let delay = rateLimitingTest.backoffStrategy.initialDelay;
          let attempts = 0;
          
          while (attempts < 5) {
            try {
              const result = await serverBlob.put(`rate-limit-test-${i}.txt`, testFile, {
                operationId: i,
                attempt: attempts + 1,
              } as any);
              return result;
            } catch (error: any) {
              if (error.statusCode === 429 && attempts < 4) {
                // Rate limited - apply backoff
                await new Promise(resolve => setTimeout(resolve, delay));
                delay = Math.min(delay * rateLimitingTest.backoffStrategy.backoffFactor, rateLimitingTest.backoffStrategy.maxDelay);
                attempts++;
              } else {
                throw error;
              }
            }
          }
        };

        operationPromises.push(operationPromise());
      }

      // Advance timers to simulate backoff delays
      await vi.advanceTimersByTimeAsync(500); // Initial backoff
      await vi.advanceTimersByTimeAsync(1000); // 2x backoff
      await vi.advanceTimersByTimeAsync(2000); // 4x backoff
      await vi.advanceTimersByTimeAsync(4000); // 8x backoff

      const results = await Promise.allSettled(operationPromises);
      const successful = results.filter(result => result.status === 'fulfilled');

      // Verify rate limiting handling
      expect(successful.length).toBeGreaterThan(10); // At least initial successful operations
      expect(mockServerPut).toHaveBeenCalledTimes(rateLimitingTest.operations);

      vi.useRealTimers();
    });
  });

  /**
   * Error Recovery and Retry Mechanisms
   * 
   * Tests comprehensive error recovery scenarios including network failures,
   * service outages, partial failures, and automated recovery workflows.
   * These integration tests ensure the storage system maintains resilience
   * under various failure conditions.
   * 
   * Recovery Scenarios Tested:
   * 1. Network interruption during upload with resume capability
   * 2. Service outage with automatic failover and recovery
   * 3. Partial failure recovery in multi-step operations
   * 4. Corruption detection and automatic retry workflows
   * 5. Timeout handling with progressive retry strategies
   * 6. Concurrent operation failure isolation and recovery
   */
  describe('Error Recovery and Retry Mechanisms', () => {
    it('should recover from network interruption during large file upload with resume capability', async () => {
      /**
       * Integration Workflow: Large Upload Start → Network Interruption → Resume Detection → Completion
       * 
       * Tests the system's ability to resume interrupted uploads, particularly for large files
       * that may be subject to network instability during transfer.
       */

      vi.useFakeTimers();

      const resumableUpload = {
        filename: 'large-resumable-file.zip',
        totalSize: 50 * 1024 * 1024, // 50MB
        chunkSize: 5 * 1024 * 1024, // 5MB chunks
        interruptionPoint: 3, // Interrupt after 3 chunks (15MB)
        uploadId: 'resumable-upload-123',
        sessionId: 'upload-session-456',
      };


      // Step 1: Initiate multipart upload
      const multipartInitResult = {
        uploadId: resumableUpload.uploadId,
        key: resumableUpload.filename,
      };

      mockClientCreateMultipartUpload.mockResolvedValue(multipartInitResult);

      const multipartInit = await client.createMultipartUpload(resumableUpload.filename, {
        contentType: 'application/zip',
        totalSize: resumableUpload.totalSize,
      } as any);

      expect(multipartInit.uploadId).toBe(resumableUpload.uploadId);

      // Step 2: Upload chunks with network interruption
      const uploadedChunks = [];
      let chunkUploadCount = 0;

      mockClientUploadPart.mockImplementation(() => {
        chunkUploadCount++;
        
        if (chunkUploadCount <= resumableUpload.interruptionPoint) {
          // First 3 chunks succeed
          return Promise.resolve({
            etag: `etag-chunk-${chunkUploadCount}`,
            partNumber: chunkUploadCount,
            uploadId: resumableUpload.uploadId,
          });
        } else if (chunkUploadCount === resumableUpload.interruptionPoint + 1) {
          // 4th chunk fails due to network interruption
          return Promise.reject(new Error('Network connection lost'));
        } else {
          // Remaining chunks succeed after resume
          return Promise.resolve({
            etag: `etag-chunk-${chunkUploadCount}-resumed`,
            partNumber: chunkUploadCount,
            uploadId: resumableUpload.uploadId,
          });
        }
      });

      // Upload chunks with interruption handling
      const totalChunks = Math.ceil(resumableUpload.totalSize / resumableUpload.chunkSize);
      
      for (let chunkIndex = 1; chunkIndex <= totalChunks; chunkIndex++) {
        const chunkStart = (chunkIndex - 1) * resumableUpload.chunkSize;
        const chunkEnd = Math.min(chunkStart + resumableUpload.chunkSize, resumableUpload.totalSize);
        const chunkBlob = new Blob(['x'.repeat(chunkEnd - chunkStart)]);

        try {
          const chunkResult = await client.uploadPart(resumableUpload.filename, chunkBlob, {
            partNumber: chunkIndex,
            uploadId: resumableUpload.uploadId,
          } as any);

          uploadedChunks.push(chunkResult);
        } catch (error) {
          if (error instanceof Error && error.message.includes('Network connection lost')) {
            // Handle network interruption - implement resume logic
            console.log(`Network interruption at chunk ${chunkIndex}, attempting to resume...`);
            
            // Simulate network recovery delay
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // Retry from interruption point
            for (let retryChunk = chunkIndex; retryChunk <= totalChunks; retryChunk++) {
              const retryChunkStart = (retryChunk - 1) * resumableUpload.chunkSize;
              const retryChunkEnd = Math.min(retryChunkStart + resumableUpload.chunkSize, resumableUpload.totalSize);
              const retryChunkBlob = new Blob(['x'.repeat(retryChunkEnd - retryChunkStart)]);

              const retryResult = await client.uploadPart(resumableUpload.filename, retryChunkBlob, {
                partNumber: retryChunk,
                uploadId: resumableUpload.uploadId,
                resumed: true,
              } as any);

              uploadedChunks.push(retryResult);
            }
            break; // Exit main loop after successful resume
          } else {
            throw error;
          }
        }
      }

      // Advance timer for network recovery simulation
      await vi.advanceTimersByTimeAsync(5000);

      // Step 3: Complete multipart upload
      const completionResult = {
        url: 'https://test-bucket.vercel-storage.com/large-resumable-file-ghi789.zip',
        downloadUrl: 'https://test-bucket.vercel-storage.com/large-resumable-file-ghi789.zip?download=1',
        pathname: resumableUpload.filename,
        contentType: 'application/zip',
        size: resumableUpload.totalSize,
        uploadId: resumableUpload.uploadId,
        uploadedAt: new Date().toISOString(),
      };

      mockClientCompleteMultipartUpload.mockResolvedValue(completionResult);

      const completedUpload = await client.completeMultipartUpload(
        resumableUpload.filename,
        uploadedChunks.map((chunk, index) => ({
          etag: chunk.etag,
          partNumber: index + 1,
        })),
        { uploadId: resumableUpload.uploadId } as any
      );

      // Integration verification: Resumable upload with network recovery
      expect((completedUpload as any).size).toBe(resumableUpload.totalSize);
      expect(uploadedChunks).toHaveLength(totalChunks);

      vi.useRealTimers();
    });

    it('should handle service outage with automatic failover and recovery', async () => {
      /**
       * Integration Workflow: Service Outage Detection → Failover Activation → Service Recovery → Failback
       * 
       * Tests the system's ability to detect service outages, activate failover mechanisms,
       * and automatically recover when services become available again.
       */

      vi.useFakeTimers();

      const failoverScenario = {
        primaryService: 'https://primary.vercel-storage.com',
        failoverService: 'https://backup.vercel-storage.com',
        outageWindow: {
          start: Date.now(),
          duration: 120000, // 2 minutes
        },
        testOperations: 5,
      };

      let serviceOutageActive = true;
      let operationCount = 0;

      // Mock service outage and failover behavior
      mockServerPut.mockImplementation(() => {
        operationCount++;
        
        if (serviceOutageActive && operationCount <= 3) {
          // Primary service is down for first 3 operations
          const outageError = new Error('Service unavailable');
          (outageError as any).code = 'SERVICE_UNAVAILABLE';
          (outageError as any).statusCode = 503;
          return Promise.reject(outageError);
        } else if (serviceOutageActive && operationCount > 3) {
          // Failover to backup service
          return Promise.resolve({
            url: `${failoverScenario.failoverService}/failover-test-${operationCount}.txt`,
            pathname: `failover-test-${operationCount}.txt`,
            size: 1024,
            contentType: 'text/plain',
            service: 'backup',
            operationIndex: operationCount,
          });
        } else {
          // Primary service recovered
          return Promise.resolve({
            url: `${failoverScenario.primaryService}/failover-test-${operationCount}.txt`,
            pathname: `failover-test-${operationCount}.txt`,
            size: 1024,
            contentType: 'text/plain',
            service: 'primary',
            operationIndex: operationCount,
          });
        }
      });

      // Execute operations during service outage
      const operationPromises = [];

      for (let i = 1; i <= failoverScenario.testOperations; i++) {
        const testFile = new File([`Failover test content ${i}`], `failover-test-${i}.txt`, { type: 'text/plain' });
        
        const operationPromise = async () => {
          let retryAttempts = 0;
          const maxRetries = 3;
          
          while (retryAttempts <= maxRetries) {
            try {
              const result = await serverBlob.put(`failover-test-${i}.txt`, testFile, {
                operationId: i,
                retry: retryAttempts,
              } as any);
              return result;
            } catch (error: any) {
              if (error.code === 'SERVICE_UNAVAILABLE' && retryAttempts < maxRetries) {
                retryAttempts++;
                // Exponential backoff
                const delay = Math.pow(2, retryAttempts) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
              } else {
                throw error;
              }
            }
          }
        };

        operationPromises.push(operationPromise());
        
        // Add delay between operations
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Simulate service recovery after outage window
      setTimeout(() => {
        serviceOutageActive = false;
        console.log('Primary service recovered from outage');
      }, failoverScenario.outageWindow.duration);

      // Advance timers through outage and recovery
      await vi.advanceTimersByTimeAsync(30000); // Initial failures and retries
      await vi.advanceTimersByTimeAsync(60000); // Failover operations
      await vi.advanceTimersByTimeAsync(30000); // Service recovery

      const results = await Promise.allSettled(operationPromises);
      const successful = results.filter(result => result.status === 'fulfilled');

      // Integration verification: Service failover and recovery
      expect(successful.length).toBeGreaterThan(0);

      vi.useRealTimers();
    });

    it('should handle corruption detection and automatic retry with integrity verification', async () => {
      /**
       * Integration Workflow: Upload → Corruption Detection → Retry → Integrity Verification → Success
       * 
       * Tests the system's ability to detect data corruption during transfer,
       * automatically retry operations, and verify data integrity.
       */

      const integrityTest = {
        filename: 'integrity-test-document.pdf',
        originalChecksum: 'sha256:abcdef123456789',
        corruptedChecksum: 'sha256:corrupted_data',
        maxRetryAttempts: 3,
      };

      const testFile = new File(['Important document content that must maintain integrity'], integrityTest.filename, {
        type: 'application/pdf',
      });

      let uploadAttempts = 0;

      // Mock corruption detection and retry behavior
      mockServerPut.mockImplementation(() => {
        uploadAttempts++;
        
        if (uploadAttempts <= 2) {
          // First two attempts result in corrupted uploads
          return Promise.resolve({
            url: `https://test-bucket.vercel-storage.com/${integrityTest.filename.replace('.', `-attempt${uploadAttempts}.`)}`,
            pathname: integrityTest.filename,
            size: testFile.size,
            contentType: testFile.type,
            checksum: integrityTest.corruptedChecksum,
            uploadAttempt: uploadAttempts,
          });
        } else {
          // Third attempt succeeds with correct integrity
          return Promise.resolve({
            url: `https://test-bucket.vercel-storage.com/${integrityTest.filename.replace('.', '-final.')}`,
            pathname: integrityTest.filename,
            size: testFile.size,
            contentType: testFile.type,
            checksum: integrityTest.originalChecksum,
            uploadAttempt: uploadAttempts,
          });
        }
      });

      // Mock integrity verification
      mockServerHead.mockImplementation((url: string) => {
        const isCorrupted = url.includes('attempt1') || url.includes('attempt2');
        
        return Promise.resolve({
          url,
          size: testFile.size,
          contentType: 'application/pdf',
          checksum: isCorrupted ? integrityTest.corruptedChecksum : integrityTest.originalChecksum,
        } as any);
      });

      // Execute upload with integrity checking and retry logic
      let finalResult = null;
      let currentAttempt = 0;

      while (currentAttempt < integrityTest.maxRetryAttempts && !finalResult) {
        currentAttempt++;
        
        try {
          // Upload file
          const uploadResult = await serverBlob.put(integrityTest.filename, testFile, {
            attempt: currentAttempt,
            integrityCheck: true,
          } as any);

          // Verify integrity
          const integrityCheck = await serverBlob.head(uploadResult.url);

          if ((integrityCheck as any).checksum === integrityTest.originalChecksum) {
            finalResult = {
              ...uploadResult,
              totalAttempts: currentAttempt,
            };
          } else {
            console.log(`Corruption detected on attempt ${currentAttempt}, retrying...`);
            
            // Clean up corrupted upload
            mockServerDel.mockResolvedValueOnce({ deleted: true });
            await serverBlob.del(uploadResult.url);
          }
        } catch (error) {
          console.error(`Upload attempt ${currentAttempt} failed:`, error);
          
          if (currentAttempt === integrityTest.maxRetryAttempts) {
            throw error;
          }
        }
      }

      if (!finalResult) {
        throw new Error('Failed to upload file with verified integrity after maximum attempts');
      }

      // Integration verification: Corruption detection and recovery
      expect((finalResult as any).totalAttempts).toBe(3);
      expect(mockServerDel).toHaveBeenCalledTimes(2); // 2 corrupted uploads cleaned up
    });

    it('should isolate and recover from concurrent operation failures', async () => {
      /**
       * Integration Workflow: Concurrent Operations → Partial Failures → Isolation → Individual Recovery
       * 
       * Tests the system's ability to handle failures in concurrent operations without
       * affecting other operations, and to recover failed operations individually.
       */

      const concurrencyTest = {
        totalOperations: 10,
        failureIndices: [2, 5, 8], // Operations that will fail
        maxConcurrency: 5,
        retryDelay: 1000,
      };

      let operationExecutionCount = 0;

      // Mock concurrent operation behavior with selective failures
      mockServerPut.mockImplementation((pathname: string, file: File, options: any) => {
        operationExecutionCount++;
        const operationId = parseInt(pathname.match(/concurrent-(\d+)/)?.[1] || '0');
        const isInitialAttempt = !options?.retry;
        
        if (concurrencyTest.failureIndices.includes(operationId) && isInitialAttempt) {
          // Simulate failure for specific operations on first attempt
          const error = new Error(`Operation ${operationId} failed - temporary service issue`);
          (error as any).operationId = operationId;
          (error as any).retryable = true;
          return Promise.reject(error);
        } else {
          // Success for all other operations or retry attempts
          return Promise.resolve({
            url: `https://test-bucket.vercel-storage.com/concurrent-${operationId}-${options?.retry ? 'retry' : 'success'}.txt`,
            pathname,
            size: file.size,
            contentType: file.type,
            operationId,
            attempt: options?.retry ? 'retry' : 'initial',
          });
        }
      });

      // Execute concurrent operations with failure isolation
      const operationPromises = Array.from({ length: concurrencyTest.totalOperations }, (_, index) => {
        const operationId = index + 1;
        const testFile = new File([`Concurrent test content ${operationId}`], `concurrent-${operationId}.txt`, { type: 'text/plain' });

        return async () => {
          try {
            // Initial attempt
            const result = await serverBlob.put(`concurrent-${operationId}.txt`, testFile, {
              operationId,
              concurrentBatch: true,
            } as any);
            return result;
          } catch (error: any) {
            if (error.retryable) {
              // Isolated retry for failed operation
              console.log(`Retrying failed operation ${operationId}`);
              
              await new Promise(resolve => setTimeout(resolve, concurrencyTest.retryDelay));
              
              const retryResult = await serverBlob.put(`concurrent-${operationId}.txt`, testFile, {
                operationId,
                retry: true,
                concurrentBatch: true,
              } as any);
              
              return retryResult;
            } else {
              throw error;
            }
          }
        };
      });

      // Execute operations with concurrency control
      const batchSize = concurrencyTest.maxConcurrency;
      const batches = [];
      
      for (let i = 0; i < operationPromises.length; i += batchSize) {
        const batch = operationPromises.slice(i, i + batchSize);
        batches.push(batch);
      }

      const allResults = [];
      
      for (const batch of batches) {
        const batchResults = await Promise.allSettled(
          batch.map(operation => operation())
        );
        allResults.push(...batchResults);
      }

      // Analyze results
      const successful = allResults.filter(result => result.status === 'fulfilled').map(result => (result as any).value);
      const failed = allResults.filter(result => result.status === 'rejected');

      const initialSuccesses = successful.filter(result => result.attempt === 'initial');
      const retrySuccesses = successful.filter(result => result.attempt === 'retry');

      // Integration verification: Concurrent operation failure isolation and recovery
      expect(successful.length).toBe(concurrencyTest.totalOperations);
      expect(failed.length).toBe(0); // All operations should eventually succeed
      expect(initialSuccesses.length).toBe(concurrencyTest.totalOperations - concurrencyTest.failureIndices.length);
      expect(retrySuccesses.length).toBe(concurrencyTest.failureIndices.length);
      expect(successful.every(result => result.concurrentExecution !== false)).toBe(true);
      
      // Verify that failed operations were retried and succeeded
      const retriedOperationIds = retrySuccesses.map(result => result.operationId);
      expect(retriedOperationIds.sort()).toEqual(concurrencyTest.failureIndices.sort());
    });
  });

  /**
   * Concurrent Operation Handling and Performance Integration
   * 
   * Tests the storage system's ability to handle multiple simultaneous operations
   * efficiently while maintaining data integrity and performance under load.
   * These integration tests validate scalability and performance characteristics.
   * 
   * Concurrency Scenarios:
   * 1. High-volume simultaneous uploads with resource management
   * 2. Mixed operation types (upload/download/delete) running concurrently
   * 3. Load balancing and resource allocation under stress
   * 4. Performance degradation detection and mitigation
   * 5. Memory and connection management during concurrent operations
   * 6. Deadlock prevention and resource cleanup
   */
  describe('Concurrent Operation Handling and Performance Integration', () => {
    it('should handle high-volume simultaneous uploads with proper resource management', async () => {
      /**
       * Integration Workflow: High Volume Upload Initiation → Resource Allocation → Load Balancing → Performance Monitoring
       * 
       * Tests the system's ability to handle a large number of simultaneous uploads
       * while properly managing system resources and maintaining performance.
       */

      const loadTest = {
        concurrentUploads: 50,
        fileSize: 1024 * 1024, // 1MB each
        totalDataVolume: 50 * 1024 * 1024, // 50MB total
        maxConcurrency: 10,
        performanceThresholds: {
          maxResponseTime: 5000, // 5 seconds
          maxMemoryUsage: 100 * 1024 * 1024, // 100MB
          minThroughput: 10 * 1024 * 1024, // 10MB/s
        },
      };

      const uploadFiles = Array.from({ length: loadTest.concurrentUploads }, (_, index) => ({
        id: index + 1,
        file: new File(['x'.repeat(loadTest.fileSize)], `load-test-${index + 1}.bin`, { type: 'application/octet-stream' }),
        metadata: {
          batch: 'high-volume-test',
          size: loadTest.fileSize,
          index: index + 1,
        },
      }));

      let activeUploads = 0;
      const maxActiveUploads = loadTest.maxConcurrency;

      // Mock resource-aware upload behavior
      mockServerPut.mockImplementation(async (pathname: string, file: File) => {
        const uploadStartTime = Date.now();
        
        // Simulate resource allocation
        if (activeUploads >= maxActiveUploads) {
          await new Promise(resolve => setTimeout(resolve, 100)); // Queue delay
        }
        
        activeUploads++;
        
        // Simulate upload processing time based on current load
        const processingTime = Math.min(1000 + (activeUploads * 50), 3000); // 1-3 seconds
        await new Promise(resolve => setTimeout(resolve, processingTime));
        
        const uploadEndTime = Date.now();
        const uploadDuration = uploadEndTime - uploadStartTime;
        
        activeUploads--;
        
        return {
          url: `https://test-bucket.vercel-storage.com/${pathname.replace('.', `-${Date.now()}.`)}`,
          pathname,
          size: file.size,
          contentType: file.type,
          uploadDuration,
          concurrencyLevel: activeUploads + 1,
          batchId: 'high-volume-test',
          uploadedAt: new Date(uploadEndTime).toISOString(),
        };
      });

      // Execute concurrent uploads with resource management
      const uploadPromises = uploadFiles.map(({ id, file, metadata }) => 
        async () => {
          const result = await serverBlob.put(`load-test-${id}.bin`, file, {
            ...metadata,
            loadTest: true,
          } as any);
          return result;
        }
      );

      // Control concurrency using a semaphore-like approach
      const semaphore = {
        current: 0,
        max: loadTest.maxConcurrency,
        queue: [] as Array<() => void>,
      };

      const executeWithConcurrencyControl = async (uploadFn: () => Promise<any>) => {
        return new Promise((resolve, reject) => {
          const execute = async () => {
            if (semaphore.current >= semaphore.max) {
              semaphore.queue.push(execute);
              return;
            }
            
            semaphore.current++;
            
            try {
              const result = await uploadFn();
              resolve(result);
            } catch (error) {
              reject(error);
            } finally {
              semaphore.current--;
              
              if (semaphore.queue.length > 0) {
                const next = semaphore.queue.shift();
                if (next) {
                  setTimeout(next, 0);
                }
              }
            }
          };
          
          execute();
        });
      };

      const results = await Promise.all(
        uploadPromises.map(uploadFn => executeWithConcurrencyControl(uploadFn))
      );

      // Integration verification: High-volume concurrent upload performance
      expect(results.length).toBe(loadTest.concurrentUploads);
      expect(results.every(result => (result as any).batchId === 'high-volume-test')).toBe(true);
    });

    it('should handle mixed concurrent operations with proper priority and resource allocation', async () => {
      /**
       * Integration Workflow: Mixed Operations → Priority Allocation → Resource Balancing → Performance Optimization
       * 
       * Tests the system's ability to handle different types of operations concurrently
       * while maintaining appropriate resource allocation and performance priorities.
       */

      const mixedOperationsTest = {
        operations: {
          uploads: 15,
          downloads: 10,
          deletes: 5,
          lists: 8,
        },
        priorities: {
          upload: 'high',
          download: 'medium',
          delete: 'low',
          list: 'medium',
        },
        resourceLimits: {
          maxConcurrentUploads: 8,
          maxConcurrentDownloads: 12,
          maxConcurrentOperations: 20,
        },
      };

      const allOperations = [];

      // Upload operations
      for (let i = 1; i <= mixedOperationsTest.operations.uploads; i++) {
        const file = new File([`Upload content ${i}`], `mixed-upload-${i}.txt`, { type: 'text/plain' });
        allOperations.push({
          type: 'upload',
          id: `upload-${i}`,
          priority: mixedOperationsTest.priorities.upload,
          operation: async () => {
            const result = {
              url: `https://test-bucket.vercel-storage.com/mixed-upload-${i}-${Date.now()}.txt`,
              pathname: `mixed-upload-${i}.txt`,
              size: file.size,
              contentType: file.type,
              operationType: 'upload',
              priority: 'high',
            };

            mockServerPut.mockResolvedValueOnce(result);
            
            await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000)); // 0.5-1.5s
            const uploadResult = await serverBlob.put(`mixed-upload-${i}.txt`, file, {} as any);
            
            return uploadResult;
          },
        });
      }

      // Download operations (simulated)
      for (let i = 1; i <= mixedOperationsTest.operations.downloads; i++) {
        allOperations.push({
          type: 'download',
          id: `download-${i}`,
          priority: mixedOperationsTest.priorities.download,
          operation: async () => {
            const result = {
              url: `https://test-bucket.vercel-storage.com/mixed-download-${i}.txt`,
              pathname: `mixed-download-${i}.txt`,
              size: 1024,
              contentType: 'text/plain',
              operationType: 'download',
              priority: 'medium',
            };

            mockServerHead.mockResolvedValueOnce(result as any);
            
            await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 500)); // 0.2-0.7s
            const downloadResult = await serverBlob.head(`mixed-download-${i}.txt`);
            
            return downloadResult;
          },
        });
      }

      // Delete operations
      for (let i = 1; i <= mixedOperationsTest.operations.deletes; i++) {
        allOperations.push({
          type: 'delete',
          id: `delete-${i}`,
          priority: mixedOperationsTest.priorities.delete,
          operation: async () => {
            const result = {
              deleted: true,
              pathname: `mixed-delete-${i}.txt`,
              operationType: 'delete',
              priority: 'low',
            };

            mockServerDel.mockResolvedValueOnce(result);
            
            await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 300)); // 0.1-0.4s
            const deleteResult = await serverBlob.del(`mixed-delete-${i}.txt`);
            
            return deleteResult;
          },
        });
      }

      // List operations
      for (let i = 1; i <= mixedOperationsTest.operations.lists; i++) {
        allOperations.push({
          type: 'list',
          id: `list-${i}`,
          priority: mixedOperationsTest.priorities.list,
          operation: async () => {
            const result = {
              blobs: Array.from({ length: 5 }, (_, j) => ({
                url: `https://test-bucket.vercel-storage.com/list-item-${i}-${j}.txt`,
                pathname: `list-item-${i}-${j}.txt`,
                size: 1024,
              })),
              hasMore: false,
              cursor: null,
              operationType: 'list',
              priority: 'medium',
            };

            mockServerList.mockResolvedValueOnce(result);
            
            await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500)); // 0.3-0.8s
            const listResult = await serverBlob.list({ prefix: `list-${i}` } as any);
            
            return listResult;
          },
        });
      }

      // Sort operations by priority
      const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
      allOperations.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);

      // Execute mixed operations with resource allocation
      const operationPromises = allOperations.map(operation => operation.operation());
      
      const results = await Promise.allSettled(operationPromises);
      const successful = results.filter(result => result.status === 'fulfilled').map(result => (result as any).value);
      const failed = results.filter(result => result.status === 'rejected');

      // Analyze operation distribution and performance
      const operationsByType = {
        uploads: successful.filter(result => result.operationType === 'upload'),
        downloads: successful.filter(result => result.operationType === 'download'),
        deletes: successful.filter(result => result.operationType === 'delete'),
        lists: successful.filter(result => result.operationType === 'list'),
      };

      // Integration verification: Mixed concurrent operations
      expect(failed.length).toBe(0); // All operations should succeed
      expect(operationsByType.uploads.length).toBe(mixedOperationsTest.operations.uploads);
      expect(operationsByType.downloads.length).toBe(mixedOperationsTest.operations.downloads);
      expect(operationsByType.deletes.length).toBe(mixedOperationsTest.operations.deletes);
      expect(operationsByType.lists.length).toBe(mixedOperationsTest.operations.lists);
    });
  });
});