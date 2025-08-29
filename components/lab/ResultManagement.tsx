'use client';

import { useState, useEffect } from 'react';

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
    testCode: string;
    testName: string;
    normalRange: string;
    sampleType: string;
  }[];
  orderStatus: string;
  priority: string;
}

interface TestResult {
  _id: string;
  testOrder: TestOrder;
  test: {
    _id: string;
    testCode: string;
    testName: string;
    normalRange: string;
  };
  patient: {
    firstName: string;
    lastName: string;
    patientId: string;
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
  isVerified: boolean;
  reportedDate: string;
}

export default function ResultManagement() {
  const [activeTab, setActiveTab] = useState<'orders' | 'results'>('orders');
  const [orders, setOrders] = useState<TestOrder[]>([]);
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<TestOrder | null>(null);
  const [selectedTest, setSelectedTest] = useState<TestOrder['tests'][0] | null>(null);

  // Result form state
  const [resultForm, setResultForm] = useState({
    resultData: [{ parameter: '', value: '', unit: '', normalRange: '', flag: 'normal' as 'normal' | 'abnormal' | 'critical' }],
    overallStatus: 'normal' as 'normal' | 'abnormal' | 'critical',
    comments: ''
  });

  useEffect(() => {
    if (activeTab === 'orders') {
      fetchPendingOrders();
    } else {
      fetchResults();
    }
  }, [activeTab]);

  const fetchPendingOrders = async () => {
    try {
      const response = await fetch('/api/orders?orderStatus=confirmed');
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const fetchResults = async () => {
    try {
      const response = await fetch('/api/results');
      if (response.ok) {
        const data = await response.json();
        setResults(data.results || []);
      }
    } catch (error) {
      console.error('Error fetching results:', error);
    }
  };

  const startProcessing = async (orderId: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderStatus: 'in_progress' })
      });

      if (response.ok) {
        fetchPendingOrders();
        alert('Order moved to processing');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const handleSubmitResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !selectedTest) return;

    setLoading(true);

    try {
      const response = await fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testOrder: selectedOrder._id,
          test: selectedTest._id,
          patient: selectedOrder.patient._id,
          resultData: resultForm.resultData.filter(item => item.parameter && item.value),
          overallStatus: resultForm.overallStatus,
          comments: resultForm.comments
        })
      });

      if (response.ok) {
        setShowResultModal(false);
        resetResultForm();
        setSelectedOrder(null);
        setSelectedTest(null);
        fetchPendingOrders();
        fetchResults();
        alert('Test result added successfully');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to submit result');
      }
    } catch (error) {
      console.error('Error submitting result:', error);
      alert('Error submitting result');
    } finally {
      setLoading(false);
    }
  };

  const resetResultForm = () => {
    setResultForm({
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
    setResultForm({
      ...resultForm,
      resultData: resultForm.resultData.filter((_, i) => i !== index)
    });
  };

  const updateResultParameter = (index: number, field: string, value: string) => {
    const updated = [...resultForm.resultData];
    updated[index] = { ...updated[index], [field]: value };
    setResultForm({ ...resultForm, resultData: updated });
  };

  const getStatusColor = (status: string) => {
    const colors = {
      confirmed: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      normal: 'bg-green-100 text-green-800',
      abnormal: 'bg-yellow-100 text-yellow-800',
      critical: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      stat: 'bg-red-100 text-red-800',
      urgent: 'bg-orange-100 text-orange-800',
      normal: 'bg-gray-100 text-gray-800'
    };
    return colors[priority as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Lab Operations</h2>
        <p className="text-gray-600">Manage test processing and results</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6">
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 rounded-lg font-medium ${
            activeTab === 'orders'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Pending Orders ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab('results')}
          className={`px-4 py-2 rounded-lg font-medium ${
            activeTab === 'results'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Test Results
        </button>
      </div>

      {/* Pending Orders Tab */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Patient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tests
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr key={order._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {order.orderNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {order.patient.firstName} {order.patient.lastName}
                        </div>
                        <div className="text-sm text-gray-500">{order.patient.patientId}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {order.tests.map((test) => (
                          <div key={test._id} className="mb-1">
                            {test.testName} ({test.testCode})
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.orderStatus)}`}>
                        {order.orderStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(order.priority)}`}>
                        {order.priority.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        {order.orderStatus === 'confirmed' && (
                          <button
                            onClick={() => startProcessing(order._id)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Start Processing
                          </button>
                        )}
                        {order.orderStatus === 'in_progress' && (
                          <div className="space-x-2">
                            {order.tests.map((test) => (
                              <button
                                key={test._id}
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setSelectedTest(test);
                                  resetResultForm();
                                  setShowResultModal(true);
                                }}
                                className="text-green-600 hover:text-green-900 text-xs"
                              >
                                Add Result - {test.testCode}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {orders.length === 0 && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No pending orders</h3>
              <p className="mt-1 text-sm text-gray-500">
                All orders are either completed or not yet confirmed.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Results Tab */}
      {activeTab === 'results' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Patient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Test
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reported Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Verified
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {results.map((result) => (
                  <tr key={result._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {result.patient.firstName} {result.patient.lastName}
                        </div>
                        <div className="text-sm text-gray-500">{result.patient.patientId}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{result.test.testName}</div>
                      <div className="text-sm text-gray-500">{result.test.testCode}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(result.overallStatus)}`}>
                        {result.overallStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(result.reportedDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        result.isVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {result.isVerified ? 'Verified' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Result Modal */}
      {showResultModal && selectedOrder && selectedTest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-screen overflow-y-auto">
            <form onSubmit={handleSubmitResult} className="p-6">
              <h3 className="text-lg font-semibold mb-4">Add Test Result</h3>
              
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Patient:</span> {selectedOrder.patient.firstName} {selectedOrder.patient.lastName}
                  </div>
                  <div>
                    <span className="font-medium">Patient ID:</span> {selectedOrder.patient.patientId}
                  </div>
                  <div>
                    <span className="font-medium">Test:</span> {selectedTest.testName}
                  </div>
                  <div>
                    <span className="font-medium">Test Code:</span> {selectedTest.testCode}
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium">Normal Range:</span> {selectedTest.normalRange || 'Not specified'}
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Test Parameters
                  </label>
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
                      <div>
                        <input
                          type="text"
                          placeholder="Parameter"
                          value={param.parameter}
                          onChange={(e) => updateResultParameter(index, 'parameter', e.target.value)}
                          className="w-full border rounded px-2 py-1 text-sm"
                          required
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Value"
                          value={param.value}
                          onChange={(e) => updateResultParameter(index, 'value', e.target.value)}
                          className="w-full border rounded px-2 py-1 text-sm"
                          required
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Unit"
                          value={param.unit}
                          onChange={(e) => updateResultParameter(index, 'unit', e.target.value)}
                          className="w-full border rounded px-2 py-1 text-sm"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Normal Range"
                          value={param.normalRange}
                          onChange={(e) => updateResultParameter(index, 'normalRange', e.target.value)}
                          className="w-full border rounded px-2 py-1 text-sm"
                        />
                      </div>
                      <div>
                        <select
                          value={param.flag}
                          onChange={(e) => updateResultParameter(index, 'flag', e.target.value)}
                          className="w-full border rounded px-2 py-1 text-sm"
                        >
                          <option value="normal">Normal</option>
                          <option value="high">High</option>
                          <option value="low">Low</option>
                          <option value="critical">Critical</option>
                        </select>
                      </div>
                      <div>
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
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Overall Status
                  </label>
                  <select
                    value={resultForm.overallStatus}
                    onChange={(e) => setResultForm({ ...resultForm, overallStatus: e.target.value as 'normal' | 'abnormal' | 'critical' })}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="normal">Normal</option>
                    <option value="abnormal">Abnormal</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Comments
                </label>
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
                  onClick={() => {
                    setShowResultModal(false);
                    setSelectedOrder(null);
                    setSelectedTest(null);
                    resetResultForm();
                  }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Submitting...' : 'Submit Result'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}