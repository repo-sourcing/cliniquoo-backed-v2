const moment = require("moment");

/**
 * Fill date gaps in daily revenue data with zero values
 * @param {array} data
 * @param {string} from - ISO date
 * @param {string} to - ISO date
 * @param {string} dateField
 * @returns {array} filled data
 */
function fillDateGaps(data, from, to, dateField = "date") {
  const filled = [];
  const startDate = moment(from).startOf("day");
  const endDate = moment(to).startOf("day");
  const dataMap = {};

  data.forEach((item) => {
    const key = moment(item[dateField]).format("YYYY-MM-DD");
    dataMap[key] = item;
  });

  let currentDate = startDate.clone();
  while (currentDate.isSameOrBefore(endDate)) {
    const key = currentDate.format("YYYY-MM-DD");
    filled.push(
      dataMap[key] || {
        [dateField]: key,
        total: 0,
        cash: 0,
        online: 0,
        count: 0,
      }
    );
    currentDate.add(1, "day");
  }

  return filled;
}

/**
 * Format currency amount
 * @param {number} amount
 * @returns {number} rounded to 2 decimals
 */
function formatCurrency(amount) {
  return Math.round(amount * 100) / 100;
}

/**
 * Calculate percentage
 * @param {number} part
 * @param {number} total
 * @returns {number} percentage (0-100)
 */
function calculatePercentage(part, total) {
  if (total === 0) return 0;
  return Math.round((part / total) * 10000) / 100;
}

/**
 * Validate date range is not too large
 * @param {string} from - ISO date
 * @param {string} to - ISO date
 * @param {number} maxDays - max allowed days
 * @returns {boolean}
 */
function validateDateRange(from, to, maxDays = 365) {
  const start = moment(from);
  const end = moment(to);
  const daysDiff = end.diff(start, "days");
  return daysDiff >= 0 && daysDiff <= maxDays;
}

/**
 * Get date range for current month
 * @returns {object} { from, to }
 */
function getCurrentMonthRange() {
  const now = moment();
  return {
    from: now.clone().startOf("month").format("YYYY-MM-DD"),
    to: now.clone().endOf("month").format("YYYY-MM-DD"),
  };
}

/**
 * Get date range for current year
 * @returns {object} { from, to }
 */
function getCurrentYearRange() {
  const now = moment();
  return {
    from: now.clone().startOf("year").format("YYYY-MM-DD"),
    to: now.clone().endOf("year").format("YYYY-MM-DD"),
  };
}

module.exports = {
  fillDateGaps,
  formatCurrency,
  calculatePercentage,
  validateDateRange,
  getCurrentMonthRange,
  getCurrentYearRange,
};
