'use client';

import { useSession, signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import UserManagement from '@/components/admin/UserManagement';
import TestManagement from '@/components/admin/TestManagement';

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [testManagementLoading, setTestManagementLoading] = useState(false);

  const handleSignOut = () => {
    signOut({ callbackUrl: '/auth/login' });
  };

  const handleTabChange = async (tab: string) => {
    if (tab === 'tests') {
      setTestManagementLoading(true);
      setActiveTab(tab);
      // Simulate loading delay to show the loading state
      setTimeout(() => {
        setTestManagementLoading(false);
      }, 800);
    } else {
      setActiveTab(tab);
    }
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    } else if (session && session.user.role !== 'admin') {
      router.push('/unauthorized');
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground font-medium">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!session || session.user.role !== 'admin') {
    return null;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="bg-card/60 backdrop-blur-sm rounded-2xl shadow-xl border border-border p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-4">Dashboard</h3>
              <p className="text-muted-foreground text-lg">Coming Soon</p>
              <div className="mt-6 text-sm text-muted-foreground">
                Advanced analytics and reporting features will be available here.
              </div>
            </div>
          </div>
        );
      case 'users':
        return (
          <div className="bg-card/60 backdrop-blur-sm rounded-2xl shadow-xl border border-border overflow-hidden">
            <UserManagement />
          </div>
        );
      case 'tests':
        if (testManagementLoading) {
          return (
            <div className="bg-card/60 backdrop-blur-sm rounded-2xl shadow-xl border border-border p-12 text-center">
              <div className="max-w-md mx-auto">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-6"></div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Loading Test Management</h3>
                <p className="text-muted-foreground">Please wait while we load the test management interface...</p>
              </div>
            </div>
          );
        }
        return (
          <div className="bg-card/60 backdrop-blur-sm rounded-2xl shadow-xl border border-border overflow-hidden">
            <TestManagement />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-md shadow-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Admin Panel
              </h1>
              <p className="text-sm text-muted-foreground">Lab Management System</p>
            </div>
            
            <div className="flex items-center space-x-8">
              <nav className="flex space-x-6">
                <button
                  onClick={() => handleTabChange('dashboard')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    activeTab === 'dashboard'
                      ? 'bg-primary text-primary-foreground shadow-lg'
                      : 'text-muted-foreground hover:bg-secondary hover:text-secondary-foreground'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => handleTabChange('users')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    activeTab === 'users'
                      ? 'bg-primary text-primary-foreground shadow-lg'
                      : 'text-muted-foreground hover:bg-secondary hover:text-secondary-foreground'
                  }`}
                >
                  User Management
                </button>
                <button
                  onClick={() => handleTabChange('tests')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    activeTab === 'tests'
                      ? 'bg-primary text-primary-foreground shadow-lg'
                      : 'text-muted-foreground hover:bg-secondary hover:text-secondary-foreground'
                  }`}
                >
                  Test Management
                </button>
              </nav>
              
              <button
                onClick={handleSignOut}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-destructive-foreground bg-destructive hover:bg-destructive/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-destructive shadow-lg transition-all duration-200 hover:shadow-xl"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </div>
    </div>
  );
}