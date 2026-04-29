/**
 * Enhanced fetch wrapper with error handling, logging, and retry capabilities
 */

import { logError, logWarning } from './logger';

/**
 * Enhanced fetch with error handling and logging
 * @param {string} url - The URL to fetch
 * @param {Object} options - Fetch options
 * @param {Object} context - Context for error logging
 * @returns {Promise<Response>}
 */
export const fetchData = async (url, options = {}, context = {}) => {
  const startTime = Date.now();
  const component = context.component || 'fetchData';
  
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
    
    const duration = Date.now() - startTime;
    
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
      error.status = response.status;
      error.response = response;
      
      logError(error, {
        component,
        metadata: {
          url,
          status: response.status,
          duration,
          ...context.metadata
        }
      });
      
      throw error;
    }
    
    return response;
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Enrich error with context
    error.context = context;
    error.url = url;
    error.duration = duration;
    
    logError(error, {
      component,
      metadata: {
        url,
        duration,
        errorType: error.name,
        ...context.metadata
      }
    });
    
    throw error;
  }
};

/**
 * Fetch JSON data with automatic parsing and error handling
 * @param {string} url - The URL to fetch
 * @param {Object} options - Fetch options
 * @param {Object} context - Context for error logging
 * @returns {Promise<Object>}
 */
export const fetchJson = async (url, options = {}, context = {}) => {
  try {
    const response = await fetchData(url, options, context);
    const data = await response.json();
    
    if (!data) {
      throw new Error('Empty response received');
    }
    
    return data;
    
  } catch (error) {
    // Re-throw with additional context
    error.message = `JSON fetch failed: ${error.message}`;
    throw error;
  }
};

/**
 * Exponential backoff retry wrapper for async functions
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retries (default: 3)
 * @param {number} options.baseDelay - Base delay in ms (default: 1000)
 * @param {Function} options.shouldRetry - Function to determine if error should be retried
 * @returns {Promise<any>}
 */
export const withRetry = async (fn, options = {}) => {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    shouldRetry = (error) => {
      // Retry network errors and 5xx server errors
      return error.name === 'TypeError' || 
             (error.status && error.status >= 500) ||
             error.message?.includes('Network');
    }
  } = options;
  
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries || !shouldRetry(error)) {
        break;
      }
      
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 500;
      
      logWarning(`Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`, {
        component: 'withRetry',
        metadata: {
          attempt: attempt + 1,
          maxRetries,
          delay,
          error: error.message
        }
      });
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};