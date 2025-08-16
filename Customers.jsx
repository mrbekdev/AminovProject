import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [paymentSchedules, setPaymentSchedules] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const API_URL = 'https://suddocs.uz';

  const axiosWithAuth = axios.create({
    baseURL: API_URL,
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json',
    },
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const response = await axiosWithAuth.get('/customers');
      setCustomers(response.data);
    } catch (error) {
      console.error('Error loading customers:', error);
      setNotification({ message: 'Mijozlarni yuklashda xatolik', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerPaymentSchedules = async (customerId) => {
    try {
      setLoading(true);
      const response = await axiosWithAuth.get(`/transactions?customerId=${customerId}&paymentType=CREDIT,INSTALLMENT`);
      const transactions = response.data.transactions || [];
      
      // Har bir transaction uchun payment schedule larni olish
      const allSchedules = [];
      for (const transaction of transactions) {
        if (transaction.paymentSchedules && transaction.paymentSchedules.length > 0) {
          allSchedules.push(...transaction.paymentSchedules.map(schedule => ({
            ...schedule,
            transaction: transaction,
            customer: transaction.customer
          })));
        }
      }
      
      setPaymentSchedules(allSchedules);
      setSelectedCustomer(customers.find(c => c.id === customerId));
    } catch (error) {
      console.error('Error loading payment schedules:', error);
      setNotification({ message: 'To\'lov jadvalini yuklashda xatolik', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!selectedSchedule || !paymentAmount || Number(paymentAmount) <= 0) {
      setNotification({ message: 'To\'lov miqdori to\'g\'ri kiritilishi kerak', type: 'error' });
      return;
    }

    try {
      setLoading(true);
      
      // PaymentSchedule ni yangilash
      await axiosWithAuth.patch(`/payment-schedules/${selectedSchedule.id}`, {
        paidAmount: Number(paymentAmount),
        isPaid: Number(paymentAmount) >= selectedSchedule.payment,
        paidAt: new Date().toISOString()
      });

      // Transaction ni yangilash
      const transaction = selectedSchedule.transaction;
      const newAmountPaid = (transaction.amountPaid || 0) + Number(paymentAmount);
      const newRemainingBalance = Math.max(0, transaction.finalTotal - newAmountPaid);
      
      await axiosWithAuth.patch(`/transactions/${transaction.id}`, {
        amountPaid: newAmountPaid,
        remainingBalance: newRemainingBalance
      });

      setNotification({ message: 'To\'lov muvaffaqiyatli amalga oshirildi', type: 'success' });
      setShowPaymentModal(false);
      setSelectedSchedule(null);
      setPaymentAmount('');
      
      // Ma\'lumotlarni qayta yuklash
      if (selectedCustomer) {
        loadCustomerPaymentSchedules(selectedCustomer.id);
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      setNotification({ message: 'To\'lovni amalga oshirishda xatolik', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return amount != null && Number.isFinite(Number(amount))
      ? new Intl.NumberFormat('uz-UZ').format(Number(amount)) + " so'm"
      : "0 so'm";
  };

  const formatDate = (date) => {
    return date ? new Date(date).toLocaleDateString('uz-UZ') : "Noma'lum";
  };

  const getPaymentStatus = (schedule) => {
    if (schedule.isPaid) return { text: 'To\'langan', color: 'text-green-600' };
    if (schedule.paidAmount > 0) return { text: 'Qisman to\'langan', color: 'text-yellow-600' };
    return { text: 'To\'lanmagan', color: 'text-red-600' };
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Mijozlar va Kredit To'lovlari</h1>

      {notification && (
        <div className={`mb-4 p-4 rounded-lg ${
          notification.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {notification.message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mijozlar ro'yxati */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Mijozlar</h2>
            {loading ? (
              <div className="text-center py-4">Yuklanmoqda...</div>
            ) : (
              <div className="space-y-2">
                {customers.map((customer) => (
                  <div
                    key={customer.id}
                    onClick={() => loadCustomerPaymentSchedules(customer.id)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedCustomer?.id === customer.id
                        ? 'bg-blue-100 border-blue-300 border'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="font-medium">{customer.fullName}</div>
                    <div className="text-sm text-gray-600">{customer.phone}</div>
                    {customer.email && (
                      <div className="text-sm text-gray-500">{customer.email}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* To'lov jadvali */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">
              {selectedCustomer ? `${selectedCustomer.fullName} - To'lov Jadvali` : 'To\'lov Jadvali'}
            </h2>
            
            {selectedCustomer ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="p-2 text-left">Oy</th>
                      <th className="p-2 text-left">To'lov Miqdori</th>
                      <th className="p-2 text-left">To'langan</th>
                      <th className="p-2 text-left">Qolgan</th>
                      <th className="p-2 text-left">Holat</th>
                      <th className="p-2 text-left">Amallar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentSchedules.map((schedule) => {
                      const status = getPaymentStatus(schedule);
                      const remaining = schedule.payment - schedule.paidAmount;
                      
                      return (
                        <tr key={schedule.id} className="border-b">
                          <td className="p-2">{schedule.month}-oy</td>
                          <td className="p-2">{formatCurrency(schedule.payment)}</td>
                          <td className="p-2">{formatCurrency(schedule.paidAmount)}</td>
                          <td className="p-2">{formatCurrency(remaining)}</td>
                          <td className={`p-2 font-medium ${status.color}`}>
                            {status.text}
                          </td>
                          <td className="p-2">
                            {remaining > 0 && (
                              <button
                                onClick={() => {
                                  setSelectedSchedule(schedule);
                                  setPaymentAmount(remaining.toString());
                                  setShowPaymentModal(true);
                                }}
                                className="bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600"
                              >
                                To'lov
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                Mijoz tanlang
              </div>
            )}
          </div>
        </div>
      </div>

      {/* To'lov modal */}
      {showPaymentModal && selectedSchedule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-xl font-semibold text-gray-900">
                To'lov Qilish
              </h3>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <p className="text-gray-600 mb-2">
                  <strong>{selectedSchedule.transaction.customer.fullName}</strong> uchun
                </p>
                <p className="text-gray-600 mb-2">
                  {selectedSchedule.month}-oy to'lovi: {formatCurrency(selectedSchedule.payment)}
                </p>
                <p className="text-gray-600 mb-2">
                  Qolgan: {formatCurrency(selectedSchedule.payment - selectedSchedule.paidAmount)}
                </p>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  To'lov Miqdori
                </label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0.01"
                  max={selectedSchedule.payment - selectedSchedule.paidAmount}
                  step="0.01"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedSchedule(null);
                    setPaymentAmount('');
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  onClick={handlePayment}
                  disabled={loading || !paymentAmount || Number(paymentAmount) <= 0}
                  className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? 'Jarayonda...' : 'To\'lov Qilish'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;