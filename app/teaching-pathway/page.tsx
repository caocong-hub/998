"use client";

import { useMemo, useRef, useState } from "react";
import { Book, FileUp, Edit3, ChevronRight, ArrowLeft, Loader2 } from "lucide-react";

type KnowledgePoint = {
  id: string;
  title: string;
  summary: string;
  details: string;
  type?: "Concept" | "Example" | "Practice";
  teachingRole?:
    | "Introduction"
    | "Core Concept"
    | "Reinforcement"
    | "Review"
    | "Application";
};

const MIN_CHARS = 50;

export default function TeachingPathwayPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<"input" | "result">("input");
  const [inputText, setInputText] = useState("");
  const [nodes, setNodes] = useState<KnowledgePoint[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parseSource, setParseSource] = useState<"llm" | "heuristic" | null>(null);
  const [parseModel, setParseModel] = useState<string | null>(null);

  const selectedPoint = useMemo(() => {
    if (nodes.length === 0) return null;
    return nodes.find((p) => p.id === selectedId) ?? nodes[0];
  }, [nodes, selectedId]);

  const handleGenerate = async () => {
    const text = inputText.trim();
    if (text.length < MIN_CHARS) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/teaching-path/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof data?.error === "string"
            ? data.error
            : res.status === 401
            ? "Please sign in to generate a pathway."
            : "Generation failed. Please try again."
        );
        return;
      }
      const list = data?.nodes as KnowledgePoint[] | undefined;
      if (!Array.isArray(list) || list.length === 0) {
        setError("No valid knowledge points returned. Try longer text with clearer paragraphs.");
        return;
      }
      setNodes(list);
      setSelectedId(list[0].id);
      setParseSource(data?.source === "llm" ? "llm" : "heuristic");
      setParseModel(typeof data?.model === "string" ? data.model : null);
      setView("result");
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePickTxt = () => fileInputRef.current?.click();

  const handleTxtFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".txt")) {
      setError("Please choose a .txt file or copy text from your PDF into the box on the right.");
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const t = typeof reader.result === "string" ? reader.result : "";
      setInputText(t);
      setError(null);
    };
    reader.onerror = () => setError("Failed to read the file.");
    reader.readAsText(file, "UTF-8");
    event.target.value = "";
  };

  const goBackToInput = () => {
    setView("input");
    setError(null);
  };

  if (view === "input") {
    return (
      <div className="min-h-screen w-full bg-slate-50 flex flex-col">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".txt,text/plain"
          onChange={handleTxtFile}
        />
        <header className="px-8 py-6 bg-white border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.history.back()}
              className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
              aria-label="Go back"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="bg-blue-600 text-white p-2 rounded-lg">
              <Book size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                Teaching Pathway Architect
              </p>
              <h1 className="text-xl font-bold text-slate-900">
                Build a teaching pathway from text
              </h1>
            </div>
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center px-8 py-12">
          {error && (
            <div className="w-full max-w-5xl mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {error}
            </div>
          )}
          <div className="w-full max-w-5xl grid md:grid-cols-2 gap-8">
            <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm hover:shadow-lg transition-all duration-300 group">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="p-4 rounded-2xl bg-slate-100 group-hover:bg-blue-50 transition">
                  <FileUp size={44} className="text-slate-400 group-hover:text-blue-500" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900">Source text</h2>
                <p className="text-sm text-slate-500">
                  For PDFs, copy the text into the box on the right. You can also load a UTF-8
                  .txt file (at least {MIN_CHARS} characters before generating).
                </p>
                <button
                  type="button"
                  onClick={handlePickTxt}
                  disabled={loading}
                  className="mt-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                >
                  Choose .txt file
                </button>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-[0.2em] mb-4">
                <Edit3 size={14} />
                Paste text
              </div>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Paste lesson or textbook text (multiple paragraphs, separated by blank lines, work best)…"
                className="flex-1 min-h-[180px] w-full border border-slate-100 rounded-xl p-4 text-slate-800 bg-slate-50 focus:bg-white focus:border-blue-200 focus:ring-2 focus:ring-blue-100 outline-none transition"
              />
              <p className="mt-2 text-xs text-slate-500">
                At least {MIN_CHARS} characters. With LLM configured, the server builds a structured
                pathway; otherwise it splits by paragraphs and sentences (up to 8 points).
              </p>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={loading || inputText.trim().length < MIN_CHARS}
                className="mt-4 w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition disabled:bg-slate-200 disabled:text-slate-500 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Generating…
                  </>
                ) : (
                  "Generate pathway"
                )}
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!selectedPoint) {
    return null;
  }

  return (
    <div className="h-screen w-full grid grid-cols-[320px_1fr] bg-white">
      <aside className="border-r border-slate-200 bg-slate-50 flex flex-col">
        <div className="px-6 py-5 border-b border-slate-200">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-[0.2em]">
            Knowledge Points
          </p>
          <h2 className="text-lg font-bold text-slate-900">Teaching Pathway</h2>
          <p className="text-xs text-slate-500 mt-1">
            Select a node to view details (generated on the server).
          </p>
          {parseSource && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  parseSource === "llm"
                    ? "bg-violet-100 text-violet-800"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {parseSource === "llm" ? "LLM" : "Rule-based"}
              </span>
              {parseSource === "llm" && parseModel && (
                <span className="text-[10px] text-slate-500 truncate max-w-[200px]" title={parseModel}>
                  {parseModel}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {nodes.map((kp) => {
            const isActive = kp.id === selectedId;
            return (
              <button
                key={kp.id}
                type="button"
                onClick={() => setSelectedId(kp.id)}
                className={`w-full text-left p-4 rounded-xl border transition flex items-center justify-between ${
                  isActive
                    ? "border-blue-600 bg-white shadow-sm"
                    : "border-transparent bg-white hover:border-slate-200"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">{kp.title}</p>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{kp.summary}</p>
                  {(kp.type || kp.teachingRole) && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {kp.type && (
                        <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-800">
                          {kp.type}
                        </span>
                      )}
                      {kp.teachingRole && (
                        <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-900">
                          {kp.teachingRole}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <ChevronRight
                  size={16}
                  className={`text-slate-300 shrink-0 ${isActive ? "text-blue-500" : ""}`}
                />
              </button>
            );
          })}
        </div>
        <div className="p-4 border-t border-slate-200 bg-white">
          <button
            type="button"
            onClick={goBackToInput}
            className="w-full py-2.5 text-sm font-semibold text-blue-600 border border-blue-100 rounded-lg hover:bg-blue-50 transition"
          >
            Back to edit text
          </button>
        </div>
      </aside>

      <main className="p-10 overflow-y-auto">
        <div className="max-w-4xl space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Teaching pathway
            </p>
            {parseSource === "llm" && (
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-800">
                LLM
              </span>
            )}
            {parseSource === "heuristic" && (
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                Rule-based
              </span>
            )}
            {selectedPoint.type && (
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-800">
                {selectedPoint.type}
              </span>
            )}
            {selectedPoint.teachingRole && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-900">
                {selectedPoint.teachingRole}
              </span>
            )}
          </div>
          <h1 className="text-3xl font-bold text-slate-900">{selectedPoint.title}</h1>
          <p className="text-base text-slate-600 leading-relaxed whitespace-pre-wrap">
            {selectedPoint.details}
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700 mb-2">
                Summary
              </p>
              <p className="text-sm text-blue-900">{selectedPoint.summary}</p>
            </div>
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 mb-2">
                Next step
              </p>
              <p className="text-sm text-emerald-900">
                Add examples, practice, or a quiz in your course to reinforce this point.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
