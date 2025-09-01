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
  orderStatus: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'normal' | 'urgent' | 'stat';
  totalAmount: number;
  paidAmount: number;
  paymentStatus: 'pending' | 'partial' | 'paid';
  createdAt: string;
  sampleCollectionDate?: string;
  expectedReportDate?: string;
  notes?: string;
}

interface TestResult {
  _id?: string;
  testOrder: string;
  test: string;
  patient: string;
  resultData: {
    parameter: string;
    value: string;
    unit?: string;
    normalRange?: string;
    flag?: 'normal' | 'high' | 'low' | 'critical';
  }[];
  overallStatus: 'normal' | 'abnormal' | 'critical';
  comments: string;
  reportUrl?: string;
}

export default function UnifiedLabWorkflow() {
  const [orders, setOrders] = useState<TestOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<TestOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'in_progress' | 'completed'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'normal' | 'urgent' | 'stat'>('all');
  
  // Modals
  const [showResultModal, setShowResultModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showImageUploadModal, setShowImageUploadModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<TestOrder | null>(null);
  const [selectedTest, setSelectedTest] = useState<TestOrder['tests'][0] | null>(null);
  
  // Form states
  const [resultForm, setResultForm] = useState<TestResult>({
    testOrder: '',
    test: '',
    patient: '',
    resultData: [{ parameter: '', value: '', unit: '', normalRange: '', flag: 'normal' }],
    overallStatus: 'normal',
    comments: ''
  });
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [orderNotes, setOrderNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      // Fetch more orders with higher limit
      const response = await fetch('/api/orders?limit=100');
      if (response.ok) {
        const data = await response.json();
        console.log('Orders fetched:', data.orders?.length || 0, 'orders');
        
        // Debug: Check test data in first order
        if (data.orders && data.orders.length > 0) {
          const firstOrder = data.orders[0];
          console.log('First order tests:', firstOrder.tests);
          console.log('First order complete data:', JSON.stringify(firstOrder, null, 2));
        }
        
        setOrders(data.orders || []);
      } else {
        console.error('Failed to fetch orders:', response.status, await response.text());
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = useCallback(() => {
    let filtered = [...orders];

    // Status filter
    if (filter !== 'all') {
      filtered = filtered.filter(order => order.orderStatus === filter);
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(order => order.priority === priorityFilter);
    }

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(order => 
        order.orderNumber.toLowerCase().includes(searchLower) ||
        order.patient.firstName.toLowerCase().includes(searchLower) ||
        order.patient.lastName.toLowerCase().includes(searchLower) ||
        order.patient.patientId.toLowerCase().includes(searchLower) ||
        order.tests.some(test => 
          test.name.toLowerCase().includes(searchLower) ||
          test.code.toLowerCase().includes(searchLower)
        )
      );
    }

    // Sort by priority and creation date
    filtered.sort((a, b) => {
      const priorityWeight = { stat: 3, urgent: 2, normal: 1 };
      const priorityDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    setFilteredOrders(filtered);
  }, [orders, filter, priorityFilter, searchTerm]);

  useEffect(() => {
    filterOrders();
  }, [orders, filter, searchTerm, priorityFilter, filterOrders]);

  const updateOrderStatus = async (orderId: string, newStatus: TestOrder['orderStatus']) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderStatus: newStatus })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update order status');
      }

      return response.json();
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  };

  const handleStartProcessing = async (order: TestOrder) => {
    try {
      await updateOrderStatus(order._id, 'in_progress');
      fetchOrders();
    } catch (error) {
      alert(`Error starting processing: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleCompleteOrder = async (order: TestOrder) => {
    try {
      await updateOrderStatus(order._id, 'completed');
      fetchOrders();
    } catch (error) {
      alert(`Error completing order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const openResultModal = (order: TestOrder, test: TestOrder['tests'][0]) => {
    const testName = test.name || 'Unknown Test';
    const testCode = test.code || 'N/A';
    const normalRange = 'Not specified';
    
    console.log('Opening result modal for:', { testName, testCode, testId: test._id });
    
    setSelectedOrder(order);
    setSelectedTest(test);
    setResultForm({
      testOrder: order._id,
      test: test._id,
      patient: order.patient._id,
      resultData: [{ parameter: testName, value: '', unit: '', normalRange, flag: 'normal' }],
      overallStatus: 'normal',
      comments: ''
    });
    setShowResultModal(true);
  };

  const openImageUploadModal = (order: TestOrder) => {
    setSelectedOrder(order);
    setSelectedImages([]);
    setShowImageUploadModal(true);
  };

  const openNotesModal = (order: TestOrder) => {
    setSelectedOrder(order);
    setOrderNotes(order.notes || '');
    setShowNotesModal(true);
  };

  const handleSubmitResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !selectedTest) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...resultForm,
          resultData: resultForm.resultData.filter(item => item.parameter && item.value)
        })
      });

      if (response.ok) {
        setShowResultModal(false);
        resetForms();
        fetchOrders();
        alert('Test result added successfully');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to submit result');
      }
    } catch (error) {
      console.error('Error submitting result:', error);
      alert('Error submitting result');
    } finally {
      setSubmitting(false);
    }
  };

  const handleImageUpload = async () => {
    if (!selectedOrder || selectedImages.length === 0) {
      alert('Please select at least one image');
      return;
    }

    setSubmitting(true);
    try {
      // Ensure order is in progress before adding results
      if (selectedOrder.orderStatus !== 'in_progress') {
        await updateOrderStatus(selectedOrder._id, 'in_progress');
      }

      // Create result for each test in the order (skip if already exists)
      const resultPromises = selectedOrder.tests.map(async (test, index) => {
        const testName = test.name || `Test ${index + 1}`;
        const testCode = test.code || `TEST${index + 1}`;
        
        console.log(`Creating result for test:`, { testName, testCode, testId: test._id });
        
        const response = await fetch('/api/results', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            testOrder: selectedOrder._id,
            test: test._id,
            patient: selectedOrder.patient._id,
            resultData: [{
              parameter: 'Lab Report',
              value: 'Completed with uploaded images',
              unit: '',
              normalRange: '',
              flag: 'normal'
            }],
            overallStatus: 'normal',
            comments: `Test ${testName} (${testCode}) completed with ${selectedImages.length} image(s) uploaded`
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          // If result already exists, that's ok - just continue
          if (response.status === 409) {
            console.log(`Result already exists for ${testName}, skipping...`);
            return { message: 'Result already exists' };
          }
          console.error(`Failed to save result for ${testName}:`, errorData);
          throw new Error(`Failed to save result for ${testName}: ${errorData.error || 'Unknown error'}`);
        }
        
        return response.json();
      });

      await Promise.all(resultPromises);

      // Mark order as completed
      await updateOrderStatus(selectedOrder._id, 'completed');
      setShowImageUploadModal(false);
      resetForms();
      alert('Results uploaded and order completed successfully!');
    } catch (error) {
      console.error('Error uploading results:', error);
      alert(`Error uploading results: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateNotes = async () => {
    if (!selectedOrder) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/orders/${selectedOrder._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: orderNotes })
      });

      if (response.ok) {
        setShowNotesModal(false);
        resetForms();
        fetchOrders();
        alert('Notes updated successfully');
      } else {
        throw new Error('Failed to update notes');
      }
    } catch (error) {
      console.error('Error updating notes:', error);
      alert('Error updating notes');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForms = () => {
    setSelectedOrder(null);
    setSelectedTest(null);
    setSelectedImages([]);
    setOrderNotes('');
    setResultForm({
      testOrder: '',
      test: '',
      patient: '',
      resultData: [{ parameter: '', value: '', unit: '', normalRange: '', flag: 'normal' }],
      overallStatus: 'normal',
      comments: ''
    });
  };

  const addResultParameter = () => {
    setResultForm({
      ...resultForm,
      resultData: [
        ...resultForm.resultData,
        { parameter: '', value: '', unit: '', normalRange: '', flag: 'normal' }
      ]
    });
  };

  const removeResultParameter = (index: number) => {
    if (resultForm.resultData.length > 1) {
      setResultForm({
        ...resultForm,
        resultData: resultForm.resultData.filter((_, i) => i !== index)
      });
    }
  };

  const updateResultParameter = (index: number, field: string, value: string) => {
    const updated = [...resultForm.resultData];
    updated[index] = { ...updated[index], [field]: value };
    setResultForm({ ...resultForm, resultData: updated });
  };

  const handleAddImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImages(prev => [...prev, file]);
      event.target.value = '';
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
      in_progress: 'bg-purple-100 text-purple-800 border-purple-200',
      completed: 'bg-green-100 text-green-800 border-green-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      stat: 'bg-red-500 text-white',
      urgent: 'bg-orange-500 text-white',
      normal: 'bg-gray-500 text-white'
    };
    return colors[priority as keyof typeof colors] || 'bg-gray-500 text-white';
  };

  const getStatusCounts = () => {
    return {
      all: orders.length,
      pending: orders.filter(o => o.orderStatus === 'pending').length,
      in_progress: orders.filter(o => o.orderStatus === 'in_progress').length,
      completed: orders.filter(o => o.orderStatus === 'completed').length
    };
  };

  const statusCounts = getStatusCounts();

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          {/* Header Skeleton */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-48"></div>
            </div>
            <div className="h-10 bg-gray-200 rounded w-24"></div>
          </div>
          
          {/* Filter Skeleton */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-32"></div>
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-6 bg-gray-200 rounded-full w-16"></div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-32"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-20"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
          
          {/* Table Skeleton */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-3 bg-gray-50">
              <div className="grid grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-4 bg-gray-200 rounded w-24"></div>
                ))}
              </div>
            </div>
            <div className="divide-y divide-gray-200">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="px-4 py-4">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-20"></div>
                      <div className="h-4 bg-gray-200 rounded w-32"></div>
                      <div className="h-3 bg-gray-200 rounded w-24"></div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-28"></div>
                      <div className="h-3 bg-gray-200 rounded w-20"></div>
                    </div>
                    <div className="space-y-1">
                      <div className="h-5 bg-gray-200 rounded-full w-16"></div>
                      <div className="h-5 bg-gray-200 rounded-full w-12"></div>
                    </div>
                    <div className="flex gap-1">
                      <div className="h-6 bg-gray-200 rounded w-20"></div>
                      <div className="h-6 bg-gray-200 rounded w-16"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Lab Technician Workflow</h2>
          <p className="text-gray-600">Unified dashboard for all test orders and results</p>
        </div>
        
        <button
          onClick={fetchOrders}
          className="self-start px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
        >
          <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
            <div className="flex flex-wrap gap-1">
              {[
                { key: 'all', label: `All (${statusCounts.all})` },
                { key: 'pending', label: `Pending (${statusCounts.pending})` },
                { key: 'in_progress', label: `In Progress (${statusCounts.in_progress})` },
                { key: 'completed', label: `Completed (${statusCounts.completed})` }
              ].map(item => (
                <button
                  key={item.key}
                  onClick={() => setFilter(item.key as 'all' | 'pending' | 'in_progress' | 'completed')}
                  className={`px-2 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                    filter === item.key
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Priority Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Priority</label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as 'all' | 'stat' | 'urgent' | 'normal')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="all">All Priorities</option>
              <option value="stat">🚨 STAT Only</option>
              <option value="urgent">⚡ Urgent Only</option>
              <option value="normal">Normal Only</option>
            </select>
          </div>

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
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                  Order & Patient
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                  Tests
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                  Status & Priority
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.map((order) => (
                <tr key={order._id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 w-1/4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-gray-900 text-sm">#{order.orderNumber}</span>
                        {order.priority === 'stat' && <span className="text-red-500 text-sm">🚨</span>}
                        {order.priority === 'urgent' && <span className="text-orange-500 text-sm">⚡</span>}
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        {order.patient?.firstName || 'N/A'} {order.patient?.lastName || ''}
                      </div>
                      <div className="text-xs text-gray-500">ID: {order.patient?.patientId || 'N/A'}</div>
                      <div className="text-xs text-gray-400">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-4 py-4 w-1/4">
                    <div className="space-y-1">
                      {order.tests && order.tests.length > 0 ? (
                        <>
                          {order.tests.slice(0, 2).map((test, index) => {
                            const testName = test.name || `Test ${index + 1}`;
                            const testCode = test.code || `T${index + 1}`;
                            return (
                              <div key={test._id || `test-${index}`} className="text-xs">
                                <div className="font-medium text-gray-900">{testName}</div>
                                <div className="text-gray-500">({testCode})</div>
                              </div>
                            );
                          })}
                          {order.tests.length > 2 && (
                            <div className="text-xs text-gray-500">
                              +{order.tests.length - 2} more
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-xs text-gray-500">No tests assigned</div>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-4 w-1/6">
                    <div className="space-y-1">
                      <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.orderStatus)}`}>
                        {order.orderStatus?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
                      </div>
                      <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(order.priority)}`}>
                        {order.priority?.toUpperCase() || 'NORMAL'}
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-4 w-1/3">
                    <div className="flex flex-col gap-1">
                      <div className="flex flex-wrap gap-1">
                        {/* Status-specific actions */}
                        {order.orderStatus === 'pending' && (
                          <button
                            onClick={() => handleStartProcessing(order)}
                            className="px-2 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 whitespace-nowrap"
                          >
                            Start Processing
                          </button>
                        )}
                        
                        {order.orderStatus === 'confirmed' && (
                          <button
                            onClick={() => handleStartProcessing(order)}
                            className="px-2 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 whitespace-nowrap"
                          >
                            Begin Lab Work
                          </button>
                        )}

                        {order.orderStatus === 'in_progress' && (
                          <>
                            <button
                              onClick={() => openImageUploadModal(order)}
                              className="px-2 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 whitespace-nowrap"
                            >
                              Upload Results
                            </button>
                            <button
                              onClick={() => handleCompleteOrder(order)}
                              className="px-2 py-1 bg-emerald-600 text-white rounded text-xs font-medium hover:bg-emerald-700 whitespace-nowrap"
                            >
                              Mark Complete
                            </button>
                          </>
                        )}

                        {/* Always show these buttons */}
                        <button
                          onClick={() => openNotesModal(order)}
                          className="px-2 py-1 bg-gray-600 text-white rounded text-xs font-medium hover:bg-gray-700 whitespace-nowrap"
                        >
                          {order.notes ? 'Edit Notes' : 'Add Notes'}
                        </button>
                      </div>
                      
                      {/* Test-specific actions */}
                      {order.orderStatus === 'in_progress' && order.tests && order.tests.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {order.tests.slice(0, 2).map((test, index) => {
                            const testName = test.name || `Test ${index + 1}`;
                            const testCode = test.code || `T${index + 1}`;
                            return (
                              <button
                                key={test._id || `test-btn-${index}`}
                                onClick={() => openResultModal(order, test)}
                                className="px-2 py-1 bg-purple-600 text-white rounded text-xs font-medium hover:bg-purple-700 whitespace-nowrap"
                                title={`Enter results for ${testName}`}
                              >
                                Enter {testCode}
                              </button>
                            );
                          })}
                          {order.tests.length > 2 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs whitespace-nowrap">
                              +{order.tests.length - 2} more tests
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No orders found</h3>
            <p className="mt-1 text-sm text-gray-500">
              No orders match your current filters.
            </p>
          </div>
        )}
      </div>

      {/* Result Entry Modal */}
      {showResultModal && selectedOrder && selectedTest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-screen overflow-y-auto">
            <form onSubmit={handleSubmitResult} className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Enter Test Result</h3>
                <button
                  type="button"
                  onClick={() => setShowResultModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="font-medium">Patient:</span> {selectedOrder.patient.firstName} {selectedOrder.patient.lastName}</div>
                  <div><span className="font-medium">Test:</span> {selectedTest.name || 'Unknown Test'}</div>
                  <div><span className="font-medium">Test Code:</span> {selectedTest.code || 'N/A'}</div>
                  <div><span className="font-medium">Normal Range:</span> Not specified</div>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">Test Parameters</label>
                  <button
                    type="button"
                    onClick={addResultParameter}
                    className="text-blue-600 hover:text-blue-900 text-sm"
                  >
                    + Add Parameter
                  </button>
                </div>
                
                <div className="space-y-3">
                  {resultForm.resultData.map((param, index) => (
                    <div key={index} className="grid grid-cols-6 gap-3 items-center">
                      <input
                        type="text"
                        placeholder="Parameter"
                        value={param.parameter}
                        onChange={(e) => updateResultParameter(index, 'parameter', e.target.value)}
                        className="border rounded px-2 py-1 text-sm"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Value"
                        value={param.value}
                        onChange={(e) => updateResultParameter(index, 'value', e.target.value)}
                        className="border rounded px-2 py-1 text-sm"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Unit"
                        value={param.unit}
                        onChange={(e) => updateResultParameter(index, 'unit', e.target.value)}
                        className="border rounded px-2 py-1 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Normal Range"
                        value={param.normalRange}
                        onChange={(e) => updateResultParameter(index, 'normalRange', e.target.value)}
                        className="border rounded px-2 py-1 text-sm"
                      />
                      <select
                        value={param.flag}
                        onChange={(e) => updateResultParameter(index, 'flag', e.target.value)}
                        className="border rounded px-2 py-1 text-sm"
                      >
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                        <option value="low">Low</option>
                        <option value="critical">Critical</option>
                      </select>
                      {resultForm.resultData.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeResultParameter(index)}
                          className="text-red-600 hover:text-red-900 text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Overall Status</label>
                  <select
                    value={resultForm.overallStatus}
                    onChange={(e) => setResultForm({ ...resultForm, overallStatus: e.target.value as 'normal' | 'abnormal' })}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="normal">Normal</option>
                    <option value="abnormal">Abnormal</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Comments</label>
                <textarea
                  value={resultForm.comments}
                  onChange={(e) => setResultForm({ ...resultForm, comments: e.target.value })}
                  rows={3}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Additional comments about the test results"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowResultModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Result'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Upload Modal */}
      {showImageUploadModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Upload Results</h3>
              <button
                onClick={() => setShowImageUploadModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="font-medium">Order:</span> {selectedOrder.orderNumber}</div>
                <div><span className="font-medium">Patient:</span> {selectedOrder.patient.firstName} {selectedOrder.patient.lastName}</div>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Add Result Images</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleAddImage}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              
              {selectedImages.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-medium text-gray-700 mb-2">Selected Images ({selectedImages.length}):</p>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {selectedImages.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <span className="text-sm text-gray-700 truncate flex-1">{file.name}</span>
                        <button
                          onClick={() => removeImage(index)}
                          className="ml-2 text-red-500 hover:text-red-700 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowImageUploadModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleImageUpload}
                disabled={selectedImages.length === 0 || submitting}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {submitting ? 'Uploading...' : 'Upload & Complete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notes Modal */}
      {showNotesModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Order Notes</h3>
              <button
                onClick={() => setShowNotesModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-sm">
                <span className="font-medium">Order:</span> {selectedOrder.orderNumber} - {selectedOrder.patient.firstName} {selectedOrder.patient.lastName}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              <textarea
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                rows={4}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="Add notes about this order..."
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowNotesModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateNotes}
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Save Notes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}