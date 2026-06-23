import { v4 as uuidv4 } from 'uuid';
import { reviews, pullRequests } from '../data/store.js';

const AGENT_STEPS = [
  { id: 'PULL_PR', label: 'Fetching PR', description: 'Pulling pull request data and file changes from repository' },
  { id: 'ANALYZE_BUG', label: 'Analyzing Code', description: 'Claude AI scanning for bugs, security issues, and code smells' },
  { id: 'GENERATE_FIX', label: 'Generating Fix', description: 'Generating suggested fixes and improvements' },
  { id: 'PUSH_FIX', label: 'Pushing Fix', description: 'Pushing suggested fix to feature branch' },
  { id: 'AUTO_MERGE', label: 'Auto-Merging', description: 'Validating quality score and merging PR' },
];

const STEP_DELAYS = [1500, 4000, 3000, 2000, 2500];

export function startAgentSimulation(prId, io, anthropicClient) {
  const pr = pullRequests.find(p => p.id === prId);
  if (!pr) return;

  const sessionId = uuidv4();
  const logs = [];

  const emit = (event, data) => io.emit(event, { sessionId, prId, ...data });

  const addLog = (level, message, step) => {
    const log = { id: uuidv4(), timestamp: new Date().toISOString(), level, message, step };
    logs.push(log);
    emit('agent:log', { log });
    return log;
  };

  const runSteps = async () => {
    emit('agent:started', { sessionId, prId, steps: AGENT_STEPS.map(s => ({ ...s, status: 'pending' })) });

    for (let i = 0; i < AGENT_STEPS.length; i++) {
      const step = AGENT_STEPS[i];
      emit('agent:step_start', { stepId: step.id, stepIndex: i });
      addLog('info', `Starting: ${step.description}`, step.id);

      await new Promise(resolve => setTimeout(resolve, 500));

      if (step.id === 'ANALYZE_BUG' && anthropicClient) {
        try {
          addLog('info', 'Connecting to Claude AI...', step.id);
          const message = await anthropicClient.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 300,
            messages: [{
              role: 'user',
              content: `Briefly analyze this PR in 2-3 sentences: "${pr.title}". Focus on potential risks.`
            }]
          });
          const analysis = message.content[0].text;
          addLog('success', `Claude AI: ${analysis}`, step.id);
        } catch (err) {
          addLog('warn', `AI analysis simulated (API unavailable): Found ${Math.floor(Math.random() * 5) + 1} potential issues`, step.id);
        }
      } else {
        // Simulate step-specific logs
        const stepLogs = {
          PULL_PR: [
            `Fetched PR #${pr.number}: ${pr.files} files changed`,
            `+${pr.additions} additions, -${pr.deletions} deletions`,
            `Branch: ${pr.branch} → ${pr.baseBranch}`,
          ],
          GENERATE_FIX: [
            'Generated 3 fix suggestions',
            'Security patch: token revalidation on reconnect',
            'Performance optimization: connection pooling',
          ],
          PUSH_FIX: [
            `Pushed fix to branch: ${pr.branch}`,
            'Commit: fix(security): add token revalidation on reconnect',
            'CI/CD pipeline triggered',
          ],
          AUTO_MERGE: [
            `Quality score: ${pr.qualityScore}/100 ✓`,
            'All security checks passed',
            'PR auto-merged successfully',
          ],
        };

        const logs = stepLogs[step.id] || [`${step.label} complete`];
        for (const log of logs) {
          await new Promise(resolve => setTimeout(resolve, 400));
          addLog(step.id === 'AUTO_MERGE' ? 'success' : 'info', log, step.id);
        }
      }

      await new Promise(resolve => setTimeout(resolve, STEP_DELAYS[i]));
      emit('agent:step_complete', { stepId: step.id, stepIndex: i, duration: STEP_DELAYS[i] });
      addLog('success', `✓ ${step.label} complete`, step.id);
    }

    // Save review result
    if (!reviews[prId]) {
      reviews[prId] = {
        prId,
        overallScore: pr.qualityScore,
        summary: `AI review complete for PR #${pr.number}. ${pr.qualityScore >= 85 ? 'Code quality is excellent.' : 'Several improvements recommended.'}`,
        dimensions: {
          security: Math.floor(Math.random() * 20) + 75,
          maintainability: Math.floor(Math.random() * 20) + 70,
          performance: Math.floor(Math.random() * 20) + 72,
          readability: Math.floor(Math.random() * 20) + 75,
          documentation: Math.floor(Math.random() * 25) + 65,
        },
        securityIssues: [],
        qualityIssues: [],
        performanceIssues: [],
        docSuggestions: [],
        codeDiff: null,
        agentSteps: AGENT_STEPS.map(s => ({ ...s, status: 'done' })),
        createdAt: new Date().toISOString(),
      };
    }

    emit('agent:completed', { review: reviews[prId], logs });
  };

  runSteps().catch(err => {
    console.error('Agent error:', err);
    emit('agent:error', { error: err.message });
  });

  return sessionId;
}
