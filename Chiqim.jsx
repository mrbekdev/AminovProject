import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Chiqim = () => {
  const [products, setProducts] = useState([]);
  const [modalProducts, setModalProducts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [tempQuantity, setTempQuantity] = useState('');
  const [tempPrice, setTempPrice] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [toBranch, setToBranch] = useState('');
  const [operationType, setOperationType] = useState('SALE');
  const [paymentType, setPaymentType] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [downPayment, setDownPayment] = useState(''); // Boshlang'ich to'lov
  const [months, setMonths] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [marketingUsers, setMarketingUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const navigate = useNavigate();
  const API_URL = 'https://suddocs.uz';

  const formatCurrency = (amount) =>
    amount != null && Number.isFinite(Number(amount))
      ? new Intl.NumberFormat('uz-UZ').format(Number(amount)) + " so'm"
      : "Noma'lum";

  const formatQuantity = (qty) =>
    qty != null && Number.isFinite(Number(qty))
      ? new Intl.NumberFormat('uz-UZ').format(Number(qty)) + ' dona'
      : '0 dona';

  const formatDate = (date) =>
    date ? new Date(date).toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' }) : "Noma'lum";

  const calculatePaymentSchedule = () => {
    const m = Number(months);
    const rate = Number(interestRate) / 100;
    const downPaymentAmount = Number(downPayment) || 0;
    
    if (!m || m <= 0 || selectedItems.length === 0 || operationType !== 'SALE' || rate < 0) {
      return { totalWithInterest: 0, monthlyPayment: 0, schedule: [], downPaymentAmount: 0 };
    }

    const baseTotal = selectedItems.reduce((sum, item) => sum + Number(item.quantity) * Number(item.price), 0);
    const totalWithInterest = baseTotal * (1 + rate);
    const remainingAfterDownPayment = totalWithInterest - downPaymentAmount;
    const monthlyPayment = remainingAfterDownPayment / m;
    const schedule = [];

    let remainingBalance = remainingAfterDownPayment;
    for (let i = 1; i <= m; i++) {
      schedule.push({
        month: i,
        payment: monthlyPayment,
        remainingBalance: Math.max(0, remainingBalance - monthlyPayment),
      });
      remainingBalance -= monthlyPayment;
    }

    return { totalWithInterest, monthlyPayment, schedule, downPaymentAmount, remainingAfterDownPayment };
  };

  const generatePDF = () => {
    if (selectedItems.length === 0 || operationType !== 'SALE') return;
    const m = Number(months);
    const rate = Number(interestRate);
    const { totalWithInterest, monthlyPayment, schedule } = calculatePaymentSchedule();
    const branchName = branches.find((b) => b.id === Number(selectedBranch))?.name || 'Noma\'lum';
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
  Sana: ${escapeLatex(date)}\\\\
  To'lov Turi: ${paymentType === 'CREDIT' ? 'Kredit' : 'Bo\'lib To\'lash'}\\\\
  Muddat: ${m} oy\\\\
  Foiz: ${rate.toFixed(2)}\\%\\\\
  Umumiy Summa (foiz bilan): ${formatCurrency(totalWithInterest)}\\\\
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
    const token = localStorage.getItem('access_token');
    if (!token) {
      setNotification({ message: 'Sessiya topilmadi, iltimos tizimga kiring', type: 'error' });
      setTimeout(() => navigate('/login'), 2000);
      throw new Error('No access token');
    }
    const headers = { ...config.headers, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    try {
      return await axios({ ...config, headers });
    } catch (error) {
      if (error.response?.status === 401) {
        setNotification({ message: 'Sessiya tugadi, iltimos qayta kiring', type: 'error' });
        localStorage.clear();
        setTimeout(() => navigate('/login'), 2000);
        throw new Error('Sessiya tugadi');
      }
      throw error;
    }
  };

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const branchesRes = await axiosWithAuth({ method: 'get', url: `${API_URL}/branches` });
        const branchesData = Array.isArray(branchesRes.data) ? branchesRes.data : branchesRes.data.branches || [];
        setBranches(branchesData);
        const omborBranch = branchesData.find((b) => b.name?.toLowerCase() === 'ombor');
        if (omborBranch) {
          setSelectedBranchId(omborBranch.id.toString());
        } else {
          setNotification({ message: '"Ombor" filiali topilmadi', type: 'warning' });
        }
      } catch (err) {
        setNotification({ message: err.message || 'Filiallarni yuklashda xatolik', type: 'error' });
        console.error('Fetch branches error:', err);
      }
    };
    fetchBranches();
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setNotification(null);
    const branchId = Number(selectedBranchId);
    if (!branchId || isNaN(branchId) || !Number.isInteger(branchId)) {
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
      
      let allProducts = [];
      let page = 1;
      while (true) {
        const productsRes = await axiosWithAuth({
          method: 'get',
          url: `${API_URL}/products?${queryParams.toString()}&page=${page}`,
        });
        const productsData = Array.isArray(productsRes.data) ? productsRes.data : productsRes.data.products || [];
        allProducts = [...allProducts, ...productsData];
        if (!productsRes.data.nextPage) break;
        page++;
      }
      setProducts(
        allProducts.map((product) => ({
          ...product,
          name:
            product.name ??
            product.productName ??
            product.title ??
            product.item_name ??
            product.product_title ??
            product.item_title ??
            `Product ${product.id}`,
          price: Number(product.price) || 0,
          quantity: Number(product.quantity) || 0,
        })),
      );
    } catch (err) {
      setNotification({ message: err.message || 'Ma\'lumotlarni yuklashda xatolik', type: 'error' });
      console.error('Load products error:', err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedBranchId]);

  useEffect(() => {
    if (selectedBranchId) loadData();
  }, [loadData, selectedBranchId]);

  const loadModalData = useCallback(async () => {
    const branchId = Number(selectedBranch);
    if (!branchId || isNaN(branchId) || !Number.isInteger(branchId)) {
      return;
    }

    try {
      const queryParams = new URLSearchParams();
      queryParams.append('branchId', branchId.toString());
      queryParams.append('includeZeroQuantity', 'true');
      
      let allProducts = [];
      let page = 1;
      while (true) {
        const productsRes = await axiosWithAuth({
          method: 'get',
          url: `${API_URL}/products?${queryParams.toString()}&page=${page}`,
        });
        const productsData = Array.isArray(productsRes.data) ? productsRes.data : productsRes.data.products || [];
        allProducts = [...allProducts, ...productsData];
        if (!productsRes.data.nextPage) break;
        page++;
      }
      setModalProducts(
        allProducts.map((product) => ({
          ...product,
          name:
            product.name ??
            product.productName ??
            product.title ??
            product.item_name ??
            product.product_title ??
            product.item_title ??
            `Product ${product.id}`,
          price: Number(product.price) || 0,
          quantity: Number(product.quantity) || 0,
        })),
      );
    } catch (err) {
      console.error('Load modal products error:', err);
    }
  }, [selectedBranch]);

  useEffect(() => {
    if (showModal && selectedBranch) loadModalData();
  }, [showModal, selectedBranch, loadModalData]);

  // Current user ni olish
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const response = await axios.get(`${API_URL}/auth/profile`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setCurrentUser(response.data);
        }
      } catch (error) {
        console.error('Error loading current user:', error);
      }
    };
    
    loadCurrentUser();
  }, []);

  // MARKETING roli bilan userlarni olish
  useEffect(() => {
    const loadMarketingUsers = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const response = await axios.get(`${API_URL}/users`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          // Faqat MARKETING roli bilan userlarni filtrlash
          const marketingUsersList = response.data.filter(user => user.role === 'MARKETING');
          setMarketingUsers(marketingUsersList);
        }
      } catch (error) {
        console.error('Error loading marketing users:', error);
      }
    };
    
    loadMarketingUsers();
  }, []);

  const openModal = () => {
    setSelectedItems([]);
    setSelectedBranch(selectedBranchId || '');
    setToBranch('');
    setOperationType('SALE');
    setFirstName('');
    setLastName('');
    setPhone('');
    setPaymentType('');
    setMonths('');
    setInterestRate('');
    setDownPayment('');
    setSelectedUserId(''); // User ID ni tozalash
    setErrors({});
    setSelectedProductId('');
    setTempQuantity('');
    setTempPrice('');
    setModalProducts(products);
    setShowModal(true);
  };

  const addItem = () => {
    if (!selectedProductId || !tempQuantity) return;
    const product = modalProducts.find((p) => p.id === Number(selectedProductId));
    if (!product) return;
    if (selectedItems.find((item) => item.id === product.id)) {
      setNotification({ message: 'Bu mahsulot allaqachon tanlangan', type: 'warning' });
      return;
    }
    const price = tempPrice || product.price.toString();
    if (Number(price) <= 0) {
      setNotification({ message: 'Narx 0 dan katta bo\'lishi kerak', type: 'error' });
      return;
    }
    setSelectedItems([
      ...selectedItems,
      {
        id: product.id,
        name: product.name,
        quantity: tempQuantity,
        price,
        maxQuantity: product.quantity,
      },
    ]);
    setSelectedProductId('');
    setTempQuantity('');
    setTempPrice('');
  };

  const updateItem = (index, field, value) => {
    setSelectedItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  };

  const removeItem = (index) => {
    setSelectedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedItems([]);
    setSelectedBranch('');
    setToBranch('');
    setOperationType('SALE');
    setFirstName('');
    setLastName('');
    setPhone('');
    setPaymentType('');
    setMonths('');
    setInterestRate('');
    setDownPayment('');
    setErrors({});
    setNotification(null);
    setSelectedProductId('');
    setTempQuantity('');
    setTempPrice('');
    setModalProducts([]);
  };

  const validateFields = () => {
    const newErrors = {};
    if (selectedItems.length === 0) newErrors.items = 'Kamida bitta mahsulot tanlanishi shart';
    selectedItems.forEach((item, index) => {
      if (!item.quantity || isNaN(item.quantity) || Number(item.quantity) <= 0 || !Number.isInteger(Number(item.quantity))) {
        newErrors[`quantity_${index}`] = 'Miqdor 0 dan katta butun son bo\'lishi kerak';
      } else if (Number(item.quantity) > item.maxQuantity) {
        newErrors[`quantity_${index}`] = `Maksimal miqdor: ${item.maxQuantity} dona`;
      }
      if (!item.price || isNaN(item.price) || Number(item.price) <= 0) {
        newErrors[`price_${index}`] = 'Narx 0 dan katta bo\'lishi kerak';
      }
    });
    if (!selectedBranch) {
      newErrors.branch = 'Filial tanlanishi shart';
    }
    if (operationType === 'SALE') {
      if (!firstName.trim()) newErrors.firstName = 'Ism kiritilishi shart';
      if (!lastName.trim()) newErrors.lastName = 'Familiya kiritilishi shart';
      if (!phone.trim() || !/^\+?[1-9]\d{1,14}$/.test(phone)) newErrors.phone = 'Telefon raqami to\'g\'ri kiritilishi shart';
      if (!selectedUserId) newErrors.userId = 'Sotuvchi tanlanishi shart';
      if (!paymentType) newErrors.paymentType = 'To\'lov turi tanlanishi shart';
      if ((paymentType === 'CREDIT' || paymentType === 'INSTALLMENT')) {
        if (!months || isNaN(months) || Number(months) <= 0 || !Number.isInteger(Number(months)) || Number(months) > 24) {
          newErrors.months = 'Oylar soni 1 dan 24 gacha butun son bo\'lishi kerak';
        }
        if (!interestRate || isNaN(interestRate) || Number(interestRate) < 0 || Number(interestRate) > 100) {
          newErrors.interestRate = 'Foiz 0 dan 100 gacha bo\'lishi kerak';
        }
        if (downPayment && (isNaN(downPayment) || Number(downPayment) < 0)) {
          newErrors.downPayment = 'Boshlang\'ich to\'lov 0 dan katta bo\'lishi kerak';
        }
      }
    } else if (operationType === 'TRANSFER') {
      if (!toBranch) newErrors.toBranch = 'Qabul qiluvchi filial tanlanishi shart';
      else if (toBranch === selectedBranch) newErrors.toBranch = 'Qabul qiluvchi filial boshqa bo\'lishi kerak';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateFields()) {
      setNotification({ message: 'Barcha maydonlarni to\'g\'ri to\'ldiring', type: 'error' });
      return;
    }
    setSubmitting(true);
    setNotification(null);
    try {
      const baseTotal = selectedItems.reduce((sum, item) => sum + Number(item.quantity) * Number(item.price), 0);
      let finalTotal = baseTotal;
      let customerData = undefined;
      let toBranchId = undefined;

      if (operationType === 'SALE') {
        const m = Number(months);
        const rate = Number(interestRate) / 100;
        if (paymentType === 'CREDIT' || paymentType === 'INSTALLMENT') {
          finalTotal = baseTotal * (1 + rate);
        }
        customerData = {
          fullName: `${firstName} ${lastName}`.trim(),
          phone,
        };
      } else if (operationType === 'TRANSFER') {
        toBranchId = Number(toBranch);
      }

      const payload = {
        type: operationType,
        status: 'PENDING',
        total: baseTotal,
        finalTotal,
        downPayment: (paymentType === 'CREDIT' || paymentType === 'INSTALLMENT') ? Number(downPayment) || 0 : undefined,
        paymentType: operationType === 'SALE' ? paymentType : undefined,
        customer: customerData,
        fromBranchId: Number(selectedBranch),
        toBranchId,
        userId: Number(selectedUserId), // Sotuvchi ID ni qo'shamiz
        soldByUserId: parseInt(localStorage.getItem('userId')) || null, // Kim sotganini saqlash
        items: selectedItems.map((item) => ({
          productId: item.id,
          quantity: Number(item.quantity),
          price: Number(item.price),
          creditMonth: (paymentType === 'CREDIT' || paymentType === 'INSTALLMENT') ? Number(months) : undefined,
          creditPercent: (paymentType === 'CREDIT' || paymentType === 'INSTALLMENT') ? Number(interestRate) / 100 : undefined,
          monthlyPayment: (paymentType === 'CREDIT' || paymentType === 'INSTALLMENT') ? 
            (Number(item.quantity) * Number(item.price) * (1 + Number(interestRate) / 100)) / Number(months) : undefined,
        })),
      };

      console.log('Submitting transaction:', JSON.stringify(payload, null, 2));
      
      let response;
      if (operationType === 'TRANSFER') {
        response = await axiosWithAuth({
          method: 'post',
          url: `${API_URL}/transactions/transfer`,
          data: {
            fromBranchId: Number(selectedBranch),
            toBranchId: Number(toBranch),
            soldByUserId: parseInt(localStorage.getItem('userId')) || null, // Kim sotganini saqlash
            items: selectedItems.map((item) => ({
              productId: item.id,
              quantity: Number(item.quantity),
              price: Number(item.price),
            })),
          },
        });
      } else {
        // SALE uchun oddiy transaction endpoint ishlatamiz
        response = await axiosWithAuth({
          method: 'post',
          url: `${API_URL}/transactions`,
          data: payload,
        });
      }

      console.log('Transaction response:', response.data);
      
      if (operationType === 'SALE' && (paymentType === 'CREDIT' || paymentType === 'INSTALLMENT')) {
        generatePDF();
      }
      
      setNotification({ message: 'Amal muvaffaqiyatli amalga oshirildi', type: 'success' });
      closeModal();
      loadData();
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Tranzaksiya yaratishda xatolik';
      setNotification({ message, type: 'error' });
      console.error('Submit error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const { totalWithInterest, monthlyPayment, schedule } = calculatePaymentSchedule();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Chiqim</h1>
      <select
        value={selectedBranchId}
        onChange={(e) => setSelectedBranchId(e.target.value)}
        className="w-full p-2 border rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
      >
        <option value="">Filial tanlang</option>
        {branches.map((b) => (
          <option key={b.id} value={b.id}>{b.name}</option>
        ))}
      </select>
      {notification && (
        <div
          className={`p-4 rounded-lg flex items-center gap-3 mb-4 ${
            notification.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
            notification.type === 'warning' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
            'bg-green-50 text-green-700 border border-green-200'
          }`}
        >
          <span>{notification.message}</span>
          <button className="text-sm underline hover:no-underline transition-all" onClick={() => setNotification(null)}>
            Yopish
          </button>
        </div>
      )}
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Tovar qidirish..."
        className="w-full p-2 border rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
      />
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          <span className="ml-2">Yuklanmoqda...</span>
        </div>
      ) : (
        <>
          <h2 className="text-xl font-bold mb-2 text-gray-800">Mahsulotlar Qoldig'i</h2>
          <div className="flex gap-4 mb-4">
            <button
              onClick={openModal}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 disabled:bg-gray-400 transition-all duration-200"
              disabled={submitting || !selectedBranchId}
            >
              Chiqim Qilish
            </button>
          </div>
          <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table className="w-full border">
              <thead>
                <tr className="bg-gray-100 text-left">
                  <th className="p-3">ID</th>
                  <th className="p-3">Nomi</th>
                  <th className="p-3">Filial</th>
                  <th className="p-3">Narx</th>
                  <th className="p-3">Miqdor</th>
                </tr>
              </thead>
              <tbody>
                {products.length > 0 ? (
                  products.map((product) => (
                    <tr key={product.id} className="border-t hover:bg-gray-50">
                      <td className="p-3">#{product.id}</td>
                      <td className="p-3">{product.name}</td>
                      <td className="p-3">{product.branch?.name || 'Noma\'lum'}</td>
                      <td className="p-3">{formatCurrency(product.price)}</td>
                      <td className="p-3">{formatQuantity(product.quantity)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="p-3 text-center">Tovarlar topilmadi</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {showModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold">Chiqim Qilish</h3>
                    {currentUser && (
                      <p className="text-sm text-gray-600">
                        Sotuvchi: {currentUser.firstName || currentUser.lastName || 'Noma\'lum'} 
                        ({currentUser.role})
                      </p>
                    )}
                  </div>
                  <button onClick={closeModal} className="text-gray-600 hover:text-gray-800 transition-all">X</button>
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    <tr>
                      <td className="py-2">Chiqim Turi</td>
                      <td>
                        <select
                          value={operationType}
                          onChange={(e) => setOperationType(e.target.value)}
                          className="w-full p-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="SALE">Mijozga Sotish</option>
                          <option value="TRANSFER">Filialga O'tkazish</option>
                        </select>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2">Chiqim Filiali</td>
                      <td>
                        <select
                          value={selectedBranch}
                          onChange={(e) => setSelectedBranch(e.target.value)}
                          className={`w-full p-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.branch ? 'border-red-500' : ''}`}
                        >
                          <option value="">Tanlang</option>
                          {branches.map((b) => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                        </select>
                        {errors.branch && <span className="text-red-500 text-xs">{errors.branch}</span>}
                      </td>
                    </tr>
                    {operationType === 'TRANSFER' && (
                      <tr>
                        <td className="py-2">Qabul Filiali</td>
                        <td>
                          <select
                            value={toBranch}
                            onChange={(e) => setToBranch(e.target.value)}
                            className={`w-full p-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.toBranch ? 'border-red-500' : ''}`}
                          >
                            <option value="">Tanlang</option>
                            {branches.filter((b) => b.id !== Number(selectedBranch)).map((b) => (
                              <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                          </select>
                          {errors.toBranch && <span className="text-red-500 text-xs">{errors.toBranch}</span>}
                        </td>
                      </tr>
                    )}
                    {operationType === 'SALE' && (
                      <>
                        <tr>
                          <td className="py-2">Ism</td>
                          <td>
                            <input
                              value={firstName}
                              onChange={(e) => setFirstName(e.target.value)}
                              className={`w-full p-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.firstName ? 'border-red-500' : ''}`}
                            />
                            {errors.firstName && <span className="text-red-500 text-xs">{errors.firstName}</span>}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2">Familiya</td>
                          <td>
                            <input
                              value={lastName}
                              onChange={(e) => setLastName(e.target.value)}
                              className={`w-full p-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.lastName ? 'border-red-500' : ''}`}
                            />
                            {errors.lastName && <span className="text-red-500 text-xs">{errors.lastName}</span>}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2">Telefon</td>
                          <td>
                            <input
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              className={`w-full p-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.phone ? 'border-red-500' : ''}`}
                            />
                            {errors.phone && <span className="text-red-500 text-xs">{errors.phone}</span>}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2">Sotuvchi</td>
                          <td>
                            <select
                              value={selectedUserId}
                              onChange={(e) => setSelectedUserId(e.target.value)}
                              className={`w-full p-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.userId ? 'border-red-500' : ''}`}
                            >
                              <option value="">Sotuvchini tanlang</option>
                              {marketingUsers.map((user) => (
                                <option key={user.id} value={user.id}>
                                  {user.firstName || user.lastName || 'Noma\'lum'} ({user.role})
                                </option>
                              ))}
                            </select>
                            {errors.userId && <span className="text-red-500 text-xs">{errors.userId}</span>}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2">To'lov Turi</td>
                          <td>
                            <select
                              value={paymentType}
                              onChange={(e) => setPaymentType(e.target.value)}
                              className={`w-full p-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.paymentType ? 'border-red-500' : ''}`}
                            >
                              <option value="">Tanlang</option>
                              <option value="CASH">Naqd</option>
                              <option value="CARD">Karta</option>
                              <option value="CREDIT">Kredit</option>
                              <option value="INSTALLMENT">Bo'lib To'lash</option>
                            </select>
                            {errors.paymentType && <span className="text-red-500 text-xs">{errors.paymentType}</span>}
                          </td>
                        </tr>
                        {['CREDIT', 'INSTALLMENT'].includes(paymentType) && (
                          <>
                            <tr>
                              <td className="py-2">Oylar Soni</td>
                              <td>
                                <input
                                  type="number"
                                  value={months}
                                  onChange={(e) => setMonths(e.target.value)}
                                  className={`w-full p-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.months ? 'border-red-500' : ''}`}
                                  min="1"
                                  max="24"
                                  step="1"
                                />
                                {errors.months && <span className="text-red-500 text-xs">{errors.months}</span>}
                              </td>
                            </tr>
                            <tr>
                              <td className="py-2">Foiz (%)</td>
                              <td>
                                <input
                                  type="number"
                                  value={interestRate}
                                  onChange={(e) => setInterestRate(e.target.value)}
                                  className={`w-full p-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.interestRate ? 'border-red-500' : ''}`}
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  placeholder="Foiz kiritng (masalan, 5.5)"
                                />
                                {errors.interestRate && <span className="text-red-500 text-xs">{errors.interestRate}</span>}
                              </td>
                            </tr>
                            <tr>
                              <td className="py-2">Boshlang'ich To'lov</td>
                              <td>
                                <input
                                  type="number"
                                  value={downPayment}
                                  onChange={(e) => setDownPayment(e.target.value)}
                                  className={`w-full p-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.downPayment ? 'border-red-500' : ''}`}
                                  min="0"
                                  step="0.01"
                                  placeholder="Boshlang'ich to'lov miqdori"
                                />
                                {errors.downPayment && <span className="text-red-500 text-xs">{errors.downPayment}</span>}
                              </td>
                            </tr>
                            <tr>
                              <td className="py-2">Umumiy Summa</td>
                              <td>{formatCurrency(calculatePaymentSchedule().totalWithInterest)}</td>
                            </tr>
                            <tr>
                              <td className="py-2">Boshlang'ich To'lov</td>
                              <td>{formatCurrency(calculatePaymentSchedule().downPaymentAmount)}</td>
                            </tr>
                            <tr>
                              <td className="py-2">Qolgan Summa</td>
                              <td>{formatCurrency(calculatePaymentSchedule().remainingAfterDownPayment)}</td>
                            </tr>
                            <tr>
                              <td className="py-2">Oylik To'lov</td>
                              <td>{formatCurrency(calculatePaymentSchedule().monthlyPayment)}</td>
                            </tr>
                          </>
                        )}
                      </>
                    )}
                    <tr>
                      <td colSpan="2" className="py-2">
                        <h4 className="text-md font-bold mb-2">Mahsulot Tanlash</h4>
                        <div className="flex gap-2 mb-2">
                          <select
                            value={selectedProductId}
                            onChange={(e) => {
                              setSelectedProductId(e.target.value);
                              const product = modalProducts.find((p) => p.id === Number(e.target.value));
                              setTempPrice(product ? product.price.toString() : '');
                            }}
                            className="w-full p-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Mahsulot tanlang</option>
                            {modalProducts
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
                            className="w-24 p-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            min="1"
                            step="1"
                          />
                          <input
                            type="number"
                            value={tempPrice}
                            onChange={(e) => setTempPrice(e.target.value)}
                            placeholder="Narx"
                            className="w-24 p-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            step="0.01"
                            min="0.01"
                          />
                          <button
                            onClick={addItem}
                            className="bg-green-500 text-white px-2 py-1 rounded-lg hover:bg-green-600 transition-all duration-200"
                            disabled={!selectedProductId || !tempQuantity}
                          >
                            Qo'shish
                          </button>
                        </div>
                        {errors.items && <span className="text-red-500 text-xs">{errors.items}</span>}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan="2" className="py-2">
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
                                      min="0.01"
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
                                      className="bg-red-500 text-white px-2 py-1 rounded-lg hover:bg-red-600 transition-all duration-200"
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
                    {operationType === 'SALE' && ['CREDIT', 'INSTALLMENT'].includes(paymentType) && months && Number(months) > 0 && (
                      <tr>
                        <td colSpan="2" className="py-2">
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
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex-1 bg-blue-500 text-white p-2 rounded-lg disabled:bg-gray-400 hover:bg-blue-600 transition-all duration-200"
                  >
                    {submitting ? 'Yuklanmoqda...' : 'Saqlash'}
                  </button>
                  <button
                    onClick={closeModal}
                    className="flex-1 bg-gray-200 p-2 rounded-lg hover:bg-gray-300 transition-all duration-200"
                  >
                    Bekor
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

export default Chiqim;