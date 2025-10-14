/**
 * 自定義錯誤類別
 */

export class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = '找不到資源') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = '未經授權') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class InternalError extends AppError {
  constructor(message = '內部伺服器錯誤') {
    super(message, 500);
    this.name = 'InternalError';
  }
}

/**
 * Express 錯誤處理中間件
 */
export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = err.message || '發生未知錯誤';

  console.error(`[ERROR] ${err.stack}`);

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      statusCode,
      timestamp: err.timestamp || new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
}

