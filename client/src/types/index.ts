export interface Repo {
  id: string;
  name: string;
  fullName: string;
  language: string;
  description: string;
  stars: number;
  forks: number;
  openPRs: number;
  totalPRs?: number;
  lastActivity: string;
  qualityScore: number;
  securityIssues: number;
  owner: string;
  visibility: 'public' | 'private';
  topics: string[];
}

export interface User {
  login: string;
  avatar: string | null;
}

export interface PullRequest {
  id: string;
  repoId: string;
  number: number;
  title: string;
  description: string;
  author: User;
  branch: string;
  baseBranch: string;
  status: 'open' | 'merged' | 'closed' | 'review';
  files: number;
  additions: number;
  deletions: number;
  qualityScore: number;
  createdAt: string;
  updatedAt: string;
  labels: string[];
  reviewers: string[];
  commits: number;
  comments: number;
  hasReview: boolean;
  repo?: Repo; // Populated when fetching PR details
}

export interface Issue {
  id: string;
  type?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  file?: string;
  line?: number;
  suggestion?: string;
  impact?: string;
}

export interface Review {
  prId: string;
  overallScore: number;
  summary: string;
  dimensions: {
    security: number;
    maintainability: number;
    performance: number;
    readability: number;
    documentation: number;
  };
  securityIssues: Issue[];
  qualityIssues: Issue[];
  performanceIssues: Issue[];
  docSuggestions: Issue[];
  codeDiff?: {
    oldCode: string;
    newCode: string;
  } | null;
  agentSteps: AgentStep[];
  createdAt: string;
}

export interface AgentStep {
  id: string;
  label: string;
  description: string;
  status: 'pending' | 'running' | 'done' | 'error';
  duration?: number;
}

export interface AgentLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  step: string;
}

export interface Notification {
  id: string;
  type: string;
  severity: 'info' | 'success' | 'warning' | 'critical';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  prId?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}
