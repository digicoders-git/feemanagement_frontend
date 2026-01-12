import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { feeAPI, studentAPI, notificationAPI } from '../../utils/api';
import PrintReceipt from '../../components/PrintReceipt';
import toast from 'react-hot-toast';
import Loader from '../../components/Loader';
import { HiArrowLeft, HiUser, HiDocumentText, HiLightningBolt, HiPrinter, HiChatAlt, HiChevronDown } from 'react-icons/hi';
import { FaRupeeSign } from 'react-icons/fa';
import * as XLSX from 'xlsx';

const FeeDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [fee, setFee] = useState(location.state?.fee || null);
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(!fee);
  const [actionLoading, setActionLoading] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printType, setPrintType] = useState('receipt');


  useEffect(() => {
    if (!fee) {
      loadFeeDetails();
    } else if (fee && !student) {
      loadStudentDetails();
    }
  }, [id, fee]);

  useEffect(() => {
    if (fee && fee.studentId && !student) {
      loadStudentDetails();
    }
  }, [fee, student]);

  const loadFeeDetails = async () => {
    try {
      setLoading(true);
      const response = await feeAPI.getById(id);
      const feeData = response.data.data || response.data;

      if (feeData) {
        setFee(feeData);
        // Check if student data is populated or just ID
        if (feeData.studentId) {
          if (typeof feeData.studentId === 'object') {
            setStudent(feeData.studentId);
          } else {
            // Load student details separately if only ID is provided
            loadStudentDetails(feeData.studentId);
          }
        }
      } else {
        setFee(null);
      }
    } catch (error) {
      // console.error('Error loading fee details:', error);
      setFee(null);
    } finally {
      setLoading(false);
    }
  };

  const loadStudentDetails = async (studentId = fee?.studentId?._id || fee?.studentId) => {
    try {
      if (studentId && typeof studentId === 'string') {
        const response = await studentAPI.getById(studentId);
        setStudent(response.data.data || response.data);
      } else if (fee?.studentId && typeof fee.studentId === 'object') {
        // Student data is already populated in fee object
        setStudent(fee.studentId);
      }
    } catch (error) {
      // console.error('Error loading student details:', error);
    }
  };

  const handlePayment = async () => {
    if (!fee) return;

    setActionLoading(true);
    try {
      await feeAPI.payFee(fee._id, {
        paidAmount: fee.amount,
        paymentMethod: 'cash'
      });
      toast.success('Payment recorded successfully!');
      
      // Reload fee details and force refresh
      await loadFeeDetails();
      
      // Navigate back to student fees page to see updated status
      setTimeout(() => {
        navigate(`/students/fees/${fee.studentId?._id || fee.studentId}`);
      }, 1000);
      
    } catch (error) {
      // console.error('Error recording payment:', error);
      toast.error('Error recording payment');
    } finally {
      setActionLoading(false);
    }
  };

  // const handleSendReminder = async () => {
  //   if (!fee) {
  //     toast.error('Fee data not available');
  //     return;
  //   }

  //   const studentData = student || fee.studentId;
  //   if (!studentData) {
  //     toast.error('Student data not available');
  //     return;
  //   }

  //   if (!studentData.phone && !studentData.email) {
  //     toast.error('No contact information available');
  //     return;
  //   }

  //   setActionLoading(true);
  //   try {
  //     const dueAmount = (fee.amount || 0) - (fee.paidAmount || 0);
  //     const dueDate = fee.dueDate ? new Date(fee.dueDate).toLocaleDateString('en-IN') : 'soon';
  //     const message = `Dear ${studentData.name}, your ${fee.feeType} payment of ₹${dueAmount.toLocaleString()} is due on ${dueDate}. Please pay at your earliest convenience.`;

  //     if (studentData.phone) {
  //       await notificationAPI.sendSMS({
  //         phone: studentData.phone,
  //         message: message,
  //         studentName: studentData.name,
  //         amount: dueAmount,
  //         dueDate: fee.dueDate,
  //         feeType: fee.feeType,
  //         email: studentData.email
  //       });
  //     } else if (studentData.email) {
  //       await notificationAPI.sendEmail({
  //         to: studentData.email,
  //         subject: `Fee Payment Reminder - ${fee.feeType}`,
  //         message: message,
  //         studentName: studentData.name,
  //         amount: dueAmount,
  //         dueDate: fee.dueDate,
  //         feeType: fee.feeType
  //       });
  //     }

  //     toast.success('Reminder sent successfully!');
  //   } catch (error) {
  //     console.error('Error sending reminder:', error);
  //     const errorMessage = error.response?.data?.message || error.message || 'Failed to send reminder';
  //     toast.error(errorMessage);
  //   } finally {
  //     setActionLoading(false);
  //   }
  // };

  const handleExcelDownload = async () => {
    const receiptNumber = `CIMS00${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;
    
    // Fetch all fee records for this student if it's a Total fee payment
    let allFeeRecords = [];
    if (fee.feeType === 'Total fee' && (fee.studentId?._id || fee.studentId)) {
      try {
        const feesResponse = await feeAPI.getByStudentId(fee.studentId?._id || fee.studentId);
        allFeeRecords = feesResponse.data.fees || feesResponse.data.data || [];
      } catch (error) {
        // console.error('Error fetching fee records:', error);
      }
    }
    
    // Calculate paid amounts for each fee type
    const getPaidAmount = (feeType) => {
      if (fee.feeType === 'Total fee') {
        return allFeeRecords
          .filter(f => f.feeType === feeType && f.status === 'paid')
          .reduce((sum, f) => sum + (f.paidAmount || f.amount || 0), 0);
      } else {
        return fee.feeType === feeType ? (fee.amount || 0) : 0;
      }
    };
    
    const printWindow = window.open('', '_blank', 'width=800,height=600');

    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="UTF-8">
          <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { font-family: Arial, sans-serif; background: white; color: #000; padding: 10px; }
              .print-btn { background: #000; color: white; padding: 10px 20px; border: none; border-radius: 5px; margin: 10px; cursor: pointer; }
              @media print {
                  body { margin: 0; background: white; padding: 5px; }
                  .print-btn { display: none; }
                  .receipt-container { page-break-inside: avoid; }
              }
              @page { size: A4; margin: 10mm; }
          </style>
      </head>
      <body>
          <div style="text-align: center;">
              <button class="print-btn" onclick="window.print()">Print Receipt</button>
          </div>
          
          <div class="receipt-container" style="
            width: 100%;
            max-width: 280mm;
            margin: 0 auto;
            background: #ffffff;
            border: 2px solid #000;
            padding: 12px;
            position: relative;
            font-size: 11px;
            box-sizing: border-box;
          ">
            
            <!-- Header -->
            <div style="
              display: flex;
              align-items: center;
              gap: 8px;
              margin-bottom: 8px;
              padding-bottom: 6px;
              border-bottom: 2px solid #000;
              position: relative;
              z-index: 2;
            ">
              <div style="
                width: 40px;
                height: 40px;
                border: 2px solid #000;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                background: white;
                flex-shrink: 0;
              ">
                <img src="/src/assets/logo.png" alt="College Logo" style="width: 30px; height: 30px; border-radius: 50%; object-fit: contain;" onerror="this.innerHTML='⚕️'; this.style.fontSize='18px'; this.style.color='#000';">
              </div>
              <div style="flex-grow: 1; text-align: center;">
                <h1 style="
                  color: #000;
                  font-size: 14px;
                  font-weight: bold;
                  margin-bottom: 3px;
                  letter-spacing: 0.3px;
                  line-height: 1.2;
                ">CAREER INSTITUTE OF MEDICAL SCIENCES & HOSPITAL</h1>
                <p style="color: #000; font-size: 10px; margin-bottom: 2px; line-height: 1.1;">IIM ROAD, GHAILLA LUCKNOW - 226 013</p>
                <p style="color: #000; font-size: 9px; font-weight: 600;">(STUDENT FILE COPY)</p>
              </div>
            </div>

            <!-- Receipt Details -->
            <div style="margin-bottom: 10px; position: relative; z-index: 2;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 5px; flex-wrap: wrap;">
                <div style="display: flex; align-items: center; gap: 4px;">
                  <span style="color: #000; font-size: 11px; font-weight: 600;">Receipt No.</span>
                  <span style="border-bottom: 1px dotted #000; padding: 2px 4px; font-size: 11px; color: #000; min-width: 60px;">${receiptNumber}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 4px; margin-left: auto;">
                  <span style="color: #000; font-size: 11px; font-weight: 600;">Date</span>
                  <span style="border-bottom: 1px dotted #000; padding: 2px 4px; font-size: 11px; color: #000;">${new Date().toLocaleDateString('en-IN')}</span>
                </div>
              </div>
              
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 5px;">
                <div style="display: flex; align-items: center; gap: 4px;">
                  <span style="color: #000; font-size: 11px; font-weight: 600;">F.Y.</span>
                  <span style="border-bottom: 1px dotted #000; padding: 2px 4px; font-size: 11px; color: #000; min-width: 60px;">2025-26</span>
                </div>
              </div>

              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 5px; flex-wrap: wrap;">
                <span style="color: #000; font-size: 11px; font-weight: 600;">Name</span>
                <span style="border-bottom: 1px dotted #000; padding: 2px 4px; font-size: 11px; color: #000; min-width: 140px; word-break: break-word;">${fee.studentId?.name || student?.name || 'N/A'}</span>
                <span style="color: #000; font-size: 11px; font-weight: 600;">Batch :</span>
                <span style="border-bottom: 1px dotted #000; padding: 2px 4px; font-size: 11px; color: #000; min-width: 70px;">${fee.studentId?.class || student?.class || 'MBBS'}</span>
                <span style="color: #000; font-size: 11px; font-weight: 600;">Year</span>
                <span style="border-bottom: 1px dotted #000; padding: 2px 4px; font-size: 11px; color: #000; min-width: 50px;">1st</span>
              </div>
              
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 5px; flex-wrap: wrap;">
                <span style="color: #000; font-size: 11px; font-weight: 600;">Roll No:</span>
                <span style="border-bottom: 1px dotted #000; padding: 2px 4px; font-size: 11px; color: #000; min-width: 90px;">${fee.studentId?.rollNumber || student?.rollNumber || 'N/A'}</span>
                <span style="color: #000; font-size: 11px; font-weight: 600;">Phone:</span>
                <span style="border-bottom: 1px dotted #000; padding: 2px 4px; font-size: 11px; color: #000; min-width: 100px; word-break: break-all;">${fee.studentId?.phone || student?.phone || 'N/A'}</span>
              </div>
              
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 5px; flex-wrap: wrap;">
                <span style="color: #000; font-size: 11px; font-weight: 600;">Email:</span>
                <span style="border-bottom: 1px dotted #000; padding: 2px 4px; font-size: 11px; color: #000; min-width: 140px; word-break: break-all;">${fee.studentId?.email || student?.email || 'N/A'}</span>
              </div>
              
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 5px; flex-wrap: wrap;">
                <span style="color: #000; font-size: 11px; font-weight: 600;">Guardian Name:</span>
                <span style="border-bottom: 1px dotted #000; padding: 2px 4px; font-size: 11px; color: #000; min-width: 140px; word-break: break-word;">${fee.studentId?.parentName || student?.guardianName || fee.studentId?.fatherName || student?.fatherName || 'N/A'}</span>
              </div>
              
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 5px; flex-wrap: wrap;">
                <span style="color: #000; font-size: 11px; font-weight: 600;">Guardian Phone:</span>
                <span style="border-bottom: 1px dotted #000; padding: 2px 4px; font-size: 11px; color: #000; min-width: 120px; word-break: break-all;">${fee.studentId?.guardianPhone || student?.guardianPhone || fee.studentId?.parentPhone || student?.parentPhone || 'N/A'}</span>
              </div>
              
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 5px; flex-wrap: wrap;">
                <span style="color: #000; font-size: 11px; font-weight: 600;">Address:</span>
                <span style="border-bottom: 1px dotted #000; padding: 2px 4px; font-size: 11px; color: #000; min-width: 180px; word-break: break-word;">${fee.studentId?.address || student?.address || 'N/A'}</span>
              </div>
            </div>

            <!-- Fee Table -->
            <div style="margin-bottom: 10px; border: 2px solid #000; position: relative; z-index: 2;">
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background: white;">
                    <th style="color: #000; font-size: 11px; font-weight: bold; padding: 5px; text-align: center; border: 1px solid #000; width: 8%;">S.No.</th>
                    <th style="color: #000; font-size: 11px; font-weight: bold; padding: 5px; text-align: center; border: 1px solid #000; width: 62%;">Fee Structure</th>
                    <th style="color: #000; font-size: 11px; font-weight: bold; padding: 5px; text-align: center; border: 1px solid #000; width: 30%;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td style="text-align: center; padding: 4px; color: #000; font-size: 10px; border: 1px solid #000;">1</td><td style="padding: 4px 8px; color: #000; font-size: 10px; border: 1px solid #000;">Tuition Fee</td><td style="text-align: right; padding: 4px 8px; font-size: 10px; color: #000; border: 1px solid #000;">${getPaidAmount('Tuition Fee').toLocaleString()}</td></tr>
                  <tr><td style="text-align: center; padding: 4px; color: #000; font-size: 10px; border: 1px solid #000;">2</td><td style="padding: 4px 8px; color: #000; font-size: 10px; border: 1px solid #000;">Hostel Fee (Ac/Non Ac)</td><td style="text-align: right; padding: 4px 8px; font-size: 10px; color: #000; border: 1px solid #000;">${getPaidAmount('Hostel Fee').toLocaleString()}</td></tr>
                  <tr><td style="text-align: center; padding: 4px; color: #000; font-size: 10px; border: 1px solid #000;">3</td><td style="padding: 4px 8px; color: #000; font-size: 10px; border: 1px solid #000;">Examination Fees</td><td style="text-align: right; padding: 4px 8px; font-size: 10px; color: #000; border: 1px solid #000;">${getPaidAmount('Examination Fee').toLocaleString()}</td></tr>
                  <tr><td style="text-align: center; padding: 4px; color: #000; font-size: 10px; border: 1px solid #000;">4</td><td style="padding: 4px 8px; color: #000; font-size: 10px; border: 1px solid #000;">Security Fee</td><td style="text-align: right; padding: 4px 8px; font-size: 10px; color: #000; border: 1px solid #000;">${getPaidAmount('Security Fee').toLocaleString()}</td></tr>
                  <tr><td style="text-align: center; padding: 4px; color: #000; font-size: 10px; border: 1px solid #000;">5</td><td style="padding: 4px 8px; color: #000; font-size: 10px; border: 1px solid #000;">AC Charge</td><td style="text-align: right; padding: 4px 8px; font-size: 10px; color: #000; border: 1px solid #000;">${getPaidAmount('AC Charge').toLocaleString()}</td></tr>
                  <tr><td style="text-align: center; padding: 4px; color: #000; font-size: 10px; border: 1px solid #000;">6</td><td style="padding: 4px 8px; color: #000; font-size: 10px; border: 1px solid #000;">Miscellaneous Fee</td><td style="text-align: right; padding: 4px 8px; font-size: 10px; color: #000; border: 1px solid #000;">${getPaidAmount('Miscellaneous Fee').toLocaleString()}</td></tr>
                  <tr><td style="text-align: center; padding: 4px; color: #000; font-size: 10px; border: 1px solid #000;">7</td><td style="padding: 4px 8px; color: #000; font-size: 10px; border: 1px solid #000;">Fine</td><td style="text-align: right; padding: 4px 8px; font-size: 10px; color: #000; border: 1px solid #000;">${getPaidAmount('Fine').toLocaleString()}</td></tr>
                  <tr style="background: white; font-weight: bold;">
                    <td colspan="2" style="text-align: center; padding: 5px; color: #000; font-size: 11px; font-weight: bold; border: 1px solid #000;">TOTAL AMOUNT</td>
                    <td style="text-align: right; padding: 5px 8px; color: #000; font-size: 11px; font-weight: bold; border: 1px solid #000;">${fee.amount?.toLocaleString() || 0}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Payment Details -->
            <div style="margin-bottom: 10px; position: relative; z-index: 2;">
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 5px; flex-wrap: wrap;">
                <span style="color: #000; font-size: 11px; font-weight: 600;">Cash/D.D./Cheque No.</span>
                <span style="border-bottom: 1px dotted #000; padding: 2px 4px; font-size: 11px; color: #000; min-width: 100px; word-break: break-all;">${fee.checkNumber || ''}</span>
                <span style="color: #000; font-size: 11px; font-weight: 600;">Date</span>
                <span style="border-bottom: 1px dotted #000; padding: 2px 4px; font-size: 11px; color: #000;">${fee.paidDate ? new Date(fee.paidDate).toLocaleDateString('en-IN') : ''}</span>
                <span style="color: #000; font-size: 11px; font-weight: 600;">Rs.</span>
                <span style="border-bottom: 1px dotted #000; padding: 2px 4px; font-size: 11px; color: #000; min-width: 100px;">${fee.amount?.toLocaleString() || 0}</span>
              </div>
              
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 5px;">
                <span style="color: #000; font-size: 11px; font-weight: 600;">Transaction ID:</span>
                <span style="border-bottom: 1px dotted #000; padding: 2px 4px; font-size: 11px; color: #000; min-width: 120px; word-break: break-all;">${fee.transactionId || ''}</span>
              </div>
              
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 5px;">
                <span style="color: #000; font-size: 11px; font-weight: 600;">(in words)</span>
                <span style="flex: 1; border-bottom: 1px dotted #000; padding: 2px 4px; font-size: 11px; color: #000; min-width: 120px;"></span>
              </div>
              
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 5px;">
                <span style="color: #000; font-size: 11px; font-weight: 600;">Bank Name</span>
                <span style="flex: 1; border-bottom: 1px dotted #000; padding: 2px 4px; font-size: 11px; color: #000; min-width: 120px; word-break: break-word;">${fee.bankName || ''}</span>
              </div>
              
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 5px;">
                <span style="color: #000; font-size: 11px; font-weight: 600;">Receiver's Name :</span>
                <span style="border-bottom: 1px dotted #000; padding: 2px 4px; font-size: 11px; color: #000; min-width: 140px;"></span>
              </div>
              
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 5px;">
                <span style="color: #000; font-size: 11px; font-weight: 600;">Receiver's Signature :</span>
                <span style="flex: 1; border-bottom: 1px dotted #000; height: 25px; min-width: 120px;"></span>
              </div>
            </div>

            <!-- Footer -->
            <div style="
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              margin-top: 12px;
              padding-top: 10px;
              border-top: 1px solid #000;
              position: relative;
              z-index: 2;
            ">
         
              <div style="text-align: right;">
                <div style="
                  color: #000;
                  font-size: 11px;
                  font-weight: 600;
                  padding-top: 25px;
                  border-top: 1px solid #000;
                  min-width: 120px;
                  text-align: center;
                ">Authorised Signatory</div>
              </div>
            </div>
          </div>
      </body>
      </html>
    `;

    printWindow.document.write(receiptHTML);
    printWindow.document.close();
    toast.success('Receipt opened!');
  };

  const handlePrintReceipt = (type = 'receipt') => {
    setPrintType(type);
    setShowPrintModal(true);
  };

  const handleQuickPrint = () => {
    const printWindow = window.open('', '_blank');
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
            .details { display: flex; justify-content: space-between; margin-bottom: 20px; }
            .section { width: 48%; }
            .amount { text-align: center; font-size: 24px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>CAREER MEDICAL COLLEGE</h1>
            <h2>Fee Receipt</h2>
            <p>Receipt No: CMC-${fee._id?.slice(-6).toUpperCase()} | Date: ${new Date().toLocaleDateString('en-IN')}</p>
          </div>
          <div class="details">
            <div class="section">
              <h3>Student Details</h3>
              <p><strong>Name:</strong> ${fee.studentId?.name || student?.name}</p>
              <p><strong>Roll No:</strong> ${fee.studentId?.rollNumber || student?.rollNumber}</p>
              <p><strong>Class:</strong> ${fee.studentId?.class || student?.class}</p>
            </div>
            <div class="section">
              <h3>Fee Details</h3>
              <p><strong>Fee Type:</strong> ${fee.feeType}</p>
              <p><strong>Due Date:</strong> ${fee.dueDate ? new Date(fee.dueDate).toLocaleDateString('en-IN') : 'N/A'}</p>
              <p><strong>Status:</strong> ${fee.status?.toUpperCase()}</p>
            </div>
          </div>
          <div class="amount">
            Amount: ₹${fee.amount?.toLocaleString()}
            ${fee.status === 'paid' ? '<br><span style="color: green;">✓ PAID</span>' : '<br><span style="color: red;">⚠ PENDING</span>'}
          </div>
          <div class="footer">
            <p>Career Medical College | www.careermedical.in</p>
          </div>
        </body>
      </html>
    `;
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
    printWindow.close();
  };

  if (loading) return <Loader />;

  if (!fee) {
    return (
      <div className="w-full max-w-full overflow-x-hidden min-h-screen bg-gray-50 p-3 sm:p-4 lg:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-8 sm:py-12">
            <h3 className="text-base sm:text-lg font-medium text-gray-900">Fee record not found</h3>
            <button
              onClick={() => navigate('/fees/show')}
              className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 text-sm sm:text-base"
            >
              Back to Fees
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden min-h-screen bg-gray-50 p-3 sm:p-4 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Fee Details</h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">Complete fee information for {fee.studentId?.name || student?.name || 'Student'}</p>
          </div>
          <button
            onClick={() => navigate('/fees/show')}
            className="bg-gray-500 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors duration-200 flex items-center justify-center space-x-2 text-sm sm:text-base w-full sm:w-auto"
          >
            <HiArrowLeft className="w-4 h-4" />
            <span>Back to Fees</span>
          </button>
        </div>

        {/* Fee Information Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Student & Fee Info */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
              <HiUser className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-blue-600" />
              Student Information
            </h3>
            <div className="space-y-2 sm:space-y-3">
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                <span className="text-xs sm:text-sm text-gray-500">Student Name</span>
                <span className="font-medium text-gray-900 text-sm sm:text-base break-words">{fee.studentId?.name || student?.name || 'N/A'}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                <span className="text-xs sm:text-sm text-gray-500">Roll Number</span>
                <span className="font-medium text-gray-900 text-sm sm:text-base">{fee.studentId?.rollNumber || student?.rollNumber || 'N/A'}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                <span className="text-xs sm:text-sm text-gray-500">Department</span>
                <span className="font-medium text-gray-900 text-sm sm:text-base">{fee.studentId?.class || student?.class || 'N/A'}</span>
              </div>
              {(student || fee.studentId) && (
                <>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                    <span className="text-xs sm:text-sm text-gray-500">Phone</span>
                    <span className="font-medium text-gray-900 text-sm sm:text-base break-all">{fee.studentId?.phone || student?.phone || 'N/A'}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                    <span className="text-xs sm:text-sm text-gray-500">Email</span>
                    <span className="font-medium text-gray-900 text-sm sm:text-base break-all">{fee.studentId?.email || student?.email || 'N/A'}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Payment Details */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
              <FaRupeeSign className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-green-600" />
              Payment Information
            </h3>
            <div className="space-y-2 sm:space-y-3">
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                <span className="text-xs sm:text-sm text-gray-500">Fee Type</span>
                <span className="font-medium text-gray-900 text-sm sm:text-base">{fee.feeType}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                <span className="text-xs sm:text-sm text-gray-500">Total Amount</span>
                <span className="font-medium text-gray-900 text-sm sm:text-base">₹{fee.amount?.toLocaleString()}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                <span className="text-xs sm:text-sm text-gray-500">Paid Amount</span>
                <span className="font-medium text-green-600 text-sm sm:text-base">₹{fee.paidAmount?.toLocaleString()}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                <span className="text-xs sm:text-sm text-gray-500">Balance Amount</span>
                <span className="font-medium text-red-600 text-sm sm:text-base">₹{((fee.amount || 0) - (fee.paidAmount || 0)).toLocaleString()}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
                <span className="text-xs sm:text-sm text-gray-500">Status</span>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full w-fit ${fee.status === 'paid' ? 'bg-green-100 text-green-800' :
                  fee.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                  {fee.status?.toUpperCase()}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                <span className="text-xs sm:text-sm text-gray-500">Due Date</span>
                <span className="font-medium text-gray-900 text-sm sm:text-base">{fee.dueDate ? new Date(fee.dueDate).toLocaleDateString('en-IN') : 'N/A'}</span>
              </div>
              {fee.paidDate && (
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                  <span className="text-xs sm:text-sm text-gray-500">Payment Date</span>
                  <span className="font-medium text-gray-900 text-sm sm:text-base">{new Date(fee.paidDate).toLocaleDateString('en-IN')}</span>
                </div>
              )}
              {fee.paymentMethod && (
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                  <span className="text-xs sm:text-sm text-gray-500">Payment Method</span>
                  <span className="font-medium text-gray-900 text-sm sm:text-base">{fee.paymentMethod}</span>
                </div>
              )}
              {fee.transactionId && (
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                  <span className="text-xs sm:text-sm text-gray-500">Transaction ID</span>
                  <span className="font-medium text-gray-900 text-sm sm:text-base">{fee.transactionId}</span>
                </div>
              )}
              {fee.checkNumber && (
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                  <span className="text-xs sm:text-sm text-gray-500">Check/DD Number</span>
                  <span className="font-medium text-gray-900 text-sm sm:text-base">{fee.checkNumber}</span>
                </div>
              )}
              {fee.bankName && (
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                  <span className="text-xs sm:text-sm text-gray-500">Bank Name</span>
                  <span className="font-medium text-gray-900 text-sm sm:text-base">{fee.bankName}</span>
                </div>
              )}
              {fee.receiptNumber && (
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                  <span className="text-xs sm:text-sm text-gray-500">Receipt Number</span>
                  <span className="font-medium text-gray-900 text-sm sm:text-base break-all">{fee.receiptNumber}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Remarks */}
        {fee.remarks && (
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
              <HiDocumentText className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-purple-600" />
              Remarks
            </h3>
            <p className="text-gray-700 text-sm sm:text-base break-words">{fee.remarks}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
            <HiLightningBolt className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-indigo-600" />
            Actions
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {((fee.amount || 0) - (fee.paidAmount || 0)) > 0 && (
              <button
                onClick={handlePayment}
                disabled={actionLoading}
                className="bg-green-500 text-white px-3 sm:px-4 py-2 sm:py-3 rounded-lg hover:bg-green-600 transition-colors duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 text-sm sm:text-base"
              >
                <FaRupeeSign className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>Record Payment</span>
              </button>
            )}

            <button
              onClick={handleExcelDownload}
              className="bg-blue-500 text-white px-3 sm:px-4 py-2 sm:py-3 rounded-lg hover:bg-blue-600 transition-colors duration-200 flex items-center justify-center space-x-2 text-sm sm:text-base"
            >
              <HiPrinter className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Print Receipt</span>
            </button>

            {/* <button
              onClick={handleSendReminder}
              disabled={actionLoading}
              className="bg-yellow-500 text-white px-3 sm:px-4 py-2 sm:py-3 rounded-lg hover:bg-yellow-600 transition-colors duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 text-sm sm:text-base"
            >
              <HiChatAlt className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="truncate">{actionLoading ? 'Sending...' : 'Send Reminder'}</span>
            </button> */}

            <button
              onClick={() => navigate(`/students/details/${fee.studentId?._id || fee.studentId}`)}
              className="bg-purple-500 text-white px-3 sm:px-4 py-2 sm:py-3 rounded-lg hover:bg-purple-600 transition-colors duration-200 flex items-center justify-center space-x-2 text-sm sm:text-base"
            >
              <HiUser className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Student Details</span>
            </button>
          </div>
        </div>

        {/* Print Receipt Modal */}
        {showPrintModal && fee && (
          <PrintReceipt
            fee={fee}
            student={student}
            printType={printType}
            onClose={() => setShowPrintModal(false)}
          />
        )}
      </div>
    </div>
  );
};

export default FeeDetails;