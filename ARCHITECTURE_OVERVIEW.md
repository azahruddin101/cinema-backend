# Cinema MIS Backend: Architecture & Technology Stack

This document provides a comprehensive overview of the backend architecture, the purpose of each package, and the implementation details of the AI and search components.

## 🏗 System Architecture

The project follows a modular architecture organized by domain logic within the `src/modules` directory.

### Key Modules:
- **Scraper**: Fetches and parses MIS data from external sources.
- **Analytics**: Performs numerical analysis and generates qualitative insights using AI.
- **Chatbot**: A RAG-powered assistant that answers business questions based on historical reports.
- **Reports**: Generates downloadable PDF and Excel exports.
- **Auth**: Manages user authentication and session security.
- **Dashboard**: Provides aggregated data for the frontend visualizations.

---

## 📦 Package Breakdown

| Package Category | Package Name | Purpose |
| :--- | :--- | :--- |
| **Core** | `express`, `cors`, `helmet` | Web server framework and security middleware. |
| **Database** | `mongoose` | MongoDB object modeling for reports, users, and chat sessions. |
| **Vector DB** | `@qdrant/js-client-rest`, `@langchain/qdrant` | Client for Qdrant, used for semantic search and RAG. |
| **AI / LLM** | `langchain`, `@langchain/openai`, `openai` | Framework for building LLM applications and direct OpenAI API access. |
| **Machine Learning** | `@tensorflow/tfjs` | Numerical analysis and trend calculation (e.g., day efficiency). |
| **NLP** | `@xenova/transformers` | Local sentiment analysis for movie audience reactions. |
| **Scraping** | `axios`, `cheerio` | HTTP client and HTML parsing for MIS data extraction. |
| **Reporting** | `exceljs`, `pdfkit`, `pdfkit-table` | Generation of professional Excel and PDF reports. |
| **Visualization** | `quickchart-js` | Server-side chart generation for exported reports. |
| **Automation** | `node-cron` | Scheduling daily scraping and data indexing tasks. |
| **Documentation** | `swagger-ui-express`, `swagger-jsdoc` | Interactive API documentation (OpenAPI). |

---

## 🤖 AI & Search Implementation

### Qdrant Vector Database
**Qdrant** is used as the primary engine for semantic retrieval.
- **Location**: `src/modules/chatbot/chatbot.service.js`
- **Purpose**: It stores vector embeddings of daily reports, monthly summaries, and performance trends.
- **Workflow**: 
  1. Reports are fetched from MongoDB.
  2. Text summaries are generated for each report.
  3. OpenAI's `text-embedding-3-small` (via LangChain) converts text into vectors.
  4. Vectors are stored in Qdrant collections.

### LangChain Integration
**LangChain** acts as the orchestrator for the Chatbot's RAG (Retrieval-Augmented Generation) pipeline.
- **Location**: `src/modules/chatbot/chatbot.service.js`
- **Key Features Used**:
    - **Vector Store**: `QdrantVectorStore` for connecting to the indexed data.
    - **Chains**: `createRetrievalChain` and `createStuffDocumentsChain` to combine retrieved data with the LLM prompt.
    - **Memory**: Managed via `MessagesPlaceholder` to maintain context across multi-turn conversations.
    - **Prompt Engineering**: Uses `ChatPromptTemplate` to enforce strict business intelligence personas and formatted HTML outputs.

### Analytics & Machine Learning
- **TensorFlow.js**: Used in `analytics.service.js` to process large arrays of occupancy data into daily averages using tensor operations for efficiency.
- **Transformers.js**: Runs a local `sentiment-analysis` pipeline to gauge movie popularity without hitting external APIs for every movie.
- **OpenAI (Analytics)**: GPT-4 is used to synthesize numerical data (from TensorFlow) and metadata (from TMDB) into "Executive Summaries" and "Strategic Advice."

---

## 🔄 Data Flow: Scraper to Chatbot

1. **Scrape**: `scraper.cron.js` runs periodically, fetching raw data.
2. **Store**: Parsed data is saved into **MongoDB** as `Report` documents.
3. **Index**: `chatbot.cron.js` triggers the `ChatbotService` to re-index recent reports into **Qdrant**.
4. **Query**: A user asks a question (e.g., "How did we do last Sunday?").
5. **Retrieve**: LangChain searches Qdrant for relevant reports from that period.
6. **Generate**: OpenAI processes the retrieved reports and generates a professional HTML response.
