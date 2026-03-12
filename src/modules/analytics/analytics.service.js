import OpenAI from "openai";
import * as tf from "@tensorflow/tfjs";
import axios from "axios";
import { pipeline } from "@xenova/transformers";
import Report from "../../models/report.model.js";

class AnalyticsService {
  constructor() {
    this._openai = null;
    this.sentimentModel = null;
  }

  get openai() {
    if (!this._openai && process.env.OPENAI_API_KEY) {
      this._openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return this._openai;
  }

  async initSentiment() {
    if (!this.sentimentModel) {
      this.sentimentModel = await pipeline("sentiment-analysis");
    }
  }

  async getPerformanceInsights(startDate, endDate) {
    const reports = await Report.find({
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: 1 });

    if (!reports.length) {
      throw new Error("No data found for this period.");
    }

    const dayWiseOccupancy = this._processTensorFlowData(reports);

    const topFilms = this._getTopFilms(reports);
    const lowFilms = this._getLowFilms(reports);

    const averageOccupancy =
      reports.reduce((a, b) => a + (b.totals?.avgOccupancy || 0), 0) /
      reports.length;

    // Enriching movie data with TMDB metadata and local sentiment
    const enrichedTop = await this._enrichMovies(topFilms);
    const enrichedLow = await this._enrichMovies(lowFilms);

    const aiAnalysis = await this._generateAIReasoning({
      period: `${startDate} to ${endDate}`,
      averageOccupancy: averageOccupancy.toFixed(2),
      topFilms: enrichedTop,
      lowFilms: enrichedLow,
      dayTrend: dayWiseOccupancy
    });

    return {
      summary: {
        period: { start: startDate, end: endDate },
        averageOccupancy: parseFloat(averageOccupancy.toFixed(2)),
        totalReportsAnalyzed: reports.length
      },
      predictions: {
        dayOfWeekEfficiency: dayWiseOccupancy,
        recommendation: this._getRecommendation(dayWiseOccupancy)
      },
      aiInsights: aiAnalysis
    };
  }

  _processTensorFlowData(reports) {
    const data = reports.map(r => ({
      day: new Date(r.date).getDay(),
      occupancy: r.totals?.avgOccupancy || 0
    }));

    const days = [
      "Sunday", "Monday", "Tuesday", "Wednesday",
      "Thursday", "Friday", "Saturday"
    ];

    const dayEfficiency = {};

    for (let i = 0; i < 7; i++) {
      const scores = data.filter(d => d.day === i).map(d => d.occupancy);

      if (scores.length) {
        const tensor = tf.tensor1d(scores);
        dayEfficiency[days[i]] = parseFloat(
          tensor.mean().dataSync()[0].toFixed(2)
        );
        tensor.dispose();
      } else {
        dayEfficiency[days[i]] = 0;
      }
    }

    return dayEfficiency;
  }

  async _enrichMovies(films) {
    const results = [];

    for (const film of films) {
      const metadata = await this._fetchMovieMetadata(film.name);
      const sentiment = await this._analyzeSentiment(film.name);

      results.push({
        ...film,
        actors: metadata.actors,
        genres: metadata.genres,
        rating: metadata.rating,
        sentiment
      });
    }

    return results;
  }

  async _fetchMovieMetadata(movieName) {
    try {
      const TMDB = "https://api.themoviedb.org/3";
      // Ensure TMDB_API_KEY is in .env
      const apiKey = process.env.TMDB_API_KEY;

      if (!apiKey) return { actors: [], genres: [], rating: null };

      const search = await axios.get(`${TMDB}/search/movie`, {
        params: {
          api_key: apiKey,
          query: movieName
        }
      });

      if (!search.data.results.length) {
        return { actors: [], genres: [], rating: null };
      }

      const movie = search.data.results[0];

      const credits = await axios.get(`${TMDB}/movie/${movie.id}/credits`, {
        params: { api_key: apiKey }
      });

      const actors = credits.data.cast.slice(0, 5).map(a => a.name);

      return {
        actors,
        genres: movie.genre_ids,
        rating: movie.vote_average
      };
    } catch (error) {
      console.error(`Metadata fetch failed for ${movieName}:`, error.message);
      return { actors: [], genres: [], rating: null };
    }
  }

  async _analyzeSentiment(movieName) {
    try {
      await this.initSentiment();

      const result = await this.sentimentModel(
        `${movieName} movie audience reaction`
      );

      return result[0];
    } catch {
      return { label: "UNKNOWN", score: 0 };
    }
  }

  _getTopFilms(reports) {
    const films = {};

    reports.forEach(r => {
      r.films.forEach(f => {
        if (!films[f.film]) {
          films[f.film] = {
            name: f.film,
            totalTickets: 0,
            avgOccupancy: 0,
            count: 0
          };
        }

        films[f.film].totalTickets += f.ticketsSold;
        films[f.film].avgOccupancy += f.occupancyPercent;
        films[f.film].count++;
      });
    });

    return Object.values(films)
      .map(f => ({
        ...f,
        avgOccupancy: parseFloat((f.avgOccupancy / f.count).toFixed(2))
      }))
      .sort((a, b) => b.totalTickets - a.totalTickets)
      .slice(0, 3);
  }

  _getLowFilms(reports) {
    const films = {};

    reports.forEach(r => {
      r.films.forEach(f => {
        if (!films[f.film]) {
          films[f.film] = {
            name: f.film,
            totalTickets: 0,
            avgOccupancy: 0,
            count: 0
          };
        }

        films[f.film].totalTickets += f.ticketsSold;
        films[f.film].avgOccupancy += f.occupancyPercent;
        films[f.film].count++;
      });
    });

    return Object.values(films)
      .map(f => ({
        ...f,
        avgOccupancy: parseFloat((f.avgOccupancy / f.count).toFixed(2))
      }))
      .sort((a, b) => a.avgOccupancy - b.avgOccupancy)
      .filter(f => f.totalTickets > 0)
      .slice(0, 3);
  }

  async _generateAIReasoning(data) {
    if (!this.openai) {
      return {
        executiveSummary: "AI insight is disabled. Please configure OPENAI_API_KEY."
      };
    }

    const prompt = `
      You are a Cinema Business Intelligence Expert. Analyze this data and provide insights.
      
      Period: ${data.period}
      Average Occupancy: ${data.averageOccupancy}%
      
      Top Films:
      ${JSON.stringify(data.topFilms)}
      
      Low Performing Films:
      ${JSON.stringify(data.lowFilms)}
      
      Day-of-Week Trends:
      ${JSON.stringify(data.dayTrend)}
      
      Task:
      - Explain success of top films (consider actors, ratings, sentiment)
      - Identify why low films are underperforming
      - Summarize market sentiment
      - Predict next weekend performance
      
      Return ONLY a pure JSON object with these keys:
      {
        "executiveSummary": "string",
        "causalAnalysis": { "successFactors": ["string"], "failureFactors": ["string"] },
        "marketSentiment": "string",
        "strategicAdvice": "string"
      }
    `;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-5-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error("OpenAI Inference Error:", error);
      return {
        executiveSummary: "Error generating AI analysis.",
        causalAnalysis: { successFactors: [], failureFactors: [] },
        marketSentiment: "Unknown",
        strategicAdvice: "Check your API quota and configuration."
      };
    }
  }

  _getRecommendation(dayTrend) {
    const entries = Object.entries(dayTrend).filter(e => e[1] > 0);

    if (!entries.length) return "Not enough data.";

    const maxDay = entries.reduce((a, b) => (a[1] > b[1] ? a : b))[0];
    const minDay = entries.reduce((a, b) => (a[1] < b[1] ? a : b))[0];

    return `Strongest day: ${maxDay}. Weakest day: ${minDay}. Run promotions on weaker days and premium pricing on strong days.`;
  }
}

export default new AnalyticsService();
