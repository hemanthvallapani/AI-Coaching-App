import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

// Honestly nothing crazy happening here, just mounting the app.
// Might clean this later if we add routing or whatever.
const rootEl = document.getElementById("root");

// sanity check – shouldn't really happen unless HTML changed
if (!rootEl) {
  console.error("Root element not found. Did someone rename it?");
}

const root = ReactDOM.createRoot(rootEl);

// StrictMode is fine. If it gets annoying during dev, just remove it.
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);



