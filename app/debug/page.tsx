'use client';

import { useSession } from 'next-auth/react';
import { useState } from 'react';

export default function DebugPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [sampleDataResult, setSampleDataResult] = useState<Record<string, unknown> | null>(null);

  const checkData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/debug/data');
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const createSampleData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/debug/sample-data', { method: 'POST' });
      if (response.ok) {
        const result = await response.json();
        setSampleDataResult(result);
        // Refresh data after creating samples
        setTimeout(checkData, 1000);
      } else {
        const error = await response.json();
        setSampleDataResult({ error: error.error });
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return <div className="p-8">Please log in to access debug tools.</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Lab System Debug Tools</h1>
      
      <div className="space-y-4">
        <div>
          <button 
            onClick={checkData}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Check Database Contents'}
          </button>
        </div>

        {session?.user?.role === 'admin' && (
          <div>
            <button 
              onClick={createSampleData}
              disabled={loading}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Sample Data'}
            </button>
          </div>
        )}
      </div>

      {data && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Database Contents:</h2>
          <div className="bg-gray-100 p-4 rounded">
            <h3 className="font-semibold">Totals:</h3>
            <ul className="list-disc ml-6">
              <li>Orders: {Number((data.totals as Record<string, unknown>)?.orders) || 0}</li>
              <li>Results: {Number((data.totals as Record<string, unknown>)?.results) || 0}</li>
              <li>Patients: {Number((data.totals as Record<string, unknown>)?.patients) || 0}</li>
              <li>Tests: {Number((data.totals as Record<string, unknown>)?.tests) || 0}</li>
            </ul>
            
            <h3 className="font-semibold mt-4">Orders by Status:</h3>
            <ul className="list-disc ml-6">
              {(data.ordersByStatus as Record<string, unknown>[] || [])?.map((status: Record<string, unknown>) => (
                <li key={String(status._id)}>{String(status._id)}: {String(status.count)}</li>
              ))}
            </ul>

            <h3 className="font-semibold mt-4">Recent Orders:</h3>
            <ul className="list-disc ml-6">
              {(data.recentOrders as Record<string, unknown>[] || [])?.map((order: Record<string, unknown>) => (
                <li key={String(order._id)}>
                  {String(order.orderNumber)} - {String((order.patient as Record<string, unknown>)?.firstName)} {String((order.patient as Record<string, unknown>)?.lastName)} 
                  - Status: {String(order.orderStatus)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {sampleDataResult && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Sample Data Creation Result:</h2>
          <div className="bg-gray-100 p-4 rounded">
            <pre>{JSON.stringify(sampleDataResult, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}