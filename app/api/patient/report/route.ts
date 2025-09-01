import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import TestResult from '@/lib/models/TestResult';
import TestOrder from '@/lib/models/TestOrder';
import jsPDF from 'jspdf';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'patient' && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { orderId } = await request.json();
    
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    await connectDB();

    // Get order details
    const order = await TestOrder.findById(orderId)
      .populate({
        path: 'tests',
        select: 'name code price'
      })
      .populate({
        path: 'packages',
        select: 'packageName packageCode packagePrice',
        populate: {
          path: 'tests',
          select: 'name code price'
        }
      })
      .populate('patient', 'firstName lastName patientId');

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // If patient, verify they own this order
    if (session.user.role === 'patient') {
      const Patient = (await import('@/lib/models/Patient')).default;
      const patient = await Patient.findOne({ userId: session.user.id });
      
      if (!patient || order.patient._id.toString() !== patient._id.toString()) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Get test results
    const testResults = await TestResult.find({ testOrder: orderId })
      .populate({
        path: 'test',
        select: 'code name price normalRange sampleType description'
      })
      .populate({
        path: 'technician',
        select: 'firstName lastName'
      })
      .sort({ createdAt: -1 });

    // Generate PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let currentY = 30;

    // Helper function to add new page if needed
    const checkNewPage = (requiredSpace: number) => {
      if (currentY + requiredSpace > pageHeight - 30) {
        doc.addPage();
        currentY = 30;
        return true;
      }
      return false;
    };

    // Simple Header with company logo on top left
    try {
      const logoPath = path.join(process.cwd(), 'public', 'logo.png');
      if (fs.existsSync(logoPath)) {
        const logoBuffer = fs.readFileSync(logoPath);
        const logoBase64 = logoBuffer.toString('base64');
        doc.addImage(`data:image/png;base64,${logoBase64}`, 'PNG', 20, currentY - 8, 16, 16);
      }
    } catch {
      console.log('Logo file not found, skipping logo');
    }
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Health Inn Services Laboratory', pageWidth / 2, currentY, { align: 'center' });
    
    currentY += 8;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Laboratory Report', pageWidth / 2, currentY, { align: 'center' });
    
    currentY += 20;
    
    // Patient Information
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Patient Information:', 20, currentY);
    currentY += 10;
    
    doc.setFont('helvetica', 'normal');
    const patientName = `${order.patient.firstName} ${order.patient.lastName}`;
    doc.text(`Name: ${patientName}`, 20, currentY);
    currentY += 6;
    doc.text(`Order #: ${order.orderNumber}`, 20, currentY);
    currentY += 6;
    doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, 20, currentY);
    
    currentY += 20;
    
    // Test Results Section
    checkNewPage(30);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('TEST RESULTS', 20, currentY);
    currentY += 15;
    
    for (let i = 0; i < testResults.length; i++) {
      const result = testResults[i];
      
      checkNewPage(60);
      
      // Test name - simple
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      const testTitle = `${result.test.name} (${result.test.code})`;
      const splitTestTitle = doc.splitTextToSize(testTitle, pageWidth - 50);
      doc.text(splitTestTitle, 20, currentY);
      
      currentY += Math.max(8, splitTestTitle.length * 6);
      
      // Status
      doc.setFont('helvetica', 'normal');
      doc.text(`Status: ${result.overallStatus.toUpperCase()}`, 20, currentY);
      
      currentY += 10;
      
      // Simple table
      if (result.resultData && result.resultData.length > 0) {
        // Table header
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Parameter', 20, currentY);
        doc.text('Result', 80, currentY);
        doc.text('Unit', 110, currentY);
        doc.text('Range', 130, currentY);
        doc.text('Flag', 170, currentY);
        
        // Line under header
        currentY += 5;
        doc.line(20, currentY, pageWidth - 20, currentY);
        currentY += 5;
        
        // Table data
        doc.setFont('helvetica', 'normal');
        for (const param of result.resultData) {
          // Parameter name
          const paramText = doc.splitTextToSize(param.parameter, 55);
          doc.text(paramText, 20, currentY);
          
          // Result value
          doc.text(param.value, 80, currentY);
          
          // Unit
          doc.text(param.unit || '-', 110, currentY);
          
          // Range
          doc.text(param.normalRange || '-', 130, currentY);
          
          // Flag
          const flag = param.flag?.toUpperCase() || 'NORMAL';
          doc.text(flag, 170, currentY);
          
          currentY += Math.max(6, paramText.length * 6);
        }
        
        currentY += 5;
      }
      
      // Simple comments
      if (result.comments) {
        checkNewPage(15);
        currentY += 5;
        doc.setFont('helvetica', 'bold');
        doc.text('Comments:', 20, currentY);
        currentY += 6;
        
        doc.setFont('helvetica', 'normal');
        const commentLines = doc.splitTextToSize(result.comments, 150);
        doc.text(commentLines, 20, currentY);
        
        currentY += commentLines.length * 6 + 5;
      }
      
      // Simple separator between tests
      if (i < testResults.length - 1) {
        currentY += 10;
        doc.line(20, currentY, pageWidth - 20, currentY);
        currentY += 10;
      }
    }
    
    // Simple footer
    currentY = Math.max(currentY + 20, pageHeight - 25);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Report generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, currentY, { align: 'center' });
    currentY += 6;
    doc.text('Health Inn Services Laboratory', pageWidth / 2, currentY, { align: 'center' });
    
    // Convert PDF to base64
    const pdfBase64 = doc.output('datauristring');
    
    return NextResponse.json({
      success: true,
      pdf: pdfBase64,
      filename: `report_${order.orderNumber}_${new Date().toISOString().split('T')[0]}.pdf`
    });

  } catch (error: unknown) {
    console.error('Error generating PDF report:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF report', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}