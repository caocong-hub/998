"use client";

import { useMemo, useRef, useState } from "react";
import { ArrowLeft, Book, Loader2, RefreshCcw, Upload } from "lucide-react";
import type {
  AdaptivePlanItem,
  ConceptDictionaryEntry,
  ModuleConnection,
  TeachingGraphNode,
  TeachingGraphResponse,
  WeaknessItem,
} from "@/lib/teaching-path/module1-types";

const DEMO_TEXT = `Fractions are numbers that represent equal parts of a whole. We can compare fractions by finding common denominators and simplify by dividing numerator and denominator by the same number. In real contexts, fraction operations support sharing and measurement tasks.`;

const DEFAULT_STATES = {
  focus: 0.7,
  confidence: 0.55,
  frustration: 0.35,
  engagement: 0.65,
  correctness: 0.6,
  completion: 0.5,
};

export default function TeachingPathwayPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("Primary Mathematics Lesson");
  const [inputText, setInputText] = useState(DEMO_TEXT);
  const [jsonView, setJsonView] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [zoom, setZoom] = useState(1);
  const [states, setStates] = useState(DEFAULT_STATES);
  const [loadingKind, setLoadingKind] = useState<
    "parse-lesson" | "parse-pdf" | "recompute" | "backflow" | "artifact" | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<TeachingGraphResponse | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string>("");
  const [artifactPreview, setArtifactPreview] = useState<Record<string, unknown> | null>(null);

  const teachingGraph = useMemo(() => response?.teaching_graph ?? [], [response?.teaching_graph]);
  const selectedNode = useMemo(
    () => teachingGraph.find((n) => n.node_id === selectedNodeId) ?? teachingGraph[0],
    [teachingGraph, selectedNodeId]
  );
  const conceptEntries = (response?.concept_dictionary?.entries ?? []) as ConceptDictionaryEntry[];
  const weaknesses = (response?.weakness_summary ?? []) as WeaknessItem[];
  const adaptivePlan = (response?.adaptive_plan ?? []) as AdaptivePlanItem[];
  const module1ToModule4 = response?.module1_to_module4 as ModuleConnection | undefined;
  const graphEdges = response?.knowledge_graph?.edges ?? [];
  const graphNodes = response?.knowledge_graph?.nodes ?? [];

  const filteredNodes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return teachingGraph.filter((node) => {
      const hitFilter = typeFilter === "all" || node.type === typeFilter;
      const hitSearch =
        !q ||
        node.title.toLowerCase().includes(q) ||
        (node.content ?? "").toLowerCase().includes(q) ||
        (node.overview ?? "").toLowerCase().includes(q);
      return hitFilter && hitSearch;
    });
  }, [teachingGraph, search, typeFilter]);

  const nodeTypeList = useMemo(() => {
    return Array.from(new Set(teachingGraph.map((n) => n.type))).filter(Boolean);
  }, [teachingGraph]);

  const setData = (data: TeachingGraphResponse) => {
    setResponse(data);
    const first = data?.teaching_graph?.[0]?.node_id;
    if (first) setSelectedNodeId(first);
  };

  async function postJson(url: string, body: unknown) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || "Request failed");
    return data as TeachingGraphResponse;
  }

  const onBuildGraph = async () => {
    setLoadingKind("parse-lesson");
    setError(null);
    try {
      const data = await postJson("/api/teaching-path/parse-lesson", {
        title,
        text: inputText,
        learner_feedback: states,
      });
      setData(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to build graph");
    } finally {
      setLoadingKind(null);
    }
  };

  const onUploadPdf = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;
    setLoadingKind("parse-pdf");
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/teaching-path/parse-pdf", {
        method: "POST",
        body: form,
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to parse PDF");
      setData(data as TeachingGraphResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to parse PDF");
    } finally {
      setLoadingKind(null);
    }
  };

  const onRecompute = async () => {
    if (!response) return;
    setLoadingKind("recompute");
    setError(null);
    try {
      const data = await postJson("/api/teaching-path/adapt-path", {
        graph_metadata: response.graph_metadata ?? {},
        teaching_graph: response.teaching_graph ?? [],
        learner_feedback: states,
      });
      setData(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Recompute failed");
    } finally {
      setLoadingKind(null);
    }
  };

  const onBackflow = async () => {
    if (!response) return;
    setLoadingKind("backflow");
    setError(null);
    try {
      const data = await postJson("/api/teaching-path/module4-backflow", {
        graph_metadata: response.graph_metadata ?? {},
        teaching_graph: response.teaching_graph ?? [],
        learner_feedback: states,
        module4_to_module1: response.module4_to_module1 ?? {},
      });
      setData(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "module4 backflow failed");
    } finally {
      setLoadingKind(null);
    }
  };

  const onPreviewArtifacts = async () => {
    const cacheKey = String(response?.graph_metadata?.cache_key ?? "");
    if (!cacheKey) return;
    setLoadingKind("artifact");
    setError(null);
    try {
      const res = await fetch(`/api/teaching-path/artifact-preview?cache_key=${encodeURIComponent(cacheKey)}`, {
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "artifact preview failed");
      setArtifactPreview(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "artifact preview failed");
    } finally {
      setLoadingKind(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={onUploadPdf} />
      <header className="px-6 py-4 border-b bg-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
            aria-label="Go back"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="p-2 rounded-lg bg-blue-600 text-white">
            <Book size={18} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400 font-semibold">Module1 Workbench</p>
            <h1 className="text-lg font-bold text-slate-900">Teaching Pathway Planning</h1>
          </div>
        </div>
        <div className="text-xs text-slate-500">
          mode: <span className="font-semibold">{String(response?.graph_metadata?.generation_mode ?? "-")}</span>
        </div>
      </header>

      <div className="p-6 grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6">
        <aside className="space-y-4">
          <section className="rounded-2xl border bg-white p-4 space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400">Input</p>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Lesson title"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="w-full min-h-32 rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Paste lesson content"
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onBuildGraph}
                className="rounded-lg bg-blue-600 text-white px-3 py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
                disabled={Boolean(loadingKind)}
              >
                {loadingKind === "parse-lesson" ? <Loader2 size={14} className="inline animate-spin mr-1" /> : null}
                Build Graph
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60"
                disabled={Boolean(loadingKind)}
              >
                <Upload size={14} className="inline mr-1" />
                Parse PDF
              </button>
              <button
                onClick={onRecompute}
                className="rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60"
                disabled={!response || Boolean(loadingKind)}
              >
                <RefreshCcw size={14} className="inline mr-1" />
                Recompute
              </button>
              <button
                onClick={onBackflow}
                className="rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60"
                disabled={!response || Boolean(loadingKind)}
              >
                Module4 Backflow
              </button>
            </div>
            {error && <p className="text-xs text-rose-700">{error}</p>}
          </section>

          <section className="rounded-2xl border bg-white p-4 space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400">Course Content</p>
            <div className="text-xs rounded-lg bg-blue-50 border border-blue-100 p-2 text-blue-900">
              Pre-class preparation node is inserted by module1 pipeline.
            </div>
            <div className="space-y-2 max-h-80 overflow-auto">
              {teachingGraph.map((node) => (
                <button
                  key={node.node_id}
                  onClick={() => setSelectedNodeId(node.node_id)}
                  className={`w-full text-left rounded-lg border px-3 py-2 ${
                    selectedNode?.node_id === node.node_id ? "border-blue-500 bg-blue-50" : "hover:bg-slate-50"
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-900">
                    {node.sequence_index}. {node.title}
                  </p>
                  <p className="text-xs text-slate-500">{node.type}</p>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-4 space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400">Learner State</p>
            {Object.entries(states).map(([key, value]) => (
              <label key={key} className="block text-xs text-slate-600">
                {key}
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={value}
                  onChange={(e) => setStates((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
                  className="w-full"
                />
              </label>
            ))}
            <div className="text-xs text-slate-500">
              overall_mastery: {response?.learner_snapshot?.overall_mastery ?? "-"} | readiness:{" "}
              {response?.learner_snapshot?.readiness ?? "-"}
            </div>
          </section>
        </aside>

        <main className="space-y-4">
          <section className="rounded-2xl border bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400">Knowledge Graph</p>
              <div className="flex items-center gap-2 text-xs">
                Zoom
                <input type="range" min={0.7} max={1.4} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
              </div>
            </div>
            <div className="text-xs mb-2 text-slate-500">Legend: prerequisite_of / related_to / confusable_with / applied_in</div>
            <div className="overflow-auto border rounded-lg p-3 bg-slate-50">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2" style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}>
                {graphNodes.map((node) => (
                  <button
                    key={node.id}
                    onClick={() => setSelectedNodeId(node.id)}
                    className={`rounded-lg border px-3 py-2 text-left bg-white ${
                      selectedNode?.node_id === node.id ? "border-blue-500" : "border-slate-200"
                    }`}
                  >
                    <p className="text-sm font-semibold">{node.label ?? node.title ?? node.id}</p>
                    {node.node_type ? <p className="text-xs text-slate-500">{node.node_type}</p> : null}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="grid md:grid-cols-2 gap-4">
            <div className="rounded-2xl border bg-white p-4">
              <p className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400 mb-2">Node Detail</p>
              {selectedNode ? (
                <div className="space-y-2 text-sm">
                  <p className="font-semibold text-slate-900">{selectedNode.title}</p>
                  <p className="text-xs text-slate-500">{selectedNode.type}</p>
                  <p>{selectedNode.content ?? selectedNode.overview ?? "-"}</p>
                  <p><span className="font-semibold">Formula:</span> {selectedNode.formula ?? "-"}</p>
                  <p><span className="font-semibold">Example:</span> {selectedNode.problem_text ?? "-"}</p>
                  <p><span className="font-semibold">Practice Task:</span> {selectedNode.practice_prompt ?? "-"}</p>
                  <p><span className="font-semibold">Checkpoint Goal:</span> {selectedNode.checkpoint_goal ?? "-"}</p>
                </div>
              ) : (
                <p className="text-sm text-slate-500">Build graph first.</p>
              )}
            </div>

            <div className="rounded-2xl border bg-white p-4">
              <p className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400 mb-2">Recommended Exercises</p>
              <div className="space-y-2 max-h-64 overflow-auto">
                {(selectedNode?.recommended_exercises ?? []).map((item) => (
                  <div key={item.exercise_id} className="rounded-lg border p-2 text-sm">
                    <p className="font-semibold">{item.question}</p>
                    <p className="text-xs text-slate-500">
                      {[item.question_type, item.leaf_kc].filter(Boolean).join(" | ")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="grid md:grid-cols-2 gap-4">
            <div className="rounded-2xl border bg-white p-4">
              <p className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400 mb-2">Concept Dictionary</p>
              <div className="space-y-2 max-h-64 overflow-auto">
                {conceptEntries.map((entry) => (
                  <div key={entry.concept_id} className="rounded-lg border p-2 text-sm">
                    <p className="font-semibold">{entry.label}</p>
                    <p className="text-xs text-slate-500">{entry.concept_id} | {entry.canonical_key ?? "-"}</p>
                    <p className="text-xs mt-1">{entry.definition ?? "-"}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border bg-white p-4">
              <p className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400 mb-2">Weakness Summary</p>
              <div className="space-y-2 max-h-64 overflow-auto">
                {weaknesses.map((item) => (
                  <div key={item.node_id} className="rounded-lg border p-2 text-sm">
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-xs text-amber-700">severity: {item.severity ?? "-"}</p>
                    <p className="text-xs text-slate-500">{(item.evidence ?? []).join(" | ") || "-"}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="grid md:grid-cols-2 gap-4">
            <div className="rounded-2xl border bg-white p-4">
              <p className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400 mb-2">Adaptive Plan</p>
              <div className="space-y-2 max-h-64 overflow-auto">
                {adaptivePlan.map((item) => (
                  <div key={item.action_id} className="rounded-lg border p-2 text-sm">
                    <p className="font-semibold">{item.decision_type}</p>
                    <p className="text-xs text-slate-600">{item.reason ?? "-"}</p>
                    <p className="text-xs text-slate-500">target: {item.target_node_id}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border bg-white p-4">
              <p className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400 mb-2">Module4 Bridge</p>
              <pre className="text-xs bg-slate-50 border rounded-lg p-2 overflow-auto max-h-48">
                {JSON.stringify(module1ToModule4 ?? {}, null, 2)}
              </pre>
              <div className="mt-2 flex gap-2">
                <a
                  href={`/personalized-generator?payload=${encodeURIComponent(
                    JSON.stringify(module1ToModule4 ?? {})
                  )}`}
                  className="rounded-lg border px-3 py-1.5 text-xs font-semibold hover:bg-slate-50"
                >
                  Open Module4
                </a>
                <button
                  onClick={() => navigator.clipboard.writeText(JSON.stringify(module1ToModule4 ?? {}, null, 2))}
                  className="rounded-lg border px-3 py-1.5 text-xs font-semibold hover:bg-slate-50"
                >
                  Copy Payload
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-4">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <p className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400">Detailed Viewer</p>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search nodes"
                className="rounded-md border px-2 py-1 text-xs"
              />
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="rounded-md border px-2 py-1 text-xs">
                <option value="all">All types</option>
                {nodeTypeList.map((tp) => (
                  <option key={tp} value={tp}>
                    {tp}
                  </option>
                ))}
              </select>
              <button className="rounded-md border px-2 py-1 text-xs" onClick={() => setJsonView((v) => !v)}>
                {jsonView ? "Table View" : "Raw JSON"}
              </button>
            </div>
            {jsonView ? (
              <pre className="text-xs bg-slate-50 border rounded-lg p-3 overflow-auto max-h-72">
                {JSON.stringify(response ?? {}, null, 2)}
              </pre>
            ) : (
              <div className="grid md:grid-cols-2 gap-3">
                <div className="rounded-lg border p-2 max-h-64 overflow-auto">
                  {filteredNodes.map((node: TeachingGraphNode) => (
                    <p key={node.node_id} className="text-xs py-1 border-b last:border-b-0">
                      {node.sequence_index}. {node.title} ({node.type})
                    </p>
                  ))}
                </div>
                <div className="rounded-lg border p-2 max-h-64 overflow-auto">
                  {graphEdges.map((edge, idx) => (
                    <p key={`${edge.source}-${edge.target}-${idx}`} className="text-xs py-1 border-b last:border-b-0">
                      {edge.source} --{edge.relation}--&gt; {edge.target}
                      {edge.explanation ? ` | ${edge.explanation}` : ""}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="rounded-2xl border bg-white p-4">
            <p className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400 mb-2">Artifacts</p>
            <div className="text-xs text-slate-600 mb-2">
              {String(response?.graph_metadata?.artifact_paths?.join?.(" | ") ?? "No artifact paths yet")}
            </div>
            <button
              onClick={onPreviewArtifacts}
              disabled={!response?.graph_metadata?.cache_key || Boolean(loadingKind)}
              className="rounded-lg border px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 disabled:opacity-60"
            >
              Preview Artifacts
            </button>
            {artifactPreview ? (
              <pre className="mt-2 text-xs bg-slate-50 border rounded-lg p-2 overflow-auto max-h-48">
                {JSON.stringify(artifactPreview, null, 2)}
              </pre>
            ) : null}
          </section>
        </main>
      </div>
    </div>
  );
}
