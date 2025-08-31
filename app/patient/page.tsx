'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';

interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
}

interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

interface PatientProfile {
  _id: string;
  patientId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  address: Address;
  emergencyContact: EmergencyContact;
  medicalHistory: string[];
}

interface Test {
  _id: string;
  testName: string;
  testCode: string;
  price: number;
}

interface Package {
  _id: string;
  packageName: string;
  packageCode: string;
  packagePrice: number;
}

interface Doctor {
  _id: string;
  firstName: string;
  lastName: string;
  specialization: string;
}

interface TestOrder {
  _id: string;
  orderNumber: string;
  orderStatus: string;
  totalAmount: number;
  paymentStatus: string;
  expectedReportDate: string;
  createdAt: string;
  tests: Test[];
  packages: Package[];
  doctor: Doctor;
}

interface TestInfo {
  _id: string;
  testName: string;
  testCode: string;
  normalRange: string;
}

interface OrderInfo {
  _id: string;
  orderNumber: string;
  createdAt: string;
}

interface TestResult {
  _id: string;
  result: string;
  status: string;
  flag: string;
  testedDate: string;
  test: TestInfo;
  order: OrderInfo;
  reportUrl?: string;
}

export default function PatientDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [patientProfile, setPatientProfile] = useState<PatientProfile | null>(null);
  const [testOrders, setTestOrders] = useState<TestOrder[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    } else if (session && session.user.role !== 'patient' && session.user.role !== 'admin') {
      router.push('/unauthorized');
    } else if (session && session.user.role === 'patient') {
      fetchPatientData();
    }
  }, [session, status, router]);

  const fetchPatientData = async () => {
    try {
      setLoading(true);
      
      // Fetch patient profile, orders, and results in parallel
      const [profileRes, ordersRes, resultsRes] = await Promise.all([
        fetch('/api/patient/profile'),
        fetch('/api/patient/orders'),
        fetch('/api/patient/results')
      ]);

      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setPatientProfile(profileData.patient);
      }

      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setTestOrders(ordersData.orders);
      }

      if (resultsRes.ok) {
        const resultsData = await resultsRes.json();
        setTestResults(resultsData.results);
      }

    } catch (error: unknown) {
      console.error('Error fetching patient data:', error);
      setError('Failed to load patient data');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: '/auth/login' });
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading your patient portal...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-lg border-b border-gray-200/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Image 
                  src="/logo.png" 
                  alt="Health Inn Services Laboratory" 
                  width={40}
                  height={40}
                  className="object-contain" 
                />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white"></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Patient Portal
                </h1>
                <p className="text-xs text-gray-500 mt-1">Health Inn Services Laboratory</p>
                <p className="text-sm text-gray-600">
                  {patientProfile ? `Patient ID: ${patientProfile.patientId}` : 'Your Health Dashboard'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              <div className="hidden sm:flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-semibold">
                    {session.user.name?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{session.user.name}</p>
                  <p className="text-xs text-gray-600">Patient</p>
                </div>
              </div>
              
              <button
                onClick={handleSignOut}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 shadow-lg transition-all duration-200 hover:shadow-xl"
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
      <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="mb-8">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`${
                    activeTab === 'overview'
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200`}
                >
                  <div className="flex items-center">
                    <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2z" />
                    </svg>
                    Dashboard
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('tests')}
                  className={`${
                    activeTab === 'tests'
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200`}
                >
                  <div className="flex items-center">
                    <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Test History
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('results')}
                  className={`${
                    activeTab === 'results'
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200`}
                >
                  <div className="flex items-center">
                    <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Test Results
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`${
                    activeTab === 'profile'
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200`}
                >
                  <div className="flex items-center">
                    <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    My Profile
                  </div>
                </button>
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          <div>
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white/60 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/20 overflow-hidden">
                    <div className="p-6">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                            <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                          </div>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500">Total Orders</dt>
                            <dd className="text-2xl font-bold text-gray-900">{testOrders.length}</dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/60 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/20 overflow-hidden">
                    <div className="p-6">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                            <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500">Completed Results</dt>
                            <dd className="text-2xl font-bold text-gray-900">{testResults.length}</dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/60 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/20 overflow-hidden">
                    <div className="p-6">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
                            <svg className="h-5 w-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500">Pending Orders</dt>
                            <dd className="text-2xl font-bold text-gray-900">
                              {testOrders.filter(o => o.orderStatus !== 'completed').length}
                            </dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Welcome Message */}
                <div className="bg-white/60 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/20 overflow-hidden">
                  <div className="px-6 py-6">
                    <div className="text-center">
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        Welcome to Your Patient Portal
                      </h2>
                      <p className="text-gray-600">
                        Access your test results, view medical history, and manage your health information all in one place.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Other tabs would be implemented here */}
            {activeTab !== 'overview' && (
              <div className="bg-white/60 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/20 overflow-hidden">
                <div className="px-6 py-12 text-center">
                  <div className="max-w-md mx-auto">
                    <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Coming Soon
                    </h3>
                    <p className="text-gray-600">
                      This section is under development and will be available soon.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}