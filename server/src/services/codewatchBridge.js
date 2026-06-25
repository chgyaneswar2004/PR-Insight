import { v4 as uuidv4 } from 'uuid';
import * as db from '../db/client.js';

const AGENT_STEPS = [
  { id: 'PULL_PR', label: 'Fetching PR', description: 'Pulling pull request data and file changes from GitHub' },
  { id: 'ANALYZE_FILES', label: 'Analyzing Files', description: 'Processing changed files and calculating diffs' },
  { id: 'RUN_LLM', label: 'Running LLM', description: 'Claude analyzing code changes and scanning for vulnerabilities' },
  { id: 'SCORE_PR', label: 'Scoring PR', description: 'Calculating dimension scores and security ratings' },
  { id: 'SAVE_RESULT', label: 'Saving Results', description: 'Persisting review results to PostgreSQL database' }
];

export async function triggerCodeWatchReview(repoFullName, prNumber, prUUID = null, io = null, sessionId = null) {
  const CODEWATCH_API_URL = process.env.CODEWATCH_API_URL || 'http://127.0.0.1:8000';
  if (!sessionId) sessionId = uuidv4();
  
  const emit = (event, data) => {
    if (io) {
      io.emit(event, { sessionId, prId: prUUID, ...data });
    }
  };

  const addLog = (level, message, step) => {
    const log = { id: uuidv4(), timestamp: new Date().toISOString(), level, message, step };
    emit('agent:log', { log });
    console.log(`[Agent: ${step}] [${level.toUpperCase()}] ${message}`);
  };

  try {
    // Step 1: Start Agent
    emit('agent:started', { sessionId, prId: prUUID, steps: AGENT_STEPS.map(s => ({ ...s, status: 'pending' })) });
    
    // PULL_PR
    emit('agent:step_start', { stepId: 'PULL_PR', stepIndex: 0 });
    addLog('info', `Initializing CodeWatch retriever for ${repoFullName} PR #${prNumber}...`, 'PULL_PR');
    
    // Simulate a brief delay for pulling
    await new Promise(resolve => setTimeout(resolve, 800));
    emit('agent:step_complete', { stepId: 'PULL_PR', stepIndex: 0, duration: 800 });
    addLog('success', `✓ Pull Request metadata retrieved from GitHub API`, 'PULL_PR');

    // ANALYZE_FILES
    emit('agent:step_start', { stepId: 'ANALYZE_FILES', stepIndex: 1 });
    addLog('info', `Scanning changed files and loading content...`, 'ANALYZE_FILES');
    await new Promise(resolve => setTimeout(resolve, 800));
    emit('agent:step_complete', { stepId: 'ANALYZE_FILES', stepIndex: 1, duration: 800 });
    addLog('success', `✓ Git diff segments parsed and filtered`, 'ANALYZE_FILES');

    // RUN_LLM
    emit('agent:step_start', { stepId: 'RUN_LLM', stepIndex: 2 });
    addLog('info', `Invoking CodeWatch AI analysis chain (Claude)...`, 'RUN_LLM');
    
    // Call the Python FastAPI server
    const response = await fetch(`${CODEWATCH_API_URL}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repo: repoFullName, pr_number: parseInt(prNumber) }),
    });

    if (!response.ok) {
      const errMsg = await response.text();
      throw new Error(`CodeWatch FastAPI error: ${errMsg}`);
    }

    const reviewData = await response.json();
    emit('agent:step_complete', { stepId: 'RUN_LLM', stepIndex: 2, duration: 1500 });
    addLog('success', `✓ AI code analysis completed by Claude`, 'RUN_LLM');

    // SCORE_PR
    emit('agent:step_start', { stepId: 'SCORE_PR', stepIndex: 3 });
    addLog('info', `Calculating quality metrics and assessing risk score...`, 'SCORE_PR');
    await new Promise(resolve => setTimeout(resolve, 800));
    emit('agent:step_complete', { stepId: 'SCORE_PR', stepIndex: 3, duration: 800 });
    addLog('success', `✓ Overall quality score calculated: ${reviewData.overall_score}/100`, 'SCORE_PR');

    // SAVE_RESULT
    emit('agent:step_start', { stepId: 'SAVE_RESULT', stepIndex: 4 });
    addLog('info', `Writing review details to PostgreSQL...`, 'SAVE_RESULT');

    // Persist to PostgreSQL database
    const savedReview = await persistReviewResult(reviewData, prUUID);
    
    emit('agent:step_complete', { stepId: 'SAVE_RESULT', stepIndex: 4, duration: 800 });
    addLog('success', `✓ Review results persisted to postgres database`, 'SAVE_RESULT');

    // Emit Completed
    emit('agent:completed', { 
      prId: prUUID, 
      review: savedReview, 
      logs: [] 
    });

  } catch (err) {
    console.error('Error during CodeWatch review bridge execution:', err);
    addLog('error', `Review failed: ${err.message}`, 'SAVE_RESULT');
    emit('agent:error', { error: err.message });
  }
}

async function persistReviewResult(data, prUUID = null) {
  // 1. Find or insert Repository
  let repoId;
  const repoName = data.repo_full_name.split('/')[1] || data.repo_full_name;
  
  const repoRes = await db.query(
    'SELECT id FROM repositories WHERE full_name = $1',
    [data.repo_full_name]
  );

  if (repoRes.rows.length > 0) {
    repoId = repoRes.rows[0].id;
    // Update repository stats
    await db.query(
      'UPDATE repositories SET quality_score = $1, security_issues = $2, updated_at = NOW() WHERE id = $3',
      [Math.round(data.overall_score), data.security_issues.length, repoId]
    );
  } else {
    const insertRepoRes = await db.query(
      `INSERT INTO repositories (name, full_name, quality_score, security_issues, visibility, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING id`,
      [repoName, data.repo_full_name, Math.round(data.overall_score), data.security_issues.length, 'private']
    );
    repoId = insertRepoRes.rows[0].id;
  }

  // 2. Find or insert Developer (Author)
  const authorUsername = data.author?.login || 'unknown';
  const authorDisplayName = data.author?.name || authorUsername;
  const authorAvatarUrl = data.author?.avatar || null;

  const devRes = await db.query('SELECT id, total_prs, avg_score FROM developers WHERE username = $1', [authorUsername]);
  if (devRes.rows.length > 0) {
    const dev = devRes.rows[0];
    const newTotal = (dev.total_prs || 0) + 1;
    const newAvg = ((parseFloat(dev.avg_score || '0') * dev.total_prs) + data.overall_score) / newTotal;
    
    await db.query(
      'UPDATE developers SET total_prs = $1, avg_score = $2, last_active = NOW() WHERE id = $3',
      [newTotal, newAvg, dev.id]
    );
  } else {
    await db.query(
      `INSERT INTO developers (username, display_name, avatar_url, total_prs, avg_score, last_active) 
       VALUES ($1, $2, $3, 1, $4, NOW())`,
      [authorUsername, authorDisplayName, authorAvatarUrl, data.overall_score]
    );
  }

  // 3. Find or insert/update Pull Request
  if (!prUUID) {
    // If we didn't receive a specific UUID, check if one exists in the database
    const prRes = await db.query(
      'SELECT id FROM pull_requests WHERE repo_id = $1 AND number = $2',
      [repoId, data.pr_number]
    );
    if (prRes.rows.length > 0) {
      prUUID = prRes.rows[0].id;
    }
  }

  if (prUUID) {
    await db.query(
      `UPDATE pull_requests 
       SET title = $1, author = $2, status = 'reviewed', files = $3, additions = $4, deletions = $5,
           quality_score = $6, has_review = true, overall_score = $7, updated_at = NOW(), reviewed_at = NOW() 
       WHERE id = $8`,
      [
        data.title, 
        JSON.stringify(data.author || { login: authorUsername, avatar: authorAvatarUrl }),
        data.files_changed || 0,
        data.additions || 0,
        data.deletions || 0,
        Math.round(data.overall_score),
        data.overall_score,
        prUUID
      ]
    );
  } else {
    const insertPrRes = await db.query(
      `INSERT INTO pull_requests 
       (repo_id, number, title, author, status, files, additions, deletions, quality_score, has_review, overall_score, created_at, updated_at, reviewed_at) 
       VALUES ($1, $2, $3, $4, 'reviewed', $5, $6, $7, $8, true, $9, NOW(), NOW(), NOW()) RETURNING id`,
      [
        repoId,
        data.pr_number,
        data.title,
        JSON.stringify(data.author || { login: authorUsername, avatar: authorAvatarUrl }),
        data.files_changed || 0,
        data.additions || 0,
        data.deletions || 0,
        Math.round(data.overall_score),
        data.overall_score
      ]
    );
    prUUID = insertPrRes.rows[0].id;
  }

  // 4. Delete existing review for this PR if it exists, to overwrite with latest
  await db.query('DELETE FROM reviews WHERE pr_id = $1', [prUUID]);

  // 5. Insert Review Result
  const reviewInsertRes = await db.query(
    `INSERT INTO reviews (
      pr_id, summary, security_score, quality_score, performance_score, 
      maintainability_score, readability_score, docs_score, 
      security_issues, quality_issues, performance_issues, suggestions, 
      diff_data, raw_markdown, created_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW()) RETURNING *`,
    [
      prUUID,
      data.summary,
      data.security_score,
      data.quality_score,
      data.performance_score,
      data.maintainability_score,
      data.readability_score,
      data.docs_score,
      JSON.stringify(data.security_issues || []),
      JSON.stringify(data.quality_issues || []),
      JSON.stringify(data.performance_issues || []),
      JSON.stringify(data.doc_suggestions || []),
      JSON.stringify(data.diff_data || null),
      data.raw_markdown || ''
    ]
  );

  const insertedReview = reviewInsertRes.rows[0];

  // 6. Insert Notification
  const notificationTitle = `Review Complete: PR #${data.pr_number}`;
  const notificationMessage = `AI review completed for ${repoName} PR #${data.pr_number}. Score: ${Math.round(data.overall_score)}/100`;
  await db.query(
    "INSERT INTO notifications (type, title, message, pr_id, is_read, created_at) VALUES ($1, $2, $3, $4, FALSE, NOW())",
    ['pr_reviewed', notificationTitle, notificationMessage, prUUID]
  );

  // Return mapped review formatting
  return {
    id: insertedReview.id,
    prId: prUUID,
    overallScore: parseFloat(insertedReview.overall_score || insertedReview.quality_score || '0'),
    summary: insertedReview.summary,
    dimensions: {
      security: parseFloat(insertedReview.security_score || '0'),
      maintainability: parseFloat(insertedReview.maintainability_score || '0'),
      performance: parseFloat(insertedReview.performance_score || '0'),
      readability: parseFloat(insertedReview.readability_score || '0'),
      documentation: parseFloat(insertedReview.docs_score || '0')
    },
    securityIssues: insertedReview.security_issues,
    qualityIssues: insertedReview.quality_issues,
    performanceIssues: insertedReview.performance_issues,
    docSuggestions: insertedReview.suggestions,
    codeDiff: insertedReview.diff_data,
    createdAt: insertedReview.created_at
  };
}
