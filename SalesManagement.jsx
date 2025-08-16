import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const SalesManagement = () => {
  const [products, setProducts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [users, setUsers] = useState([]); // New state for marketing users
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showSelectedItemsModal, setShowSelectedItemsModal] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [lastTransaction, setLastTransaction] = useState(null);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [tempQuantity, setTempQuantity] = useState('');
  const [tempPrice, setTempPrice] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedSellerId, setSelectedSellerId] = useState(''); // New state for selected seller
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [paymentType, setPaymentType] = useState('');
  const [months, setMonths] = useState('');
  const [customInterestRate, setCustomInterestRate] = useState(''); // New state for custom interest rate
  const [customerPaid, setCustomerPaid] = useState(''); // New state for customer paid amount
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState(null);
  const navigate = useNavigate();

  const API_URL = 'https://suddocs.uz';

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return "0 so'm";
    }
    if (amount < 0) {
      return `-${new Intl.NumberFormat('uz-UZ').format(Math.abs(amount))} so'm`;
    }
    return new Intl.NumberFormat('uz-UZ').format(amount) + " so'm";
  };

  const formatQuantity = (qty) => (qty >= 0 ? new Intl.NumberFormat('uz-UZ').format(qty) + ' dona' : '0 dona');

  const formatDate = (date) =>
    date ? new Date(date).toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' }) : "Noma'lum";

  const calculatePaymentSchedule = () => {
    const m = Number(months);
    const interestRate = Number(customInterestRate) / 100 || 0; // Use custom interest rate
    if (!m || m <= 0 || selectedItems.length === 0) return { totalWithInterest: 0, monthlyPayment: 0, schedule: [], change: 0, remaining: 0 };

    const baseTotal = selectedItems.reduce((sum, item) => sum + Number(item.quantity) * Number(item.price), 0);
    const totalWithInterest = baseTotal * (1 + interestRate);
    const paid = Number(customerPaid) || 0;
    const change = paid > totalWithInterest ? paid - totalWithInterest : 0;
    const remaining = paid < totalWithInterest ? totalWithInterest - paid : 0;
    const monthlyPayment = m > 0 && remaining > 0 ? remaining / m : 0;
    const schedule = [];

    let remainingBalance = remaining;
    for (let i = 1; i <= m; i++) {
      schedule.push({
        month: i,
        payment: monthlyPayment,
        remainingBalance: Math.max(0, remainingBalance - monthlyPayment),
      });
      remainingBalance -= monthlyPayment;
    }

    return { totalWithInterest, monthlyPayment, schedule, change, remaining };
  };

  const generatePDF = () => {
    if (selectedItems.length === 0) return;
    const m = Number(months);
    const { totalWithInterest, monthlyPayment, schedule, change, remaining } = calculatePaymentSchedule();
    const branchName = branches.find((b) => b.id === Number(selectedBranch))?.name || 'Noma\'lum';
    const seller = users.find((u) => u.id === Number(selectedSellerId));
    const sellerName = seller ? `${seller.firstName} ${seller.lastName}` : 'Noma\'lum';
    const date = formatDate(new Date());

    const escapeLatex = (str) => {
      if (!str) return 'Noma\'lum';
      return str
        .replace(/[&%$#_{}~^\\]/g, '\\$&')
        .replace(/ā/g, '\\=a')
        .replace(/ū/g, '\\=u');
    };

    const productList = selectedItems
      .map((item) => `${escapeLatex(item.name)} (${formatQuantity(item.quantity)}, ${formatCurrency(item.price)})`)
      .join(', ');

    const latexContent = `
\\documentclass[a4paper,12pt]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[russian,uzbek]{babel}
\\usepackage{geometry}
\\usepackage{booktabs}
\\usepackage{noto}
\\geometry{a4paper,margin=2cm}
\\begin{document}

\\begin{center}
  \\textbf{To'lov Jadvali (Kredit yoki Bo'lib To'lash)}\\\\
  \\vspace{0.5cm}
  Mahsulotlar: ${productList}\\\\
  Filial: ${escapeLatex(branchName)}\\\\
  Sotuvchi: ${escapeLatex(sellerName)}\\\\
  Sana: ${escapeLatex(date)}\\\\
  To'lov Turi: ${paymentType === 'CREDIT' ? 'Kredit' : paymentType === 'INSTALLMENT' ? "Bo'lib To'lash" : paymentType}\\\\
  Muddat: ${m} oy\\\\
  Foiz: ${Number(customInterestRate).toFixed(2)}\\%\\\\
  Umumiy Summa (foiz bilan): ${formatCurrency(totalWithInterest)}\\\\
  Mijoz to'lagan: ${formatCurrency(Number(customerPaid))}\\\\
  Qaytim: ${formatCurrency(change)}\\\\
  Qolgan summa: ${formatCurrency(remaining)}\\\\
  Oylik To'lov: ${formatCurrency(monthlyPayment)}\\\\
  Mijoz: ${escapeLatex(firstName)} ${escapeLatex(lastName)}, Telefon: ${escapeLatex(phone)}
\\end{center}

\\vspace{0.5cm}

\\begin{table}[h]
\\centering
\\begin{tabular}{ccc}
\\toprule
Oylik & To'lov Summasi & Qoldiq Summa \\\\
\\midrule
${schedule.map((row) => `${row.month} & ${formatCurrency(row.payment)} & ${formatCurrency(row.remainingBalance)}\\\\`).join('\n')}
\\bottomrule
\\end{tabular}
\\caption{To'lov Jadvali}
\\end{table}

\\end{document}
    `;

    const blob = new Blob([latexContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `payment_schedule_${Date.now()}.tex`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setNotification({ message: 'To\'lov jadvali yuklandi (PDF sifatida kompilyatsiya qilinishi kerak)', type: 'success' });
  };

  const axiosWithAuth = async (config) => {
    const token = localStorage.getItem('access_token') || 'mock-token';
    const headers = { ...config.headers, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    try {
      const response = await axios({ ...config, headers });
      return response;
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.clear();
        navigate('/login');
        throw new Error('Sessiya tugadi');
      }
      throw error;
    }
  };

  useEffect(() => {
    const fetchBranchesAndUsers = async () => {
      try {
        setLoading(true);
        const [branchesRes, usersRes] = await Promise.all([
          axiosWithAuth({ method: 'get', url: `${API_URL}/branches` }),
          axiosWithAuth({ method: 'get', url: `${API_URL}/users` }),
        ]);
        setBranches(branchesRes.data);
        setUsers(usersRes.data.filter((user) => user.role === 'MARKETING')); // Filter for MARKETING role
      } catch (err) {
        setNotification({ message: err.message || 'Ma\'lumotlarni yuklashda xatolik', type: 'error' });
      } finally {
        setLoading(false);
      }
    };
    fetchBranchesAndUsers();

    const branchId = localStorage.getItem('branchId');
    if (branchId && !isNaN(branchId) && Number.isInteger(Number(branchId)) && Number(branchId) > 0) {
      setSelectedBranchId(branchId);
      setSelectedBranch(branchId);
    } else {
      setNotification({ message: 'Filial ID topilmadi yoki noto‘g‘ri', type: 'error' });
    }
  }, [navigate]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setNotification(null);
    const branchId = Number(selectedBranchId);
    const isValidBranchId = !isNaN(branchId) && Number.isInteger(branchId) && branchId > 0;

    if (!isValidBranchId) {
      setNotification({ message: 'Filialni tanlang', type: 'error' });
      setProducts([]);
      setLoading(false);
      return;
    }

    try {
      const queryParams = new URLSearchParams();
      queryParams.append('branchId', branchId.toString());
      if (searchTerm.trim()) queryParams.append('search', searchTerm);
      queryParams.append('includeZeroQuantity', 'true');
      const productsRes = await axiosWithAuth({
        method: 'get',
        url: `${API_URL}/products?${queryParams.toString()}`,
      });
      const sortedProducts = productsRes.data.sort((a, b) => {
        if (a.quantity === 0 && b.quantity !== 0) return 1;
        if (a.quantity !== 0 && b.quantity === 0) return -1;

        return a.id - b.id;
      });
      setProducts(sortedProducts);
    } catch (err) {
      setNotification({ message: err.message || "Ma'lumotlarni yuklashda xatolik", type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedBranchId]);

  useEffect(() => {
    if (selectedBranchId) {
      loadData();
    }
  }, [loadData, selectedBranchId]);

  const openModal = () => {
    setSelectedItems([]);
    setSelectedBranch(selectedBranchId || '');
    setSelectedSellerId('');
    setFirstName('');
    setLastName('');
    setPhone('');
    setPaymentType('');
    setMonths('');
    setCustomInterestRate('');
    setCustomerPaid('');
    setErrors({});
    setSelectedProductId('');
    setTempQuantity('');
    setTempPrice('');
    setShowModal(true);
  };

  const addItem = () => {
    if (!selectedProductId || !tempQuantity) return;
    const product = products.find((p) => p.id === Number(selectedProductId));
    if (!product) return;
    if (selectedItems.find((item) => item.id === product.id)) {
      setNotification({ message: 'Bu mahsulot allaqachon tanlangan', type: 'warning' });
      return;
    }
    setSelectedItems([
      ...selectedItems,
      {
        id: product.id,
        name: product.name,
        quantity: tempQuantity,
        price: tempPrice || product.price.toString(),
        maxQuantity: product.quantity,
      },
    ]);
    setSelectedProductId('');
    setTempQuantity('');
    setTempPrice('');
  };

  const updateItem = (index, field, value) => {
    setSelectedItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      ),
    );
  };

  const removeItem = (index) => {
    setSelectedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedItems([]);
    setSelectedBranch('');
    setSelectedSellerId('');
    setFirstName('');
    setLastName('');
    setPhone('');
    setPaymentType('');
    setMonths('');
    setCustomInterestRate('');
    setCustomerPaid('');
    setErrors({});
    setNotification(null);
    setSelectedProductId('');
    setTempQuantity('');
    setTempPrice('');
  };

  const closeReceiptModal = () => {
    setShowReceiptModal(false);
    setLastTransaction(null);
  };

  const openSelectedItemsModal = () => {
    if (selectedItems.length === 0) {
      setNotification({ message: 'Savatda mahsulot yo\'q', type: 'warning' });
      return;
    }
    setShowSelectedItemsModal(true);
  };

  const closeSelectedItemsModal = () => {
    setShowSelectedItemsModal(false);
  };

  useEffect(() => {
    const savedBranchId = localStorage.getItem("branchId");
    if (savedBranchId) {
      setSelectedBranchId(savedBranchId);
    }
  }, []);

  useEffect(() => {
    if (selectedBranchId) {
      localStorage.setItem("branchId", selectedBranchId);
    }
  }, [selectedBranchId]);

  const validateFields = () => {
    const newErrors = {};
    if (selectedItems.length === 0) newErrors.items = 'Kamida bitta mahsulot tanlanishi shart';
    selectedItems.forEach((item, index) => {
      if (!item.quantity || isNaN(item.quantity) || Number(item.quantity) <= 0 || !Number.isInteger(Number(item.quantity))) {
        newErrors[`quantity_${index}`] = 'Miqdor 0 dan katta butun son bo\'lishi kerak';
      } else if (Number(item.quantity) > item.maxQuantity) {
        newErrors[`quantity_${index}`] = `Maksimal miqdor: ${item.maxQuantity} dona`;
      }
      if (!item.price || isNaN(item.price) || Number(item.price) < 0) {
        newErrors[`price_${index}`] = 'Narx 0 dan katta yoki teng bo\'lishi kerak';
      }
    });
    if (!selectedBranch) newErrors.branch = 'Filial tanlanishi shart';
    if (!selectedSellerId) newErrors.seller = 'Sotuvchi tanlanishi shart';
    if (!firstName.trim()) newErrors.firstName = 'Ism kiritilishi shart';
    if (!lastName.trim()) newErrors.lastName = 'Familiya kiritilishi shart';
    if (!phone.trim() || !/^\+?[1-9]\d{1,14}$/.test(phone)) newErrors.phone = 'Telefon raqami to\'g\'ri kiritilishi shart';
    if (!paymentType) newErrors.paymentType = 'To\'lov turi tanlanishi shart';
    if ((paymentType === 'CREDIT' || paymentType === 'INSTALLMENT') &&
      (!months || isNaN(months) || Number(months) <= 0 || !Number.isInteger(Number(months)) || Number(months) > 24)) {
      newErrors.months = 'Oylar soni 1 dan 24 gacha butun son bo\'lishi kerak';
    }
    if ((paymentType === 'CREDIT' || paymentType === 'INSTALLMENT') &&
      (!customInterestRate || isNaN(customInterestRate) || Number(customInterestRate) < 0)) {
      newErrors.customInterestRate = 'Foiz 0 dan katta yoki teng bo\'lishi kerak';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateFields()) {
      setNotification({ message: "Barcha maydonlarni to'g'ri to'ldiring", type: 'error' });
      return;
    }
    setSubmitting(true);
    setNotification(null);
    try {
      const userId = Number(localStorage.getItem('userId')) || 1;
      const baseTotal = selectedItems.reduce((sum, item) => sum + Number(item.quantity) * Number(item.price), 0);
      const m = Number(months);
      const interestRate = Number(customInterestRate) / 100 || 0;
      const finalTotal = baseTotal * (1 + interestRate);
      const paid = Number(customerPaid) || 0;
      const remaining = paid < finalTotal ? finalTotal - paid : 0;
      const monthlyPayment = m > 0 && remaining > 0 ? remaining / m : 0;
      const payload = {
        type: 'SALE',
        status: 'PENDING',
        total: baseTotal,
        finalTotal,
        amountPaid: paid,
        remainingBalance: remaining,
        paymentType: paymentType === 'INSTALLMENT' ? 'CREDIT' : paymentType,
        customer: {
          firstName,
          lastName,
          phone,
        },
        fromBranchId: Number(selectedBranch),
        soldByUserId: parseInt(localStorage.getItem('userId')) || null, // Kim sotganini saqlash
        items: selectedItems.map((item) => ({
          productId: item.id,
          productName: item.name,
          quantity: Number(item.quantity),
          price: Number(item.price),
          total: Number(item.quantity) * Number(item.price),
          ...(paymentType === 'CREDIT' || paymentType === 'INSTALLMENT' ? {
            creditMonth: m,
            creditPercent: interestRate,
            monthlyPayment,
          } : {}),
        })),
      };
      const response = await axiosWithAuth({
        method: 'post',
        url: `${API_URL}/transactions`,
        data: payload,
      });
      
      // Save transaction data for receipt
      setLastTransaction({
        ...response.data,
        customer: { firstName, lastName, phone },
        seller: users.find(u => u.id === Number(selectedSellerId)),
        branch: branches.find(b => b.id === Number(selectedBranch)),
        items: selectedItems,
        paymentType,
        months: m,
        interestRate: Number(customInterestRate),
        paid: paid,
        remaining: remaining,
        monthlyPayment
      });
      
      if (paymentType === 'CREDIT' || paymentType === 'INSTALLMENT') {
        generatePDF();
      }
      setNotification({ message: 'Sotuv muvaffaqiyatli amalga oshirildi', type: 'success' });
      closeSelectedItemsModal();
      setShowReceiptModal(true);
      setSelectedItems([]); // Clear cart after successful sale
      loadData();
    } catch (err) {
      const message = err.response?.data?.message || 'Tranzaksiya yaratishda xatolik';
      setNotification({ message, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const { totalWithInterest, monthlyPayment, schedule, change, remaining } = calculatePaymentSchedule();

  const selectedBranchName = branches.find((b) => b.id === Number(selectedBranchId))?.name || 'Filial topilmadi';

  return (
    <div className="ml-[255px] space-y-6 p-4">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Sotish</h1>

      {notification && (
        <div
          className={`p-4 rounded-lg mb-6 flex justify-between items-center ${notification.type === 'error' ? 'bg-red-100 text-red-700' :
            notification.type === 'warning' ? 'bg-yellow-100 text-yellow-700' :
              'bg-green-100 text-green-700'
            }`}
        >
          <span>{notification.message}</span>
          <button
            className="text-sm font-medium underline hover:text-gray-900"
            onClick={() => setNotification(null)}
          >
            Yopish
          </button>
        </div>
      )}

      <select
        value={selectedBranchId}
        onChange={(e) => setSelectedBranchId(e.target.value)}
        className="hidden"
      >
        <option value="">Filial tanlang</option>
        {branches.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>

      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Tovar qidirish..."
        className="w-full p-3 border border-gray-300 rounded-lg mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {loading ? (
        <div className="text-center text-gray-600">Yuklanmoqda...</div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-700">Mahsulotlar Qoldig'i</h2>
            <button
              onClick={openSelectedItemsModal}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
              disabled={selectedItems.length === 0}
            >
              <span>Savat</span>
              {selectedItems.length > 0 && (
                <span className="bg-white text-blue-500 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                  {selectedItems.length}
                </span>
              )}
            </button>
          </div>
          <div className="overflow-x-auto shadow-md rounded-lg">
            <table className="w-full bg-white border border-gray-200">
              <thead>
                <tr className="bg-gray-100 text-gray-600">
                  <th className="p-3 text-left font-medium">ID</th>
                  <th className="p-3 text-left font-medium">Nomi</th>
                  <th className="p-3 text-left font-medium">Barcode</th>
                  <th className="p-3 text-left font-medium">Filyali</th>
                  <th className="p-3 text-left font-medium">Narx</th>
                  <th className="p-3 text-left font-medium">Miqdor</th>
                  <th className="p-3 text-left font-medium">Amallar</th>
                </tr>
              </thead>
              <tbody>
                {products.length > 0 ? (
                  products.map((product) => (
                    <tr key={product.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="p-3 text-gray-700">#{product.id}</td>
                      <td className="p-3 text-gray-700">{product.name}</td>
                      <td className="p-3 text-gray-700">{product.barcode}</td>
                      <td className="p-3 text-gray-700">{product.branch.name}</td>
                      <td className="p-3 text-gray-700">{formatCurrency(product.price)}</td>
                      <td className="p-3 text-gray-700">{formatQuantity(product.quantity)}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            max={product.quantity}
                            defaultValue="1"
                            className="w-16 p-1 border border-gray-300 rounded text-sm"
                            id={`quantity-${product.id}`}
                          />
                          <button
                            onClick={() => {
                              if (product.quantity > 0) {
                                const quantityInput = document.getElementById(`quantity-${product.id}`);
                                const quantity = parseInt(quantityInput.value) || 1;
                                
                                if (quantity > product.quantity) {
                                  setNotification({ message: `Maksimal miqdor: ${product.quantity}`, type: 'warning' });
                                  return;
                                }
                                
                                // Allow adding the same product multiple times
                                setSelectedItems([
                                  ...selectedItems,
                                  {
                                    id: product.id,
                                    name: product.name,
                                    quantity: quantity,
                                    price: product.price.toString(),
                                    maxQuantity: product.quantity,
                                  },
                                ]);
                                setNotification({ message: `${product.name} (${quantity} dona) savatga qo'shildi`, type: 'success' });
                                quantityInput.value = "1";
                              } else {
                                setNotification({ message: 'Bu mahsulotdan qoldiq yo\'q', type: 'warning' });
                              }
                            }}
                            disabled={product.quantity <= 0}
                            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                              product.quantity > 0 
                                ? 'bg-green-500 text-white hover:bg-green-600' 
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                          >
                            Qo'shish
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="p-3 text-center text-gray-600">
                      Tovarlar topilmadi
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>



          {showModal && (
            <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 pt-4">
              <div className="bg-white rounded-lg p-8 w-full max-w-3xl overflow-y-auto max-h-[95vh]">
                <div className="flex justify-between items-center mb-6 sticky top-0 bg-white z-10">
                  <h3 className="text-2xl font-bold text-gray-800">Mijozga Sotish</h3>
                  <button
                    onClick={closeModal}
                    className="text-gray-600 hover:text-gray-800 font-bold text-xl"
                  >
                    &times;
                  </button>
                </div>
                <table className="w-full text-sm text-gray-700 border border-gray-200 shadow-md rounded-lg">
                  <tbody>
                    <tr className="border-b">
                      <td className="p-3 font-medium bg-gray-50">Filial</td>
                      <td className="p-3">
                        <div className="w-full p-2 border border-gray-300 rounded-lg bg-gray-50">
                          {selectedBranchName}
                        </div>
                        {errors.branch && (
                          <span className="text-red-500 text-xs">{errors.branch}</span>
                        )}
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3 font-medium bg-gray-50">Sotuvchi</td>
                      <td className="p-3">
                        <select
                          value={selectedSellerId}
                          onChange={(e) => setSelectedSellerId(e.target.value)}
                          className={`w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.seller ? 'border-red-500' : 'border-gray-300'}`}
                        >
                          <option value="">Sotuvchi tanlang</option>
                          {users.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.firstName} {user.lastName}
                            </option>
                          ))}
                        </select>
                        {errors.seller && (
                          <span className="text-red-500 text-xs">{errors.seller}</span>
                        )}
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3 font-medium bg-gray-50">Ism</td>
                      <td className="p-3">
                        <input
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className={`w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.firstName ? 'border-red-500' : 'border-gray-300'}`}
                        />
                        {errors.firstName && (
                          <span className="text-red-500 text-xs">{errors.firstName}</span>
                        )}
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3 font-medium bg-gray-50">Familiya</td>
                      <td className="p-3">
                        <input
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className={`w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.lastName ? 'border-red-500' : 'border-gray-300'}`}
                        />
                        {errors.lastName && (
                          <span className="text-red-500 text-xs">{errors.lastName}</span>
                        )}
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3 font-medium bg-gray-50">Telefon</td>
                      <td className="p-3">
                        <input
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className={`w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.phone ? 'border-red-500' : 'border-gray-300'}`}
                        />
                        {errors.phone && (
                          <span className="text-red-500 text-xs">{errors.phone}</span>
                        )}
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3 font-medium bg-gray-50">To'lov Turi</td>
                      <td className="p-3">
                        <select
                          value={paymentType}
                          onChange={(e) => setPaymentType(e.target.value)}
                          className={`w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.paymentType ? 'border-red-500' : 'border-gray-300'}`}
                        >
                          <option value="">Tanlang</option>
                          <option value="CASH">Naqd</option>
                          <option value="CARD">Karta</option>
                          <option value="CREDIT">Kredit</option>
                          <option value="INSTALLMENT">Bo'lib To'lash</option>
                        </select>
                        {errors.paymentType && (
                          <span className="text-red-500 text-xs">{errors.paymentType}</span>
                        )}
                      </td>
                    </tr>
                    {['CREDIT', 'INSTALLMENT'].includes(paymentType) && (
                      <>
                        <tr className="border-b">
                          <td className="p-3 font-medium bg-gray-50">Oylar Soni</td>
                          <td className="p-3">
                            <input
                              type="number"
                              value={months}
                              onChange={(e) => setMonths(e.target.value)}
                              className={`w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.months ? 'border-red-500' : 'border-gray-300'}`}
                              min="1"
                              max="24"
                              step="1"
                            />
                            {errors.months && (
                              <span className="text-red-500 text-xs">{errors.months}</span>
                            )}
                          </td>
                        </tr>
                        <tr className="border-b">
                          <td className="p-3 font-medium bg-gray-50">Foiz (%)</td>
                          <td className="p-3">
                            <input
                              type="number"
                              value={customInterestRate}
                              onChange={(e) => setCustomInterestRate(e.target.value)}
                              className={`w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.customInterestRate ? 'border-red-500' : 'border-gray-300'}`}
                              step="0.01"
                              min="0"
                            />
                            {errors.customInterestRate && (
                              <span className="text-red-500 text-xs">{errors.customInterestRate}</span>
                            )}
                          </td>
                        </tr>
                        <tr className="border-b">
                          <td className="p-3 font-medium bg-gray-50">Mijoz to'lagan</td>
                          <td className="p-3">
                            <input
                              type="number"
                              value={customerPaid}
                              onChange={(e) => setCustomerPaid(e.target.value)}
                              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300"
                              step="0.01"
                              min="0"
                            />
                          </td>
                        </tr>
                        <tr className="border-b">
                          <td className="p-3 font-medium bg-gray-50">Umumiy Summa</td>
                          <td className="p-3">{formatCurrency(totalWithInterest)}</td>
                        </tr>
                        <tr className="border-b">
                          <td className="p-3 font-medium bg-gray-50">Qaytim</td>
                          <td className="p-3">{formatCurrency(change)}</td>
                        </tr>
                        <tr className="border-b">
                          <td className="p-3 font-medium bg-gray-50">Qolgan Summa</td>
                          <td className="p-3">{formatCurrency(remaining)}</td>
                        </tr>
                        <tr className="border-b">
                          <td className="p-3 font-medium bg-gray-50">Oylik To'lov</td>
                          <td className="p-3">{formatCurrency(monthlyPayment)}</td>
                        </tr>
                      </>
                    )}
                    <tr className="border-b">
                      <td colSpan="2" className="p-3">
                        <h4 className="text-md font-bold mb-2">Mahsulot Tanlash</h4>
                        <div className="flex gap-2 mb-2">
                          <select
                            value={selectedProductId}
                            onChange={(e) => {
                              setSelectedProductId(e.target.value);
                              const product = products.find((p) => p.id === Number(e.target.value));
                              setTempPrice(product ? product.price.toString() : '');
                            }}
                            className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Mahsulot tanlang</option>
                            {products
                              .filter((p) => p.quantity > 0)
                              .map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({formatQuantity(p.quantity)} qoldiq)
                                </option>
                              ))}
                          </select>
                          <input
                            type="number"
                            value={tempQuantity}
                            onChange={(e) => setTempQuantity(e.target.value)}
                            placeholder="Miqdor"
                            className="w-24 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            min="1"
                            step="1"
                          />
                          <input
                            type="number"
                            value={tempPrice}
                            onChange={(e) => setTempPrice(e.target.value)}
                            placeholder="Narx"
                            className="w-24 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            step="0.01"
                            min="0"
                          />
                          <button
                            onClick={addItem}
                            className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
                            disabled={!selectedProductId || !tempQuantity}
                          >
                            Qo'shish
                          </button>
                        </div>
                        {errors.items && (
                          <span className="text-red-500 text-xs">{errors.items}</span>
                        )}
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td colSpan="2" className="p-3">
                        <h4 className="text-md font-bold mb-2">Tanlangan Mahsulotlar</h4>
                        {selectedItems.length === 0 ? (
                          <p className="text-gray-500">Mahsulot tanlanmadi</p>
                        ) : (
                          <table className="w-full text-sm border">
                            <thead>
                              <tr className="bg-gray-100">
                                <th className="p-2">Mahsulot</th>
                                <th className="p-2">Narx</th>
                                <th className="p-2">Miqdor</th>
                                <th className="p-2">Amallar</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedItems.map((item, index) => (
                                <tr key={index} className="border-t">
                                  <td className="p-2">{item.name}</td>
                                  <td className="p-2">
                                    <input
                                      type="number"
                                      value={item.price}
                                      onChange={(e) => updateItem(index, 'price', e.target.value)}
                                      className={`w-full p-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors[`price_${index}`] ? 'border-red-500' : ''}`}
                                      step="0.01"
                                      min="0"
                                    />
                                    {errors[`price_${index}`] && (
                                      <span className="text-red-500 text-xs">{errors[`price_${index}`]}</span>
                                    )}
                                  </td>
                                  <td className="p-2">
                                    <input
                                      type="number"
                                      value={item.quantity}
                                      onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                      className={`w-full p-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors[`quantity_${index}`] ? 'border-red-500' : ''}`}
                                      min="1"
                                      step="1"
                                    />
                                    {errors[`quantity_${index}`] && (
                                      <span className="text-red-500 text-xs">{errors[`quantity_${index}`]}</span>
                                    )}
                                  </td>
                                  <td className="p-2">
                                    <button
                                      onClick={() => removeItem(index)}
                                      className="bg-red-500 text-white px-2 py-1 rounded-lg hover:bg-red-600 transition-colors"
                                    >
                                      O'chirish
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </td>
                    </tr>
                    {['CREDIT', 'INSTALLMENT'].includes(paymentType) && months && Number(months) > 0 && (
                      <tr className="border-b">
                        <td colSpan="2" className="p-3">
                          <h4 className="text-md font-bold mb-2">To'lov Jadvali</h4>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm border">
                              <thead>
                                <tr className="bg-gray-100">
                                  <th className="p-2">Oylik</th>
                                  <th className="p-2">To'lov Summasi</th>
                                  <th className="p-2">Qoldiq Summa</th>
                                </tr>
                              </thead>
                              <tbody>
                                {schedule.map((row) => (
                                  <tr key={row.month} className="border-t">
                                    <td className="p-2">{row.month}</td>
                                    <td className="p-2">{formatCurrency(row.payment)}</td>
                                    <td className="p-2">{formatCurrency(row.remainingBalance)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex-1 bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600 disabled:bg-gray-400 transition-colors"
                  >
                    {submitting ? 'Yuklanmoqda...' : 'Saqlash'}
                  </button>
                  <button
                    onClick={closeModal}
                    className="flex-1 bg-gray-200 text-gray-700 p-3 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Bekor
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Selected Items Modal */}
          {showSelectedItemsModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-gray-800">Tanlangan Mahsulotlar</h3>
                  <button
                    onClick={closeSelectedItemsModal}
                    className="text-gray-600 hover:text-gray-800 font-bold text-xl"
                  >
                    &times;
                  </button>
                </div>
                
                <div className="overflow-x-auto mb-6">
                  <table className="w-full border border-gray-200">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="p-3 text-left font-medium">Mahsulot</th>
                        <th className="p-3 text-left font-medium">Narx</th>
                        <th className="p-3 text-left font-medium">Miqdor</th>
                        <th className="p-3 text-left font-medium">Jami</th>
                        <th className="p-3 text-left font-medium">Amallar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedItems.map((item, index) => (
                        <tr key={index} className="border-t border-gray-200">
                          <td className="p-3">{item.name}</td>
                          <td className="p-3">
                            <input
                              type="number"
                              value={item.price}
                              onChange={(e) => updateItem(index, 'price', e.target.value)}
                              className={`w-24 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors[`price_${index}`] ? 'border-red-500' : 'border-gray-300'}`}
                              step="0.01"
                              min="0"
                            />
                            {errors[`price_${index}`] && (
                              <span className="text-red-500 text-xs block">{errors[`price_${index}`]}</span>
                            )}
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                              className={`w-20 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors[`quantity_${index}`] ? 'border-red-500' : 'border-gray-300'}`}
                              min="1"
                              max={item.maxQuantity}
                              step="1"
                            />
                            {errors[`quantity_${index}`] && (
                              <span className="text-red-500 text-xs block">{errors[`quantity_${index}`]}</span>
                            )}
                          </td>
                          <td className="p-3 font-medium">
                            {formatCurrency(Number(item.quantity) * Number(item.price))}
                          </td>
                          <td className="p-3">
                            <button
                              onClick={() => removeItem(index)}
                              className="bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600 transition-colors text-sm"
                            >
                              O'chirish
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Customer Information */}
                  <div>
                    <h4 className="text-md font-semibold mb-3">Mijoz Ma'lumotlari</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Sotuvchi</label>
                        <select
                          value={selectedSellerId}
                          onChange={(e) => setSelectedSellerId(e.target.value)}
                          className={`w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.seller ? 'border-red-500' : 'border-gray-300'}`}
                        >
                          <option value="">Sotuvchi tanlang</option>
                          {users.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.firstName} {user.lastName}
                            </option>
                          ))}
                        </select>
                        {errors.seller && (
                          <span className="text-red-500 text-xs">{errors.seller}</span>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ism</label>
                        <input
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className={`w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.firstName ? 'border-red-500' : 'border-gray-300'}`}
                        />
                        {errors.firstName && (
                          <span className="text-red-500 text-xs">{errors.firstName}</span>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Familiya</label>
                        <input
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className={`w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.lastName ? 'border-red-500' : 'border-gray-300'}`}
                        />
                        {errors.lastName && (
                          <span className="text-red-500 text-xs">{errors.lastName}</span>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                        <input
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className={`w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.phone ? 'border-red-500' : 'border-gray-300'}`}
                        />
                        {errors.phone && (
                          <span className="text-red-500 text-xs">{errors.phone}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Payment Information */}
                  <div>
                    <h4 className="text-md font-semibold mb-3">To'lov Ma'lumotlari</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">To'lov Turi</label>
                        <select
                          value={paymentType}
                          onChange={(e) => setPaymentType(e.target.value)}
                          className={`w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.paymentType ? 'border-red-500' : 'border-gray-300'}`}
                        >
                          <option value="">Tanlang</option>
                          <option value="CASH">Naqd</option>
                          <option value="CARD">Karta</option>
                          <option value="CREDIT">Kredit</option>
                          <option value="INSTALLMENT">Bo'lib To'lash</option>
                        </select>
                        {errors.paymentType && (
                          <span className="text-red-500 text-xs">{errors.paymentType}</span>
                        )}
                      </div>

                      {['CREDIT', 'INSTALLMENT'].includes(paymentType) && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Oylar Soni</label>
                            <input
                              type="number"
                              value={months}
                              onChange={(e) => setMonths(e.target.value)}
                              className={`w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.months ? 'border-red-500' : 'border-gray-300'}`}
                              min="1"
                              max="24"
                              step="1"
                            />
                            {errors.months && (
                              <span className="text-red-500 text-xs">{errors.months}</span>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Foiz (%)</label>
                            <input
                              type="number"
                              value={customInterestRate}
                              onChange={(e) => setCustomInterestRate(e.target.value)}
                              className={`w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.customInterestRate ? 'border-red-500' : 'border-gray-300'}`}
                              step="0.01"
                              min="0"
                            />
                            {errors.customInterestRate && (
                              <span className="text-red-500 text-xs">{errors.customInterestRate}</span>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Mijoz to'lagan</label>
                            <input
                              type="number"
                              value={customerPaid}
                              onChange={(e) => setCustomerPaid(e.target.value)}
                              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300"
                              step="0.01"
                              min="0"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-md font-semibold mb-3">Jami</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Asosiy summa:</span>
                      <span className="font-medium ml-2">{formatCurrency(selectedItems.reduce((sum, item) => sum + Number(item.quantity) * Number(item.price), 0))}</span>
                    </div>
                    {['CREDIT', 'INSTALLMENT'].includes(paymentType) && (
                      <>
                        <div>
                          <span className="text-gray-600">Foiz bilan:</span>
                          <span className="font-medium ml-2">{formatCurrency(totalWithInterest)}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">To'langan:</span>
                          <span className="font-medium ml-2">{formatCurrency(Number(customerPaid) || 0)}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Qolgan:</span>
                          <span className="font-medium ml-2">{formatCurrency(remaining)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex-1 bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600 disabled:bg-gray-400 transition-colors font-medium"
                  >
                    {submitting ? 'Yuklanmoqda...' : 'Sotishni amalga oshirish'}
                  </button>
                  <button
                    onClick={closeSelectedItemsModal}
                    className="flex-1 bg-gray-200 text-gray-700 p-3 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Bekor
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Receipt Modal */}
          {showReceiptModal && lastTransaction && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-2">Chek</h3>
                  <p className="text-sm text-gray-600">{formatDate(new Date())}</p>
                </div>
                
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tranzaksiya ID:</span>
                    <span className="font-medium">#{lastTransaction.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Mijoz:</span>
                    <span className="font-medium">{lastTransaction.customer.firstName} {lastTransaction.customer.lastName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Telefon:</span>
                    <span className="font-medium">{lastTransaction.customer.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Sotuvchi:</span>
                    <span className="font-medium">{lastTransaction.seller?.firstName} {lastTransaction.seller?.lastName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Filial:</span>
                    <span className="font-medium">{lastTransaction.branch?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">To'lov turi:</span>
                    <span className="font-medium">
                      {lastTransaction.paymentType === 'CASH' ? 'Naqd' : 
                       lastTransaction.paymentType === 'CARD' ? 'Karta' : 
                       lastTransaction.paymentType === 'CREDIT' ? 'Kredit' : 
                       lastTransaction.paymentType === 'INSTALLMENT' ? "Bo'lib to'lash" : lastTransaction.paymentType}
                    </span>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4 mb-6">
                  <h4 className="font-semibold mb-3">Mahsulotlar:</h4>
                  <div className="space-y-2">
                    {lastTransaction.items.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>{item.name} x {item.quantity}</span>
                        <span>{formatCurrency(Number(item.quantity) * Number(item.price))}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4 mb-6">
                  <div className="flex justify-between font-semibold">
                    <span>Jami:</span>
                    <span>{formatCurrency(lastTransaction.finalTotal)}</span>
                  </div>
                  {['CREDIT', 'INSTALLMENT'].includes(lastTransaction.paymentType) && (
                    <>
                      <div className="flex justify-between text-sm mt-2">
                        <span>To'langan:</span>
                        <span>{formatCurrency(lastTransaction.paid)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Qolgan:</span>
                        <span>{formatCurrency(lastTransaction.remaining)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Oylik to'lov:</span>
                        <span>{formatCurrency(lastTransaction.monthlyPayment)}</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={closeReceiptModal}
                    className="flex-1 bg-gray-200 text-gray-700 p-3 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Yopish
                  </button>
                  <button
                    onClick={() => {
                      const printWindow = window.open('', '_blank');
                      const receiptContent = `
                        <!DOCTYPE html>
                        <html>
                        <head>
                          <title>Chek</title>
                          <style>
                            body { font-family: Arial, sans-serif; margin: 20px; }
                            .header { text-align: center; margin-bottom: 20px; }
                            .info { margin-bottom: 15px; }
                            .info-row { display: flex; justify-content: space-between; margin: 5px 0; }
                            .products { margin: 20px 0; }
                            .product-row { display: flex; justify-content: space-between; margin: 5px 0; }
                            .total { border-top: 1px solid #ccc; padding-top: 10px; margin-top: 15px; }
                            .total-row { display: flex; justify-content: space-between; margin: 5px 0; font-weight: bold; }
                            @media print { body { margin: 0; } }
                          </style>
                        </head>
                        <body>
                          <div class="header">
                            <h2>Chek</h2>
                            <p>${formatDate(new Date())}</p>
                          </div>
                          
                          <div class="info">
                            <div class="info-row">
                              <span>Tranzaksiya ID:</span>
                              <span>#${lastTransaction.id}</span>
                            </div>
                            <div class="info-row">
                              <span>Mijoz:</span>
                              <span>${lastTransaction.customer.firstName} ${lastTransaction.customer.lastName}</span>
                            </div>
                            <div class="info-row">
                              <span>Telefon:</span>
                              <span>${lastTransaction.customer.phone}</span>
                            </div>
                            <div class="info-row">
                              <span>Sotuvchi:</span>
                              <span>${lastTransaction.seller?.firstName} ${lastTransaction.seller?.lastName}</span>
                            </div>
                            <div class="info-row">
                              <span>Filial:</span>
                              <span>${lastTransaction.branch?.name}</span>
                            </div>
                            <div class="info-row">
                              <span>To'lov turi:</span>
                              <span>${lastTransaction.paymentType === 'CASH' ? 'Naqd' : 
                                   lastTransaction.paymentType === 'CARD' ? 'Karta' : 
                                   lastTransaction.paymentType === 'CREDIT' ? 'Kredit' : 
                                   lastTransaction.paymentType === 'INSTALLMENT' ? "Bo'lib to'lash" : lastTransaction.paymentType}</span>
                            </div>
                          </div>

                          <div class="products">
                            <h4>Mahsulotlar:</h4>
                            ${lastTransaction.items.map((item, index) => `
                              <div class="product-row">
                                <span>${item.name} x ${item.quantity}</span>
                                <span>${formatCurrency(Number(item.quantity) * Number(item.price))}</span>
                              </div>
                            `).join('')}
                          </div>

                          <div class="total">
                            <div class="total-row">
                              <span>Jami:</span>
                              <span>${formatCurrency(lastTransaction.finalTotal)}</span>
                            </div>
                            ${['CREDIT', 'INSTALLMENT'].includes(lastTransaction.paymentType) ? `
                              <div class="info-row">
                                <span>To'langan:</span>
                                <span>${formatCurrency(lastTransaction.paid)}</span>
                              </div>
                              <div class="info-row">
                                <span>Qolgan:</span>
                                <span>${formatCurrency(lastTransaction.remaining)}</span>
                              </div>
                              <div class="info-row">
                                <span>Oylik to'lov:</span>
                                <span>${formatCurrency(lastTransaction.monthlyPayment)}</span>
                              </div>
                            ` : ''}
                          </div>
                        </body>
                        </html>
                      `;
                      printWindow.document.write(receiptContent);
                      printWindow.document.close();
                      printWindow.focus();
                      setTimeout(() => {
                        printWindow.print();
                        printWindow.close();
                      }, 500);
                    }}
                    className="flex-1 bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Chop etish
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SalesManagement;