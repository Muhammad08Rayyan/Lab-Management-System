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
    email: string;
  };
  tests: {
    _id: string;
    code: string;
    name: string;
    normalRange?: string;
    sampleType?: string;
  }[];
  orderStatus: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'normal' | 'urgent' | 'stat';
  createdAt: string;
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
}

export default function ResultEntry() {
  const [inProgressOrders, setInProgressOrders] = useState<TestOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<TestOrder | null>(null);
  const [selectedTest, setSelectedTest] = useState<TestOrder['tests'][0] | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [resultForm, setResultForm] = useState<TestResult>({
    testOrder: '',
    test: '',
    patient: '',
    resultData: [{ parameter: '', value: '', unit: '', normalRange: '', flag: 'normal' }],
    overallStatus: 'normal',
    comments: ''
  });

  useEffect(() => {
    fetchInProgressOrders();
  }, []);

  const fetchInProgressOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/orders?orderStatus=in_progress&limit=50');
      if (response.ok) {
        const data = await response.json();
        setInProgressOrders(data.orders || []);
      } else {
        console.error('Failed to fetch in-progress orders');
      }
    } catch (error) {
      console.error('Error fetching in-progress orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectOrderAndTest = async (order: TestOrder, test: TestOrder['tests'][0]) => {
    setSelectedOrder(order);
    setSelectedTest(test);
    
    // Check if result already exists for this test and order
    try {
      const response = await fetch(`/api/results?testOrderId=${order._id}&test=${test._id}`);
      if (response.ok) {
        const data = await response.json();
        const existingResult = data.results?.[0];
        
        if (existingResult) {
          // Populate form with existing result data
          setResultForm({
            testOrder: order._id,
            test: test._id,
            patient: order.patient._id,
            resultData: existingResult.resultData.length > 0 ? existingResult.resultData : [{ 
              parameter: test.name || 'Test Result', 
              value: '', 
              unit: '', 
              normalRange: test.normalRange || '', 
              flag: 'normal' 
            }],
            overallStatus: existingResult.overallStatus || 'normal',
            comments: existingResult.comments || ''
          });
        } else {
          // No existing result, create new form
          setResultForm({
            testOrder: order._id,
            test: test._id,
            patient: order.patient._id,
            resultData: [{ 
              parameter: test.name || 'Test Result', 
              value: '', 
              unit: '', 
              normalRange: test.normalRange || '', 
              flag: 'normal' 
            }],
            overallStatus: 'normal',
            comments: ''
          });
        }
      }
    } catch (error) {
      console.error('Error checking for existing result:', error);
      // Fallback to new form
      setResultForm({
        testOrder: order._id,
        test: test._id,
        patient: order.patient._id,
        resultData: [{ 
          parameter: test.name || 'Test Result', 
          value: '', 
          unit: '', 
          normalRange: test.normalRange || '', 
          flag: 'normal' 
        }],
        overallStatus: 'normal',
        comments: ''
      });
    }
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
        alert('Test result submitted successfully');
        clearForm();
        fetchInProgressOrders();
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

  const clearForm = () => {
    setSelectedOrder(null);
    setSelectedTest(null);
    setResultForm({
      testOrder: '',
      test: '',
      patient: '',
      resultData: [{ parameter: '', value: '', unit: '', normalRange: '', flag: 'normal' }],
      overallStatus: 'normal',
      comments: ''
    });
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-gray-200 rounded-lg h-32"></div>
              ))}
            </div>
            <div className="bg-gray-200 rounded-lg h-96"></div>
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
            <h3 className="text-xl font-bold text-foreground mb-1">Result Entry</h3>
            <p className="text-sm text-muted-foreground">Enter structured test results for in-progress orders</p>
          </div>
          <button
            onClick={fetchInProgressOrders}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-medium shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <svg className="w-4 h-4 mr-1.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Orders List */}
          <div>
            <h4 className="text-lg font-semibold text-foreground mb-4">In-Progress Orders</h4>
            
            {inProgressOrders.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h3 className="text-sm font-medium text-gray-900 mb-1">No orders in progress</h3>
                <p className="text-sm text-gray-500">Start processing orders from the Work Queue first.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {inProgressOrders.map((order) => (
                  <div key={order._id} className="bg-white rounded-lg shadow border p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <h5 className="font-semibold text-gray-900">#{order.orderNumber}</h5>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(order.priority)}`}>
                            {order.priority.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {order.patient.firstName} {order.patient.lastName}
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">Tests to Complete:</p>
                      <div className="grid gap-2">
                        {order.tests.map((test) => (
                          <button
                            key={test._id}
                            onClick={() => selectOrderAndTest(order, test)}
                            className={`p-3 text-left rounded-lg border transition-all duration-200 ${
                              selectedOrder?._id === order._id && selectedTest?._id === test._id
                                ? 'bg-blue-50 border-blue-500 shadow-md'
                                : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                            }`}
                          >
                            <div className="text-sm font-medium text-gray-900">{test.name}</div>
                            <div className="text-xs text-gray-500">{test.code}</div>
                            {test.normalRange && (
                              <div className="text-xs text-gray-400 mt-1">Normal: {test.normalRange}</div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column - Result Entry Form */}
          <div>
            <h4 className="text-lg font-semibold text-foreground mb-4">Result Entry Form</h4>
            
            {!selectedOrder || !selectedTest ? (
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-sm font-medium text-gray-900 mb-1">Select a test to enter results</h3>
                <p className="text-sm text-gray-500">Choose an order and test from the left panel to begin entering results.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitResult} className="bg-white rounded-lg shadow border p-6">
                {/* Test Info Header */}
                <div className="bg-blue-50 rounded-lg p-4 mb-6">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="font-medium">Patient:</span> {selectedOrder.patient.firstName} {selectedOrder.patient.lastName}</div>
                    <div><span className="font-medium">Order:</span> #{selectedOrder.orderNumber}</div>
                    <div><span className="font-medium">Test:</span> {selectedTest.name}</div>
                    <div><span className="font-medium">Test Code:</span> {selectedTest.code}</div>
                  </div>
                </div>

                {/* Test Parameters */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-medium text-gray-700">Test Parameters</label>
                    <button
                      type="button"
                      onClick={addResultParameter}
                      className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                    >
                      + Add Parameter
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {resultForm.resultData.map((param, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 items-center bg-gray-50 p-3 rounded-lg">
                        <div className="col-span-3">
                          <input
                            type="text"
                            placeholder="Parameter"
                            value={param.parameter}
                            onChange={(e) => updateResultParameter(index, 'parameter', e.target.value)}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="text"
                            placeholder="Value"
                            value={param.value}
                            onChange={(e) => updateResultParameter(index, 'value', e.target.value)}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="text"
                            placeholder="Unit"
                            value={param.unit}
                            onChange={(e) => updateResultParameter(index, 'unit', e.target.value)}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="text"
                            placeholder="Normal Range"
                            value={param.normalRange}
                            onChange={(e) => updateResultParameter(index, 'normalRange', e.target.value)}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div className="col-span-2">
                          <select
                            value={param.flag}
                            onChange={(e) => updateResultParameter(index, 'flag', e.target.value)}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="normal">Normal</option>
                            <option value="high">High</option>
                            <option value="low">Low</option>
                            <option value="critical">Critical</option>
                          </select>
                        </div>
                        <div className="col-span-1">
                          {resultForm.resultData.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeResultParameter(index)}
                              className="text-red-600 hover:text-red-900 p-1"
                              title="Remove parameter"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Overall Status */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Overall Status</label>
                    <select
                      value={resultForm.overallStatus}
                      onChange={(e) => setResultForm({ ...resultForm, overallStatus: e.target.value as 'normal' | 'abnormal' | 'critical' })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="normal">Normal</option>
                      <option value="abnormal">Abnormal</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>

                {/* Comments */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Comments & Observations</label>
                  <textarea
                    value={resultForm.comments}
                    onChange={(e) => setResultForm({ ...resultForm, comments: e.target.value })}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Additional comments, observations, or technical notes..."
                  />
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={clearForm}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors duration-200"
                    disabled={submitting}
                  >
                    Clear Form
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !resultForm.resultData.some(param => param.parameter && param.value)}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <div className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Submitting...
                      </div>
                    ) : (
                      'Submit Result'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}