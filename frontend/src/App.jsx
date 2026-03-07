import { useState, useRef } from "react";

const API_URL = "https://digitalrecycling-api.onrender.com";

const SOURCE_CONFIG = {
  elchoque:     { label: "El Choque",      color: "#e63946", badge: "⭐ SOCIO" },
  opisto:       { label: "Opisto",         color: "#2a9d8f", badge: null },
  recambioverde:{ label: "Recambio Verde", color: "#4caf50", badge: null },
  ovoko:        { label: "Ovoko",          color: "#f4a261", badge: null },
  bparts:       { label: "B-Parts",        color: "#457b9d", badge: null },
  ecooparts:    { label: "Ecooparts",      color: "#6d6875", badge: null },
};

function SourceBadge({ source }) {
  const cfg = SOURCE_CONFIG[source] || { label: source, color: "#888", badge: null };
  return (
    <span style={{
      background: cfg.color, color: "#fff", borderRadius: 4,
      padding: "2px 7px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap"
    }}>
      {cfg.label}{cfg.badge ? ` ${cfg.badge}` : ""}
    </span>
  );
}

function ResultCard({ item }) {
  return (
    <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
      <div style={{
        background: "#fff", borderRadius: 10, padding: 14,
        display: "flex", gap: 12, alignItems: "flex-start",
        border: item.source === "elchoque" ? "2px solid #C49A1A" : "1px solid #e0e0e0",
        boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
        transition: "transform 0.15s",
        cursor: "pointer",
      }}
        onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
        onMouseLeave={e => e.currentTarget.style.transform = "none"}
      >
        {/* Imagen */}
        <div style={{ width: 72, height: 72, flexShrink: 0, borderRadius: 6, overflow: "hidden", background: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {item.image_url
            ? <img src={item.image_url} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.target.style.display = "none"; }} />
            : <span style={{ fontSize: 28 }}>🔧</span>
          }
        </div>
        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
            <SourceBadge source={item.source} />
          </div>
          <div style={{ fontWeight: 600, fontSize: 13, color: "#1B2A4A", lineHeight: 1.3, marginBottom: 6 }}>
            {item.title}
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: item.source === "elchoque" ? "#C49A1A" : "#1B2A4A" }}>
            {item.price_raw || (item.price ? `${item.price.toFixed(2)} €` : "—")}
          </div>
        </div>
      </div>
    </a>
  );
}

function SourceSummary({ sources }) {
  if (!sources?.length) return null;
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
      {sources.map(s => {
        const cfg = SOURCE_CONFIG[s.source] || { label: s.source, color: "#888" };
        const ok = s.count > 0;
        return (
          <div key={s.source} style={{
            background: ok ? cfg.color + "18" : "#f5f5f5",
            border: `1px solid ${ok ? cfg.color : "#ddd"}`,
            borderRadius: 6, padding: "4px 10px", fontSize: 12,
            color: ok ? cfg.color : "#aaa", fontWeight: 600,
          }}>
            {cfg.label}: {s.count} {s.error && s.count === 0 ? "🚫" : "✓"}
          </div>
        );
      })}
    </div>
  );
}

export default function App() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);
  const [history, setHistory] = useState([]);
  const inputRef = useRef();

  const doSearch = async (q) => {
    const term = (q || query).trim();
    if (!term) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const res = await fetch(`${API_URL}/search?q=${encodeURIComponent(term)}`);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      setResults(data.results || []);
      setSources(data.sources || []);
      setHistory(prev => [term, ...prev.filter(h => h !== term)].slice(0, 5));
    } catch (e) {
      setError("Error conectando con la API. Intenta de nuevo.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => { if (e.key === "Enter") doSearch(); };

  // Agrupar por fuente para mostrar El Choque primero
  const sortedResults = [
    ...results.filter(r => r.source === "elchoque"),
    ...results.filter(r => r.source !== "elchoque"),
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f0f2f5", fontFamily: "'Segoe UI', sans-serif" }}>
      {/* Header */}
      <div style={{ background: "#1B2A4A", padding: "16px 24px", display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ background: "#C49A1A", borderRadius: 6, padding: "6px 14px" }}>
          <span style={{ color: "#1B2A4A", fontWeight: 900, fontSize: 18, letterSpacing: 1 }}>CIO4YOU</span>
        </div>
        <div>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>Price Intelligence</div>
          <div style={{ color: "#C49A1A", fontSize: 11 }}>Recambios · Tiempo Real</div>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 16px" }}>
        {/* Buscador */}
        <div style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", marginBottom: 20 }}>
          <div style={{ color: "#1B2A4A", fontWeight: 700, fontSize: 16, marginBottom: 12 }}>
            🔍 Buscar recambio
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Nombre de pieza o referencia OEM (ej: alternador, 9643777980)"
              style={{
                flex: 1, padding: "10px 14px", borderRadius: 8,
                border: "2px solid #e0e0e0", fontSize: 14, outline: "none",
                transition: "border 0.2s",
              }}
              onFocus={e => e.target.style.border = "2px solid #C49A1A"}
              onBlur={e => e.target.style.border = "2px solid #e0e0e0"}
            />
            <button
              onClick={() => doSearch()}
              disabled={loading}
              style={{
                background: loading ? "#ccc" : "#C49A1A",
                color: loading ? "#888" : "#1B2A4A",
                border: "none", borderRadius: 8, padding: "10px 20px",
                fontWeight: 800, fontSize: 14, cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "..." : "BUSCAR"}
            </button>
          </div>

          {/* Historial */}
          {history.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
              {history.map(h => (
                <button key={h} onClick={() => { setQuery(h); doSearch(h); }} style={{
                  background: "#f0f2f5", border: "none", borderRadius: 4,
                  padding: "3px 10px", fontSize: 12, cursor: "pointer", color: "#555"
                }}>
                  🕐 {h}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Resultados */}
        {loading && (
          <div style={{ textAlign: "center", padding: 40, color: "#888" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
            <div>Consultando 6 fuentes en paralelo...</div>
          </div>
        )}

        {error && (
          <div style={{ background: "#fff3f3", border: "1px solid #ffcdd2", borderRadius: 8, padding: 16, color: "#c62828", marginBottom: 16 }}>
            ⚠️ {error}
          </div>
        )}

        {searched && !loading && !error && (
          <>
            <SourceSummary sources={sources} />
            <div style={{ color: "#555", fontSize: 13, marginBottom: 12, fontWeight: 600 }}>
              {sortedResults.length} resultados encontrados
              {sortedResults.length > 0 && ` · desde ${Math.min(...sortedResults.filter(r=>r.price).map(r=>r.price)).toFixed(2)} €`}
            </div>
            {sortedResults.length === 0
              ? <div style={{ textAlign: "center", padding: 40, color: "#aaa" }}>Sin resultados. Prueba otro término.</div>
              : <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {sortedResults.map((item, i) => <ResultCard key={i} item={item} />)}
                </div>
            }
          </>
        )}

        {!searched && (
          <div style={{ textAlign: "center", padding: 40, color: "#aaa" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔧</div>
            <div style={{ fontSize: 15, color: "#888" }}>Busca cualquier recambio para ver precios en tiempo real</div>
            <div style={{ fontSize: 12, color: "#bbb", marginTop: 8 }}>El Choque · Opisto · Recambio Verde · Ovoko · B-Parts · Ecooparts</div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ background: "#1B2A4A", color: "#C49A1A", textAlign: "center", padding: "10px 0", fontSize: 11, marginTop: 40 }}>
        CIO4YOU · Your IT Partners · cioforyou.net
      </div>
    </div>
  );
}

