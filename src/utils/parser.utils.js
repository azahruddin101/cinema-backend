import * as cheerio from 'cheerio';

/**
 * Parses both the Revenue and Patrons HTML and merges the results by Film name.
 * 
 * @param {string} revenueHtml
 * @param {string} patronsHtml
 * @returns {Array<{ film: string, shows: number, ticketsSold: number, grossAmount: number, netAmount: number, occupancyPercent: number }>}
 */
export function parseFilmsHTML(revenueHtml, patronsHtml) {
    const revenueData = parseTableData(revenueHtml, 'revenue');
    const patronsData = parseTableData(patronsHtml, 'patrons');

    const mergedFilms = {};

    // Process Revenue Table
    revenueData.forEach((row) => {
        mergedFilms[row.name] = {
            film: row.name,
            shows: row.shows,
            ticketsSold: row.sold,
            grossAmount: row.gross,
            netAmount: row.net,
            occupancyPercent: 0 // Will be filled by patrons table if available
        };
    });

    // Process Patrons Table and Merge
    patronsData.forEach((row) => {
        if (!mergedFilms[row.name]) {
            mergedFilms[row.name] = {
                film: row.name,
                shows: row.shows,
                ticketsSold: row.sold,
                grossAmount: 0,
                netAmount: 0,
                occupancyPercent: row.occupancy
            };
        } else {
            // Both exist, so let's guarantee we grab occupancy
            mergedFilms[row.name].occupancyPercent = row.occupancy;
            // Overwriting shows/tickets just in case, but they should be equal
            mergedFilms[row.name].shows = Math.max(mergedFilms[row.name].shows, row.shows);
            mergedFilms[row.name].ticketsSold = Math.max(mergedFilms[row.name].ticketsSold, row.sold);
        }
    });

    return Object.values(mergedFilms);
}

/**
 * Parses the Screens HTML table.
 */
export function parseScreensHTML(html) {
    if (!html || typeof html !== 'string') return [];

    const $ = cheerio.load(html);
    const results = [];

    $('table').each((_, table) => {
        const rows = $(table).find('tr');
        if (rows.length < 2) return;

        const headers = [];
        $(rows[0]).find('th, td').each((i, cell) => {
            headers.push($(cell).text().trim().toLowerCase());
        });

        const colMap = {
            name: findColumnIndex(headers, ['screen', 'audi', 'hall']),
            shows: findColumnIndex(headers, ['no shows', 'shows']),
            sold: findColumnIndex(headers, ['sold', 'tickets']),
            gross: findColumnIndex(headers, ['gross amount', 'gross']),
            net: findColumnIndex(headers, ['net amount', 'net']),
        };

        rows.slice(1).each((_, row) => {
            const cells = $(row).find('td');
            if (cells.length === 0) return;

            const itemName = getCellText(cells, colMap.name);
            if (!itemName) return;

            const nameLower = itemName.toLowerCase();
            if (nameLower === 'total' || nameLower.includes('grand total') || nameLower === 'totals') return;

            results.push({
                screen: itemName,
                shows: parseNumber(getCellText(cells, colMap.shows)),
                ticketsSold: parseNumber(getCellText(cells, colMap.sold)),
                grossAmount: parseFloat(parseNumber(getCellText(cells, colMap.gross)).toFixed(2)),
                netAmount: parseFloat(parseNumber(getCellText(cells, colMap.net)).toFixed(2)),
            });
        });
    });

    return results;
}

/**
 * Parses the Concessions HTML table.
 */
export function parseConcessionsHTML(html) {
    if (!html || typeof html !== 'string') return [];

    const $ = cheerio.load(html);
    const results = [];

    $('table').each((_, table) => {
        const rows = $(table).find('tr');
        if (rows.length < 2) return;

        const headers = [];
        $(rows[0]).find('th, td').each((i, cell) => {
            headers.push($(cell).text().trim().toLowerCase());
        });

        const colMap = {
            itemClass: findColumnIndex(headers, ['item class', 'item']),
            transCount: findColumnIndex(headers, ['trans count', 'transactions']),
            qtySold: findColumnIndex(headers, ['qty sold', 'quantity']),
            saleValue: findColumnIndex(headers, ['sale value', 'revenue', 'sale', 'amount']),
            percentage: findColumnIndex(headers, ['percentage', 'percent', '%']),
        };

        rows.slice(1).each((_, row) => {
            const cells = $(row).find('td');
            if (cells.length === 0) return;

            const itemName = getCellText(cells, colMap.itemClass);
            if (!itemName) return;

            const nameLower = itemName.toLowerCase();
            if (nameLower === 'total' || nameLower.includes('grand total') || nameLower === 'totals') return;

            results.push({
                itemClass: itemName,
                transCount: parseNumber(getCellText(cells, colMap.transCount)),
                qtySold: parseNumber(getCellText(cells, colMap.qtySold)),
                saleValue: parseFloat(parseNumber(getCellText(cells, colMap.saleValue)).toFixed(2)),
                percentage: parseFloat(parseNumber(getCellText(cells, colMap.percentage)).toFixed(2)),
            });
        });
    });

    return results;
}

/**
 * Generic internal table parser used for both scraping targets
 */
function parseTableData(html, type) {
    if (!html || typeof html !== 'string') return [];

    const $ = cheerio.load(html);
    const results = [];

    $('table').each((_, table) => {
        const rows = $(table).find('tr');
        if (rows.length < 2) return;

        const headers = [];
        $(rows[0]).find('th, td').each((i, cell) => {
            headers.push($(cell).text().trim().toLowerCase());
        });

        const colMap = {
            name: findColumnIndex(headers, ['film', 'movie', 'title']),
            shows: findColumnIndex(headers, ['no shows', 'shows']),
            sold: findColumnIndex(headers, ['sold', 'tickets']),
            gross: findColumnIndex(headers, ['gross amount', 'gross']),
            net: findColumnIndex(headers, ['net amount', 'net']),
            occupancy: findColumnIndex(headers, ['occup %', 'occupancy']),
        };

        rows.slice(1).each((_, row) => {
            const cells = $(row).find('td');
            if (cells.length === 0) return;

            const itemName = getCellText(cells, colMap.name);
            if (!itemName) return;

            const nameLower = itemName.toLowerCase();
            if (nameLower === 'total' || nameLower.includes('grand total') || nameLower === 'totals') return;

            const parsedRow = {
                name: itemName,
                shows: parseNumber(getCellText(cells, colMap.shows)),
                sold: parseNumber(getCellText(cells, colMap.sold)),
            };

            if (type === 'revenue') {
                parsedRow.gross = parseFloat(parseNumber(getCellText(cells, colMap.gross)).toFixed(2));
                parsedRow.net = parseFloat(parseNumber(getCellText(cells, colMap.net)).toFixed(2));
            } else if (type === 'patrons') {
                parsedRow.occupancy = parseFloat(parseNumber(getCellText(cells, colMap.occupancy)).toFixed(2));
            }

            results.push(parsedRow);
        });
    });

    return results;
}

function findColumnIndex(headers, possibleNames) {
    for (const name of possibleNames) {
        const idx = headers.findIndex((h) => h.includes(name));
        if (idx !== -1) return idx;
    }
    return -1;
}

function getCellText(cells, index) {
    if (index < 0 || index >= cells.length) return '';
    const cheerioModule = cheerio;
    return cells.eq(index).text().trim();
}

function parseNumber(str) {
    if (!str) return 0;
    const cleaned = str.replace(/[,%\s]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
}

export { parseNumber };
