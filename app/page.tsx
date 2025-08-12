"use client";
import { useState } from "react";

export default function Home() {
  const [appKey, setAppKey] = useState("");
  const [data, setData] = useState<Array<{ key: string; company_name: string; activation_date: string }> | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const load = async () => {
    setLoading(true); setErr(""); setData(null);
    const q = appKey ? `?application_key=${encodeURIComponent(appKey)}` : "";
    const res = await fetch(`/api/pt/activations${q}`);
    if (!res.ok) {
      setErr(`${res.status}: ${await res.text()}`); setLoading(false); return;
    }
    setData(await res.json()); setLoading(false);
  };

  return (
    <main className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Property Tree: Activations</h1>
      <div className="flex gap-2 mb-4">
        <input
          className="border rounded px-3 py-2 flex-1"
          placeholder="(optional) override application key"
          value={appKey}
          onChange={(e) => setAppKey(e.target.value)}
        />
        <button
          onClick={load}
          className="rounded px-4 py-2 border"
          disabled={loading}
        >
          {loading ? "Loading…" : "Fetch"}
        </button>
      </div>

      {err && <div className="text-red-600 mb-4">{err}</div>}

      {Array.isArray(data) && (
        <div className="space-y-2">
          {data.length === 0 && <div>No activations yet.</div>}
          {data.map((row, i) => (
            <div key={i} className="border rounded p-3">
              <div><b>Key</b>: {row.key}</div>
              <div><b>Company</b>: {row.company_name}</div>
              <div><b>Activated</b>: {row.activation_date}</div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
