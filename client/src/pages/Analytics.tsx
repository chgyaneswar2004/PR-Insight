import { useEffect, useState } from 'react';
import { Layout } from '../components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { api } from '../lib/api';
import { TrendingUp, Users, Zap } from 'lucide-react';


export default function Analytics() {
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    api.get('/analytics').then(setAnalytics).catch(console.error);
  }, []);

  if (!analytics) {
    return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-accent-cyan border-t-transparent rounded-full animate-spin"></div></div></Layout>;
  }

  return (
    <Layout>
      <div className="space-y-6 pb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Analytics</h1>
          <p className="text-muted-foreground mt-1">Deep dive into review performance, issue trends, and team productivity.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-border">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Time Saved</p>
                  <h3 className="text-3xl font-bold text-white">{analytics.metrics.timeSaved}h</h3>
                  <p className="text-xs text-success flex items-center mt-2"><TrendingUp className="w-3 h-3 mr-1" /> +24% vs last month</p>
                </div>
                <div className="p-3 bg-accent-cyan/10 rounded-xl">
                  <Zap className="w-5 h-5 text-accent-cyan" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* We reuse the other stats from dashboard metrics or compute new ones */}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Issue Types Bar Chart */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Issues Found by Type</CardTitle>
              <CardDescription>Distribution of issues detected by the AI across all repositories</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.issueTypes} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" vertical={false} />
                    <XAxis dataKey="type" stroke="#6382B4" fontSize={12} axisLine={false} tickLine={false} />
                    <YAxis stroke="#6382B4" fontSize={12} axisLine={false} tickLine={false} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#16203A', borderColor: '#1E2D4A', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff' }}
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {analytics.issueTypes.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Issue Security Pie Chart */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Security vs Quality Issues</CardTitle>
              <CardDescription>Ratio of critical security vulnerabilities to code quality smells</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.issueTypes}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={110}
                      paddingAngle={5}
                      dataKey="count"
                      nameKey="type"
                    >
                      {analytics.issueTypes.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#16203A', borderColor: '#1E2D4A', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px' }}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Team Performance Table */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-accent-purple" />
              Team Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground bg-bg-elevated/50 border-b border-border">
                  <tr>
                    <th className="px-6 py-4 font-medium">Developer</th>
                    <th className="px-6 py-4 font-medium">PRs Reviewed</th>
                    <th className="px-6 py-4 font-medium">Issues Detected</th>
                    <th className="px-6 py-4 font-medium">Avg Code Quality Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {analytics.teamPerformance.map((member: any) => (
                    <tr key={member.name} className="hover:bg-bg-elevated/20 transition-colors">
                      <td className="px-6 py-4 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-accent-purple/20 flex items-center justify-center font-bold text-accent-purple">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-white">{member.name}</span>
                      </td>
                      <td className="px-6 py-4 text-white/90">{member.prsReviewed}</td>
                      <td className="px-6 py-4 text-white/90">{member.issuesFound}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className={member.avgScore >= 90 ? 'text-success' : member.avgScore >= 80 ? 'text-warning' : 'text-error'}>
                            {member.avgScore}/100
                          </span>
                          <div className="w-24 h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                            <div 
                              className={cn("h-full rounded-full", member.avgScore >= 90 ? 'bg-success' : member.avgScore >= 80 ? 'bg-warning' : 'bg-error')} 
                              style={{ width: `${member.avgScore}%` }} 
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

// Ensure cn is imported
import { cn } from '../lib/utils';
