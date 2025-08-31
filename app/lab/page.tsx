'use client';

import { useSession, signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import WorkQueue from '@/components/lab/WorkQueue';
import ResultEntry from '@/components/lab/ResultEntry';
import ReportGeneration from '@/components/lab/ReportGeneration';
import CompletedOrders from '@/components/lab/CompletedOrders';
import Image from 'next/image';


export default function LabTechnicianDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('work-queue');

  const handleSignOut = () => {
    signOut({ callbackUrl: '/auth/login' });
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    } else if (session && session.user.role !== 'lab_tech' && session.user.role !== 'admin') {
      router.push('/unauthorized');
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground font-medium">Loading lab dashboard...</p>
        </div>
      </div>
    );
  }

  if (!session || (session.user.role !== 'lab_tech' && session.user.role !== 'admin')) {
    return null;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'work-queue':
        return (
          <div className="bg-card/60 backdrop-blur-sm rounded-2xl shadow-xl border border-border overflow-hidden">
            <WorkQueue />
          </div>
        );
      case 'result-entry':
        return (
          <div className="bg-card/60 backdrop-blur-sm rounded-2xl shadow-xl border border-border overflow-hidden">
            <ResultEntry />
          </div>
        );
      case 'report-generation':
        return (
          <div className="bg-card/60 backdrop-blur-sm rounded-2xl shadow-xl border border-border overflow-hidden">
            <ReportGeneration />
          </div>
        );
      case 'completed-orders':
        return (
          <div className="bg-card/60 backdrop-blur-sm rounded-2xl shadow-xl border border-border overflow-hidden">
            <CompletedOrders />
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
        <div className="w-full px-4 sm:px-6 lg:px-8">
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
                  Lab Technician Portal
                </h1>
                <p className="text-sm text-muted-foreground">Health Inn Services Laboratory</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-8">
              <nav className="flex space-x-6">
                <button
                  onClick={() => handleTabChange('work-queue')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    activeTab === 'work-queue'
                      ? 'bg-primary text-primary-foreground shadow-lg'
                      : 'text-muted-foreground hover:bg-secondary hover:text-secondary-foreground'
                  }`}
                >
                  Work Queue
                </button>
                <button
                  onClick={() => handleTabChange('result-entry')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    activeTab === 'result-entry'
                      ? 'bg-primary text-primary-foreground shadow-lg'
                      : 'text-muted-foreground hover:bg-secondary hover:text-secondary-foreground'
                  }`}
                >
                  Result Entry
                </button>
                <button
                  onClick={() => handleTabChange('report-generation')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    activeTab === 'report-generation'
                      ? 'bg-primary text-primary-foreground shadow-lg'
                      : 'text-muted-foreground hover:bg-secondary hover:text-secondary-foreground'
                  }`}
                >
                  Report Generation
                </button>
                <button
                  onClick={() => handleTabChange('completed-orders')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    activeTab === 'completed-orders'
                      ? 'bg-primary text-primary-foreground shadow-lg'
                      : 'text-muted-foreground hover:bg-secondary hover:text-secondary-foreground'
                  }`}
                >
                  Completed Orders
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
      <div className="w-full px-6 py-4">
        {renderContent()}
      </div>
    </div>
  );
}