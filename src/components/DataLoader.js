'use client'

import React, { useState, useEffect, useCallback } from 'react';
import ErrorDisplay from './ErrorDisplay';
import { logError, logInfo } from '../utils/logger';
import { withRetry } from '../utils/api';

/**
 * Generic data loader component with error handling and retry logic
 */
const DataLoader = ({ 
  loadFunction, 
  children, 
  loadingComponent = <div>Loading...</div>,
  errorTitle = "Failed to load data",
  retryLabel = "Retry loading",
  maxRetries = 3,
  onDataLoaded,
  dependencies = []
}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await withRetry(
        async () => {
          const data = await loadFunction();
          if (!data) {
            throw new Error('No data returned from load function');
          }
          return data;
        },
        { 
          maxRetries,
          shouldRetry: (error) => {
            // Retry network errors, 5xx errors, and empty data
            return error.name === 'TypeError' || 
                   (error.status && error.status >= 500) ||
                   error.message?.includes('Network') ||
                   error.message?.includes('No data');
          }
        }
      );
      
      setData(result);
      setRetryCount(0);
      
      if (onDataLoaded) {
        onDataLoaded(result);
      }
      
      logInfo('Data loaded successfully', { 
        component: 'DataLoader',
        metadata: { dataType: typeof result }
      });
      
    } catch (error) {
      const currentRetryCount = retryCount + 1;
      setRetryCount(currentRetryCount);
      setError(error);
      
      logError(error, {
        component: 'DataLoader',
        metadata: { 
          retryCount: currentRetryCount,
          maxRetries 
        }
      });
      
    } finally {
      setLoading(false);
    }
  }, [loadFunction, maxRetries, onDataLoaded, retryCount]);

  useEffect(() => {
    loadData();
  }, [loadData, ...dependencies]);

  const handleRetry = () => {
    setRetryCount(0);
    loadData();
  };

  if (loading) {
    return loadingComponent;
  }

  if (error) {
    return (
      <ErrorDisplay
        error={error}
        onRetry={handleRetry}
        title={errorTitle}
        retryLabel={retryCount >= maxRetries ? "Try again" : retryLabel}
      />
    );
  }

  if (!data) {
    return (
      <ErrorDisplay
        error={{ message: 'No data available' }}
        onRetry={handleRetry}
        title="No data found"
        retryLabel="Retry"
      />
    );
  }

  return children(data);
};

export default DataLoader;