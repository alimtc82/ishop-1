/**
 * معالج الأخطاء المركزي
 * يوفر آلية موحدة لمعالجة الأخطاء عبر التطبيق
 */

export class AppError extends Error {
  constructor(message, code = 'UNKNOWN_ERROR', statusCode = 500) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * تصنيف الأخطاء وتحديد رسائل المستخدم المناسبة
 */
export const ErrorMessages = {
  NETWORK_ERROR: 'حدث خطأ في الاتصال. يرجى التحقق من الإنترنت والمحاولة مرة أخرى.',
  AUTH_ERROR: 'فشل المصادقة. يرجى تسجيل الدخول مرة أخرى.',
  PERMISSION_ERROR: 'ليس لديك صلاحية لتنفيذ هذا الإجراء.',
  NOT_FOUND: 'المورد المطلوب غير موجود.',
  VALIDATION_ERROR: 'البيانات المدخلة غير صحيحة.',
  SERVER_ERROR: 'حدث خطأ في الخادم. يرجى المحاولة لاحقًا.',
  TIMEOUT_ERROR: 'انتهت مهلة الطلب. يرجى المحاولة مرة أخرى.',
  UNKNOWN_ERROR: 'حدث خطأ غير متوقع.',
};

/**
 * معالج الأخطاء الرئيسي
 * يحول الأخطاء المختلفة إلى رسائل موحدة
 */
export function handleError(error) {
  console.error('Error:', error);

  // خطأ شبكة
  if (error.message === 'Failed to fetch' || error.code === 'NETWORK_ERROR') {
    return {
      message: ErrorMessages.NETWORK_ERROR,
      code: 'NETWORK_ERROR',
      statusCode: 0,
    };
  }

  // خطأ مصادقة
  if (error.statusCode === 401 || error.code === 'AUTH_ERROR') {
    return {
      message: ErrorMessages.AUTH_ERROR,
      code: 'AUTH_ERROR',
      statusCode: 401,
    };
  }

  // خطأ صلاحيات
  if (error.statusCode === 403 || error.code === 'PERMISSION_ERROR') {
    return {
      message: ErrorMessages.PERMISSION_ERROR,
      code: 'PERMISSION_ERROR',
      statusCode: 403,
    };
  }

  // خطأ عدم وجود المورد
  if (error.statusCode === 404 || error.code === 'NOT_FOUND') {
    return {
      message: ErrorMessages.NOT_FOUND,
      code: 'NOT_FOUND',
      statusCode: 404,
    };
  }

  // خطأ التحقق من البيانات
  if (error.statusCode === 400 || error.code === 'VALIDATION_ERROR') {
    return {
      message: error.message || ErrorMessages.VALIDATION_ERROR,
      code: 'VALIDATION_ERROR',
      statusCode: 400,
    };
  }

  // خطأ انتهاء المهلة
  if (error.code === 'TIMEOUT_ERROR' || error.name === 'TimeoutError') {
    return {
      message: ErrorMessages.TIMEOUT_ERROR,
      code: 'TIMEOUT_ERROR',
      statusCode: 408,
    };
  }

  // خطأ الخادم
  if (error.statusCode >= 500) {
    return {
      message: ErrorMessages.SERVER_ERROR,
      code: 'SERVER_ERROR',
      statusCode: error.statusCode,
    };
  }

  // خطأ غير معروف
  return {
    message: error.message || ErrorMessages.UNKNOWN_ERROR,
    code: error.code || 'UNKNOWN_ERROR',
    statusCode: error.statusCode || 500,
  };
}

/**
 * Wrapper لطلبات API مع معالجة أخطاء موحدة
 */
export async function apiCall(fn, options = {}) {
  const { timeout = 30000, retries = 1 } = options;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const result = await fn(controller.signal);
      clearTimeout(timeoutId);
      return result;
    } catch (error) {
      clearTimeout(timeoutId);

      if (attempt === retries) {
        throw handleError(error);
      }

      // انتظر قبل إعادة المحاولة
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
}

/**
 * Hook لمعالجة الأخطاء في المكونات
 */
export function useErrorHandler() {
  const handleError = (error) => {
    const handled = handleError(error);
    return handled;
  };

  return { handleError };
}
