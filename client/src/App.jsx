import { useState, useRef } from "react";
import "./index.css";

// honestly this file got a bit messy but it works so... good enough for now.
function App() {
  const [fileThing, setFileThing] = useState(null);
  const [urlPreview, setUrlPreview] = useState("");
  const [resultList, setResultList] = useState([]);
  const [isBusy, setIsBusy] = useState(false);
  const [err, setErr] = useState("");

  const audioEl = useRef(null);

  // I should rename this later but whatever
  const pickFileHandler = (ev) => {
    const f = ev.target.files && ev.target.files[0];
    if (!f) {
      setErr("No file picked?");
      return;
    }

    setFileThing(f);
    setUrlPreview(URL.createObjectURL(f));
    setResultList([]);
    setErr("");
  };

  // send the audio to backend
  const sendToServer = async () => {
    if (!fileThing) {
      setErr("You need to pick a file first.");
      return;
    }

    setIsBusy(true);
    setErr("");

    const fd = new FormData();
    fd.append("file", fileThing);

    let resp;
    try {
      resp = await fetch("http://localhost:8000/analyze", {
        method: "POST",
        body: fd
      });
    } catch (networkErr) {
      console.warn("network issue:", networkErr);
      setErr("Couldn't reach server. Is it running?");
      setIsBusy(false);
      return;
    }

    if (!resp.ok) {
      setErr("Server said nope: " + resp.status);
      setIsBusy(false);
      return;
    }

    try {
      const parsed = await resp.json();
      setResultList(parsed.feedback || []);
    } catch (jsonErr) {
      console.error("weird JSON:", jsonErr);
      setErr("Got a weird response from backend.");
    }

    setIsBusy(false);
  };

  // jump audio to timestamp mm:ss
  const jumpTo = (ts) => {
    if (!audioEl.current) return;

    const [mm, ss] = ts.split(":");
    const sec = (parseInt(mm, 10) || 0) * 60 + (parseInt(ss, 10) || 0);

    audioEl.current.currentTime = sec;
    audioEl.current.play(); // not sure if autoplay will cause warnings but works locally
  };

  return (
    <div style={{ background: "#f4f6fc", minHeight: "100vh", padding: "20px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>

        <h1 style={{ textAlign: "center", fontSize: "2.2rem", marginBottom: 10 }}>
          AI Instructional Coach
        </h1>
        <p style={{ textAlign: "center", marginBottom: 30, color: "#555" }}>
          Upload a short classroom audio — let the model break it down
        </p>

        <div className="shadow bg-white p-5 rounded" style={{ marginBottom: 20 }}>
          <div>
            <div style={{ marginBottom: 10, fontSize: ".9rem", color: "#555" }}>
              Pick an audio file
            </div>

            <input
              type="file"
              onChange={pickFileHandler}
              accept="audio/*"
              style={{ marginBottom: 20 }}
            />
          </div>

          {urlPreview && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ marginBottom: 6, fontSize: ".9rem" }}>Preview</div>
              <audio
                ref={audioEl}
                src={urlPreview}
                controls
                style={{ width: "100%" }}
              />
            </div>
          )}

          <button
            onClick={sendToServer}
            disabled={!fileThing || isBusy}
            style={{
              width: "100%",
              padding: "14px",
              background: isBusy ? "#999" : "#4c5bd4",
              color: "white",
              borderRadius: 6,
              border: "none",
              cursor: isBusy ? "not-allowed" : "pointer"
            }}
          >
            {isBusy ? "Working..." : "Analyze Audio"}
          </button>

          {err && (
            <div
              style={{
                marginTop: 15,
                padding: "10px 12px",
                background: "#ffe7e7",
                color: "#b10000",
                borderRadius: 4
              }}
            >
              {err}
            </div>
          )}
        </div>

        {isBusy && (
          <div style={{ textAlign: "center", padding: 20 }}>
            <div
              style={{
                margin: "0 auto",
                height: 30,
                width: 30,
                borderRadius: "50%",
                borderBottom: "3px solid #4c5bd4",
                animation: "spin 0.7s linear infinite"
              }}
            />
            <p style={{ marginTop: 15, color: "#666" }}>Analyzing…</p>
          </div>
        )}

        {resultList.length > 0 && (
          <div style={{ marginTop: 30 }}>
            <h2 style={{ fontSize: "1.5rem", marginBottom: 20 }}>
              Insights Found
            </h2>

            {resultList.map((fb, idx) => (
              <div
                key={idx}
                className="shadow"
                style={{
                  background: "white",
                  padding: 20,
                  borderRadius: 8,
                  marginBottom: 20
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <button
                    onClick={() => jumpTo(fb.timestamp)}
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      color: "#4c5bd4",
                      fontFamily: "monospace",
                      cursor: "pointer",
                      fontSize: "1rem"
                    }}
                  >
                    {fb.timestamp}
                  </button>
                  <span
                    style={{
                      padding: "3px 10px",
                      background: "#e0e6ff",
                      color: "#3B47AA",
                      borderRadius: 12,
                      fontSize: ".8rem"
                    }}
                  >
                    {fb.principle}
                  </span>
                </div>

                <div style={{ marginTop: 12, color: "#444" }}>{fb.description}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

