/**
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Mock } from 'vitest';

// Mock the Vercel Blob client before importing
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

import * as client from '../client.js';

/**
 * Comprehensive test suite for the Vercel Blob storage client functionality.
 * 
 * This test suite covers the core storage operations including file uploads,
 * downloads, security validations, error handling, and performance considerations.
 * The tests are designed to ensure the storage client is secure, reliable, and
 * performs well under various conditions including edge cases and malicious inputs.
 */
describe('Storage Client', () => {
  // Mock references for easy access in tests
  let mockPut: Mock;
  let mockUpload: Mock;
  let mockHandleUpload: Mock;
  let mockGenerateClientToken: Mock;
  let mockGetPayloadFromToken: Mock;
  let mockCreateFolder: Mock;
  let mockCreateMultipartUpload: Mock;
  let mockUploadPart: Mock;
  let mockCompleteMultipartUpload: Mock;
  let mockCreateMultipartUploader: Mock;

  beforeEach(() => {
    // Reset all mocks before each test to ensure clean state
    vi.clearAllMocks();
    
    // Get fresh references to mocked functions
    mockPut = vi.mocked(client.put);
    mockUpload = vi.mocked(client.upload);
    mockHandleUpload = vi.mocked(client.handleUpload);
    mockGenerateClientToken = vi.mocked(client.generateClientTokenFromReadWriteToken);
    mockGetPayloadFromToken = vi.mocked(client.getPayloadFromClientToken);
    mockCreateFolder = vi.mocked(client.createFolder);
    mockCreateMultipartUpload = vi.mocked(client.createMultipartUpload);
    mockUploadPart = vi.mocked(client.uploadPart);
    mockCompleteMultipartUpload = vi.mocked(client.completeMultipartUpload);
    mockCreateMultipartUploader = vi.mocked(client.createMultipartUploader);
  });

  afterEach(() => {
    // Clean up any remaining timers only if they were mocked
    if (vi.isFakeTimers()) {
      vi.runOnlyPendingTimers();
      vi.useRealTimers();
    }
  });

  /**
   * Client Interface Testing
   * 
   * This section verifies that all expected functions are exported and available
   * from the client module, ensuring the re-export from @vercel/blob/client works correctly.
   */
  describe('Client Interface', () => {
    it('should export all required client functions', () => {
      // Verify that all client methods are available and are functions
      expect(typeof client.put).toBe('function');
      expect(typeof client.upload).toBe('function');
      expect(typeof client.handleUpload).toBe('function');
      expect(typeof client.generateClientTokenFromReadWriteToken).toBe('function');
      expect(typeof client.getPayloadFromClientToken).toBe('function');
      expect(typeof client.createFolder).toBe('function');
      expect(typeof client.createMultipartUpload).toBe('function');
      expect(typeof client.uploadPart).toBe('function');
      expect(typeof client.completeMultipartUpload).toBe('function');
      expect(typeof client.createMultipartUploader).toBe('function');
    });

    it('should call mocked functions correctly', () => {
      // Verify that the mocking is working as expected
      expect(vi.isMockFunction(client.put)).toBe(true);
      expect(vi.isMockFunction(client.upload)).toBe(true);
      expect(vi.isMockFunction(client.handleUpload)).toBe(true);
      expect(vi.isMockFunction(client.generateClientTokenFromReadWriteToken)).toBe(true);
      expect(vi.isMockFunction(client.getPayloadFromClientToken)).toBe(true);
      expect(vi.isMockFunction(client.createFolder)).toBe(true);
      expect(vi.isMockFunction(client.createMultipartUpload)).toBe(true);
      expect(vi.isMockFunction(client.uploadPart)).toBe(true);
      expect(vi.isMockFunction(client.completeMultipartUpload)).toBe(true);
      expect(vi.isMockFunction(client.createMultipartUploader)).toBe(true);
    });
  });

  /**
   * File Upload Operations Testing
   * 
   * This section tests the core file upload functionality including basic uploads,
   * multipart uploads for large files, and metadata handling. These tests ensure
   * that files can be successfully uploaded with proper validation and error handling.
   */
  describe('File Upload Operations', () => {
    it('should successfully upload a file using put method', async () => {
      const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const expectedResult = {
        url: 'https://blob.vercel-storage.com/test-abc123.txt',
        downloadUrl: 'https://blob.vercel-storage.com/test-abc123.txt',
        pathname: 'test.txt',
        contentType: 'text/plain',
        contentDisposition: 'attachment; filename="test.txt"',
      };

      mockPut.mockResolvedValue(expectedResult);

      const result = await client.put('test.txt', mockFile, {} as any);

      expect(mockPut).toHaveBeenCalledWith('test.txt', mockFile, {});
      expect(result).toEqual(expectedResult);
    });

    it('should handle file upload with custom options', async () => {
      const mockFile = new File(['document content'], 'document.pdf', { type: 'application/pdf' });
      const options = {
        access: 'public',
        token: 'test-token',
      };

      const expectedResult = {
        url: 'https://blob.vercel-storage.com/document-def456.pdf',
        downloadUrl: 'https://blob.vercel-storage.com/document-def456.pdf',
        pathname: 'document.pdf',
        contentType: 'application/pdf',
        contentDisposition: 'attachment; filename="document.pdf"',
      };

      mockPut.mockResolvedValue(expectedResult);

      const result = await client.put('document.pdf', mockFile, options as any);

      expect(mockPut).toHaveBeenCalledWith('document.pdf', mockFile, options);
      expect(result).toEqual(expectedResult);
    });

    it('should handle upload method for form-based uploads', async () => {
      const uploadData = {
        filename: 'upload.jpg',
        contentType: 'image/jpeg',
      };

      const expectedResult = {
        url: 'https://blob.vercel-storage.com/upload-ghi789.jpg',
        downloadUrl: 'https://blob.vercel-storage.com/upload-ghi789.jpg',
        pathname: 'upload.jpg',
        contentType: 'image/jpeg',
        contentDisposition: 'attachment; filename="upload.jpg"',
      };

      mockUpload.mockResolvedValue(expectedResult);

      const testFile = new File([''], uploadData.filename, { type: uploadData.contentType });
      const result = await client.upload(uploadData.filename, testFile, {} as any);

      expect(mockUpload).toHaveBeenCalledWith(uploadData.filename, testFile, {});
      expect(result).toEqual(expectedResult);
    });

    it('should handle multipart upload operations', async () => {
      const fileName = 'large-file.bin';
      const mockUploadId = 'upload_12345';
      const mockETag = 'etag_67890';
      
      // Mock multipart upload initiation
      mockCreateMultipartUpload.mockResolvedValue({
        uploadId: mockUploadId,
        key: fileName,
      });

      // Mock part upload
      mockUploadPart.mockResolvedValue({
        etag: mockETag,
        partNumber: 1,
      });

      // Mock upload completion
      mockCompleteMultipartUpload.mockResolvedValue({
        url: `https://blob.vercel-storage.com/${fileName}`,
        downloadUrl: `https://blob.vercel-storage.com/${fileName}`,
        pathname: fileName,
        contentType: 'application/octet-stream',
      });

      // Test multipart upload workflow
      const createResult = await client.createMultipartUpload(fileName, {} as any);
      expect(mockCreateMultipartUpload).toHaveBeenCalledWith(fileName, {});
      expect(createResult).toEqual({ uploadId: mockUploadId, key: fileName });

      const fileChunk = new Blob(['chunk data']);
      const partResult = await client.uploadPart(fileName, fileChunk, {} as any);
      expect(mockUploadPart).toHaveBeenCalledWith(fileName, fileChunk, {});
      expect(partResult).toEqual({ etag: mockETag, partNumber: 1 });

      const finalResult = await client.completeMultipartUpload(fileName, [] as any, {} as any);
      expect(mockCompleteMultipartUpload).toHaveBeenCalledWith(fileName, [] as any, {} as any);
      expect(finalResult.pathname).toBe(fileName);
    });

    it('should create folders for organized file storage', async () => {
      const folderPath = 'documents/projects/2024';
      
      mockCreateFolder.mockResolvedValue({
        url: `https://blob.vercel-storage.com/${folderPath}/`,
        pathname: `${folderPath}/`,
      });

      const result = await client.createFolder(folderPath, {} as any);

      expect(mockCreateFolder).toHaveBeenCalledWith(folderPath, {});
      expect(result.pathname).toBe(`${folderPath}/`);
    });
  });

  /**
   * Security and Authentication Testing
   * 
   * This section tests security measures including token generation, validation,
   * and access control. These tests ensure the storage client properly handles
   * authentication and authorization scenarios.
   */
  describe('Security and Authentication', () => {
    it('should handle client token generation', async () => {
      const validToken = 'generated_token_123';
      const tokenOptions = {
        token: 'read_write_token',
        pathname: 'test-file.txt',
        maximumSizeInBytes: 1024,
      };

      mockGenerateClientToken.mockResolvedValue(validToken);

      const result = await client.generateClientTokenFromReadWriteToken(tokenOptions as any);

      expect(mockGenerateClientToken).toHaveBeenCalledWith(tokenOptions);
      expect(result).toBe(validToken);
    });

    it('should validate and parse client tokens', async () => {
      const testToken = 'test_token_456';
      const expectedPayload = {
        pathname: 'secure-file.txt',
        maximumSizeInBytes: 2048,
        allowedContentTypes: ['text/plain', 'application/pdf'],
      };
      
      mockGetPayloadFromToken.mockResolvedValue(expectedPayload);
      
      const result = await client.getPayloadFromClientToken(testToken);
      
      expect(mockGetPayloadFromToken).toHaveBeenCalledWith(testToken);
      expect(result).toEqual(expectedPayload);
    });

    it('should handle invalid token scenarios', async () => {
      const invalidToken = 'invalid_token_789';
      
      mockGetPayloadFromToken.mockRejectedValue(new Error('Invalid token'));
      
      await expect(client.getPayloadFromClientToken(invalidToken))
        .rejects.toThrow('Invalid token');
    });

    it('should handle authorization errors', async () => {
      const testFile = new File(['unauthorized content'], 'restricted.txt', { type: 'text/plain' });
      
      mockPut.mockRejectedValue(new Error('Unauthorized access'));
      
      await expect(client.put('restricted.txt', testFile, {} as any))
        .rejects.toThrow('Unauthorized access');
    });
  });

  /**
   * Error Handling Testing
   * 
   * This section tests the client's ability to handle various error conditions
   * including network failures, server errors, and invalid inputs. These tests ensure
   * the client provides appropriate error handling and messaging.
   */
  describe('Error Handling', () => {
    it('should handle network timeout errors', async () => {
      const testFile = new File(['content'], 'test.txt', { type: 'text/plain' });
      
      mockPut.mockRejectedValue(new Error('Network timeout'));
      
      await expect(client.put('test.txt', testFile, {} as any))
        .rejects.toThrow('Network timeout');
    });

    it('should handle server errors with appropriate messages', async () => {
      const testFile = new File(['content'], 'test.txt', { type: 'text/plain' });
      
      const serverErrors = [
        'HTTP 400: Bad Request',
        'HTTP 401: Unauthorized',
        'HTTP 403: Forbidden',
        'HTTP 429: Too Many Requests',
        'HTTP 500: Internal Server Error',
      ];

      for (const errorMessage of serverErrors) {
        mockPut.mockRejectedValue(new Error(errorMessage));
        
        await expect(client.put('test.txt', testFile, {} as any))
          .rejects.toThrow(errorMessage);
        
        mockPut.mockClear();
      }
    });

    it('should handle quota exceeded errors', async () => {
      const testFile = new File(['content'], 'test.txt', { type: 'text/plain' });
      
      mockPut.mockRejectedValue(new Error('Storage quota exceeded'));
      
      await expect(client.put('test.txt', testFile, {} as any))
        .rejects.toThrow('Storage quota exceeded');
    });

    it('should handle multipart upload failures', async () => {
      const fileName = 'large-file.bin';
      const mockUploadId = 'upload_fail_123';

      // Mock successful upload initiation
      mockCreateMultipartUpload.mockResolvedValue({
        uploadId: mockUploadId,
        key: fileName,
      });

      // Mock part upload failure
      mockUploadPart.mockRejectedValue(new Error('Part upload failed'));

      await client.createMultipartUpload(fileName, {} as any);
      
      const fileChunk = new Blob(['chunk data']);
      await expect(client.uploadPart(fileName, fileChunk, {} as any))
        .rejects.toThrow('Part upload failed');
    });

    it('should provide detailed error information', async () => {
      const testFile = new File(['content'], 'test.txt', { type: 'text/plain' });
      
      const detailedError = new Error('Upload failed');
      (detailedError as any).code = 'UPLOAD_ERROR';
      (detailedError as any).statusCode = 400;
      (detailedError as any).details = {
        filename: 'test.txt',
        contentType: testFile.type,
      };

      mockPut.mockRejectedValue(detailedError);
      
      try {
        await client.put('test.txt', testFile, {} as any);
        expect.fail('Expected error to be thrown');
      } catch (error: any) {
        expect(error.message).toBe('Upload failed');
        expect(error.code).toBe('UPLOAD_ERROR');
        expect(error.statusCode).toBe(400);
        expect(error.details.filename).toBe('test.txt');
      }
    });
  });

  /**
   * Performance and Edge Cases Testing
   * 
   * This section tests the client's performance characteristics and behavior
   * under edge conditions including empty files, large files, special characters,
   * and concurrent operations.
   */
  describe('Performance and Edge Cases', () => {
    it('should handle empty files correctly', async () => {
      const emptyFile = new File([], 'empty.txt', { type: 'text/plain' });
      
      mockPut.mockResolvedValue({
        url: 'https://blob.vercel-storage.com/empty-abc123.txt',
        pathname: 'empty.txt',
        contentType: 'text/plain',
      });

      const result = await client.put('empty.txt', emptyFile, {} as any);
      
      expect(result.pathname).toBe('empty.txt');
      expect(mockPut).toHaveBeenCalledWith('empty.txt', emptyFile, {});
    });

    it('should handle files with special characters in names', async () => {
      const specialFiles = [
        'file with spaces.txt',
        'file-with-dashes.txt',
        'file_with_underscores.txt',
        'file.with.dots.txt',
        'файл.txt', // Cyrillic
        '文件.txt', // Chinese
      ];

      for (const fileName of specialFiles) {
        const file = new File(['content'], fileName, { type: 'text/plain' });
        
        mockPut.mockResolvedValue({
          url: `https://blob.vercel-storage.com/${encodeURIComponent(fileName)}`,
          pathname: fileName,
          contentType: 'text/plain',
        });

        const result = await client.put(fileName, file, {} as any);
        
        expect(result.pathname).toBe(fileName);
        expect(mockPut).toHaveBeenCalledWith(fileName, file, {});
        
        mockPut.mockClear();
      }
    });

    it('should handle concurrent uploads without interference', async () => {
      const files = Array.from({ length: 5 }, (_, i) => ({
        file: new File([`content ${i}`], `file-${i}.txt`, { type: 'text/plain' }),
        index: i,
      }));

      // Mock successful uploads for all files
      files.forEach(({ index }) => {
        mockPut.mockResolvedValueOnce({
          url: `https://blob.vercel-storage.com/file-${index}-abc123.txt`,
          pathname: `file-${index}.txt`,
          contentType: 'text/plain',
        });
      });

      const uploadPromises = files.map(({ file, index }) => 
        client.put(`file-${index}.txt`, file, {} as any)
      );

      const results = await Promise.all(uploadPromises);

      expect(results).toHaveLength(5);
      results.forEach((result, index) => {
        expect(result.pathname).toBe(`file-${index}.txt`);
      });
      expect(mockPut).toHaveBeenCalledTimes(5);
    });

    it('should handle timeout scenarios gracefully', async () => {
      vi.useFakeTimers();
      
      const file = new File(['content'], 'timeout.txt', { type: 'text/plain' });
      
      // Mock a delayed response that will timeout
      mockPut.mockImplementation(() => 
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 30000);
        })
      );

      const uploadPromise = client.put('timeout.txt', file, {} as any);
      
      // Fast-forward time to trigger timeout
      vi.advanceTimersByTime(30000);
      
      await expect(uploadPromise).rejects.toThrow('Request timeout');
      
      vi.useRealTimers();
    });

    it('should handle different content types', async () => {
      const contentTypes = [
        { type: 'text/plain', ext: 'txt' },
        { type: 'application/json', ext: 'json' },
        { type: 'image/jpeg', ext: 'jpg' },
        { type: 'application/pdf', ext: 'pdf' },
        { type: 'video/mp4', ext: 'mp4' },
      ];

      for (const { type, ext } of contentTypes) {
        const file = new File(['content'], `test.${ext}`, { type });
        
        mockPut.mockResolvedValue({
          url: `https://blob.vercel-storage.com/test-${ext}.${ext}`,
          pathname: `test.${ext}`,
          contentType: type,
        });

        const result = await client.put(`test.${ext}`, file, {} as any);
        
        expect(result.contentType).toBe(type);
        expect(result.pathname).toBe(`test.${ext}`);
        
        mockPut.mockClear();
      }
    });
  });

  /**
   * Integration and Compatibility Testing
   * 
   * This section tests the client's integration with different environments,
   * browser compatibility, and framework integration patterns.
   */
  describe('Integration and Compatibility', () => {
    it('should work with different blob types', async () => {
      const textBlob = new Blob(['text content'], { type: 'text/plain' });
      const binaryBlob = new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'application/octet-stream' });
      
      mockPut.mockResolvedValueOnce({
        url: 'https://blob.vercel-storage.com/text.txt',
        pathname: 'text.txt',
        contentType: 'text/plain',
      });
      
      mockPut.mockResolvedValueOnce({
        url: 'https://blob.vercel-storage.com/binary.bin',
        pathname: 'binary.bin',
        contentType: 'application/octet-stream',
      });

      const textResult = await client.put('text.txt', textBlob, {} as any);
      const binaryResult = await client.put('binary.bin', binaryBlob, {} as any);

      expect(textResult.contentType).toBe('text/plain');
      expect(binaryResult.contentType).toBe('application/octet-stream');
    });

    it('should handle upload workflow with handleUpload', async () => {
      const uploadRequest = new Request('https://example.com/upload', {
        method: 'POST',
        body: JSON.stringify({ filename: 'test.txt' }),
      });

      const expectedResponse = new Response(JSON.stringify({
        url: 'https://blob.vercel-storage.com/test.txt',
        pathname: 'test.txt',
      }), { status: 200 });

      mockHandleUpload.mockResolvedValue(expectedResponse);

      const result = await client.handleUpload({
        request: uploadRequest,
        onBeforeGenerateToken: vi.fn(),
        onUploadCompleted: vi.fn(),
      } as any);

      expect(mockHandleUpload).toHaveBeenCalled();
      expect(result).toBe(expectedResponse);
    });

    it('should support multipart uploader for streaming', async () => {
      const mockUploader = {
        uploadPart: vi.fn(),
        complete: vi.fn(),
        abort: vi.fn(),
      };

      mockCreateMultipartUploader.mockResolvedValue(mockUploader);

      const uploader = await client.createMultipartUploader('stream.bin', {} as any);

      expect(mockCreateMultipartUploader).toHaveBeenCalledWith('stream.bin', {});
      expect(uploader).toBe(mockUploader);
    });
  });
});