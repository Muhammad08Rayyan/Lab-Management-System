'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';

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
  tests?: Test[];
}


interface TestResult {
  _id: string;
  resultData: {
    parameter: string;
    value: string;
    unit?: string;
    normalRange?: string;
    flag?: 'normal' | 'high' | 'low' | 'critical';
  }[];
  overallStatus: 'normal' | 'abnormal' | 'critical';
  comments?: string;
  reportedDate: string;
  isVerified: boolean;
  technician?: {
    firstName: string;
    lastName: string;
  };
  test: {
    _id: string;
    name: string;
    code: string;
    price: number;
    normalRange: string;
    sampleType: string;
    description: string;
  };
  reportUrl?: string;
}

interface TestsByOrder {
  order: {
    _id: string;
    orderNumber: string;
    createdAt: string;
    orderStatus: string;
    paymentStatus: string;
    totalAmount: number;
    totalTestsCount: number;
    patient: {
      firstName: string;
      lastName: string;
      patientId: string;
    };
    tests: Test[];
    packages: Package[];
  };
  tests: TestResult[];
  showReport?: boolean;
}

export default function PatientDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [testsByOrder, setTestsByOrder] = useState<TestsByOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<TestsByOrder | null>(null);
  const [selectedTest, setSelectedTest] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    } else if (session && session.user.role !== 'patient' && session.user.role !== 'admin') {
      router.push('/unauthorized');
    } else if (session && (session.user.role === 'patient' || session.user.role === 'admin')) {
      fetchPatientData();
    }
  }, [session, status, router]);

  const fetchPatientData = async () => {
    try {
      setLoading(true);
      
      // Fetch patient tests using the new API
      const response = await fetch('/api/patient/tests');
      
      if (response.ok) {
        const data = await response.json();
        setTestsByOrder(data.testsByOrder || []);
      } else {
        setError('Failed to load test data');
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

  const generatePatientReport = async (orderId: string) => {
    setGenerating(true);
    try {
      const response = await fetch('/api/patient/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate report');
      }

      const data = await response.json();
      
      if (data.success && data.pdf) {
        // Create a download link
        const link = document.createElement('a');
        link.href = data.pdf;
        link.download = data.filename;
        link.click();
      } else {
        throw new Error('Invalid response from server');
      }
      
    } catch (error) {
      console.error('Error generating patient report:', error);
      alert(`Failed to generate report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setGenerating(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground font-medium">Loading patient portal...</p>
        </div>
      </div>
    );
  }

  if (!session || (session.user.role !== 'patient' && session.user.role !== 'admin')) {
    return null;
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getResultFlagColor = (flag: string) => {
    switch (flag) {
      case 'normal':
        return 'bg-green-100 text-green-800';
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'low':
        return 'bg-blue-100 text-blue-800';
      case 'critical':
        return 'bg-red-200 text-red-900';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusMessage = (overallStatus: string, isVerified: boolean, hasResults: boolean) => {
    if (!hasResults) {
      return { message: 'Test scheduled - awaiting sample collection', color: 'bg-gray-100 text-gray-800' };
    }
    
    if (!isVerified) {
      return { message: 'Results available - pending verification', color: 'bg-yellow-100 text-yellow-800' };
    }

    switch (overallStatus) {
      case 'normal':
        return { message: 'Test completed - results normal', color: 'bg-green-100 text-green-800' };
      case 'abnormal':
        return { message: 'Test completed - abnormal results', color: 'bg-orange-100 text-orange-800' };
      case 'critical':
        return { message: 'Test completed - critical results', color: 'bg-red-100 text-red-800' };
      default:
        return { message: 'Test completed - results available', color: 'bg-green-100 text-green-800' };
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
                className="h-8 w-8 mr-3 object-contain" 
                width={32}
                height={32}
              />
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Patient Portal
                </h1>
                <p className="text-sm text-muted-foreground">Health Inn Services Laboratory</p>
              </div>
            </div>
            
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
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

        {/* Main Content */}
        <div className="bg-card/60 backdrop-blur-sm rounded-2xl shadow-xl border border-border overflow-hidden">
          <div className="px-6 py-8">
            {!selectedOrder && !selectedTest ? (
              // Main List View - Show Orders
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">My Test Orders</h2>
                    <p className="text-muted-foreground mt-1">Click on an order to view your tests</p>
                  </div>
                </div>

                {testsByOrder.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <svg className="mx-auto h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <h3 className="text-lg font-medium mb-2">No Test Orders</h3>
                    <p>You don&apos;t have any test orders yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {testsByOrder.map((orderData) => (
                      <div 
                        key={orderData.order._id} 
                        onClick={() => setSelectedOrder(orderData)}
                        className="bg-background border border-border rounded-lg p-4 hover:bg-secondary/50 cursor-pointer transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold text-foreground">Order #{orderData.order.orderNumber}</h4>
                              <div className="flex items-center space-x-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(orderData.order.orderStatus)}`}>
                                  {orderData.order.orderStatus.charAt(0).toUpperCase() + orderData.order.orderStatus.slice(1)}
                                </span>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground mb-3">
                              <div>Order Date: {new Date(orderData.order.createdAt).toLocaleDateString()}</div>
                              <div>Amount: Rs. {orderData.order.totalAmount.toLocaleString()}</div>
                              <div>Tests: {orderData.order.totalTestsCount || 0}</div>
                            </div>

                            <div className="flex items-center justify-end">
                              <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : selectedOrder && !selectedTest ? (
              // Order Tests List View
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <button 
                      onClick={() => {setSelectedOrder(null); setSelectedTest(null);}}
                      className="inline-flex items-center text-muted-foreground hover:text-foreground mb-2 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Back to Orders
                    </button>
                    <h2 className="text-2xl font-bold text-foreground">Order #{selectedOrder.order.orderNumber}</h2>
                    <p className="text-muted-foreground mt-1">Click on a test to view detailed results</p>
                  </div>
                </div>

                {/* Order Summary */}
                <div className="bg-background border border-border rounded-lg p-4 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Order Date</p>
                      <p className="font-medium">{new Date(selectedOrder.order.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Amount</p>
                      <p className="font-medium">Rs. {selectedOrder.order.totalAmount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Payment Status</p>
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getPaymentStatusColor(selectedOrder.order.paymentStatus)}`}>
                        {selectedOrder.order.paymentStatus.charAt(0).toUpperCase() + selectedOrder.order.paymentStatus.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tests List / Payment Gate */}
                <div>
                  
                  {selectedOrder.order.paymentStatus !== 'paid' ? (
                    // Payment Gate
                    <div className="bg-background border-2 border-dashed border-border rounded-lg p-8 text-center">
                      <div className="max-w-md mx-auto">
                        <svg className="mx-auto h-16 w-16 mb-4 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <h3 className="text-xl font-semibold text-foreground mb-3">Payment Required</h3>
                        <p className="text-muted-foreground mb-4">
                          You need to complete payment to access your test results and details.
                        </p>
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-yellow-800">Current Status:</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(selectedOrder.order.paymentStatus)}`}>
                              {selectedOrder.order.paymentStatus.charAt(0).toUpperCase() + selectedOrder.order.paymentStatus.slice(1)}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Please contact the reception or visit the laboratory to complete your payment of <strong>Rs. {selectedOrder.order.totalAmount.toLocaleString()}</strong>.
                        </p>
                      </div>
                    </div>
                  ) : (
                    // Show tests if payment is completed
                    (() => {
                      // Combine individual tests and package tests
                      const allTests = [
                        ...(selectedOrder.order.tests || []),
                        ...(selectedOrder.order.packages || []).flatMap((pkg: Package) => pkg.tests || [])
                      ];

                      if (allTests.length === 0) {
                        return (
                          <div className="text-center py-8 text-muted-foreground">
                            <svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            <p>No tests found for this order</p>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-6">
                          {/* Show Package Summary if there are packages */}
                          {selectedOrder.order.packages && selectedOrder.order.packages.length > 0 && (
                            <div>
                              <h4 className="text-md font-semibold text-foreground mb-3">Package Summary</h4>
                              <div className="grid grid-cols-1 gap-3">
                                {selectedOrder.order.packages.map((pkg: Package) => (
                                  <div key={pkg._id} className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                                    <h5 className="font-semibold text-foreground">{pkg.packageName}</h5>
                                    <p className="text-sm text-muted-foreground mb-2">
                                      Code: {pkg.packageCode} | Price: Rs. {pkg.packagePrice.toLocaleString()} | 
                                      Contains {pkg.tests?.length || 0} tests
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Show All Tests (Individual + Package Tests) */}
                          {(() => {
                            // Combine individual tests and package tests
                            const allTests = [
                              ...(selectedOrder.order.tests || []),
                              ...(selectedOrder.order.packages || []).flatMap((pkg: Package) => 
                                (pkg.tests || []).map((test: Test) => ({
                                  ...test,
                                  fromPackage: pkg.packageName,
                                  packageId: pkg._id
                                }))
                              )
                            ];

                            if (allTests.length === 0) {
                              return null;
                            }

                            return (
                              <div>
                                <h4 className="text-md font-semibold text-foreground mb-3">All Tests in Order</h4>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                  {allTests.map((test: Test & { fromPackage?: string; packageId?: string }) => {
                                    // Find corresponding test result - improve matching logic
                                    const testResult = selectedOrder.tests.find((result: TestResult) => {
                                      // Try multiple matching strategies
                                      if (result.test._id === test._id) return true;
                                      if (result.test.code === test.testCode) return true;
                                      if (result.test.name === test.testName) return true;
                                      // Also try matching by test name and code combination
                                      if (result.test.name?.toLowerCase() === test.testName?.toLowerCase() && 
                                          result.test.code?.toLowerCase() === test.testCode?.toLowerCase()) return true;
                                      return false;
                                    });
                                    
                                    getStatusMessage(testResult ? testResult.overallStatus : 'normal', testResult ? testResult.isVerified : false, testResult ? testResult.resultData && testResult.resultData.length > 0 : false);

                                    return (
                                      <div 
                                        key={`${test._id}-${test.packageId || 'individual'}`}
                                        onClick={() => testResult && setSelectedTest(testResult)}
                                        className={`bg-background border border-border rounded-lg p-4 transition-colors ${
                                          testResult ? 'hover:bg-secondary/50 cursor-pointer' : ''
                                        }`}
                                      >
                                        <div className="flex justify-between items-start mb-3">
                                          <div>
                                            <h4 className="font-semibold text-foreground">{test.testName}</h4>
                                            {test.fromPackage && (
                                              <p className="text-xs text-primary bg-primary/10 px-2 py-1 rounded mt-1 inline-block">
                                                From: {test.fromPackage}
                                              </p>
                                            )}
                                          </div>
                                          <div className="flex flex-col items-end space-y-1">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                              testResult ? 
                                                (testResult.overallStatus === 'normal' ? 'bg-green-100 text-green-800' :
                                                 testResult.overallStatus === 'abnormal' ? 'bg-orange-100 text-orange-800' :
                                                 testResult.overallStatus === 'critical' ? 'bg-red-100 text-red-800' :
                                                 'bg-gray-100 text-gray-800') : 
                                                'bg-gray-100 text-gray-800'
                                            }`}>
                                              {testResult ? testResult.overallStatus.charAt(0).toUpperCase() + testResult.overallStatus.slice(1) : 'Pending'}
                                            </span>
                                          </div>
                                        </div>
                                        
                                        <div className="mb-3">
                                          {testResult && testResult.resultData && testResult.resultData.length > 0 ? (
                                            <p className="text-sm text-primary">
                                              Results available - {testResult.resultData.length} parameter(s) measured
                                            </p>
                                          ) : (
                                            <p className="text-sm text-muted-foreground">Results pending</p>
                                          )}
                                        </div>

                                        <div className="flex items-center justify-end">
                                          {testResult && (
                                            <div className="flex items-center text-xs text-primary">
                                              <span className="mr-1">View Results</span>
                                              <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                              </svg>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })()}
                          
                          {/* Unified Report Option */}
                          {(() => {
                            // Check if there are any test results available for this order
                            const hasResults = selectedOrder.tests && selectedOrder.tests.length > 0;
                            
                            if (hasResults) {
                              return (
                                <div className="mt-8 pt-6 border-t border-border">
                                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-6">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <h4 className="text-lg font-semibold text-foreground mb-2">Complete Order Report</h4>
                                        <p className="text-sm text-muted-foreground">
                                          View all test results for this order in a unified report format
                                        </p>
                                      </div>
                                      <div className="flex flex-col space-y-2">
                                        <button
                                          onClick={() => setSelectedOrder({...selectedOrder, showReport: !selectedOrder.showReport})}
                                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors duration-200"
                                        >
                                          {selectedOrder.showReport ? 'Hide Report Preview' : 'Preview Report'}
                                        </button>
                                        <button
                                          onClick={() => generatePatientReport(selectedOrder.order._id)}
                                          disabled={generating}
                                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                          {generating ? (
                                            <div className="flex items-center">
                                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                              </svg>
                                              Generating PDF...
                                            </div>
                                          ) : (
                                            <>
                                              <svg className="w-4 h-4 mr-1.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                              </svg>
                                              Download PDF Report
                                            </>
                                          )}
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Report Preview */}
                                  {selectedOrder.showReport && (
                                    <div className="mt-6 border border-gray-300 rounded-lg p-8 bg-white report-preview-content" style={{ fontFamily: 'Helvetica, Arial, sans-serif', fontSize: '12px', lineHeight: '1.4' }}>
                                      {/* Report Header */}
                                      <div className="text-center mb-8 pb-6 border-b-2 border-gray-300">
                                        <div className="flex justify-center mb-4">
                                          <Image src="/logo.png" alt="Health Inn Services Laboratory" className="h-16 w-16 object-contain" width={64} height={64} />
                                        </div>
                                        <h1 className="text-2xl font-bold text-black mb-2" style={{ fontSize: '20px', fontWeight: 'bold' }}>Health Inn Services Laboratory</h1>
                                        <h2 className="text-lg text-gray-700" style={{ fontSize: '14px' }}>Laboratory Report</h2>
                                      </div>

                                      {/* Patient Information Section */}
                                      <div className="mb-6">
                                        <h3 className="font-bold text-black mb-3" style={{ fontSize: '12px', fontWeight: 'bold' }}>Patient Information:</h3>
                                        <div className="space-y-2">
                                          <p className="text-black">
                                            <span className="font-normal">Name: </span>
                                            {selectedOrder.order.patient ? 
                                              `${selectedOrder.order.patient.firstName || ''} ${selectedOrder.order.patient.lastName || ''}`.trim() :
                                              'Patient Name Not Available'
                                            }
                                          </p>
                                          <p className="text-black">
                                            <span className="font-normal">Order #: </span>
                                            {selectedOrder.order.orderNumber}
                                          </p>
                                          <p className="text-black">
                                            <span className="font-normal">Date: </span>
                                            {new Date(selectedOrder.order.createdAt).toLocaleDateString()}
                                          </p>
                                        </div>
                                      </div>

                                      {/* Test Results Section */}
                                      <div className="mb-6">
                                        <h3 className="font-bold text-black mb-4" style={{ fontSize: '12px', fontWeight: 'bold' }}>TEST RESULTS:</h3>
                                        {selectedOrder.tests.map((result: TestResult) => (
                                          <div key={result._id} className="mb-6 border border-gray-300 rounded p-4" style={{ backgroundColor: '#f9f9f9' }}>
                                            <div className="flex justify-between items-center mb-3">
                                              <h4 className="font-bold text-black">{result.test.name} ({result.test.code})</h4>
                                              <span className={`px-3 py-1 rounded text-xs font-medium ${
                                                result.overallStatus === 'normal' ? 'bg-green-100 text-green-800' :
                                                result.overallStatus === 'abnormal' ? 'bg-orange-100 text-orange-800' :
                                                'bg-red-100 text-red-800'
                                              }`} style={{ fontSize: '10px' }}>
                                                {result.overallStatus.toUpperCase()}
                                              </span>
                                            </div>
                                            <div className="mb-2">
                                              <span className="text-black">Status: {result.overallStatus.toUpperCase()}</span>
                                            </div>
                                            
                                            {result.resultData && result.resultData.length > 0 && (
                                              <div className="mt-4">
                                                {/* Table Header */}
                                                <div className="border-b border-gray-400 pb-1 mb-2">
                                                  <div className="grid grid-cols-5 gap-4 font-bold text-black" style={{ fontSize: '11px' }}>
                                                    <div>Parameter</div>
                                                    <div>Result</div>
                                                    <div>Unit</div>
                                                    <div>Normal Range</div>
                                                    <div>Flag</div>
                                                  </div>
                                                </div>
                                                
                                                {/* Table Data */}
                                                <div className="space-y-1">
                                                  {result.resultData.map((param: { parameter: string; value: string; unit?: string; normalRange?: string; flag?: string }, paramIndex: number) => (
                                                    <div key={paramIndex} className="grid grid-cols-5 gap-4 py-1 text-black" style={{ fontSize: '11px' }}>
                                                      <div>{param.parameter}</div>
                                                      <div className="font-medium">{param.value}</div>
                                                      <div>{param.unit || '-'}</div>
                                                      <div>{param.normalRange || '-'}</div>
                                                      <div className={`font-medium ${
                                                        param.flag === 'normal' ? 'text-green-700' :
                                                        param.flag === 'high' ? 'text-orange-600' :
                                                        param.flag === 'low' ? 'text-blue-600' :
                                                        param.flag === 'critical' ? 'text-red-600' : 'text-gray-600'
                                                      }`}>
                                                        {param.flag?.toUpperCase() || 'NORMAL'}
                                                      </div>
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            )}
                                            
                                            {result.comments && (
                                              <div className="mt-4 p-3 bg-blue-50 rounded">
                                                <p className="text-black text-xs">
                                                  <span className="font-bold">Comments: </span>
                                                  {result.comments}
                                                </p>
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>

                                      {/* Footer */}
                                      <div className="mt-8 pt-4 border-t border-gray-300 text-center">
                                        <p className="text-gray-600" style={{ fontSize: '10px' }}>
                                          Report generated: {new Date().toLocaleDateString()}
                                        </p>
                                        <p className="text-gray-600 mt-1" style={{ fontSize: '10px' }}>
                                          Health Inn Services Laboratory
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      );
                    })()
                  )}
                </div>
              </div>
            ) : selectedTest ? (
              // Individual Test Detail View
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <button 
                      onClick={() => setSelectedTest(null)}
                      className="inline-flex items-center text-muted-foreground hover:text-foreground mb-2 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Back to Tests
                    </button>
                    <h2 className="text-2xl font-bold text-foreground">{selectedTest.test.name}</h2>
                  </div>
                </div>


                {/* Test Results */}
                {selectedTest.resultData && selectedTest.resultData.length > 0 ? (
                  <div className="bg-background border border-border rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-4">Test Results</h3>
                    
                    {/* Result Parameters */}
                    <div className="space-y-4 mb-6">
                      {selectedTest.resultData.map((result, index) => (
                        <div key={index} className="bg-secondary/30 border border-border rounded-lg p-4">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Parameter</p>
                              <p className="font-semibold text-foreground">{result.parameter}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Value</p>
                              <p className="font-semibold text-lg">{result.value} {result.unit && <span className="text-sm text-muted-foreground">{result.unit}</span>}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Normal Range</p>
                              <p className="font-medium">{result.normalRange || selectedTest.test.normalRange || 'Not specified'}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Status</p>
                              {result.flag ? (
                                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getResultFlagColor(result.flag)}`}>
                                  {result.flag.charAt(0).toUpperCase() + result.flag.slice(1)}
                                </span>
                              ) : (
                                <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                                  Normal
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Overall Status and Price */}
                    <div className="border-t border-border pt-4 mb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Overall Status</p>
                          <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                            selectedTest.overallStatus === 'normal' ? 'bg-green-100 text-green-800' :
                            selectedTest.overallStatus === 'abnormal' ? 'bg-orange-100 text-orange-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {selectedTest.overallStatus.charAt(0).toUpperCase() + selectedTest.overallStatus.slice(1)}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground mb-2">Price</p>
                          <p className="font-medium text-lg">Rs. {selectedTest.test.price.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>

                    {/* Comments */}
                    {selectedTest.comments && (
                      <div className="mb-4">
                        <p className="text-sm text-muted-foreground mb-2">Comments</p>
                        <div className="bg-muted/30 rounded-lg p-3">
                          <p className="font-medium">{selectedTest.comments}</p>
                        </div>
                      </div>
                    )}

                    {/* Report Download */}
                    {selectedTest.reportUrl && (
                      <div className="pt-4 border-t border-border">
                        <a
                          href={selectedTest.reportUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary/90 transition-colors"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Download Full Report
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-background border border-border rounded-lg p-6 text-center">
                    <svg className="mx-auto h-12 w-12 mb-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="text-lg font-medium text-foreground mb-2">Results Not Available Yet</h3>
                    <p className="text-muted-foreground mb-4">{getStatusMessage(selectedTest.overallStatus, selectedTest.isVerified, selectedTest.resultData.length > 0).message}</p>
                    <div className="text-sm text-muted-foreground">
                      Your sample has been collected and is being processed in our laboratory. Results will be available once testing is completed and verified by our lab technicians.
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}