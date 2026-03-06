import { useState } from "react";

// El Choque va primero, es el socio
const SOURCES = ["elchoque", "bparts", "ovoko", "ecooparts", "recambioverde", "opisto"];

const SOURCE_META = {
  elchoque:      { label: "El Choque",     color: "#C41E3A", bg: "#FFF0F2", flag: "🇪🇸", partner: true,  url: "https://www.elchoque.com" },
  bparts:        { label: "BParts",        color: "#E85D04", bg: "#FFF3EE", flag: "🇵🇹", partner: false, url: "https://www.bparts.pt" },
  ovoko:         { label: "Ovoko",         color: "#0077B6", bg: "#EEF6FF", flag: "🇱🇹", partner: false, url: "https://www.ovoko.es" },
  ecooparts:     { label: "Ecooparts",     color: "#2D6A4F", bg: "#EEFBF4", flag: "🇪🇸", partner: false, url: "https://www.ecooparts.com" },
  recambioverde: { label: "RecambioVerde", color: "#386641", bg: "#EEF8EF", flag: "🇪🇸", partner: false, url: "https://www.recambioverde.es" },
  opisto:        { label: "Opisto",        color: "#7B2D8B", bg: "#F8EEFB", flag: "🇫🇷", partner: false, url: "https://www.opisto.com" },
};

// URL de búsqueda por fuente
function buildSearchUrl(source, query, mode) {
  const encoded = encodeURIComponent(query);
  const urls = {
    elchoque:      `https://www.elchoque.com/buscar?s=${encoded}`,
    bparts:        `https://www.bparts.pt/en/search?q=${encoded}`,
    ovoko:         `https://www.ovoko.es/buscar?q=${encoded}${mode === "oem" ? "&type=oem" : ""}`,
    ecooparts:     `https://www.ecooparts.com/es/buscar?q=${encoded}`,
    recambioverde: `https://www.recambioverde.es/buscar/${encoded}`,
    opisto:        `https://www.opisto.com/es/buscar?ref=${encoded}`,
  };
  return urls[source] || "#";
}

// ─── Mock data ────────────────────────────────────────────────
function generateMockResults(query, mode) {
  const parts = ["Alternador", "Bomba de agua", "Puerta delantera derecha", "Turbocompresor", "Faro delantero izquierdo"];
  const cats  = ["Electricidad", "Motor", "Carrocería", "Motor", "Iluminación"];
  const idx   = Math.floor(Math.random() * parts.length);

  return SOURCES.map(source => {
    // El Choque siempre tiene resultado en la demo (es el socio)
    const hasResult = source === "elchoque" ? true : Math.random() > 0.2;
    if (!hasResult) return { source, available: false };

    const base = source === "elchoque"
      ? 35 + Math.random() * 200   // El Choque suele ser competitivo
      : 40 + Math.random() * 300;

    return {
      source, available: true,
      partName: parts[idx], category: cats[idx], query,
      price_min: +(base * 0.85).toFixed(2),
      price_avg: +base.toFixed(2),
      price_max: +(base * 1.3).toFixed(2),
      listings: source === "elchoque" ? Math.floor(2 + Math.random() * 6) : Math.floor(1 + Math.random() * 8),
      condition: Math.random() > 0.4 ? "Usado" : "Reacondicionado",
      warranty: source === "elchoque" ? "3 meses" : (Math.random() > 0.5 ? "3 meses" : "Sin garantía"),
      url: buildSearchUrl(source, query, mode),
      mode,
    };
  });
}

// ─── Claude IA para extracción OEM ───────────────────────────
async function extractWithAI(userQuery) {
  const systemPrompt = `Eres un experto en recambios de automoción.
Analiza la búsqueda en lenguaje natural y devuelve SOLO un JSON válido con esta estructura:
{
  "marca": "string o null",
  "modelo": "string o null",
  "año": "string o null",
  "pieza": "string",
  "query_normalizada": "string con la búsqueda limpia y normalizada para un marketplace",
  "oem_probable": "string o null (referencia OEM si la conoces con seguridad)",
  "confianza_oem": "alta|media|baja|ninguna"
}
No incluyas explicaciones ni markdown, solo el JSON puro.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: "user", content: userQuery }],
    }),
  });
  const data = await response.json();
  const text = data.content?.[0]?.text || "{}";
  try {
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch {
    return { pieza: userQuery, query_normalizada: userQuery, oem_probable: null, confianza_oem: "ninguna" };
  }
}

// ─── Componentes ─────────────────────────────────────────────
const Badge = ({ children, color, bg }) => (
  <span style={{
    background: bg || color + "15", color,
    border: `1px solid ${color}30`,
    borderRadius: 20, padding: "3px 10px",
    fontSize: 11, fontWeight: 600, whiteSpace: "nowrap",
  }}>{children}</span>
);

function AIExtractionPanel({ extraction, usedOem }) {
  if (!extraction) return null;
  return (
    <div style={{
      background: "linear-gradient(135deg, #EEF6FF 0%, #F8EEFB 100%)",
      border: "1px solid #BFDBFE", borderRadius: 12,
      padding: "14px 18px", marginBottom: 16,
      display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginRight: 4 }}>
        <span style={{ fontSize: 16 }}>🤖</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#1E40AF" }}>IA identificó:</span>
      </div>
      {extraction.marca  && <Badge color="#0077B6" bg="#EEF6FF">{extraction.marca}</Badge>}
      {extraction.modelo && <Badge color="#0077B6" bg="#EEF6FF">{extraction.modelo}</Badge>}
      {extraction.año    && <Badge color="#0077B6" bg="#EEF6FF">{extraction.año}</Badge>}
      {extraction.pieza  && <Badge color="#7B2D8B" bg="#F8EEFB">{extraction.pieza}</Badge>}
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
        {usedOem ? (
          <>
            <span style={{ fontSize: 11, color: "#2D6A4F", fontWeight: 600 }}>✓ OEM:</span>
            <Badge color="#2D6A4F" bg="#EEFBF4">{extraction.oem_probable}</Badge>
            <Badge color="#2D6A4F" bg="#EEFBF4">Búsqueda exacta</Badge>
          </>
        ) : (
          <Badge color="#E85D04" bg="#FFF3EE">Búsqueda por texto libre</Badge>
        )}
      </div>
    </div>
  );
}

function PartnerBanner({ result }) {
  const meta = SOURCE_META[result.source];
  return (
    <div style={{
      background: "linear-gradient(135deg, #FFF0F2 0%, #fff 100%)",
      border: `2px solid ${meta.color}`,
      borderRadius: 14, padding: "20px 24px",
      display: "flex", gap: 20, alignItems: "center",
      boxShadow: `0 6px 30px ${meta.color}18`,
      marginBottom: 20, position: "relative", overflow: "hidden",
    }}>
      {/* Fondo decorativo */}
      <div style={{
        position: "absolute", right: -20, top: -20,
        width: 120, height: 120, borderRadius: "50%",
        background: meta.color + "08",
      }} />

      <div style={{ flexShrink: 0 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 12,
          background: meta.bg, border: `2px solid ${meta.color}30`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 28,
        }}>🏭</div>
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ fontWeight: 800, fontSize: 16, color: meta.color }}>Desguaces El Choque</span>
          <span style={{
            background: meta.color, color: "#fff",
            borderRadius: 20, padding: "2px 10px",
            fontSize: 10, fontWeight: 800, letterSpacing: 1,
          }}>SOCIO PREFERENTE</span>
        </div>
        <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 12 }}>
          Madrid · Desguace certificado · {result.listings} piezas disponibles · Garantía {result.warranty}
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#111827", lineHeight: 1 }}>
              {result.price_min.toFixed(2)}€
            </div>
            <div style={{ fontSize: 11, color: "#9CA3AF" }}>desde (precio mínimo)</div>
          </div>
          <div style={{ height: 36, width: 1, background: "#E5E7EB" }} />
          <div style={{ fontSize: 12, color: "#6B7280" }}>
            <div>Media: <strong>{result.price_avg.toFixed(2)}€</strong></div>
            <div>Máx: <strong>{result.price_max.toFixed(2)}€</strong></div>
          </div>
          <div style={{ marginLeft: "auto" }}>
            <a href={result.url} target="_blank" rel="noreferrer" style={{
              display: "inline-block", padding: "10px 22px", borderRadius: 8,
              background: meta.color, color: "#fff",
              fontSize: 13, fontWeight: 700, textDecoration: "none",
            }}>Ver en El Choque →</a>
          </div>
        </div>
      </div>
    </div>
  );
}

function SourceCard({ result, globalMin, globalMax, isLowest }) {
  const meta = SOURCE_META[result.source];
  const range    = globalMax - globalMin || 1;
  const leftPct  = ((result.price_min - globalMin) / range) * 100;
  const widthPct = ((result.price_max - result.price_min) / range) * 100;
  const avgPct   = ((result.price_avg - globalMin) / range) * 100;

  return (
    <div style={{
      background: "#fff",
      border: isLowest ? `2px solid ${meta.color}` : "1px solid #E5E7EB",
      borderRadius: 12, padding: 20,
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8, background: meta.bg,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
          }}>{meta.flag}</div>
          <div>
            <div style={{ fontWeight: 700, color: meta.color, fontSize: 14 }}>{meta.label}</div>
            <div style={{ fontSize: 11, color: "#9CA3AF" }}>{result.listings} anuncio{result.listings !== 1 ? "s" : ""}</div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#111827" }}>{result.price_min.toFixed(2)}€</div>
          <div style={{ fontSize: 11, color: "#9CA3AF" }}>precio mínimo</div>
        </div>
      </div>
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
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <Badge color="#6B7280" bg="#F9FAFB">{result.condition}</Badge>
        <Badge color="#6B7280" bg="#F9FAFB">{result.warranty}</Badge>
        <Badge color={meta.color} bg={meta.bg}>{result.category}</Badge>
      </div>
      <a href={result.url} target="_blank" rel="noreferrer" style={{
        display: "block", textAlign: "center", padding: "9px", borderRadius: 8,
        background: meta.bg, color: meta.color, border: `1px solid ${meta.color}30`,
        fontSize: 12, fontWeight: 700, textDecoration: "none",
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
      display: "flex", alignItems: "center", gap: 12, opacity: 0.45,
    }}>
      <div style={{ fontSize: 24 }}>{meta.flag}</div>
      <div>
        <div style={{ fontWeight: 600, color: "#9CA3AF", fontSize: 13 }}>{meta.label}</div>
        <div style={{ fontSize: 12, color: "#D1D5DB" }}>Sin resultados</div>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────
export default function App() {
  const [mode, setMode]             = useState("oem");
  const [query, setQuery]           = useState("");
  const [loading, setLoading]       = useState(false);
  const [aiStep, setAiStep]         = useState("");
  const [extraction, setExtraction] = useState(null);
  const [usedOem, setUsedOem]       = useState(false);
  const [results, setResults]       = useState([]);
  const [history, setHistory]       = useState([]);
  const [searchedLabel, setSearchedLabel] = useState("");
  const [activeTab, setActiveTab]   = useState("results");

  const handleSearch = async (overrideQuery, overrideMode) => {
    const q = (overrideQuery || query).trim();
    const m = overrideMode || mode;
    if (!q) return;

    setLoading(true);
    setResults([]);
    setExtraction(null);
    setUsedOem(false);
    setActiveTab("results");

    if (m === "oem") {
      const ref = q.toUpperCase();
      setSearchedLabel(ref);
      setAiStep("");
      await new Promise(r => setTimeout(r, 1400));
      const data = generateMockResults(ref, "oem");
      setResults(data);
      addHistory(ref, data, m);

    } else {
      setSearchedLabel(q);
      setAiStep("🤖 Analizando búsqueda con IA...");
      await new Promise(r => setTimeout(r, 300));

      let ext = null;
      try {
        ext = await extractWithAI(q);
        setExtraction(ext);
      } catch {
        ext = { pieza: q, query_normalizada: q, oem_probable: null, confianza_oem: "ninguna" };
        setExtraction(ext);
      }

      const hasOem = ext?.oem_probable && ["alta", "media"].includes(ext?.confianza_oem);
      setUsedOem(hasOem);

      if (hasOem) {
        setAiStep(`✓ OEM identificada: ${ext.oem_probable} — buscando en marketplaces...`);
        await new Promise(r => setTimeout(r, 1200));
        const data = generateMockResults(ext.oem_probable, "oem");
        setResults(data);
        addHistory(`${q} → ${ext.oem_probable}`, data, m);
      } else {
        setAiStep(`🔍 Buscando "${ext?.query_normalizada || q}" en todos los marketplaces...`);
        await new Promise(r => setTimeout(r, 1400));
        const data = generateMockResults(ext?.query_normalizada || q, "text");
        setResults(data);
        addHistory(q, data, m);
      }
      setAiStep("");
    }

    setLoading(false);
  };

  const addHistory = (label, data, m) => {
    setHistory(prev => {
      const entry = {
        label, mode: m,
        timestamp: new Date().toLocaleString("es-ES"),
        found: data.filter(r => r.available).length,
        total: SOURCES.length,
      };
      return [entry, ...prev.filter(h => h.label !== label)].slice(0, 20);
    });
  };

  // Separar El Choque del resto
  const elChoqueResult  = results.find(r => r.source === "elchoque");
  const otherResults    = results.filter(r => r.source !== "elchoque");
  const available       = otherResults.filter(r => r.available);
  const unavailable     = otherResults.filter(r => !r.available);
  const allAvailable    = results.filter(r => r.available);
  const globalMin       = allAvailable.length ? Math.min(...allAvailable.map(r => r.price_min)) : 0;
  const globalMax       = allAvailable.length ? Math.max(...allAvailable.map(r => r.price_max)) : 0;
  const lowestSrc       = allAvailable.length ? allAvailable.reduce((a, b) => a.price_min < b.price_min ? a : b).source : null;
  const avgAll          = allAvailable.length ? (allAvailable.reduce((s, r) => s + r.price_avg, 0) / allAvailable.length).toFixed(2) : null;
  const spread          = allAvailable.length > 1 ? (((globalMax - globalMin) / globalMin) * 100).toFixed(0) : null;
  const accentColor     = mode === "text" ? "#0077B6" : "#C41E3A";

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", fontFamily: "'Inter','Helvetica Neue',sans-serif", color: "#111827" }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner { width:32px;height:32px;border:3px solid #E5E7EB;border-top-color:#C41E3A;border-radius:50%;animation:spin 0.8s linear infinite; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .card-in { animation: fadeUp 0.25s ease forwards; }
        input:focus { outline:none;border-color:${accentColor} !important;box-shadow:0 0 0 3px ${accentColor}15; }
        button { transition:all 0.15s; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        .pulsing { animation: pulse 1.2s ease-in-out infinite; }
      `}</style>

      {/* Header */}
      <div style={{
        background: "#fff", borderBottom: "1px solid #E5E7EB",
        padding: "0 32px", height: 64,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 38, height: 38, background: "#C41E3A", borderRadius: 10,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
          }}>♻</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: "#111827", letterSpacing: -0.3 }}>Digital Recycling</div>
            <div style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500 }}>Price Intelligence · Recambios</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {/* El Choque destacado en el header */}
          <span style={{
            background: "#FFF0F2", color: "#C41E3A",
            border: "1px solid #C41E3A30",
            borderRadius: 20, padding: "3px 12px",
            fontSize: 11, fontWeight: 700,
            display: "flex", alignItems: "center", gap: 4,
          }}>🏭 El Choque</span>
          <span style={{ color: "#D1D5DB", fontSize: 12 }}>+</span>
          {SOURCES.filter(s => s !== "elchoque").map(s => (
            <span key={s} style={{
              background: SOURCE_META[s].bg, color: SOURCE_META[s].color,
              border: `1px solid ${SOURCE_META[s].color}30`,
              borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600,
            }}>{SOURCE_META[s].label}</span>
          ))}
        </div>
      </div>

      {/* Search */}
      <div style={{ background: "#fff", borderBottom: "1px solid #E5E7EB", padding: "20px 32px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>

          {/* Mode toggle */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {[
              { id: "oem",  icon: "🔩", label: "Referencia OEM",   desc: "Búsqueda exacta por código" },
              { id: "text", icon: "💬", label: "Lenguaje natural",  desc: "Con asistencia de IA" },
            ].map(m => (
              <button key={m.id}
                onClick={() => { setMode(m.id); setQuery(""); setResults([]); setExtraction(null); }}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 18px", borderRadius: 10, cursor: "pointer",
                  background: mode === m.id ? (m.id === "text" ? "#EEF6FF" : "#FFF0F2") : "#F9FAFB",
                  border: mode === m.id
                    ? `2px solid ${m.id === "text" ? "#0077B6" : "#C41E3A"}`
                    : "2px solid #E5E7EB",
                  flex: 1,
                }}>
                <span style={{ fontSize: 20 }}>{m.icon}</span>
                <div style={{ textAlign: "left" }}>
                  <div style={{
                    fontWeight: 700, fontSize: 13,
                    color: mode === m.id ? (m.id === "text" ? "#0077B6" : "#C41E3A") : "#374151",
                  }}>{m.label}</div>
                  <div style={{ fontSize: 11, color: "#9CA3AF" }}>{m.desc}</div>
                </div>
                {m.id === "text" && (
                  <span style={{ marginLeft: "auto", background: "#DBEAFE", color: "#1D4ED8", borderRadius: 20, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>IA</span>
                )}
              </button>
            ))}
          </div>

          {/* Input */}
          <div style={{ display: "flex", gap: 10 }}>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              placeholder={mode === "oem"
                ? "Ej: 036100098AX · 1J0199167K · 04L906088AB"
                : "Ej: puerta delantera derecha Ford Escort 1998 · alternador Seat Ibiza 1.9 TDI"}
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
                padding: "12px 28px", borderRadius: 10, border: "none",
                background: loading || !query.trim() ? "#E5E7EB" : (mode === "text" ? "#0077B6" : "#C41E3A"),
                color: loading || !query.trim() ? "#9CA3AF" : "#fff",
                cursor: loading || !query.trim() ? "not-allowed" : "pointer",
                fontWeight: 700, fontSize: 14, whiteSpace: "nowrap",
              }}
            >{loading ? "Buscando..." : "Buscar"}</button>
          </div>

          {/* AI status */}
          {aiStep && (
            <div className="pulsing" style={{
              marginTop: 10, padding: "8px 14px",
              background: "#EEF6FF", borderRadius: 8,
              fontSize: 12, color: "#1E40AF", fontWeight: 500,
            }}>{aiStep}</div>
          )}

          {/* Tabs */}
          <div style={{ display: "flex", marginTop: 16, borderBottom: "1px solid #E5E7EB" }}>
            {[
              { id: "results", label: `Resultados${allAvailable.length ? ` (${allAvailable.length})` : ""}` },
              { id: "history", label: `Historial (${history.length})` },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                padding: "8px 16px", fontSize: 13, fontWeight: 600, border: "none",
                color: activeTab === tab.id ? accentColor : "#6B7280",
                borderBottom: activeTab === tab.id ? `2px solid ${accentColor}` : "2px solid transparent",
                background: "none", cursor: "pointer", marginBottom: -1,
              }}>{tab.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 32px" }}>

        {activeTab === "history" ? (
          <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, overflow: "hidden" }}>
            {history.length === 0 ? (
              <div style={{ padding: 48, textAlign: "center", color: "#9CA3AF", fontSize: 14 }}>Sin búsquedas anteriores</div>
            ) : history.map((entry, i) => (
              <div key={i}
                onClick={() => { setMode(entry.mode); setQuery(entry.label); handleSearch(entry.label, entry.mode); }}
                style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", padding: "12px 20px", borderBottom: "1px solid #F3F4F6", transition: "background 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.background = "#F9FAFB"}
                onMouseLeave={e => e.currentTarget.style.background = "#fff"}
              >
                <span style={{ fontSize: 14 }}>{entry.mode === "text" ? "💬" : "🔩"}</span>
                <span style={{ fontWeight: 600, color: "#374151", flex: 1, fontSize: 13 }}>{entry.label}</span>
                <span style={{ color: "#9CA3AF", fontSize: 12 }}>{entry.timestamp}</span>
                <span style={{ color: "#6B7280", fontSize: 12 }}>{entry.found}/{entry.total} fuentes →</span>
              </div>
            ))}
          </div>

        ) : loading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "80px 0" }}>
            <div className="spinner" />
            <div style={{ color: "#6B7280", fontSize: 13, fontWeight: 500 }}>
              {mode === "text" ? "Analizando con IA y consultando fuentes..." : `Consultando ${SOURCES.length} marketplaces en paralelo...`}
            </div>
          </div>

        ) : results.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>{mode === "text" ? "💬" : "🔍"}</div>
            <div style={{ color: "#374151", fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
              {mode === "text"
                ? "Describe la pieza que buscas en lenguaje natural"
                : "Introduce una referencia OEM para comparar precios"}
            </div>
            <div style={{ color: "#9CA3AF", fontSize: 13, marginBottom: 24 }}>
              El Choque · {SOURCES.filter(s => s !== "elchoque").map(s => SOURCE_META[s].label).join(" · ")}
            </div>
            {mode === "text" && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                {[
                  "puerta delantera derecha Ford Escort 1998",
                  "alternador Seat Ibiza 1.9 TDI 2003",
                  "faro delantero izquierdo VW Golf IV",
                  "bomba agua Renault Megane 1.5 dCi",
                ].map(ex => (
                  <button key={ex} onClick={() => { setQuery(ex); handleSearch(ex); }}
                    style={{
                      padding: "8px 14px", borderRadius: 20, cursor: "pointer",
                      background: "#EEF6FF", color: "#0077B6",
                      border: "1px solid #BFDBFE", fontSize: 12, fontWeight: 500,
                    }}>{ex}</button>
                ))}
              </div>
            )}
          </div>

        ) : (
          <>
            {/* Panel IA */}
            {mode === "text" && <AIExtractionPanel extraction={extraction} usedOem={usedOem} />}

            {/* Summary */}
            {allAvailable.length > 0 && (
              <div style={{
                display: "flex", gap: 12, flexWrap: "wrap",
                padding: "14px 20px", background: "#fff",
                border: "1px solid #E5E7EB", borderRadius: 12, marginBottom: 20,
                alignItems: "center",
              }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 700, color: "#111827", fontSize: 14 }}>{searchedLabel}</span>
                  {allAvailable[0]?.partName && <span style={{ color: "#9CA3AF", fontSize: 13 }}> · {allAvailable[0].partName}</span>}
                </div>
                <Badge color="#2D6A4F" bg="#EEFBF4">Mínimo {globalMin.toFixed(2)}€</Badge>
                <Badge color="#0077B6" bg="#EEF6FF">Media {avgAll}€</Badge>
                {spread && <Badge color="#C41E3A" bg="#FFF0F2">Spread {spread}%</Badge>}
                <Badge color="#6B7280" bg="#F9FAFB">{allAvailable.length}/{SOURCES.length} fuentes</Badge>
              </div>
            )}

            {/* ★ El Choque primero — banner destacado */}
            {elChoqueResult?.available && (
              <div className="card-in">
                <PartnerBanner result={elChoqueResult} />
              </div>
            )}

            {/* Separador */}
            {elChoqueResult?.available && available.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div style={{ flex: 1, height: 1, background: "#E5E7EB" }} />
                <span style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 600, whiteSpace: "nowrap" }}>OTROS MARKETPLACES</span>
                <div style={{ flex: 1, height: 1, background: "#E5E7EB" }} />
              </div>
            )}

            {/* Resto de fuentes */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
              {available.map((r, i) => (
                <div key={r.source} className="card-in" style={{ animationDelay: `${i * 60}ms` }}>
                  <SourceCard result={r} globalMin={globalMin} globalMax={globalMax} isLowest={r.source === lowestSrc} />
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
        borderTop: "1px solid #E5E7EB", padding: "14px 32px",
        background: "#fff", marginTop: 40,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ fontSize: 12, color: "#9CA3AF" }}>Digital Recycling · Price Intelligence v1.2</span>
        <span style={{ fontSize: 12, color: "#D1D5DB" }}>El Choque · OEM · Lenguaje natural IA · 6 marketplaces</span>
      </div>
    </div>
  );
}
