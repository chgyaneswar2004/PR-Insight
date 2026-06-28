import { useEffect } from 'react';
import { Layout } from '../components/layout/Layout';
import { useAppStore } from '../store';
import { useAuthStore } from '../store/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Star, GitFork, Activity, ShieldAlert, GitPullRequest, ArrowUpRight, Info } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';

export default function Repositories() {
  const { repos, fetchRepos, isLoadingRepos } = useAppStore();
  const { user } = useAuthStore();
  const githubAppUrl = user?.githubAppUrl || 'https://github.com/apps/pr-insight';

  useEffect(() => {
    fetchRepos();
  }, [fetchRepos]);

  if (isLoadingRepos && repos.length === 0) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-10 h-10 border-4 border-accent-cyan border-t-transparent rounded-full animate-spin"></div>
        </div>
      </Layout>
    );
  }

  const getLanguageColor = (lang: string) => {
    const colors: Record<string, string> = {
      'TypeScript': '#3178c6',
      'JavaScript': '#f1e05a',
      'Python': '#3572A5',
      'Go': '#00ADD8',
      'Java': '#b07219',
      'Rust': '#dea584',
      'HCL': '#844FBA',
      'Node.js': '#339933'
    };
    return colors[lang] || '#8b949e';
  };

  return (
    <Layout>
      <div className="space-y-6 pb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Repositories</h1>
            <p className="text-muted-foreground mt-1">Manage and configure connected GitHub repositories.</p>
          </div>
        </div>

        {/* GitHub App Installation Guide */}
        {repos.length === 0 && (
          <Card className="border-accent-cyan/20 bg-accent-cyan/5 backdrop-blur-md overflow-hidden relative">
            <div className="absolute top-0 right-0 w-48 h-48 bg-accent-cyan/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-accent-purple/5 rounded-full blur-3xl pointer-events-none" />
            
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                <GitPullRequest className="w-6 h-6 text-accent-cyan" />
                GitHub App Integration
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Connect your repositories via the GitHub App for fully automated AI code reviews. 
                <span className="text-accent-cyan ml-1 font-semibold">No manual webhook or API key configuration required.</span>
              </p>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Guide steps */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-b border-border/40 py-6">
                <div className="space-y-2 relative">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-accent-cyan/10 border border-accent-cyan/30 flex items-center justify-center text-accent-cyan font-bold text-sm">
                      1
                    </div>
                    <h3 className="font-semibold text-white text-sm">Install GitHub App</h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed pl-11">
                    Click the install button below to register the PR-Insight integration on your account or organization.
                  </p>
                </div>

                <div className="space-y-2 relative">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-accent-purple/10 border border-accent-purple/30 flex items-center justify-center text-accent-purple font-bold text-sm">
                      2
                    </div>
                    <h3 className="font-semibold text-white text-sm">Select Repositories</h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed pl-11">
                    Choose whether to grant access to <strong>All repositories</strong> (recommended) or specific individual repositories.
                  </p>
                </div>

                <div className="space-y-2 relative">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-accent-blue/10 border border-accent-blue/30 flex items-center justify-center text-accent-blue font-bold text-sm">
                      3
                    </div>
                    <h3 className="font-semibold text-white text-sm">Automated Review</h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed pl-11">
                    Once installed, simply push code or open a PR. Webhooks configure automatically, and the repository will appear here!
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 items-center justify-between pt-2">
                <div className="flex flex-col sm:flex-row gap-4">
                  <a 
                    href={githubAppUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-semibold bg-gradient-to-r from-accent-cyan to-accent-purple text-white hover:opacity-90 transition-opacity text-sm"
                  >
                    <GitPullRequest className="w-4 h-4" />
                    Install GitHub App
                  </a>
                  
                  <a 
                    href="https://github.com/settings/installations" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-semibold border border-border bg-bg-secondary/40 text-muted-foreground hover:text-white hover:bg-bg-secondary/80 transition-colors text-sm"
                  >
                    Manage Installations
                  </a>
                </div>
                
                <div className="text-xs text-muted-foreground/80 max-w-md">
                  💡 <strong>Already installed the app?</strong> Make sure you have granted it access to the repository you want to review. Check repository permissions in your GitHub Account settings.
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {repos.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center border border-dashed border-border rounded-xl bg-bg-secondary/20 min-h-[300px]">
            <div className="w-16 h-16 rounded-full bg-accent-cyan/5 flex items-center justify-center text-accent-cyan/60 border border-accent-cyan/15 mb-6">
              <Info className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No repositories connected yet</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-6 leading-relaxed">
              Install the GitHub App and select your repositories to get started. They will automatically appear here once code pushes or pull requests trigger your first AI review.
            </p>
            <a 
              href={githubAppUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-accent-cyan hover:underline"
            >
              Go to GitHub App Setup <ArrowUpRight className="w-4 h-4" />
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {repos.map((repo, idx) => (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                key={repo.id}
              >
                <a 
                  href={`https://github.com/${repo.fullName}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block h-full cursor-pointer"
                >
                  <Card className="h-full flex flex-col border-border hover:border-accent-cyan/50 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)] hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: getLanguageColor(repo.language) }} />
                    
                    <CardHeader className="pb-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg font-bold text-white group-hover:text-accent-cyan transition-colors">
                            {repo.name}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground mt-1">{repo.fullName}</p>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-bg-elevated border border-border-light rounded-md">
                          {repo.visibility}
                        </span>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="flex-1 flex flex-col justify-between p-6 pt-0">
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-6">
                        {repo.description}
                      </p>
                      
                      <div className="space-y-4">
                        {/* Topics */}
                        <div className="flex flex-wrap gap-2">
                          {repo.topics.map(topic => (
                            <span key={topic} className="text-xs px-2 py-0.5 rounded-full bg-accent-cyan/10 text-accent-cyan">
                              {topic}
                            </span>
                          ))}
                        </div>
                        
                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-4 py-4 border-t border-border/50">
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">Quality Score</div>
                            <div className="text-lg font-bold text-white">
                              {repo.totalPRs !== undefined && repo.totalPRs > 0 ? (
                                <>
                                  <span className={repo.qualityScore >= 90 ? 'text-success' : repo.qualityScore >= 75 ? 'text-warning' : 'text-error'}>
                                    {repo.qualityScore}
                                  </span>
                                  <span className="text-sm text-muted-foreground font-normal">/100</span>
                                </>
                              ) : (
                                <span className="text-muted-foreground text-sm font-normal">Not reviewed</span>
                              )}
                            </div>
                          </div>
                          
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">Security Issues</div>
                            <div className="text-lg font-bold text-white flex items-center gap-1.5">
                              {repo.securityIssues > 0 ? (
                                <>
                                  <ShieldAlert className="w-4 h-4 text-error" />
                                  <span className="text-error">{repo.securityIssues}</span>
                                </>
                              ) : (
                                <span className="text-success">0</span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Footer Info */}
                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t border-border/50">
                          <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getLanguageColor(repo.language) }} />
                              {repo.language}
                            </span>
                            <span className="flex items-center gap-1 hover:text-white transition-colors" title="Stars">
                              <Star className="w-3.5 h-3.5" /> {repo.stars}
                            </span>
                            <span className="flex items-center gap-1 hover:text-white transition-colors" title="Forks">
                              <GitFork className="w-3.5 h-3.5" /> {repo.forks}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
                          <span className="flex items-center gap-1">
                            <Activity className="w-3.5 h-3.5" /> 
                            Updated {formatDistanceToNow(new Date(repo.lastActivity), { addSuffix: true })}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1 text-muted-foreground bg-bg-elevated px-2 py-0.5 rounded-full border border-border">
                              <GitPullRequest className="w-3 h-3 text-muted-foreground" /> {repo.totalPRs || 0} PRs
                            </span>
                            {repo.openPRs > 0 && (
                              <span className="flex items-center gap-1 text-accent-cyan bg-accent-cyan/10 px-2 py-0.5 rounded-full border border-accent-cyan/20">
                                {repo.openPRs} active
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </a>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
