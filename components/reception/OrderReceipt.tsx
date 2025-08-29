'use client';

import { forwardRef } from 'react';

interface ReceiptProps {
  orderData: {
    orderNumber: string;
    patientName: string;
    patientPhone?: string;
    tests: Array<{
      name: string;
      code: string;
      price: number;
    }>;
    totalAmount: number;
    paidAmount: number;
    paymentStatus: string;
    paymentMethod?: string;
    sampleCollectionDate?: string;
    expectedReportDate?: string;
    createdAt: string;
    priority: string;
  };
}

const OrderReceipt = forwardRef<HTMLDivElement, ReceiptProps>(
  ({ orderData }, ref) => {
    const remainingAmount = orderData.totalAmount - orderData.paidAmount;

    return (
      <div ref={ref} className="max-w-2xl mx-auto bg-white p-8 text-black">
        {/* Header */}
        <div className="text-center mb-8 border-b-2 border-gray-300 pb-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Lab Management System</h1>
          <p className="text-gray-600">Test Order Receipt</p>
        </div>

        {/* Order Info */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Order Details</h3>
            <div className="space-y-1 text-sm">
              <p><span className="font-medium">Order #:</span> {orderData.orderNumber}</p>
              <p><span className="font-medium">Date:</span> {new Date(orderData.createdAt).toLocaleDateString()}</p>
              <p><span className="font-medium">Priority:</span> {orderData.priority.charAt(0).toUpperCase() + orderData.priority.slice(1)}</p>
              {orderData.sampleCollectionDate && (
                <p><span className="font-medium">Collection Date:</span> {new Date(orderData.sampleCollectionDate).toLocaleDateString()}</p>
              )}
              {orderData.expectedReportDate && (
                <p><span className="font-medium">Expected Report:</span> {new Date(orderData.expectedReportDate).toLocaleDateString()}</p>
              )}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Patient Information</h3>
            <div className="space-y-1 text-sm">
              <p><span className="font-medium">Name:</span> {orderData.patientName}</p>
              {orderData.patientPhone && (
                <p><span className="font-medium">Phone:</span> {orderData.patientPhone}</p>
              )}
            </div>
          </div>
        </div>

        {/* Tests Table */}
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Laboratory Tests</h3>
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 px-4 py-2 text-left font-medium">Test Code</th>
                <th className="border border-gray-300 px-4 py-2 text-left font-medium">Test Name</th>
                <th className="border border-gray-300 px-4 py-2 text-right font-medium">Price</th>
              </tr>
            </thead>
            <tbody>
              {orderData.tests.map((test, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border border-gray-300 px-4 py-2 font-mono text-sm">{test.code}</td>
                  <td className="border border-gray-300 px-4 py-2">{test.name}</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">Rs. {test.price.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Payment Summary */}
        <div className="border-t-2 border-gray-300 pt-4">
          <div className="flex justify-end">
            <div className="w-64">
              <div className="space-y-2">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total Amount:</span>
                  <span>Rs. {orderData.totalAmount.toLocaleString()}</span>
                </div>
                
                {orderData.paidAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Paid Amount:</span>
                    <span>Rs. {orderData.paidAmount.toLocaleString()}</span>
                  </div>
                )}
                
                {remainingAmount > 0 && (
                  <div className="flex justify-between text-red-600 border-t pt-2">
                    <span>Remaining:</span>
                    <span>Rs. {remainingAmount.toLocaleString()}</span>
                  </div>
                )}

                <div className="flex justify-between font-semibold text-lg border-t pt-2">
                  <span>Status:</span>
                  <span className={`
                    ${orderData.paymentStatus === 'paid' ? 'text-green-600' : 
                      orderData.paymentStatus === 'partial' ? 'text-orange-600' : 'text-red-600'}
                  `}>
                    {orderData.paymentStatus.charAt(0).toUpperCase() + orderData.paymentStatus.slice(1)}
                  </span>
                </div>

                {orderData.paymentMethod && orderData.paymentStatus !== 'pending' && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Payment Method:</span>
                    <span>{orderData.paymentMethod.charAt(0).toUpperCase() + orderData.paymentMethod.slice(1)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-gray-300 text-center text-xs text-gray-500">
          <p>Thank you for choosing our laboratory services!</p>
          <p>For queries, please contact our reception desk.</p>
        </div>
      </div>
    );
  }
);

OrderReceipt.displayName = 'OrderReceipt';

export default OrderReceipt;