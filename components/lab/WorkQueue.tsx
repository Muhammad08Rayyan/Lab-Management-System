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
  };
  tests: {
    _id: string;
    code: string;
    name: string;
    testCode?: string;
    testName?: string;
    normalRange?: string;
    sampleType?: string;
  }[];
  orderStatus: string;
  priority: string;
  createdAt: string;
  expectedReportDate?: string;
  doctor?: {
    firstName: string;
    lastName: string;
  };
}

export default function WorkQueue() {
  const [availableOrders, setAvailableOrders] = useState<TestOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress'>('all');

  const fetchAvailableOrders = useCallback(async () => {
    try {
      setLoading(true);
      let url = '/api/orders?';
      
      if (filter !== 'all') {
        url += `orderStatus=${filter}&`;
      } else {
        // Only show active orders, not completed ones
        url += 'orderStatus=pending,confirmed,in_progress&';
      }

      console.log('Fetching orders from:', url);
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        console.log('Work Queue data received:', data);
        setAvailableOrders(data.orders || []);
      } else {
        console.error('Work Queue API error:', response.status, await response.text());
      }
    } catch (error) {
      console.error('Error fetching available orders:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchAvailableOrders();
  }, [filter, fetchAvailableOrders]);

  const startProcessing = async (orderId: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderStatus: 'in_progress' })
      });

      if (response.ok) {
        fetchAvailableOrders();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Error updating order status');
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      stat: 'bg-red-100 text-red-800 border-red-200',
      urgent: 'bg-orange-100 text-orange-800 border-orange-200',
      normal: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[priority as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getPriorityWeight = (priority: string) => {
    const weights = { stat: 3, urgent: 2, normal: 1 };
    return weights[priority as keyof typeof weights] || 1;
  };

  const sortedOrders = [...availableOrders].sort((a, b) => {
    // Sort by priority first, then by creation date
    const priorityDiff = getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
    if (priorityDiff !== 0) return priorityDiff;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="flex justify-between items-center mb-6">
            <div>
              <div className="h-6 bg-gray-200 rounded w-32 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-48"></div>
            </div>
            <div className="h-10 bg-gray-200 rounded w-24"></div>
          </div>
          
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
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
            <h3 className="text-xl font-bold text-foreground mb-1">Work Queue</h3>
            <p className="text-sm text-muted-foreground">Active orders ready for processing</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex space-x-1">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                  filter === 'all'
                    ? 'bg-primary text-primary-foreground shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All ({availableOrders.length})
              </button>
              <button
                onClick={() => setFilter('pending')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                  filter === 'pending'
                    ? 'bg-primary text-primary-foreground shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setFilter('in_progress')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                  filter === 'in_progress'
                    ? 'bg-primary text-primary-foreground shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                In Progress
              </button>
            </div>
            <button
              onClick={fetchAvailableOrders}
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

      {/* Orders Grid */}
      <div className="p-6 space-y-4">
        {sortedOrders.map((order) => (
          <div 
            key={order._id} 
            className={`bg-white rounded-xl shadow-lg border-l-4 p-6 hover:shadow-xl transition-all duration-200 ${
              order.priority === 'stat' ? 'border-red-500 bg-red-50/30' :
              order.priority === 'urgent' ? 'border-orange-500 bg-orange-50/30' : 'border-gray-300'
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {order.orderNumber}
                  </h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.orderStatus)}`}>
                    {order.orderStatus.replace('_', ' ').toUpperCase()}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(order.priority)}`}>
                    {order.priority.toUpperCase()}
                    {order.priority === 'stat' && ' 🚨'}
                    {order.priority === 'urgent' && ' ⚡'}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Patient</p>
                    <p className="font-medium text-gray-900">
                      {order.patient.firstName} {order.patient.lastName}
                    </p>
                  </div>
                  
                  {order.doctor && (
                    <div>
                      <p className="text-sm text-gray-600">Referring Doctor</p>
                      <p className="font-medium text-gray-900">
                        Dr. {order.doctor.firstName} {order.doctor.lastName}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">Tests Ordered</p>
                  <div className="flex flex-wrap gap-4 w-full">
                    {order.tests?.map((test) => (
                      <div key={test._id} className="bg-gray-50 rounded-lg p-4 h-24 flex-1 min-w-0 flex flex-col justify-between" style={{ minWidth: 'calc(33.333% - 1rem)' }}>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 text-sm leading-tight mb-1 overflow-hidden">{test.name || test.testName || 'Unknown Test'}</p>
                          <p className="text-xs text-gray-600 font-mono truncate">{test.code || test.testCode || 'N/A'}</p>
                        </div>
                        {test.sampleType && (
                          <p className="text-xs text-gray-500 mt-1 truncate">Sample: {test.sampleType}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Ordered:</span>{' '}
                    {new Date(order.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div className="ml-4 flex flex-col space-y-2">
                {(order.orderStatus === 'pending' || order.orderStatus === 'confirmed') && (
                  <button
                    onClick={() => startProcessing(order._id)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                  >
                    Start Processing
                  </button>
                )}
                {order.orderStatus === 'in_progress' && (
                  <span className="px-4 py-2 bg-purple-100 text-purple-800 rounded-lg text-sm font-medium text-center">
                    Processing...
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {sortedOrders.length === 0 && (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No tests in queue</h3>
          <p className="mt-1 text-sm text-gray-500">
            {filter === 'all' 
              ? 'All tests are completed or no new orders available.'
              : `No ${filter.replace('_', ' ')} tests available.`
            }
          </p>
        </div>
      )}
    </div>
  );
}