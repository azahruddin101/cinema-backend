import { OpenAIEmbeddings, ChatOpenAI } from "@langchain/openai";
import { QdrantVectorStore } from "@langchain/qdrant";
import { QdrantClient } from "@qdrant/js-client-rest";
import { createRetrievalChain } from "@langchain/classic/chains/retrieval";
import { createStuffDocumentsChain } from "@langchain/classic/chains/combine_documents";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { Document } from "@langchain/core/documents";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import Report from "../../models/report.model.js";
import ChatbotSession from "../../models/chatbot-session.model.js";
import { LUCKNOW_2026_CONTEXT } from "../../utils/lucknow.context.js";

class ChatbotService {
    constructor() {
        this.vectorStore = null;
        this.embeddings = null;
        this.model = null;
    }

    _ensureInitialized() {
        if (!this.embeddings) {
            this.embeddings = new OpenAIEmbeddings({
                apiKey: process.env.OPENAI_API_KEY,
            });
        }
        if (!this.model) {
            this.model = new ChatOpenAI({
                apiKey: process.env.OPENAI_API_KEY,
                modelName: "gpt-4o",
                temperature: 0,
            });
        }
    }

    _getQdrantConfig() {
        const collectionName = process.env.QDRANT_COLLECTION_NAME || "cinema_reports";
        const rawUrl = (process.env.QDRANT_URL || "").trim();
        const isProduction = process.env.NODE_ENV === "production";
        const fallbackLocalUrl = "http://localhost:6333";

        const url = rawUrl || (isProduction ? null : fallbackLocalUrl);

        if (!url) {
            throw new Error(
                "QDRANT_URL is missing in production. Set it to your Qdrant Cloud endpoint (https://<cluster>.<region>.cloud.qdrant.io[:6333])."
            );
        }

        if (isProduction && /(localhost|127\.0\.0\.1)/i.test(url)) {
            throw new Error(
                `QDRANT_URL points to localhost in production (${url}). Use your Qdrant Cloud endpoint instead.`
            );
        }

        return {
            url: url.replace(/\/+$/, ""),
            apiKey: process.env.QDRANT_API_KEY,
            collectionName,
        };
    }

    _formatQdrantError(error) {
        const causeMessage = error?.cause?.message || error?.message || "Unknown network error";
        return `Qdrant connection failed: ${causeMessage}. Check QDRANT_URL, QDRANT_API_KEY, and outbound network access from this server.`;
    }

    /**
     * Initialize the vector store by loading all reports and generating summaries
     */
    async initializeVectorStore() {
        try {
            this._ensureInitialized();
            console.log("Initializing Chatbot Qdrant Vector Store...");
            const qdrantConfig = this._getQdrantConfig();

            // 1. CLEAR existing collection to avoid duplicates/stale data
            const client = new QdrantClient({
                url: qdrantConfig.url,
                apiKey: qdrantConfig.apiKey
            });
            const collectionName = qdrantConfig.collectionName;

            try {
                await client.deleteCollection(collectionName);
                console.log(`Cleared existing Qdrant collection: ${collectionName}`);
            } catch (e) {
                console.log("Collection did not exist or could not be cleared, proceeding...");
            }

            const MIN_DATE = "2025-01-01";
            const reports = await Report.find({ date: { $gte: MIN_DATE } }).sort({ date: 1 });

            if (!reports || reports.length === 0) {
                console.warn("No reports found to index.");
                return;
            }

            const documents = [];

            // 1. Index Daily Reports
            reports.forEach((report) => {
                const content = this._formatReportToText(report);
                documents.push(new Document({
                    pageContent: content,
                    metadata: {
                        date: report.date,
                        id: report._id.toString(),
                        type: "daily_report",
                    },
                }));
            });

            // 2. Index Monthly Summaries
            const monthlyDocuments = this._generateMonthlySummaries(reports);
            documents.push(...monthlyDocuments);

            // 3. Specifically Index the "LATEST 7 DAYS"
            const latestReports = reports.slice(-7);
            if (latestReports.length > 0) {
                const latestContent = this._generateLatestSummary(latestReports);
                documents.push(new Document({
                    pageContent: latestContent,
                    metadata: { type: "latest_performance_summary" }
                }));
            }

            // Use Qdrant for persistent and robust storage
            this.vectorStore = await QdrantVectorStore.fromDocuments(
                documents,
                this.embeddings,
                {
                    url: qdrantConfig.url,
                    apiKey: qdrantConfig.apiKey,
                    collectionName: qdrantConfig.collectionName,
                }
            );

            console.log(`Successfully indexed ${documents.length} document(s) into Qdrant collection.`);
        } catch (error) {
            const message = this._formatQdrantError(error);
            console.error("Failed to initialize Qdrant vector store:", message);
            throw new Error(message);
        }
    }

    /**
     * Incrementally index a single report into existing Qdrant collection
     */
    async indexSingleReport(report) {
        if (report.date < "2025-01-01") {
            console.log(`⏭️  Skipping incremental indexing for ${report.date} (older than 2025-01-01)`);
            return;
        }
        try {
            this._ensureInitialized();
            const qdrantConfig = this._getQdrantConfig();

            // Connect to existing store
            if (!this.vectorStore) {
                this.vectorStore = await QdrantVectorStore.fromExistingCollection(
                    this.embeddings,
                    {
                        url: qdrantConfig.url,
                        apiKey: qdrantConfig.apiKey,
                        collectionName: qdrantConfig.collectionName,
                    }
                );
            }

            const content = this._formatReportToText(report);
            const doc = new Document({
                pageContent: content,
                metadata: {
                    date: report.date,
                    id: report._id.toString(),
                    type: "daily_report",
                },
            });

            await this.vectorStore.addDocuments([doc]);
            console.log(`Successfully indexed report for ${report.date} into Qdrant.`);

            // Note: We don't update monthly summaries incrementally here 
            // as that would require recalculating the whole month.
            // The daily 6AM cron handles the full synchronization including summaries.
        } catch (error) {
            console.error(`Failed to incremental index report for ${report.date}:`, error.message);
        }
    }

    /**
     * Helper to generate a summary for the most recent records
     */
    _generateLatestSummary(reports) {
        let totalGross = 0;
        let totalTickets = 0;
        const startDate = reports[0].date;
        const endDate = reports[reports.length - 1].date;

        reports.forEach(r => {
            totalGross += r.totals.grossAmount || 0;
            totalTickets += r.totals.ticketsSold || 0;
        });

        // Find best film in this period
        const filmStats = {};
        reports.forEach(r => {
            r.films.forEach(f => {
                if (!filmStats[f.film]) filmStats[f.film] = { gross: 0, tickets: 0 };
                filmStats[f.film].gross += f.grossAmount || 0;
                filmStats[f.film].tickets += f.ticketsSold || 0;
            });
        });

        const topFilm = Object.entries(filmStats).sort((a, b) => b[1].gross - a[1].gross)[0];

        let content = `CURRENT PERFORMANCE SUMMARY (MOST RECENT DATA)\n`;
        content += `Period: ${startDate} to ${endDate}\n`;
        content += `Total Gross for this period: ₹${totalGross.toFixed(2)}\n`;
        content += `Total Tickets for this period: ${totalTickets}\n`;
        if (topFilm) {
            content += `Top Performing Film for this period: ${topFilm[0]} (Gross: ₹${topFilm[1].gross.toFixed(2)}, Tickets: ${topFilm[1].tickets})\n`;
        }
        content += `THIS IS THE MOST RECENT DATA AVAILABLE. USE THIS FOR "THIS WEEK" OR "CURRENT TRENDS" QUESTIONS.\n`;

        return content;
    }

    /**
     * Helper to group reports by month and create summary documents
     */
    _generateMonthlySummaries(reports) {
        const months = {};

        reports.forEach(r => {
            const monthKey = r.date.substring(0, 7); // "YYYY-MM"
            if (!months[monthKey]) {
                months[monthKey] = {
                    gross: 0,
                    net: 0,
                    tickets: 0,
                    shows: 0,
                    days: 0,
                    films: {},
                    concessions: {},
                    screens: {}
                };
            }
            months[monthKey].gross += r.totals.grossAmount || 0;
            months[monthKey].net += r.totals.netAmount || 0;
            months[monthKey].tickets += r.totals.ticketsSold || 0;
            months[monthKey].shows += r.totals.shows || 0;
            months[monthKey].days += 1;

            if (r.films) {
                r.films.forEach(f => {
                    if (!months[monthKey].films[f.film]) {
                        months[monthKey].films[f.film] = { tickets: 0, gross: 0 };
                    }
                    months[monthKey].films[f.film].tickets += f.ticketsSold || 0;
                    months[monthKey].films[f.film].gross += f.grossAmount || 0;
                });
            }

            if (r.concessions) {
                r.concessions.forEach(c => {
                    if (!months[monthKey].concessions[c.itemClass]) {
                        months[monthKey].concessions[c.itemClass] = { qty: 0, revenue: 0 };
                    }
                    months[monthKey].concessions[c.itemClass].qty += c.qtySold || 0;
                    months[monthKey].concessions[c.itemClass].revenue += c.saleValue || 0;
                });
            }

            if (r.screens) {
                r.screens.forEach(s => {
                    if (!months[monthKey].screens[s.screen]) {
                        months[monthKey].screens[s.screen] = { tickets: 0, gross: 0 };
                    }
                    months[monthKey].screens[s.screen].tickets += s.ticketsSold || 0;
                    months[monthKey].screens[s.screen].gross += s.grossAmount || 0;
                });
            }
        });

        return Object.entries(months).map(([month, data]) => {
            let content = `### Monthly Performance Summary for ${month}\n`;
            content += `Total Gross Revenue: ₹${data.gross.toFixed(2)}\n`;
            content += `Total Net Revenue: ₹${data.net.toFixed(2)}\n`;
            content += `Total Tickets Sold: ${data.tickets}\n`;
            content += `Total Shows: ${data.shows}\n`;
            content += `Full Data Available for: ${data.days} days in this month.\n\n`;

            content += `#### Film Performance (${month}):\n`;
            const sortedFilms = Object.entries(data.films)
                .sort((a, b) => b[1].gross - a[1].gross)
                .slice(0, 10);
            sortedFilms.forEach(([name, stats]) => {
                content += `- ${name}: ₹${stats.gross.toFixed(2)} (${stats.tickets} tickets)\n`;
            });

            content += `\n#### Concession Performance (${month}):\n`;
            const sortedConcessions = Object.entries(data.concessions)
                .sort((a, b) => b[1].revenue - a[1].revenue);
            sortedConcessions.forEach(([item, stats]) => {
                content += `- ${item}: ₹${stats.revenue.toFixed(2)} (${stats.qty} sold)\n`;
            });

            content += `\n#### Screen Performance (${month}):\n`;
            Object.entries(data.screens).forEach(([screen, stats]) => {
                content += `- ${screen}: ₹${stats.gross.toFixed(2)} (${stats.tickets} tickets)\n`;
            });

            return new Document({
                pageContent: content,
                metadata: { month, type: "monthly_summary" }
            });
        });
    }

    /**
     * Helper to convert a report document into a searchable text summary
     */
    _formatReportToText(report) {
        const { date, films, totals, screens, concessions } = report;
        const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });

        let text = `Report Date: ${date} (${dayOfWeek})\n`;
        text += `Summary Totals: Shows: ${totals.shows}, Tickets Sold: ${totals.ticketsSold}, Gross Amount: ₹${totals.grossAmount}, Net Amount: ₹${totals.netAmount}, Average Occupancy: ${totals.avgOccupancy}%\n`;

        if (films && films.length > 0) {
            text += "Film Performance:\n";
            films.forEach((f) => {
                text += `- ${f.film}: Shows: ${f.shows}, Tickets: ${f.ticketsSold}, Gross: ₹${f.grossAmount}, Occupancy: ${f.occupancyPercent}%\n`;
            });
        }

        if (screens && screens.length > 0) {
            text += "Screen Performance:\n";
            screens.forEach((s) => {
                text += `- Screen ${s.screen}: Shows: ${s.shows}, Tickets: ${s.ticketsSold}, Gross: ₹${s.grossAmount}\n`;
            });
        }

        if (concessions && concessions.length > 0) {
            text += "Concessions Sales:\n";
            concessions.forEach((c) => {
                text += `- ${c.itemClass}: Quantity Sold: ${c.qtySold}, Sale Value: ₹${c.saleValue}\n`;
            });
        }

        return text;
    }

    /**
     * Get all chat sessions for a user
     */
    async getSessions(userId) {
        return ChatbotSession.find({ userId }).sort({ "metadata.lastActivity": -1 });
    }

    /**
     * Get history for a specific session
     */
    async getSessionMessages(sessionId) {
        const session = await ChatbotSession.findById(sessionId);
        return session ? session.messages : [];
    }

    /**
     * Delete a specific chat session
     */
    async deleteSession(sessionId, userId) {
        const session = await ChatbotSession.findOne({ _id: sessionId, userId });
        if (!session) {
            throw new Error('Session not found or unauthorized');
        }
        await ChatbotSession.findByIdAndDelete(sessionId);
        return { success: true, message: 'Session deleted successfully' };
    }

    /**
     * Delete all chat sessions for a user
     */
    async deleteAllSessions(userId) {
        const result = await ChatbotSession.deleteMany({ userId });
        return { 
            success: true, 
            message: `Deleted ${result.deletedCount} session(s) successfully`,
            deletedCount: result.deletedCount
        };
    }

    /**
     * Answer a user question using RAG and Session Memory
     */
    async ask(question, userId, sessionId = null) {
        this._ensureInitialized();
        const qdrantConfig = this._getQdrantConfig();
        // Attempt to connect to existing collection if not already connected
        if (!this.vectorStore) {
            try {
                this.vectorStore = await QdrantVectorStore.fromExistingCollection(
                    this.embeddings,
                    {
                        url: qdrantConfig.url,
                        apiKey: qdrantConfig.apiKey,
                        collectionName: qdrantConfig.collectionName,
                    }
                );
                console.log("Connected to existing Qdrant collection.");
            } catch (error) {
                console.warn(`${this._formatQdrantError(error)} Initializing from scratch...`);
                await this.initializeVectorStore();
            }
        }

        if (!this.vectorStore) {
            return { answer: "I'm sorry, I couldn't find any reports to analyze.", sessionId };
        }

        // 1. Manage/Load Session
        let session;
        let chatHistory = [];

        if (sessionId) {
            session = await ChatbotSession.findById(sessionId);
        }

        if (!session) {
            session = await ChatbotSession.create({
                userId,
                title: question.substring(0, 50) + (question.length > 50 ? "..." : ""),
                messages: []
            });
            sessionId = session._id;
        } else {
            chatHistory = session.messages.slice(-10).map(m =>
                m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content)
            );
        }

        const festivalList = LUCKNOW_2026_CONTEXT.festivals_2026
            .map(f => `- ${f.name} (${f.date || (f.start + ' to ' + f.end)}): ${f.impact}`)
            .join("\n");

        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

        // 2. DETECT SPECIFIC DATE in query for mandatory injection
        let specificDateContext = "";
        const detectedDate = this._extractDate(question);
        if (detectedDate && detectedDate >= "2025-01-01") {
            const specificReport = await Report.findOne({ date: detectedDate }).lean();
            if (specificReport) {
                specificDateContext = `### SPECIFIC DATE REFERENCE DATA (${detectedDate})\n` +
                    this._formatReportToText(specificReport) +
                    `\nUSE THIS DATA FOR ANY QUESTIONS ABOUT ${detectedDate}.\n`;
            }
        }

        const systemPrompt = `
      You are a specialized Cinema Business Intelligence Assistant for a high-end cinema hall in Lucknow, Uttar Pradesh.

      ### TEMPORAL GUIDELINES (STRICT)
      - **Today**: ${now.toDateString()}
      - **"This Week"**: Sum reports from ${sevenDaysAgo.toDateString()} to today.
      - **"Last Week"**: Sum reports from ${fourteenDaysAgo.toDateString()} to ${new Date(sevenDaysAgo.getTime() - 1).toDateString()}.
      
      ### DATA RESTRICTION
      - **CRITICAL**: ONLY refer to data from **January 1st, 2025 onwards**.
      - **DO NOT** mention, analyze, or acknowledge any data, films, or performance from before 2025-01-01.
      - If the user asks about 2024 or earlier, politely state that you only have access to data starting from Jan 1, 2025.

      ### INSTRUCTIONS
      - **Whole DB Access**: You have access to the COMPLETE database of reports via the sections below. 
      - **Data Source Priority**:
        1. If available, ALWAYS prioritize the **SPECIFIC DATE REFERENCE DATA**.
        2. For "this week" or "last week" specifically, use the **RECENT PERFORMANCE DATA**.
        3. For any other specific dates or month-wide queries, use the **HISTORICAL TRENDS & SUMMARIES** section. 
      - **"Best Selling" Definition**: When asked for "best selling" items (films or concessions), rank them by **TOTAL SALE VALUE / REVENUE**, not just quantity sold.
      - **Accuracy**: NEVER hallucinate numbers. Use exact figures from the provided text blocks.
      
      ### OUTPUT FORMAT (MANDATORY)
      - Respond ONLY with valid HTML. 
      - **DO NOT** use Markdown (No #, ##, or **).
      - Use <h3> for headings and <strong> for emphasis.
      - Use <table> for all data comparisons, financial figures, and reports.
      - **Table Styling**: Use a clean black-and-white style:
        - \`<table style="width: 100%; border-collapse: collapse; margin: 15px 0; background: #fff; color: #000; border: 1px solid #000;">\`
        - \`<th style="background: #f2f2f2; border: 1px solid #000; padding: 10px; text-align: left; font-weight: bold;">\`
        - \`<td style="border: 1px solid #000; padding: 10px; text-align: left;">\`
      - For text-only lists, use \`<ul>\` and \`<li>\`.
      - Ensure the response is concise and professional.

      ${specificDateContext}

      ### REGIONAL KNOWLEDGE
      Festivals: ${festivalList}

      ### RECENT PERFORMANCE DATA (LAST 21 DAYS)
      {latest_data}
      
      ### HISTORICAL TRENDS & SUMMARIES (FROM FULL DATABASE)
      {context}
    `;

        const prompt = ChatPromptTemplate.fromMessages([
            ["system", systemPrompt],
            new MessagesPlaceholder("chat_history"),
            ["human", "{input}"],
        ]);

        const combineDocsChain = await createStuffDocumentsChain({
            llm: this.model,
            prompt,
        });

        const retrievalChain = await createRetrievalChain({
            retriever: this.vectorStore.asRetriever({ k: 15 }), // Increased k for better historical reach
            combineDocsChain,
        });

        const latestDailyReports = await Report.find({ date: { $gte: "2025-01-01" } }).sort({ date: -1 }).limit(21).lean();
        const latestFormatted = latestDailyReports.map(r => this._formatReportToText(r)).join("\n---\n");

        const response = await retrievalChain.invoke({
            input: question,
            chat_history: chatHistory,
            latest_data: latestFormatted
        });

        // 2. Persist Messages
        session.messages.push({ role: 'user', content: question });
        session.messages.push({ role: 'assistant', content: response.answer });
        session.metadata.lastActivity = new Date();
        await session.save();

        return {
            answer: response.answer,
            sessionId: session._id,
            title: session.title
        };
    }

    _extractDate(text) {
        // Look for YYYY-MM-DD
        const isoMatch = text.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (isoMatch) return isoMatch[0];

        // Look for common formats like "2nd dec 2025" or "December 2, 2025"
        const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
        const monthPattern = months.join("|");
        const dateMatch = text.match(new RegExp(`(\\d{1,2})(?:st|nd|rd|th)?\\s+(${monthPattern})[a-z]*\\s+(\\d{4})`, "i"));
        if (dateMatch) {
            const day = dateMatch[1].padStart(2, '0');
            const monthIdx = months.indexOf(dateMatch[2].toLowerCase()) + 1;
            const month = monthIdx.toString().padStart(2, '0');
            const year = dateMatch[3];
            return `${year}-${month}-${day}`;
        }

        return null;
    }
}

export default new ChatbotService();
