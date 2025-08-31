'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';

interface TestResult {
  _id: string;
  testOrder: {
    _id: string;
    orderNumber: string;
    patient: {
      _id: string;
      firstName: string;
      lastName: string;
      patientId: string;
      email: string;
      dateOfBirth: string;
      gender: string;
      phone: string;
    };
    createdAt: string;
    priority: string;
    doctor?: {
      firstName: string;
      lastName: string;
    };
  };
  test: {
    _id: string;
    code: string;
    name: string;
    category: string;
    normalRange?: string;
  };
  resultData: {
    parameter: string;
    value: string;
    unit?: string;
    normalRange?: string;
    flag?: 'normal' | 'high' | 'low' | 'critical';
  }[];
  overallStatus: 'normal' | 'abnormal' | 'critical';
  comments: string;
  testedDate: string;
  status: 'pending' | 'approved';
}

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;
  
  const [results, setResults] = useState<TestResult[]>([]);
  const [orderData, setOrderData] = useState<TestResult['testOrder'] | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchResults = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get the order data first
      const orderResponse = await fetch(`/api/orders/${orderId}`);
      let orderResponseData = null;
      if (orderResponse.ok) {
        orderResponseData = await orderResponse.json();
        setOrderData(orderResponseData.order);
      } else {
        console.error('Failed to fetch order data');
        return;
      }
      
      // Get results for this order
      const resultsResponse = await fetch(`/api/results?testOrderId=${orderId}`);
      if (resultsResponse.ok) {
        const resultsData = await resultsResponse.json();
        const orderResults = resultsData.results || [];
        
        console.log('Fetched results:', orderResults);
        
        // Attach the complete order info to each result
        orderResults.forEach((result: TestResult) => {
          if (orderResponseData?.order) {
            result.testOrder = orderResponseData.order;
          }
        });
        
        setResults(orderResults);
      } else {
        console.error('Failed to fetch results');
      }
    } catch (error) {
      console.error('Error fetching results:', error);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (orderId) {
      fetchResults();
    }
  }, [orderId, fetchResults]);

  const getStatusColor = (status: string) => {
    const colors = {
      normal: 'text-green-600 bg-green-100',
      abnormal: 'text-orange-600 bg-orange-100',
      critical: 'text-red-600 bg-red-100'
    };
    return colors[status as keyof typeof colors] || 'text-gray-600 bg-gray-100';
  };

  const getFlagColor = (flag?: string) => {
    const colors = {
      normal: 'text-green-700',
      high: 'text-orange-600',
      low: 'text-blue-600',
      critical: 'text-red-600'
    };
    return colors[flag as keyof typeof colors] || 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading lab results...</p>
        </div>
      </div>
    );
  }

  // Only show "no results" if loading is complete and we have order data but no results
  if (!loading && orderData && results.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No results found</h3>
          <p className="mt-1 text-sm text-gray-500">No test results available for this order.</p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Show error if order data couldn't be loaded
  if (!loading && !orderData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Order not found</h3>
          <p className="mt-1 text-sm text-gray-500">The requested order could not be found.</p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with back button */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Laboratory Results</h1>
              <p className="text-sm text-gray-600">Order #{orderData?.orderNumber}</p>
            </div>
          </div>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Report Content */}
      <div className="max-w-4xl mx-auto py-8 px-6">
        <div className="bg-white border rounded-lg p-6 w-full print:shadow-none print:border-0" style={{ fontFamily: 'Times New Roman, serif' }}>
          {/* Report Header */}
          <div className="text-center mb-8 pb-4 border-b border-gray-300">
            <div className="flex justify-center mb-4">
              <Image src="/logo.png" alt="Health Inn Services Laboratory" className="h-12 w-12 object-contain" width={48} height={48} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Health Inn Services Laboratory</h1>
          </div>

          {/* Patient Info */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <span className="font-medium text-gray-900">
                Name: {
                  orderData?.patient?.firstName || orderData?.patient?.lastName ? 
                    `${orderData.patient.firstName || ''} ${orderData.patient.lastName || ''}`.trim() :
                    'Patient Name Not Available'
                }
              </span>
            </div>
            
            <div className="text-right">
              <span className="font-medium text-gray-900">{orderData?.createdAt ? new Date(orderData.createdAt).toLocaleDateString() : ''}</span>
            </div>
          </div>

          {/* Test Results */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">TEST RESULTS</h3>
            {results.map((result) => (
              <div key={result._id} className="mb-6 border rounded-lg p-4 bg-gray-50">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold text-gray-900">{result.test.name} ({result.test.code})</h4>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(result.overallStatus)}`}>
                    {result.overallStatus.toUpperCase()}
                  </span>
                </div>
                
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="px-3 py-2 text-left font-medium">Parameter</th>
                        <th className="px-3 py-2 text-left font-medium">Result</th>
                        <th className="px-3 py-2 text-left font-medium">Unit</th>
                        <th className="px-3 py-2 text-left font-medium">Normal Range</th>
                        <th className="px-3 py-2 text-left font-medium">Flag</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.resultData.map((param, paramIndex) => (
                        <tr key={paramIndex} className="border-t">
                          <td className="px-3 py-2">{param.parameter}</td>
                          <td className="px-3 py-2 font-medium">{param.value}</td>
                          <td className="px-3 py-2">{param.unit || '-'}</td>
                          <td className="px-3 py-2">{param.normalRange || '-'}</td>
                          <td className={`px-3 py-2 font-medium ${getFlagColor(param.flag)}`}>
                            {param.flag?.toUpperCase() || 'NORMAL'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {result.comments && (
                  <div className="mt-3 p-3 bg-blue-50 rounded">
                    <p className="text-sm"><span className="font-medium">Comments:</span> {result.comments}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-gray-200 text-sm text-gray-600">
            <div className="text-center">
              <p>Report generated: {new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}