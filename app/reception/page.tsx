'use client';

import { useSession, signOut } from 'next-auth/react';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PatientManagement from '@/components/reception/PatientManagement';
import TestAssignment from '@/components/reception/TestAssignment';
import Image from 'next/image';

function ReceptionDashboardContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam || 'patients');

  const handleSignOut = () => {
    signOut({ callbackUrl: '/auth/login' });
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    } else if (session && session.user.role !== 'reception') {
      router.push('/unauthorized');
    }
  }, [session, status, router]);

  // Update active tab when URL parameter changes
  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground font-medium">Loading reception dashboard...</p>
        </div>
      </div>
    );
  }

  if (!session || session.user.role !== 'reception') {
    return null;
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'patients':
        return (
          <div className="bg-card/60 backdrop-blur-sm rounded-2xl shadow-xl border border-border overflow-hidden">
            <PatientManagement />
          </div>
        );
      case 'tests':
        return (
          <div className="bg-card/60 backdrop-blur-sm rounded-2xl shadow-xl border border-border overflow-hidden">
            <TestAssignment />
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
            <div className="flex items-center">
              <Image 
                src="/logo.png" 
                alt="Health Inn Services Laboratory" 
                width={32}
                height={32}
                className="mr-3 object-contain" 
              />
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Reception Panel
                </h1>
                <p className="text-sm text-muted-foreground">Health Inn Services Laboratory</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-8">
              <nav className="flex space-x-6">
                <button
                  onClick={() => handleTabChange('patients')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    activeTab === 'patients'
                      ? 'bg-primary text-primary-foreground shadow-lg'
                      : 'text-muted-foreground hover:bg-secondary hover:text-secondary-foreground'
                  }`}
                >
                  Patient Management
                </button>
                <button
                  onClick={() => handleTabChange('tests')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    activeTab === 'tests'
                      ? 'bg-primary text-primary-foreground shadow-lg'
                      : 'text-muted-foreground hover:bg-secondary hover:text-secondary-foreground'
                  }`}
                >
                  Test Assignment
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

export default function ReceptionDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground font-medium">Loading reception dashboard...</p>
        </div>
      </div>
    }>
      <ReceptionDashboardContent />
    </Suspense>
  );
}