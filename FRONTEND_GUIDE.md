# Cinema MIS Dashboard - Frontend Integration Guide

This guide provides a comprehensive overview of how to integrate the Cinema MIS Backend APIs into a modern React frontend. It employs industry-standard libraries for data fetching, state management, and API communication.

## Recommended Tech Stack
- **Framework:** React.js (or Next.js)
- **Data Fetching & Caching:** [@tanstack/react-query](https://tanstack.com/query/latest)
- **Global State Management:** [zustand](https://github.com/pmndrs/zustand) (for Auth)
- **HTTP Client:** [axios](https://axios-http.com/)
- **Charting:** [recharts](https://recharts.org/) or [chart.js](https://www.chartjs.org/)
- **Date Handling:** [date-fns](https://date-fns.org/) or [dayjs](https://day.js.org/)

---

## 1. Initial Setup

### API Client Setup (Axios)
Create a centralized Axios instance to handle common headers and automatic JWT token injection.

```javascript
// src/api/client.js
import axios from 'axios';
import useAuthStore from '../store/useAuthStore';

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT Token
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default apiClient;
```

---

## 2. Authentication Context (Zustand)

Zustand provides a lightweight, easily accessible global store for managing user authentication state.

```javascript
// src/store/useAuthStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import apiClient from '../api/client';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,

      login: async (email, password) => {
        const response = await apiClient.post('/auth/login', { email, password });
        const { user, accessToken } = response.data;
        set({ user, accessToken, isAuthenticated: true });
      },

      logout: async () => {
        try {
          await apiClient.post('/auth/logout');
        } catch (err) {
          console.error('Logout failed', err);
        } finally {
          set({ user: null, accessToken: null, isAuthenticated: false });
        }
      },
    }),
    {
      name: 'auth-storage', // saves to localStorage securely
    }
  )
);

export default useAuthStore;
```

---

## 3. Dashboard Data Hooks (TanStack Query)

Using `useQuery`, we can create distinct caching hooks for every performance endpoint we just built. Query keys are invalidated dynamically when date ranges change.

```javascript
// src/hooks/useDashboard.js
import { useQuery } from '@tanstack/react-query';
import apiClient from '../api/client';

/**
 * Helper to fetch data and unpack the 'data' payload from our API response wrapper
 */
const fetcher = async (url, params) => {
  const { data } = await apiClient.get(url, { params });
  return data.data; // Server wraps response in { success: true, data: [...] }
};

// 1. Dashboard Summary Hook
export const useDashboardSummary = (startDate, endDate) => {
  return useQuery({
    queryKey: ['dashboardSummary', startDate, endDate],
    queryFn: () => fetcher('/dashboard/summary', { startDate, endDate }),
    staleTime: 5 * 60 * 1000, 
  });
};

// 2. Daily Trends Hook (For Line/Area Charts)
export const useDashboardTrends = (startDate, endDate) => {
  return useQuery({
    queryKey: ['dashboardTrends', startDate, endDate],
    queryFn: () => fetcher('/dashboard/trends', { startDate, endDate }),
    staleTime: 5 * 60 * 1000,
  });
};

// 3. Film Performance Hook (For Tables or Pie Charts)
export const useFilmPerformance = (startDate, endDate) => {
  return useQuery({
    queryKey: ['films', startDate, endDate],
    queryFn: () => fetcher('/dashboard/films', { startDate, endDate }),
  });
};

// 4. Screen Performance Hook
export const useScreenPerformance = (startDate, endDate) => {
  return useQuery({
    queryKey: ['screens', startDate, endDate],
    queryFn: () => fetcher('/dashboard/screens', { startDate, endDate }),
  });
};

// 5. Concession Performance Hook
export const useConcessionPerformance = (startDate, endDate) => {
  return useQuery({
    queryKey: ['concessions', startDate, endDate],
    queryFn: () => fetcher('/dashboard/concessions', { startDate, endDate }),
  });
};
```

---

## 4. UI Implementation Examples

### Setting up the Global Provider
Wrap your React application tree with the query provider in `main.jsx` or `App.jsx`:

```jsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Prevents unwanted API calls when switching tabs
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Dashboard />
    </QueryClientProvider>
  );
}
```

### Component 1: Top Summary Cards
Connecting the combined totals (Revenue, Concessions, Box Office) to KPI cards.

```jsx
import React, { useState } from 'react';
import { useDashboardSummary } from '../hooks/useDashboard';

const SummaryCards = () => {
  const [dates] = useState({ start: '2026-03-01', end: '2026-03-07' });
  const { data: summary, isLoading, error } = useDashboardSummary(dates.start, dates.end);

  if (isLoading) return <div>Loading KPI Metrics...</div>;
  if (error) return <div>Error loading data.</div>;

  return (
    <div className="grid grid-cols-4 gap-4">
      <Card title="Total Box Office" value={`₹${summary.totalBoxOffice.toLocaleString()}`} />
      <Card title="Concessions" value={`₹${summary.totalConcessions.toLocaleString()}`} />
      <Card title="Gross Revenue" value={`₹${summary.totalRevenue.toLocaleString()}`} />
      <Card title="Occupancy" value={`${summary.averageOccupancy}%`} />
    </div>
  );
};
```

### Component 2: Dynamic Area Chart using Recharts
Using the exact `boxOffice`, `concessions`, and `revenue` objects generated by the `/api/dashboard/trends` endpoint to render a comparative visual overlay.

```jsx
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useDashboardTrends } from '../hooks/useDashboard';

const RevenueTrendChart = ({ startDate, endDate }) => {
  const { data: trendData, isLoading } = useDashboardTrends(startDate, endDate);

  if (isLoading) return <p>Building charts...</p>;

  return (
    <div className="h-96 w-full">
      <ResponsiveContainer>
        <AreaChart data={trendData.trends} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip formatter={(value) => `₹${value}`} />
          
          {/* Layer 1: Concessions (Bottom layer) */}
          <Area type="monotone" dataKey="concessions" stackId="1" stroke="#ffc658" fill="#ffc658" name="F&B Revenue" />
          
          {/* Layer 2: Box Office (Top layer) */}
          <Area type="monotone" dataKey="boxOffice" stackId="1" stroke="#8884d8" fill="#8884d8" name="Box Office" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
```

### Component 3: Data Tables (Concessions)
Quickly mapping out standard aggregated performance grids from the new backend grouping architecture.

```jsx
import { useConcessionPerformance } from '../hooks/useDashboard';

const ConcessionsTable = ({ startDate, endDate }) => {
  const { data: cData, isLoading } = useConcessionPerformance(startDate, endDate);

  if (isLoading) return <p>Loading F&B Data...</p>;

  return (
    <table className="min-w-full text-left">
      <thead>
        <tr>
          <th>Item Class</th>
          <th>Transactions</th>
          <th>Quantity Sold</th>
          <th>Gross Value</th>
        </tr>
      </thead>
      <tbody>
        {cData.concessions.map((item) => (
          <tr key={item.itemClass}>
            <td>{item.itemClass}</td>
            <td>{item.totalTransCount}</td>
            <td>{item.totalQtySold}</td>
            <td>₹{item.totalSaleValue.toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
```

---

## 5. Security & Refresh Tokens
Zustand pairs perfectly with Axios interceptors to silently refresh tokens in the background if a user sits on the dashboard for longer than the standard token expiry. 

*(Make sure to create an Axios Response Interceptor that detects `401 Unauthorized`, pauses the queue, fires an `/auth/refresh` request, updates `useAuthStore().accessToken`, and then automatically replays the originally failed queries behind the scenes without the user noticing.)*

---

## 6. Exporting Reports (Excel & PDF)

We have two secure download endpoints available on the backend to export the dashboard data into beautiful, formatted documents (which also include rendered Charts!).

* `GET /api/reports/export/excel?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
* `GET /api/reports/export/pdf?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`

Because these are secured by JWTs, you cannot simply use a standard `<a href="...">` unless you pass the token in the URL. Below are the two recommended methods to trigger downloads in your React frontend:

### Method A: Using an Anchor Tag and Token Query Parameter (Easiest)

Our backend has been optimized to accept the user's `token` as a query parameter in addition to the standard `Bearer` header. This allows you to open a new tab that automatically handles the download without needing to read binary blobs.

```jsx
import useAuthStore from '../store/useAuthStore';

const ExportButton = ({ startDate, endDate }) => {
  const token = useAuthStore((state) => state.accessToken);

  const handleDownload = (format) => {
    // format can be 'excel' or 'pdf'
    const url = `http://localhost:5000/api/reports/export/${format}?startDate=${startDate}&endDate=${endDate}&token=${token}`;
    
    // Opens the secure URL in a new tab, forcing the browser to instantly download the file.
    window.open(url, '_blank');
  };

  return (
    <div className="flex gap-2">
      <button onClick={() => handleDownload('excel')} className="bg-green-600 text-white p-2">Export to Excel</button>
      <button onClick={() => handleDownload('pdf')} className="bg-red-600 text-white p-2">Export to PDF</button>
    </div>
  );
};
```

### Method B: Using Axios and Blob Parsing (Advanced)

If you prefer to use Axios (to show a precise loading spinner while the document generates on the server), you **MUST** ensure `responseType: 'blob'` is set. Otherwise, the browser will interpret the binary file as corrupt text data.

```jsx
import { useState } from 'react';
import apiClient from '../api/client'; // Your configured axios instance

const AdvancedExportButton = ({ startDate, endDate }) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async (format) => {
    setIsDownloading(true);
    try {
      const response = await apiClient.get(`/reports/export/${format}`, {
        params: { startDate, endDate },
        responseType: 'blob', // CRITICAL: Tells Axios to expect a binary file
      });

      // Parse the Filename from the backend's "Content-Disposition" header
      let filename = `Cinema_Report_${startDate}_${endDate}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      const disposition = response.headers['content-disposition'];
      if (disposition && disposition.indexOf('attachment') !== -1) {
        const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
        const matches = filenameRegex.exec(disposition);
        if (matches != null && matches[1]) { 
          filename = matches[1].replace(/['"]/g, '');
        }
      }

      // Create a Blob from the Binary response
      const fileBlob = new Blob([response.data], { type: response.headers['content-type'] });
      const downloadUrl = window.URL.createObjectURL(fileBlob);

      // Programmatically trigger a download tag in the DOM
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

    } catch (error) {
      console.error('Failed to download document:', error);
      alert('Failed to generate report.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <button disabled={isDownloading} onClick={() => handleDownload('excel')}>
      {isDownloading ? 'Generating Excel...' : 'Download Excel Chart'}
    </button>
  );
};
```
---

## 7. AI Chatbot Assistant (LangChain + RAG)

The AI Chatbot allows users to ask natural language questions about the cinema's performance data. It uses LangChain and RAG to retrieve relevant context from historical reports.

  ### Chatbot Hooks (with History)
  ```javascript
  // src/hooks/useChatbot.js
  import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
  import apiClient from '../api/client';

  // 1. Fetch Session List
  export const useChatSessions = () => {
    return useQuery({
      queryKey: ['chatbotSessions'],
      queryFn: async () => {
        const { data } = await apiClient.get('/chatbot/sessions');
        return data.data;
      }
    });
  };

  // 2. Fetch History for a Session
  export const useChatHistory = (sessionId) => {
    return useQuery({
      queryKey: ['chatHistory', sessionId],
      queryFn: async () => {
        const { data } = await apiClient.get(`/chatbot/sessions/${sessionId}`);
        return data.data;
      },
      enabled: !!sessionId,
    });
  };

  // 3. Ask (supports continuing sessionId)
  export const useChatbotAsk = () => {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async ({ question, sessionId }) => {
        const { data } = await apiClient.post('/chatbot/ask', { question, sessionId });
        return data.data; // { answer, sessionId, title }
      },
      onSuccess: (data) => {
        // Refresh session list if a new session was created
        queryClient.invalidateQueries(['chatbotSessions']);
      }
    });
  };
  ```

  ### UI Implementation Example (Multi-turn History)
  ```jsx
  const ChatAssistant = () => {
    const [currentSessionId, setCurrentSessionId] = useState(null);
    const [input, setInput] = useState('');
    
    const { data: sessions } = useChatSessions();
    const { data: history } = useChatHistory(currentSessionId);
    const { mutate: ask, isLoading } = useChatbotAsk();

    const handleSend = () => {
      ask({ question: input, sessionId: currentSessionId }, {
        onSuccess: (res) => {
          if (!currentSessionId) setCurrentSessionId(res.sessionId);
          setInput('');
        }
      });
    };

    return (
      <div className="flex h-[600px] border rounded-xl overflow-hidden shadow-2xl bg-slate-950">
        {/* Sidebar: History List */}
        <div className="w-64 bg-slate-900 border-r border-slate-800 p-4 overflow-y-auto">
          <button onClick={() => setCurrentSessionId(null)} className="w-full mb-4 bg-blue-600 p-2 rounded text-sm font-bold">
            + New Analysis
          </button>
          {sessions?.map(s => (
            <div 
              key={s._id} 
              onClick={() => setCurrentSessionId(s._id)}
              className={`p-3 mb-2 rounded cursor-pointer text-xs ${currentSessionId === s._id ? 'bg-slate-700' : 'hover:bg-slate-800'}`}
            >
              <p className="truncate font-medium">{s.title}</p>
              <span className="text-slate-500">{new Date(s.updatedAt).toLocaleDateString()}</span>
            </div>
          ))}
        </div>

        {/* Main: Chat Area */}
      <div className="flex-1 flex flex-col p-6">
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {history?.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[90%] p-4 rounded-2xl ${msg.role === 'user' ? 'bg-blue-600 rounded-tr-none' : 'bg-slate-800 rounded-tl-none border border-slate-700'}`}>
                {msg.role === 'user' ? (
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                ) : (
                  <div 
                    className="prose prose-invert prose-sm max-w-none ai-response-html" 
                    dangerouslySetInnerHTML={{ __html: msg.content }} 
                  />
                )}
              </div>
            </div>
          ))}
          {isLoading && <div className="text-blue-400 text-xs italic animate-pulse">Analyzing reports for you...</div>}
        </div>
          
          <div className="mt-4 flex gap-3">
            <input 
              value={input} 
              onChange={e => setInput(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-700 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Ask a tactical business question..."
            />
            <button onClick={handleSend} className="bg-blue-600 px-6 py-3 rounded-xl hover:bg-blue-500 font-bold transition-all">
              Analyze
            </button>
          </div>
        </div>
      </div>
    );
  };
  ```

  ### Recommended CSS for AI Responses
  Add this to your `index.css` for a high-visibility **Black & White** theme:
  ```css
  .ai-response-html {
    color: #1a1a1a;
    line-height: 1.6;
  }
  .ai-response-html h3 {
    color: #000;
    margin-top: 1.5rem;
    border-bottom: 2px solid #eee;
    padding-bottom: 0.5rem;
  }
  .ai-response-html table {
    width: 100%;
    border-collapse: collapse;
    margin: 1rem 0;
    background: #fff;
    border: 1px solid #ddd;
  }
  .ai-response-html th {
    background: #f8f9fa;
    padding: 0.75rem;
    text-align: left;
    font-size: 0.8rem;
    font-weight: 700;
    color: #333;
    border: 1px solid #ddd;
  }
  .ai-response-html td {
    padding: 0.75rem;
    border: 1px solid #ddd;
    font-size: 0.85rem;
    color: #444;
  }
  .ai-response-html ul {
    list-style-type: "→";
    padding-left: 1.5rem;
    margin: 1rem 0;
  }
  .ai-response-html li {
    margin-bottom: 0.5rem;
  }
  .ai-response-html strong {
    color: #000;
  }
  ```
