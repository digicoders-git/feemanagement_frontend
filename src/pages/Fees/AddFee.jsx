import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import toast from 'react-hot-toast';
import { feeAPI, studentAPI } from '../../utils/api';
import { useRole } from '../../context/RoleContext';
import Loader from '../../components/Loader';
import { HiRefresh, HiArrowLeft, HiPlus } from 'react-icons/hi';

// Fee Balance Display Component
const FeeBalanceDisplay = ({ studentId, feeType, selectedStudent }) => {
  const [balanceInfo, setBalanceInfo] = useState(null);

  useEffect(() => {
    const fetchBalanceInfo = async () => {
      if (!studentId || !feeType || feeType === 'Fine') return;
      
      try {
        const [studentResponse, feesResponse] = await Promise.all([
          studentAPI.getById(studentId),
          feeAPI.getByStudentId(studentId)
        ]);
        
        const student = studentResponse.data.data || studentResponse.data;
        const feesData = feesResponse.data.fees || feesResponse.data.data || [];
        
        if (feeType === 'Total fee') {
          const totalAmount = (
            (student.tuitionFee || 0) +
            (student.hostelFee || 0) +
            (student.securityFee || 0) +
            (student.acCharge || 0) +
            (student.miscellaneousFee || 0)
          );
          
          const totalPaidAmount = feesData
            .filter(f => f.status === 'paid')
            .reduce((sum, f) => sum + (f.paidAmount || f.amount || 0), 0);
          
          const balanceAmount = Math.max(0, totalAmount - totalPaidAmount);
          setBalanceInfo({ totalAmount, paidAmount: totalPaidAmount, balanceAmount });
        } else {
          let specificFeeAmount = 0;
          switch(feeType) {
            case 'Tuition Fee': specificFeeAmount = student.tuitionFee || 0; break;
            case 'Hostel Fee': specificFeeAmount = student.hostelFee || 0; break;
            case 'Security Fee': specificFeeAmount = student.securityFee || 0; break;
            case 'AC Charge': specificFeeAmount = student.acCharge || 0; break;
            case 'Miscellaneous Fee': specificFeeAmount = student.miscellaneousFee || 0; break;
          }
          
          const paidForThisFeeType = feesData
            .filter(f => f.feeType === feeType && f.status === 'paid')
            .reduce((sum, f) => sum + (f.paidAmount || f.amount || 0), 0);
          
          const balanceAmount = Math.max(0, specificFeeAmount - paidForThisFeeType);
          setBalanceInfo({ totalAmount: specificFeeAmount, paidAmount: paidForThisFeeType, balanceAmount });
        }
      } catch (error) {
        // console.error('Error fetching balance info:', error);
      }
    };

    fetchBalanceInfo();
  }, [studentId, feeType]);

  if (!balanceInfo || feeType === 'Fine') return null;

  return (
    <div className="text-xs text-gray-600 space-y-1">
      <div className="flex justify-between">
        <span>Total:</span>
        <span>₹{balanceInfo.totalAmount.toLocaleString()}</span>
      </div>
      <div className="flex justify-between">
        <span>Paid:</span>
        <span className="text-green-600">₹{balanceInfo.paidAmount.toLocaleString()}</span>
      </div>
      <div className="flex justify-between font-medium">
        <span>Balance:</span>
        <span className={balanceInfo.balanceAmount > 0 ? 'text-red-600' : 'text-green-600'}>
          ₹{balanceInfo.balanceAmount.toLocaleString()}
        </span>
      </div>
    </div>
  );
};

const AddFee = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission, isSuperAdmin } = useRole();
  
  // Check if user has fee management permission
  if (!isSuperAdmin() && !hasPermission('feeManagement')) {
    return (
      <div className="w-full max-w-full overflow-x-hidden min-h-screen bg-gray-50 p-3 sm:p-4 lg:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-8 sm:py-12">
            <h3 className="text-base sm:text-lg font-medium text-gray-900">Access Denied</h3>
            <p className="text-gray-600 mt-2">You don't have permission to add fees.</p>
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
  const [formData, setFormData] = useState({
    studentId: '',
    selectedFeeTypes: [], // Changed from single feeType to array
    feeAmounts: {}, // Object to store amounts for each fee type
    dueDate: '',
    description: '',
    status: 'paid',
    paymentMethod: '',
    transactionId: '',
    checkNumber: '',
    bankName: '',
    paidDate: new Date().toISOString().split('T')[0] // Use ISO format for date input
  });

  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [maxFeeAmount, setMaxFeeAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingStudents, setFetchingStudents] = useState(true);
  const [paidFeeTypes, setPaidFeeTypes] = useState([]);
  const [fullyPaidStudents, setFullyPaidStudents] = useState([]);

  const paymentMethods = [
    'Cash',
    'Cheque/DD',
    'UPI/Net Banking/RTGS'
  ];

  const feeTypes = [
     'Total fee',
    'Tuition Fee',
    'Hostel Fee',
    'Security Fee',
    'AC Charge',
    'Miscellaneous Fee',
    'Fine'
  ];

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredStudents(students);
      return;
    }
    
    const searchLower = searchTerm.toLowerCase().trim();
    const filtered = students.filter(student => {
      return (student.rollNumber?.toLowerCase() || '').includes(searchLower) ||
             (student.name?.toLowerCase() || '').includes(searchLower) ||
             (student.email?.toLowerCase() || '').includes(searchLower) ||
             (student.class?.toLowerCase() || '').includes(searchLower);
    });
    setFilteredStudents(filtered);
  }, [searchTerm, students]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Auto-set payment date and status when payment method is selected
    if (name === 'paymentMethod' && value) {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        status: 'paid',
        paidDate: prev.paidDate || new Date().toISOString().split('T')[0]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    // Clear search when student is selected and set selected student
    if (name === 'studentId' && value) {
      setSearchTerm('');
      const student = students.find(s => s._id === value);
      setSelectedStudent(student);
      checkPaidFeeTypes(value);
      // Clear amounts when student changes
      setFormData(prev => ({ ...prev, selectedFeeTypes: [], feeAmounts: {} }));
      setMaxFeeAmount('');
    }
    
    // Clear selected student if no student selected
    if (name === 'studentId' && !value) {
      setSelectedStudent(null);
      setMaxFeeAmount('');
      setPaidFeeTypes([]);
      setFormData(prev => ({ ...prev, selectedFeeTypes: [], feeAmounts: {} }));
    }
  };

  // Handle fee type selection (multi-select)
  const handleFeeTypeChange = (feeType) => {
    if (!formData.studentId) {
      toast.warning('Please select a student first before choosing fee types');
      return;
    }
    
    setFormData(prev => {
      const isSelected = prev.selectedFeeTypes.includes(feeType);
      const newSelectedTypes = isSelected 
        ? prev.selectedFeeTypes.filter(type => type !== feeType)
        : [...prev.selectedFeeTypes, feeType];
      
      // Remove amount if deselecting fee type
      const newFeeAmounts = { ...prev.feeAmounts };
      if (isSelected) {
        delete newFeeAmounts[feeType];
      }
      
      return {
        ...prev,
        selectedFeeTypes: newSelectedTypes,
        feeAmounts: newFeeAmounts
      };
    });
  };

  // Handle amount change for specific fee type
  const handleAmountChange = (feeType, amount) => {
    if (!formData.studentId) {
      toast.warning('Please select a student first before entering amounts');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      feeAmounts: {
        ...prev.feeAmounts,
        [feeType]: amount
      }
    }));
  };

  const checkPaidFeeTypes = async (studentId) => {
    try {
      const [studentResponse, feesResponse] = await Promise.all([
        studentAPI.getById(studentId),
        feeAPI.getByStudentId(studentId)
      ]);
      
      const student = studentResponse.data.data || studentResponse.data;
      const feesData = feesResponse.data.fees || feesResponse.data.data || [];
      
      const fullyPaidTypes = [];
      
      // Check each fee type
      const feeTypeAmounts = {
        'Tuition Fee': student.tuitionFee || 0,
        'Hostel Fee': student.hostelFee || 0,
        'Security Fee': student.securityFee || 0,
        'AC Charge': student.acCharge || 0,
        'Miscellaneous Fee': student.miscellaneousFee || 0
      };
      
      // Check if Total fee was paid (meaning all individual fees were paid at once)
      const totalFeePayments = feesData.filter(f => f.feeType === 'Total fee' && f.status === 'paid');
      const totalPaidFromAllFees = feesData
        .filter(f => f.status === 'paid')
        .reduce((sum, f) => sum + (f.paidAmount || f.amount || 0), 0);
      
      const totalExpectedAmount = Object.values(feeTypeAmounts).reduce((sum, amount) => sum + amount, 0);
      const hasTotalFeePayment = totalFeePayments.length > 0 || totalPaidFromAllFees >= totalExpectedAmount;
      
      Object.entries(feeTypeAmounts).forEach(([feeType, totalAmount]) => {
        const paidAmount = feesData
          .filter(f => f.feeType === feeType && f.status === 'paid')
          .reduce((sum, f) => sum + (f.paidAmount || f.amount || 0), 0);
        
        // If Total fee was paid, individual fees are considered fully paid
        // OR if individual fee is fully paid
        // OR if no amount is set for this fee type
        if (hasTotalFeePayment || paidAmount >= totalAmount || totalAmount === 0) {
          fullyPaidTypes.push(feeType);
        }
      });
      
      // Check Total fee status
      const totalFeeAmount = Object.values(feeTypeAmounts).reduce((sum, amount) => sum + amount, 0);
      const totalPaidAmount = feesData
        .filter(f => f.status === 'paid')
        .reduce((sum, f) => sum + (f.paidAmount || f.amount || 0), 0);
      
      if (totalFeeAmount === 0 || totalPaidAmount >= totalFeeAmount) {
        fullyPaidTypes.push('Total fee');
      }
      
      setPaidFeeTypes(fullyPaidTypes);
    } catch (error) {
      // console.error('Error checking paid fee types:', error);
    }
  };

  useEffect(() => {
    fetchStudents();
    
    if (location.state?.prefillData) {
      const data = location.state.prefillData;
      setFormData(prev => ({
        ...prev,
        studentId: data.studentId || data._id,
        feeType: data.feeType,
        amount: data.amount || data.balanceAmount
      }));
    }
  }, [location.state]);

  const checkIfStudentFullyPaid = async (student) => {
    try {
      const feesResponse = await feeAPI.getByStudentId(student._id);
      const feesData = feesResponse.data.fees || feesResponse.data.data || [];
      
      const totalExpectedAmount = (
        (student.tuitionFee || 0) +
        (student.hostelFee || 0) +
        (student.securityFee || 0) +
        (student.acCharge || 0) +
        (student.miscellaneousFee || 0)
      );
      
      if (totalExpectedAmount === 0) return false;
      
      const totalPaidAmount = feesData
        .filter(f => f.status === 'paid')
        .reduce((sum, f) => sum + (f.paidAmount || f.amount || 0), 0);
      
      return totalPaidAmount >= totalExpectedAmount;
    } catch (error) {
      // console.error('Error checking student payment status:', error);
      return false;
    }
  };

  const fetchStudents = async () => {
    try {
      setFetchingStudents(true);
      // console.log('Fetching students...');
      
      // Check if auth token exists
      const token = localStorage.getItem('authToken');
      // console.log('Auth token exists:', !!token);
      
      const response = await studentAPI.getAll();
      // console.log('API Response:', response);
      // console.log('Response data:', response.data);
      
      const studentsData = response.data?.data || [];
      // console.log('Students array:', studentsData);
      // console.log('Students count:', studentsData.length);
      
      // Check which students are fully paid
      const fullyPaidIds = [];
      for (const student of studentsData) {
        const isFullyPaid = await checkIfStudentFullyPaid(student);
        if (isFullyPaid) {
          fullyPaidIds.push(student._id);
        }
      }
      
      setFullyPaidStudents(fullyPaidIds);
      setStudents(studentsData);
      setFilteredStudents(studentsData);
      
      if (studentsData.length === 0) {
        // console.log('No students found in response');
      }
    } catch (error) {
      // console.error('Error fetching students:', error);
      // console.error('Error response:', error.response);
      // console.error('Error status:', error.response?.status);
      // console.error('Error message:', error.response?.data?.message);
      
      const errorMsg = error.response?.data?.message || error.message;
      toast.error(`Failed to fetch students: ${errorMsg}`);
      setStudents([]);
    } finally {
      setFetchingStudents(false);
    }
  };



  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.studentId) {
      toast.error('Please select a student');
      return;
    }
    
    if (formData.selectedFeeTypes.length === 0) {
      toast.error('Please select at least one fee type');
      return;
    }
    
    // Validate amounts for all selected fee types
    for (const feeType of formData.selectedFeeTypes) {
      const amount = formData.feeAmounts[feeType];
      if (!amount || parseFloat(amount) <= 0) {
        toast.error(`Please enter a valid amount for ${feeType}`);
        return;
      }
      
      // Check if amount exceeds maximum allowed amount (except for Fine)
      if (feeType !== 'Fine') {
        try {
          const [studentResponse, feesResponse] = await Promise.all([
            studentAPI.getById(formData.studentId),
            feeAPI.getByStudentId(formData.studentId)
          ]);
          
          const student = studentResponse.data.data || studentResponse.data;
          const feesData = feesResponse.data.fees || feesResponse.data.data || [];
          
          let maxAllowedAmount = 0;
          
          if (feeType === 'Total fee') {
            const totalAmount = (
              (student.tuitionFee || 0) +
              (student.hostelFee || 0) +
              (student.securityFee || 0) +
              (student.acCharge || 0) +
              (student.miscellaneousFee || 0)
            );
            
            const totalPaidAmount = feesData
              .filter(f => f.status === 'paid')
              .reduce((sum, f) => sum + (f.paidAmount || f.amount || 0), 0);
            
            maxAllowedAmount = Math.max(0, totalAmount - totalPaidAmount);
          } else {
            let specificFeeAmount = 0;
            switch(feeType) {
              case 'Tuition Fee': specificFeeAmount = student.tuitionFee || 0; break;
              case 'Hostel Fee': specificFeeAmount = student.hostelFee || 0; break;
              case 'Security Fee': specificFeeAmount = student.securityFee || 0; break;
              case 'AC Charge': specificFeeAmount = student.acCharge || 0; break;
              case 'Miscellaneous Fee': specificFeeAmount = student.miscellaneousFee || 0; break;
            }
            
            const paidForThisFeeType = feesData
              .filter(f => f.feeType === feeType && f.status === 'paid')
              .reduce((sum, f) => sum + (f.paidAmount || f.amount || 0), 0);
            
            maxAllowedAmount = Math.max(0, specificFeeAmount - paidForThisFeeType);
          }
          
          if (parseFloat(amount) > maxAllowedAmount) {
            toast.error(`Amount for ${feeType} cannot exceed ₹${maxAllowedAmount.toLocaleString()}. Maximum remaining balance is ₹${maxAllowedAmount.toLocaleString()}`);
            return;
          }
          
          if (maxAllowedAmount === 0) {
            toast.error(`${feeType} is already fully paid. No amount can be added.`);
            return;
          }
        } catch (error) {
          // console.error('Error validating amount:', error);
          toast.error('Failed to validate amount. Please try again.');
          return;
        }
      }
    }
    
    if (!formData.paymentMethod) {
      toast.error('Please select payment method');
      return;
    }
    
    // Validate dates
    if (formData.dueDate) {
      const dueDate = new Date(formData.dueDate);
      const today = new Date();
      const paidDate = new Date(formData.paidDate);
      
      if (dueDate <= today) {
        toast.error('Due date must be after today\'s date');
        return;
      }
      
      if (formData.dueDate === formData.paidDate) {
        toast.error('Due date and paid date cannot be the same');
        return;
      }
    }
    
    setLoading(true);
    
    try {
      // Create separate fee records for each selected fee type
      const feePromises = formData.selectedFeeTypes.map(async (feeType) => {
        const amount = parseFloat(formData.feeAmounts[feeType]);
        
        const cleanedData = {
          studentId: formData.studentId,
          feeType: feeType,
          amount: amount,
          paidAmount: amount,
          status: 'paid',
          paymentMethod: formData.paymentMethod,
          description: formData.description || '',
          dueDate: formData.dueDate ? 
            new Date(formData.dueDate).toLocaleDateString('en-GB').replace(/\//g, '-') : 
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB').replace(/\//g, '-'),
          paidDate: formData.paidDate ? 
            new Date(formData.paidDate).toLocaleDateString('en-GB').replace(/\//g, '-') : 
            new Date().toLocaleDateString('en-GB').replace(/\//g, '-'),
          transactionId: formData.transactionId || '',
          checkNumber: formData.checkNumber || '',
          bankName: formData.bankName || ''
        };
        
        // Validate payment-specific fields
        if (formData.paymentMethod === 'UPI/Net Banking/RTGS' && !formData.transactionId) {
          throw new Error('Transaction ID is required for UPI/Net Banking/RTGS');
        }
        
        if (formData.paymentMethod === 'Cheque/DD' && !formData.checkNumber) {
          throw new Error('Cheque/DD number is required');
        }
        
        return feeAPI.create(cleanedData);
      });
      
      await Promise.all(feePromises);
      
      toast.success(`Successfully added ${formData.selectedFeeTypes.length} fee record(s)!`);
      navigate('/fees/show');
      
      setTimeout(() => {
        window.location.reload();
      }, 100);
    } catch (error) {
      // console.error('Fee creation error:', error);
      
      let errorMessage = 'Failed to add fees. Please try again.';
      if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-8">
        <button
          onClick={() => navigate('/fees/show')}
          className="bg-gray-500 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors duration-200 flex items-center justify-center space-x-2 text-sm sm:text-base w-full sm:w-auto"
        >
          <HiRefresh className="w-4 h-4" />
          <span>Back to Fees</span>
        </button>
        <div className="min-w-0 flex-1 text-right mr-10">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mr-20">Add Fee</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Collect fee from students</p>
        </div>
      </div>

      {/* Form */}

      
      <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6 lg:p-8">
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {/* Student Selection */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Student Selection</h3>
            <div className="space-y-4 sm:space-y-6">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Search Student
                </label>
                <input
                  type="text"
                  placeholder="Search by name, email, roll number, or branch..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Select Student *
                </label>
                <select
                  name="studentId"
                  value={formData.studentId}
                  onChange={handleInputChange}
                  required
                  disabled={fetchingStudents}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                >
                  <option value="">
                    {fetchingStudents ? 'Loading students...' : 
                     filteredStudents.length === 0 ? 'No students found' : 'Choose a student'}
                  </option>
                  {filteredStudents.map(student => {
                    const isFullyPaid = fullyPaidStudents.includes(student._id);
                    return (
                      <option 
                        key={student._id} 
                        value={student._id}
                        disabled={isFullyPaid}
                        style={isFullyPaid ? { color: '#9CA3AF', backgroundColor: '#F3F4F6' } : {}}
                      >
                        {student.name} | {student.email || 'No email'} | Roll: {student.rollNumber} | {student.class}
                        {isFullyPaid ? ' (Fully Paid)' : ''}
                      </option>
                    );
                  })}
                </select>
                {!fetchingStudents && filteredStudents.length === 0 && students.length > 0 && (
                  <p className="mt-2 text-xs sm:text-sm text-gray-500">No students match your search</p>
                )}
                {!fetchingStudents && students.length === 0 && (
                  <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-xs sm:text-sm text-yellow-800">
                      No students found. Please{' '}
                      <button
                        type="button"
                        onClick={() => navigate('/students/add')}
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        add students
                      </button>
                      {' '}first.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Fee Information */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Fee Information</h3>
            <div className="space-y-4">
              {/* Fee Type Multi-Select */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Select Fee Types *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {feeTypes.map(type => {
                    const isDisabled = paidFeeTypes.includes(type) && type !== 'Fine';
                    const isSelected = formData.selectedFeeTypes.includes(type);
                    const isTotalFeeSelected = formData.selectedFeeTypes.includes('Total fee');
                    
                    // Disable other options if Total fee is selected, or disable Total fee if others are selected
                    const shouldDisable = isDisabled || 
                      (isTotalFeeSelected && type !== 'Total fee') || 
                      (formData.selectedFeeTypes.length > 0 && !isTotalFeeSelected && type === 'Total fee');
                    
                    return (
                      <label
                        key={type}
                        className={`flex items-center p-2 border rounded-lg cursor-pointer transition-colors ${
                          shouldDisable 
                            ? 'bg-gray-100 border-gray-300 cursor-not-allowed opacity-50'
                            : isSelected
                            ? 'bg-blue-50 border-blue-500 text-blue-700'
                            : 'bg-white border-gray-300 hover:border-blue-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={shouldDisable}
                          onChange={() => !shouldDisable && handleFeeTypeChange(type)}
                          className="mr-2 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-xs sm:text-sm">
                          {type}{isDisabled ? ' (Paid)' : ''}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Amount Input Fields for Selected Fee Types */}
              {formData.selectedFeeTypes.length > 0 && (
                <div className="space-y-3">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700">
                    Enter Amounts *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {formData.selectedFeeTypes.map(feeType => (
                      <div key={feeType} className="space-y-2">
                        <label className="block text-xs font-medium text-gray-600">
                          {feeType} Amount
                        </label>
                        <input
                          type="text"
                          value={formData.feeAmounts[feeType] || ''}
                          onChange={(e) => handleAmountChange(feeType, e.target.value)}
                          onClick={async () => {
                            if (!formData.studentId) {
                              toast.warning('Please select a student first before calculating balance');
                              return;
                            }
                            
                            if (formData.studentId && feeType && !formData.feeAmounts[feeType]) {
                              try {
                                const [studentResponse, feesResponse] = await Promise.all([
                                  studentAPI.getById(formData.studentId),
                                  feeAPI.getByStudentId(formData.studentId)
                                ]);
                                
                                const freshStudent = studentResponse.data.data || studentResponse.data;
                                const feesData = feesResponse.data.fees || feesResponse.data.data || [];
                                
                                if (feeType === 'Total fee') {
                                  const totalAmount = (
                                    (freshStudent.tuitionFee || 0) +
                                    (freshStudent.hostelFee || 0) +
                                    (freshStudent.securityFee || 0) +
                                    (freshStudent.acCharge || 0) +
                                    (freshStudent.miscellaneousFee || 0)
                                  );
                                  
                                  const totalPaidAmount = feesData
                                    .filter(f => f.status === 'paid')
                                    .reduce((sum, f) => sum + (f.paidAmount || f.amount || 0), 0);
                                  
                                  const balanceAmount = Math.max(0, totalAmount - totalPaidAmount);
                                  
                                  setFormData(prev => ({
                                    ...prev,
                                    feeAmounts: {
                                      ...prev.feeAmounts,
                                      [feeType]: balanceAmount > 0 ? balanceAmount.toString() : ''
                                    }
                                  }));
                                  
                                  if (balanceAmount === 0) {
                                    toast.info('All fees are already fully paid!');
                                  }
                                } else if (feeType !== 'Fine') {
                                  let specificFeeAmount = 0;
                                  switch(feeType) {
                                    case 'Tuition Fee': specificFeeAmount = freshStudent.tuitionFee || 0; break;
                                    case 'Hostel Fee': specificFeeAmount = freshStudent.hostelFee || 0; break;
                                    case 'Security Fee': specificFeeAmount = freshStudent.securityFee || 0; break;
                                    case 'AC Charge': specificFeeAmount = freshStudent.acCharge || 0; break;
                                    case 'Miscellaneous Fee': specificFeeAmount = freshStudent.miscellaneousFee || 0; break;
                                  }
                                  const paidForThisFeeType = feesData
                                    .filter(f => f.feeType === feeType && f.status === 'paid')
                                    .reduce((sum, f) => sum + (f.paidAmount || f.amount || 0), 0);
                                  const balanceAmount = Math.max(0, specificFeeAmount - paidForThisFeeType);
                                  
                                  setFormData(prev => ({
                                    ...prev,
                                    feeAmounts: {
                                      ...prev.feeAmounts,
                                      [feeType]: balanceAmount > 0 ? balanceAmount.toString() : ''
                                    }
                                  }));
                                  
                                  if (balanceAmount === 0) {
                                    toast.info(`${feeType} is already fully paid!`);
                                  }
                                }
                              } catch (error) {
                                // console.error('Error fetching student data:', error);
                                toast.error('Failed to fetch student details');
                              }
                            }
                          }}
                          required
                          placeholder={feeType === 'Fine' ? 'Enter fine amount' : 'Click to calculate balance'}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <FeeBalanceDisplay 
                          studentId={formData.studentId}
                          feeType={feeType}
                          selectedStudent={selectedStudent}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Payment Method *
                </label>
                <select
                  name="paymentMethod"
                  value={formData.paymentMethod}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select payment method</option>
                  {paymentMethods.map(method => (
                    <option key={method} value={method}>{method}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Next due Date
                </label>
                <input
                  type="date"
                  name="dueDate"
                  value={formData.dueDate}
                  onChange={handleInputChange}
                  min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                  onClick={(e) => e.target.showPicker && e.target.showPicker()}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">Due date must be after today's date</p>
              </div>
            </div>
          </div>

          {/* Payment Details */}
          {formData.paymentMethod && formData.paymentMethod !== 'Cash' && (
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Payment Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {/* Payment Date Input */}
                <div className="sm:col-span-2">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Payment Date *</label>
                  <input
                    type="date"
                    name="paidDate"
                    value={formData.paidDate}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, paidDate: e.target.value }));
                    }}
                    onClick={(e) => e.target.showPicker && e.target.showPicker()}
                    max={new Date().toISOString().split('T')[0]}
                    required
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="mt-1 text-xs text-gray-500">Payment date cannot be in the future</p>
                </div>
                
                {formData.paymentMethod === 'UPI/Net Banking/RTGS' && (
                  <>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Transaction ID *</label>
                      <input
                        type="text"
                        name="transactionId"
                        value={formData.transactionId}
                        onChange={handleInputChange}
                        required
                        placeholder="Enter transaction ID"
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Bank Name *</label>
                      <input
                        type="text"
                        name="bankName"
                        value={formData.bankName}
                        onChange={handleInputChange}
                        required
                        placeholder="Enter bank name"
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </>
                )}
                {formData.paymentMethod === 'Cheque/DD' && (
                  <>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Cheque/DD Number *</label>
                      <input
                        type="text"
                        name="checkNumber"
                        value={formData.checkNumber}
                        onChange={handleInputChange}
                        required
                        placeholder="Enter Cheque/DD number"
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Bank Name *</label>
                      <input
                        type="text"
                        name="bankName"
                        value={formData.bankName}
                        onChange={handleInputChange}
                        required
                        placeholder="Enter bank name"
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div> 
                  </>
                )}
              </div>
            </div>
          )}

          {/* Additional Information */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Additional Information</h3>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                Remark *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                placeholder="Any additional notes..."
                className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 pt-4 sm:pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate('/fees/show')}
              className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <HiRefresh className="animate-spin h-4 w-4" />
                  <span>Adding Fee...</span>
                </>
              ) : (
                <>
                  <HiRefresh className="w-4 h-4" />
                  <span>Add Fee</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddFee;