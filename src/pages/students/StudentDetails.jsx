import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { studentAPI, feeAPI, notificationAPI } from '../../utils/api';
import { PrintStudentDetailsButton, PrintPageButton } from '../../components/PrintButton';
import FeeReceipt from '../../components/FeeReceipt';
import { createRoot } from 'react-dom/client';
import logo from '../../assets/logo.png'
import toast from 'react-hot-toast';
import Loader from '../../components/Loader';
import { HiArrowLeft, HiUser, HiPencil, HiChatAlt, HiPhone, HiDocumentText, HiLightningBolt } from 'react-icons/hi';
import { FaRupeeSign } from 'react-icons/fa';

// Add print styles
const printStyles = `
  @media print {
    body * {
      visibility: hidden;
    }
    .print-area, .print-area * {
      visibility: visible;
    }
    .print-area {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
    }
    .no-print {
      display: none !important;
    }
    .print-header {
      text-align: center;
      margin-bottom: 20px;
      border-bottom: 2px solid #000;
      padding-bottom: 10px;
    }
    .print-content {
      font-size: 12px;
      line-height: 1.4;
    }
    .print-section {
      margin-bottom: 15px;
      page-break-inside: avoid;
    }
    .print-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    .print-table th,
    .print-table td {
      border: 1px solid #000;
      padding: 8px;
      text-align: left;
    }
    .print-table th {
      background-color: #f0f0f0;
      font-weight: bold;
    }
  }
`;

// Add styles to document head
if (!document.querySelector('#print-styles')) {
  const style = document.createElement('style');
  style.id = 'print-styles';
  style.textContent = printStyles;
  document.head.appendChild(style);
}

const StudentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadStudentData();
  }, [id]);

  const loadStudentData = async () => {
    try {
      setLoading(true);
      // console.log('Loading student data for ID:', id);
      
      // Load student data with cache busting
      const studentRes = await studentAPI.getById(id);
      // console.log('Student API response:', studentRes.data);
      
      const studentData = studentRes.data.data || studentRes.data;
      // console.log('Student data:', studentData);
      
      // Calculate paid amount from fees
      let totalPaidAmount = 0;
      try {
        const feesRes = await feeAPI.getByStudentId(id);
        const feesData = feesRes.data.fees || feesRes.data.data || feesRes.data || [];
        // console.log('Fees data:', feesData);
        
        totalPaidAmount = feesData
          .filter(fee => fee.status === 'paid')
          .reduce((sum, fee) => sum + (fee.paidAmount || fee.amount || 0), 0);
        
        // console.log('Total paid amount calculated:', totalPaidAmount);
        setFees(Array.isArray(feesData) ? feesData : []);
      } catch (feeError) {
        // console.log('No fees found for student:', feeError);
        setFees([]);
      }
      
      // Ensure fee fields are properly set with calculated values
      const processedStudent = {
        ...studentData,
        tuitionFee: studentData.tuitionFee || 0,
        hostelFee: studentData.hostelFee || 0,
        securityFee: studentData.securityFee || 0,
        miscellaneousFee: studentData.miscellaneousFee || 0,
        acCharge: studentData.acCharge || 0,
        totalFee: studentData.totalFee || 0,
        paidAmount: totalPaidAmount,
        balanceAmount: Math.max(0, (studentData.totalFee || 0) - totalPaidAmount)
      };
      
      // console.log('Processed student data:', processedStudent);
      setStudent(processedStudent);
      
    } catch (error) {
      // console.error('Error loading student data:', error);
      setStudent(null);
      setFees([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendSMS = async () => {
    if (!student?.phone) {
      toast.error('Student phone number not available');
      return;
    }

    setActionLoading(true);
    try {
      const balanceAmount = student.balanceAmount || 0;
      const message = `Dear ${student.name}, your fee payment is due. Please pay ₹${balanceAmount.toLocaleString()} at your earliest convenience. Thank you.`;

      await notificationAPI.sendSMS({
        phone: student.phone,
        message: message,
        studentName: student.name,
        amount: balanceAmount,
        email: student.email
      });
      toast.success('SMS sent successfully!');
    } catch (error) {
      // console.error('Error sending SMS:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Error sending SMS';
      toast.error(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMakeCall = async () => {
    if (!student?.phone) {
      toast.error('Student phone number not available');
      return;
    }

    setActionLoading(true);
    try {
      await notificationAPI.makeCall({
        phone: student.phone,
        studentName: student.name
      });
      toast.success('Call initiated successfully!');
    } catch (error) {
      // console.error('Error making call:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Error making call';
      toast.error(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePayFee = async (feeId) => {
    setActionLoading(true);
    try {
      await feeAPI.payFee(feeId, { paymentMethod: 'cash' });
      toast.success('Fee payment recorded successfully!');
      loadStudentData(); // Reload data
    } catch (error) {
      // console.error('Error recording payment:', error);
      toast.error('Error recording payment');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrintPaymentReceipt = (fee) => {
    // Debug: Check what's in the fee object
    // console.log('Fee object for printing:', fee);
    // console.log('Transaction ID:', fee.transactionId);
    
    const printHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Fee Receipt - ${student?.name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
            .header { display: flex; align-items: center; border-bottom: 3px solid #000; padding-bottom: 15px; margin-bottom: 20px; }
            .logo { width: 80px; height: 80px; margin-right: 20px; border: 2px solid #000; border-radius: 50%; padding: 5px; }
            .college-info { flex: 1; text-align: center; }
            .college-info h1 { margin: 0; font-size: 20px; font-weight: bold; color: #000; }
            .college-info p { margin: 5px 0; font-size: 14px; color: #333; }
            .receipt-info { display: flex; justify-content: space-between; margin: 15px 0; }
            .student-info { margin: 15px 0; }
            .info-row { display: flex; justify-content: space-between; margin: 8px 0; }
            .fee-table { width: 100%; border-collapse: collapse; margin: 20px 0; border: 2px solid #000; }
            .fee-table th { background-color: #f0f0f0; border: 1px solid #000; padding: 12px; text-align: center; font-weight: bold; }
            .fee-table td { border: 1px solid #000; padding: 10px; text-align: center; }
            .fee-table .text-left { text-align: left; }
            .fee-table .text-right { text-align: right; }
            .total-row { background-color: #f0f0f0; font-weight: bold; }
            .footer { margin-top: 50px; display: flex; justify-content: space-between; align-items: end; }
            .signature { border-top: 1px solid #000; width: 200px; text-align: center; padding-top: 10px; }
            .paid-amount { color: #28a745; font-weight: bold; }
            @media print {
              body { margin: 0; }
              @page { size: A4; margin: 0.5in; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${logo}" alt="College Logo" class="logo">
            <div class="college-info">
              <h1>CAREER INSTITUTE OF MEDICAL SCIENCES & HOSPITAL</h1>
              <p>IIM ROAD, GHAILLA LUCKNOW - 226 013</p>
              <p><strong>FEE RECEIPT (STUDENT COPY)</strong></p>
            </div>
          </div>
          
          <div class="receipt-info">
            <span><strong>Receipt No:</strong> ${fee.receiptNumber || 'CIMS' + Math.floor(Math.random() * 90000) + 10000}</span>
            <span><strong>Date:</strong> ${fee.paidDate ? new Date(fee.paidDate).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')}</span>
            <span><strong>F.Y.:</strong> 2025-26</span>
          </div>
          
          <div class="student-info">
            <div class="info-row">
              <span><strong>Name:</strong> ${student?.name || 'N/A'}</span>
              <span><strong>Roll No:</strong> ${student?.rollNumber || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span><strong>Department:</strong> ${student?.class || student?.department?.name || 'N/A'}</span>
              <span><strong>Phone:</strong> ${student?.phone || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span><strong>Speciality:</strong> ${(typeof student?.section === 'object' ? student?.section?.name : student?.section) || (typeof student?.speciality === 'object' ? student?.speciality?.name : student?.speciality) || 'N/A'}</span>
              <span><strong>Parent Name:</strong> ${student?.guardianName || student?.parentName || 'N/A'}</span>
            </div>
          </div>
          
          <table class="fee-table">
            <thead>
              <tr>
                <th colspan="3" style="text-align: center;">PAYMENT RECEIPT</th>
              </tr>
              <tr>
                <th style="width: 15%;">S.No.</th>
                <th style="width: 55%;">Fee Type</th>
                <th style="width: 30%;">Paid Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1</td>
                <td class="text-left">${fee.feeType}</td>
                <td class="text-right paid-amount">₹${(fee.paidAmount || fee.amount || 0).toLocaleString()}</td>
              </tr>
              <tr class="total-row" style="background-color: #d4edda;">
                <td colspan="2"><strong>TOTAL PAID</strong></td>
                <td class="text-right paid-amount"><strong>₹${(fee.paidAmount || fee.amount || 0).toLocaleString()}</strong></td>
              </tr>
            </tbody>
          </table>
          
          <div style="margin: 20px 0; padding: 10px; border: 1px solid #ccc; background-color: #f9f9f9;">
            <div style="display: flex; justify-content: space-between; margin: 5px 0;">
              <span><strong>Payment Method:</strong> ${fee.paymentMethod || 'Cash'}</span>
              <span><strong>Transaction ID:</strong> ${fee.transactionId || fee.checkNumber || fee._id?.slice(-8) || 'N/A'}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin: 5px 0;">
              <span><strong>Payment Date:</strong> ${fee.paidDate ? new Date(fee.paidDate).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')}</span>
              <span><strong>Status:</strong> ${fee.status?.toUpperCase() || 'PAID'}</span>
            </div>
          </div>
          
          <div class="footer">
            <div style="font-size: 12px; font-style: italic; color: #666;">
              * This is a computer generated receipt<br>
              * Payment received with thanks
            </div>
            <div class="signature">
              <strong>Authorised Signatory</strong>
            </div>
          </div>
          
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printHTML);
      printWindow.document.close();
    }
  };

  const handlePrintReceipt = () => {
    // Convert logo to base64 for print window
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = function() {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const logoBase64 = canvas.toDataURL('image/png');
      
      // Now create print content with base64 logo
      createPrintContent(logoBase64);
    };
    
    img.onerror = function() {
      // Fallback to SVG logo if image fails
      const svgLogo = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iNDAiIGN5PSI0MCIgcj0iMzgiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLXdpZHRoPSI0Ii8+Cjx0ZXh0IHg9IjQwIiB5PSI0NSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0iIzAwMCI+Q0lNUzwvdGV4dD4KPC9zdmc+';
      createPrintContent(svgLogo);
    };
    
    img.src = logo;
  };
  
  const createPrintContent = (logoSrc) => {
    // Debug: Check student data before printing
    // console.log('Student data for printing:', student);
    
    // Calculate fee breakdown with proper paid/Balances - only show fees with amounts
    const allFees = [
      { type: 'Tuition Fee', total: student?.tuitionFee || 0 },
      { type: 'Hostel Fee', total: student?.hostelFee || 0 },
      { type: 'Security Fee', total: student?.securityFee || 0 },
      { type: 'Miscellaneous Fee', total: student?.miscellaneousFee || 0 },
      { type: 'AC Charge', total: student?.acCharge || 0 }
    ];
    
    // Filter out fees with 0 amount
    const feeBreakdown = allFees.filter(fee => fee.total > 0);
    
    // Calculate paid amounts for each fee type based on total paid amount
    const totalPaidAmount = student?.paidAmount || 0;
    let remainingPaid = totalPaidAmount;
    
    feeBreakdown.forEach(fee => {
      if (remainingPaid >= fee.total) {
        fee.paid = fee.total;
        fee.due = 0;
        remainingPaid -= fee.total;
      } else if (remainingPaid > 0) {
        fee.paid = remainingPaid;
        fee.due = fee.total - remainingPaid;
        remainingPaid = 0;
      } else {
        fee.paid = 0;
        fee.due = fee.total;
      }
    });
    
    // Separate paid and due fees
    const paidFees = feeBreakdown.filter(fee => fee.paid > 0);
    const dueFees = feeBreakdown.filter(fee => fee.due > 0);
    
    // Create a complete print window with proper fee slip
    const printContent = `
      <html>
        <head>
          <title>Fee Receipt - ${student?.name || 'Student'}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
            .header { display: flex; align-items: center; border-bottom: 3px solid #000; padding-bottom: 15px; margin-bottom: 20px; }
            .logo { width: 80px; height: 80px; margin-right: 20px; border: 2px solid #000; border-radius: 50%; padding: 5px; }
            .college-info { flex: 1; text-align: center; }
            .college-info h1 { margin: 0; font-size: 20px; font-weight: bold; color: #000; }
            .college-info p { margin: 5px 0; font-size: 14px; color: #333; }
            .receipt-info { display: flex; justify-content: space-between; margin: 15px 0; }
            .student-info { margin: 15px 0; }
            .info-row { display: flex; justify-content: space-between; margin: 8px 0; }
            .fee-table { width: 100%; border-collapse: collapse; margin: 20px 0; border: 2px solid #000; }
            .fee-table th { background-color: #f0f0f0; border: 1px solid #000; padding: 12px; text-align: center; font-weight: bold; }
            .fee-table td { border: 1px solid #000; padding: 10px; text-align: center; }
            .fee-table .text-left { text-align: left; }
            .fee-table .text-right { text-align: right; }
            .total-row { background-color: #f0f0f0; font-weight: bold; }
            .summary { display: flex; justify-content: space-between; margin: 20px 0; }
            .summary-box { border: 1px solid #000; padding: 10px; text-align: center; flex: 1; margin: 0 5px; }
            .footer { margin-top: 50px; display: flex; justify-content: space-between; align-items: end; }
            .signature { border-top: 1px solid #000; width: 200px; text-align: center; padding-top: 10px; }
            .paid-amount { color: #28a745; font-weight: bold; }
            .due-amount { color: #dc3545; font-weight: bold; }
            @media print {
              body { margin: 0; }
              @page { size: A4; margin: 0.5in; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${logo}" class="logo">
            <div class="college-info">
              <h1>CAREER INSTITUTE OF MEDICAL SCIENCES & HOSPITAL</h1>
              <p>IIM ROAD, GHAILLA LUCKNOW - 226 013</p>
              <p><strong>FEE RECEIPT (STUDENT COPY)</strong></p>
            </div>
          </div>
          
          <div class="receipt-info">
            <span><strong>Receipt No:</strong> CIMS${Math.floor(Math.random() * 90000) + 10000}</span>
            <span><strong>Date:</strong> ${new Date().toLocaleDateString('en-IN')}</span>
            <span><strong>F.Y.:</strong> 2025-26</span>
          </div>
          
          <div class="student-info">
            <div class="info-row">
              <span><strong>Name:</strong> ${student?.name || 'N/A'}</span>
              <span><strong>Roll No:</strong> ${student?.rollNumber || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span><strong>Department:</strong> ${student?.class || student?.department?.name || 'N/A'}</span>
              <span><strong>Phone:</strong> ${student?.phone || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span><strong>Speciality:</strong> ${(typeof student?.section === 'object' ? student?.section?.name : student?.section) || (typeof student?.speciality === 'object' ? student?.speciality?.name : student?.speciality) || 'N/A'}</span>
              <span><strong>Parent Name:</strong> ${student?.guardianName || student?.parentName || 'N/A'}</span>
            </div>
          </div>
          
          <table class="fee-table">
            <thead>
              <tr>
                <th colspan="3" text-align: center;">PAID FEES</th>
              </tr>
              <tr>
                <th style="width: 15%;">S.No.</th>
                <th style="width: 55%;">Fee Type</th>
                <th style="width: 30%;">Paid Amount</th>
              </tr>
            </thead>
            <tbody>
              ${paidFees.length > 0 ? paidFees.map((fee, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td class="text-left">${fee.type}</td>
                  <td class="text-right paid-amount">₹${fee.paid.toLocaleString()}</td>
                </tr>
              `).join('') : `
                <tr>
                  <td colspan="3" style="text-align: center; padding: 15px; color: #666; font-style: italic;">
                    No fees paid yet
                  </td>
                </tr>
              `}
              <tr class="total-row" style="background-color: #d4edda;">
                <td colspan="2"><strong>TOTAL PAID</strong></td>
                <td class="text-right paid-amount"><strong>₹${(student?.paidAmount || 0).toLocaleString()}</strong></td>
              </tr>
            </tbody>
          </table>
          
          <table class="fee-table" style="margin-top: 30px;">
            <thead>
              <tr>
                <th colspan="3" style="background-color: #f8d7da; color: #721c24; text-align: center;">DUE FEES</th>
              </tr>
              <tr>
                <th style="width: 15%;">S.No.</th>
                <th style="width: 55%;">Fee Type</th>
                <th style="width: 30%;">Balance</th>
              </tr>
            </thead>
            <tbody>
              ${dueFees.length > 0 ? dueFees.map((fee, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td class="text-left">${fee.type}</td>
                  <td class="text-right due-amount">₹${fee.due.toLocaleString()}</td>
                </tr>
              `).join('') : `
                <tr>
                  <td colspan="3" style="text-align: center; padding: 15px; color: #666; font-style: italic;">
                    No pending dues
                  </td>
                </tr>
              `}
              <tr class="total-row" style="background-color: #f8d7da;">
                <td colspan="2"><strong>TOTAL DUE</strong></td>
                <td class="text-right due-amount"><strong>₹${(student?.balanceAmount || 0).toLocaleString()}</strong></td>
              </tr>
            </tbody>
          </table>
          
          <div class="summary">
            <div class="summary-box">
              <strong>Total Fee</strong><br>
              ₹${(student?.totalFee || 0).toLocaleString()}
            </div>
            <div class="summary-box" style="background-color: #d4edda;">
              <strong>Total Paid</strong><br>
              <span class="paid-amount">₹${(student?.paidAmount || 0).toLocaleString()}</span>
            </div>
            <div class="summary-box" style="background-color: #f8d7da;">
              <strong>Total Due</strong><br>
              <span class="due-amount">₹${(student?.balanceAmount || 0).toLocaleString()}</span>
            </div>
            <div class="summary-box">
              <strong>Fee Status</strong><br>
              ${(student?.balanceAmount || 0) <= 0 ? '<span style="color: #28a745;">COMPLETE</span>' :
                (student?.paidAmount || 0) > 0 ? '<span style="color: #ffc107;">PARTIAL</span>' :
                '<span style="color: #dc3545;">PENDING</span>'}
            </div>
          </div>
          
          <div style="margin: 20px 0; padding: 10px; border: 1px solid #ccc; background-color: #f9f9f9;">
            <div style="display: flex; justify-content: space-between; margin: 5px 0;">
              <span><strong>Payment Method:</strong> ________________</span>
              <span><strong>Cheque/DD No:</strong> ________________</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin: 5px 0;">
              <span><strong>Bank Name:</strong> ________________</span>
              <span><strong>Payment Date:</strong> ________________</span>
            </div>
            <div style="margin: 10px 0;">
              <span><strong>Amount in Words:</strong> ________________________________________________</span>
            </div>
          </div>
          
          <div class="footer">
            <div style="font-size: 12px; font-style: italic; color: #666;">
              * This is a computer generated receipt<br>
              * Subject to encashment of cheque/DD
            </div>
            <div class="signature">
              <strong>Authorised Signatory</strong>
            </div>
          </div>
          
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
    } else {
      // Fallback: create a temporary div and print
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = printContent;
      document.body.appendChild(tempDiv);
      window.print();
      document.body.removeChild(tempDiv);
    }
  };

  if (loading) return <Loader />;

  if (!student) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">Student not found</h3>
        <button
          onClick={() => navigate('/students/show')}
          className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
        >
          Back to Students
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="w-full sm:w-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Student Details</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Complete information about <b className='text-xl'>{student.name}</b></p>
        </div>
        <div className="flex flex-col gap-3 w-full sm:w-auto">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => navigate('/students/show')}
              className="flex items-center justify-center px-3 py-2 text-sm text-white bg-gray-500 rounded-lg hover:bg-gray-600 transition-colors duration-200"
            >
              <HiArrowLeft className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Back to Students</span>
              <span className="sm:hidden">Back</span>
            </button>
            {/* <button
              onClick={() => window.print()}
              className="flex items-center justify-center px-3 py-2 text-sm text-blue-600 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors duration-200"
            >
              <HiDocumentText className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Print Details</span>
              <span className="sm:hidden">Print</span>
            </button> */}

          </div>
        </div>
      </div>

      {/* Student Info Cards */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Personal Information */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
            <HiUser className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-blue-600" />
            Personal Information
          </h3>
          <div className="space-y-2 sm:space-y-3">
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Full Name</p>
              <p className="font-medium text-gray-900 text-sm sm:text-base">{student.name}</p>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Roll Number</p>
              <p className="font-medium text-gray-900 text-sm sm:text-base">{student.rollNumber}</p>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Department</p>
              <p className="font-medium text-gray-900 text-sm sm:text-base">{typeof student.class === 'object' ? student.class?.name : student.class || typeof student.department === 'object' ? student.department?.name : student.department || 'N/A'}</p>
            </div>
            {(student.section || student.speciality) && (
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Speciality</p>
                <p className="font-medium text-gray-900 text-sm sm:text-base">{typeof student.section === 'object' ? student.section?.name : student.section || typeof student.speciality === 'object' ? student.speciality?.name : student.speciality}</p>
              </div>
            )}
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Phone</p>
              <p className="font-medium text-gray-900 text-sm sm:text-base">{student.phone}</p>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Email</p>
              <p className="font-medium text-gray-900 text-sm sm:text-base break-all">{student.email}</p>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Date of Birth</p>
              <p className="font-medium text-gray-900 text-sm sm:text-base">
                {student.dateOfBirth && student.dateOfBirth !== '' ?
                  new Date(student.dateOfBirth).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  }) : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Address</p>
              <p className="font-medium text-gray-900 text-sm sm:text-base">{student.address || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Parent/Guardian & Academic Information */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 flex items-center">
            <HiUser className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-purple-600" />
            Parent & Academic Info
          </h3>
          <div className="space-y-2">
            <div>
              <p className="text-xs text-gray-500">Parent Name</p>
              <p className="font-medium text-gray-900 text-sm">{student.guardianName || student.parentName || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Parent Phone</p>
              <p className="font-medium text-gray-900 text-sm">{student.guardianPhone || student.parentPhone || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Admission Date</p>
              <p className="font-medium text-gray-900 text-sm">{student.admissionDate ? new Date(student.admissionDate).toLocaleDateString('en-IN') : 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Fee Type</p>
              <p className="font-medium text-gray-900 text-sm">{student.feeType || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Fee Summary */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
            <FaRupeeSign className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-green-600" />
            Fee Summary
          </h3>
          <div className="space-y-3 sm:space-y-4">
            <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-gray-500">Total Fee</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900">₹{student.totalFee?.toLocaleString()}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-green-600">Paid Amount</p>
              <p className="text-base sm:text-xl font-semibold text-green-700">₹{(student.paidAmount || 0).toLocaleString()}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-red-600">Balance</p>
              <p className="text-base sm:text-xl font-semibold text-red-700">₹{(student.balanceAmount || 0).toLocaleString()}</p>
            </div>
            <div className="pt-2">
              <p className="text-xs sm:text-sm text-gray-500">Fee Status</p>
              <span className={`inline-flex px-2 sm:px-3 py-1 text-xs sm:text-sm font-semibold rounded-full ${(student.balanceAmount || 0) <= 0 ? 'bg-green-100 text-green-800' :
                (student.paidAmount || 0) > 0 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                {(student.balanceAmount || 0) <= 0 ? 'COMPLETE' :
                  (student.paidAmount || 0) > 0 ? 'PARTIAL' : 'DUE'}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Fee Breakdown - Full Width */}
      <div className="w-full bg-white rounded-xl shadow-sm p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 flex items-center">
          <FaRupeeSign className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-blue-600" />
          Fee Breakdown
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <p className="text-xs text-gray-500">Tuition Fee</p>
            <div className="bg-blue-50 px-3 py-2 rounded-lg">
              <p className="font-medium text-blue-900 text-sm">₹{(student.tuitionFee || 0).toLocaleString()}</p>
            </div>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">Hostel Fee</p>
            <p className="font-medium text-gray-900 text-sm">₹{(student.hostelFee || 0).toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">Security Fee</p>
            <p className="font-medium text-gray-900 text-sm">₹{(student.securityFee || 0).toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">Miscellaneous Fee</p>
            <p className="font-medium text-gray-900 text-sm">₹{(student.miscellaneousFee || 0).toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">AC Charge</p>
            <p className="font-medium text-gray-900 text-sm">₹{(student.acCharge || 0).toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions - Full Width */}
      <div className="w-full bg-white rounded-xl shadow-sm p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 flex items-center">
          <HiLightningBolt className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-purple-600" />
          Quick Actions
        </h3>
        <div className="flex gap-4">
          <button
            onClick={() => navigate(`/students/edit/${student._id}`)}
            className="flex-1 bg-blue-100 text-blue-700 px-3 py-2 rounded-lg hover:bg-blue-200 transition-colors duration-200 flex items-center justify-center space-x-2 text-sm"
          >
            <HiPencil className="w-4 h-4" />
            <span>Edit Student</span>
          </button>
          <button
            onClick={() => navigate(`/students/fees/${student._id}`)}
            className="flex-1 bg-purple-100 text-purple-700 px-3 py-2 rounded-lg hover:bg-purple-200 transition-colors duration-200 flex items-center justify-center space-x-2 text-sm"
          >
            <HiDocumentText className="w-4 h-4" />
            <span>Fee Details</span>
          </button>
          <button
            onClick={handlePrintReceipt}
            className="flex-1 bg-green-100 text-green-700 px-3 py-2 rounded-lg hover:bg-green-200 transition-colors duration-200 flex items-center justify-center space-x-2 text-sm"
          >
            <HiDocumentText className="w-4 h-4" />
            <span>Print Receipt</span>
          </button>
        </div>
      </div>

      {/* Fee History */}
      <div className="w-full bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center">
            <HiDocumentText className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-indigo-600" />
            Fee History
          </h3>
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fee Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payments</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {fees.map((fee) => (
                <tr key={fee._id || fee.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{fee.feeType}</div>
                    {fee.receiptNumber && (
                      <div className="text-sm text-gray-500">Receipt: {fee.receiptNumber}</div>
                    )}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">₹{fee.amount?.toLocaleString()}</div>
                    {fee.paidAmount > 0 && (
                      <div className="text-sm text-green-600">Paid: ₹{fee.paidAmount?.toLocaleString()}</div>
                    )}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">Due: {fee.dueDate ? (() => {
                      const date = new Date(fee.dueDate);
                      return isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
                    })() : 'N/A'}</div>
                    {fee.paidDate && (
                      <div className="text-sm text-green-600">Paid: {(() => {
                        const date = new Date(fee.paidDate);
                        return isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
                      })()}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${fee.status === 'paid' ? 'bg-green-100 text-green-800' :
                      fee.status === 'due' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                      {fee.status?.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      {fee.status !== 'paid' && (
                        <button
                          onClick={() => handlePayFee(fee._id || fee.id)}
                          disabled={actionLoading}
                          className="text-green-600 hover:text-green-900 disabled:opacity-50 text-xs px-2 py-1 border border-green-600 rounded"
                        >
                          Mark as Paid
                        </button>
                      )}
                      <button
                        onClick={() => handlePrintPaymentReceipt(fee)}
                        className="text-blue-600 hover:text-blue-900 text-xs px-2 py-1 border border-blue-600 rounded flex items-center gap-1"
                      >
                        <HiDocumentText className="w-3 h-3" />
                        Print
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden p-3 sm:p-4">
          <div className="space-y-3 sm:space-y-4">
            {fees.map((fee) => (
              <div key={fee._id || fee.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                {/* Fee Header */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{fee.feeType}</div>
                    {fee.receiptNumber && (
                      <div className="text-xs text-gray-500">Receipt: {fee.receiptNumber}</div>
                    )}
                  </div>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${fee.status === 'paid' ? 'bg-green-100 text-green-800' :
                    fee.status === 'due' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                    {fee.status?.toUpperCase()}
                  </span>
                </div>

                {/* Fee Details */}
                <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
                  <div>
                    <span className="text-gray-500">Amount:</span>
                    <div className="font-medium text-gray-700">₹{fee.amount?.toLocaleString()}</div>
                  </div>
                  {fee.paidAmount > 0 && (
                    <div>
                      <span className="text-gray-500">Paid:</span>
                      <div className="font-medium text-green-600">₹{fee.paidAmount?.toLocaleString()}</div>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500">Due Date:</span>
                    <div className="font-medium text-gray-700">{fee.dueDate ? (() => {
                      const date = new Date(fee.dueDate);
                      return isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
                    })() : 'N/A'}</div>
                  </div>
                  {fee.paidDate && (
                    <div>
                      <span className="text-gray-500">Paid Date:</span>
                      <div className="font-medium text-green-600">{(() => {
                        const date = new Date(fee.paidDate);
                        return isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
                      })()}</div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-gray-100">
                  <div className="flex gap-2">
                    {fee.status !== 'paid' && (
                      <button
                        onClick={() => handlePayFee(fee._id || fee.id)}
                        disabled={actionLoading}
                        className="flex-1 flex items-center justify-center px-3 py-2 text-xs text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors duration-200 disabled:opacity-50"
                      >
                        {actionLoading ? 'Processing...' : 'Mark as Paid'}
                      </button>
                    )}
                    <button
                      onClick={() => handlePrintPaymentReceipt(fee)}
                      className="flex-1 flex items-center justify-center px-3 py-2 text-xs text-blue-600 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors duration-200 gap-1"
                    >
                      <HiDocumentText className="w-3 h-3" />
                      Print Receipt
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {fees.length === 0 && (
          <div className="text-center py-8 sm:py-12">
            <HiDocumentText className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No fee records</h3>
            <p className="mt-1 text-xs sm:text-sm text-gray-500">No fee records found for this student.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDetails;