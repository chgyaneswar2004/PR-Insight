-- Schema for PR Insight Database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Repositories
CREATE TABLE IF NOT EXISTS repositories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_id TEXT UNIQUE,
  name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  language TEXT,
  description TEXT,
  html_url TEXT,
  stars INTEGER DEFAULT 0,
  forks INTEGER DEFAULT 0,
  owner TEXT,
  visibility TEXT DEFAULT 'private',
  topics JSONB DEFAULT '[]',
  quality_score INTEGER DEFAULT 0,
  security_issues INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pull Requests
CREATE TABLE IF NOT EXISTS pull_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  author JSONB DEFAULT '{}', -- { login, avatar }
  branch TEXT,
  base_branch TEXT,
  status TEXT DEFAULT 'open', -- open | closed | merged | review
  files INTEGER DEFAULT 0,
  additions INTEGER DEFAULT 0,
  deletions INTEGER DEFAULT 0,
  quality_score INTEGER DEFAULT 0,
  labels JSONB DEFAULT '[]',
  reviewers JSONB DEFAULT '[]',
  commits INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  has_review BOOLEAN DEFAULT FALSE,
  overall_score NUMERIC(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

-- Review Results (one per PR)
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pr_id UUID REFERENCES pull_requests(id) ON DELETE CASCADE,
  summary TEXT,
  security_score NUMERIC(5,2) DEFAULT 0,
  quality_score NUMERIC(5,2) DEFAULT 0,
  performance_score NUMERIC(5,2) DEFAULT 0,
  maintainability_score NUMERIC(5,2) DEFAULT 0,
  readability_score NUMERIC(5,2) DEFAULT 0,
  docs_score NUMERIC(5,2) DEFAULT 0,
  security_issues JSONB DEFAULT '[]',
  quality_issues JSONB DEFAULT '[]',
  performance_issues JSONB DEFAULT '[]',
  suggestions JSONB DEFAULT '[]', -- doc suggestions
  diff_data JSONB DEFAULT '[]',
  raw_markdown TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Developer metrics
CREATE TABLE IF NOT EXISTS developers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  total_prs INTEGER DEFAULT 0,
  avg_score NUMERIC(5,2) DEFAULT 0,
  last_active TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL, -- security_warning | pr_reviewed | new_pr | error
  title TEXT NOT NULL,
  message TEXT,
  pr_id UUID REFERENCES pull_requests(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- App settings (for admin panel)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
