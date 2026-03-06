import { useState, useEffect } from "react";

const SOURCES = ["bparts", "ovoko", "ecooparts", "recambioverde", "opisto"];

const SOURCE_META = {
  bparts:        { label: "BParts",         color: "#FF6B35", flag: "🇵🇹" },
  ovoko:         { label: "Ovoko",           color: "#4FC3F7", flag: "🇱🇹" },
  ecooparts:     { label: "Ecooparts",       color: "#69F0AE", flag: "🇪🇸" },
  recambioverde: { label: "RecambioVerde",   color: "#B2FF59", flag: "🇪🇸" },
  opisto:        { label: "Opisto",          color: "#CE93D8", flag: "🇫🇷" },
};

// Mock data generator for demo
function generateMockResults(oem) {
  if (!oem) return [];
  const parts = [
    { name: "Alternador", category: "Electricidad" },
    { name: "Bomba de agua", category: "Motor" },
    { name: "Compresor A/C", category: "Climatización" },
    { name: "Turbocompresor", category: "Motor" },
    { name: "Caja de cambios", category: "Transmisión" },
  ];
  const part = parts[Math.floor(Math.random() * parts.length)];

  return SOURCES.map((source) => {
    const hasResult = Math.random() > 0.2;
    if (!hasResult) return { source, available: false };
    const basePrice = 40 + Math.random() * 300;
    const listings = Math.floor(1 + Math.random() * 8);
    return {
      source,
      available: true,
      partName: part.name,
      category: part.category,
      oem,
      price_min: +(basePrice * 0.85).toFixed(2),
      price_avg: +basePrice.toFixed(2),
      price_max: +(basePrice * 1.3).toFixed(2),
      listings,
      condition: Math.random() > 0.4 ? "Usado" : "Reacondicionado",
      warranty: Math.random() > 0.5 ? "3 meses" : "Sin garantía",
      url: `https://${source}.com/search?ref=${oem}`,
      scraped_at: new Date().toISOString(),
    };
  });
}

const Spinner = () => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "60px 0" }}>
    <div className="spinner" />
    <span style={{ color: "#888", fontSize: 13, fontFamily: "monospace", letterSpacing: 2 }}>
      CONSULTANDO FUENTES...
    </span>
  </div>
);

const Tag = ({ children, color }) => (
  <span style={{
    background: color + "22",
    color,
    border: `1px solid ${color}44`,
    borderRadius: 4,
    padding: "2px 8px",
    fontSize: 11,
    fontFamily: "monospace",
    fontWeight: 700,
    letterSpacing: 1,
    whiteSpace: "nowrap",
  }}>{children}</span>
);

function PriceBar({ min, avg, max, globalMin, globalMax }) {
  const range = globalMax - globalMin || 1;
  const leftPct = ((min - globalMin) / range) * 100;
  const widthPct = ((max - min) / range) * 100;
  const avgPct = ((avg - globalMin) / range) * 100;
  return (
    <div style={{ position: "relative", height: 6, background: "#1a1a1a", borderRadius: 3, margin: "8px 0", minWidth: 120 }}>
      <div style={{
        position: "absolute", left: `${leftPct}%`, width: `${widthPct}%`,
        height: "100%", background: "linear-gradient(90deg, #FF6B3544, #FF6B35)",
        borderRadius: 3,
      }} />
      <div style={{
        position: "absolute", left: `${avgPct}%`, width: 2, height: "100%",
        background: "#fff", borderRadius: 2, transform: "translateX(-50%)",
      }} />
    </div>
  );
}

function SourceCard({ result, globalMin, globalMax, isLowest }) {
  const meta = SOURCE_META[result.source];
  return (
    <div style={{
      background: isLowest ? "#0d1f0d" : "#0f0f0f",
      border: `1px solid ${isLowest ? "#69F0AE33" : "#222"}`,
      borderRadius: 10,
      padding: "18px 20px",
      display: "flex",
      flexDirection: "column",
      gap: 10,
      position: "relative",
      transition: "border-color 0.2s",
    }}>
      {isLowest && (
        <div style={{
          position: "absolute", top: -1, right: 16,
          background: "#69F0AE", color: "#000",
          fontSize: 10, fontFamily: "monospace", fontWeight: 800,
          padding: "2px 10px", borderRadius: "0 0 6px 6px", letterSpacing: 2,
        }}>MEJOR PRECIO</div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>{meta.flag}</span>
          <span style={{ color: meta.color, fontFamily: "monospace", fontWeight: 700, fontSize: 13, letterSpacing: 1 }}>
            {meta.label}
          </span>
        </div>
        <Tag color={meta.color}>{result.listings} anuncio{result.listings !== 1 ? "s" : ""}</Tag>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
        <span style={{ fontSize: 28, fontWeight: 800, color: "#fff", fontFamily: "'Courier New', monospace" }}>
          {result.price_min.toFixed(2)}€
        </span>
        <span style={{ color: "#555", fontSize: 12 }}>mín</span>
      </div>
      <PriceBar min={result.price_min} avg={result.price_avg} max={result.price_max} globalMin={globalMin} globalMax={globalMax} />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#555", fontFamily: "monospace" }}>
        <span>Avg: <span style={{ color: "#888" }}>{result.price_avg.toFixed(2)}€</span></span>
        <span>Máx: <span style={{ color: "#888" }}>{result.price_max.toFixed(2)}€</span></span>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
        <Tag color="#888">{result.condition}</Tag>
        <Tag color="#888">{result.warranty}</Tag>
        <Tag color={meta.color}>{result.category}</Tag>
      </div>
      <a href={result.url} target="_blank" rel="noreferrer" style={{
        display: "block", textAlign: "center",
        marginTop: 4, padding: "8px", borderRadius: 6,
        background: meta.color + "15", color: meta.color,
        border: `1px solid ${meta.color}33`,
        fontSize: 11, fontFamily: "monospace", letterSpacing: 1,
        textDecoration: "none", fontWeight: 700,
        transition: "background 0.2s",
      }}>VER EN {meta.label.toUpperCase()} →</a>
    </div>
  );
}

function UnavailableCard({ source }) {
  const meta = SOURCE_META[source];
  return (
    <div style={{
      background: "#080808", border: "1px solid #161616",
      borderRadius: 10, padding: "18px 20px",
      display: "flex", flexDirection: "column", gap: 10, opacity: 0.5,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 18 }}>{meta.flag}</span>
        <span style={{ color: "#444", fontFamily: "monospace", fontWeight: 700, fontSize: 13, letterSpacing: 1 }}>
          {meta.label}
        </span>
      </div>
      <div style={{ color: "#333", fontSize: 12, fontFamily: "monospace" }}>
        — Sin resultados para esta referencia
      </div>
    </div>
  );
}

function HistoryRow({ entry, onReload }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "10px 16px", borderBottom: "1px solid #111",
      cursor: "pointer", transition: "background 0.15s",
    }}
      onClick={() => onReload(entry.oem)}
      onMouseEnter={e => e.currentTarget.style.background = "#111"}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
    >
      <span style={{ fontFamily: "monospace", color: "#FF6B35", fontSize: 12, fontWeight: 700, minWidth: 120 }}>
        {entry.oem}
      </span>
      <span style={{ color: "#555", fontSize: 11, flex: 1, fontFamily: "monospace" }}>
        {entry.timestamp}
      </span>
      <span style={{ color: "#444", fontSize: 11, fontFamily: "monospace" }}>
        {entry.found}/{entry.total} fuentes →
      </span>
    </div>
  );
}

export default function App() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [history, setHistory] = useState([]);
  const [searchedOem, setSearchedOem] = useState("");
  const [activeTab, setActiveTab] = useState("results");

  const handleSearch = async (oem) => {
    const ref = (oem || query).trim().toUpperCase();
    if (!ref) return;
    setLoading(true);
    setResults([]);
    setSearchedOem(ref);
    setActiveTab("results");
    await new Promise(r => setTimeout(r, 1800 + Math.random() * 800));
    const data = generateMockResults(ref);
    setResults(data);
    setHistory(prev => {
      const entry = {
        oem: ref,
        timestamp: new Date().toLocaleString("es-ES"),
        found: data.filter(r => r.available).length,
        total: SOURCES.length,
      };
      return [entry, ...prev.filter(h => h.oem !== ref)].slice(0, 20);
    });
    setLoading(false);
  };

  const available = results.filter(r => r.available);
  const unavailable = results.filter(r => !r.available);
  const globalMin = available.length ? Math.min(...available.map(r => r.price_min)) : 0;
  const globalMax = available.length ? Math.max(...available.map(r => r.price_max)) : 0;
  const lowestSource = available.length ? available.reduce((a, b) => a.price_min < b.price_min ? a : b).source : null;

  const spread = available.length > 1
    ? (((globalMax - globalMin) / globalMin) * 100).toFixed(0)
    : null;

  return (
    <div style={{
      minHeight: "100vh", background: "#070707",
      color: "#e0e0e0", fontFamily: "'Courier New', monospace",
      display: "flex", flexDirection: "column",
    }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::selection { background: #FF6B3533; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0a0a0a; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner {
          width: 36px; height: 36px;
          border: 2px solid #1a1a1a;
          border-top-color: #FF6B35;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .card-in { animation: fadeUp 0.3s ease forwards; }
        .search-input:focus { outline: none; border-color: #FF6B35 !important; }
        .tab-btn { cursor: pointer; border: none; background: transparent; transition: all 0.2s; }
      `}</style>

      {/* Header */}
      <div style={{
        borderBottom: "1px solid #141414",
        padding: "20px 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 36, height: 36, background: "#FF6B35",
            borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18,
          }}>♻</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: 3, color: "#fff" }}>
              DIGITAL RECYCLING
            </div>
            <div style={{ fontSize: 10, color: "#444", letterSpacing: 2 }}>
              PRICE INTELLIGENCE · RECAMBIOS
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {SOURCES.map(s => (
            <div key={s} style={{
              width: 8, height: 8, borderRadius: "50%",
              background: SOURCE_META[s].color,
              opacity: 0.7,
            }} title={SOURCE_META[s].label} />
          ))}
        </div>
      </div>

      {/* Search */}
      <div style={{
        padding: "32px 32px 0",
        borderBottom: "1px solid #111",
        background: "linear-gradient(180deg, #0c0c0c 0%, #070707 100%)",
      }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div style={{ fontSize: 11, color: "#444", letterSpacing: 3, marginBottom: 12 }}>
            BÚSQUEDA POR REFERENCIA OEM
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              className="search-input"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              placeholder="Ej: 036100098AX · 1J0199167K · 04L906088AB..."
              style={{
                flex: 1, background: "#0f0f0f",
                border: "1px solid #1e1e1e", borderRadius: 8,
                padding: "14px 18px", color: "#fff",
                fontSize: 14, fontFamily: "monospace",
                letterSpacing: 2,
              }}
            />
            <button
              onClick={() => handleSearch()}
              disabled={loading || !query.trim()}
              style={{
                padding: "14px 28px", borderRadius: 8,
                background: loading || !query.trim() ? "#1a1a1a" : "#FF6B35",
                color: loading || !query.trim() ? "#333" : "#000",
                border: "none", cursor: loading || !query.trim() ? "not-allowed" : "pointer",
                fontFamily: "monospace", fontWeight: 800, fontSize: 13, letterSpacing: 2,
                transition: "all 0.2s",
              }}
            >
              {loading ? "..." : "BUSCAR"}
            </button>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 0, marginTop: 24 }}>
            {[
              { id: "results", label: `RESULTADOS${available.length ? ` (${available.length})` : ""}` },
              { id: "history", label: `HISTORIAL (${history.length})` },
            ].map(tab => (
              <button key={tab.id} className="tab-btn"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: "10px 20px", fontSize: 11, letterSpacing: 2,
                  color: activeTab === tab.id ? "#FF6B35" : "#444",
                  borderBottom: activeTab === tab.id ? "2px solid #FF6B35" : "2px solid transparent",
                  fontFamily: "monospace", fontWeight: 700,
                }}
              >{tab.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: "28px 32px", maxWidth: 832, margin: "0 auto", width: "100%" }}>
        {activeTab === "history" ? (
          <div style={{ background: "#0a0a0a", border: "1px solid #161616", borderRadius: 10, overflow: "hidden" }}>
            {history.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "#333", fontSize: 12, letterSpacing: 2 }}>
                SIN BÚSQUEDAS AÚN
              </div>
            ) : history.map((entry, i) => (
              <HistoryRow key={i} entry={entry} onReload={handleSearch} />
            ))}
          </div>
        ) : loading ? (
          <Spinner />
        ) : results.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⬡</div>
            <div style={{ color: "#222", fontSize: 12, letterSpacing: 4 }}>
              INTRODUCE UNA REFERENCIA OEM PARA COMPARAR PRECIOS
            </div>
            <div style={{ color: "#181818", fontSize: 11, letterSpacing: 2, marginTop: 8 }}>
              {SOURCES.map(s => SOURCE_META[s].label).join(" · ")}
            </div>
          </div>
        ) : (
          <>
            {/* Summary bar */}
            {available.length > 0 && (
              <div style={{
                display: "flex", gap: 12, flexWrap: "wrap",
                padding: "14px 20px", background: "#0a0a0a",
                border: "1px solid #141414", borderRadius: 10, marginBottom: 20,
                alignItems: "center",
              }}>
                <span style={{ color: "#444", fontSize: 11, letterSpacing: 2, flex: 1 }}>
                  {searchedOem} · {available[0]?.partName}
                </span>
                <Tag color="#69F0AE">MÍNIMO {globalMin.toFixed(2)}€</Tag>
                <Tag color="#4FC3F7">MEDIA {(available.reduce((s, r) => s + r.price_avg, 0) / available.length).toFixed(2)}€</Tag>
                {spread && <Tag color="#FF6B35">SPREAD {spread}%</Tag>}
                <Tag color="#888">{available.length}/{SOURCES.length} FUENTES</Tag>
              </div>
            )}

            {/* Cards grid */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 14,
            }}>
              {available.map((r, i) => (
                <div key={r.source} className="card-in" style={{ animationDelay: `${i * 80}ms` }}>
                  <SourceCard
                    result={r}
                    globalMin={globalMin}
                    globalMax={globalMax}
                    isLowest={r.source === lowestSource}
                  />
                </div>
              ))}
              {unavailable.map((r, i) => (
                <div key={r.source} className="card-in" style={{ animationDelay: `${(available.length + i) * 80}ms` }}>
                  <UnavailableCard source={r.source} />
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{
        borderTop: "1px solid #0f0f0f", padding: "14px 32px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ fontSize: 10, color: "#222", letterSpacing: 2 }}>
          DIGITAL RECYCLING · PRICE INTELLIGENCE v1.0
        </span>
        <div style={{ display: "flex", gap: 16 }}>
          {SOURCES.map(s => (
            <span key={s} style={{ fontSize: 10, color: "#2a2a2a", letterSpacing: 1 }}>
              {SOURCE_META[s].label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
