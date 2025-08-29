'use client';

import { useState } from 'react';
import { Button, Alert } from '@/components/ui/FormComponents';
import Modal, { ModalBody, ModalFooter } from '@/components/ui/Modal';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: () => void;
  orderDetails: {
    _id: string;
    orderNumber: string;
    totalAmount: number;
    paidAmount: number;
    patientName: string;
    tests: Array<{
      testName: string;
      price: number;
    }>;
  };
}

export default function PaymentModal({ isOpen, onClose, onPaymentSuccess, orderDetails }: PaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const remainingAmount = orderDetails.totalAmount - orderDetails.paidAmount;

  const handleProcessPayment = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/orders/${orderDetails._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentStatus: 'paid',
          paymentMethod: paymentMethod,
          paidAmount: orderDetails.totalAmount
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to process payment';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If response is not JSON, use status text or default message
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      onPaymentSuccess();
      onClose();
    } catch (error) {
      console.error('Payment error:', error);
      setError(error instanceof Error ? error.message : 'Failed to process payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Process Payment" size="md">
      <ModalBody>
        {error && (
          <div className="mb-4">
            <Alert variant="error">{error}</Alert>
          </div>
        )}

        {/* Order Summary */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h4 className="font-semibold text-gray-900 mb-3">Order Summary</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Order Number:</span>
              <span className="font-medium">#{orderDetails.orderNumber}</span>
            </div>
            <div className="flex justify-between">
              <span>Patient:</span>
              <span className="font-medium">{orderDetails.patientName}</span>
            </div>
            <div className="flex justify-between">
              <span>Tests:</span>
              <span className="font-medium">{orderDetails.tests.length} test(s)</span>
            </div>
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between text-base font-semibold">
                <span>Amount to Pay:</span>
                <span>Rs. {remainingAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Method */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Payment Method
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPaymentMethod('cash')}
              className={`p-4 border-2 rounded-lg text-center transition-all ${
                paymentMethod === 'cash'
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <div className="font-medium">Cash</div>
            </button>
            
            <button
              type="button"
              onClick={() => setPaymentMethod('card')}
              className={`p-4 border-2 rounded-lg text-center transition-all ${
                paymentMethod === 'card'
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <div className="font-medium">Card</div>
            </button>
          </div>
        </div>

        {/* Payment Confirmation */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-500 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h5 className="font-medium text-blue-800">Confirm Payment</h5>
              <p className="text-sm text-blue-700 mt-1">
                Please confirm that you have received Rs. {remainingAmount.toLocaleString()} via {paymentMethod} 
                before processing this payment.
              </p>
            </div>
          </div>
        </div>
      </ModalBody>

      <ModalFooter>
        <Button
          type="button"
          variant="ghost"
          onClick={onClose}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="success"
          onClick={handleProcessPayment}
          loading={loading}
          disabled={loading}
        >
          {loading ? 'Processing...' : `Process Payment (Rs. ${remainingAmount.toLocaleString()})`}
        </Button>
      </ModalFooter>
    </Modal>
  );
}