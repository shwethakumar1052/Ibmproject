import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, CheckCircle2, AlertTriangle, X } from "lucide-react";
import axios from "axios";

function parseCSV(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g,""));
  return lines.slice(1).map(line => {
    const vals = line.match(/(".*?"|[^,]+)(?=,|$)/g) || [];
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (vals[i] || "").replace(/^"|"$/g,"").trim(); });
    return obj;
  }).filter(r => r["Scheme Name"] || r["name"]);
}

export default function UploadSchemes() {
  const [dragging, setDragging]   = useState(false);
  const [file, setFile]           = useState(null);
  const [preview, setPreview]     = useState([]);
  const [status, setStatus]       = useState(null); // null | "success" | "error"
  const [msg, setMsg]             = useState("");
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  function processFile(f) {
    if (!f) return;
    setFile(f);
    setStatus(null);
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target.result;
      try {
        let rows = [];
        if (f.name.endsWith(".json")) {
          rows = JSON.parse(text);
        } else {
          rows = parseCSV(text);
        }
        setPreview(rows.slice(0, 5));
        setMsg(`Detected ${rows.length} records in ${f.name}`);
        setStatus("ready");
      } catch (err) {
        setStatus("error");
        setMsg("Could not parse file. Ensure it is a valid CSV or JSON.");
      }
    };
    reader.readAsText(f);
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  }

  function onInputChange(e) {
    processFile(e.target.files[0]);
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    try {
      // In a real deployment, POST the file to a backend endpoint that
      // re-runs import_dataset.py. Here we trigger a backend reload.
      await axios.post("/api/admin/reload");
      setStatus("success");
      setMsg(`Upload complete. Backend reloaded with latest dataset. Place your CSV in the root directory and re-run import_dataset.py for full ingestion.`);
    } catch {
      setStatus("error");
      setMsg("Backend reload failed. Ensure the server is running.");
    } finally { setUploading(false); }
  }

  function clear() {
    setFile(null); setPreview([]); setStatus(null); setMsg("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <motion.div className="flex flex-col gap-6 page-enter max-w-3xl"
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>

      <div>
        <h1 className="text-2xl font-bold gradient-text">Upload Dataset</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Upload a CSV or JSON file to ingest new government schemes.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className="glass-card flex flex-col items-center justify-center gap-4 py-14 cursor-pointer transition-all"
        style={{
          border: dragging ? "2px dashed var(--accent)" : "2px dashed var(--border)",
          background: dragging ? "rgba(99,102,241,0.05)" : "var(--bg-card)"
        }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
             style={{ background: dragging ? "rgba(99,102,241,0.15)" : "var(--bg-secondary)", color: "var(--accent)" }}>
          <Upload size={26} />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {dragging ? "Drop your file here" : "Drag & drop or click to upload"}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            Supported: CSV (with headers), JSON array
          </p>
        </div>
        <input ref={inputRef} type="file" accept=".csv,.json" className="hidden" onChange={onInputChange} />
      </div>

      {/* Status message */}
      <AnimatePresence>
        {msg && (
          <motion.div className="flex items-start gap-3 px-4 py-3 rounded-xl"
            initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
            style={{
              background: status === "success" ? "rgba(16,185,129,0.1)" : status === "error" ? "rgba(239,68,68,0.1)" : "rgba(99,102,241,0.08)",
              color: status === "success" ? "var(--success)" : status === "error" ? "var(--danger)" : "var(--accent)"
            }}>
            {status === "success" ? <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
              : status === "error" ? <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              : <FileText size={16} className="shrink-0 mt-0.5" />}
            <p className="text-xs flex-1">{msg}</p>
            <button onClick={clear} style={{ background:"none", border:"none", cursor:"pointer", color:"inherit" }}><X size={13} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview table */}
      {preview.length > 0 && (
        <div className="glass-card p-5 flex flex-col gap-3">
          <p className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
            Preview — first {preview.length} records
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ minWidth:"500px" }}>
              <thead>
                <tr style={{ borderBottom:"1px solid var(--border)" }}>
                  {Object.keys(preview[0]).slice(0,5).map(k => (
                    <th key={k} className="text-left py-1.5 pr-4 font-semibold" style={{ color:"var(--text-muted)" }}>
                      {k.slice(0,20)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} style={{ borderBottom:"1px solid var(--border)" }}>
                    {Object.values(row).slice(0,5).map((v, j) => (
                      <td key={j} className="py-1.5 pr-4 max-w-xs truncate" style={{ color:"var(--text-secondary)" }}>
                        {String(v).slice(0,60)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3 mt-2">
            <button onClick={handleUpload} disabled={uploading || status === "success"}
              className="btn-primary flex items-center gap-2 text-sm">
              {uploading ? "Uploading…" : "Confirm & Ingest"}
            </button>
            <button onClick={clear} className="btn-ghost text-sm">Clear</button>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="glass-card p-5">
        <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Expected CSV Columns</h2>
        <div className="flex flex-wrap gap-2">
          {["Scheme Name","Slug","Brief Description","Detailed Description","Benefits","Eligibility",
            "Application Process","Application URL","Level","Scheme Type","Ministry","Department",
            "Open Date","Close Date","Implementing Agency"].map(c => (
            <span key={c} className="badge badge-central text-xs">{c}</span>
          ))}
        </div>
        <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>
          After uploading, place the CSV as <code>government_schemes_dataset_4430.csv</code> in the root
          directory and run <code>python backend/import_dataset.py</code> for full NLP processing,
          then click "Reload Backend".
        </p>
      </div>
    </motion.div>
  );
}
