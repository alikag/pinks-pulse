/**
 * Utility functions for calculating business days
 */

/**
 * Count the number of business days (Monday-Friday) in the last N days
 * @param days Number of calendar days to look back
 * @param fromDate Optional date to calculate from (defaults to today)
 * @returns Number of business days
 */
export function countBusinessDaysInPeriod(days: number, fromDate: Date = new Date()): number {
  let businessDays = 0;
  const date = new Date(fromDate);
  
  for (let i = 0; i < days; i++) {
    const dayOfWeek = date.getDay();
    // Count if it's Monday (1) through Friday (5)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      businessDays++;
    }
    // Move to previous day
    date.setDate(date.getDate() - 1);
  }
  
  return businessDays;
}

/**
 * Calculate the number of business days in the last 30 calendar days
 * @param fromDate Optional date to calculate from (defaults to today)
 * @returns Number of business days
 */
export function getBusinessDaysInLast30Days(fromDate: Date = new Date()): number {
  return countBusinessDaysInPeriod(30, fromDate);
}