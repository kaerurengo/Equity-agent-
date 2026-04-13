import { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

// ─────────────────────────────────────────────
// DEFAULT WATCHLIST CONFIG — edit tickers & base prices here
// ─────────────────────────────────────────────
const DEFAULT_WATCHLIST = [
  { ticker: "AAPL", name: "Apple Inc.",       sector: "Technology",     basePrice: 187  },
  { ticker: "NVDA", name: "NVIDIA Corp.",      sector: "Semiconductors", basePrice: 875  },
  { ticker: "TSLA", name: "Tesla Inc.",        sector: "Automotive",     basePrice: 172  },
  { ticker: "MSFT", name: "Microsoft Corp.",   sector: "Technology",     basePrice: 415  },
  { ticker: "AMZN", name: "Amazon.com",        sector: "Consumer",       basePrice: 192  },
];

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function generatePriceHistory(base, days = 30) {
  const data = [];
  let price = base;
  for (let i = days; i >= 0; i--) {
    const change = (Math.random() - 0.48) * price * 0.025;
    price = Math.max(price + change, base * 0.7);
    const d = new Date();
    d.setDate(d.getDate() - i);
    data.push({ date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), price: parseFloat(price.toFixed(2)) });
  }
  return data;
}

function generateSignal(history) {
  const prices  = history.map(h => h.price);
  const avg     = prices.slice(-10).reduce((a, b) => a + b, 0) / 10;
  const shortAvg= prices.slice(-3).reduce((a, b) => a + b, 0) / 3;
  const momentum= (shortAvg - avg) / avg;
  if (momentum >  0.012) return { signal: "BUY",  strength: Math.min(99, Math.round(60 + momentum * 2000)),           reason: "Momentum surge detected above 10-day MA" };
  if (momentum < -0.012) return { signal: "SELL", strength: Math.min(99, Math.round(60 + Math.abs(momentum) * 2000)), reason: "Bearish crossover below 10-day MA" };
  return                         { signal: "HOLD", strength: Math.round(50 + Math.random() * 20),                      reason: "Consolidation phase — await breakout" };
}

function buildStockData(entry) {
  const history = generatePriceHistory(entry.basePrice);
  return { ...entry, history, signal: generateSignal(history) };
}

const SIGNAL_COLOR = { BUY: "#00e5a0", SELL: "#ff4d6d", HOLD: "#f5c842" };
const SIGNAL_BG    = { BUY: "rgba(0,229,160,0.12)", SELL: "rgba(255,77,109,0.12)", HOLD: "rgba(245,200,66,0.12)" };

// ─────────────────────────────────────────────
// AI Analysis block
// ─────────────────────────────────────────────
function AIAnalysis({ stock }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const analyze = async () => {
    setLoading(true); setText(""); setDone(false);
    const prompt = `You are an elite Wall Street quant analyst AI. Give a brief (3-4 sentences), sharp, confident analysis for a ${stock.signal.signal} signal on ${stock.ticker} (${stock.name}). Reason: ${stock.signal.reason}. Confidence: ${stock.signal.strength}%. Include key risk factor. Be direct, no fluff.`;
    try {
      const res  = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, messages: [{ role: "user", content: prompt }] }),
      });
      const data = await res.json();
      const full = data.content?.[0]?.text || "Analysis unavailable.";
      let i = 0;
      const iv = setInterval(() => { setText(full.slice(0, i)); i += 3; if (i >= full.length) { clearInterval(iv); setDone(true); } }, 18);
    } catch { setText("Unable to load AI analysis."); setDone(true); }
    setLoading(false);
  };

  return (
    <div style={{ marginTop: 16 }}>
      {!text && !loading && (
        <button onClick={analyze} style={{ width: "100%", padding: "11px 0", borderRadius: 14, border: "1px solid rgba(124,143,255,0.25)", background: "linear-gradient(135deg,#1a1f3a,#0d1226)", color: "#7c8fff", fontSize: 13, fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em", cursor: "pointer", fontWeight: 600 }}>
          ⚡ RUN AI ANALYSIS
        </button>
      )}
      {loading && !text && <div style={{ textAlign: "center", color: "#7c8fff", fontSize: 12, padding: 12, fontFamily: "'DM Mono',monospace", animation: "pulse 1s infinite" }}>Analyzing market data…</div>}
      {text && (
        <div style={{ background: "rgba(124,143,255,0.07)", borderRadius: 14, padding: "14px 16px", border: "1px solid rgba(124,143,255,0.18)" }}>
          <div style={{ fontSize: 10, color: "#7c8fff", fontFamily: "'DM Mono',monospace", marginBottom: 8, letterSpacing: "0.1em" }}>◈ AI AGENT VERDICT</div>
          <p style={{ margin: 0, fontSize: 13, color: "#c8cfe8", lineHeight: 1.7, fontFamily: "'DM Sans',sans-serif" }}>{text}{!done && <span style={{ opacity: 0.5 }}>▌</span>}</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Stock card (watchlist row)
// ─────────────────────────────────────────────
function StockCard({ stock, selected, onClick }) {
  const { history, signal, ticker, name } = stock;
  const last   = history[history.length - 1].price;
  const prev   = history[history.length - 2].price;
  const change = ((last - prev) / prev * 100).toFixed(2);
  const up     = parseFloat(change) >= 0;

  return (
    <div onClick={onClick} style={{ background: selected ? "rgba(124,143,255,0.13)" : "rgba(255,255,255,0.04)", borderRadius: 18, padding: "14px 16px", cursor: "pointer", border: selected ? "1px solid rgba(124,143,255,0.4)" : "1px solid rgba(255,255,255,0.07)", transition: "all 0.2s", marginBottom: 10, boxShadow: selected ? "0 0 20px rgba(124,143,255,0.15)" : "none" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#e8ecff", fontFamily: "'DM Sans',sans-serif" }}>{ticker}</span>
            <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 700, color: SIGNAL_COLOR[signal.signal], background: SIGNAL_BG[signal.signal], padding: "2px 7px", borderRadius: 6, letterSpacing: "0.08em" }}>{signal.signal}</span>
          </div>
          <div style={{ fontSize: 11, color: "#6e7a9a", marginTop: 2, fontFamily: "'DM Sans',sans-serif" }}>{name}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#e8ecff", fontFamily: "'DM Mono',monospace" }}>${last.toFixed(2)}</div>
          <div style={{ fontSize: 11, color: up ? "#00e5a0" : "#ff4d6d", fontFamily: "'DM Mono',monospace" }}>{up ? "▲" : "▼"} {Math.abs(change)}%</div>
        </div>
      </div>
      <div style={{ marginTop: 10, height: 36 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={history.slice(-14)} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`g${ticker}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={up ? "#00e5a0" : "#ff4d6d"} stopOpacity={0.3} />
                <stop offset="95%" stopColor={up ? "#00e5a0" : "#ff4d6d"} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="price" stroke={up ? "#00e5a0" : "#ff4d6d"} strokeWidth={1.5} fill={`url(#g${ticker})`} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Detail / analysis view
// ─────────────────────────────────────────────
function DetailView({ stock }) {
  const { history, signal, ticker, sector } = stock;
  const last     = history[history.length - 1].price;
  const prev     = history[history.length - 2].price;
  const change   = ((last - prev) / prev * 100).toFixed(2);
  const up       = parseFloat(change) >= 0;
  const avgPrice = history.slice(-10).reduce((a, b) => a + b.price, 0) / 10;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#e8ecff", fontFamily: "'DM Sans',sans-serif" }}>{ticker}</div>
            <div style={{ fontSize: 12, color: "#6e7a9a", fontFamily: "'DM Sans',sans-serif" }}>{sector}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: "#e8ecff", fontFamily: "'DM Mono',monospace" }}>${last.toFixed(2)}</div>
            <div style={{ fontSize: 13, color: up ? "#00e5a0" : "#ff4d6d", fontFamily: "'DM Mono',monospace" }}>{up ? "▲" : "▼"} {Math.abs(change)}% today</div>
          </div>
        </div>
      </div>

      <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 18, padding: "16px 8px 8px", marginBottom: 16, border: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ height: 140 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="mainGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#7c8fff" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#7c8fff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: "#4a5270", fontSize: 10, fontFamily: "'DM Mono',monospace" }} tickLine={false} axisLine={false} interval={6} />
              <YAxis domain={["auto","auto"]} tick={{ fill: "#4a5270", fontSize: 10, fontFamily: "'DM Mono',monospace" }} tickLine={false} axisLine={false} width={50} tickFormatter={v => `$${v}`} />
              <Tooltip contentStyle={{ background: "#0d1226", border: "1px solid rgba(124,143,255,0.3)", borderRadius: 10, fontSize: 12, fontFamily: "'DM Mono',monospace", color: "#e8ecff" }} formatter={v => [`$${v}`, "Price"]} />
              <ReferenceLine y={avgPrice} stroke="#7c8fff" strokeDasharray="4 4" strokeOpacity={0.5} />
              <Area type="monotone" dataKey="price" stroke="#7c8fff" strokeWidth={2} fill="url(#mainGrad)" dot={false} activeDot={{ r: 4, fill: "#7c8fff" }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div style={{ textAlign: "center", fontSize: 10, color: "#4a5270", fontFamily: "'DM Mono',monospace", marginTop: 4 }}>— 10-day MA: ${avgPrice.toFixed(2)}</div>
      </div>

      <div style={{ background: SIGNAL_BG[signal.signal], borderRadius: 18, padding: "16px 18px", border: `1px solid ${SIGNAL_COLOR[signal.signal]}33`, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 11, color: "#6e7a9a", fontFamily: "'DM Mono',monospace", letterSpacing: "0.1em" }}>AI SIGNAL</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: SIGNAL_COLOR[signal.signal], fontFamily: "'DM Sans',sans-serif", lineHeight: 1.1 }}>{signal.signal}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "#6e7a9a", fontFamily: "'DM Mono',monospace", letterSpacing: "0.1em" }}>CONFIDENCE</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: SIGNAL_COLOR[signal.signal], fontFamily: "'DM Mono',monospace" }}>{signal.strength}%</div>
          </div>
        </div>
        <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 99, height: 6, overflow: "hidden" }}>
          <div style={{ width: `${signal.strength}%`, height: "100%", background: `linear-gradient(90deg,${SIGNAL_COLOR[signal.signal]}88,${SIGNAL_COLOR[signal.signal]})`, borderRadius: 99 }} />
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: "#8a95b8", fontFamily: "'DM Sans',sans-serif" }}>{signal.reason}</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
        {[
          { label: "30D HIGH", value: `$${Math.max(...history.map(h => h.price)).toFixed(2)}` },
          { label: "30D LOW",  value: `$${Math.min(...history.map(h => h.price)).toFixed(2)}` },
          { label: "SECTOR",   value: sector.split(" ")[0] },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: "10px 12px", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ fontSize: 9, color: "#4a5270", fontFamily: "'DM Mono',monospace", letterSpacing: "0.1em", marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#c8cfe8", fontFamily: "'DM Mono',monospace" }}>{value}</div>
          </div>
        ))}
      </div>

      <AIAnalysis stock={stock} />
    </div>
  );
}

// ─────────────────────────────────────────────
// ⚙ Config / Settings page
// ─────────────────────────────────────────────
function ConfigPage({ watchlist, onAdd, onRemove }) {
  const [ticker,    setTicker]    = useState("");
  const [name,      setName]      = useState("");
  const [sector,    setSector]    = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [error,     setError]     = useState("");
  const [success,   setSuccess]   = useState("");

  const inputStyle = {
    width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 12, padding: "10px 14px", color: "#e8ecff", fontSize: 13,
    fontFamily: "'DM Mono',monospace", outline: "none", marginBottom: 8,
  };
  const labelStyle = { fontSize: 10, color: "#4a5270", fontFamily: "'DM Mono',monospace", letterSpacing: "0.1em", marginBottom: 4, display: "block" };

  const handleAdd = () => {
    const t = ticker.trim().toUpperCase();
    const p = parseFloat(basePrice);
    if (!t || !name.trim())        { setError("Ticker and company name are required."); setSuccess(""); return; }
    if (isNaN(p) || p <= 0)        { setError("Enter a valid base price > 0.");         setSuccess(""); return; }
    if (watchlist.find(s => s.ticker === t)) { setError(`${t} is already on your watchlist.`); setSuccess(""); return; }
    setError("");
    onAdd({ ticker: t, name: name.trim(), sector: sector.trim() || "Unknown", basePrice: p });
    setSuccess(`${t} added to watchlist!`);
    setTicker(""); setName(""); setSector(""); setBasePrice("");
    setTimeout(() => setSuccess(""), 3000);
  };

  return (
    <div>
      {/* Add new stock */}
      <div style={{ background: "rgba(124,143,255,0.07)", borderRadius: 18, padding: "18px 16px", border: "1px solid rgba(124,143,255,0.18)", marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: "#7c8fff", fontFamily: "'DM Mono',monospace", letterSpacing: "0.12em", marginBottom: 14 }}>＋ ADD STOCK TO WATCHLIST</div>

        <label style={labelStyle}>TICKER SYMBOL *</label>
        <input style={inputStyle} placeholder="e.g. GOOG" value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} maxLength={8} />

        <label style={labelStyle}>COMPANY NAME *</label>
        <input style={inputStyle} placeholder="e.g. Alphabet Inc." value={name} onChange={e => setName(e.target.value)} />

        <label style={labelStyle}>SECTOR (optional)</label>
        <input style={inputStyle} placeholder="e.g. Technology" value={sector} onChange={e => setSector(e.target.value)} />

        <label style={labelStyle}>BASE PRICE USD *</label>
        <input style={inputStyle} placeholder="e.g. 175.00" value={basePrice} type="number" min="0.01" step="0.01" onChange={e => setBasePrice(e.target.value)} />

        {error   && <div style={{ fontSize: 11, color: "#ff4d6d", fontFamily: "'DM Mono',monospace", marginBottom: 8 }}>⚠ {error}</div>}
        {success && <div style={{ fontSize: 11, color: "#00e5a0", fontFamily: "'DM Mono',monospace", marginBottom: 8 }}>✓ {success}</div>}

        <button onClick={handleAdd} style={{ width: "100%", padding: "11px 0", borderRadius: 14, border: "none", background: "linear-gradient(135deg,#3a4aff,#7c8fff)", color: "#fff", fontSize: 13, fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em", cursor: "pointer", fontWeight: 700, marginTop: 4 }}>
          ADD TO WATCHLIST
        </button>
      </div>

      {/* Current watchlist */}
      <div style={{ fontSize: 11, color: "#4a5270", fontFamily: "'DM Mono',monospace", letterSpacing: "0.12em", marginBottom: 10 }}>
        WATCHLIST — {watchlist.length} STOCK{watchlist.length !== 1 ? "S" : ""}
      </div>
      {watchlist.map(stock => (
        <div key={stock.ticker} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: "12px 14px", marginBottom: 8, border: "1px solid rgba(255,255,255,0.07)" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#e8ecff", fontFamily: "'DM Sans',sans-serif" }}>{stock.ticker}</div>
            <div style={{ fontSize: 11, color: "#6e7a9a", fontFamily: "'DM Sans',sans-serif" }}>{stock.name} · base ${stock.basePrice}</div>
            <div style={{ fontSize: 10, color: "#3a4262", fontFamily: "'DM Mono',monospace", marginTop: 2 }}>{stock.sector}</div>
          </div>
          <button onClick={() => onRemove(stock.ticker)} style={{ background: "rgba(255,77,109,0.12)", border: "1px solid rgba(255,77,109,0.3)", borderRadius: 10, padding: "5px 12px", color: "#ff4d6d", fontSize: 12, fontFamily: "'DM Mono',monospace", cursor: "pointer", fontWeight: 600, flexShrink: 0 }}>
            REMOVE
          </button>
        </div>
      ))}
      {watchlist.length === 0 && (
        <div style={{ textAlign: "center", color: "#3a4262", fontFamily: "'DM Mono',monospace", fontSize: 12, padding: 24 }}>No stocks on watchlist</div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Root App
// ─────────────────────────────────────────────
export default function App() {
  const [stocks,   setStocks]   = useState(() => DEFAULT_WATCHLIST.map(buildStockData));
  const [selected, setSelected] = useState(stocks[0]?.ticker || null);
  const [tab,      setTab]      = useState("watchlist");
  const [time,     setTime]     = useState(new Date());

  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);

  const addStock = (entry) => {
    const newStock = buildStockData(entry);
    setStocks(prev => [...prev, newStock]);
    if (!selected) setSelected(newStock.ticker);
  };

  const removeStock = (ticker) => {
    setStocks(prev => {
      const next = prev.filter(s => s.ticker !== ticker);
      if (selected === ticker) setSelected(next[0]?.ticker || null);
      return next;
    });
  };

  const selectedStock = stocks.find(s => s.ticker === selected);
  const buyCount  = stocks.filter(s => s.signal.signal === "BUY").length;
  const sellCount = stocks.filter(s => s.signal.signal === "SELL").length;

  const NAV = [
    { icon: "⬛", label: "Watch",  t: "watchlist" },
    { icon: "◈",  label: "Signal", t: "detail"    },
    { icon: "⚙",  label: "Config", t: "config"    },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#080c1a 0%,#0a0f20 50%,#060a16 100%)", display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "0 0 40px", fontFamily: "'DM Sans',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&family=DM+Mono:wght@400;500;600&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar { width:0; }
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        input::placeholder { color:#3a4262; }
        input:focus { border-color:rgba(124,143,255,0.45) !important; background:rgba(124,143,255,0.08) !important; }
      `}</style>

      <div style={{ width: 393, minHeight: 852, background: "#080c1a", borderRadius: 54, border: "10px solid #1a1f30", boxShadow: "0 0 0 1px #2a3050,0 40px 100px rgba(0,0,0,0.8),0 0 60px rgba(124,143,255,0.08) inset", overflow: "hidden", position: "relative", marginTop: 40 }}>

        {/* Status bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 28px 0", height: 52 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#e8ecff", fontFamily: "'DM Mono',monospace" }}>{time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          <div style={{ width: 120, height: 30, background: "#0d1226", borderRadius: 99, border: "1px solid #1a2040" }} />
          <div style={{ width: 16, height: 10, border: "1.5px solid #8899cc", borderRadius: 3, position: "relative" }}>
            <div style={{ position: "absolute", right: -4, top: "50%", transform: "translateY(-50%)", width: 3, height: 6, background: "#8899cc", borderRadius: 1 }} />
            <div style={{ width: "70%", height: "60%", background: "#00e5a0", borderRadius: 1, margin: "20% auto" }} />
          </div>
        </div>

        {/* Header */}
        <div style={{ padding: "16px 24px 12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <div style={{ fontSize: 11, color: "#4a5270", fontFamily: "'DM Mono',monospace", letterSpacing: "0.12em" }}>EQUITY AGENT</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#e8ecff", letterSpacing: "-0.02em" }}>
                {tab === "config" ? "Configure" : "Market Signals"}
              </div>
            </div>
            {tab !== "config" && (
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ background: "rgba(0,229,160,0.12)", border: "1px solid rgba(0,229,160,0.3)", borderRadius: 10, padding: "4px 10px", fontSize: 12, fontFamily: "'DM Mono',monospace", color: "#00e5a0", fontWeight: 600 }}>{buyCount} BUY</div>
                <div style={{ background: "rgba(255,77,109,0.12)", border: "1px solid rgba(255,77,109,0.3)", borderRadius: 10, padding: "4px 10px", fontSize: 12, fontFamily: "'DM Mono',monospace", color: "#ff4d6d", fontWeight: 600 }}>{sellCount} SELL</div>
              </div>
            )}
          </div>
        </div>

        {/* Inner tab switcher (only on market views) */}
        {tab !== "config" && (
          <div style={{ display: "flex", margin: "0 24px 16px", background: "rgba(255,255,255,0.05)", borderRadius: 14, padding: 4 }}>
            {[["watchlist","Watchlist"],["detail","Analysis"]].map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)} style={{ flex: 1, padding: "8px 0", borderRadius: 11, border: "none", background: tab === key ? "rgba(124,143,255,0.2)" : "transparent", color: tab === key ? "#a0aaff" : "#4a5270", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", transition: "all 0.2s" }}>{label}</button>
            ))}
          </div>
        )}

        {/* Scrollable content */}
        <div style={{ padding: "0 20px 110px", animation: "fadeIn 0.3s ease", overflowY: "auto", maxHeight: 680 }}>
          {tab === "watchlist" && (
            <div>
              {stocks.length === 0 && <div style={{ textAlign: "center", color: "#3a4262", fontFamily: "'DM Mono',monospace", fontSize: 12, paddingTop: 40 }}>Watchlist empty — add stocks in Config ⚙</div>}
              {stocks.map(stock => (
                <StockCard key={stock.ticker} stock={stock} selected={selected === stock.ticker}
                  onClick={() => { setSelected(stock.ticker); setTab("detail"); }} />
              ))}
            </div>
          )}
          {tab === "detail" && selectedStock && <DetailView stock={selectedStock} />}
          {tab === "detail" && !selectedStock && <div style={{ textAlign: "center", color: "#3a4262", fontFamily: "'DM Mono',monospace", fontSize: 12, paddingTop: 40 }}>No stock selected — go to Watchlist</div>}
          {tab === "config" && <ConfigPage watchlist={stocks} onAdd={addStock} onRemove={removeStock} />}
        </div>

        {/* Bottom nav */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(8,12,26,0.95)", backdropFilter: "blur(20px)", borderTop: "1px solid rgba(255,255,255,0.07)", padding: "12px 0 28px", display: "flex", justifyContent: "space-around" }}>
          {NAV.map(({ icon, label, t }) => (
            <button key={t} onClick={() => setTab(t)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, color: tab === t ? "#7c8fff" : "#3a4262" }}>
              <span style={{ fontSize: 20 }}>{icon}</span>
              <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 600, letterSpacing: "0.08em" }}>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
