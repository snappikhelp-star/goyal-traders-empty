import "./index.css";

const rootEl = document.getElementById("root")!;

import("./App")
  .then(({ default: App }) => {
    import("react-dom/client").then(({ createRoot }) => {
      createRoot(rootEl).render(<App />);
    });
  })
  .catch((err) => {
    console.error("Failed to start application:", err);
    rootEl.innerHTML = `
      <div style="display:flex;min-height:100vh;align-items:center;justify-content:center;padding:2rem;font-family:system-ui,sans-serif;background:#f8fafc;">
        <div style="max-width:28rem;text-align:center;">
          <h1 style="font-size:1.25rem;font-weight:700;color:#1e293b;margin-bottom:0.5rem;">Unable to start GOYAL TRADERS CRM</h1>
          <p style="color:#64748b;font-size:0.875rem;line-height:1.5;">
            ${err instanceof Error ? err.message : "An unexpected error occurred while loading the application."}
          </p>
        </div>
      </div>`;
  });
