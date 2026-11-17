// Mathematical and Statistical Utilities for Intelligent Queue Estimation
// Course: Advanced Programming (AP) · B.Tech 2nd Year
// Smart Queue (QueueBee)

/**
 * Calculates the statistical median of an array of numeric values.
 * The median is chosen over the arithmetic mean (average) because it is
 * robust against extreme outliers (e.g., an abnormal 25-minute registration issue).
 *
 * Example:
 * Samples: [120, 180, 240, 300, 1200] (in seconds)
 * Mean = 408s (~6.8 mins)
 * Median = 240s (4 mins) -> Realistically reflects typical student waiting experience!
 *
 * @param {number[]} numbers - Array of durations (in seconds)
 * @returns {number} Median duration (rounded to nearest integer)
 */
function calculateMedian(numbers) {
  if (!Array.isArray(numbers) || numbers.length === 0) {
    return 0;
  }

  // Sort numbers in ascending order
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 !== 0) {
    // Odd number of elements: middle element
    return Math.round(sorted[mid]);
  } else {
    // Even number of elements: average of the two middle elements
    return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  }
}

/**
 * Computes estimated wait time in minutes and formatted string.
 *
 * Formula:
 * ETA = (people ahead of user) * (median service duration in seconds)
 * If someone is currently CALLED, we estimate a fraction of their remaining service time.
 *
 * @param {number} peopleAhead - Number of waiting students ahead of this student
 * @param {number} medianServiceSeconds - Median service duration in seconds
 * @param {boolean} isCurrentlyServing - Whether a student is currently being served
 * @returns {{ etaSeconds: number, etaMinutes: number, formattedETA: string }}
 */
function calculateETA(peopleAhead, medianServiceSeconds, isCurrentlyServing = false) {
  const safeMedian = medianServiceSeconds > 0 ? medianServiceSeconds : 300; // default 5 mins (300s)

  // Basic ETA model: Number of people ahead * median service duration
  // If a student is currently in CALLED state, add half of median service duration as remaining time
  const currentServingBuffer = isCurrentlyServing ? Math.round(safeMedian * 0.5) : 0;
  const etaSeconds = (Math.max(0, peopleAhead) * safeMedian) + currentServingBuffer;
  const etaMinutes = Math.ceil(etaSeconds / 60);

  let formattedETA = '';
  if (peopleAhead === 0 && !isCurrentlyServing) {
    formattedETA = 'Next in line! (Under 1 min)';
  } else if (etaMinutes < 1) {
    formattedETA = '< 1 min';
  } else if (etaMinutes === 1) {
    formattedETA = '~1 min';
  } else {
    formattedETA = `~${etaMinutes} mins`;
  }

  return {
    etaSeconds,
    etaMinutes,
    formattedETA,
  };
}

module.exports = {
  calculateMedian,
  calculateETA,
};
