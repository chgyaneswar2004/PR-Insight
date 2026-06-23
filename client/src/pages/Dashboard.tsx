import { useEffect, useState } from 'react';
import { Layout } from '../components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { useAppStore } from '../store';
import { Activity, ShieldAlert, CheckCircle2, GitMerge, Folders } from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { api } from '../lib/api';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const { prs, fetchPRs, repos, fetchRepos } = useAppStore();

  useEffect(() => {
    fetchRepos();
    fetchPRs();
    
    api.get('/dashboard/stats').then(setStats);
    api.get('/analytics').then(setAnalytics);
  }, [fetchRepos, fetchPRs]);

  const recentPRs = prs.slice(0, 5);

  const container: any = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item: any = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <Layout>
      <div className="space-y-8 pb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Overview</h1>
          <p className="text-muted-foreground">Monitor your team's code quality and AI review metrics.</p>
        </div>

        {/* Stats Grid */}
        {stats && (
          <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            <motion.div variants={item}>
              <Card className="bg-gradient-to-br from-bg-card to-bg-card/50 border-border hover:border-accent-cyan/50 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between space-y-0 pb-4">
                    <p className="text-sm font-medium text-muted-foreground">Repositories</p>
                    <div className="p-2 bg-accent-cyan/10 rounded-lg">
                      <Folders className="h-5 w-5 text-accent-cyan" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-white">{stats.totalRepos}</div>
                  <p className="text-xs text-accent-cyan mt-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan animate-pulse"></span>
                    Active tracking
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={item}>
              <Card className="bg-gradient-to-br from-bg-card to-bg-card/50 border-border hover:border-accent-purple/50 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between space-y-0 pb-4">
                    <p className="text-sm font-medium text-muted-foreground">PRs Reviewed</p>
                    <div className="p-2 bg-accent-purple/10 rounded-lg">
                      <GitMerge className="h-5 w-5 text-accent-purple" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-white">{stats.prsReviewed}</div>
                  <p className="text-xs text-success mt-1">+12% from last month</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={item}>
              <Card className="bg-gradient-to-br from-bg-card to-bg-card/50 border-border hover:border-error/50 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between space-y-0 pb-4">
                    <p className="text-sm font-medium text-muted-foreground">Security Issues prevented</p>
                    <div className="p-2 bg-error/10 rounded-lg">
                      <ShieldAlert className="h-5 w-5 text-error" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-white">{stats.securityIssuesFixed}</div>
                  <p className="text-xs text-muted-foreground mt-1">Across all repositories</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={item}>
              <Card className="bg-gradient-to-br from-bg-card to-bg-card/50 border-border hover:border-success/50 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between space-y-0 pb-4">
                    <p className="text-sm font-medium text-muted-foreground">Avg Quality Score</p>
                    <div className="p-2 bg-success/10 rounded-lg">
                      <CheckCircle2 className="h-5 w-5 text-success" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-white">{stats.avgQualityScore}/100</div>
                  <div className="w-full bg-bg-elevated rounded-full h-1.5 mt-3">
                    <div className="bg-success h-1.5 rounded-full" style={{ width: `${stats.avgQualityScore}%` }}></div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Chart */}
          <div className="lg:col-span-2 space-y-8">
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Review Activity</CardTitle>
                <CardDescription>Number of PRs reviewed and issues found over the last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full mt-4">
                  {analytics && (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analytics.reviewsPerDay.slice(-14)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorReviews" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#06B6D4" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorIssues" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#7C3AED" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" vertical={false} />
                        <XAxis 
                          dataKey="date" 
                          stroke="#6382B4" 
                          fontSize={12} 
                          tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          axisLine={false}
                          tickLine={false}
                          dy={10}
                        />
                        <YAxis stroke="#6382B4" fontSize={12} axisLine={false} tickLine={false} />
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: '#16203A', borderColor: '#1E2D4A', borderRadius: '8px', color: '#fff' }}
                          itemStyle={{ color: '#fff' }}
                        />
                        <Area type="monotone" dataKey="reviews" name="Reviews" stroke="#06B6D4" strokeWidth={2} fillOpacity={1} fill="url(#colorReviews)" />
                        <Area type="monotone" dataKey="issues" name="Issues Found" stroke="#7C3AED" strokeWidth={2} fillOpacity={1} fill="url(#colorIssues)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent PRs */}
          <div className="lg:col-span-1">
            <Card className="border-border h-full flex flex-col">
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Activity className="w-5 h-5 text-accent-cyan" />
                  Recent Pull Requests
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-y-auto">
                <div className="divide-y divide-border/50">
                  {recentPRs.map((pr) => {
                    const repo = repos.find(r => r.id === pr.repoId);
                    return (
                      <Link 
                        key={pr.id} 
                        to={`/review/${pr.id}`}
                        className="block p-4 hover:bg-bg-elevated/50 transition-colors group"
                      >
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-medium text-sm text-white group-hover:text-accent-cyan transition-colors line-clamp-1 pr-4">
                            {pr.title}
                          </h4>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(pr.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <span className="font-medium text-white/70">{repo?.name}</span>
                            <span>•</span>
                            <span>#{pr.number}</span>
                          </div>
                          {pr.status === 'open' && (
                            <span className="px-2 py-0.5 rounded-full bg-success/10 text-success text-[10px] font-medium border border-success/20">
                              Open
                            </span>
                          )}
                          {pr.status === 'review' && (
                            <span className="px-2 py-0.5 rounded-full bg-warning/10 text-warning text-[10px] font-medium border border-warning/20">
                              In Review
                            </span>
                          )}
                        </div>
                      </Link>
                    )
                  })}
                  {recentPRs.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground text-sm">
                      No recent pull requests.
                    </div>
                  )}
                </div>
              </CardContent>
              <div className="p-3 border-t border-border/50 bg-bg-secondary/50 text-center">
                <Link to="/prs" className="text-xs font-medium text-accent-cyan hover:text-accent-cyan/80 transition-colors">
                  View all pull requests →
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
