import { useState } from "react";

const SOURCES = ["elchoque", "bparts", "ovoko", "ecooparts", "recambioverde", "opisto"];

const SOURCE_META = {
  elchoque:      { label: "El Choque",     color: "#C41E3A", bg: "#FFF0F2", flag: "🇪🇸", url: "https://www.elchoque.com" },
  bparts:        { label: "BParts",        color: "#1B2A4A", bg: "#EEF2FA", flag: "🇵🇹", url: "https://www.bparts.pt" },
  ovoko:         { label: "Ovoko",         color: "#0077B6", bg: "#EEF6FF", flag: "🇱🇹", url: "https://www.ovoko.es" },
  ecooparts:     { label: "Ecooparts",     color: "#2D6A4F", bg: "#EEFBF4", flag: "🇪🇸", url: "https://www.ecooparts.com" },
  recambioverde: { label: "RecambioVerde", color: "#386641", bg: "#EEF8EF", flag: "🇪🇸", url: "https://www.recambioverde.es" },
  opisto:        { label: "Opisto",        color: "#7B2D8B", bg: "#F8EEFB", flag: "🇫🇷", url: "https://www.opisto.com" },
};

// CIO4YOU palette
const NAVY  = "#1B2A4A";
const GOLD  = "#C49A1A";
const LGOLD = "#F9F3E0";

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

function generateMockResults(query, mode) {
  const parts = ["Alternador", "Bomba de agua", "Puerta delantera derecha", "Turbocompresor", "Faro delantero izquierdo"];
  const cats  = ["Electricidad", "Motor", "Carrocería", "Motor", "Iluminación"];
  const idx   = Math.floor(Math.random() * parts.length);
  return SOURCES.map(source => {
    const hasResult = source === "elchoque" ? true : Math.random() > 0.2;
    if (!hasResult) return { source, available: false };
    const base = source === "elchoque" ? 35 + Math.random() * 200 : 40 + Math.random() * 300;
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

async function extractWithAI(userQuery) {
  const systemPrompt = `Eres un experto en recambios de automoción.
Analiza la búsqueda y devuelve SOLO un JSON con esta estructura:
{
  "marca": "string o null",
  "modelo": "string o null",
  "año": "string o null",
  "pieza": "string",
  "query_normalizada": "string",
  "oem_probable": "string o null",
  "confianza_oem": "alta|media|baja|ninguna"
}`;
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

const Badge = ({ children, color, bg }) => (
  <span style={{
    background: bg || color + "15", color,
    border: `1px solid ${color}30`,
    borderRadius: 4, padding: "3px 10px",
    fontSize: 11, fontWeight: 600, whiteSpace: "nowrap",
  }}>{children}</span>
);

function AIExtractionPanel({ extraction, usedOem }) {
  if (!extraction) return null;
  return (
    <div style={{
      background: "#EEF2FA", border: `1px solid ${NAVY}22`,
      borderRadius: 10, padding: "12px 16px", marginBottom: 16,
      display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginRight: 4 }}>
        <span style={{ fontSize: 15 }}>🤖</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: NAVY }}>IA identificó:</span>
      </div>
      {extraction.marca  && <Badge color={NAVY} bg="#EEF2FA">{extraction.marca}</Badge>}
      {extraction.modelo && <Badge color={NAVY} bg="#EEF2FA">{extraction.modelo}</Badge>}
      {extraction.año    && <Badge color={NAVY} bg="#EEF2FA">{extraction.año}</Badge>}
      {extraction.pieza  && <Badge color={GOLD} bg={LGOLD}>{extraction.pieza}</Badge>}
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
        {usedOem ? (
          <>
            <span style={{ fontSize: 11, color: "#2D6A4F", fontWeight: 600 }}>✓ OEM:</span>
            <Badge color="#2D6A4F" bg="#EEFBF4">{extraction.oem_probable}</Badge>
          </>
        ) : (
          <Badge color={GOLD} bg={LGOLD}>Búsqueda texto libre</Badge>
        )}
      </div>
    </div>
  );
}

function PartnerBanner({ result }) {
  const meta = SOURCE_META[result.source];
  return (
    <div style={{
      background: `linear-gradient(135deg, ${NAVY} 0%, #243860 100%)`,
      border: `1px solid ${NAVY}`,
      borderRadius: 12, padding: "20px 24px",
      display: "flex", gap: 20, alignItems: "center",
      boxShadow: `0 6px 24px ${NAVY}22`,
      marginBottom: 20, position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", right: -30, top: -30,
        width: 130, height: 130, borderRadius: "50%",
        background: GOLD + "15",
      }} />
      <div style={{ flexShrink: 0 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 10,
          background: GOLD + "22", border: `2px solid ${GOLD}55`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26,
        }}>🏭</div>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <span style={{ fontWeight: 800, fontSize: 16, color: "#fff" }}>Desguaces El Choque</span>
          <span style={{
            background: GOLD, color: "#fff",
            borderRadius: 4, padding: "2px 10px",
            fontSize: 10, fontWeight: 800, letterSpacing: 1,
          }}>SOCIO PREFERENTE</span>
        </div>
        <div style={{ fontSize: 12, color: "#94A3B8", marginBottom: 14 }}>
          Madrid · Desguace certificado · {result.listings} piezas disponibles · Garantía {result.warranty}
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 30, fontWeight: 800, color: GOLD, lineHeight: 1 }}>
              {result.price_min.toFixed(2)}€
            </div>
            <div style={{ fontSize: 11, color: "#94A3B8" }}>desde (precio mínimo)</div>
          </div>
          <div style={{ height: 36, width: 1, background: "#ffffff22" }} />
          <div style={{ fontSize: 12, color: "#94A3B8" }}>
            <div>Media: <strong style={{ color: "#fff" }}>{result.price_avg.toFixed(2)}€</strong></div>
            <div>Máx: <strong style={{ color: "#fff" }}>{result.price_max.toFixed(2)}€</strong></div>
          </div>
          <div style={{ marginLeft: "auto" }}>
            <a href={result.url} target="_blank" rel="noreferrer" style={{
              display: "inline-block", padding: "10px 22px", borderRadius: 8,
              background: GOLD, color: "#fff",
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
      border: isLowest ? `2px solid ${GOLD}` : "1px solid #E5E7EB",
      borderRadius: 10, padding: 18,
      display: "flex", flexDirection: "column", gap: 10,
      boxShadow: isLowest ? `0 4px 16px ${GOLD}22` : "0 1px 4px rgba(0,0,0,0.06)",
      position: "relative",
    }}>
      {isLowest && (
        <div style={{
          position: "absolute", top: -1, right: 14,
          background: GOLD, color: "#fff",
          fontSize: 9, fontWeight: 800,
          padding: "3px 10px", borderRadius: "0 0 6px 6px", letterSpacing: 1,
        }}>MEJOR PRECIO</div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 7, background: meta.bg,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17,
          }}>{meta.flag}</div>
          <div>
            <div style={{ fontWeight: 700, color: meta.color, fontSize: 13 }}>{meta.label}</div>
            <div style={{ fontSize: 10, color: "#9CA3AF" }}>{result.listings} anuncio{result.listings !== 1 ? "s" : ""}</div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: NAVY }}>{result.price_min.toFixed(2)}€</div>
          <div style={{ fontSize: 10, color: "#9CA3AF" }}>precio mínimo</div>
        </div>
      </div>
      <div>
        <div style={{ position: "relative", height: 5, background: "#F3F4F6", borderRadius: 3 }}>
          <div style={{
            position: "absolute", left: `${leftPct}%`, width: `${Math.max(widthPct, 4)}%`,
            height: "100%", background: GOLD + "55", borderRadius: 3,
          }} />
          <div style={{
            position: "absolute", left: `${avgPct}%`, width: 2, height: "100%",
            background: GOLD, borderRadius: 2, transform: "translateX(-50%)",
          }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3, fontSize: 10, color: "#6B7280" }}>
          <span>Mín: <strong>{result.price_min.toFixed(2)}€</strong></span>
          <span>Media: <strong>{result.price_avg.toFixed(2)}€</strong></span>
          <span>Máx: <strong>{result.price_max.toFixed(2)}€</strong></span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
        <Badge color="#6B7280" bg="#F9FAFB">{result.condition}</Badge>
        <Badge color="#6B7280" bg="#F9FAFB">{result.warranty}</Badge>
        <Badge color={meta.color} bg={meta.bg}>{result.category}</Badge>
      </div>
      <a href={result.url} target="_blank" rel="noreferrer" style={{
        display: "block", textAlign: "center", padding: "8px", borderRadius: 7,
        background: "#F9FAFB", color: NAVY, border: `1px solid #E5E7EB`,
        fontSize: 11, fontWeight: 700, textDecoration: "none",
      }}>Ver en {meta.label} →</a>
    </div>
  );
}

function UnavailableCard({ source }) {
  const meta = SOURCE_META[source];
  return (
    <div style={{
      background: "#FAFAFA", border: "1px solid #F3F4F6",
      borderRadius: 10, padding: 18,
      display: "flex", alignItems: "center", gap: 10, opacity: 0.4,
    }}>
      <div style={{ fontSize: 22 }}>{meta.flag}</div>
      <div>
        <div style={{ fontWeight: 600, color: "#9CA3AF", fontSize: 12 }}>{meta.label}</div>
        <div style={{ fontSize: 11, color: "#D1D5DB" }}>Sin resultados</div>
      </div>
    </div>
  );
}

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
    setLoading(true); setResults([]); setExtraction(null); setUsedOem(false); setActiveTab("results");

    if (m === "oem") {
      const ref = q.toUpperCase();
      setSearchedLabel(ref); setAiStep("");
      await new Promise(r => setTimeout(r, 1400));
      const data = generateMockResults(ref, "oem");
      setResults(data); addHistory(ref, data, m);
    } else {
      setSearchedLabel(q);
      setAiStep("🤖 Analizando búsqueda con IA...");
      await new Promise(r => setTimeout(r, 300));
      let ext = null;
      try { ext = await extractWithAI(q); setExtraction(ext); }
      catch { ext = { pieza: q, query_normalizada: q, oem_probable: null, confianza_oem: "ninguna" }; setExtraction(ext); }
      const hasOem = ext?.oem_probable && ["alta","media"].includes(ext?.confianza_oem);
      setUsedOem(hasOem);
      if (hasOem) {
        setAiStep(`✓ OEM: ${ext.oem_probable} — buscando...`);
        await new Promise(r => setTimeout(r, 1200));
        const data = generateMockResults(ext.oem_probable, "oem");
        setResults(data); addHistory(`${q} → ${ext.oem_probable}`, data, m);
      } else {
        setAiStep(`🔍 Buscando "${ext?.query_normalizada || q}"...`);
        await new Promise(r => setTimeout(r, 1400));
        const data = generateMockResults(ext?.query_normalizada || q, "text");
        setResults(data); addHistory(q, data, m);
      }
      setAiStep("");
    }
    setLoading(false);
  };

  const addHistory = (label, data, m) => {
    setHistory(prev => {
      const entry = { label, mode: m, timestamp: new Date().toLocaleString("es-ES"), found: data.filter(r => r.available).length, total: SOURCES.length };
      return [entry, ...prev.filter(h => h.label !== label)].slice(0, 20);
    });
  };

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

  return (
    <div style={{ minHeight: "100vh", background: "#F8F9FB", fontFamily: "'Inter','Helvetica Neue',sans-serif", color: "#111827" }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner { width:30px;height:30px;border:3px solid #E5E7EB;border-top-color:${GOLD};border-radius:50%;animation:spin 0.8s linear infinite; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .card-in { animation: fadeUp 0.25s ease forwards; }
        input:focus { outline:none;border-color:${GOLD} !important;box-shadow:0 0 0 3px ${GOLD}18; }
        button { transition:all 0.15s; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        .pulsing { animation: pulse 1.2s ease-in-out infinite; }
      `}</style>

      {/* ── Header CIO4YOU ─────────────────────────────────── */}
      <div style={{
        background: NAVY, borderBottom: `3px solid ${GOLD}`,
        padding: "0 32px", height: 64,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        boxShadow: "0 2px 12px rgba(27,42,74,0.3)",
      }}>
        {/* Logo CIO4YOU */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            background: GOLD, borderRadius: 6,
            padding: "4px 10px",
            fontWeight: 900, fontSize: 16, color: "#fff",
            letterSpacing: 1, fontFamily: "Georgia, serif",
          }}>CIO4YOU</div>
          <div style={{ width: 1, height: 28, background: "#ffffff22" }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#fff", letterSpacing: 0.2 }}>Price Intelligence</div>
            <div style={{ fontSize: 10, color: "#94A3B8", fontWeight: 400 }}>Recambios · 6 marketplaces</div>
          </div>
        </div>

        {/* Fuentes badge */}
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ background: "#C41E3A22", color: "#FF8FA3", border: "1px solid #C41E3A44", borderRadius: 4, padding: "3px 10px", fontSize: 10, fontWeight: 700 }}>🏭 El Choque</span>
          <span style={{ color: "#ffffff33", fontSize: 12 }}>+</span>
          {SOURCES.filter(s => s !== "elchoque").map(s => (
            <span key={s} style={{
              background: "#ffffff0f", color: "#94A3B8",
              border: "1px solid #ffffff15",
              borderRadius: 4, padding: "3px 8px", fontSize: 10, fontWeight: 500,
            }}>{SOURCE_META[s].label}</span>
          ))}
        </div>
      </div>

      {/* ── Search area ─────────────────────────────────────── */}
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
                  padding: "10px 18px", borderRadius: 8, cursor: "pointer",
                  background: mode === m.id ? (m.id === "text" ? "#EEF2FA" : LGOLD) : "#F9FAFB",
                  border: mode === m.id
                    ? `2px solid ${m.id === "text" ? NAVY : GOLD}`
                    : "2px solid #E5E7EB",
                  flex: 1,
                }}>
                <span style={{ fontSize: 18 }}>{m.icon}</span>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: mode === m.id ? (m.id === "text" ? NAVY : GOLD) : "#374151" }}>{m.label}</div>
                  <div style={{ fontSize: 11, color: "#9CA3AF" }}>{m.desc}</div>
                </div>
                {m.id === "text" && (
                  <span style={{ marginLeft: "auto", background: NAVY, color: GOLD, borderRadius: 4, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>IA</span>
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
                flex: 1, border: "1.5px solid #E5E7EB", borderRadius: 8,
                padding: "12px 16px", fontSize: 14, color: "#111827",
                background: "#F9FAFB", transition: "all 0.2s",
              }}
            />
            <button
              onClick={() => handleSearch()}
              disabled={loading || !query.trim()}
              style={{
                padding: "12px 28px", borderRadius: 8, border: "none",
                background: loading || !query.trim() ? "#E5E7EB" : GOLD,
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
              background: "#EEF2FA", borderRadius: 7,
              fontSize: 12, color: NAVY, fontWeight: 500,
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
                color: activeTab === tab.id ? GOLD : "#6B7280",
                borderBottom: activeTab === tab.id ? `2px solid ${GOLD}` : "2px solid transparent",
                background: "none", cursor: "pointer", marginBottom: -1,
              }}>{tab.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────── */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 32px" }}>

        {activeTab === "history" ? (
          <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 10, overflow: "hidden" }}>
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
            <div style={{ fontSize: 44, marginBottom: 14 }}>{mode === "text" ? "💬" : "🔍"}</div>
            <div style={{ color: "#374151", fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
              {mode === "text" ? "Describe la pieza que buscas en lenguaje natural" : "Introduce una referencia OEM para comparar precios"}
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
                      background: LGOLD, color: GOLD,
                      border: `1px solid ${GOLD}44`, fontSize: 12, fontWeight: 500,
                    }}>{ex}</button>
                ))}
              </div>
            )}
          </div>

        ) : (
          <>
            {mode === "text" && <AIExtractionPanel extraction={extraction} usedOem={usedOem} />}

            {/* Summary */}
            {allAvailable.length > 0 && (
              <div style={{
                display: "flex", gap: 10, flexWrap: "wrap",
                padding: "12px 18px", background: "#fff",
                border: "1px solid #E5E7EB", borderRadius: 10, marginBottom: 18,
                alignItems: "center",
              }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 700, color: NAVY, fontSize: 14 }}>{searchedLabel}</span>
                  {allAvailable[0]?.partName && <span style={{ color: "#9CA3AF", fontSize: 13 }}> · {allAvailable[0].partName}</span>}
                </div>
                <Badge color="#2D6A4F" bg="#EEFBF4">Mínimo {globalMin.toFixed(2)}€</Badge>
                <Badge color={NAVY} bg="#EEF2FA">Media {avgAll}€</Badge>
                {spread && <Badge color={GOLD} bg={LGOLD}>Spread {spread}%</Badge>}
                <Badge color="#6B7280" bg="#F9FAFB">{allAvailable.length}/{SOURCES.length} fuentes</Badge>
              </div>
            )}

            {/* El Choque banner */}
            {elChoqueResult?.available && (
              <div className="card-in"><PartnerBanner result={elChoqueResult} /></div>
            )}

            {/* Separador */}
            {elChoqueResult?.available && available.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div style={{ flex: 1, height: 1, background: "#E5E7EB" }} />
                <span style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 600 }}>OTROS MARKETPLACES</span>
                <div style={{ flex: 1, height: 1, background: "#E5E7EB" }} />
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(255px, 1fr))", gap: 14 }}>
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

      {/* ── Footer ──────────────────────────────────────────── */}
      <div style={{
        borderTop: "1px solid #E5E7EB", padding: "14px 32px",
        background: NAVY, marginTop: 40,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ background: GOLD, color: "#fff", borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 800, fontFamily: "Georgia, serif" }}>CIO4YOU</span>
          <span style={{ fontSize: 11, color: "#475569" }}>Price Intelligence · Recambios v1.2</span>
        </div>
        <span style={{ fontSize: 11, color: "#334155" }}>cioforyou.net · Your IT Partners</span>
      </div>
    </div>
  );
}
