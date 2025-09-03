'use client';

import { useState, useEffect } from 'react';

interface AnalyticsData {
  orders: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    completedToday: number;
    completedThisWeek: number;
    completedThisMonth: number;
    pending: number;
    inProgress: number;
    pendingTests: number;
    inProgressTests: number;
  };
  tests: {
    completedToday: number;
    completedThisWeek: number;
    completedThisMonth: number;
  };
  revenue: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    pendingPayments: number;
  };
  trends: {
    dailyOrders: Array<{
      _id: string;
      orders: number;
      revenue: number;
      totalValue: number;
    }>;
    testStatus: Array<{
      _id: string;
      count: number;
    }>;
    paymentMethods: Array<{
      _id: string;
      count: number;
      amount: number;
    }>;
    popularTests: Array<{
      _id: string;
      testName: string;
      testCode: string;
      count: number;
      revenue: number;
    }>;
  };
}

export default function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatCurrency = (amount: number) => {
    return `Rs ${amount.toLocaleString('en-PK')}`;
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/analytics');
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }
      const result = await response.json();
      setData(result);
      setError(null);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground font-medium">Loading analytics...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center">
        <div className="w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <p className="text-destructive font-medium mb-2">Error Loading Analytics</p>
        <p className="text-muted-foreground text-sm mb-4">{error}</p>
        <button
          onClick={fetchAnalytics}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Analytics Dashboard</h2>
          <p className="text-muted-foreground mt-1">Lab performance metrics and insights</p>
        </div>
        <button
          onClick={fetchAnalytics}
          className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Orders Today */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Orders Today</p>
              <p className="text-2xl font-bold text-foreground">{data.orders.today}</p>
              <p className="text-xs text-green-600 mt-1">
                {data.orders.completedToday} completed
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </div>

        {/* Orders This Week */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Orders This Week</p>
              <p className="text-2xl font-bold text-foreground">{data.orders.thisWeek}</p>
              <p className="text-xs text-green-600 mt-1">
                {data.orders.completedThisWeek} completed
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Tests Completed Today */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Tests Today</p>
              <p className="text-2xl font-bold text-foreground">{data.tests.completedToday}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {data.tests.completedThisWeek} this week
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Revenue Today */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Revenue Today</p>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(data.revenue.today)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatCurrency(data.revenue.thisWeek)} this week
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Stats */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-foreground mb-4">Weekly Overview</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Orders</span>
              <span className="font-semibold">{data.orders.thisWeek}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Completed Orders</span>
              <span className="font-semibold text-green-600">{data.orders.completedThisWeek}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Tests Completed</span>
              <span className="font-semibold text-blue-600">{data.tests.completedThisWeek}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Revenue</span>
              <span className="font-semibold text-yellow-600">{formatCurrency(data.revenue.thisWeek)}</span>
            </div>
          </div>
        </div>

        {/* Order Status */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-foreground mb-4">Current Status</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Pending Tests</span>
              <span className="font-semibold text-purple-600">{data.orders.pendingTests}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Pending Orders</span>
              <span className="font-semibold text-orange-600">{data.orders.pending}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">In Progress Tests</span>
              <span className="font-semibold text-indigo-600">{data.orders.inProgressTests}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">In Progress Orders</span>
              <span className="font-semibold text-blue-600">{data.orders.inProgress}</span>
            </div>
          </div>
        </div>
      </div>


      {/* Popular Tests */}
      {data.trends.popularTests.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-foreground mb-4">Popular Tests This Month</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 text-muted-foreground font-medium">Test Name</th>
                  <th className="text-left py-2 text-muted-foreground font-medium">Code</th>
                  <th className="text-right py-2 text-muted-foreground font-medium">Count</th>
                  <th className="text-right py-2 text-muted-foreground font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.trends.popularTests.slice(0, 5).map((test) => (
                  <tr key={test._id} className="border-b border-border/50">
                    <td className="py-3 font-medium">{test.testName}</td>
                    <td className="py-3 text-muted-foreground">{test.testCode}</td>
                    <td className="py-3 text-right font-medium">{test.count}</td>
                    <td className="py-3 text-right font-medium">{formatCurrency(test.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}