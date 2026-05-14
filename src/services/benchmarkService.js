/**
 * Service for fetching and validating LLM benchmark data
 * Enhanced with error handling and logging
 */

import { fetchJson, withRetry } from '../utils/api';
import { logError, logWarning } from '../utils/logger';

/**
 * Fetches LLM benchmark data from configured source
 * @param {string} source - API endpoint URL or 'local' for local JSON
 * @returns {Promise<Array>} Array of benchmark data objects
 */
export const fetchBenchmarkData = async (source = 'local') => {
  const context = {
    component: 'benchmarkService',
    metadata: { source }
  };
  
  try {
    let data;
    
    if (source.startsWith('http')) {
      // Fetch from API endpoint with retry logic
      data = await withRetry(
        async () => {
          const response = await fetchJson(source, {}, context);
          
          if (!Array.isArray(response)) {
            throw new Error('API returned non-array response');
          }
          
          return response;
        },
        { 
          maxRetries: 2,
          shouldRetry: (error) => error.status >= 500 || error.name === 'TypeError'
        }
      );
      
    } else if (source === 'local') {
      // Import local JSON data
      try {
        const localData = await import('../data/llm_benchmarks.json');
        data = localData.default || localData;
        
        if (!Array.isArray(data)) {
          throw new Error('Local JSON data is not an array');
        }
        
      } catch (importError) {
        logError(importError, {
          ...context,
          metadata: { ...context.metadata, type: 'local_import' }
        });
        throw new Error('Failed to load local benchmark data');
      }
      
    } else {
      throw new Error(`Invalid data source: ${source}`);
    }
    
    // Validate and normalize data structure
    const validatedData = validateAndNormalizeBenchmarkData(data, context);
    
    return validatedData;
    
  } catch (error) {
    // If API failed, try fallback to local data
    if (source !== 'local') {
      logWarning(`API source failed, falling back to local data: ${error.message}`, context);
      
      try {
        return await fetchBenchmarkData('local');
      } catch (fallbackError) {
        logError(fallbackError, {
          ...context,
          metadata: { ...context.metadata, fallback: true }
        });
      }
    }
    
    // Re-throw enriched error
    error.message = `Failed to load benchmark data: ${error.message}`;
    throw error;
  }
};

/**
 * Validates and normalizes benchmark data structure
 * @param {Array} data - Raw benchmark data
 * @param {Object} context - Logging context
 * @returns {Array} Validated and normalized data
 */
const validateAndNormalizeBenchmarkData = (data, context) => {
  if (!Array.isArray(data)) {
    throw new Error('Benchmark data must be an array');
  }
  
  const requiredFields = ['name', 'reasoning', 'coding', 'language_understanding', 'speed', 'cost'];
  
  return data.map((model, index) => {
    // Check for missing required fields
    const missingFields = requiredFields.filter(field => !(field in model));
    
    if (missingFields.length > 0) {
      logWarning(`Model ${index} missing fields: ${missingFields.join(', ')}`, {
        ...context,
        metadata: { 
          ...context.metadata, 
          modelName: model.name,
          missingFields 
        }
      });
    }
    
    // Normalize and validate field types
    return {
      name: String(model.name || 'Unknown Model'),
      reasoning: clampScore(Number(model.reasoning) || 0),
      coding: clampScore(Number(model.coding) || 0),
      language_understanding: clampScore(Number(model.language_understanding) || 0),
      speed: clampScore(Number(model.speed) || 0, 1, 5),
      cost: clampScore(Number(model.cost) || 0, 1, 5),
      provider: String(model.provider || 'Unknown'),
      context_window: Number(model.context_window) || 0,
      source: String(model.source || 'Unknown'),
      vision: Boolean(model.vision),
      open_source: Boolean(model.open_source),
      coding_specialized: Boolean(model.coding_specialized),
      // Keep original data for reference
      _raw: model
    };
  });
};

/**
 * Clamps scores to valid ranges
 * @param {number} value - Score value
 * @param {number} min - Minimum value (default: 0)
 * @param {number} max - Maximum value (default: 100)
 * @returns {number} Clamped value
 */
const clampScore = (value, min = 0, max = 100) => {
  return Math.max(min, Math.min(max, value));
};

/**
 * Get available data sources
 */
export const getAvailableSources = () => ({
  local: 'Local JSON Data',
  api: 'API Endpoint (configurable)'
});