import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Shield, 
  Search, 
  FileText, 
  AlertTriangle, 
  BarChart3, 
  CheckCircle2, 
  Plus, 
  History, 
  ChevronRight, 
  Loader2, 
  Send,
  Info,
  Layers,
  Flag,
  Lightbulb,
  Upload,
  File,
  X,
  Paperclip
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Markdown from 'react-markdown';
import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { analyzeComplianceCase, type CaseAnalysis } from './services/geminiService';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const EvidenceTooltip = ({ evidence }: { evidence?: string }) => {
  if (!evidence) return null;
  return (
    <div className="group relative inline-block ml-1">
      <Info size={12} className="text-gray-400 cursor-help hover:text-accent transition-colors" />
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-ink text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl border border-white/10">
        <p className="font-bold text-accent mb-1 uppercase tracking-wider">Source Evidence</p>
        <p className="italic leading-relaxed">"{evidence}"</p>
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-ink" />
      </div>
    </div>
  );
};

interface CaseRecord {
  id: string;
  timestamp: number;
  input: string;
  analysis: CaseAnalysis;
  fileName?: string;
}

interface AttachedFile {
  name: string;
  type: string;
  data: string; // base64 for PDF, text for others
  isNative: boolean; // true if sent as inlineData (PDF)
}

export default function App() {
  const [input, setInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<CaseAnalysis | null>(null);
  const [history, setHistory] = useState<CaseRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [activeResultTab, setActiveResultTab] = useState<'structured' | 'report'>('report');
  const [error, setError] = useState<string | null>(null);
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    const reader = new FileReader();

    try {
      if (file.type === 'application/pdf') {
        // PDF: Send as inlineData
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          setAttachedFile({
            name: file.name,
            type: file.type,
            data: base64,
            isNative: true
          });
        };
        reader.readAsDataURL(file);
      } else if (file.name.endsWith('.docx')) {
        // DOCX: Extract text
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        setAttachedFile({
          name: file.name,
          type: 'text/plain',
          data: result.value,
          isNative: false
        });
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')) {
        // Excel/CSV: Extract text
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer);
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        setAttachedFile({
          name: file.name,
          type: 'text/plain',
          data: csv,
          isNative: false
        });
      } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        // Text: Read as text
        reader.onload = () => {
          setAttachedFile({
            name: file.name,
            type: 'text/plain',
            data: reader.result as string,
            isNative: false
          });
        };
        reader.readAsText(file);
      } else {
        setError('Unsupported file type. Please upload PDF, DOCX, XLSX, or CSV.');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to process file.');
    }
  };

  const handleAnalyze = async () => {
    if (!input.trim() && !attachedFile) return;
    
    setIsAnalyzing(true);
    setError(null);
    try {
      let finalInput = input;
      let filePayload = undefined;

      if (attachedFile) {
        if (attachedFile.isNative) {
          filePayload = { data: attachedFile.data, mimeType: attachedFile.type };
        } else {
          finalInput = `${input}\n\n--- ATTACHED FILE CONTENT (${attachedFile.name}) ---\n${attachedFile.data}`;
        }
      }

      const result = await analyzeComplianceCase(finalInput, filePayload);
      setCurrentAnalysis(result);
      const newRecord: CaseRecord = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        input: finalInput,
        analysis: result,
        fileName: attachedFile?.name
      };
      setHistory(prev => [newRecord, ...prev]);
    } catch (err) {
      console.error(err);
      setError('Failed to analyze case. Please ensure your API key is configured and try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getPriorityColor = (level: string) => {
    switch (level) {
      case 'Low': return 'text-risk-low bg-risk-low/10 border-risk-low/20';
      case 'Medium': return 'text-risk-medium bg-risk-medium/10 border-risk-medium/20';
      case 'High': return 'text-risk-high bg-risk-high/10 border-risk-high/20';
      case 'Critical': return 'text-risk-critical bg-risk-critical/10 border-risk-critical/20';
      default: return 'text-gray-500 bg-gray-100 border-gray-200';
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      {/* Sidebar */}
      <aside className="w-64 border-r border-line bg-white flex flex-col">
        <div className="p-6 flex items-center gap-3 border-b border-line">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center text-white">
            <Shield size={20} />
          </div>
          <h1 className="text-xl font-bold tracking-tight">ComplyAI</h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button 
            onClick={() => setActiveTab('new')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium",
              activeTab === 'new' ? "bg-accent text-white" : "text-gray-600 hover:bg-gray-100"
            )}
          >
            <Plus size={18} />
            New Analysis
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium",
              activeTab === 'history' ? "bg-accent text-white" : "text-gray-600 hover:bg-gray-100"
            )}
          >
            <History size={18} />
            History
          </button>
          
                  <div className="pt-4">
            <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Recent Cases</p>
            <div className="space-y-1">
              {history.slice(0, 5).map(record => (
                <button 
                  key={record.id}
                  onClick={() => {
                    setCurrentAnalysis(record.analysis);
                    setInput(record.input);
                    setActiveTab('new');
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs text-gray-500 hover:bg-gray-100 truncate"
                >
                  {record.analysis.classification[0]?.category || 'Unknown Case'}
                </button>
              ))}
            </div>
          </div>
        </nav>
        
        <div className="p-4 border-t border-line">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
              <span className="text-xs font-bold">JD</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">Compliance Officer</p>
              <p className="text-[10px] text-gray-400 truncate">active_session_029</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-16 border-b border-line bg-white/80 backdrop-blur-sm flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Dashboard</span>
            <ChevronRight size={14} />
            <span className="text-ink font-medium">
              {activeTab === 'new' ? 'Case Analysis' : 'Historical Records'}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text" 
                placeholder="Search cases..." 
                className="pl-10 pr-4 py-1.5 bg-gray-100 border-none rounded-full text-sm focus:ring-2 focus:ring-accent/20 transition-all w-64"
              />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-5xl mx-auto space-y-8">
            {activeTab === 'new' ? (
              <>
                {/* Input Section */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <FileText size={20} className="text-accent" />
                      Case Data Input
                    </h2>
                    <span className="text-xs text-gray-400">Paste case notes, logs, or reports below</span>
                  </div>
                  <div className="relative group">
                    <textarea 
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Enter compliance case details here... e.g., 'On Oct 12, 2023, a suspicious transaction of $50,000 was flagged in the New York branch...'"
                      className="w-full h-48 p-4 bg-white border border-line rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all resize-none font-mono text-sm leading-relaxed card-shadow"
                    />
                    
                    {attachedFile && (
                      <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-accent-soft border border-accent/20 rounded-lg animate-in fade-in slide-in-from-top-2">
                        <File size={14} className="text-accent" />
                        <span className="text-xs font-medium text-accent truncate max-w-[120px]">{attachedFile.name}</span>
                        <button 
                          onClick={() => setAttachedFile(null)}
                          className="p-0.5 hover:bg-accent/10 rounded-full transition-colors"
                        >
                          <X size={14} className="text-accent" />
                        </button>
                      </div>
                    )}

                    <div className="absolute bottom-4 left-4 flex items-center gap-2">
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept=".pdf,.docx,.xlsx,.xls,.csv,.txt"
                      />
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 text-gray-400 hover:text-accent hover:bg-accent-soft rounded-lg transition-all flex items-center gap-2 text-xs font-medium"
                        title="Attach document (PDF, DOCX, XLSX, CSV)"
                      >
                        <Paperclip size={18} />
                        <span>Attach Document</span>
                      </button>
                    </div>

                    <div className="absolute bottom-4 right-4 flex items-center gap-2">
                      {(input || attachedFile) && !isAnalyzing && (
                        <button 
                          onClick={() => {
                            setInput('');
                            setAttachedFile(null);
                          }}
                          className="px-4 py-2 rounded-lg font-medium text-gray-400 hover:text-gray-600 transition-all text-sm"
                        >
                          Clear
                        </button>
                      )}
                      <button 
                        onClick={handleAnalyze}
                        disabled={isAnalyzing || (!input.trim() && !attachedFile)}
                        className={cn(
                          "px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-all",
                          isAnalyzing || (!input.trim() && !attachedFile)
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
                            : "bg-accent text-white hover:bg-accent/90 shadow-lg shadow-accent/20"
                        )}
                      >
                        {isAnalyzing ? (
                          <>
                            <Loader2 size={18} className="animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Send size={18} />
                            Run Analysis
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm flex items-center gap-2">
                      <AlertTriangle size={16} />
                      {error}
                    </div>
                  )}
                </section>

                {/* Results Section */}
                <AnimatePresence mode="wait">
                  {currentAnalysis ? (
                    <motion.div 
                      key="results"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="space-y-6"
                    >
                      {/* Result Tabs */}
                      <div className="flex items-center gap-4 border-b border-line pb-4">
                        <button 
                          onClick={() => setActiveResultTab('report')}
                          className={cn(
                            "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                            activeResultTab === 'report' ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-gray-500 hover:bg-gray-100"
                          )}
                        >
                          Analyst Report
                        </button>
                        <button 
                          onClick={() => setActiveResultTab('structured')}
                          className={cn(
                            "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                            activeResultTab === 'structured' ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-gray-500 hover:bg-gray-100"
                          )}
                        >
                          Structured Data
                        </button>
                      </div>

                      {activeResultTab === 'report' ? (
                        <div className="bg-white p-8 rounded-xl border border-line card-shadow space-y-6">
                          <div className="flex items-center justify-between border-b border-line pb-4">
                            <h3 className="font-bold text-lg text-ink">Compliance Investigation Report</h3>
                            <div className={cn("px-3 py-1 rounded-full text-xs font-bold border", getPriorityColor(currentAnalysis.priority))}>
                              {currentAnalysis.priority} Priority
                            </div>
                          </div>
                          <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed markdown-body">
                            <Markdown>{currentAnalysis.report}</Markdown>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Classification Card */}
                            <div className="md:col-span-2 bg-white p-6 rounded-xl border border-line card-shadow space-y-4">
                              <div className="flex items-center justify-between">
                                <h3 className="font-bold text-sm uppercase tracking-wider text-gray-400">Case Classification</h3>
                                <div className="flex items-center gap-2">
                                  <button 
                                    onClick={() => {
                                      navigator.clipboard.writeText(JSON.stringify(currentAnalysis, null, 2));
                                      alert('Analysis JSON copied to clipboard');
                                    }}
                                    className="text-[10px] font-bold text-gray-400 hover:text-accent uppercase tracking-wider transition-colors"
                                  >
                                    Copy JSON
                                  </button>
                                  <div className={cn("px-3 py-1 rounded-full text-xs font-bold border", getPriorityColor(currentAnalysis.priority))}>
                                    {currentAnalysis.priority} Priority
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-4">
                                {currentAnalysis.classification.map((c, i) => (
                                  <div key={i} className="p-4 bg-gray-50 rounded-lg border border-line">
                                    <div className="flex items-center justify-between mb-2">
                                      <p className="font-semibold text-accent">{c.category}</p>
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase">Confidence: {c.confidence}</span>
                                        <EvidenceTooltip evidence={c.evidence} />
                                      </div>
                                    </div>
                                    <p className="text-xs text-gray-600 leading-relaxed">{c.justification}</p>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Risk Assessment */}
                            <div className="bg-white p-6 rounded-xl border border-line card-shadow space-y-4">
                              <h3 className="font-bold text-sm uppercase tracking-wider text-gray-400 flex items-center gap-2">
                                <AlertTriangle size={16} />
                                Risk Assessment
                              </h3>
                              <div className="space-y-4">
                                <div>
                                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Risk Type</p>
                                  <p className="font-semibold text-ink">{currentAnalysis.risk_assessment.risk_type}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Severity</p>
                                  <div className={cn("px-3 py-1 rounded-full text-xs font-bold border inline-block", getPriorityColor(currentAnalysis.risk_assessment.severity))}>
                                    {currentAnalysis.risk_assessment.severity}
                                  </div>
                                </div>
                                <div>
                                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Confidence Score</p>
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-gray-100 h-2 rounded-full overflow-hidden">
                                      <div 
                                        className="bg-accent h-full transition-all duration-500" 
                                        style={{ width: `${currentAnalysis.risk_assessment.confidence_score * 100}%` }}
                                      />
                                    </div>
                                    <span className="text-xs font-bold text-ink">{(currentAnalysis.risk_assessment.confidence_score * 10).toFixed(1)}/10</span>
                                  </div>
                                </div>
                                <div className="pt-4 border-t border-line">
                                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Reasoning</p>
                                  <p className="text-xs text-gray-500 italic leading-relaxed">
                                    "{currentAnalysis.risk_assessment.reasoning}"
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Extraction Details */}
                            <div className="bg-white p-6 rounded-xl border border-line card-shadow space-y-6">
                              <h3 className="font-bold text-sm uppercase tracking-wider text-gray-400 flex items-center gap-2">
                                <Search size={16} />
                                Entities & Timeline
                              </h3>
                              
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <p className="text-[10px] font-bold text-gray-400 uppercase">Key Entities</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {currentAnalysis.entities.map((e, i) => (
                                      <div key={i} className={cn(
                                        "flex items-center px-2 py-0.5 rounded text-[10px] font-medium",
                                        e.type === 'person' ? "bg-gray-100 text-gray-600" :
                                        e.type === 'organization' ? "bg-indigo-50 text-indigo-600" :
                                        e.type === 'location' ? "bg-stone-100 text-stone-600" :
                                        e.type === 'account' ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                                      )}>
                                        <span className="opacity-60 mr-1 uppercase text-[8px]">{e.type}</span>
                                        {e.name}
                                        <div className="ml-1.5 px-1 bg-white/50 rounded text-[8px]">{e.confidence}</div>
                                        <EvidenceTooltip evidence={e.evidence} />
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <div className="space-y-2 pt-4 border-t border-line">
                                  <p className="text-[10px] font-bold text-gray-400 uppercase">Timeline of Events</p>
                                  <div className="space-y-3">
                                    {currentAnalysis.events.map((e, i) => (
                                      <div key={i} className="relative pl-4 border-l-2 border-accent/20 py-1">
                                        <div className="absolute -left-[5px] top-2 w-2 h-2 rounded-full bg-accent" />
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="text-[10px] font-bold text-accent">{e.date}</span>
                                          <EvidenceTooltip evidence={e.evidence} />
                                        </div>
                                        <p className="text-xs font-semibold text-ink mb-0.5">{e.event}</p>
                                        <p className="text-[10px] text-gray-500 leading-tight">{e.description}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              <div className="pt-4 border-t border-line space-y-4">
                                <h4 className="text-[10px] font-bold text-gray-400 uppercase">Compliance Signals</h4>
                                <div className="space-y-2">
                                  {currentAnalysis.signals.map((s, i) => (
                                    <div key={i} className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                                      <div className="flex items-center justify-between mb-1">
                                        <p className="text-xs font-bold text-purple-700">{s.signal}</p>
                                        <div className="flex items-center gap-2">
                                          <span className="text-[8px] font-bold text-purple-400 uppercase">Confidence: {s.confidence}</span>
                                          <EvidenceTooltip evidence={s.evidence} />
                                        </div>
                                      </div>
                                      <p className="text-[10px] text-purple-600 leading-tight">{s.description}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Recommendations & Gaps */}
                            <div className="bg-white p-6 rounded-xl border border-line card-shadow space-y-6">
                              <div className="space-y-4">
                                <h3 className="font-bold text-sm uppercase tracking-wider text-gray-400 flex items-center gap-2">
                                  <Lightbulb size={16} />
                                  Actionable Recommendations
                                </h3>
                                <div className="space-y-3">
                                  {currentAnalysis.recommendations.map((rec, i) => (
                                    <div key={i} className="p-3 bg-accent-soft rounded-lg border border-accent/10">
                                      <div className="flex items-center gap-2 mb-1">
                                        <CheckCircle2 size={14} className="text-accent" />
                                        <span className="text-[8px] font-bold text-accent uppercase tracking-widest">{rec.type}</span>
                                      </div>
                                      <p className="text-xs font-semibold text-ink mb-1">{rec.action}</p>
                                      <p className="text-[10px] text-gray-500 leading-relaxed">{rec.justification}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              
                              {currentAnalysis.missing_information.length > 0 && (
                                <div className="mt-6 pt-4 border-t border-line">
                                  <p className="text-[10px] font-bold text-risk-high uppercase mb-2 flex items-center gap-1">
                                    <Info size={10} />
                                    Data Gaps & Missing Info
                                  </p>
                                  <ul className="space-y-1.5">
                                    {currentAnalysis.missing_information.map((info, i) => (
                                      <li key={i} className="text-xs text-gray-500 flex items-start gap-2">
                                        <span className="w-1 h-1 rounded-full bg-risk-high mt-1.5 shrink-0" />
                                        {info}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="h-64 flex flex-col items-center justify-center text-gray-400 space-y-4 border-2 border-dashed border-line rounded-xl"
                    >
                      <BarChart3 size={48} strokeWidth={1} />
                      <p className="text-sm">Analysis results will appear here</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            ) : (
              /* History View */
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Historical Analysis Records</h2>
                  <p className="text-sm text-gray-500">{history.length} records found</p>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  {history.length === 0 ? (
                    <div className="p-12 text-center text-gray-400 border-2 border-dashed border-line rounded-xl">
                      No records found in current session.
                    </div>
                  ) : (
                    history.map(record => (
                      <div 
                        key={record.id} 
                        className="bg-white p-6 rounded-xl border border-line card-shadow hover:border-accent transition-colors cursor-pointer group"
                        onClick={() => {
                          setCurrentAnalysis(record.analysis);
                          setInput(record.input);
                          setActiveTab('new');
                        }}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase", getPriorityColor(record.analysis.priority))}>
                              {record.analysis.priority}
                            </div>
                            <span className="text-xs text-gray-400">
                              {new Date(record.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <ChevronRight size={16} className="text-gray-300 group-hover:text-accent transition-colors" />
                        </div>
                        <h4 className="font-semibold text-sm mb-2 truncate">{record.analysis.classification[0]?.category || 'Investigation'}</h4>
                        <div className="flex gap-4">
                          <div className="text-[10px] text-gray-400">
                            CATEGORY: <span className="text-gray-600 font-medium">{record.analysis.classification[0]?.category}</span>
                          </div>
                          <div className="text-[10px] text-gray-400">
                            SEVERITY: <span className="text-gray-600 font-medium">{record.analysis.risk_assessment.severity}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
