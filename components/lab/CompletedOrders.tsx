'use client';

import { useState, useEffect, useCallback } from 'react';

interface TestOrder {
  _id: string;
  orderNumber: string;
  patient: {
    _id: string;
    firstName: string;
    lastName: string;
    patientId: string;
    email: string;
  };
  tests: {
    _id: string;
    code: string;
    name: string;
    price?: number;
  }[];
  orderStatus: 'completed';
  priority: 'normal' | 'urgent' | 'stat';
  totalAmount: number;
  paidAmount: number;
  paymentStatus: 'pending' | 'partial' | 'paid';
  createdAt: string;
  completedAt?: string;
  sampleCollectionDate?: string;
  expectedReportDate?: string;
  notes?: string;
}

interface TestResult {
  _id: string;
  test?: {
    name?: string;
    code?: string;
  };
  overallStatus?: 'normal' | 'abnormal' | 'critical';
  resultData?: {
    parameter?: string;
    value?: string;
    unit?: string;
    flag?: 'normal' | 'high' | 'low' | 'critical';
  }[];
  comments?: string;
}


export default function CompletedOrders() {
  const [completedOrders, setCompletedOrders] = useState<TestOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'normal' | 'urgent' | 'stat'>('all');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const ordersPerPage = 20;

  const fetchCompletedOrders = useCallback(async (page = currentPage, search = searchTerm, priority = priorityFilter) => {
    try {
      setLoading(true);
      
      const searchParams = new URLSearchParams({
        page: page.toString(),
        limit: ordersPerPage.toString(),
        orderStatus: 'completed',
        ...(search && { search }),
        ...(priority !== 'all' && { priority })
      });
      
      const response = await fetch(`/api/orders?${searchParams}`);
      if (response.ok) {
        const data = await response.json();
        setCompletedOrders(data.orders || []);
        setTotalPages(data.pagination?.pages || 1);
        setTotalOrders(data.pagination?.total || 0);
        setCurrentPage(page);
      } else {
        console.error('Failed to fetch completed orders');
      }
    } catch (error) {
      console.error('Error fetching completed orders:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, priorityFilter, ordersPerPage]);

  useEffect(() => {
    fetchCompletedOrders();
  }, [fetchCompletedOrders]);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchCompletedOrders(1, searchTerm, priorityFilter);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, priorityFilter, fetchCompletedOrders]);

  const handlePageChange = (page: number) => {
    fetchCompletedOrders(page, searchTerm, priorityFilter);
  };

  const viewResults = (orderId: string) => {
    window.open(`/lab/results/${orderId}`, '_blank');
  };

  const downloadReport = async (orderId: string, orderNumber: string) => {
    try {
      // Get the order details and results
      const orderResponse = await fetch(`/api/orders/${orderId}`);
      if (!orderResponse.ok) {
        throw new Error('Failed to fetch order details');
      }
      
      const orderData = await orderResponse.json();
      const order = orderData.order;
      
      // Get results for this order
      const resultsResponse = await fetch(`/api/results?testOrderId=${orderId}`);
      let results: TestResult[] = [];
      if (resultsResponse.ok) {
        const resultsData = await resultsResponse.json();
        results = resultsData.results || [];
      }
      
      // Import jsPDF dynamically to avoid SSR issues
      const jsPDF = (await import('jspdf')).default;
      const doc = new jsPDF();
      
      let yPosition = 20;
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const contentWidth = pageWidth - 2 * margin;
      
      // Logo and Header
      try {
        // Load logo image from public directory
        const logoResponse = await fetch('/logo.png');
        if (logoResponse.ok) {
          const logoBlob = await logoResponse.blob();
          const logoBase64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(logoBlob);
          });
          
          // Add logo to top left of PDF
          doc.addImage(logoBase64, 'PNG', margin, yPosition, 20, 20);
          yPosition += 25;
        } else {
          yPosition += 10;
        }
      } catch (error) {
        console.warn('Could not load logo for PDF:', error);
        yPosition += 10;
      }
      
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Health Inn Services Laboratory', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 20;
      
      // Draw line separator
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 15;
      
      // Patient and Date Info
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Name: ${order.patient?.firstName || 'N/A'} ${order.patient?.lastName || ''}`, margin, yPosition);
      doc.text(`${new Date(order.createdAt).toLocaleDateString()}`, pageWidth - margin, yPosition, { align: 'right' });
      yPosition += 20;
      
      // Test Results
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('TEST RESULTS', margin, yPosition);
      yPosition += 10;
      
      // Process each test result
      results.forEach((result, index) => {
        // Check if we need a new page
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }
        
        // Test header
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        const testName = `${index + 1}. ${result.test?.name || 'Unknown Test'} (${result.test?.code || 'N/A'})`;
        
        // Handle long test names by wrapping them
        const splitTestName = doc.splitTextToSize(testName, contentWidth - 10);
        splitTestName.forEach((line: string, lineIndex: number) => {
          if (yPosition > 270 && lineIndex === 0) {
            doc.addPage();
            yPosition = 20;
          }
          doc.text(line, margin, yPosition);
          yPosition += 6;
        });
        yPosition += 2;
        
        // Overall status
        doc.setFont('helvetica', 'normal');
        const status = (result.overallStatus || 'normal').toUpperCase();
        const statusColor: [number, number, number] = result.overallStatus === 'critical' ? [255, 0, 0] : 
                           result.overallStatus === 'abnormal' ? [255, 165, 0] : [0, 128, 0];
        doc.setTextColor(...statusColor);
        doc.text(`Overall Status: ${status}`, margin + 5, yPosition);
        doc.setTextColor(0, 0, 0); // Reset to black
        yPosition += 10;
        
        // Parameters table header
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Parameter', margin + 5, yPosition);
        doc.text('Result', margin + 80, yPosition);
        doc.text('Unit', margin + 120, yPosition);
        doc.text('Flag', margin + 150, yPosition);
        yPosition += 5;
        
        // Draw line under header
        doc.line(margin + 5, yPosition, pageWidth - margin, yPosition);
        yPosition += 5;
        
        // Parameters
        doc.setFont('helvetica', 'normal');
        result.resultData?.forEach((param) => {
          if (yPosition > 270) {
            doc.addPage();
            yPosition = 20;
          }
          
          doc.text(param.parameter || 'N/A', margin + 5, yPosition);
          doc.text(param.value || 'N/A', margin + 80, yPosition);
          doc.text(param.unit || '-', margin + 120, yPosition);
          
          // Color-code the flag
          const flag = (param.flag || 'normal').toUpperCase();
          const flagColor: [number, number, number] = param.flag === 'critical' ? [255, 0, 0] : 
                           param.flag === 'high' || param.flag === 'low' ? [255, 165, 0] : [0, 128, 0];
          doc.setTextColor(...flagColor);
          doc.text(flag, margin + 150, yPosition);
          doc.setTextColor(0, 0, 0); // Reset to black
          
          yPosition += 6;
        });
        
        // Comments if any
        if (result.comments) {
          yPosition += 5;
          doc.setFont('helvetica', 'italic');
          doc.text('Comments:', margin + 5, yPosition);
          yPosition += 5;
          
          // Wrap long comments
          const splitComments = doc.splitTextToSize(result.comments, contentWidth - 10);
          splitComments.forEach((line: string) => {
            if (yPosition > 270) {
              doc.addPage();
              yPosition = 20;
            }
            doc.text(line, margin + 5, yPosition);
            yPosition += 5;
          });
        }
        
        yPosition += 10;
      });
      
      // Footer
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }
      
      yPosition += 10;
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Report generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, { align: 'center' });
      
      // Save the PDF
      doc.save(`Lab_Report_${orderNumber}.pdf`);
      
    } catch (error) {
      console.error('Error downloading report:', error);
      
      // Fallback to text report if PDF generation fails
      const orderResponse = await fetch(`/api/orders/${orderId}`);
      const orderData = await orderResponse.json();
      const order = orderData.order;
      
      const resultsResponse = await fetch(`/api/results?testOrderId=${orderId}`);
      let results: TestResult[] = [];
      if (resultsResponse.ok) {
        const resultsData = await resultsResponse.json();
        results = resultsData.results || [];
      }
      
      const reportContent = `
LABORATORY REPORT
================

Order #: ${order.orderNumber}
Patient: ${order.patient?.firstName || 'N/A'} ${order.patient?.lastName || ''}
Patient ID: ${order.patient?.patientId || 'N/A'}
Date: ${new Date(order.createdAt).toLocaleDateString()}
Completed: ${order.completedAt ? new Date(order.completedAt).toLocaleDateString() : 'N/A'}

TEST RESULTS:
${results.map(result => `
Test: ${result.test?.name || 'Unknown Test'} (${result.test?.code || 'N/A'})
Status: ${result.overallStatus || 'Normal'}
Parameters:
${result.resultData?.map(param => 
  `  - ${param.parameter}: ${param.value} ${param.unit || ''} (${param.flag || 'normal'})`
).join('\n') || '  No parameters available'}
${result.comments ? `Comments: ${result.comments}` : ''}
`).join('\n')}

Report generated: ${new Date().toLocaleString()}
`;

      const blob = new Blob([reportContent], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `Lab_Report_${orderNumber}_fallback.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      alert('PDF generation failed, downloaded text report as fallback. You may need to install jsPDF: npm install jspdf');
    }
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      stat: 'text-red-600 bg-red-100',
      urgent: 'text-orange-600 bg-orange-100',
      normal: 'text-gray-600 bg-gray-100'
    };
    return colors[priority as keyof typeof colors] || 'text-gray-600 bg-gray-100';
  };


  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="grid gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-lg h-32"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      {/* Header */}
      <div className="bg-muted/30 px-6 py-6 border-b border-border">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-foreground mb-1">Completed Orders</h3>
            <p className="text-sm text-muted-foreground">Archive and history of all completed lab tests</p>
          </div>
          <button
            onClick={() => fetchCompletedOrders()}
            className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs font-medium shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <svg className="w-4 h-4 mr-1.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/50 px-6 py-4 border-b border-gray-200">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search orders, patients, tests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>

          {/* Priority Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Priority</label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as 'all' | 'normal' | 'urgent' | 'stat')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="all">All Priorities</option>
              <option value="stat">🚨 STAT Only</option>
              <option value="urgent">⚡ Urgent Only</option>
              <option value="normal">Normal Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order & Patient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tests Completed
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {completedOrders.map((order) => (
                <tr key={order._id} className="hover:bg-gray-50 transition-colors duration-200">
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-gray-900 text-sm">#{order.orderNumber}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(order.priority)}`}>
                          {order.priority.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        {order.patient?.firstName || 'N/A'} {order.patient?.lastName || ''}
                      </div>
                      <div className="text-xs text-gray-400">
                        Ordered: {new Date(order.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-gray-900">
                        {order.tests?.length || 0} test(s) completed
                      </div>
                      <div className="text-xs text-gray-600">
                        {order.tests?.slice(0, 2).map(test => test.name).join(', ')}
                        {(order.tests?.length || 0) > 2 && ` +${(order.tests?.length || 0) - 2} more`}
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => viewResults(order._id)}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors duration-200"
                      >
                        <svg className="w-3 h-3 mr-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        View Results
                      </button>
                      
                      <button
                        onClick={() => downloadReport(order._id, order.orderNumber)}
                        className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors duration-200"
                      >
                        <svg className="w-3 h-3 mr-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Download PDF
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {completedOrders.length === 0 && !loading && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No completed orders found</h3>
            <p className="mt-1 text-sm text-gray-500">
              No completed orders match your current filters.
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 bg-white border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing page {currentPage} of {totalPages} ({totalOrders} total orders)
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              {/* Page numbers */}
              <div className="flex space-x-1">
                {[...Array(Math.min(5, totalPages))].map((_, index) => {
                  let page;
                  if (totalPages <= 5) {
                    page = index + 1;
                  } else if (currentPage <= 3) {
                    page = index + 1;
                  } else if (currentPage >= totalPages - 2) {
                    page = totalPages - 4 + index;
                  } else {
                    page = currentPage - 2 + index;
                  }
                  
                  return (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg ${
                        currentPage === page
                          ? 'bg-green-600 text-white'
                          : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Footer */}
      <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200">
        <div className="flex justify-between items-center text-sm">
          <div className="flex items-center space-x-6">
            <span className="text-muted-foreground">
              <span className="font-semibold text-foreground">{completedOrders.length}</span> orders on this page
            </span>
            <span className="text-muted-foreground">
              Total tests: <span className="font-semibold text-foreground">
                {completedOrders.reduce((sum, order) => sum + (order.tests?.length || 0), 0)}
              </span>
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
}