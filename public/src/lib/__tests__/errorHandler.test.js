/**
 * اختبارات معالج الأخطاء
 */

import { handleError, AppError, ErrorMessages } from '../errorHandler';

describe('errorHandler', () => {
  describe('handleError', () => {
    it('should handle network errors', () => {
      const error = new Error('Failed to fetch');
      const result = handleError(error);

      expect(result.code).toBe('NETWORK_ERROR');
      expect(result.message).toBe(ErrorMessages.NETWORK_ERROR);
      expect(result.statusCode).toBe(0);
    });

    it('should handle authentication errors', () => {
      const error = new AppError('Unauthorized', 'AUTH_ERROR', 401);
      const result = handleError(error);

      expect(result.code).toBe('AUTH_ERROR');
      expect(result.statusCode).toBe(401);
    });

    it('should handle permission errors', () => {
      const error = new AppError('Forbidden', 'PERMISSION_ERROR', 403);
      const result = handleError(error);

      expect(result.code).toBe('PERMISSION_ERROR');
      expect(result.statusCode).toBe(403);
    });

    it('should handle not found errors', () => {
      const error = new AppError('Not Found', 'NOT_FOUND', 404);
      const result = handleError(error);

      expect(result.code).toBe('NOT_FOUND');
      expect(result.statusCode).toBe(404);
    });

    it('should handle validation errors', () => {
      const error = new AppError('Invalid data', 'VALIDATION_ERROR', 400);
      const result = handleError(error);

      expect(result.code).toBe('VALIDATION_ERROR');
      expect(result.statusCode).toBe(400);
    });

    it('should handle server errors', () => {
      const error = new AppError('Server error', 'SERVER_ERROR', 500);
      const result = handleError(error);

      expect(result.code).toBe('SERVER_ERROR');
      expect(result.statusCode).toBe(500);
    });

    it('should handle unknown errors', () => {
      const error = new Error('Unknown error');
      const result = handleError(error);

      expect(result.code).toBe('UNKNOWN_ERROR');
      expect(result.message).toContain('Unknown error');
    });
  });

  describe('AppError', () => {
    it('should create an AppError with proper properties', () => {
      const error = new AppError('Test error', 'TEST_CODE', 400);

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe('AppError');
    });

    it('should have default values', () => {
      const error = new AppError('Test error');

      expect(error.code).toBe('UNKNOWN_ERROR');
      expect(error.statusCode).toBe(500);
    });
  });
});
