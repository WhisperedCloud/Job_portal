
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';
import { 
  Home, 
  User, 
  Briefcase, 
  FileText, 
  Users, 
  Settings,
  Plus 
} from 'lucide-react';

const Sidebar = () => {
  const { user } = useAuth();
  const location = useLocation();

  const candidateLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/profile', label: 'My Profile', icon: User },
    { href: '/jobs', label: 'Browse Jobs', icon: Briefcase },
    { href: '/applications', label: 'My Applications', icon: FileText },
  ];

  const recruiterLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/profile', label: 'Company Profile', icon: User },
    { href: '/jobs/posted', label: 'Posted Jobs', icon: Briefcase },
    { href: '/jobs/create', label: 'Post New Job', icon: Plus },
    { href: '/applications', label: 'Applications', icon: Users },
  ];

  const adminLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/users', label: 'Manage Users', icon: Users },
    { href: '/jobs', label: 'All Jobs', icon: Briefcase },
    { href: '/all-applications', label: 'All Applications', icon: FileText },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  const getLinks = () => {
    switch (user?.role) {
      case 'candidate':
        return candidateLinks;
      case 'recruiter':
        return recruiterLinks;
      case 'admin':
        return adminLinks;
      default:
        return [];
    }
  };

  const links = getLinks();

  return (
    <div className="w-64 bg-white shadow-sm border-r border-border">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-foreground mb-6">
          {user?.role === 'candidate' && 'Candidate Portal'}
          {user?.role === 'recruiter' && 'Recruiter Portal'}
          {user?.role === 'admin' && 'Admin Portal'}
        </h2>
        
        <nav className="space-y-2">
          {links.map((link) => {
            const isActive = location.pathname === link.href;
            const Icon = link.icon;
            
            return (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  'flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default Sidebar;
