'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <Image 
            src="/logo.png" 
            alt="Health Inn Services Laboratory Logo" 
            width={80}
            height={80}
            className="object-contain"
            priority
          />
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold text-foreground">
          Health Inn Services Laboratory
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-card py-8 px-4 shadow-[var(--shadow-xl)] rounded-[var(--radius)] border border-border sm:px-10">
          <div className="text-center">
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-[var(--radius-md)] relative mb-6">
              <div className="flex items-center justify-center">
                <svg className="h-12 w-12 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="text-lg font-medium mb-1">
                    404 - Page Not Found
                  </h3>
                  <p className="text-sm">
                    The page you&apos;re looking for doesn&apos;t exist.
                  </p>
                </div>
              </div>
            </div>
            
            <p className="text-card-foreground mb-6">
              The page you&apos;re looking for might have been moved, deleted, or you may have entered an incorrect URL.
            </p>
            
            <div className="space-y-3">
              <Link
                href="/"
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] text-sm font-medium text-primary-foreground bg-primary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring transition-all duration-200"
              >
                Return to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}