import { useEffect } from 'react';
import { Layout } from '../components/layout/Layout';
import { useAppStore } from '../store';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Star, GitFork, Activity, ShieldAlert, GitPullRequest } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';

export default function Repositories() {
  const { repos, fetchRepos } = useAppStore();

  useEffect(() => {
    fetchRepos();
  }, [fetchRepos]);

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
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Repositories</h1>
          <p className="text-muted-foreground mt-1">Manage and configure connected GitHub repositories.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {repos.map((repo, idx) => (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              key={repo.id}
            >
              <Card className="h-full flex flex-col border-border hover:border-accent-cyan/50 transition-colors group relative overflow-hidden">
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
                          <span className={repo.qualityScore >= 90 ? 'text-success' : repo.qualityScore >= 75 ? 'text-warning' : 'text-error'}>
                            {repo.qualityScore}
                          </span>
                          <span className="text-sm text-muted-foreground font-normal">/100</span>
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
                      {repo.openPRs > 0 && (
                        <span className="flex items-center gap-1 text-accent-cyan bg-accent-cyan/10 px-2 py-0.5 rounded-full">
                          <GitPullRequest className="w-3 h-3" /> {repo.openPRs} open
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
