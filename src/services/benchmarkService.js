/**
 * Service for fetching and validating LLM benchmark data
 * Supports both local JSON and remote API sources
 */

/**
 * Validates benchmark data structure
 * @param {Array} data - Array of model objects to validate
 * @returns {boolean} - True if data is valid
 */
const validateBenchmarkData = (data) => {
  if (!Array.isArray(data)) {
    console.error('Benchmark data must be an array');
    return false;
  }

  const requiredFields = ['name', 'vendor', 'reasoning', 'coding', 'language_understanding', 'speed', 'cost'];
  const numericFields = ['reasoning', 'coding', 'language_understanding', 'vision', 'speed', 'context'];
  
  for (const model of data) {
    // Check required fields
    for (const field of requiredFields) {
      if (!(field in model)) {
        console.error(`Missing required field: ${field} in model ${model.name}`);
        return false;
      }
    }

    // Validate numeric fields
    for (const field of numericFields) {
      if (field in model && (typeof model[field] !== 'number' || model[field] < 0)) {
        console.error(`Invalid ${field} value for model ${model.name}: ${model[field]}`);
        return false;
      }
    }

    // Validate cost format
    if (!/^\$+$/.test(model.cost)) {
      console.error(`Invalid cost format for model ${model.name}: ${model.cost}`);
      return false;
    }
  }

  return true;
};

/**
 * Fetches benchmark data from configured source
 * @param {string} source - Data source ('local' or API URL)
 * @returns {Promise<Array>} - Array of validated model benchmarks
 */
export const fetchBenchmarkData = async (source = 'local') => {
  try {
    let data;
    
    if (source === 'local') {
      // Fetch from local JSON file
      try {
        const response = await fetch('/api/benchmarks');
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        data = await response.json();
      } catch (localError) {
        console.warn('Local benchmark API unavailable, falling back to direct import');
        // Fallback: try to import directly (for development)
        try {
          const localData = await import('../data/llm_benchmarks.json');
          data = localData.default || localData;
        } catch (importError) {
          throw new Error('Failed to load local benchmark data');
        }
      }
    } else {
      // Fetch from external API
      const response = await fetch(source);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      data = await response.json();
    }

    // Validate the data structure
    if (!validateBenchmarkData(data)) {
      throw new Error('Invalid benchmark data structure');
    }

    // Sort by reasoning score (highest first) as default
    return data.sort((a, b) => b.reasoning - a.reasoning);

  } catch (error) {
    console.error('Failed to fetch benchmark data:', error);
    throw new Error(`Benchmark data unavailable: ${error.message}`);
  }
};

/**
 * Gets performance rating label based on score
 * @param {number} score - Performance score (0-100)
 * @returns {string} - Performance rating label
 */
export const getPerformanceRating = (score) => {
  if (score >= 90) return 'Exceptional';
  if (score >= 80) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 60) return 'Fair';
  return 'Basic';
};

/**
 * Gets speed rating label based on speed score
 * @param {number} speed - Speed score (1-10, higher = faster)
 * @returns {string} - Speed rating label
 */
export const getSpeedRating = (speed) => {
  if (speed >= 9) return 'Very Fast';
  if (speed >= 7) return 'Fast';
  if (speed >= 5) return 'Medium';
  if (speed >= 3) return 'Slow';
  return 'Very Slow';
};

/**
 * Formats context length for display
 * @param {number} context - Context length in tokens
 * @returns {string} - Formatted context string
 */
export const formatContext = (context) => {
  if (context >= 1000000) return `${(context / 1000000).toFixed(1)}M`;
  if (context >= 1000) return `${(context / 1000).toFixed(0)}K`;
  return context.toString();
};