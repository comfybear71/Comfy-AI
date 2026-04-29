'use client'

import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

/**
 * Component for displaying user-friendly error messages with retry option
 */
const ErrorDisplay = ({ 
  error, 
  onRetry, 
  title = "Something went wrong",
  retryLabel = "Try again",
  className = "" 
}) => {
  const errorMessage = error?.message || 'An unexpected error occurred';
  const isNetworkError = errorMessage.includes('Network') || errorMessage.includes('fetch');
  
  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-red-800 mb-1">
            {title}
          </h3>
          <p className="text-sm text-red-700 mb-3">
            {isNetworkError && !errorMessage.includes('HTTP') && (
              <>
                Network connection issue. Please check your internet connection and<br />
              </>
            )}
            {errorMessage}
          </p>
          
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-md transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              {retryLabel}
            </button>
          )}
        </div>
      </div>
      
      {process.env.NODE_ENV === 'development' && error?.stack && (
        <details className="mt-3 text-xs">
          <summary className="cursor-pointer text-red-600 hover:text-red-700">
            Technical details
          </summary>
          <pre className="mt-2 p-2 bg-red-100 rounded text-red-800 overflow-x-auto">
            {error.stack}
          </pre>
        </details>
      )}
    </div>
  );
};

export default ErrorDisplay;