import { useEffect, useRef, useState, useCallback } from "react";
import { Chart, registerables } from "chart.js";
Chart.register(...registerables);
Chart.defaults.font.family = "'Inter', 'Helvetica Neue', Arial, sans-serif";

// API CONFIG 
//const ADAFRUIT_BASE = "https://io.adafruit.com/api/v2/not_chai/feeds";
//const ADAFRUIT_KEY  = ""; 

const POLL_INTERVAL = 10; //change

// FALLBACK DATA
const FALLBACK = {
  sound:       0,
  soundSeries: [],
  temp:        [],
  co2:         [],
  aqi:         [],
  humidity:    [],
  bleCount:    [],
  pm25:        [],
  pm1:         [],
};

// ADAFRUIT DATA
async function fetchSensorData() {
  const zero = [{ time: "need to fill in", value: 0 }];

  return {
    sound: 0,           
    temp: zero, 
    co2: zero,
    aqi: zero,
    humidity: zero,
    bleCount: zero,
    pm25: zero,
    pm1: zero,
  };
}

// HOOK 
function useSensorData() {
  const [data, setData]       = useState(FALLBACK);
  const [error, setError]     = useState(null);
  const [loading, setLoading] = useState(true);

  const poll = useCallback(async () => {
    try {
      const fresh = await fetchSensorData();
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

  return { data, error, loading };
}

// THRESHOLDS 
const THRESHOLDS = {
  temp:     { low: 68,  high: 76  },
  co2:      { low: 440, high: 470 },
  aqi:      { low: 75,  high: 85  },
  humidity: { low: 40,  high: 60  },
  bleCount: { low: 5,   high: 15  },
  pm25:     { low: 12,  high: 35  }, 
  pm1:      { low: 10,  high: 25  },
};

const SEG_COUNT = 30;
const MAX_DB    = 100;

// COLOR HELPERS 
function segColor(segPct) {
  if (segPct > 0.75) return "#ff5c5c";
  if (segPct > 0.5)  return "#f0c040";
  return "#90e8c3";
}

function statusColor(value, low, high, invert = false) {
  if (!invert) {
    if (value <= low)  return "#90e8c3";
    if (value <= high) return "#f0c040";
    return "#ff5c5c";
  } else {
    if (value >= high) return "#90e8c3";
    if (value >= low)  return "#f0c040";
    return "#ff5c5c";
  }
}

function getLatest(series) {
  if (!series?.length) return 0;
  return series[series.length - 1].value;
}

// SOUND
function SoundMeter({ value }) {
  const filled = Math.round((value / MAX_DB) * SEG_COUNT);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: 200, gap: 8 }}>
      <div style={{ fontSize: 13, color: "#90e8c3", fontWeight: 500 }}>{value} dB</div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", width: 28, gap: 2 }}>
        {Array.from({ length: SEG_COUNT }, (_, i) => {
          const segIdx = SEG_COUNT - i;
          const lit = segIdx <= filled;
          return (
            <div
              key={i}
              style={{
                width: "100%",
                height: `calc((100% - ${(SEG_COUNT - 1) * 2}px) / ${SEG_COUNT})`,
                background: lit ? segColor(segIdx / SEG_COUNT) : "#2a2a2a",
                borderRadius: 2,
              }}
            />
          );
        })}
      </div>
      <div style={{ fontSize: 11, color: "#ffffff" }}>0–100 dB</div>
    </div>
  );
}

// LIVE BAR
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

// LINE GRAPH
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
        labels: labels,
        datasets: [{
          data: values,
          borderColor: color,
          borderWidth: 0,
          backgroundColor: color + "22",
          fill: false,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 0,
          showLine: false,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            ticks: { color: "#ffffff", font: { size: 11 } },
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

// CARD
function Card({ title, children, style, accentColor }) {
  return (
    <div style={{
      background: "#1e1e1e",
      borderRadius: 12,
      padding: "1rem 1.25rem",
      borderTop: `3px solid ${accentColor || "#90e8c3"}`,
      ...style,
    }}>
      <div style={{
        fontSize: 12,
        fontWeight: 500,
        color: accentColor || "#90e8c3",
        marginBottom: "0.75rem",
        letterSpacing: "0.06em",
        textTransform: "uppercase",
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

// CHART AND BARS
function ChartWithBar({ id, series, yMin, yMax, color, liveMin, liveMax, unit, label, extraBars = [], loading }) {
  const liveValue = loading ? 0 : getLatest(series);
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "stretch", flex: 1 }}>
      <LineGraph id={id} data={loading ? [] : series} yMin={yMin} yMax={yMax} color={color} />
      {/* Primary bar */}
      <LiveBar
        value={liveValue}
        min={liveMin ?? yMin}
        max={liveMax ?? yMax}
        color={color}
        unit={unit}
        label={label}
      />
      {/* Additional bars */}
      {extraBars.map((bar, i) => (
        <LiveBar key={i} {...bar} value={loading ? 0 : bar.value} />
      ))}
    </div>
  );
}

// APP 
export default function App() {
  const { data, error, loading } = useSensorData();

  const tempColor     = statusColor(getLatest(data.temp),     THRESHOLDS.temp.low,     THRESHOLDS.temp.high);
  const co2Color      = statusColor(getLatest(data.co2),      THRESHOLDS.co2.low,      THRESHOLDS.co2.high);
  const humidityColor = statusColor(getLatest(data.humidity), THRESHOLDS.humidity.low, THRESHOLDS.humidity.high);
  const bleColor      = statusColor(getLatest(data.bleCount), THRESHOLDS.bleCount.low, THRESHOLDS.bleCount.high);
  const pm25Color     = statusColor(getLatest(data.pm25),     THRESHOLDS.pm25.low,     THRESHOLDS.pm25.high);
  const pm1Color      = statusColor(getLatest(data.pm1),      THRESHOLDS.pm1.low,      THRESHOLDS.pm1.high);

  const airQualitySeries = data.pm25?.length ? data.pm25 : [];

  const row1Style = {
    display: "grid",
    gridTemplateColumns: "0.5fr 1fr 1fr",
    gap: "1.25rem",
    width: "100%",
    maxWidth: 1400,
    marginBottom: "1.25rem",
  };

  const row2Style = {
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
      {/* Header */}
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
          {!loading && !error && `status: not connected · refreshes every ${POLL_INTERVAL}s`}
        </p>
      </div>

      {/* Row 1: Sound, Air Quality, BLE */}
      <div style={row1Style}>
        {/* Sound */}
        <Card title="Sound (dB)" accentColor="#90e8c3">
          <div style={{ display: "flex", justifyContent: "center" }}>
            <SoundMeter value={loading ? 0 : data.sound} />
          </div>
        </Card>

        {/* Air Quality */}
        <Card title="Air Quality (AQI)" accentColor={pm25Color}>
          <ChartWithBar
            id="airChart"
            series={airQualitySeries}
            yMin={0}
            yMax={50}
            color={pm25Color}
            unit="AQI"
            label="AQI"
            loading={loading}
            extraBars={[
              {
                value: getLatest(data.pm25),
                min:   0,
                max:   50,
                color: pm25Color,
                unit:  "µg/m³",
                label: "PM2.5",
              },
              {
                value: getLatest(data.pm1),
                min:   0,
                max:   50,
                color: pm1Color,
                unit:  "µg/m³",
                label: "PM1",
              }
            ]}
          />
        </Card>

        {/* BLE */}
        <Card title="Bluetooth Devices" accentColor={bleColor}>
          <ChartWithBar
            id="bleChart"
            series={data.bleCount}
            yMin={0}
            yMax={20}
            color={bleColor}
            unit="dev"
            loading={loading}
          />
        </Card>
      </div>

      {/* Row 2: Humidity, CO₂, Temperature */}
      <div style={row2Style}>
        <Card title="Humidity (%RH)" accentColor={humidityColor}>
          <ChartWithBar
            id="humidityChart"
            series={data.humidity}
            yMin={20}
            yMax={80}
            color={humidityColor}
            unit="%RH"
            loading={loading}
          />
        </Card>

        <Card title="CO₂ Levels (ppm)" accentColor={co2Color}>
          <ChartWithBar
            id="co2Chart"
            series={data.co2}
            yMin={400}
            yMax={520}
            color={co2Color}
            unit="ppm"
            loading={loading}
          />
        </Card>

        <Card title="Temperature (°F)" accentColor={tempColor}>
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