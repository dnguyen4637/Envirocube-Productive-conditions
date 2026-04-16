import { useEffect, useRef, useState, useCallback } from "react";
import { Chart, registerables } from "chart.js";
Chart.register(...registerables);
Chart.defaults.font.family = "'Inter', 'Helvetica Neue', Arial, sans-serif";

const ADAFRUIT_BASE = "https://io.adafruit.com/api/v2/not_chai/feeds";
const POLL_INTERVAL = 10000;

const FALLBACK = {
  soundSeries: [],
  temp:        [],
  co2:         [],
  bleCount:    [],
  pm25:        [],
};

async function fetchOneFeed(key) {
  const res = await fetch(`${ADAFRUIT_BASE}/${key}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${key}`);
  const json = await res.json();
  return parseFloat(json.last_value);
}

async function fetchSensorData(prev) {
  const [temp, co2, sound, bleCount, pm25] = await Promise.all([
    fetchOneFeed("envirocube.temperature"),
    fetchOneFeed("envirocube.co2"),
    fetchOneFeed("envirocube.sound-db"),
    fetchOneFeed("envirocube.ble-count"),
    fetchOneFeed("envirocube.pm2-5"),
  ]);

  const now = new Date().toLocaleTimeString();

  function appendPoint(series, value) {
    const next = [...(series ?? []), { time: now, value }];
    return next.length > 60 ? next.slice(-60) : next;
  }

  return {
    sound,
    soundSeries: appendPoint(prev.soundSeries, sound),
    temp:        appendPoint(prev.temp,        temp),
    co2:         appendPoint(prev.co2,         co2),
    bleCount:    appendPoint(prev.bleCount,    bleCount),
    pm25:        appendPoint(prev.pm25,        pm25),
  };
}

function useSensorData() {
  const [data, setData]       = useState(FALLBACK);
  const [error, setError]     = useState(null);
  const [loading, setLoading] = useState(true);
  const dataRef = useRef(FALLBACK);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const reset = useCallback(() => {
    setData(FALLBACK);
    dataRef.current = FALLBACK;
  }, []);

  const poll = useCallback(async () => {
    try {
      const fresh = await fetchSensorData(dataRef.current);
      setData(fresh);
      setError(null);
    } catch (err) {
      console.error("Sensor fetch failed:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    poll();
    const id = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [poll]);

  return { data, error, loading, reset };
}

function getBleCount(series) {
  if (!series?.length) return 0;
  return series[series.length - 1].value;
}

const THRESHOLDS = {
  temp:     { low: 75,   high: 79   },
  co2:      { low: 800,  high: 1500 },
  aqi:      { low: 75,   high: 85   },
  bleCount: { low: 5,    high: 15   },
  pm25:     { low: 5,    high: 20   },
};

const MAX_DB = 100;

function statusColor(value, low, high) {
  if (value < low)  return "#90e8c3";
  if (value < high) return "#f0c040";
  return "#ff5c5c";
}

function statusWord(value, low, high) {
  if (value < low)  return "Optimal";
  if (value < high) return "Moderate";
  return "Poor";
}

function getLatest(series) {
  if (!series?.length) return 0;
  return series[series.length - 1].value;
}

function LiveBar({ value, min, max, color, unit, label }) {
  const pct = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const display = Number.isInteger(value) ? value : value.toFixed(1);
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      width: 28,
      gap: 4,
    }}>
      {label && (
        <div style={{
          fontSize: 8,
          color: "#ffffff",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          textAlign: "center",
          lineHeight: 1.1,
          whiteSpace: "nowrap",
        }}>
          {label}
        </div>
      )}
      <div style={{ fontSize: 10, fontWeight: 500, color, textAlign: "center", lineHeight: 1.2, whiteSpace: "nowrap" }}>
        {display}
      </div>
      <div style={{
        flex: 1,
        width: 12,
        background: "#2a2a2a",
        borderRadius: 6,
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: `${(pct * 100).toFixed(1)}%`,
          background: color,
          borderRadius: 6,
          transition: "height 0.6s ease",
        }} />
      </div>
      <div style={{ fontSize: 9, color: "#ffffff", textAlign: "center" }}>{unit}</div>
    </div>
  );
}

function LineGraph({ id, data, yMin, yMax, color }) {
  const ref      = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    if (chartRef.current) chartRef.current.destroy();

    const labels = data.map(d => d.time);
    const values = data.map(d => d.value);

    chartRef.current = new Chart(ref.current, {
      type: "line",
      data: {
        labels,
        datasets: [{
          data: values,
          borderColor: color,
          borderWidth: 1.5,
          backgroundColor: color + "22",
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 0,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            ticks: { color: "#ffffff", font: { size: 11 }, maxTicksLimit: 6 },
            grid:  { color: "rgba(255,255,255,0.06)" },
            border:{ color: "rgba(255,255,255,0.1)" },
          },
          y: {
            min: yMin,
            max: yMax,
            ticks: { color: "#ffffff", font: { size: 11 } },
            grid:  { color: "rgba(255,255,255,0.06)" },
            border:{ color: "rgba(255,255,255,0.1)" },
          },
        },
      },
    });
    return () => chartRef.current?.destroy();
  }, [color, yMin, yMax, data]);

  return (
    <div style={{ position: "relative", height: 200, flex: 1 }}>
      <canvas ref={ref} id={id} />
    </div>
  );
}

function Card({ title, children, style, accentColor, statusLabel }) {
  return (
    <div style={{
      background: "#1e1e1e",
      borderRadius: 12,
      padding: "1rem 1.25rem",
      borderTop: `3px solid ${accentColor || "#90e8c3"}`,
      ...style,
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "0.75rem",
      }}>
        <div style={{
          fontSize: 12,
          fontWeight: 500,
          color: accentColor || "#90e8c3",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}>
          {title}
        </div>
        {statusLabel && (
          <div style={{
            fontSize: 11,
            fontWeight: 600,
            color: accentColor || "#90e8c3",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}>
            {statusLabel}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

function ChartWithBar({ id, series, yMin, yMax, color, liveMin, liveMax, unit, label, extraBars = [], loading }) {
  const liveValue = loading ? 0 : getLatest(series);
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "stretch", flex: 1 }}>
      <LineGraph id={id} data={loading ? [] : series} yMin={yMin} yMax={yMax} color={color} />
      <LiveBar
        value={liveValue}
        min={liveMin ?? yMin}
        max={liveMax ?? yMax}
        color={color}
        unit={unit}
        label={label}
      />
      {extraBars.map((bar, i) => (
        <LiveBar key={i} {...bar} value={loading ? 0 : bar.value} />
      ))}
    </div>
  );
}

export default function App() {
  const { data, error, loading, reset } = useSensorData();

  const tempColor  = statusColor(getLatest(data.temp),     THRESHOLDS.temp.low,     THRESHOLDS.temp.high);
  const co2Color   = statusColor(getLatest(data.co2),      THRESHOLDS.co2.low,      THRESHOLDS.co2.high);
  const bleColor = "#ffffff";  
  const pm25Color  = statusColor(getLatest(data.pm25),     THRESHOLDS.pm25.low,     THRESHOLDS.pm25.high);
  const soundColor = statusColor(data.sound, 50, 60);

  const tempWord  = statusWord(getLatest(data.temp),     THRESHOLDS.temp.low,     THRESHOLDS.temp.high);
  const co2Word   = statusWord(getLatest(data.co2),      THRESHOLDS.co2.low,      THRESHOLDS.co2.high);
  const bleWord   = statusWord(getLatest(data.bleCount), THRESHOLDS.bleCount.low, THRESHOLDS.bleCount.high);
  const pm25Word  = statusWord(getLatest(data.pm25),     THRESHOLDS.pm25.low,     THRESHOLDS.pm25.high);
  const soundWord = statusWord(data.sound, 50, 60);

  const gridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "1.25rem",
    width: "100%",
    maxWidth: 1400,
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#121212",
      padding: "7rem 2rem 2.5rem",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      fontFamily: "'Inter', sans-serif",
      boxSizing: "border-box",
    }}>
      <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
        <h1 style={{
          fontFamily: "'Orbitron', sans-serif",
          color: "#90e8c3",
          fontSize: "3.5rem",
          margin: "0 0 0.3rem",
          lineHeight: 1,
        }}>
          EnviroStudy
        </h1>
        <p style={{ color: "#ffffff", fontSize: 12, margin: 0 }}>
          {loading && "loading…"}
          {error   && `⚠ ${error} — showing last known values`}
          {!loading && !error && `status: live`}
        </p>
      </div>

      {/* Row 1: Control box, Sound, Bluetooth */}
      <div style={{ ...gridStyle, marginBottom: "1.25rem" }}>

        {/* Top-left control box */}
        <div style={{
          background: "#1e1e1e",
          borderRadius: 12,
          borderTop: "3px solid #2a2a2a",
          padding: "1rem 1.25rem",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}>
          <div>
            <div style={{
              fontSize: 12,
              fontWeight: 500,
              color: "#ffffff",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginBottom: "1rem",
            }}>
              Status Summary
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { label: "Sound",       word: soundWord, color: soundColor },
                { label: "PM2.5",       word: pm25Word,  color: pm25Color  },
                { label: "CO₂",         word: co2Word,   color: co2Color   },
                { label: "Temperature", word: tempWord,  color: tempColor  },
               
                { 
                  label: "Bluetooth", 
                  word: `${~getBleCount(data.bleCount)} devices`, 
                  color: bleColor 
                }

              ].map(({ label, word, color }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 16, color: "#ffffff" }}>{label}</span>
                  <span style={{ fontSize: 16, fontWeight: 600, color, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    {word}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              background: "transparent",
              border: "1px solid #444",
              borderRadius: 8,
              color: "#aaa",
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              padding: "0.5rem 1rem",
              cursor: "pointer",
              transition: "border-color 0.2s, color 0.2s",
            }}
            onMouseEnter={e => { e.target.style.borderColor = "#90e8c3"; e.target.style.color = "#90e8c3"; }}
            onMouseLeave={e => { e.target.style.borderColor = "#cdcdcd";    e.target.style.color = "#cdcdcd";    }}
          >
            Reset Data
          </button>
        </div>

        <Card title="Sound (dB)" accentColor={soundColor} statusLabel={soundWord}>
          <ChartWithBar
            id="soundChart"
            series={loading ? [] : (data.soundSeries ?? [])}
            yMin={0}
            yMax={MAX_DB}
            color={soundColor}
            unit="dB"
            loading={loading}
          />
        </Card>

        <Card title="Bluetooth Devices" accentColor={'#ffffff'}>
          <ChartWithBar
            id="bleChart"
            series={data.bleCount}
            yMin={0}
            yMax={500}
            color={bleColor}
            unit="dev"
            loading={loading}
          />
        </Card>
      </div>

      {/* Row 2: PM2.5, CO₂, Temperature */}
      <div style={gridStyle}>
        <Card title="PM2.5 (µg/m³)" accentColor={pm25Color} statusLabel={pm25Word}>
          <ChartWithBar
            id="pm25Chart"
            series={data.pm25}
            yMin={0}
            yMax={50}
            color={pm25Color}
            unit="µg/m³"
            loading={loading}
          />
        </Card>

        <Card title="CO₂ Levels (ppm)" accentColor={co2Color} statusLabel={co2Word}>
          <ChartWithBar
            id="co2Chart"
            series={data.co2}
            yMin={0}
            yMax={5000}
            color={co2Color}
            unit="ppm"
            loading={loading}
          />
        </Card>

        <Card title="Temperature (°F)" accentColor={tempColor} statusLabel={tempWord}>
          <ChartWithBar
            id="tempChart"
            series={data.temp}
            yMin={60}
            yMax={90}
            color={tempColor}
            unit="°F"
            loading={loading}
          />
        </Card>
      </div>
    </div>
  );
}