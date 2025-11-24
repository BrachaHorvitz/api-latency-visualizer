import { useCallback, useEffect, useRef, useState } from "react";

type Measurement = {
  id: number;
  timestamp: string;
  latencyMs: number;
  status: number | null;
  ok: boolean;
};

const MAX_MEASUREMENTS = 100;
const MIN_INTERVAL_MS = 500;

function App() {
  const [url, setUrl] = useState<string>("https://api.github.com");
  const [intervalMs, setIntervalMs] = useState<number>(5000);
  const [intervalInput, setIntervalInput] = useState<string>(() => String(5000));
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);

  const timerRef = useRef<number | null>(null);
  const idRef = useRef<number>(1);

  // TODO: implement useEffect to start/stop periodic checks when isRunning/url/intervalMs change

  const runCheck = useCallback(async () => {
    const startedAt = performance.now();
    let measurement: Measurement;

    try {
      const response = await fetch(url, { cache: "no-store" });
      const latencyMs = Math.round(performance.now() - startedAt);
      measurement = {
        id: idRef.current++,
        timestamp: new Date().toISOString(),
        latencyMs,
        status: response.status,
        ok: response.ok,
      };
    } catch (error) {
      const latencyMs = Math.round(performance.now() - startedAt);
      measurement = {
        id: idRef.current++,
        timestamp: new Date().toISOString(),
        latencyMs,
        status: null,
        ok: false,
      };
      console.error("Latency check failed", error);
    }

    setMeasurements((prev) => [measurement, ...prev].slice(0, MAX_MEASUREMENTS));
  }, [url]);

  useEffect(() => {
    if (!isRunning) {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    void runCheck();
    const handle = window.setInterval(() => {
      void runCheck();
    }, intervalMs);
    timerRef.current = handle;
    
    

    return () => {
      window.clearInterval(handle);
      timerRef.current = null;
    };
  }, [isRunning, intervalMs, runCheck]);
  // For debugging: useEffect below exposes runLatencyCheck on window for manual triggering in browser console

  useEffect(() => {
    const debugWindow = window as typeof window & {
      runLatencyCheck?: () => void;
    };

    debugWindow.runLatencyCheck = () => {
      void runCheck();
    };

    return () => {
      delete debugWindow.runLatencyCheck;
    };
  }, [runCheck]);

  const totalChecks = measurements.length;
  const avgLatency =
    totalChecks === 0
      ? 0
      : Math.round(
          measurements.reduce((sum, measurement) => sum + measurement.latencyMs, 0) / totalChecks,
        );
  const maxLatency = measurements.reduce(
    (max, measurement) => Math.max(max, measurement.latencyMs),
    0,
  );

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#0f172a",
        color: "#f8fafc",
        padding: "2rem",
        fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "960px",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
        }}
      >
        <header>
          <p style={{ textTransform: "uppercase", letterSpacing: "0.2em", color: "#38bdf8" }}>
            Diagnostics
          </p>
          <h1 style={{ fontSize: "2.5rem", margin: "0.25rem 0 0" }}>API Latency Visualizer</h1>
          <p style={{ color: "#94a3b8", marginTop: "0.5rem" }}>
            Periodically ping any HTTP endpoint and watch the latency stats update live.
          </p>
          <p style={{ color: "#64748b", marginTop: "0.75rem", fontSize: "0.95rem" }}>
            Targeting <code style={{ color: "#e2e8f0" }}>{url}</code> every {intervalMs} ms •{" "}
            {isRunning ? "Running" : "Stopped"}
          </p>
        </header>

        <section
          style={{
            backgroundColor: "#1e293b",
            padding: "1.5rem",
            borderRadius: "1rem",
            boxShadow: "0 20px 40px rgba(15, 23, 42, 0.6)",
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: "1rem" }}>Controls</h2>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "1rem",
              alignItems: "flex-end",
            }}
          >
            <label style={{ flex: "1 1 260px", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              <span style={{ color: "#cbd5f5", fontSize: "0.9rem" }}>API URL</span>
              <input
                type="url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://api.example.com/ping"
                style={{
                  backgroundColor: "#0f172a",
                  border: "1px solid rgba(148, 163, 184, 0.4)",
                  borderRadius: "0.75rem",
                  padding: "0.75rem 1rem",
                  color: "#f8fafc",
                }}
              />
            </label>

            <label style={{ width: "180px", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              <span style={{ color: "#cbd5f5", fontSize: "0.9rem" }}>Interval (ms)</span>
              <input
                type="number"
                min={MIN_INTERVAL_MS}
                value={intervalInput}
                onChange={(event) => {
                  const { value } = event.target;
                  setIntervalInput(value);

                  if (value === "") {
                    return;
                  }

                  const parsed = Number(value);
                  if (Number.isNaN(parsed)) {
                    return;
                  }

                  setIntervalMs(parsed);
                }}
                onBlur={() => {
                  const nextValue = intervalInput.trim();
                  if (nextValue === "") {
                    setIntervalMs(MIN_INTERVAL_MS);
                    setIntervalInput(String(MIN_INTERVAL_MS));
                    return;
                  }

                  const parsed = Number(nextValue);
                  if (!Number.isFinite(parsed)) {
                    setIntervalMs(MIN_INTERVAL_MS);
                    setIntervalInput(String(MIN_INTERVAL_MS));
                    return;
                  }

                  const normalized = Math.max(MIN_INTERVAL_MS, parsed);
                  setIntervalMs(normalized);
                  setIntervalInput(String(normalized));
                }}
                style={{
                  backgroundColor: "#0f172a",
                  border: "1px solid rgba(148, 163, 184, 0.4)",
                  borderRadius: "0.75rem",
                  padding: "0.75rem 1rem",
                  color: "#f8fafc",
                }}
              />
            </label>

            <button
              type="button"
              onClick={() => setIsRunning((prev) => !prev)}
              disabled={!url.trim() || !intervalInput.trim() || intervalMs <= 0}
              style={{
                flex: "0 0 140px",
                padding: "0.9rem 1.25rem",
                borderRadius: "0.75rem",
                border: "none",
                fontWeight: 600,
                cursor: !url.trim() || intervalMs <= 0 ? "not-allowed" : "pointer",
                opacity: !url.trim() || intervalMs <= 0 ? 0.5 : 1,
                backgroundColor: isRunning ? "#dc2626" : "#16a34a",
                color: "#f8fafc",
                transition: "transform 120ms ease, filter 120ms ease",
              }}
            >
              {isRunning ? "Stop" : "Start"}
            </button>
          </div>
          {/* TODO: Controls section:
              - API URL input
              - Interval (ms) input
              - Start/Stop button
          */}
        </section>

        <section
          style={{
            backgroundColor: "#1e1b4b",
            padding: "1.5rem",
            borderRadius: "1rem",
            boxShadow: "0 20px 40px rgba(15, 23, 42, 0.6)",
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: "1rem" }}>Stats</h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "1rem",
            }}
          >
            <div
              style={{
                backgroundColor: "#2e1065",
                borderRadius: "0.75rem",
                padding: "1rem",
                border: "1px solid rgba(129, 140, 248, 0.4)",
              }}
            >
              <p style={{ color: "#a5b4fc", margin: 0, fontSize: "0.9rem" }}>Total Checks</p>
              <p style={{ fontSize: "1.75rem", margin: "0.35rem 0 0" }}>{totalChecks}</p>
            </div>
            <div
              style={{
                backgroundColor: "#1e1b4b",
                borderRadius: "0.75rem",
                padding: "1rem",
                border: "1px solid rgba(96, 165, 250, 0.4)",
              }}
            >
              <p style={{ color: "#bae6fd", margin: 0, fontSize: "0.9rem" }}>Avg Latency (ms)</p>
              <p style={{ fontSize: "1.75rem", margin: "0.35rem 0 0" }}>{avgLatency}</p>
            </div>
            <div
              style={{
                backgroundColor: "#312e81",
                borderRadius: "0.75rem",
                padding: "1rem",
                border: "1px solid rgba(251, 191, 36, 0.4)",
              }}
            >
              <p style={{ color: "#fde68a", margin: 0, fontSize: "0.9rem" }}>Max Latency (ms)</p>
              <p style={{ fontSize: "1.75rem", margin: "0.35rem 0 0" }}>{maxLatency}</p>
            </div>
          </div>
        </section>

        <section
          style={{
            backgroundColor: "#0f172a",
            border: "1px solid rgba(148, 163, 184, 0.2)",
            borderRadius: "1rem",
            padding: "1.5rem",
            boxShadow: "0 30px 60px rgba(2, 6, 23, 0.9)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ margin: 0 }}>Recent Measurements</h2>
            <span style={{ color: "#94a3b8" }}>
              {measurements.length > 0
                ? `${measurements.length} recorded`
                : "No measurements yet"}
            </span>
          </div>
          <p style={{ color: "#64748b", marginTop: "0.75rem" }}>
            Once implemented, this table will list each check with its timestamp, latency, and HTTP
            status.
          </p>
          {/* TODO: Table:
              - Columns: ID, Time, Latency (ms), Status
          */}
        </section>
      </div>
    </main>
  );
}

export default App;
