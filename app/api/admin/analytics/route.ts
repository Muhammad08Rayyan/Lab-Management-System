import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import TestOrder from '@/lib/models/TestOrder';
import TestResult from '@/lib/models/TestResult';
import Invoice from '@/lib/models/Invoice';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as { role: string }).role;
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await connectDB();

    const now = new Date();
    
    // Today's date range
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    
    // This week's date range (Monday to Sunday)
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1);
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    // This month's date range
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // Orders Analytics
    const [
      totalOrdersToday,
      totalOrdersThisWeek,
      totalOrdersThisMonth,
      completedOrdersToday,
      completedOrdersThisWeek,
      completedOrdersThisMonth,
      pendingOrders,
      inProgressOrders
    ] = await Promise.all([
      TestOrder.countDocuments({
        createdAt: { $gte: startOfToday, $lt: endOfToday }
      }),
      TestOrder.countDocuments({
        createdAt: { $gte: startOfWeek, $lt: endOfWeek }
      }),
      TestOrder.countDocuments({
        createdAt: { $gte: startOfMonth, $lt: endOfMonth }
      }),
      TestOrder.countDocuments({
        orderStatus: 'completed',
        completedAt: { $gte: startOfToday, $lt: endOfToday }
      }),
      TestOrder.countDocuments({
        orderStatus: 'completed',
        completedAt: { $gte: startOfWeek, $lt: endOfWeek }
      }),
      TestOrder.countDocuments({
        orderStatus: 'completed',
        completedAt: { $gte: startOfMonth, $lt: endOfMonth }
      }),
      TestOrder.countDocuments({
        orderStatus: { $in: ['pending', 'confirmed'] }
      }),
      TestOrder.countDocuments({
        orderStatus: 'in_progress'
      })
    ]);

    // Tests Completed Analytics
    const [
      testsCompletedToday,
      testsCompletedThisWeek,
      testsCompletedThisMonth
    ] = await Promise.all([
      TestResult.countDocuments({
        reportedDate: { $gte: startOfToday, $lt: endOfToday }
      }),
      TestResult.countDocuments({
        reportedDate: { $gte: startOfWeek, $lt: endOfWeek }
      }),
      TestResult.countDocuments({
        reportedDate: { $gte: startOfMonth, $lt: endOfMonth }
      })
    ]);

    // Revenue Analytics
    const [
      revenueToday,
      revenueThisWeek,
      revenueThisMonth,
      pendingPayments,
      partialPayments
    ] = await Promise.all([
      TestOrder.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfToday, $lt: endOfToday },
            paymentStatus: { $in: ['paid', 'partial'] }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$paidAmount' }
          }
        }
      ]).then(result => result[0]?.total || 0),
      
      TestOrder.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfWeek, $lt: endOfWeek },
            paymentStatus: { $in: ['paid', 'partial'] }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$paidAmount' }
          }
        }
      ]).then(result => result[0]?.total || 0),
      
      TestOrder.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfMonth, $lt: endOfMonth },
            paymentStatus: { $in: ['paid', 'partial'] }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$paidAmount' }
          }
        }
      ]).then(result => result[0]?.total || 0),
      
      TestOrder.aggregate([
        {
          $match: { paymentStatus: 'pending' }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$totalAmount' }
          }
        }
      ]).then(result => result[0]?.total || 0),
      
      TestOrder.aggregate([
        {
          $match: { paymentStatus: 'partial' }
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$totalAmount' },
            paidAmount: { $sum: '$paidAmount' }
          }
        }
      ]).then(result => ({
        totalAmount: result[0]?.totalAmount || 0,
        paidAmount: result[0]?.paidAmount || 0,
        balance: (result[0]?.totalAmount || 0) - (result[0]?.paidAmount || 0)
      }))
    ]);

    // Payment Method Distribution (Today)
    const paymentMethodsToday = await TestOrder.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfToday, $lt: endOfToday },
          paymentStatus: { $in: ['paid', 'partial'] }
        }
      },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          amount: { $sum: '$paidAmount' }
        }
      }
    ]);

    // Recent Orders (Last 7 days) for trend analysis
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const dailyOrderTrends = await TestOrder.aggregate([
      {
        $match: {
          createdAt: { $gte: last7Days }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          orders: { $sum: 1 },
          revenue: { $sum: '$paidAmount' },
          totalValue: { $sum: '$totalAmount' }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Test Status Distribution
    const testStatusDistribution = await TestOrder.aggregate([
      {
        $group: {
          _id: '$orderStatus',
          count: { $sum: 1 }
        }
      }
    ]);

    // Most Popular Tests (This Month)
    const popularTests = await TestOrder.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfMonth, $lt: endOfMonth }
        }
      },
      {
        $unwind: '$tests'
      },
      {
        $lookup: {
          from: 'labtests',
          localField: 'tests',
          foreignField: '_id',
          as: 'testInfo'
        }
      },
      {
        $unwind: '$testInfo'
      },
      {
        $group: {
          _id: '$tests',
          testName: { $first: '$testInfo.testName' },
          testCode: { $first: '$testInfo.testCode' },
          count: { $sum: 1 },
          revenue: { $sum: '$testInfo.price' }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);

    return NextResponse.json({
      orders: {
        today: totalOrdersToday,
        thisWeek: totalOrdersThisWeek,
        thisMonth: totalOrdersThisMonth,
        completedToday: completedOrdersToday,
        completedThisWeek: completedOrdersThisWeek,
        completedThisMonth: completedOrdersThisMonth,
        pending: pendingOrders,
        inProgress: inProgressOrders
      },
      tests: {
        completedToday: testsCompletedToday,
        completedThisWeek: testsCompletedThisWeek,
        completedThisMonth: testsCompletedThisMonth
      },
      revenue: {
        today: revenueToday,
        thisWeek: revenueThisWeek,
        thisMonth: revenueThisMonth,
        pendingPayments,
        partialPayments: partialPayments.balance
      },
      trends: {
        dailyOrders: dailyOrderTrends,
        testStatus: testStatusDistribution,
        paymentMethods: paymentMethodsToday,
        popularTests
      }
    });

  } catch (error: unknown) {
    console.error('Error fetching analytics data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}