// routes/quotes.js
//
// Proxies live stock quotes from Twelve Data so the API key never reaches
// the browser. Mount this in your main server file:
//
//   const quotesRouter = require("./routes/quotes");
//   app.use("/api/quotes", quotesRouter);
//
// Requires Node 18+ (for global fetch). If you're on an older Node version,
// run `npm install node-fetch` and add: const fetch = require("node-fetch");
//
// Requires TWELVE_DATA_API_KEY to be set in your .env file. Get a free key
// (no credit card) at https://twelvedata.com/pricing — the free "Basic"
// plan gives real-time data for US exchanges (NASDAQ/NYSE), 800 requests/
// day, 8 requests/minute. International exchanges (LSE, XETRA, TSE, NSE,
// JSE, B3, TSX, etc.) require a paid plan, so this route only covers US
// tickers for now.

const express = require("express");
const router = express.Router();

const TWELVE_DATA_API_KEY = process.env.TWELVE_DATA_API_KEY;
const DEFAULT_SYMBOLS = ["NVDA", "AAPL", "MSFT", "TSLA"];

// Simple in-memory cache so multiple browser tabs/users polling at once
// don't burn through the free 8-requests/minute limit.
const CACHE_TTL_MS = 30_000;
let cache = { key: "", data: null, fetchedAt: 0 };

router.get("/stocks", async (req, res) => {
  if (!TWELVE_DATA_API_KEY) {
    return res.status(500).json({ error: "TWELVE_DATA_API_KEY is not set in the environment" });
  }

  const requested = req.query.symbols
    ? req.query.symbols.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean)
    : DEFAULT_SYMBOLS;

  const cacheKey = requested.join(",");
  if (cache.data && cache.key === cacheKey && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return res.json(cache.data);
  }

  try {
    const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(
      requested.join(",")
    )}&apikey=${TWELVE_DATA_API_KEY}`;

    const response = await fetch(url);
    const raw = await response.json();

    // Twelve Data returns a single flat object when one symbol is
    // requested, and an object keyed by symbol when several are — this
    // normalizes both shapes into { SYMBOL: {...} }.
    const bySymbol = raw.symbol ? { [raw.symbol]: raw } : raw;

    const quotes = {};
    for (const symbol of requested) {
      const q = bySymbol[symbol];
      if (q && q.close && !q.code) {
        quotes[symbol] = {
          price: parseFloat(q.close),
          changePercent: parseFloat(q.percent_change),
          name: q.name || symbol,
        };
      }
    }

    cache = { key: cacheKey, data: quotes, fetchedAt: Date.now() };
    res.json(quotes);
  } catch (err) {
    console.error("Twelve Data quote fetch failed:", err);
    res.status(502).json({ error: "Unable to fetch live stock quotes" });
  }
});

module.exports = router;
