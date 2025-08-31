'use client';

import { forwardRef } from 'react';
import Image from 'next/image';

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

    return (
      <div ref={ref} className="max-w-sm mx-auto bg-white p-4 text-black font-mono text-sm border border-gray-300" style={{ width: '80mm', minHeight: '200mm' }}>
        {/* Header - Pakistani shop style */}
        <div className="text-center mb-4 border-b border-dashed border-gray-400 pb-3">
          <div className="flex justify-center mb-2">
            <Image 
              src="/logo.png" 
              alt="Health Inn Services Laboratory" 
              width={32}
              height={32}
              className="object-contain" 
            />
          </div>
          <div className="text-xs font-bold uppercase">Health Inn Services Laboratory</div>
          <div className="text-xs">Receipt</div>
        </div>

        {/* Basic Info */}
        <div className="mb-3 text-xs">
          <div className="flex justify-between">
            <span>Order #:</span>
            <span>{orderData.orderNumber}</span>
          </div>
          <div className="flex justify-between">
            <span>Date:</span>
            <span>{new Date(orderData.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Patient:</span>
            <span>{orderData.patientName}</span>
          </div>
          {orderData.patientPhone && (
            <div className="flex justify-between">
              <span>Phone:</span>
              <span>{orderData.patientPhone}</span>
            </div>
          )}
        </div>

        {/* Tests List - Simple format */}
        <div className="mb-4">
          <div className="border-b border-dashed border-gray-400 mb-2 pb-1">
            <div className="flex justify-between font-semibold text-xs">
              <span>Item</span>
              <span>Price</span>
            </div>
          </div>
          {orderData.tests.map((test, index) => (
            <div key={index} className="flex justify-between text-xs mb-1">
              <div className="flex-1 pr-2">
                <div>{test.name}</div>
                <div className="text-gray-600 text-xs">({test.code})</div>
              </div>
              <div>Rs. {test.price.toLocaleString()}</div>
            </div>
          ))}
        </div>

        {/* Payment Summary */}
        <div className="border-t border-dashed border-gray-400 pt-2 mb-4">
          <div className="flex justify-between text-sm font-semibold">
            <span>Total:</span>
            <span>Rs. {orderData.totalAmount.toLocaleString()}</span>
          </div>
          
          {orderData.paidAmount > 0 && (
            <div className="flex justify-between text-xs text-green-600">
              <span>Paid:</span>
              <span>Rs. {orderData.paidAmount.toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>
    );
  }
);

OrderReceipt.displayName = 'OrderReceipt';

export default OrderReceipt;