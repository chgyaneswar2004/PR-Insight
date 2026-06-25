import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  GitPullRequest, 
  Folders, 
  BarChart3, 
  Settings, 
  LogOut,
  Bell,
  Code2
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAppStore } from '../../store';

interface SidebarProps {
  onToggleNotifications: () => void;
}

export function Sidebar({ onToggleNotifications }: SidebarProps) {
  const location = useLocation();
  const { notifications } = useAppStore();
  const unreadCount = notifications.filter((n: any) => !n.read).length;

  const links = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Repositories', path: '/repos', icon: Folders },
    { name: 'Pull Requests', path: '/prs', icon: GitPullRequest },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="w-64 border-r border-border bg-bg-secondary flex flex-col h-screen fixed left-0 top-0 pt-0">
      <div className="h-16 flex items-center px-6 border-b border-border bg-bg-card">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="p-2 bg-accent-cyan/10 rounded-lg group-hover:bg-accent-cyan/20 transition-colors">
            <Code2 className="w-5 h-5 text-accent-cyan" />
          </div>
          <span className="font-bold text-lg tracking-tight text-white group-hover:text-accent-cyan transition-colors">PR Insight</span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-2">
        {links.map((link) => {
          const isActive = location.pathname === link.path || 
                          (link.path !== '/' && location.pathname.startsWith(link.path));
          
          return (
            <Link
              key={link.name}
              to={link.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive 
                  ? "bg-accent-cyan/10 text-accent-cyan" 
                  : "text-muted-foreground hover:bg-bg-elevated hover:text-white"
              )}
            >
              <link.icon className={cn("w-5 h-5", isActive ? "text-accent-cyan" : "text-muted-foreground")} />
              {link.name}
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-border">
        <button 
          onClick={onToggleNotifications}
          className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-bg-elevated hover:text-white transition-all duration-200 mb-2"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-error animate-pulse"></span>
              )}
            </div>
            Notifications
          </div>
          {unreadCount > 0 && (
            <span className="bg-error/20 text-error text-xs font-bold px-2 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </button>
        
        <Link
          to="/login"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-error/10 hover:text-error transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </Link>
      </div>
    </div>
  );
}
