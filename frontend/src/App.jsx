import { useEffect, useRef } from "react";
import { Chart, registerables } from "chart.js";
Chart.register(...registerables);
Chart.defaults.font.family = "'Inter', 'Helvetica Neue', Arial, sans-serif";

const soundData = [
  { time: "6am", value: 32 },
  { time: "8am", value: 55 },
  { time: "10am", value: 61 },
  { time: "12pm", value: 70 },
  { time: "2pm", value: 65 },
  { time: "6pm", value: 48 },
];
const tempData = [
  { time: "6am", value: 64 },
  { time: "8am", value: 68 },
  { time: "10am", value: 73 },
  { time: "12pm", value: 78 },
  { time: "2pm", value: 79 },
  { time: "6pm", value: 75 },
];
const co2Data = [
  { time: "6am", value: 412 },
  { time: "8am", value: 430 },
  { time: "10am", value: 458 },
  { time: "12pm", value: 480 },
  { time: "2pm", value: 495 },
  { time: "6pm", value: 445 },
];
const aqiData = [
  { time: "6am", value: 88 },
  { time: "8am", value: 82 },
  { time: "10am", value: 75 },
  { time: "12pm", value: 70 },
  { time: "2pm", value: 68 },
  { time: "6pm", value: 74 },
];

// Thresholds: [green -> yellow boundary, yellow -> red boundary]
const THRESHOLDS = {
  temp:  { low: 68, high: 76 },   // °F: green <68, yellow 68-76, red >76
  co2:   { low: 440, high: 470 }, // ppm: green <440, yellow 440-470, red >470
  aqi:   { low: 75, high: 85 },   // AQI: green <75, yellow 75-85, red >85 (lower is better so inverted)
};

const SEG_COUNT = 30;
const MAX_DB = 100;
const CURRENT_DB = 65;

function segColor(segPct) {
  if (segPct > 0.75) return "#ff5c5c";
  if (segPct > 0.5) return "#f0c040";
  return "#90e8c3";
}

function statusColor(value, low, high, invert = false) {
  if (!invert) {
    if (value <= low) return "#90e8c3";
    if (value <= high) return "#f0c040";
    return "#ff5c5c";
  } else {
    if (value >= high) return "#90e8c3";
    if (value >= low) return "#f0c040";
    return "#ff5c5c";
  }
}

function getLatest(data) {
  return data[data.length - 1].value;
}

function SoundMeter({ value }) {
  const filled = Math.round((value / MAX_DB) * SEG_COUNT);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: 280, gap: 8 }}>
      <div style={{ fontSize: 13, color: "#90e8c3", fontWeight: 500, fontFamily: "'Inter', sans-serif" }}>{value} dB</div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", width: 36, gap: 3 }}>
        {Array.from({ length: SEG_COUNT }, (_, i) => {
          const segIdx = SEG_COUNT - i;
          const lit = segIdx <= filled;
          return (
            <div
              key={i}
              style={{
                width: "100%",
                height: `calc((100% - ${(SEG_COUNT - 1) * 3}px) / ${SEG_COUNT})`,
                background: lit ? segColor(segIdx / SEG_COUNT) : "#2a2a2a",
                borderRadius: 2,
              }}
            />
          );
        })}
      </div>
      <div style={{ fontSize: 11, color: "#888", fontFamily: "'Inter', sans-serif" }}>0–100 dB</div>
    </div>
  );
}

function LineGraph({ id, data, yMin, yMax, color }) {
  const ref = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (chartRef.current) chartRef.current.destroy();
    chartRef.current = new Chart(ref.current, {
      type: "line",
      data: {
        labels: data.map((d) => d.time),
        datasets: [{
          data: data.map((d) => d.value),
          borderColor: color,
          borderWidth: 2.5,
          backgroundColor: color + "22",
          fill: true,
          tension: 0.4,
          pointBackgroundColor: color,
          pointBorderColor: color,
          pointRadius: 4,
          pointHoverRadius: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            ticks: { color: "#888", font: { size: 11, family: "'Inter', sans-serif" } },
            grid: { color: "rgba(255,255,255,0.06)" },
            border: { color: "rgba(255,255,255,0.1)" },
          },
          y: {
            min: yMin,
            max: yMax,
            ticks: { color: "#888", font: { size: 11, family: "'Inter', sans-serif" } },
            grid: { color: "rgba(255,255,255,0.06)" },
            border: { color: "rgba(255,255,255,0.1)" },
          },
        },
      },
    });
    return () => chartRef.current?.destroy();
  }, [color]);

  return (
    <div style={{ position: "relative", height: 280 }}>
      <canvas ref={ref} id={id} />
    </div>
  );
}

function Card({ title, children, style, accentColor }) {
  return (
    <div style={{ background: "#1e1e1e", borderRadius: 12, padding: "1.25rem 1.5rem", borderTop: `3px solid ${accentColor || "#90e8c3"}`, ...style }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: accentColor || "#90e8c3", marginBottom: "1rem", letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "'Inter', sans-serif" }}>
        {title}
      </div>
      {children}
    </div>
  );
}

export default function App() {
  const tempColor = statusColor(getLatest(tempData), THRESHOLDS.temp.low, THRESHOLDS.temp.high);
  const co2Color  = statusColor(getLatest(co2Data),  THRESHOLDS.co2.low,  THRESHOLDS.co2.high);
  const aqiColor  = statusColor(getLatest(aqiData),  THRESHOLDS.aqi.low,  THRESHOLDS.aqi.high, true);

  return (
    <div style={{
      height: "100vh",
      background: "#121212",
      padding: "2rem",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      fontFamily: "'Inter', sans-serif",
      boxSizing: "border-box",
    }}>
    
      <h1 style={{ textAlign: "center", fontFamily: "'Orbitron', sans-serif", color: "#90e8c3", marginBottom: "2rem", fontSize: "4rem" }}>        
        EnviroStudy
      </h1>

      <div style={{
        display: "flex",
        gap: "1.5rem",
        alignItems: "center",
        width: "100%",
        maxWidth: 1400,
      }}>
        <Card title="Sound" style={{ flexShrink: 0, width: 120 }} accentColor="#90e8c3">
          <SoundMeter value={CURRENT_DB} />
        </Card>

        <Card title="Temperature (°F)" style={{ flex: 1 }} accentColor={tempColor}>
          <LineGraph id="tempChart" data={tempData} yMin={60} yMax={80} color={tempColor} />
        </Card>

        <Card title="CO₂ Levels (ppm)" style={{ flex: 1 }} accentColor={co2Color}>
          <LineGraph id="co2Chart" data={co2Data} yMin={400} yMax={520} color={co2Color} />
        </Card>

        <Card title="Air Quality (AQI)" style={{ flex: 1 }} accentColor={aqiColor}>
          <LineGraph id="aqiChart" data={aqiData} yMin={60} yMax={95} color={aqiColor} />
        </Card>
      </div>
    </div>
  );
}