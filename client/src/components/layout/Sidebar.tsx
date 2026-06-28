import { Link, useLocation } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { 
  LayoutDashboard, 
  GitPullRequest, 
  Folders, 
  BarChart3, 
  Settings, 
  LogOut,
  Bell,
  Code2,
  Shield,
  ChevronUp
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAppStore } from '../../store';
import { useAuthStore } from '../../store/authStore';

interface SidebarProps {
  onToggleNotifications: () => void;
}

export function Sidebar({ onToggleNotifications }: SidebarProps) {
  const location = useLocation();
  const { notifications } = useAppStore();
  const { user, logout } = useAuthStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const unreadCount = notifications.filter((n: any) => !n.read).length;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const links = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Repositories', path: '/repos', icon: Folders },
    { name: 'Pull Requests', path: '/prs', icon: GitPullRequest },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    { 
      name: user?.role === 'admin' ? 'Admin Settings' : 'Settings', 
      path: '/settings', 
      icon: Settings 
    },
  ];

  return (
    <div className="w-64 border-r border-border bg-bg-secondary flex flex-col h-screen fixed left-0 top-0 pt-0">
      <div className="h-16 flex items-center px-6 border-b border-border bg-bg-card">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-lg overflow-hidden group-hover:scale-105 transition-transform bg-accent-cyan/5 p-1 flex items-center justify-center">
            <img src="/logo.png" alt="PR Insight" className="w-full h-full object-contain" />
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

      <div className="p-4 border-t border-border relative" ref={dropdownRef}>
        <button 
          onClick={onToggleNotifications}
          className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-bg-elevated hover:text-white transition-all duration-200 mb-4"
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

        {dropdownOpen && (
          <div className="absolute bottom-16 left-4 right-4 bg-bg-card border border-border rounded-lg shadow-xl py-1 z-50 overflow-hidden glass-card">
            <Link
              to="/settings"
              onClick={() => setDropdownOpen(false)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-white hover:bg-bg-elevated transition-colors"
            >
              <Settings className="w-4 h-4 text-accent-cyan" />
              {user?.role === 'admin' ? 'Admin Settings' : 'Settings'}
            </Link>
            <button
              onClick={async () => {
                setDropdownOpen(false);
                await logout();
              }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-error hover:bg-error/10 transition-colors text-left"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        )}

        {user && (
          <div 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center justify-between p-2 rounded-lg hover:bg-bg-elevated cursor-pointer transition-colors border border-transparent hover:border-border"
          >
            <div className="flex items-center gap-3 min-w-0">
              <img 
                src={user.avatarUrl} 
                alt={user.username} 
                className="w-9 h-9 rounded-full border border-border"
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">@{user.username}</p>
                <div className="flex items-center gap-1">
                  {user.role === 'admin' ? (
                    <span className="text-[10px] text-accent-cyan font-semibold flex items-center gap-0.5">
                      <Shield className="w-3 h-3" /> Admin
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground font-medium">Member</span>
                  )}
                </div>
              </div>
            </div>
            <ChevronUp className={cn("w-4 h-4 text-muted-foreground transition-transform duration-200", dropdownOpen && "rotate-180")} />
          </div>
        )}
      </div>
    </div>
  );
}
