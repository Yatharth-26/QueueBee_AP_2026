// Intelligent Median-Based ETA Algorithm Unit Tests
// Course: Advanced Programming (AP) · B.Tech 2nd Year
// Smart Queue (QueueBee)

const { calculateMedian, calculateETA } = require('../src/utils/math.util');

describe('Intelligent Median & ETA Calculation Unit Tests', () => {
  test('calculateMedian - Accurately calculates median for odd length array', () => {
    // Specification Example: [2, 3, 4, 5, 20] minutes = [120, 180, 240, 300, 1200] seconds
    const sampleSeconds = [120, 180, 240, 300, 1200];
    const median = calculateMedian(sampleSeconds);

    // Median is 240 seconds (4 minutes)
    // Contrast with mean: (120+180+240+300+1200)/5 = 408s (6.8 minutes)
    expect(median).toBe(240);
  });

  test('calculateMedian - Accurately calculates median for even length array', () => {
    const sampleSeconds = [120, 180, 240, 360];
    // Median is average of 180 and 240 = 210 seconds
    const median = calculateMedian(sampleSeconds);
    expect(median).toBe(210);
  });

  test('calculateMedian - Resists extreme outliers (counter left open overnight)', () => {
    // Normal services ~ 3 minutes (180s), outlier = 7200s (2 hours)
    const samples = [170, 180, 185, 190, 7200];
    const median = calculateMedian(samples);

    // Median remains unaffected by the 2-hour anomaly
    expect(median).toBe(185);
  });

  test('calculateMedian - Handles empty or invalid input gracefully', () => {
    expect(calculateMedian([])).toBe(0);
    expect(calculateMedian(null)).toBe(0);
  });

  test('calculateETA - Calculates waiting time for student with 3 people ahead', () => {
    const peopleAhead = 3;
    const medianServiceSeconds = 240; // 4 mins
    const eta = calculateETA(peopleAhead, medianServiceSeconds, false);

    // 3 * 240s = 720s (12 mins)
    expect(eta.etaSeconds).toBe(720);
    expect(eta.etaMinutes).toBe(12);
    expect(eta.formattedETA).toBe('~12 mins');
  });

  test('calculateETA - Accounts for currently serving student buffer', () => {
    const peopleAhead = 1;
    const medianServiceSeconds = 240;
    // When someone is being served, add half median (120s) as buffer
    const eta = calculateETA(peopleAhead, medianServiceSeconds, true);

    // 1 * 240s + 120s = 360s (6 mins)
    expect(eta.etaSeconds).toBe(360);
    expect(eta.etaMinutes).toBe(6);
    expect(eta.formattedETA).toBe('~6 mins');
  });

  test('calculateETA - Formats next in line clearly when 0 people ahead', () => {
    const eta = calculateETA(0, 240, false);
    expect(eta.formattedETA).toBe('Next in line! (Under 1 min)');
  });
});
