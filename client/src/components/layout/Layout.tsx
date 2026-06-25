import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Bell, X, Check, AlertTriangle, Info, ShieldAlert } from 'lucide-react';
import { useAppStore } from '../../store';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { notifications, fetchNotifications, markNotificationRead } = useAppStore();

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const toggleNotifications = () => setNotificationsOpen(!notificationsOpen);

  const getIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <ShieldAlert className="w-5 h-5 text-error" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-warning" />;
      case 'success': return <Check className="w-5 h-5 text-success" />;
      default: return <Info className="w-5 h-5 text-accent-cyan" />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-bg-primary">
      <Sidebar onToggleNotifications={toggleNotifications} />
      
      <main className="flex-1 ml-64 overflow-y-auto relative">
        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>

        {/* Notifications Slide-over */}
        <AnimatePresence>
          {notificationsOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setNotificationsOpen(false)}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" 
              />
              <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
                className="fixed top-0 right-0 h-full w-96 bg-bg-card border-l border-border z-50 flex flex-col shadow-2xl"
              >
                <div className="flex items-center justify-between p-4 border-b border-border bg-bg-secondary">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Bell className="w-5 h-5 text-muted-foreground" />
                    Notifications
                  </h2>
                  <button 
                    onClick={() => setNotificationsOpen(false)}
                    className="p-2 hover:bg-bg-elevated rounded-md text-muted-foreground hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {notifications.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div 
                        key={notif.id}
                        className={cn(
                          "p-4 rounded-lg border transition-colors cursor-pointer",
                          notif.read ? "bg-bg-primary/50 border-border" : "bg-bg-elevated border-border-light shadow-md",
                          !notif.read && notif.severity === 'critical' && "border-error/50 bg-error/10"
                        )}
                        onClick={() => !notif.read && markNotificationRead(notif.id)}
                      >
                        <div className="flex gap-3">
                          <div className="mt-1 flex-shrink-0">
                            {getIcon(notif.severity)}
                          </div>
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <h4 className={cn("font-medium text-sm", !notif.read ? "text-white" : "text-muted-foreground")}>
                                {notif.title}
                              </h4>
                              {!notif.read && (
                                <span className="w-2 h-2 rounded-full bg-accent-cyan flex-shrink-0 mt-1.5" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                              {notif.message}
                            </p>
                            <span className="text-[10px] text-muted-foreground/70 mt-2 block">
                              {formatDistanceToNow(new Date(notif.timestamp), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
