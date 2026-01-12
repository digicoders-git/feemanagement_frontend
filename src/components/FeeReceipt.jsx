import React from 'react';

const FeeReceipt = ({ student, fees = [], selectedFee = null }) => {
  const formatDate = (dateString) => {
    if (!dateString) return new Date().toLocaleDateString('en-IN');
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  // Calculate paid amounts for each fee type from fee history
  const calculatePaidAmounts = () => {
    const paidAmounts = {
      'Tuition Fee': 0,
      'Hostel Fee': 0,
      'Security Fee': 0,
      'AC Charge': 0,
      'Miscellaneous Fee': 0
    };

    // Calculate from fee history
    fees.forEach(fee => {
      if (fee.status === 'paid' && paidAmounts.hasOwnProperty(fee.feeType)) {
        paidAmounts[fee.feeType] += fee.paidAmount || fee.amount || 0;
      }
    });

    return paidAmounts;
  };

  const paidAmounts = calculatePaidAmounts();
  const totalPaid = Object.values(paidAmounts).reduce((sum, amount) => sum + amount, 0);

  // Get current payment details if selectedFee is provided
  const currentPayment = selectedFee ? {
    feeType: selectedFee.feeType,
    amount: selectedFee.paidAmount || selectedFee.amount || 0,
    paymentMethod: selectedFee.paymentMethod || 'Cash',
    paidDate: selectedFee.paidDate,
    transactionId: selectedFee.transactionId || selectedFee.checkNumber || 'N/A'
  } : null;

  return (
    <div style={{
      width: '100%',
      backgroundColor: 'white',
      padding: '20px',
      fontFamily: 'Arial, sans-serif',
      color: 'black'
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '2px solid black', paddingBottom: '10px' }}>
        <h2 style={{ margin: '0', fontSize: '18px', fontWeight: 'bold' }}>CAREER INSTITUTE OF MEDICAL SCIENCES & HOSPITAL</h2>
        <p style={{ margin: '5px 0', fontSize: '12px' }}>IIM ROAD, GHAILLA LUCKNOW - 226 013</p>
        {/* <p style={{ margin: '5px 0', fontSize: '14px', fontWeight: 'bold' }}>FEE RECEIPT</p> */}
      </div>

      {/* Student Info */}
      <div style={{ marginBottom: '15px' }}>
        <p><strong>Receipt No:</strong> CIMS{Math.floor(Math.random() * 90000) + 10000} &nbsp;&nbsp;&nbsp; <strong>Date:</strong> {formatDate(currentPayment?.paidDate)}</p>
        <p><strong>Name:</strong> {student?.name || 'N/A'} &nbsp;&nbsp;&nbsp; <strong>Roll No:</strong> {student?.rollNumber || 'N/A'}</p>
        <p><strong>Course:</strong> {student?.class || 'MBBS'} &nbsp;&nbsp;&nbsp; <strong>Year:</strong> 2025-26</p>
      </div>

      {/* Current Payment Info */}
      {currentPayment && (
        <div style={{ marginBottom: '15px', padding: '10px', border: '1px solid black', backgroundColor: '#f9f9f9' }}>
          <p style={{ margin: '5px 0', fontWeight: 'bold' }}>CURRENT PAYMENT DETAILS:</p>
          <p style={{ margin: '5px 0' }}><strong>Fee Type:</strong> {currentPayment.feeType} &nbsp;&nbsp;&nbsp; <strong>Amount Paid:</strong> ₹{currentPayment.amount.toLocaleString()}</p>
          <p style={{ margin: '5px 0' }}><strong>Payment Method:</strong> {currentPayment.paymentMethod} &nbsp;&nbsp;&nbsp; <strong>Transaction ID:</strong> {currentPayment.transactionId}</p>
        </div>
      )}

      {/* Fee Table */}
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        border: '2px solid black',
        marginBottom: '20px'
      }}>
        <thead>
          <tr>
            <th style={{
              border: '1px solid black',
              padding: '8px',
              textAlign: 'center',
              backgroundColor: 'white',
              fontWeight: 'bold'
            }}>S.No.</th>
            <th style={{
              border: '1px solid black',
              padding: '8px',
              textAlign: 'left',
              backgroundColor: 'white',
              fontWeight: 'bold'
            }}>Fee Type</th>
            <th style={{
              border: '1px solid black',
              padding: '8px',
              textAlign: 'right',
              backgroundColor: 'white',
              fontWeight: 'bold'
            }}>Total Amount (₹)</th>
            <th style={{
              border: '1px solid black',
              padding: '8px',
              textAlign: 'right',
              backgroundColor: 'white',
              fontWeight: 'bold'
            }}>Paid Amount (₹)</th>
            <th style={{
              border: '1px solid black',
              padding: '8px',
              textAlign: 'right',
              backgroundColor: 'white',
              fontWeight: 'bold'
            }}>Balance Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ border: '1px solid black', padding: '8px', textAlign: 'center' }}>1</td>
            <td style={{ border: '1px solid black', padding: '8px' }}>Tuition Fee</td>
            <td style={{ border: '1px solid black', padding: '8px', textAlign: 'right' }}>{(student?.tuitionFee || 0).toLocaleString()}</td>
            <td style={{ border: '1px solid black', padding: '8px', textAlign: 'right' }}>{paidAmounts['Tuition Fee'].toLocaleString()}</td>
            <td style={{ border: '1px solid black', padding: '8px', textAlign: 'right' }}>{Math.max(0, (student?.tuitionFee || 0) - paidAmounts['Tuition Fee']).toLocaleString()}</td>
          </tr>
          <tr>
            <td style={{ border: '1px solid black', padding: '8px', textAlign: 'center' }}>2</td>
            <td style={{ border: '1px solid black', padding: '8px' }}>Hostel Fee</td>
            <td style={{ border: '1px solid black', padding: '8px', textAlign: 'right' }}>{(student?.hostelFee || 0).toLocaleString()}</td>
            <td style={{ border: '1px solid black', padding: '8px', textAlign: 'right' }}>{paidAmounts['Hostel Fee'].toLocaleString()}</td>
            <td style={{ border: '1px solid black', padding: '8px', textAlign: 'right' }}>{Math.max(0, (student?.hostelFee || 0) - paidAmounts['Hostel Fee']).toLocaleString()}</td>
          </tr>
          <tr>
            <td style={{ border: '1px solid black', padding: '8px', textAlign: 'center' }}>3</td>
            <td style={{ border: '1px solid black', padding: '8px' }}>Security Fee</td>
            <td style={{ border: '1px solid black', padding: '8px', textAlign: 'right' }}>{(student?.securityFee || 0).toLocaleString()}</td>
            <td style={{ border: '1px solid black', padding: '8px', textAlign: 'right' }}>{paidAmounts['Security Fee'].toLocaleString()}</td>
            <td style={{ border: '1px solid black', padding: '8px', textAlign: 'right' }}>{Math.max(0, (student?.securityFee || 0) - paidAmounts['Security Fee']).toLocaleString()}</td>
          </tr>
          <tr>
            <td style={{ border: '1px solid black', padding: '8px', textAlign: 'center' }}>4</td>
            <td style={{ border: '1px solid black', padding: '8px' }}>AC Charge</td>
            <td style={{ border: '1px solid black', padding: '8px', textAlign: 'right' }}>{(student?.acCharge || 0).toLocaleString()}</td>
            <td style={{ border: '1px solid black', padding: '8px', textAlign: 'right' }}>{paidAmounts['AC Charge'].toLocaleString()}</td>
            <td style={{ border: '1px solid black', padding: '8px', textAlign: 'right' }}>{Math.max(0, (student?.acCharge || 0) - paidAmounts['AC Charge']).toLocaleString()}</td>
          </tr>
          <tr>
            <td style={{ border: '1px solid black', padding: '8px', textAlign: 'center' }}>5</td>
            <td style={{ border: '1px solid black', padding: '8px' }}>Miscellaneous Fee</td>
            <td style={{ border: '1px solid black', padding: '8px', textAlign: 'right' }}>{(student?.miscellaneousFee || 0).toLocaleString()}</td>
            <td style={{ border: '1px solid black', padding: '8px', textAlign: 'right' }}>{paidAmounts['Miscellaneous Fee'].toLocaleString()}</td>
            <td style={{ border: '1px solid black', padding: '8px', textAlign: 'right' }}>{Math.max(0, (student?.miscellaneousFee || 0) - paidAmounts['Miscellaneous Fee']).toLocaleString()}</td>
          </tr>
          <tr style={{ backgroundColor: 'white', fontWeight: 'bold' }}>
            <td colSpan="2" style={{ border: '1px solid black', padding: '8px', textAlign: 'center' }}>TOTAL AMOUNT</td>
            <td style={{ border: '1px solid black', padding: '8px', textAlign: 'right' }}>₹{(student?.totalFee || 0).toLocaleString()}</td>
            <td style={{ border: '1px solid black', padding: '8px', textAlign: 'right' }}>₹{totalPaid.toLocaleString()}</td>
            <td style={{ border: '1px solid black', padding: '8px', textAlign: 'right' }}>₹{Math.max(0, (student?.totalFee || 0) - totalPaid).toLocaleString()}</td>
          </tr>
        </tbody>
      </table>

      {/* Payment Details */}
      <div style={{ marginBottom: '20px' }}>
        <p><strong>Payment Method:</strong> {currentPayment?.paymentMethod || '________________'} &nbsp;&nbsp;&nbsp; <strong>Amount Paid:</strong> ₹{currentPayment?.amount.toLocaleString() || '________________'}</p>
        <p><strong>Cheque/DD/Transaction ID:</strong> {currentPayment?.transactionId || '________________'} &nbsp;&nbsp;&nbsp; <strong>Bank:</strong> ________________</p>
        <p><strong>Amount in Words:</strong> ________________________________________________</p>
      </div>

      {/* Footer */}
      {/* <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px', borderTop: '1px solid black', paddingTop: '10px' }}>
        <div>
          <p style={{ fontSize: '10px', margin: '0' }}>* Subject to encashment of cheque</p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ borderTop: '1px solid black', width: '150px', marginBottom: '5px' }}></div>
          <p style={{ margin: '0', fontSize: '12px', fontWeight: 'bold' }}>Authorised Signatory</p>
        </div>
      </div> */}
    </div>
  );
};

export default FeeReceipt;