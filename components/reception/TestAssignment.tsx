'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Modal, { ModalBody, ModalFooter } from '@/components/ui/Modal';
import { FormField, Label, Input, Select, Button, Alert, Textarea } from '@/components/ui/FormComponents';
import PaymentModal from './PaymentModal';

interface LabTest {
  _id: string;
  code: string;
  name: string;
  price: number;
}

interface Patient {
  _id: string;
  patientId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
}

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: string;
}

interface TestOrder {
  _id: string;
  orderNumber: string;
  patient: Patient;
  tests: LabTest[];
  totalAmount: number;
  paidAmount: number;
  paymentStatus: 'pending' | 'partial' | 'paid';
  orderStatus: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'normal' | 'urgent' | 'stat';
  sampleCollectionDate?: string;
  expectedReportDate?: string;
  notes?: string;
  createdAt: string;
}

export default function TestAssignment() {

  const [tests, setTests] = useState<LabTest[]>([]);
  const [patients, setPatients] = useState<User[]>([]);
  const [orders, setOrders] = useState<TestOrder[]>([]);
  const [loading] = useState(false);
  const [testsLoading, setTestsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [selectedTestObjects, setSelectedTestObjects] = useState<LabTest[]>([]);
  const [formLoading, setFormLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [currentOrder, setCurrentOrder] = useState<TestOrder | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Test pagination states
  const [currentTestPage, setCurrentTestPage] = useState(1);
  const [totalTestPages, setTotalTestPages] = useState(1);
  const testsPerTestPage = 20;
  
  // Patient search states
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [filteredPatients, setFilteredPatients] = useState<User[]>([]);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [orderForm, setOrderForm] = useState({
    patientId: '',
    priority: 'normal' as 'normal' | 'urgent' | 'stat',
    notes: '',
  });

  useEffect(() => {
    // Only fetch patients and orders on load, not tests
    fetchPatients();
    fetchOrders();
  }, []);
  
  // Close patient dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showPatientDropdown) {
        const target = event.target as Element;
        // Don't close if clicking on patient dropdown items or their children
        if (!target.closest('.patient-search-container') && !target.closest('.patient-dropdown-item')) {
          setShowPatientDropdown(false);
        }
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPatientDropdown]);

  // Filter patients based on search term
  useEffect(() => {
    if (patientSearchTerm.trim()) {
      const filtered = patients.filter(patient => 
        `${patient.firstName} ${patient.lastName}`.toLowerCase().includes(patientSearchTerm.toLowerCase()) ||
        patient.email.toLowerCase().includes(patientSearchTerm.toLowerCase())
      );
      setFilteredPatients(filtered);
    } else {
      setFilteredPatients(patients);
    }
  }, [patientSearchTerm, patients]);

  // Debounced search effect for tests
  useEffect(() => {
    if (searchTerm.length >= 1) {
      const timeoutId = setTimeout(() => {
        fetchTests(searchTerm, 1);
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      // Clear tests if search is too short
      setTests([]);
      setHasSearched(false);
      setCurrentTestPage(1);
      setTotalTestPages(1);
    }
  }, [searchTerm]);

  const fetchTests = async (search: string, page: number = 1) => {
    if (!search || search.length < 1) {
      setTests([]);
      setHasSearched(false);
      return;
    }

    try {
      setTestsLoading(true);
      const searchParams = new URLSearchParams({
        search,
        page: page.toString(),
        limit: testsPerTestPage.toString()
      });
      
      const response = await fetch(`/api/tests?${searchParams}`);
      if (response.ok) {
        const data = await response.json();
        setTests(data.tests || []);
        setTotalTestPages(data.pagination?.pages || 1);
        setCurrentTestPage(page);
        setHasSearched(true);
      } else {
        console.error('Failed to fetch tests:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching tests:', error);
    } finally {
      setTestsLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const response = await fetch('/api/reception/patients');
      if (response.ok) {
        const data = await response.json();
        setPatients(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };


  const fetchOrders = async () => {
    try {
      // Add cache busting parameter
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/orders?_t=${timestamp}`, {
        cache: 'no-store'
      });
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
        console.log('Orders refreshed successfully with', data.orders?.length || 0, 'orders'); // Debug log
      } else {
        console.error('Failed to fetch orders:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!orderForm.patientId) {
      errors.patientId = 'Please select a patient';
    }
    
    if (selectedTests.length === 0) {
      errors.tests = 'Please select at least one test';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setFormLoading(true);
    setError('');
    setSuccess('');
    
    try {
      // Set default expected report date (3 days from today)
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() + 3);
      
      const orderData = {
        patient: orderForm.patientId,
        tests: selectedTests,
        packages: [], // Empty array for packages
        priority: orderForm.priority,
        expectedReportDate: expectedDate.toISOString(),
        notes: orderForm.notes
      };
      
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      
      if (response.ok) {
        const result = await response.json();
        setSuccess(`Test order created successfully! Order #${result.order.orderNumber}`);
        setShowOrderModal(false);
        resetOrderForm();
        fetchOrders();
        
        setTimeout(() => setSuccess(''), 5000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create order');
      }
    } catch (error) {
      console.error('Error creating order:', error);
      setError('Error creating test order');
    } finally {
      setFormLoading(false);
    }
  };

  const resetOrderForm = () => {
    setSelectedTests([]);
    setSelectedTestObjects([]);
    setPatientSearchTerm('');
    setShowPatientDropdown(false);
    setOrderForm({
      patientId: '',
      priority: 'normal',
      notes: '',
    });
    setFormErrors({});
    setError('');
  };

  const closeOrderModal = () => {
    setShowOrderModal(false);
    resetOrderForm();
  };

  const handleProcessPayment = (order: TestOrder) => {
    console.log('Processing payment for order:', {
      id: order?._id,
      orderNumber: order?.orderNumber,
      totalAmount: order?.totalAmount,
      paidAmount: order?.paidAmount,
      patient: order?.patient,
      tests: order?.tests?.length
    });
    setCurrentOrder(order);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = async () => {
    console.log('Payment success callback triggered');
    setShowPaymentModal(false);
    setCurrentOrder(null);
    
    // Immediately refresh orders - no need for timeout
    console.log('Refreshing orders after payment success...');
    await fetchOrders(); // Refresh orders to show updated payment status
    
    setSuccess('Payment processed successfully!');
    setTimeout(() => setSuccess(''), 5000);
  };

  const handleTestPageChange = (page: number) => {
    fetchTests(searchTerm, page);
  };

  const handleShowOrderReceipt = (order: TestOrder) => {
    // Navigate to the receipt page with proper order ID
    console.log('Opening receipt for order ID:', order._id);
    // Open in new tab
    window.open(`/reception/receipt?orderId=${order._id}`, '_blank');
  };



  const handleDeleteOrder = async (order: TestOrder) => {
    const confirmDelete = confirm(
      `Are you sure you want to delete order #${order.orderNumber}? This action cannot be undone.`
    );
    
    if (!confirmDelete) return;
    
    try {
      const response = await fetch(`/api/orders/${order._id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setSuccess(`Order #${order.orderNumber} deleted successfully!`);
        fetchOrders(); // Refresh the orders list
        setTimeout(() => setSuccess(''), 5000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete order');
        setTimeout(() => setError(''), 5000);
      }
    } catch (error) {
      console.error('Error deleting order:', error);
      setError('Error deleting order');
      setTimeout(() => setError(''), 5000);
    }
  };


  // Remove client-side filtering since we're doing server-side search
  // Tests are already filtered by the API call

  const totalAmount = selectedTestObjects.reduce((sum, test) => sum + test.price, 0);


  return (
    <div className="overflow-hidden">
      {/* Header */}
      <div className="bg-muted/30 px-6 py-6 border-b border-border">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-foreground mb-1">Test Assignment</h3>
            <p className="text-sm text-muted-foreground">Assign laboratory tests to patients</p>
          </div>
          <div className="flex space-x-3">
            <Button
              onClick={() => {
                setShowOrderModal(true);
                setSelectedTests([]);
                setSelectedTestObjects([]);
                setSearchTerm('');
                setTests([]);
                setHasSearched(false);
              }}
              variant="success"
              className="shadow-lg hover:shadow-xl"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Test Order
            </Button>
            <Button
              onClick={() => { fetchOrders(); fetchPatients(); }}
              variant="ghost"
              className="border border-input bg-background hover:bg-accent shadow-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </Button>
          </div>
        </div>
        
        {error && (
          <div className="mt-4">
            <Alert variant="error">{error}</Alert>
          </div>
        )}

        {success && (
          <div className="mt-4">
            <Alert variant="success">{success}</Alert>
          </div>
        )}
      </div>

      {/* Recent Orders */}
      <div className="px-6 py-6 bg-white/50 border-b border-gray-200">
        <h4 className="text-lg font-semibold text-foreground mb-4">Recent Test Orders</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Order Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Patient
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Tests
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {orders.slice(0, 10).map((order) => (
                <tr key={order._id} className="hover:bg-blue-50/50 transition-colors duration-200">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-semibold text-foreground">#{order.orderNumber}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-foreground">
                      {order.patient 
                        ? `${order.patient.firstName} ${order.patient.lastName}`
                        : 'Unknown Patient'
                      }
                    </div>
                    <div className="text-sm text-muted-foreground">{order.patient?.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-foreground">
                      {order.tests?.length || 0} test(s)
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {order.tests?.slice(0, 2).map(test => test.name).join(', ')}
                      {(order.tests?.length || 0) > 2 && ` +${(order.tests?.length || 0) - 2} more`}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-foreground">Rs. {order.totalAmount.toLocaleString()}</div>
                    {order.paidAmount > 0 && (
                      <div className="text-xs text-green-600">Paid: Rs. {order.paidAmount.toLocaleString()}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        order.orderStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        order.orderStatus === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                        order.orderStatus === 'in_progress' ? 'bg-purple-100 text-purple-800' :
                        order.orderStatus === 'completed' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {order.orderStatus.charAt(0).toUpperCase() + order.orderStatus.slice(1)}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        order.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                        order.paymentStatus === 'partial' ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {order.paymentStatus === 'paid' ? 'Paid' : 
                         order.paymentStatus === 'partial' ? 'Partial' : 'Unpaid'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-2">
                      {/* Payment Status */}
                      <div className="flex justify-center">
                        {order.paymentStatus !== 'paid' && (
                          <button
                            onClick={() => handleProcessPayment(order)}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200 shadow-sm"
                          >
                            <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                            </svg>
                            Process Payment
                          </button>
                        )}
                        {order.paymentStatus === 'paid' && (
                          <span className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-green-700 bg-green-100 rounded-lg shadow-sm">
                            <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Paid
                          </span>
                        )}
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex gap-2 justify-center flex-wrap">
                        <button
                          onClick={() => handleShowOrderReceipt(order)}
                          className="inline-flex items-center px-2.5 py-1 border border-blue-300 text-xs font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          Receipt
                        </button>
                        <button
                          onClick={() => handleDeleteOrder(order)}
                          className="inline-flex items-center px-2.5 py-1 border border-red-300 text-xs font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {orders.length === 0 && (
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-foreground">No orders yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first test order to get started.
            </p>
          </div>
        )}
      </div>

      {/* Create Order Modal */}
      {showOrderModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white">Create Test Order</h3>
                <button
                  onClick={() => {
                    setShowOrderModal(false);
                    resetOrderForm();
                    setError('');
                  }}
                  className="text-white hover:text-gray-200 transition-colors duration-200 hover:bg-white/10 rounded-full p-2"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <form onSubmit={handleCreateOrder} className="p-6 overflow-y-auto max-h-[calc(95vh-120px)]">
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error}
                  </div>
                </div>
              )}

              <div className="space-y-8">
                {/* Order Information Section */}
                <div className="bg-gray-50 rounded-xl p-6 space-y-6">
                  <div>
                    <h4 className="text-lg font-semibold text-foreground mb-4">Order Information</h4>
                    
                    {/* Patient Selection */}
                    <div className="mb-4 relative patient-search-container">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Patient *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search patients by name or email..."
                          value={patientSearchTerm}
                          onChange={(e) => {
                            setPatientSearchTerm(e.target.value);
                            setShowPatientDropdown(true);
                          }}
                          onFocus={() => setShowPatientDropdown(true)}
                          className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors duration-200"
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                      </div>
                      
                      {/* Dropdown */}
                      {showPatientDropdown && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                          {filteredPatients.length > 0 ? (
                            filteredPatients.map((patient) => (
                              <button
                                key={patient._id}
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log('Patient selected via mousedown:', patient._id, patient.firstName, patient.lastName);
                                  setOrderForm({ ...orderForm, patientId: patient._id });
                                  setPatientSearchTerm(`${patient.firstName} ${patient.lastName} - ${patient.email}`);
                                  setShowPatientDropdown(false);
                                  // Clear patient ID error if it exists
                                  if (formErrors.patientId) {
                                    setFormErrors({ ...formErrors, patientId: '' });
                                  }
                                }}
                                className="patient-dropdown-item w-full text-left px-4 py-3 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0 cursor-pointer"
                              >
                                <div className="flex justify-between items-center">
                                  <div>
                                    <div className="font-medium text-gray-900">{patient.firstName} {patient.lastName}</div>
                                    <div className="text-sm text-gray-500">{patient.email}</div>
                                  </div>
                                  {patient.phone && (
                                    <div className="text-sm text-gray-400">{patient.phone}</div>
                                  )}
                                </div>
                              </button>
                            ))
                          ) : (
                            <div className="px-4 py-3 text-gray-500 text-center">
                              No patients found
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Hidden input to store actual patient ID for form validation */}
                      <input
                        type="hidden"
                        value={orderForm.patientId}
                        required
                      />
                    </div>

                    {/* Priority */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Priority
                      </label>
                      <select
                        value={orderForm.priority}
                        onChange={(e) => setOrderForm({ ...orderForm, priority: e.target.value as 'normal' | 'urgent' | 'stat' })}
                        className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors duration-200"
                      >
                        <option value="normal">Normal</option>
                        <option value="urgent">Urgent</option>
                        <option value="stat">STAT (Emergency)</option>
                      </select>
                    </div>


                    {/* Notes */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Notes
                      </label>
                      <textarea
                        value={orderForm.notes}
                        onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
                        className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors duration-200 resize-none"
                        placeholder="Any special instructions or notes..."
                        rows={3}
                      />
                    </div>
                  </div>

                </div>
                
                {/* Test Selection Section - Full Width */}
                <div>
                  <h4 className="text-lg font-semibold text-foreground mb-4">Select Tests</h4>
                  
                  {/* Search and Filter */}
                  <div className="mb-4 space-y-3">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        placeholder="Search tests..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                    
                  </div>

                  {/* Test List */}
                  <div className="border border-gray-300 rounded-xl max-h-96 overflow-y-auto">
                    {/* Show search prompt when no search has been made */}
                    {!hasSearched && searchTerm.length < 1 && (
                      <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                        <svg className="h-16 w-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Search for Tests</h3>
                        <p className="text-sm text-gray-500 mb-1">Start typing to search through available tests</p>
                        <p className="text-xs text-gray-400">Search by test name or code</p>
                      </div>
                    )}

                    {/* Show loading state */}
                    {testsLoading && (
                      <div className="flex items-center justify-center py-8">
                        <svg className="animate-spin h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="ml-2 text-gray-600">Searching tests...</span>
                      </div>
                    )}

                    {/* Show test results */}
                    {!testsLoading && hasSearched && tests.map((test) => (
                      <div
                        key={test._id}
                        className={`p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors duration-200 ${
                          selectedTests.includes(test._id) ? 'bg-green-50' : ''
                        }`}
                      >
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedTests.includes(test._id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                if (!selectedTests.includes(test._id)) {
                                  setSelectedTests([...selectedTests, test._id]);
                                  setSelectedTestObjects([...selectedTestObjects, test]);
                                }
                              } else {
                                setSelectedTests(selectedTests.filter(id => id !== test._id));
                                setSelectedTestObjects(selectedTestObjects.filter(obj => obj._id !== test._id));
                              }
                            }}
                            className="mr-3 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                          />
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-medium text-foreground">{test.name}</div>
                                <div className="text-sm text-muted-foreground">{test.code}</div>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold text-foreground">Rs. {test.price.toLocaleString()}</div>
                              </div>
                            </div>
                          </div>
                        </label>
                      </div>
                    ))}
                    {/* Show no results message */}
                    {!testsLoading && hasSearched && tests.length === 0 && (
                      <div className="text-center py-8 px-6">
                        <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 7.172V5L8 4z" />
                        </svg>
                        <h3 className="font-medium text-gray-900 mb-1">No tests found</h3>
                        <p className="text-sm text-gray-500">Try searching with different keywords</p>
                      </div>
                    )}
                  </div>

                  
                  {/* Test Pagination */}
                  {totalTestPages > 1 && hasSearched && (
                    <div className="mt-3 flex items-center justify-between border-t border-gray-200 pt-3">
                      <button
                        onClick={() => handleTestPageChange(Math.max(1, currentTestPage - 1))}
                        disabled={currentTestPage === 1}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <div className="flex items-center space-x-2">
                        {Array.from({ length: Math.min(5, totalTestPages) }, (_, i) => {
                          let pageNum;
                          if (totalTestPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentTestPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentTestPage >= totalTestPages - 2) {
                            pageNum = totalTestPages - 4 + i;
                          } else {
                            pageNum = currentTestPage - 2 + i;
                          }
                          
                          return (
                            <button
                              key={pageNum}
                              onClick={() => handleTestPageChange(pageNum)}
                              className={`px-2.5 py-1 text-sm rounded ${
                                currentTestPage === pageNum
                                  ? 'bg-green-500 text-white'
                                  : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        onClick={() => handleTestPageChange(Math.min(totalTestPages, currentTestPage + 1))}
                        disabled={currentTestPage === totalTestPages}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Selected Tests Summary */}
                {selectedTests.length > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <h5 className="font-semibold text-green-800 mb-3">Selected Tests ({selectedTests.length})</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                      {selectedTestObjects.map((test) => (
                        <div key={test._id} className="bg-white rounded-lg p-3 shadow-sm border border-green-200">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="font-medium text-green-800 text-sm">{test.name}</div>
                              <div className="text-xs text-green-600 font-mono">{test.code}</div>
                            </div>
                            <div className="text-right ml-2">
                              <div className="font-semibold text-green-800 text-sm">Rs. {test.price.toLocaleString()}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="pt-3 border-t border-green-300">
                      <div className="flex justify-between items-center font-bold text-green-800 text-lg">
                        <span>Total Amount:</span>
                        <span>Rs. {totalAmount.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="mt-8 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowOrderModal(false);
                    resetOrderForm();
                    setError('');
                  }}
                  className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-medium transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || selectedTests.length === 0}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating Order...
                    </div>
                  ) : (
                    `Create Order (Rs. ${totalAmount.toLocaleString()})`
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200">
        <div className="flex justify-between items-center text-sm">
          <div className="flex items-center space-x-4">
            <span className="text-muted-foreground">
              <span className="font-semibold text-foreground">{orders.length}</span> total orders
            </span>
            <span className="text-muted-foreground">
              <span className="font-semibold text-foreground">{patients.length}</span> patients
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Create Test Order Modal */}
      <Modal
        isOpen={showOrderModal}
        onClose={closeOrderModal}
        title="Create Test Order"
        size="full"
      >
        <form onSubmit={handleCreateOrder}>
          {error && (
            <div className="mb-6">
              <Alert variant="error">{error}</Alert>
            </div>
          )}

          <ModalBody>
            <div className="space-y-8">
              {/* Order Information Section */}
              <div className="bg-accent/30 rounded-[var(--radius-lg)] p-6 space-y-6">
                <div>
                  <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Order Information
                  </h4>
                  
                  <div className="grid gap-4">
                    <div className="patient-search-container">
                      <FormField error={formErrors.patientId}>
                      <Label htmlFor="patientId" required>Select Patient</Label>
                      <div className="relative">
                        <Input
                          id="patientId"
                          type="text"
                          placeholder="Search patients by name or email..."
                          value={patientSearchTerm}
                          onChange={(e) => {
                            setPatientSearchTerm(e.target.value);
                            setShowPatientDropdown(true);
                          }}
                          onFocus={() => setShowPatientDropdown(true)}
                          error={!!formErrors.patientId}
                          className="pr-10"
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                        
                        {/* Dropdown */}
                        {showPatientDropdown && (
                          <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-[var(--radius-md)] shadow-lg max-h-60 overflow-y-auto">
                            {filteredPatients.length > 0 ? (
                              filteredPatients.map((patient) => (
                                <button
                                  key={patient._id}
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    console.log('Patient selected via mousedown:', patient._id, patient.firstName, patient.lastName);
                                    setOrderForm({ ...orderForm, patientId: patient._id });
                                    setPatientSearchTerm(`${patient.firstName} ${patient.lastName} - ${patient.email}`);
                                    setShowPatientDropdown(false);
                                    // Clear patient ID error if it exists
                                    if (formErrors.patientId) {
                                      setFormErrors({ ...formErrors, patientId: '' });
                                    }
                                  }}
                                  className="w-full text-left px-4 py-3 hover:bg-accent focus:bg-accent focus:outline-none border-b border-border last:border-b-0 cursor-pointer"
                                >
                                  <div className="flex justify-between items-center">
                                    <div>
                                      <div className="font-medium text-foreground">{patient.firstName} {patient.lastName}</div>
                                      <div className="text-sm text-muted-foreground">{patient.email}</div>
                                    </div>
                                    {patient.phone && (
                                      <div className="text-sm text-muted-foreground">{patient.phone}</div>
                                    )}
                                  </div>
                                </button>
                              ))
                            ) : (
                              <div className="px-4 py-3 text-muted-foreground text-center">
                                No patients found
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Hidden input for validation */}
                      <input
                        type="hidden"
                        value={orderForm.patientId}
                        required
                      />
                    </FormField>
                    </div>

                    <FormField>
                      <Label htmlFor="priority">Priority</Label>
                      <Select
                        id="priority"
                        value={orderForm.priority}
                        onChange={(e) => setOrderForm({ ...orderForm, priority: e.target.value as 'normal' | 'urgent' | 'stat' })}
                      >
                        <option value="normal">Normal</option>
                        <option value="urgent">Urgent</option>
                        <option value="stat">STAT (Emergency)</option>
                      </Select>
                    </FormField>


                    <FormField>
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        value={orderForm.notes}
                        onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
                        placeholder="Any special instructions or notes..."
                        rows={3}
                      />
                    </FormField>
                  </div>
                </div>

                {formErrors.tests && (
                  <Alert variant="error">{formErrors.tests}</Alert>
                )}
              </div>
              
              {/* Test Selection Section - Full Width */}
              <div>
                <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 7.172V5L8 4z" />
                  </svg>
                  Select Tests
                </h4>
                
                {/* Search and Filter */}
                <div className="mb-4 space-y-3">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <Input
                      type="text"
                      placeholder="Search tests by name or code..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 py-3"
                    />
                    {testsLoading && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <svg className="animate-spin h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                    )}
                  </div>
                </div>

                {/* Test List */}
                <div className="border border-border rounded-[var(--radius-lg)] max-h-96 overflow-y-auto">
                  {/* Show search prompt when no search has been made */}
                  {!hasSearched && searchTerm.length < 1 && (
                    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                      <svg className="h-16 w-16 text-muted-foreground/30 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <h3 className="text-lg font-medium text-foreground mb-2">Search for Tests</h3>
                      <p className="text-sm text-muted-foreground mb-1">Start typing to search through available tests</p>
                      <p className="text-xs text-muted-foreground/70">Search by test name or code</p>
                    </div>
                  )}

                  {/* Show loading state */}
                  {testsLoading && (
                    <div className="flex items-center justify-center py-8">
                      <svg className="animate-spin h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 818-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="ml-2 text-muted-foreground">Searching tests...</span>
                    </div>
                  )}

                  {/* Show test results */}
                  {!testsLoading && hasSearched && tests.map((test) => (
                    <div
                      key={test._id}
                      className={`p-4 border-b border-border hover:bg-accent/50 transition-colors duration-200 ${
                        selectedTests.includes(test._id) ? 'bg-green-50 border-green-200' : ''
                      }`}
                    >
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedTests.includes(test._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              if (!selectedTests.includes(test._id)) {
                                setSelectedTests([...selectedTests, test._id]);
                                setSelectedTestObjects([...selectedTestObjects, test]);
                              }
                            } else {
                              setSelectedTests(selectedTests.filter(id => id !== test._id));
                              setSelectedTestObjects(selectedTestObjects.filter(obj => obj._id !== test._id));
                            }
                            // Clear tests error when user selects a test
                            if (formErrors.tests) {
                              setFormErrors({ ...formErrors, tests: '' });
                            }
                          }}
                          className="mr-3 h-4 w-4 text-green-600 focus:ring-green-500 border-input rounded"
                        />
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="font-medium text-foreground">{test.name}</div>
                              <div className="text-sm text-muted-foreground font-mono">{test.code}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-foreground">Rs. {test.price.toLocaleString()}</div>
                            </div>
                          </div>
                        </div>
                      </label>
                    </div>
                  ))}

                  {/* Show no results message */}
                  {!testsLoading && hasSearched && tests.length === 0 && (
                    <div className="text-center py-8 px-6">
                      <svg className="mx-auto h-12 w-12 text-muted-foreground mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 7.172V5L8 4z" />
                      </svg>
                      <h3 className="font-medium text-foreground mb-1">No tests found</h3>
                      <p className="text-sm text-muted-foreground">Try searching with different keywords</p>
                    </div>
                  )}
                </div>

                
                {/* Test Pagination */}
                {totalTestPages > 1 && hasSearched && (
                  <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTestPageChange(Math.max(1, currentTestPage - 1))}
                      disabled={currentTestPage === 1}
                    >
                      Previous
                    </Button>
                    <div className="flex items-center space-x-2">
                      {Array.from({ length: Math.min(5, totalTestPages) }, (_, i) => {
                        let pageNum;
                        if (totalTestPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentTestPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentTestPage >= totalTestPages - 2) {
                          pageNum = totalTestPages - 4 + i;
                        } else {
                          pageNum = currentTestPage - 2 + i;
                        }
                        
                        return (
                          <Button
                            key={pageNum}
                            type="button"
                            variant={currentTestPage === pageNum ? "success" : "ghost"}
                            size="sm"
                            onClick={() => handleTestPageChange(pageNum)}
                            className="min-w-[32px] px-2"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTestPageChange(Math.min(totalTestPages, currentTestPage + 1))}
                      disabled={currentTestPage === totalTestPages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
              
              {/* Selected Tests Summary */}
              {selectedTests.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-[var(--radius-lg)] p-4">
                  <h5 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Selected Tests ({selectedTests.length})
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                    {selectedTestObjects.map((test) => (
                      <div key={test._id} className="bg-white rounded-[var(--radius-md)] p-3 shadow-sm border border-green-200">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-medium text-green-800 text-sm">{test.name}</div>
                            <div className="text-xs text-green-600 font-mono">{test.code}</div>
                          </div>
                          <div className="text-right ml-2">
                            <div className="font-semibold text-green-800 text-sm">Rs. {test.price.toLocaleString()}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="pt-3 border-t border-green-300">
                    <div className="flex justify-between items-center font-bold text-green-800 text-lg">
                      <span>Total Amount:</span>
                      <span>Rs. {totalAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ModalBody>

          <ModalFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={closeOrderModal}
              disabled={formLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="success"
              loading={formLoading}
              disabled={formLoading || selectedTests.length === 0}
            >
              {selectedTests.length > 0 
                ? `Create Order (Rs. ${totalAmount.toLocaleString()})`
                : 'Create Order'
              }
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Payment Modal */}
      {showPaymentModal && currentOrder && currentOrder._id && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setCurrentOrder(null);
          }}
          onPaymentSuccess={handlePaymentSuccess}
          orderDetails={{
            _id: currentOrder?._id || '',
            orderNumber: currentOrder?.orderNumber || '',
            totalAmount: currentOrder?.totalAmount || 0,
            paidAmount: currentOrder?.paidAmount || 0,
            patientName: currentOrder?.patient 
              ? `${currentOrder.patient.firstName} ${currentOrder.patient.lastName}`
              : 'Unknown Patient',
            tests: currentOrder?.tests?.map(test => ({
              testName: test?.name || 'Unknown Test',
              price: test?.price || 0
            })) || []
          }}
        />
      )}

    </div>
  );
}