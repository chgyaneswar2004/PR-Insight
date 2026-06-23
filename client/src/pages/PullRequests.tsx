import { useEffect, useState } from 'react';
import { Layout } from '../components/layout/Layout';
import { useAppStore } from '../store';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { GitPullRequest, Search, Filter, GitCommit, MessageSquare, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';

export default function PullRequests() {
  const { prs, fetchPRs, repos, fetchRepos } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchRepos();
    fetchPRs();
  }, [fetchRepos, fetchPRs]);

  const filteredPRs = prs.filter(pr => {
    const matchesSearch = pr.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || pr.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <Layout>
      <div className="space-y-6 pb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Pull Requests</h1>
            <p className="text-muted-foreground mt-1">Manage and review active pull requests across your repositories.</p>
          </div>
        </div>

        {/* Filters */}
        <Card className="border-border bg-bg-card/50">
          <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search pull requests..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-bg-elevated border border-border rounded-md text-sm text-white focus:outline-none focus:border-accent-cyan transition-colors"
              />
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-bg-elevated border border-border rounded-md text-sm text-white px-3 py-2 focus:outline-none focus:border-accent-cyan"
              >
                <option value="all">All Statuses</option>
                <option value="open">Open</option>
                <option value="review">In Review</option>
                <option value="merged">Merged</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* PR List */}
        <div className="space-y-4">
          {filteredPRs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground bg-bg-card border border-border border-dashed rounded-xl">
              No pull requests found matching your filters.
            </div>
          ) : (
            filteredPRs.map((pr, idx) => {
              const repo = repos.find(r => r.id === pr.repoId);
              
              return (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={pr.id}
                >
                  <Card className="border-border hover:border-border-light transition-colors group">
                    <CardContent className="p-0">
                      <div className="flex flex-col lg:flex-row">
                        <div className="p-5 flex-1 flex gap-4">
                          <div className="mt-1">
                            {pr.status === 'merged' ? (
                              <GitPullRequest className="w-5 h-5 text-accent-purple" />
                            ) : pr.status === 'open' ? (
                              <GitPullRequest className="w-5 h-5 text-success" />
                            ) : (
                              <GitPullRequest className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-start justify-between">
                              <Link to={`/review/${pr.id}`} className="text-base font-medium text-white hover:text-accent-cyan transition-colors line-clamp-1 pr-4">
                                {pr.title}
                              </Link>
                              <div className="flex gap-2 shrink-0">
                                {pr.hasReview && (
                                  <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-sm bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20">
                                    <CheckCircle2 className="w-3 h-3" /> Reviewed
                                  </span>
                                )}
                                {pr.qualityScore < 80 && pr.hasReview && (
                                  <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-sm bg-error/10 text-error border border-error/20">
                                    <ShieldAlert className="w-3 h-3" /> Issues
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <div className="text-sm text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                              <span className="font-medium text-white/70">{repo?.fullName}</span>
                              <span>#{pr.number}</span>
                              <span>opened {formatDistanceToNow(new Date(pr.createdAt), { addSuffix: true })} by {pr.author.login}</span>
                            </div>

                            <div className="pt-2 flex flex-wrap gap-2">
                              {pr.labels.map(label => (
                                <span key={label} className="px-2 py-0.5 rounded bg-bg-elevated text-xs text-white/80 border border-border-light">
                                  {label}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Right side stats */}
                        <div className="p-5 bg-bg-secondary/30 lg:border-l lg:border-t-0 border-t border-border flex lg:flex-col justify-between items-end lg:w-48 shrink-0">
                          <div className="flex gap-4 lg:flex-col lg:gap-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1.5" title="Commits">
                              <GitCommit className="w-4 h-4" /> {pr.commits}
                            </div>
                            <div className="flex items-center gap-1.5" title="Comments">
                              <MessageSquare className="w-4 h-4" /> {pr.comments}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs font-mono">
                              <span className="text-success">+{pr.additions}</span>
                              <span className="text-error">-{pr.deletions}</span>
                            </div>
                          </div>
                          
                          <Button asChild variant="outline" size="sm" className="mt-4">
                            <Link to={`/review/${pr.id}`}>
                              {pr.hasReview ? 'View AI Review' : 'Start AI Review'}
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </Layout>
  );
}
