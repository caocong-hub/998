import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Book, 
  Edit3, 
  FileText, 
  CheckCircle,
  Hash,
  ArrowRight,
  Info,
  FunctionSquare,
  Loader2,
  AlertCircle,
  FileUp,
  ChevronLeft,
  ChevronUp
} from 'lucide-react';

const TYPE_CONFIG = {
  Concept: { label: 'Concept', icon: Book, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  Example: { label: 'Example', icon: Edit3, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  Practice: { label: 'Practice', icon: FileText, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
};

const ROLE_CONFIG = {
  'Introduction': { bg: 'bg-blue-100', text: 'text-blue-700', desc: 'Introduces foundational elements.' },
  'Core Concept': { bg: 'bg-purple-100', text: 'text-purple-700', desc: 'Central theoretical framework.' },
  'Reinforcement': { bg: 'bg-emerald-100', text: 'text-emerald-700', desc: 'Strengthens understanding through application.' },
  'Review': { bg: 'bg-gray-100', text: 'text-gray-700', desc: 'Consolidates key outcomes.' },
  'Application': { bg: 'bg-amber-100', text: 'text-amber-700', desc: 'Applies concepts to solve problems.' },
};

function App() {
  const [view, setView] = useState('input'); // 'input' or 'result'
  const [inputText, setInputText] = useState('');
  const [data, setData] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statusIndex, setStatusIndex] = useState(0);

  const loadingStatuses = [
    "Reading textbook content...",
    "Extracting core concepts...",
    "Identifying instructional logic...",
    "Mapping knowledge dependencies...",
    "Structuring teaching path JSON...",
    "Finalizing pedagogical model..."
  ];

  useEffect(() => {
    let interval;
    if (loading) {
      interval = setInterval(() => {
        setStatusIndex((prev) => (prev + 1) % loadingStatuses.length);
      }, 2500); 
    } else {
      setStatusIndex(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const onParseSuccess = (responseData) => {
    const path = responseData.instructional_path;
    setData(responseData);
    if (path && path.length > 0) {
      setSelectedNode(path[0]);
    }
    setView('result');
  };

  const handleParse = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post('http://127.0.0.1:8000/api/parse_lesson', 
        { title: "Input Lesson", text: inputText },
        { timeout: 90000 } 
      );
      onParseSuccess(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || file.type !== 'application/pdf') {
      alert("Please upload a valid PDF file.");
      return;
    }
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await axios.post('http://127.0.0.1:8000/api/parse_pdf', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000 
      });
      onParseSuccess(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to process PDF.");
    } finally {
      setLoading(false);
      event.target.value = null;
    }
  };

  // --- Render Sections ---

  const renderConceptCard = (node) => (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">{node.title}</h2>
        <div className="h-1 w-20 bg-blue-600 rounded-full"></div>
      </div>
      <section>
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Info size={14} /> Overview</h3>
        <p className="text-lg text-gray-700 leading-relaxed font-serif">{node.overview}</p>
      </section>
      {node.definition && (
        <section className="bg-blue-50/30 p-6 rounded-2xl border border-blue-100 shadow-sm italic text-gray-800">
          <h3 className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-3">Definition</h3>
          "{node.definition}"
        </section>
      )}
      {node.formula && (
        <section>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2"><FunctionSquare size={14} /> Formula</h3>
          <div className="bg-gray-900 text-blue-300 p-8 rounded-2xl text-3xl font-mono text-center shadow-xl">{node.formula}</div>
        </section>
      )}
    </div>
  );

  const renderExampleCard = (node) => (
    <div className="space-y-8 animate-in fade-in duration-500">
      <h2 className="text-3xl font-extrabold text-gray-900">{node.title}</h2>
      <section>
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Problem</h3>
        <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 text-lg text-gray-800 leading-relaxed shadow-sm">{node.problem_text}</div>
      </section>
      <section>
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Solution Strategy</h3>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-gray-700">{node.solution_summary}</div>
      </section>
    </div>
  );

  const renderPracticeCard = (node) => (
    <div className="space-y-8 animate-in fade-in duration-500">
      <h2 className="text-3xl font-extrabold text-gray-900">Practice Session</h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-widest">Type</h3>
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">{node.practice_type}</span>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-widest">Target Concept</h3>
          <span className="text-gray-900 font-bold">{node.target_concept}</span>
        </div>
      </div>
      <div className="p-10 border-4 border-dashed border-gray-100 rounded-[2rem] text-center text-gray-400 font-medium italic">(Practice content extracted from source)</div>
    </div>
  );

  // --- Main Views ---

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-white">
        <div className="relative mb-8">
          <Loader2 size={80} className="animate-spin text-blue-100" />
          <div className="absolute inset-0 flex items-center justify-center font-bold text-blue-600 text-2xl">
            {Math.min(99, (statusIndex + 1) * 15)}%
          </div>
        </div>
        <p className="text-lg font-black uppercase tracking-[0.3em] text-gray-800 animate-pulse">{loadingStatuses[statusIndex]}</p>
        <p className="mt-4 text-xs text-gray-400 italic">Structural pedagogical analysis in progress...</p>
      </div>
    );
  }

  if (view === 'input') {
    return (
      <div className="h-screen w-full bg-[#f8fafc] flex flex-col animate-in fade-in duration-700">
        <div className="p-8 bg-white border-b flex justify-between items-center">
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-3 tracking-tighter">
            <div className="bg-blue-600 p-2 rounded-lg text-white"><Hash size={24} /></div>
            TEACHING PATHWAY ARCHITECT
          </h1>
          <div className="text-xs font-bold text-gray-400 uppercase tracking-widest italic">v1.0 MVP Model</div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-12">
          {/* Input Cards Container */}
          <div className="flex w-full max-w-6xl gap-8 items-stretch mb-12">
            {/* Left Box: PDF */}
            <div className="flex-1 bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col items-center justify-center group hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-500">
              <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                <div className="bg-gray-50 p-6 rounded-3xl group-hover:bg-blue-50 transition-colors mb-6">
                  <FileUp size={48} className="text-gray-300 group-hover:text-blue-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-700 mb-2">Upload PDF</h3>
                <p className="text-xs text-gray-400 text-center px-8 uppercase tracking-widest font-medium">Drop textbook here</p>
                <input type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} />
              </label>
            </div>

            {/* Right Box: Text */}
            <div className="flex-1 bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col group hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-500">
              <div className="flex items-center gap-2 mb-4 text-gray-300 font-bold uppercase tracking-widest text-[10px]">
                <Edit3 size={14} /> or paste content
              </div>
              <textarea
                className="flex-1 w-full p-2 text-base bg-transparent outline-none resize-none font-serif text-gray-700 leading-relaxed placeholder:text-gray-200"
                placeholder="Start typing your textbook content here..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
            </div>
          </div>

          {/* Centered Generate Button */}
          <div className="w-full flex justify-center">
            <button
              onClick={handleParse}
              disabled={!inputText.trim()}
              className="px-16 py-5 bg-blue-600 text-white rounded-2xl text-xl font-black uppercase tracking-[0.2em] hover:bg-black hover:scale-[1.05] active:scale-95 transition-all shadow-2xl shadow-blue-200/50 disabled:bg-gray-200 disabled:shadow-none disabled:scale-100"
            >
              Generate Teaching Path
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white overflow-hidden text-gray-900 font-sans animate-in slide-in-from-right duration-500">
      {/* LEFT SIDEBAR: Result & Collapsed Input */}
      <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col relative">
        {/* Partially revealed Input Section (The "Upper Part") */}
        <div className="group relative border-b bg-white transition-all duration-300 hover:h-48 h-20 overflow-hidden flex flex-col">
          <div className="p-4 flex justify-between items-center bg-gray-50/80">
             <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
               <ChevronUp size={12} className="group-hover:animate-bounce" /> Update Content
             </span>
             <button onClick={() => setView('input')} className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1">
               <ChevronLeft size={10} /> BACK
             </button>
          </div>
          <textarea
            className="flex-1 w-full p-4 text-xs bg-transparent outline-none resize-none opacity-40 group-hover:opacity-100 transition-opacity"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
          <button 
            onClick={handleParse}
            className="absolute bottom-2 right-4 p-2 bg-blue-600 text-white rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ArrowRight size={16} />
          </button>
        </div>

        {/* Nodes List (The "Lower Part") */}
        <div className="p-4 bg-white/50 border-b flex items-center justify-between">
           <span className="text-xs font-black uppercase tracking-widest text-gray-500">Path Nodes</span>
           <div className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded font-bold">{data?.instructional_path.length} Units</div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs flex items-start gap-2">
              <AlertCircle size={16} className="flex-shrink-0" /> {error}
            </div>
          )}
          {data?.instructional_path.map((node) => {
            const config = TYPE_CONFIG[node.type] || { label: 'Node', icon: CheckCircle, color: 'text-gray-600' };
            const isSelected = selectedNode?.sequence_index === node.sequence_index;
            const Icon = config.icon;

            return (
              <div 
                key={node.sequence_index}
                onClick={() => setSelectedNode(node)}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-4 ${isSelected ? 'bg-white border-blue-600 shadow-xl scale-[1.02]' : 'bg-transparent border-transparent hover:bg-white hover:border-gray-200'}`}
              >
                <div className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {node.sequence_index}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isSelected ? config.color : 'text-gray-400'}`}>
                    {node.type}
                  </div>
                  <div className={`text-sm font-bold truncate ${isSelected ? 'text-gray-900' : 'text-gray-600'}`}>
                    {node.title || `${node.type} ${node.sequence_index}`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT DISPLAY AREA */}
      <div className="flex-1 overflow-y-auto p-12 bg-white flex flex-col items-center">
        {selectedNode ? (
          <div className="max-w-3xl w-full flex-1 flex flex-col">
            <div className="flex-1 mb-12">
              {selectedNode.type === 'Concept' && renderConceptCard(selectedNode)}
              {selectedNode.type === 'Example' && renderExampleCard(selectedNode)}
              {selectedNode.type === 'Practice' && renderPracticeCard(selectedNode)}
            </div>

            <div className="mt-auto bg-gray-50 p-8 rounded-[2rem] border border-gray-100 flex items-center gap-8 shadow-inner">
              <div className="flex-shrink-0">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-2 text-center">Instructional Role</span>
                <div className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-center shadow-sm ${ROLE_CONFIG[selectedNode.teaching_role]?.bg || 'bg-gray-200'} ${ROLE_CONFIG[selectedNode.teaching_role]?.text || 'text-gray-600'}`}>
                  {selectedNode.teaching_role}
                </div>
              </div>
              <div className="flex-1 border-l border-gray-200 pl-8 py-1">
                <p className="text-gray-500 text-sm font-medium leading-relaxed">
                  {ROLE_CONFIG[selectedNode.teaching_role]?.desc || 'Educational impact.'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-200 italic">Select a node to view details</div>
        )}
      </div>
    </div>
  );
}

export default App;
