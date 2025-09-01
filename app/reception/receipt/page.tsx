'use client';

import { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import OrderReceipt from '@/components/reception/OrderReceipt';

interface TestOrder {
  _id: string;
  orderNumber: string;
  patient: {
    firstName: string;
    lastName: string;
    phone?: string;
  };
  tests: Array<{
    name: string;
    code: string;
    price: number;
  }>;
  totalAmount: number;
  paidAmount: number;
  paymentStatus: 'pending' | 'partial' | 'paid';
  paymentMethod?: 'cash' | 'card';
  sampleCollectionDate?: string;
  expectedReportDate?: string;
  priority: 'normal' | 'urgent' | 'stat';
  createdAt: string;
}

function ReceiptPageContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const [order, setOrder] = useState<TestOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const fetchOrderDetails = useCallback(async () => {
    if (!orderId) {
      setError('Order ID is required');
      setLoading(false);
      return;
    }

    console.log('Fetching order details for ID:', orderId);

    try {
      setLoading(true);
      // Try the receipt endpoint first, fall back to orders endpoint
      let response = await fetch(`/api/receipt/${orderId}`);
      
      if (!response.ok) {
        console.log('Receipt API failed, trying orders API');
        response = await fetch(`/api/orders/${orderId}`);
      }
      
      console.log('API Response status:', response.status);
      console.log('API Response ok:', response.ok);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error:', errorData);
        throw new Error(errorData.error || `Failed to fetch order details (${response.status})`);
      }

      const data = await response.json();
      console.log('Order data received:', data.order ? 'exists' : 'null');
      setOrder(data.order);
    } catch (error) {
      console.error('Error fetching order:', error);
      setError(error instanceof Error ? error.message : 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrderDetails();
  }, [fetchOrderDetails]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading receipt...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Receipt Not Found</h2>
          <p className="text-gray-600 mb-4">{error || 'The requested receipt could not be found.'}</p>
        </div>
      </div>
    );
  }

  const orderData = {
    orderNumber: order.orderNumber,
    patientName: `${order.patient.firstName} ${order.patient.lastName}`,
    patientPhone: order.patient.phone,
    tests: order.tests,
    totalAmount: order.totalAmount,
    paidAmount: order.paidAmount,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    sampleCollectionDate: order.sampleCollectionDate,
    expectedReportDate: order.expectedReportDate,
    createdAt: order.createdAt,
    priority: order.priority,
  };

  return (
    <>
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .receipt-container, .receipt-container * {
            visibility: visible;
          }
          .receipt-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print-hide {
            display: none !important;
          }
        }
      `}</style>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with Print Button */}
        <div className="mb-6 flex justify-between items-center print-hide">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Order Receipt</h1>
            <p className="text-gray-600">Order #{order.orderNumber}</p>
          </div>
          <div>
            <button
              onClick={handlePrint}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Receipt
            </button>
          </div>
        </div>

        {/* Receipt Component */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden receipt-container">
          <OrderReceipt ref={receiptRef} orderData={orderData} />
        </div>
      </div>
    </div>
    </>
  );
}

export default function ReceiptPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading receipt...</p>
        </div>
      </div>
    }>
      <ReceiptPageContent />
    </Suspense>
  );
}