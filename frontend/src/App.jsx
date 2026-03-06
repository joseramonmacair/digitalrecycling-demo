import { useState } from "react";

const SOURCES = ["bparts", "ovoko", "ecooparts", "recambioverde", "opisto"];

const SOURCE_META = {
  bparts:        { label: "BParts",       color: "#E85D04", bg: "#FFF3EE", flag: "🇵🇹" },
  ovoko:         { label: "Ovoko",        color: "#0077B6", bg: "#EEF6FF", flag: "🇱🇹" },
  ecooparts:     { label: "Ecooparts",    color: "#2D6A4F", bg: "#EEFBF4", flag: "🇪🇸" },
  recambioverde: { label: "RecambioVerde",color: "#386641", bg: "#EEF8EF", flag: "🇪🇸" },
  opisto:        { label: "Opisto",       color: "#7B2D8B", bg: "#F8EEFB", flag: "🇫🇷" },
};

function generateMockResults(oem) {
  if (!oem) return [];
  const parts = [
    { name: "Alternador", category: "Electricidad" },
    { name: "Bomba de agua", category: "Motor" },
    { name: "Compresor A/C", category: "Climatización" },
    { name: "Turbocompresor", category: "Motor" },
  ];
  const part = parts[Math.floor(Math.random() * parts.length)];
  return SOURCES.map((source) => {
    const hasResult = Math.random() > 0.2;
    if (!hasResult) return { source, available: false };
    const base = 40 + Math.random() * 300;
    return {
      source, available: true,
      partName: part.name, category: part.category, oem,
      price_min: +(base * 0.85).toFixed(2),
      price_avg: +base.toFixed(2),
      price_max: +(base * 1.3).toFixed(2),
      listings: Math.floor(1 + Math.random() * 8),
      condition: Math.random() > 0.4 ? "Usado" : "Reacondicionado",
      warranty: Math.random() > 0.5 ? "3 meses" : "Sin garantía",
      url: `https://${source}.com/search?ref=${oem}`,
    };
  });
}

const Badge = ({ children, color, bg }) => (
  <span style={{
    background: bg || color + "15",
    color,
    border: `1px solid ${color}30`,
    borderRadius: 20,
    padding: "3px 10px",
    fontSize: 11,
    fontWeight: 600,
    whiteSpace: "nowrap",
  }}>{children}</span>
);

function SourceCard({ result, globalMin, globalMax, isLowest }) {
  const meta = SOURCE_META[result.source];
  const range = globalMax - globalMin || 1;
  const leftPct = ((result.price_min - globalMin) / range) * 100;
  const widthPct = ((result.price_max - result.price_min) / range) * 100;
  const avgPct = ((result.price_avg - globalMin) / range) * 100;

  return (
    <div style={{
      background: "#fff",
      border: isLowest ? `2px solid ${meta.color}` : "1px solid #E5E7EB",
      borderRadius: 12,
      padding: 20,
      display: "flex", flexDirection: "column", gap: 12,
      boxShadow: isLowest ? `0 4px 20px ${meta.color}20` : "0 1px 4px rgba(0,0,0,0.06)",
      position: "relative",
    }}>
      {isLowest && (
        <div style={{
          position: "absolute", top: -1, right: 16,
          background: meta.color, color: "#fff",
          fontSize: 10, fontWeight: 800,
          padding: "3px 12px", borderRadius: "0 0 8px 8px", letterSpacing: 1,
        }}>MEJOR PRECIO</div>
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18,
          }}>{meta.flag}</div>
          <div>
            <div style={{ fontWeight: 700, color: meta.color, fontSize: 14 }}>{meta.label}</div>
            <div style={{ fontSize: 11, color: "#9CA3AF" }}>{result.listings} anuncio{result.listings !== 1 ? "s" : ""}</div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#111827" }}>
            {result.price_min.toFixed(2)}€
          </div>
          <div style={{ fontSize: 11, color: "#9CA3AF" }}>precio mínimo</div>
        </div>
      </div>

      {/* Price bar */}
      <div>
        <div style={{ position: "relative", height: 6, background: "#F3F4F6", borderRadius: 3 }}>
          <div style={{
            position: "absolute", left: `${leftPct}%`, width: `${Math.max(widthPct, 4)}%`,
            height: "100%", background: meta.color + "60", borderRadius: 3,
          }} />
          <div style={{
            position: "absolute", left: `${avgPct}%`, width: 3, height: "100%",
            background: meta.color, borderRadius: 2, transform: "translateX(-50%)",
          }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 11, color: "#6B7280" }}>
          <span>Mín: <strong>{result.price_min.toFixed(2)}€</strong></span>
          <span>Media: <strong>{result.price_avg.toFixed(2)}€</strong></span>
          <span>Máx: <strong>{result.price_max.toFixed(2)}€</strong></span>
        </div>
      </div>

      {/* Tags */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <Badge color="#6B7280" bg="#F9FAFB">{result.condition}</Badge>
        <Badge color="#6B7280" bg="#F9FAFB">{result.warranty}</Badge>
        <Badge color={meta.color} bg={meta.bg}>{result.category}</Badge>
      </div>

      <a href={result.url} target="_blank" rel="noreferrer" style={{
        display: "block", textAlign: "center",
        padding: "9px", borderRadius: 8,
        background: meta.bg, color: meta.color,
        border: `1px solid ${meta.color}30`,
        fontSize: 12, fontWeight: 700,
        textDecoration: "none",
      }}>Ver en {meta.label} →</a>
    </div>
  );
}

function UnavailableCard({ source }) {
  const meta = SOURCE_META[source];
  return (
    <div style={{
      background: "#FAFAFA", border: "1px solid #F3F4F6",
      borderRadius: 12, padding: 20,
      display: "flex", alignItems: "center", gap: 12, opacity: 0.5,
    }}>
      <div style={{ fontSize: 24 }}>{meta.flag}</div>
      <div>
        <div style={{ fontWeight: 600, color: "#9CA3AF", fontSize: 13 }}>{meta.label}</div>
        <div style={{ fontSize: 12, color: "#D1D5DB" }}>Sin resultados</div>
      </div>
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

    // TODO: reemplazar mock por llamada real al backend
    await new Promise(r => setTimeout(r, 1500));
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
  const avgAll = available.length ? (available.reduce((s, r) => s + r.price_avg, 0) / available.length).toFixed(2) : null;
  const spread = available.length > 1 ? (((globalMax - globalMin) / globalMin) * 100).toFixed(0) : null;

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", color: "#111827", fontFamily: "'Inter', 'Helvetica Neue', sans-serif" }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner { width: 32px; height: 32px; border: 3px solid #E5E7EB; border-top-color: #E85D04; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .card-in { animation: fadeUp 0.25s ease forwards; }
        input:focus { outline: none; border-color: #E85D04 !important; box-shadow: 0 0 0 3px #E85D0415; }
        button:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
        button { transition: all 0.15s; }
      `}</style>

      {/* Header */}
      <div style={{
        background: "#fff", borderBottom: "1px solid #E5E7EB",
        padding: "0 32px", display: "flex", alignItems: "center",
        justifyContent: "space-between", height: 64,
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 38, height: 38, background: "#E85D04",
            borderRadius: 10, display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 20,
          }}>♻</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: "#111827", letterSpacing: -0.3 }}>
              Digital Recycling
            </div>
            <div style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500 }}>
              Price Intelligence · Recambios
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {SOURCES.map(s => (
            <span key={s} style={{
              background: SOURCE_META[s].bg,
              color: SOURCE_META[s].color,
              border: `1px solid ${SOURCE_META[s].color}30`,
              borderRadius: 20, padding: "3px 10px",
              fontSize: 11, fontWeight: 600,
            }}>{SOURCE_META[s].label}</span>
          ))}
        </div>
      </div>

      {/* Search bar */}
      <div style={{ background: "#fff", borderBottom: "1px solid #E5E7EB", padding: "20px 32px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div style={{ fontSize: 12, color: "#6B7280", fontWeight: 600, marginBottom: 10, letterSpacing: 0.5 }}>
            BÚSQUEDA POR REFERENCIA OEM
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              placeholder="Ej: 036100098AX · 1J0199167K · 04L906088AB"
              style={{
                flex: 1, border: "1.5px solid #E5E7EB", borderRadius: 10,
                padding: "12px 16px", fontSize: 14, color: "#111827",
                background: "#F9FAFB", transition: "all 0.2s",
              }}
            />
            <button
              onClick={() => handleSearch()}
              disabled={loading || !query.trim()}
              style={{
                padding: "12px 28px", borderRadius: 10,
                background: loading || !query.trim() ? "#E5E7EB" : "#E85D04",
                color: loading || !query.trim() ? "#9CA3AF" : "#fff",
                border: "none", cursor: loading || !query.trim() ? "not-allowed" : "pointer",
                fontWeight: 700, fontSize: 14,
              }}
            >{loading ? "Buscando..." : "Buscar"}</button>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 0, marginTop: 16, borderBottom: "1px solid #E5E7EB" }}>
            {[
              { id: "results", label: `Resultados${available.length ? ` (${available.length})` : ""}` },
              { id: "history", label: `Historial (${history.length})` },
            ].map(tab => (
              <button key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: "8px 16px", fontSize: 13, fontWeight: 600,
                  color: activeTab === tab.id ? "#E85D04" : "#6B7280",
                  borderBottom: activeTab === tab.id ? "2px solid #E85D04" : "2px solid transparent",
                  border: "none", background: "none", cursor: "pointer",
                  marginBottom: -1,
                }}
              >{tab.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 864, margin: "0 auto", padding: "24px 32px" }}>

        {activeTab === "history" ? (
          <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, overflow: "hidden" }}>
            {history.length === 0 ? (
              <div style={{ padding: 48, textAlign: "center", color: "#9CA3AF", fontSize: 14 }}>
                Sin búsquedas anteriores
              </div>
            ) : history.map((entry, i) => (
              <div key={i}
                onClick={() => handleSearch(entry.oem)}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 20px", borderBottom: "1px solid #F3F4F6",
                  cursor: "pointer", transition: "background 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "#F9FAFB"}
                onMouseLeave={e => e.currentTarget.style.background = "#fff"}
              >
                <span style={{ fontWeight: 700, color: "#E85D04", minWidth: 130, fontSize: 13 }}>{entry.oem}</span>
                <span style={{ color: "#9CA3AF", fontSize: 12, flex: 1 }}>{entry.timestamp}</span>
                <span style={{ color: "#6B7280", fontSize: 12 }}>{entry.found}/{entry.total} fuentes →</span>
              </div>
            ))}
          </div>

        ) : loading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "80px 0" }}>
            <div className="spinner" />
            <div style={{ color: "#6B7280", fontSize: 13, fontWeight: 500 }}>
              Consultando {SOURCES.length} fuentes en paralelo...
            </div>
          </div>

        ) : results.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
            <div style={{ color: "#374151", fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
              Introduce una referencia OEM para comparar precios
            </div>
            <div style={{ color: "#9CA3AF", fontSize: 13 }}>
              {SOURCES.map(s => SOURCE_META[s].label).join(" · ")}
            </div>
          </div>

        ) : (
          <>
            {/* Summary */}
            {available.length > 0 && (
              <div style={{
                display: "flex", gap: 12, flexWrap: "wrap",
                padding: "14px 20px", background: "#fff",
                border: "1px solid #E5E7EB", borderRadius: 12, marginBottom: 20,
                alignItems: "center",
              }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 700, color: "#111827", fontSize: 14 }}>{searchedOem}</span>
                  <span style={{ color: "#9CA3AF", fontSize: 13 }}> · {available[0]?.partName}</span>
                </div>
                <Badge color="#2D6A4F" bg="#EEFBF4">Mínimo {globalMin.toFixed(2)}€</Badge>
                <Badge color="#0077B6" bg="#EEF6FF">Media {avgAll}€</Badge>
                {spread && <Badge color="#E85D04" bg="#FFF3EE">Spread {spread}%</Badge>}
                <Badge color="#6B7280" bg="#F9FAFB">{available.length}/{SOURCES.length} fuentes</Badge>
              </div>
            )}

            {/* Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
              {available.map((r, i) => (
                <div key={r.source} className="card-in" style={{ animationDelay: `${i * 60}ms` }}>
                  <SourceCard result={r} globalMin={globalMin} globalMax={globalMax} isLowest={r.source === lowestSource} />
                </div>
              ))}
              {unavailable.map((r, i) => (
                <div key={r.source} className="card-in" style={{ animationDelay: `${(available.length + i) * 60}ms` }}>
                  <UnavailableCard source={r.source} />
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{
        borderTop: "1px solid #E5E7EB", padding: "14px 32px", background: "#fff",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginTop: 40,
      }}>
        <span style={{ fontSize: 12, color: "#9CA3AF" }}>Digital Recycling · Price Intelligence v1.0</span>
        <span style={{ fontSize: 12, color: "#D1D5DB" }}>Datos orientativos · Actualización bajo demanda</span>
      </div>
    </div>
  );
}
