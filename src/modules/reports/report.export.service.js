import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit-table';

import QuickChart from 'quickchart-js';
import reportService from './report.service.js';

class ReportExportService {
    async getReportData(startDate, endDate) {
        const summary = await reportService.getSummary(startDate, endDate);
        const filmPerformance = await reportService.getFilmPerformance(startDate, endDate);
        const screenPerformance = await reportService.getScreenPerformance(startDate, endDate);
        const concessionPerformance = await reportService.getConcessionPerformance(startDate, endDate);
        const trends = await reportService.getTrends(startDate, endDate);

        return { summary, filmPerformance, screenPerformance, concessionPerformance, trends };
    }

    async generateChartImage(chartConfig) {
        const chart = new QuickChart();
        chart.setConfig(chartConfig);
        chart.setWidth(600);
        chart.setHeight(300);
        chart.setFormat('png');
        chart.setBackgroundColor('white');
        return await chart.toBinary(); // Returns a Buffer
    }

    async prepareCharts(data) {
        const { trends, filmPerformance } = data;

        // 1. Revenue Trends Chart
        const trendsChartConfig = {
            type: 'line',
            data: {
                labels: trends.trends.map(t => t.date),
                datasets: [{
                    label: 'Total Revenue',
                    data: trends.trends.map(t => t.revenue),
                    fill: false,
                    borderColor: '#3b82f6',
                    tension: 0.1
                }]
            },
            options: {
                title: { display: true, text: 'Daily Revenue Trends' }
            }
        };

        // 2. Top 5 Films Chart
        const topFilms = filmPerformance.films.slice(0, 5);
        const filmsChartConfig = {
            type: 'bar',
            data: {
                labels: topFilms.map(f => (f.film.length > 20 ? f.film.substring(0, 20) + '...' : f.film)),
                datasets: [{
                    label: 'Box Office Gross',
                    data: topFilms.map(f => f.totalGross),
                    backgroundColor: '#10b981'
                }]
            },
            options: {
                title: { display: true, text: 'Top 5 Films by Gross Revenue' }
            }
        };

        const [trendsImageBuffer, filmsImageBuffer] = await Promise.all([
            this.generateChartImage(trendsChartConfig),
            this.generateChartImage(filmsChartConfig)
        ]);

        return { trendsImageBuffer, filmsImageBuffer };
    }

    // ==========================================
    // EXPORT TO EXCEL
    // ==========================================
    async exportExcel(startDate, endDate) {
        const data = await this.getReportData(startDate, endDate);
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Cinema MIS';

        // --- Sheet 1: Summary ---
        const summarySheet = workbook.addWorksheet('Summary');
        summarySheet.columns = [
            { header: 'Metric', key: 'metric', width: 30 },
            { header: 'Value', key: 'value', width: 20 }
        ];
        summarySheet.addRows([
            { metric: 'Period Start', value: data.summary.period.startDate },
            { metric: 'Period End', value: data.summary.period.endDate },
            { metric: 'Total Days', value: data.summary.totalDays },
            { metric: 'Total Shows', value: data.summary.totalShows },
            { metric: 'Total Tickets Sold', value: data.summary.totalTickets },
            { metric: 'Total Box Office', value: data.summary.totalBoxOffice },
            { metric: 'Total Concessions', value: data.summary.totalConcessions },
            { metric: 'Total Revenue', value: data.summary.totalRevenue },
            { metric: 'Average Occupancy (%)', value: data.summary.averageOccupancy },
        ]);
        summarySheet.getRow(1).font = { bold: true };

        // --- Sheet 2: Film Performance ---
        const filmSheet = workbook.addWorksheet('Films');
        filmSheet.columns = [
            { header: 'Film Name', key: 'film', width: 40 },
            { header: 'Shows', key: 'totalShows', width: 15 },
            { header: 'Tickets Sold', key: 'totalSold', width: 15 },
            { header: 'Avg Occupancy (%)', key: 'avgOccupancy', width: 20 },
            { header: 'Total Gross', key: 'totalGross', width: 20 },
            { header: 'Total Net', key: 'totalNet', width: 20 },
            { header: 'Days Active', key: 'daysActive', width: 15 }
        ];
        filmSheet.getRow(1).font = { bold: true };
        data.filmPerformance.films.forEach(f => filmSheet.addRow(f));

        // --- Sheet 3: Screen Performance ---
        const screenSheet = workbook.addWorksheet('Screens');
        screenSheet.columns = [
            { header: 'Screen', key: 'screen', width: 30 },
            { header: 'Shows', key: 'totalShows', width: 15 },
            { header: 'Tickets Sold', key: 'totalSold', width: 15 },
            { header: 'Total Gross', key: 'totalGross', width: 20 },
            { header: 'Total Net', key: 'totalNet', width: 20 }
        ];
        screenSheet.getRow(1).font = { bold: true };
        data.screenPerformance.screens.forEach(s => screenSheet.addRow(s));

        // --- Sheet 4: Concession Performance ---
        const concSheet = workbook.addWorksheet('Concessions');
        concSheet.columns = [
            { header: 'Item / Category', key: 'itemClass', width: 30 },
            { header: 'Transaction Count', key: 'totalTransCount', width: 20 },
            { header: 'Quantity Sold', key: 'totalQtySold', width: 15 },
            { header: 'Sale Value', key: 'totalSaleValue', width: 20 }
        ];
        concSheet.getRow(1).font = { bold: true };
        data.concessionPerformance.concessions.forEach(c => concSheet.addRow(c));

        // --- Sheet 5: Daily Trends ---
        const trendsSheet = workbook.addWorksheet('Daily Trends');
        trendsSheet.columns = [
            { header: 'Date', key: 'date', width: 20 },
            { header: 'Tickets Sold', key: 'tickets', width: 15 },
            { header: 'Shows', key: 'shows', width: 15 },
            { header: 'Box Office', key: 'boxOffice', width: 20 },
            { header: 'Concessions', key: 'concessions', width: 20 },
            { header: 'Total Revenue', key: 'revenue', width: 20 },
            { header: 'Avg Occupancy (%)', key: 'avgOccupancy', width: 20 }
        ];
        trendsSheet.getRow(1).font = { bold: true };
        data.trends.trends.forEach(t => trendsSheet.addRow(t));

        // --- Sheet 6: Charts ---
        const charts = await this.prepareCharts(data);
        const chartsSheet = workbook.addWorksheet('Charts');

        const trendsImageId = workbook.addImage({
            buffer: charts.trendsImageBuffer,
            extension: 'png',
        });
        const filmsImageId = workbook.addImage({
            buffer: charts.filmsImageBuffer,
            extension: 'png',
        });

        chartsSheet.addImage(trendsImageId, 'A1:H15');
        chartsSheet.addImage(filmsImageId, 'A17:H31');

        return await workbook.xlsx.writeBuffer();
    }

    // ==========================================
    // EXPORT TO PDF
    // ==========================================
    async exportPdf(startDate, endDate) {
        const data = await this.getReportData(startDate, endDate);
        const charts = await this.prepareCharts(data);

        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ margin: 30, size: 'A4' });
            const buffers = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);

            // Title
            doc.fontSize(20).text('Cinema MIS Report', { align: 'center' });
            doc.fontSize(12).text(`Period: ${data.summary.period.startDate} to ${data.summary.period.endDate}`, { align: 'center' });
            doc.moveDown();

            // Summary Info
            doc.fontSize(16).text('Executive Summary').moveDown(0.5);
            doc.fontSize(12);
            doc.text(`Total Days: ${data.summary.totalDays}`);
            doc.text(`Total Shows: ${data.summary.totalShows}`);
            doc.text(`Total Tickets Sold: ${data.summary.totalTickets}`);
            doc.text(`Total Box Office: $${data.summary.totalBoxOffice}`);
            doc.text(`Total Concessions: $${data.summary.totalConcessions}`);
            doc.text(`Total Revenue: $${data.summary.totalRevenue}`);
            doc.text(`Avg Occupancy: ${data.summary.averageOccupancy}%`);
            doc.moveDown(2);

            // Charts
            doc.fontSize(16).text('Performance Charts').moveDown(0.5);
            doc.image(charts.trendsImageBuffer, { width: 500 });
            doc.moveDown(1);
            doc.image(charts.filmsImageBuffer, { width: 500 });

            doc.addPage();

            // Top Films Table
            doc.fontSize(16).text('Top 10 Films').moveDown(0.5);
            const top10Films = data.filmPerformance.films.slice(0, 10);
            const filmsTable = {
                headers: ['Film Name', 'Shows', 'Tickets', 'Avg Occ %', 'Gross Rev'],
                rows: top10Films.map(f => [
                    f.film.substring(0, 30),
                    f.totalShows.toString(),
                    f.totalSold.toString(),
                    f.avgOccupancy.toString() + '%',
                    f.totalGross.toString()
                ])
            };
            doc.table(filmsTable, { width: 500 });

            doc.addPage();

            // Concessions
            doc.fontSize(16).text('Top Concessions').moveDown(0.5);
            const topConcessions = data.concessionPerformance.concessions.slice(0, 10);
            const concTable = {
                headers: ['Item/Category', 'Txn Count', 'Qty Sold', 'Value'],
                rows: topConcessions.map(c => [
                    c.itemClass,
                    c.totalTransCount.toString(),
                    c.totalQtySold.toString(),
                    c.totalSaleValue.toString()
                ])
            };
            doc.table(concTable, { width: 500 });

            // Screens
            doc.moveDown(2);
            doc.fontSize(16).text('Screen Performance').moveDown(0.5);
            const screensTable = {
                headers: ['Screen', 'Shows', 'Tickets', 'Gross Rev'],
                rows: data.screenPerformance.screens.map(s => [
                    s.screen,
                    s.totalShows.toString(),
                    s.totalSold.toString(),
                    s.totalGross.toString()
                ])
            };
            doc.table(screensTable, { width: 500 });

            doc.end();
        });
    }


}

export default new ReportExportService();
