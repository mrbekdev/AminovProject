import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { AlertCircle, Loader2, Calendar, TrendingUp, Download, BarChart3, DollarSign, Package, ArrowRightLeft } from 'lucide-react';

const Notification = ({ message, type, onClose }) => (
  <div className={`p-4 rounded-lg flex items-center gap-3 mb-4 ${
    type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
    type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
    'bg-blue-50 text-blue-700 border border-blue-200'
  }`}>
    <AlertCircle size={20} />
    <span className="flex-1">{message}</span>
    <button className="text-sm underline hover:no-underline transition-all" onClick={onClose}>Yopish</button>
  </div>
);

const Hisobotlar = () => {
  const [reportData, setReportData] = useState({
    purchases: [],
    sales: [],
    transfers: [],
    statistics: {}
  });
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedReportType, setSelectedReportType] = useState('all');
  const API_URL = 'https://suddocs.uz';

  const formatCurrency = (amount) =>
    (amount !== null && amount !== undefined && !Number.isNaN(Number(amount)))
      ? new Intl.NumberFormat('uz-UZ').format(Number(amount)) + " so'm"
      : "0 so'm";

  const formatQuantity = (qty) => {
    if (qty === null || qty === undefined || qty === '') return "0 dona";
    const n = Number(qty);
    return !Number.isNaN(n) ? new Intl.NumberFormat('uz-UZ').format(n) + ' dona' : '0 dona';
  };

  const formatDate = (date) => {
    if (!date) return "Noma'lum";
    try {
      return new Date(date).toLocaleDateString('uz-UZ');
    } catch {
      return "Noma'lum";
    }
  };

  const axiosWithAuth = async (config) => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setNotification({ message: 'Sessiya topilmadi, iltimos tizimga kiring', type: 'error' });
      setTimeout(() => window.location.href = '/login', 2000);
      throw new Error('No token found');
    }
    const headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    try {
      return await axios({ ...config, headers });
    } catch (error) {
      if (error.response?.status === 401) {
        setNotification({ message: 'Sessiya tugadi, iltimos qayta kiring', type: 'error' });
        localStorage.clear();
        setTimeout(() => window.location.href = '/login', 2000);
        throw new Error('Session expired');
      }
      throw error;
    }
  };

  useEffect(() => {
    // BranchId ni localStorage dan olish
    const branchId = localStorage.getItem('branchId');
    if (branchId) {
      setSelectedBranchId(branchId);
    }
    
    const fetchBranches = async () => {
      try {
        const res = await axiosWithAuth({ method: 'get', url: `${API_URL}/branches` });
        const branchesData = Array.isArray(res.data) ? res.data : res.data.branches || [];
        setBranches(branchesData);
        
        // Agar localStorage da branchId yo'q bo'lsa, birinchi filialni tanlash
        if (!branchId && branchesData.length > 0) {
          setSelectedBranchId(branchesData[0].id.toString());
        }
      } catch (err) {
        setNotification({ message: err.message || 'Filiallar yuklashda xatolik', type: 'error' });
      }
    };
    fetchBranches();
  }, []);

  const getDateRange = () => {
    const today = new Date();
    const endDate = new Date(today);
    let startDate;
    switch (selectedPeriod) {
      case 'week': startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000); break;
      case 'month': startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000); break;
      case 'quarter': startDate = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000); break;
      case 'year': startDate = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000); break;
      default: startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  };

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    setNotification(null);

    if (!selectedBranchId) {
      setNotification({ message: 'Iltimos, filialni tanlang', type: 'error' });
      setLoading(false);
      return;
    }

    try {
      const { startDate, endDate } = getDateRange();
      
      // Oddiy branchId orqali transactionlarni yuklash
      const transactionsRes = await axiosWithAuth({
        method: 'get',
        url: `${API_URL}/transactions?branchId=${selectedBranchId}&startDate=${startDate}&endDate=${endDate}`,
        timeout: 10000
      });

      // Statistika yuklash
      const statsRes = await axiosWithAuth({
        method: 'get',
        url: `${API_URL}/transactions/statistics?branchId=${selectedBranchId}&startDate=${startDate}&endDate=${endDate}`,
        timeout: 10000
      });

      // Backend dan kelgan ma'lumotlarni to'g'ri parse qilish
      let transactions = [];
      if (transactionsRes.data && transactionsRes.data.transactions) {
        transactions = transactionsRes.data.transactions;
      } else if (Array.isArray(transactionsRes.data)) {
        transactions = transactionsRes.data;
      }
      

      
      const statistics = statsRes.data || {};

      // Transactionlarni turiga qarab ajratish
      const purchases = [];
      const sales = [];
      const transfers = [];

      for (const transaction of transactions) {
        const items = transaction.items || [];
        
        for (const item of items) {
          const product = item.product || {};
          const baseData = {
            id: transaction.id,
            transactionDate: transaction.createdAt,
            productName: product.name || `Mahsulot ${item.productId}`,
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            total: item.total,
            status: transaction.status,
            paymentType: transaction.paymentType,
            customerName: transaction.customer ? `${transaction.customer.firstName} ${transaction.customer.lastName}` : null,
            description: transaction.description
          };

          // Transaction turiga qarab ajratish
          if (transaction.type === 'PURCHASE') {
            // Kirim - faqat fromBranchId = selectedBranchId bo'lganda
            if (transaction.fromBranchId?.toString() === selectedBranchId) {
              purchases.push({
                ...baseData,
                type: 'Kirim',
                branchName: branches.find(b => b.id === transaction.fromBranchId)?.name || 'Noma\'lum'
              });
            }
          } else if (transaction.type === 'SALE') {
            // Chiqim - faqat fromBranchId = selectedBranchId bo'lganda
            if (transaction.fromBranchId?.toString() === selectedBranchId) {
              sales.push({
                ...baseData,
                type: 'Chiqim',
                branchName: branches.find(b => b.id === transaction.fromBranchId)?.name || 'Noma\'lum'
              });
            }
          } else if (transaction.type === 'TRANSFER') {
            // O'tkazma - fromBranchId = selectedBranchId bo'lsa CHIQIM, toBranchId = selectedBranchId bo'lsa KIRIM
            if (transaction.fromBranchId?.toString() === selectedBranchId) {
              // Sizning filialdan chiqayotgan o'tkazma - CHIQIM
              transfers.push({
                ...baseData,
                type: 'O\'tkazma (Chiqim)',
                direction: 'out',
                fromBranch: branches.find(b => b.id === transaction.fromBranchId)?.name || 'Noma\'lum',
                toBranch: branches.find(b => b.id === transaction.toBranchId)?.name || 'Noma\'lum'
              });
            } else if (transaction.toBranchId?.toString() === selectedBranchId) {
              // Sizning filialga kirgan o'tkazma - KIRIM
              transfers.push({
                ...baseData,
                type: 'O\'tkazma (Kirim)',
                direction: 'in',
                fromBranch: branches.find(b => b.id === transaction.fromBranchId)?.name || 'Noma\'lum',
                toBranch: branches.find(b => b.id === transaction.toBranchId)?.name || 'Noma\'lum'
              });
            }
          }
        }
      }

      setReportData({
        purchases,
        sales,
        transfers,
        statistics
      });

    } catch (err) {
      let message = "Ma'lumotlarni yuklashda xatolik";
      if (err.message?.toLowerCase().includes('token')) message = err.message;
      else if (err.code === 'ECONNABORTED') message = "So'rov vaqti tugadi - Internetni tekshiring";
      else if (err.response?.data?.message) message = err.response.data.message;
      else if (err.response?.status) message = `Server xatosi: ${err.response.status}`;

      setNotification({ message, type: 'error' });
      console.error('API Error:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod, selectedBranchId, branches]);

  useEffect(() => {
    if (selectedBranchId) loadTransactions();
  }, [loadTransactions, selectedBranchId]);

  const generateReceipt = () => {
    const periodLabels = {
      'week': 'Oxirgi 7 kun',
      'month': 'Oxirgi 30 kun',
      'quarter': 'Oxirgi 90 kun',
      'year': 'Oxirgi 1 yil'
    };
    
    const branchName = branches.find(b => b.id.toString() === selectedBranchId)?.name || 'Noma\'lum';
    const date = new Date().toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' });
    
    let content = `HISOBOT CHEKI
Filial: ${branchName}
Muddat: ${periodLabels[selectedPeriod]}
Sana: ${date}
====================\n`;

    if (selectedReportType === 'all' || selectedReportType === 'purchases') {
      content += `\nKIRIMLAR (${reportData.purchases.length} ta):\n`;
      reportData.purchases.forEach((item, index) => {
        content += `${index + 1}. ${item.productName} - ${formatQuantity(item.quantity)} - ${formatCurrency(item.total)} - ${formatDate(item.transactionDate)}\n`;
      });
    }

    if (selectedReportType === 'all' || selectedReportType === 'sales') {
      content += `\nCHIQIMLAR (${reportData.sales.length} ta):\n`;
      reportData.sales.forEach((item, index) => {
        content += `${index + 1}. ${item.productName} - ${formatQuantity(item.quantity)} - ${formatCurrency(item.total)} - ${formatDate(item.transactionDate)}\n`;
      });
    }

    if (selectedReportType === 'all' || selectedReportType === 'transfers') {
      content += `\nO'TKAZMALAR (${reportData.transfers.length} ta):\n`;
      reportData.transfers.forEach((item, index) => {
        content += `${index + 1}. ${item.productName} - ${formatQuantity(item.quantity)} - ${item.fromBranch} → ${item.toBranch} - ${formatDate(item.transactionDate)}\n`;
      });
    }

    // Statistika
    content += `\n====================
STATISTIKA:
Umumiy sotish: ${formatCurrency(reportData.statistics.totalSales || 0)}
Naqd to'lov: ${formatCurrency(reportData.statistics.cashSales || 0)}
Karta to'lov: ${formatCurrency(reportData.statistics.cardSales || 0)}
Kredit: ${formatCurrency(reportData.statistics.creditSales || 0)}
====================`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hisobot_${branchName}_${selectedPeriod}_${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setNotification({ message: 'Hisobot muvaffaqiyatli yuklandi', type: 'success' });
  };

  const getCurrentData = () => {
    switch (selectedReportType) {
      case 'purchases': return reportData.purchases;
      case 'sales': return reportData.sales;
      case 'transfers': return reportData.transfers;
      default: return [...reportData.purchases, ...reportData.sales, ...reportData.transfers];
    }
  };

  const currentData = getCurrentData();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
          <BarChart3 size={28} />
          Hisobotlar
        </h1>
        <div className="flex gap-4">
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="border rounded-lg px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Filial tanlang</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="border rounded-lg px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="week">Oxirgi 7 kun</option>
            <option value="month">Oxirgi 30 kun</option>
            <option value="quarter">Oxirgi 90 kun</option>
            <option value="year">Oxirgi 1 yil</option>
          </select>
          <select
            value={selectedReportType}
            onChange={(e) => setSelectedReportType(e.target.value)}
            className="border rounded-lg px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Barcha</option>
            <option value="purchases">Kirimlar</option>
            <option value="sales">Chiqimlar</option>
            <option value="transfers">O'tkazmalar</option>
          </select>
        </div>
      </div>

      {notification && <Notification {...notification} onClose={() => setNotification(null)} />}

      {/* Statistika kartlari */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Umumiy Sotish</p>
              <p className="text-2xl font-bold text-green-700">{formatCurrency(reportData.statistics.totalSales || 0)}</p>
            </div>
            <DollarSign className="text-green-600" size={24} />
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Naqd To'lov</p>
              <p className="text-2xl font-bold text-blue-700">{formatCurrency(reportData.statistics.cashSales || 0)}</p>
            </div>
            <Package className="text-blue-600" size={24} />
          </div>
        </div>
        
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 font-medium">Karta To'lov</p>
              <p className="text-2xl font-bold text-purple-700">{formatCurrency(reportData.statistics.cardSales || 0)}</p>
            </div>
            <TrendingUp className="text-purple-600" size={24} />
          </div>
        </div>
        
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-600 font-medium">Kredit</p>
              <p className="text-2xl font-bold text-orange-700">{formatCurrency(reportData.statistics.creditSales || 0)}</p>
            </div>
            <ArrowRightLeft className="text-orange-600" size={24} />
          </div>
        </div>
      </div>

      {/* Qisqacha ma'lumotlar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border rounded-lg p-4 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-2">Kirimlar</h3>
          <p className="text-2xl font-bold text-green-600">{reportData.purchases.length} ta</p>
          <p className="text-sm text-gray-600">
            Jami: {formatCurrency(reportData.purchases.reduce((sum, item) => sum + (item.total || 0), 0))}
          </p>
        </div>
        
        <div className="bg-white border rounded-lg p-4 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-2">Chiqimlar</h3>
          <p className="text-2xl font-bold text-red-600">{reportData.sales.length} ta</p>
          <p className="text-sm text-gray-600">
            Jami: {formatCurrency(reportData.sales.reduce((sum, item) => sum + (item.total || 0), 0))}
          </p>
        </div>
        
        <div className="bg-white border rounded-lg p-4 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-2">O'tkazmalar</h3>
          <p className="text-2xl font-bold text-blue-600">{reportData.transfers.length} ta</p>
          <p className="text-sm text-gray-600">
            Jami: {formatCurrency(reportData.transfers.reduce((sum, item) => sum + (item.total || 0), 0))}
          </p>
        </div>
      </div>

      <div className="flex justify-end mb-4">
        <button
          onClick={generateReceipt}
          disabled={loading || currentData.length === 0}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-400 transition-all duration-200 flex items-center gap-2"
        >
          <Download size={20} />
          Hisobotni Yuklash
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="animate-spin" size={32} />
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="p-3">Nomer</th>
                <th className="p-3">Turi</th>
                <th className="p-3">Tovar Nomi</th>
                <th className="p-3">Miqdor</th>
                <th className="p-3">Narx</th>
                <th className="p-3">Jami</th>
                <th className="p-3">To'lov Turi</th>
                <th className="p-3">Mijoz</th>
                <th className="p-3">Filial</th>
                <th className="p-3">Sana</th>
                <th className="p-3">Holat</th>
              </tr>
            </thead>
            <tbody>
              {currentData.map((row, index) => (
                <tr key={index} className="border-t hover:bg-gray-50">
                  <td className="p-3">{index + 1}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      row.type?.includes('Kirim') ? 'bg-green-100 text-green-800' :
                      row.type?.includes('Chiqim') ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {row.type}
                    </span>
                  </td>
                  <td className="p-3">{row.productName || "Noma'lum"}</td>
                  <td className="p-3">{formatQuantity(row.quantity)}</td>
                  <td className="p-3">{formatCurrency(row.price)}</td>
                  <td className="p-3">{formatCurrency(row.total)}</td>
                  <td className="p-3">
                    {row.paymentType === 'CASH' ? 'Naqd' :
                     row.paymentType === 'CARD' ? 'Karta' :
                     row.paymentType === 'CREDIT' ? 'Kredit' : '-'}
                  </td>
                  <td className="p-3">{row.customerName || '-'}</td>
                  <td className="p-3">
                    {row.type?.includes('O\'tkazma') ? 
                      `${row.fromBranch} → ${row.toBranch}` : 
                      row.branchName || "Noma'lum"}
                  </td>
                  <td className="p-3">{formatDate(row.transactionDate)}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      row.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                      row.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {row.status === 'COMPLETED' ? 'Tugatilgan' :
                       row.status === 'PENDING' ? 'Kutilmoqda' : 'Bekor'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {currentData.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Tanlangan muddatda ma'lumot topilmadi
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Hisobotlar;