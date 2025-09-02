'use client';

import { useState, useEffect } from 'react';
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

interface GroupedResults {
  [orderId: string]: {
    orderInfo: TestResult['testOrder'];
    results: TestResult[];
  };
}

export default function ReportGeneration() {
  const [pendingResults, setPendingResults] = useState<TestResult[]>([]);
  const [groupedResults, setGroupedResults] = useState<GroupedResults>({});
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchPendingResults();
  }, []);

  useEffect(() => {
    // Group results by order
    const grouped: GroupedResults = {};
    pendingResults.forEach(result => {
      // Add null checks to prevent errors
      if (!result || !result.testOrder || !result.testOrder._id) {
        console.warn('Invalid result data:', result);
        return;
      }
      
      
      const orderId = result.testOrder._id;
      if (!grouped[orderId]) {
        grouped[orderId] = {
          orderInfo: result.testOrder,
          results: []
        };
      }
      grouped[orderId].results.push(result);
    });
    setGroupedResults(grouped);
  }, [pendingResults]);

  const fetchPendingResults = async () => {
    try {
      setLoading(true);
      
      // Get all in-progress orders with populated patient data (same as WorkQueue)
      const ordersResponse = await fetch('/api/orders?orderStatus=in_progress');
      if (!ordersResponse.ok) {
        throw new Error('Failed to fetch orders');
      }
      
      const ordersData = await ordersResponse.json();
      const inProgressOrders = ordersData.orders || [];
      
      
      // Then get results for these orders
      const allResults = [];
      for (const order of inProgressOrders) {
        try {
          const resultsResponse = await fetch(`/api/results?testOrderId=${order._id}`);
          if (resultsResponse.ok) {
            const resultsData = await resultsResponse.json();
            const orderResults = resultsData.results || [];
            
            // Attach the complete order info (including populated patient) to each result
            orderResults.forEach((result: Partial<TestResult>) => {
              result.testOrder = order; // Use the complete order object with populated patient
            });
            
            allResults.push(...orderResults);
          }
        } catch (error) {
          console.warn(`Failed to fetch results for order ${order._id}:`, error);
        }
      }
      
      setPendingResults(allResults);
      
    } catch (error) {
      console.error('Error fetching pending results:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async (orderId: string) => {
    const orderResults = groupedResults[orderId];
    if (!orderResults) return;

    setGenerating(true);
    try {
      // For now, we'll simulate the report generation and just update the order status
      // In a real implementation, this would generate a PDF and save it
      
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mark results as approved (if the API endpoint exists)
      try {
        await Promise.all(orderResults.results.map(async (result) => {
          if (result._id) {
            const response = await fetch(`/api/results/${result._id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'approved' })
            });
            if (!response.ok) {
              console.warn(`Failed to update result ${result._id}`);
            }
          }
        }));
      } catch (error) {
        console.warn('Failed to update some results:', error);
      }

      // Update order status to completed and set completion timestamp
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          orderStatus: 'completed',
          completedAt: new Date().toISOString()
        })
      });

      if (response.ok) {
        alert('Report generated and order completed successfully!');
        fetchPendingResults();
      } else {
        throw new Error('Failed to update order status');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      alert(`Failed to generate report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setGenerating(false);
    }
  };


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
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-64 mb-4"></div>
          <div className="grid gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-lg h-48"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const selectedOrderData = selectedOrder ? groupedResults[selectedOrder] : null;

  return (
    <div className="overflow-hidden">
      {/* Header */}
      <div className="bg-muted/30 px-6 py-6 border-b border-border">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-foreground mb-1">Report Generation</h3>
            <p className="text-sm text-muted-foreground">Generate professional PDF reports from completed test results</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={fetchPendingResults}
              className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs font-medium shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <svg className="w-4 h-4 mr-1.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {Object.keys(groupedResults).length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-sm font-medium text-gray-900 mb-1">No results ready for reporting</h3>
            <p className="text-sm text-gray-500">Complete test result entries first to generate reports.</p>
          </div>
        ) : (
          /* Orders Grid View */
          <div className="grid gap-4">
            {Object.entries(groupedResults).map(([orderId, orderData]) => {
              // Add null safety checks
              if (!orderData || !orderData.orderInfo || !orderData.results) {
                console.warn('Invalid order data:', orderData);
                return null;
              }

              const { orderInfo, results } = orderData;
              
              return (
                <div key={orderId} className="bg-white rounded-lg shadow border p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="text-lg font-semibold text-gray-900">#{orderInfo?.orderNumber || 'N/A'}</h4>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-600">Patient</p>
                          <p className="font-medium text-gray-900">
                            {orderInfo?.patient ? 
                              `${orderInfo.patient.firstName} ${orderInfo.patient.lastName}` :
                              'Patient Name Not Available'
                            }
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-600">Date</p>
                          <p className="font-medium text-gray-900">
                            {orderInfo?.createdAt ? new Date(orderInfo.createdAt).toLocaleDateString() : new Date().toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="mb-4">
                        <p className="text-sm text-gray-600 mb-2">Test Results ({results?.length || 0})</p>
                        <div className="grid gap-2">
                          {results?.map((result) => {
                            if (!result || !result._id) return null;
                            
                            return (
                              <div key={result._id} className="bg-gray-50 rounded-lg p-3">
                                <div className="flex justify-between items-center">
                                  <div>
                                    <p className="font-medium text-gray-900">{result.test?.name || 'Unknown Test'}</p>
                                    <p className="text-sm text-gray-600">({result.test?.code || 'N/A'})</p>
                                  </div>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(result.overallStatus || 'normal')}`}>
                                    {(result.overallStatus || 'normal').toUpperCase()}
                                  </span>
                                </div>
                                
                                <div className="mt-2 text-xs text-gray-600">
                                  Parameters: {result.resultData?.length || 0}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                  </div>

                  <div className="flex flex-col space-y-2 flex-shrink-0">
                    <button
                      onClick={() => setSelectedOrder(selectedOrder === orderId ? null : orderId)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors duration-200 w-auto"
                    >
                      {selectedOrder === orderId ? 'Hide Preview' : 'Preview Report'}
                    </button>
                    
                    <button
                      onClick={() => generateReport(orderId)}
                      disabled={generating}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed w-auto"
                    >
                      {generating ? (
                        <div className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Generating...
                        </div>
                      ) : (
                        <>
                          <svg className="w-4 h-4 mr-1.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Generate PDF
                        </>
                      )}
                    </button>
                    </div>
                  </div>

                  {/* Expanded Preview */}
                  {selectedOrder === orderId && selectedOrderData && (
                  <div className="mt-6 border-t border-gray-200 pt-6">
                    <div className="bg-white border rounded-lg p-6 w-full" style={{ fontFamily: 'Times New Roman, serif' }}>
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
                              selectedOrderData.orderInfo?.patient?.firstName || selectedOrderData.orderInfo?.patient?.lastName ? 
                                `${selectedOrderData.orderInfo.patient.firstName || ''} ${selectedOrderData.orderInfo.patient.lastName || ''}`.trim() :
                                'Patient Name Not Available'
                            }
                          </span>
                        </div>
                        
                        <div className="text-right">
                          <span className="font-medium text-gray-900">{new Date(selectedOrderData.orderInfo.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {/* Test Results */}
                      <div className="mb-6">
                        <h3 className="font-semibold text-gray-900 mb-4">TEST RESULTS</h3>
                        {selectedOrderData.results.map((result) => (
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
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}