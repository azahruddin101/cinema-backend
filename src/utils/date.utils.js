/**
 * Date utility functions for MIS scraping.
 *
 * The MIS system uses an EXCLUSIVE end date, meaning:
 *   From = 01/01/2025, To = 02/01/2025  →  returns Jan 1 data only.
 *
 * All internal dates use YYYY-MM-DD format.
 * MIS API dates use DD-MMM-YYYY format.
 */

/**
 * Format a Date object to YYYY-MM-DD string.
 * @param {Date} date
 * @returns {string}
 */
export function formatDateISO(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Format a Date object to DD-MMM-YYYY string (MIS API format).
 * @param {Date} date
 * @returns {string}
 */
export function formatDateMIS(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

/**
 * Parse a YYYY-MM-DD string into a Date object.
 * @param {string} dateStr - Date in YYYY-MM-DD format.
 * @returns {Date}
 */
export function parseDateISO(dateStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
}

/**
 * Add N days to a date and return a new Date.
 * @param {Date} date
 * @param {number} days
 * @returns {Date}
 */
export function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

/**
 * Get yesterday's date.
 * @returns {Date}
 */
export function getYesterday() {
    return addDays(new Date(), -1);
}

/**
 * For a given target date, compute the MIS-compatible FROM / TO range.
 * Because MIS uses an exclusive end date:
 *   FROM = targetDate
 *   TO   = targetDate + 1
 *
 * @param {string} dateStr - Date in YYYY-MM-DD format.
 * @returns {{ from: string, to: string }} - Both in DD-MMM-YYYY (MIS format).
 */
export function getMISDateRange(dateStr) {
    const date = parseDateISO(dateStr);
    const nextDate = addDays(date, 1);

    return {
        from: formatDateMIS(date),
        to: formatDateMIS(nextDate),
    };
}

/**
 * Generate an array of YYYY-MM-DD date strings between startDate and endDate (inclusive).
 * @param {string} startStr - Start date YYYY-MM-DD.
 * @param {string} endStr   - End date YYYY-MM-DD.
 * @returns {string[]}
 */
export function getDateRange(startStr, endStr) {
    const dates = [];
    let current = parseDateISO(startStr);
    const end = parseDateISO(endStr);

    while (current <= end) {
        dates.push(formatDateISO(current));
        current = addDays(current, 1);
    }

    return dates;
}

/**
 * Validate a YYYY-MM-DD date string.
 * @param {string} dateStr
 * @returns {boolean}
 */
export function isValidDate(dateStr) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
    const date = parseDateISO(dateStr);
    return !isNaN(date.getTime()) && formatDateISO(date) === dateStr;
}

/**
 * Sleep utility for delays between scraper requests.
 * @param {number} ms - Milliseconds to wait.
 * @returns {Promise<void>}
 */
export function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
