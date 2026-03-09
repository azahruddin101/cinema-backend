/**
 * Static context for 2026 Festivals, Holidays and Regional Factors for Lucknow
 * This helps the AI reason about footfall fluctuations.
 */
export const LUCKNOW_2026_CONTEXT = {
    city: "Lucknow",
    state: "Uttar Pradesh",
    demographics: "High Muslim and Hindu populations, influencing major spikes during Eid and Diwali.",

    festivals_2026: [
        { name: "Hazrat Ali Jayanti", date: "2026-01-03", impact: "Local holiday in UP" },
        { name: "Republic Day", date: "2026-01-26", impact: "National Holiday - High footfall" },
        { name: "Maha Shivaratri", date: "2026-02-15", impact: "Public Holiday - Evening spikes" },
        { name: "Holika Dahan", date: "2026-03-01", impact: "Evening celebrations - Potential dip in night shows" },
        { name: "Holi", date: "2026-03-03", impact: "Main festival - Morning shows empty, evening shows very high" },
        { name: "Holi Next Day", date: "2026-03-04", impact: "Regional holiday in UP" },
        { name: "Eid-ul-Fitr", date: "2026-03-20", impact: "Major impact in Lucknow - Extremely high footfall for movies" },
        { name: "Ram Navami", date: "2026-03-25", impact: "Public holiday" },
        { name: "Bhimrao Ambedkar Birthday", date: "2026-04-13", impact: "Public holiday" },
        { name: "Bakrid (Eid-ul-Adha)", date: "2026-05-27", impact: "Major holiday" },
        { name: "Lucknow Mahotsav", start: "2026-11-25", end: "2026-12-05", impact: "Huge local event, might divert footfall from cinemas to fair ground" }
    ],

    weather_patterns: {
        january: "Cold, dense fog (might reduce late night/early morning shows)",
        february: "Pleasant, outgoing winter. Best time for outings.",
        march: "Warm, transition to summer. Good for air-conditioned cinema footfall.",
        april_june: "Extreme heat (40°C+). People prefer cinemas during afternoons to escape heat.",
        july_september: "Monsoon. Heavy rain can cause sudden dips in ticket sales."
    },

    weekend_logic: "Saturdays and Sundays naturally see 2x-3x higher footfall compared to weekdays."
};
