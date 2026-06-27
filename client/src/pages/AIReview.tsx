import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { useAppStore } from '../store';
import { api } from '../lib/api';
import { socketService } from '../lib/socket';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Play, ShieldAlert, Activity, GitCommit, Clock, CheckCircle2, AlertTriangle, ArrowLeft, Code2, GitPullRequest } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import ReactDiffViewer from 'react-diff-viewer-continued';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import ReactMarkdown from 'react-markdown';

export default function AIReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeReview, setActiveReview, agentLogs, addAgentLog, clearAgentLogs, isAgentRunning, setAgentRunning } = useAppStore();
  const [pr, setPr] = useState<any>(null);
  const [agentSteps, setAgentSteps] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'summary' | 'markdown' | 'diff'>('summary');
  const [selectedDiffFile, setSelectedDiffFile] = useState<number>(0);
  const [isMerging, setIsMerging] = useState(false);

  useEffect(() => {
    if (!id) return;
    
    // Fetch PR details
    api.get(`/prs/${id}`).then(setPr).catch(console.error);
    
    // Fetch review if it exists
    api.get(`/prs/${id}/review`).then((review: any) => {
      setActiveReview(review);
      if (review.agentSteps) {
        setAgentSteps(review.agentSteps);
      }
    }).catch(() => {
      setActiveReview(null);
      setAgentSteps([]);
    });

    // Socket listeners for live agent
    const unsubscribeStarted = socketService.on('agent:started', (data: any) => {
      if (data.prId === id) {
        setAgentRunning(true);
        setAgentSteps(data.steps);
        clearAgentLogs();
        setActiveReview(null);
      }
    });

    const unsubscribeLog = socketService.on('agent:log', (data: any) => {
      if (data.prId === id) {
        addAgentLog(data.log);
      }
    });

    const unsubscribeStepStart = socketService.on('agent:step_start', (data: any) => {
      if (data.prId === id) {
        setAgentSteps(prev => prev.map(step => 
          step.id === data.stepId ? { ...step, status: 'running' } : step
        ));
      }
    });

    const unsubscribeStepComplete = socketService.on('agent:step_complete', (data: any) => {
      if (data.prId === id) {
        setAgentSteps(prev => prev.map(step => 
          step.id === data.stepId ? { ...step, status: 'done', duration: data.duration } : step
        ));
      }
    });

    const unsubscribeCompleted = socketService.on('agent:completed', (data: any) => {
      if (data.review.prId === id) {
        setAgentRunning(false);
        setActiveReview(data.review);
      }
    });

    return () => {
      unsubscribeStarted();
      unsubscribeLog();
      unsubscribeStepStart();
      unsubscribeStepComplete();
      unsubscribeCompleted();
    };
  }, [id]);

  const startReview = async () => {
    try {
      setAgentRunning(true);
      await api.post('/agent/start', { prId: id });
    } catch (err) {
      console.error(err);
      setAgentRunning(false);
    }
  };

  const handleMerge = async () => {
    if (!window.confirm("Are you sure you want to merge this Pull Request?")) return;
    try {
      setIsMerging(true);
      await api.put(`/prs/${id}/merge`, { mergeMethod: 'merge' });
      if (pr) {
        setPr({ ...pr, status: 'merged' });
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to merge Pull Request.');
    } finally {
      setIsMerging(false);
    }
  };

  const radarData = activeReview ? [
    { subject: 'Security', A: activeReview.dimensions.security, fullMark: 100 },
    { subject: 'Maintainability', A: activeReview.dimensions.maintainability, fullMark: 100 },
    { subject: 'Performance', A: activeReview.dimensions.performance, fullMark: 100 },
    { subject: 'Readability', A: activeReview.dimensions.readability, fullMark: 100 },
    { subject: 'Documentation', A: activeReview.dimensions.documentation, fullMark: 100 },
  ] : [];

  if (!pr) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-accent-cyan border-t-transparent rounded-full animate-spin"></div></div></Layout>;

  return (
    <Layout>
      <div className="space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <button onClick={() => navigate('/prs')} className="flex items-center text-sm text-muted-foreground hover:text-white transition-colors mb-2">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to PRs
            </button>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
              {pr.title}
              <span className="text-muted-foreground text-xl font-normal">#{pr.number}</span>
            </h1>
            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5 bg-bg-elevated px-2.5 py-1 rounded-full text-white/90">
                <GitCommit className="w-4 h-4 text-accent-cyan" />
                {pr.branch} <span className="text-muted-foreground">→</span> {pr.baseBranch}
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                Opened {formatDistanceToNow(new Date(pr.createdAt), { addSuffix: true })} by {pr.author.login}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 shrink-0">
            {pr.status === 'merged' ? (
              <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-semibold bg-success/15 border border-success/30 text-success text-sm">
                <CheckCircle2 className="w-4 h-4" />
                PR Merged
              </div>
            ) : (
              <Button
                onClick={handleMerge}
                disabled={isMerging || isAgentRunning}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-2 group relative overflow-hidden"
              >
                {isMerging ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Merging...
                  </>
                ) : (
                  <>
                    <GitPullRequest className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    Merge Pull Request
                  </>
                )}
              </Button>
            )}

            <Button 
              onClick={startReview} 
              disabled={isAgentRunning}
              variant="gradient"
              className="group relative overflow-hidden"
            >
              {isAgentRunning ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Analyzing...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Play className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  {activeReview ? 'Run Review Again' : 'Start AI Review'}
                </span>
              )}
              {!isAgentRunning && <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left Column: Live Agent & Logs */}
          <div className="xl:col-span-1 space-y-6">
            <Card className="border-border shadow-xl">
              <CardHeader className="bg-bg-elevated/30 border-b border-border">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="w-5 h-5 text-accent-cyan" />
                  Agent Execution
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="p-4 space-y-4">
                  {agentSteps.length === 0 && !isAgentRunning && !activeReview && (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      Click "Start AI Review" to begin the analysis
                    </div>
                  )}
                  {agentSteps.map((step, idx) => (
                    <div key={step.id} className="relative pl-6 pb-4 last:pb-0">
                      {/* Timeline line */}
                      {idx !== agentSteps.length - 1 && (
                        <div className={`absolute left-[11px] top-6 bottom-0 w-0.5 ${step.status === 'done' ? 'bg-success/50' : 'bg-border'}`} />
                      )}
                      
                      {/* Status indicator */}
                      <div className="absolute left-0 top-1 w-[22px] h-[22px] rounded-full flex items-center justify-center bg-bg-primary border-2 border-border z-10">
                        {step.status === 'done' ? (
                          <div className="w-full h-full bg-success rounded-full flex items-center justify-center shadow-[0_0_8px_rgba(34,197,94,0.5)]">
                            <CheckCircle2 className="w-3 h-3 text-white" />
                          </div>
                        ) : step.status === 'running' ? (
                          <div className="w-full h-full bg-bg-elevated rounded-full flex items-center justify-center border border-accent-cyan">
                            <div className="w-2 h-2 bg-accent-cyan rounded-full animate-ping" />
                          </div>
                        ) : (
                          <div className="w-2 h-2 bg-border rounded-full" />
                        )}
                      </div>
                      
                      <div className="ml-3">
                        <h4 className={cn("text-sm font-medium", step.status === 'running' ? 'text-white' : step.status === 'done' ? 'text-white/80' : 'text-muted-foreground')}>
                          {step.label}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Live Logs Terminal */}
                {(isAgentRunning || agentLogs.length > 0) && (
                  <div className="mt-4 bg-black/60 rounded-b-xl border-t border-border overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2 bg-black/40 border-b border-white/5">
                      <div className="w-2.5 h-2.5 rounded-full bg-error/80" />
                      <div className="w-2.5 h-2.5 rounded-full bg-warning/80" />
                      <div className="w-2.5 h-2.5 rounded-full bg-success/80" />
                      <span className="text-[10px] text-muted-foreground ml-2 font-mono uppercase tracking-wider">Live Output</span>
                    </div>
                    <div className="p-4 h-48 overflow-y-auto font-mono text-xs space-y-2 flex flex-col justify-end">
                      <AnimatePresence initial={false}>
                        {agentLogs.map((log) => (
                          <motion.div 
                            key={log.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={cn(
                              "flex gap-3",
                              log.level === 'error' && "text-error",
                              log.level === 'warn' && "text-warning",
                              log.level === 'success' && "text-success",
                              log.level === 'info' && "text-muted-foreground"
                            )}
                          >
                            <span className="opacity-50 shrink-0">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                            <span className="break-all">{log.message}</span>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      {isAgentRunning && (
                        <div className="flex items-center gap-2 text-accent-cyan mt-2">
                          <span className="w-2 h-4 bg-accent-cyan animate-pulse" />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Review Results */}
          <div className="xl:col-span-2 space-y-6">
            {!activeReview && !isAgentRunning && (
              <Card className="border-border border-dashed h-full flex items-center justify-center bg-transparent">
                <CardContent className="text-center p-12">
                  <div className="w-16 h-16 bg-bg-elevated rounded-full flex items-center justify-center mx-auto mb-4 text-muted-foreground">
                    <ShieldAlert className="w-8 h-8 opacity-50" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">No review data yet</h3>
                  <p className="text-muted-foreground max-w-sm mx-auto">
                    Start the AI review process to analyze this pull request for bugs, security vulnerabilities, and code quality issues.
                  </p>
                </CardContent>
              </Card>
            )}
            {activeReview && (
              <div className="space-y-6">
                {/* Tabs bar */}
                <div className="flex border-b border-border bg-bg-primary/50 p-1 rounded-lg gap-2">
                  <button
                    onClick={() => setActiveTab('summary')}
                    className={cn(
                      "flex-1 md:flex-none px-4 py-2 text-sm font-medium rounded-md transition-colors",
                      activeTab === 'summary'
                        ? "bg-accent-purple text-white shadow-lg shadow-accent-purple/20"
                        : "text-muted-foreground hover:text-white hover:bg-bg-elevated"
                    )}
                  >
                    Review Summary
                  </button>
                  <button
                    onClick={() => setActiveTab('markdown')}
                    className={cn(
                      "flex-1 md:flex-none px-4 py-2 text-sm font-medium rounded-md transition-colors",
                      activeTab === 'markdown'
                        ? "bg-accent-purple text-white shadow-lg shadow-accent-purple/20"
                        : "text-muted-foreground hover:text-white hover:bg-bg-elevated"
                    )}
                  >
                    AI Report
                  </button>
                  <button
                    onClick={() => setActiveTab('diff')}
                    className={cn(
                      "flex-1 md:flex-none px-4 py-2 text-sm font-medium rounded-md transition-colors",
                      activeTab === 'diff'
                        ? "bg-accent-purple text-white shadow-lg shadow-accent-purple/20"
                        : "text-muted-foreground hover:text-white hover:bg-bg-elevated"
                    )}
                  >
                    Suggested Fixes (Diff)
                  </button>
                </div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  {activeTab === 'summary' && (
                    <div className="space-y-6">
                      {/* Score & Summary */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="md:col-span-1 border-border relative overflow-hidden bg-gradient-to-br from-bg-card to-bg-elevated">
                          <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Activity className="w-24 h-24" />
                          </div>
                          <CardContent className="p-6 relative z-10 flex flex-col items-center justify-center h-full">
                            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Quality Score</div>
                            <div className="relative">
                              <svg className="w-32 h-32 transform -rotate-90">
                                <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-bg-secondary" />
                                <circle 
                                  cx="64" cy="64" r="56" 
                                  stroke="currentColor" 
                                  strokeWidth="12" 
                                  fill="transparent" 
                                  strokeDasharray="351.8" 
                                  strokeDashoffset={351.8 - (351.8 * activeReview.overallScore) / 100} 
                                  className={cn(
                                    "transition-all duration-1000 ease-out",
                                    activeReview.overallScore >= 90 ? "text-success" : 
                                    activeReview.overallScore >= 70 ? "text-warning" : "text-error"
                                  )} 
                                />
                              </svg>
                              <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-3xl font-bold text-white">{activeReview.overallScore}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="md:col-span-2 border-border">
                          <CardHeader>
                            <CardTitle>AI Summary</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-white/90 leading-relaxed bg-bg-elevated p-4 rounded-xl border border-border-light text-sm">
                              {activeReview.summary}
                            </p>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Radar Chart */}
                      <Card className="border-border">
                        <CardHeader>
                          <CardTitle>Analysis Dimensions</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                <PolarGrid stroke="#1E2D4A" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#6382B4', fontSize: 12 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar name="Score" dataKey="A" stroke="#06B6D4" fill="#06B6D4" fillOpacity={0.3} />
                              </RadarChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Issues List */}
                      <Card className="border-border">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-error">
                            <ShieldAlert className="w-5 h-5" />
                            Security Vulnerabilities
                            <span className="ml-auto bg-error/20 text-error text-xs font-bold px-2 py-1 rounded-full">
                              {activeReview.securityIssues.length} found
                            </span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {activeReview.securityIssues.map((issue: any) => (
                            <div key={issue.id} className="bg-error/5 border border-error/20 rounded-lg p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3">
                                  <div className="mt-1">
                                    {issue.severity === 'critical' ? <AlertTriangle className="w-5 h-5 text-error" /> : <ShieldAlert className="w-5 h-5 text-warning" />}
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-white">{issue.title}</h4>
                                    <p className="text-sm text-muted-foreground mt-1">{issue.description}</p>
                                    {issue.suggestion && (
                                      <div className="mt-3 bg-bg-primary/50 rounded-md p-3 border border-border">
                                        <span className="text-xs font-semibold text-accent-cyan uppercase tracking-wider mb-1 block">AI Suggestion</span>
                                        <p className="text-sm text-white/90">{issue.suggestion}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <span className={cn(
                                  "px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider shrink-0",
                                  issue.severity === 'critical' ? "bg-error text-white" : "bg-warning/20 text-warning"
                                )}>
                                  {issue.severity}
                                </span>
                              </div>
                            </div>
                          ))}
                          {activeReview.securityIssues.length === 0 && (
                            <div className="text-center py-6 text-success flex items-center justify-center gap-2">
                              <CheckCircle2 className="w-5 h-5" />
                              No security vulnerabilities detected.
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {activeTab === 'markdown' && (
                    <Card className="border-border">
                      <CardHeader>
                        <CardTitle>Detailed AI Report</CardTitle>
                      </CardHeader>
                      <CardContent className="max-h-[600px] overflow-y-auto">
                        {activeReview.rawMarkdown ? (
                          <div className="prose prose-invert max-w-none text-white/90">
                            <ReactMarkdown
                              components={{
                                h1: ({node, ...props}) => <h1 className="text-2xl font-bold text-white mt-6 mb-4" {...props} />,
                                h2: ({node, ...props}) => <h2 className="text-xl font-semibold text-white mt-5 mb-3 border-b border-border/30 pb-1" {...props} />,
                                h3: ({node, ...props}) => <h3 className="text-lg font-medium text-white mt-4 mb-2" {...props} />,
                                p: ({node, ...props}) => <p className="text-sm text-white/80 leading-relaxed mb-4" {...props} />,
                                ul: ({node, ...props}) => <ul className="list-disc list-inside space-y-1.5 mb-4 text-sm text-white/70" {...props} />,
                                ol: ({node, ...props}) => <ol className="list-decimal list-inside space-y-1.5 mb-4 text-sm text-white/70" {...props} />,
                                li: ({node, ...props}) => <li className="text-sm text-white/85" {...props} />,
                                code: ({node, inline, className, children, ...props}: any) => {
                                  return inline ? (
                                    <code className="bg-bg-elevated text-accent-cyan px-1.5 py-0.5 rounded font-mono text-xs" {...props}>{children}</code>
                                  ) : (
                                    <pre className="bg-black/50 border border-border rounded-lg p-4 font-mono text-xs text-white overflow-x-auto my-4">
                                      <code {...props}>{children}</code>
                                    </pre>
                                  );
                                },
                                blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-accent-purple pl-4 italic text-muted-foreground my-4" {...props} />,
                                table: ({node, ...props}) => (
                                  <div className="overflow-x-auto my-6">
                                    <table className="w-full border-collapse border border-border text-sm text-white/80" {...props} />
                                  </div>
                                ),
                                th: ({node, ...props}) => <th className="border border-border bg-bg-elevated/40 px-4 py-2 text-left font-semibold" {...props} />,
                                td: ({node, ...props}) => <td className="border border-border px-4 py-2" {...props} />
                              }}
                            >
                              {activeReview.rawMarkdown}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <div className="text-center py-12 text-muted-foreground text-sm">
                            No detailed report available. Run a new review to generate one.
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {activeTab === 'diff' && (
                    <Card className="border-border overflow-hidden">
                      <CardHeader className="border-b border-border bg-bg-elevated/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <CardTitle className="flex items-center gap-2">
                          <Code2 className="w-5 h-5 text-muted-foreground" />
                          Suggested Fixes
                        </CardTitle>
                        {(() => {
                          const diffs = Array.isArray(activeReview.codeDiff)
                            ? activeReview.codeDiff
                            : activeReview.codeDiff
                              ? [{ filename: 'PR Diff', oldCode: activeReview.codeDiff.oldCode, newCode: activeReview.codeDiff.newCode }]
                              : [];
                          
                          if (diffs.length > 1) {
                            return (
                              <select
                                value={selectedDiffFile}
                                onChange={(e) => setSelectedDiffFile(parseInt(e.target.value))}
                                className="bg-bg-elevated text-sm border border-border rounded px-3 py-1.5 text-white outline-none focus:border-accent-purple transition-colors max-w-xs md:max-w-md truncate"
                              >
                                {diffs.map((file: any, index: number) => (
                                  <option key={index} value={index}>
                                    {file.filename}
                                  </option>
                                ))}
                              </select>
                            );
                          }
                          return null;
                        })()}
                      </CardHeader>
                      <CardContent className="p-0">
                        {(() => {
                          const diffs = Array.isArray(activeReview.codeDiff)
                            ? activeReview.codeDiff
                            : activeReview.codeDiff
                              ? [{ filename: 'PR Diff', oldCode: activeReview.codeDiff.oldCode, newCode: activeReview.codeDiff.newCode }]
                              : [];
                          
                          if (diffs.length === 0) {
                            return (
                              <div className="text-center py-12 text-muted-foreground text-sm">
                                No code suggestions or diff available.
                              </div>
                            );
                          }
                          
                          const selectedDiff = diffs[selectedDiffFile] || diffs[0];
                          if (!selectedDiff) return null;
                          
                          return (
                            <div className="text-sm">
                              {diffs.length > 1 && (
                                <div className="px-4 py-2 bg-bg-elevated/10 border-b border-border text-xs text-muted-foreground font-mono truncate">
                                  File: {selectedDiff.filename}
                                </div>
                              )}
                              <ReactDiffViewer
                                oldValue={selectedDiff.oldCode}
                                newValue={selectedDiff.newCode}
                                splitView={true}
                                useDarkTheme={true}
                                styles={{
                                  variables: {
                                    dark: {
                                      diffViewerBackground: '#0B1222',
                                      addedBackground: 'rgba(34, 197, 94, 0.1)',
                                      removedBackground: 'rgba(239, 68, 68, 0.1)',
                                      wordAddedBackground: 'rgba(34, 197, 94, 0.25)',
                                      wordRemovedBackground: 'rgba(239, 68, 68, 0.25)',
                                      emptyLineBackground: '#0B1222',
                                    }
                                  }
                                }}
                              />
                            </div>
                          );
                        })()}
                      </CardContent>
                    </Card>
                  )}
                </motion.div>

              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
