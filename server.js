const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

class QueryAnalytics {
    constructor() {
        this.queries = new Map();
    }

    trackQuery(query, duration) {
        const stats = this.queries.get(query) || { count: 0, totalTime: 0 };
        stats.count++;
        stats.totalTime += duration;
        this.queries.set(query, stats);
    }

    getAnalytics() {
        return Array.from(this.queries.entries()).map(([query, stats]) => ({
            query,
            avgTime: stats.totalTime / stats.count,
            count: stats.count
        }));
    }
}

const analytics = new QueryAnalytics();

app.use(cors({
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'ok', analytics: analytics.getAnalytics() });
});

app.get('/api/databases', async (req, res) => {
    try {
        const response = await axios.get('http://127.0.0.1:5001/databases');
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch databases' });
    }
});

app.post('/api/query', async (req, res) => {
    const startTime = Date.now();
    try {
        const response = await axios.post('http://127.0.0.1:5001/query', req.body, {
            timeout: 10000,
            headers: { 'Content-Type': 'application/json' }
        });
        
        const duration = Date.now() - startTime;
        analytics.trackQuery(req.body.query, duration);
        
        res.json({
            ...response.data,
            serverMetrics: analytics.getAnalytics()
        });
    } catch (error) {
        res.status(500).json({
            error: 'Query processing failed',
            details: error.message,
            analytics: analytics.getAnalytics()
        });
    }
});

app.get('/api/columns', async (req, res) => {
    try {
        const database = req.query.database;
        const response = await axios.get(`http://127.0.0.1:5001/columns?database=${database}`);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch columns' });
    }
});

const PORT = 3002;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
