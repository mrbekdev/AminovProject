import React, { useState, useEffect, useMemo, useRef } from "react";
import ReactToPrint from "react-to-print";
import { useNavigate } from "react-router-dom";
import {
  ShoppingCart,
  Search,
  Package,
  X,
  Trash2,
  CreditCard,
  DollarSign,
  Calendar,
  Percent,
} from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { jsPDF } from "jspdf";

const SalesManagement = ({ selectedBranchId }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState("self-pickup");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amountPaid, setAmountPaid] = useState(0);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const receiptRef = useRef();
  const [creditTerms, setCreditTerms] = useState({});
  const [customerInfo, setCustomerInfo] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    address: "",
  });

  const API_BASE_URL = "https://suddocs.uz";

  const statusTranslations = {
    IN_WAREHOUSE: "Омборда",
    IN_STORE: "Дўконда",
    SOLD: "Сотилган",
    DEFECTIVE: "Брок",
    RETURNED: "Қайтарилган",
  };

  const getToken = () => localStorage.getItem("access_token");

  const fetchWithAuth = async (url, options = {}) => {
    const token = getToken();
    if (!token) {
      navigate("/login");
      throw new Error("Токен топилмади. Илтимос, қайтадан киринг.");
    }

    const headers = {
      ...options.headers,
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };

    const response = await fetch(url, { ...options, headers });
    if (response.status === 401) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("userRole");
      localStorage.removeItem("user");
      localStorage.removeItem("userId");
      localStorage.removeItem("selectedBranchId");
      navigate("/login", { replace: true });
      throw new Error("Авторизация хатоси. Илтимос, қайтадан киринг.");
    }

    if (!response.ok) {
      throw new Error(`Маълумотларни олишда хатолик: ${response.statusText}`);
    }

    return response.json();
  };

  const updateProductQuantity = async (productId, newQuantity, status) => {
    try {
      await fetchWithAuth(`${API_BASE_URL}/products/${productId}`, {
        method: "PUT",
        body: JSON.stringify({
          quantity: newQuantity,
          status: newQuantity === 0 ? "SOLD" : status,
        }),
      });
      setProducts(
        products.map((p) =>
          p.id === productId
            ? { ...p, quantity: newQuantity, status: newQuantity === 0 ? "SOLD" : status }
            : p
        )
      );
    } catch (err) {
      toast.error("Маҳсулот миқдорини янгилашда хатолик: " + err.message);
      throw err;
    }
  };

  const addToCart = async (product) => {
    if (product.quantity === 0 && product.status !== "PRE_ORDER") {
      toast.error(`"${product.name}" омборда мавжуд эмас (${statusTranslations[product.status] || product.status})!`);
      return;
    }
    const existingItem = cart.find((item) => item.id === product.id);
    let newCart;
    if (existingItem) {
      if (existingItem.quantity >= product.quantity && product.quantity !== 0) {
        toast.error(`"${product.name}" учун етарли миқдор мавжуд эмас!`);
        return;
      }
      newCart = cart.map((item) =>
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      );
    } else {
      newCart = [...cart, { ...product, quantity: 1 }];
    }
    setCart(newCart);
    // Mahsulot miqdorini faqat UI da kamaytirish, backend da emas
    setProducts((prev) =>
      prev.map((p) =>
        p.id === product.id
          ? { ...p, quantity: p.quantity - 1, status: p.quantity - 1 === 0 ? "SOLD" : p.status }
          : p
      )
    );
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const productsUrl = selectedBranchId
          ? `${API_BASE_URL}/products?branchId=${selectedBranchId}`
          : `${API_BASE_URL}/products`;
        const [productsData, categoriesData] = await Promise.all([
          fetchWithAuth(productsUrl),
          fetchWithAuth(`${API_BASE_URL}/categories`),
        ]);
        setProducts(productsData);
        setCategories(categoriesData);
        setError(null);
      } catch (err) {
        setError(err.message || "Маълумотларни юклашда хатолик юз берди!");
        toast.error(err.message || "Маълумотларни юклашда хатолик!");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [navigate, selectedBranchId]);

  useEffect(() => {
    let barcode = "";
    let timeoutId;

    const handleKeyPress = (e) => {
      if (e.key === "Enter") {
        if (barcode) {
          const scannedProduct = products.find(
            (p) =>
              p.barcode === barcode ||
              p.id.toString() === barcode ||
              p.name.toLowerCase().includes(barcode.toLowerCase())
          );
          if (scannedProduct) {
            addToCart(scannedProduct);
          } else {
            toast.error("Маҳсулот топилмади!");
          }
          barcode = "";
          setSearchTerm("");
        }
      } else {
        barcode += e.key;
        setSearchTerm((prev) => prev + e.key);
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          barcode = "";
          setSearchTerm("");
        }, 5000);
      }
    };

    window.addEventListener("keypress", handleKeyPress);
    return () => {
      window.removeEventListener("keypress", handleKeyPress);
      clearTimeout(timeoutId);
    };
  }, [products, addToCart]);

  const handleManualBarcode = () => {
    const barcode = prompt("Штрих-код, ID ёки ном киритинг:");
    if (barcode) {
      const scannedProduct = products.find(
        (p) =>
          p.barcode === barcode ||
          p.id.toString() === barcode ||
          p.name.toLowerCase().includes(barcode.toLowerCase())
      );
      if (scannedProduct) {
        addToCart(scannedProduct);
      } else {
        toast.error("Маҳсулот топилмади!");
      }
    }
  };

  const removeFromCart = async (productId) => {
    const item = cart.find((item) => item.id === productId);
    if (item) {
      // Mahsulot miqdorini faqat UI da qaytarish, backend da emas
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId
            ? { ...p, quantity: p.quantity + item.quantity, status: p.quantity + item.quantity > 0 ? "IN_STORE" : p.status }
            : p
        )
      );
      setCart(cart.filter((item) => item.id !== productId));
      setCreditTerms((prev) => {
        const newTerms = { ...prev };
        delete newTerms[productId];
        return newTerms;
      });
    }
  };

  const updateQuantity = async (productId, quantity) => {
    const product = products.find((p) => p.id === productId);
    const currentItem = cart.find((item) => item.id === productId);
    const quantityDifference = quantity - currentItem.quantity;

    if (quantity <= 0) {
      removeFromCart(productId);
    } else if (quantity > product.quantity + currentItem.quantity) {
      toast.error(`"${product.name}" учун етарли миқдор мавжуд эмас!`);
    } else {
      // Mahsulot miqdorini faqat UI da yangilash, backend da emas
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId
            ? { ...p, quantity: p.quantity - quantityDifference, status: p.quantity - quantityDifference === 0 ? "SOLD" : p.status }
            : p
        )
      );
      setCart(
        cart.map((item) =>
          item.id === productId ? { ...item, quantity } : item
        )
      );
    }
  };

  const categoryOptions = useMemo(() => {
    return [{ id: "all", name: "Барча категориялар" }, ...categories];
  }, [categories]);

  const filteredProducts = useMemo(() => {
    return products
      .filter(
        (product) =>
          (selectedCategory === "all" ||
            String(product.categoryId) === String(selectedCategory)) &&
          (product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.id.toString().includes(searchTerm) ||
            (product.barcode?.includes(searchTerm) ?? false))
      )
      .sort((a, b) => {
        if (a.quantity === 0 && b.quantity !== 0) return 1;
        if (a.quantity !== 0 && b.quantity === 0) return -1;
        return a.id - b.id;
      });
  }, [products, searchTerm, selectedCategory]);

  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const getCreditTotal = () => {
    if (paymentMethod !== "credit") return getTotalAmount();
    return cart.reduce((total, item) => {
      const percent = creditTerms[item.id]?.percent || 0;
      return total + item.price * item.quantity * (1 + percent / 100);
    }, 0);
  };

  const getRemainingBalance = () => {
    return Math.max(0, getCreditTotal() - amountPaid);
  };

  const updateCreditTerms = (productId, field, value) => {
    setCreditTerms((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: Number(value),
      },
    }));
  };

  const clearCreditInputs = () => {
    setCreditTerms({});
    setAmountPaid(0);
  };

  useEffect(() => {
    if (paymentMethod !== "credit") {
      clearCreditInputs();
    }
  }, [paymentMethod]);

  const generateReceipt = () => {
    const receiptId = `order_${new Date()
      .toISOString()
      .replace(/[-:T.]/g, "")}`;
    const receipt = {
      id: receiptId,
      date: new Date().toISOString(),
      cashier: localStorage.getItem("user") || "Номаълум Кассир",
      customer: customerName || "Номаълум Мижоз",
      items: cart.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        total: item.price * item.quantity,
        creditMonth: paymentMethod === "credit" ? (creditTerms[item.id]?.month || 0) : 0,
        creditPercent: paymentMethod === "credit" ? (creditTerms[item.id]?.percent || 0) : 0,
        monthlyPayment:
          paymentMethod === "credit" && creditTerms[item.id]?.month > 0
            ? ((item.price * item.quantity * (1 + (creditTerms[item.id]?.percent || 0) / 100)) / (creditTerms[item.id]?.month || 1)).toFixed(2)
            : 0,
      })),
      total: getTotalAmount(),
      creditTotal: getCreditTotal(),
      amountPaid: amountPaid,
      remainingBalance: getRemainingBalance(),
      returnCode: Math.random().toString(36).substring(2, 10).toUpperCase(),
              fromBranchId: selectedBranchId || null,
      deliveryMethod,
      paymentMethod,
    };

    return receipt;
  };

  const completeSale = async () => {
    if (cart.length === 0) {
      toast.error("Сават бўш! Илтимос, маҳсулот қўшинг.");
      return;
    }

    if (paymentMethod === "credit") {
      for (const item of cart) {
        if (!creditTerms[item.id]?.month || !creditTerms[item.id]?.percent) {
          toast.error(`"${item.name}" учун кредит шартлари тўлдирилмаган!`);
          return;
        }
      }
    }

    setShowConfirmModal(true);
  };

  const confirmSale = async () => {
    try {
      const receipt = generateReceipt();

      // Customer ma'lumotlarini yaratish
      const customerData = {
        firstName: customerInfo.firstName || "Номаълум",
        lastName: customerInfo.lastName || "Мижоз",
        phone: customerInfo.phone || "",
        email: customerInfo.email || "",
        address: customerInfo.address || "",
      };

      const transactionData = {
        type: "SALE",
        status: "PENDING",
        total: getTotalAmount(),
        finalTotal: getCreditTotal(),
        paymentType: paymentMethod.toUpperCase(),
        customer: customerData,
        fromBranchId: selectedBranchId || null,
        items: cart.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
          price: item.price,
          creditMonth: paymentMethod === "credit" ? (creditTerms[item.id]?.month || 0) : undefined,
          creditPercent: paymentMethod === "credit" ? (creditTerms[item.id]?.percent || 0) / 100 : undefined,
          monthlyPayment:
            paymentMethod === "credit" && creditTerms[item.id]?.month > 0
              ? ((item.price * item.quantity * (1 + (creditTerms[item.id]?.percent || 0) / 100)) / (creditTerms[item.id]?.month || 1))
              : undefined,
        })),
      };

      await fetchWithAuth(`${API_BASE_URL}/transactions`, {
        method: "POST",
        body: JSON.stringify(transactionData),
      });

      // Receipt yaratish
      await fetchWithAuth(`${API_BASE_URL}/receipts`, {
        method: "POST",
        body: JSON.stringify(receipt),
      });

      setCart([]);
      setCustomerName("");
      setDeliveryMethod("self-pickup");
      setPaymentMethod("cash");
      setAmountPaid(0);
      setShowSaleModal(false);
      setShowConfirmModal(false);
      clearCreditInputs();
      setCustomerInfo({
        firstName: "",
        lastName: "",
        phone: "",
        email: "",
        address: "",
      });
      toast.success("Сотиш муваффақиятли якунланди!");
    } catch (err) {
      toast.error(
        err.message.includes("Unauthorized")
          ? "Авторизация хатоси! Кириш саҳифасига йўналтирилмоқда."
          : "Сотишда хатолик: " + err.message
      );
      setShowConfirmModal(false);
    }
  };

  return (
    <div style={{ marginLeft: "260px" }} className="space-y-0">
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="flex items-center justify-between">
        <div style={{ marginBottom: "10px" }} className="flex flex-col">
          <h1 className="text-3xl font-bold text-gray-900">Сотиш Тизими</h1>
        </div>
      </div>

      <div
        style={{ marginBottom: "10px" }}
        className="flex space-x-2 mb-4 overflow-x-auto"
      >
        {categoryOptions.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(String(cat.id))}
            className={`px-4 py-2 rounded-lg whitespace-nowrap ${
              selectedCategory === String(cat.id)
                ? "bg-[#1178f8] text-white"
                : "bg-gray-200"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <div
        style={{ marginBottom: "10px" }}
        className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
      >
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div className="relative flex items-center">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Маҳсулот номи, ID ёки штрих-код билан қидиринг..."
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1178f8] focus:border-transparent text-lg"
              style={{ width: "500px" }}
            />
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowSaleModal(true)}
              style={{ marginBottom: "10px" }}
              className="bg-[#1178f8] hover:bg-[#0f6ae5] text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Сават ({cart.length})</span>
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p>Юкланмоқда...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12 text-red-600">{error}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">
                  ID
                </th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">
                  Ном
                </th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">
                  Штрих-код
                </th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">
                  Нарх
                </th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">
                  Қолдиқ
                </th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">
                  Ҳолат
                </th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">
                  Ҳаракат
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredProducts.map((product) => (
                <tr key={product.id}>
                  <td className="px-4 py-2 text-sm text-gray-900">
                    {product.id}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900">
                    {product.name}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900">
                    {product.barcode || "Йўқ"}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900">
                    {product.marketPrice
                      ? product.marketPrice.toLocaleString()
                      : product.price.toLocaleString()}{" "}
                    сўм
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900">
                    {product.quantity} дона
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900">
                    {statusTranslations[product.status] || product.status}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900">
                    <button
                      onClick={() => addToCart(product)}
                      disabled={product.quantity === 0 && product.status !== "PRE_ORDER"}
                      className={`py-1 px-3 rounded-md text-sm ${
                        product.quantity === 0 && product.status !== "PRE_ORDER"
                          ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                          : "bg-[#1178f8] hover:bg-[#0f6ae5] text-white"
                      }`}
                    >
                      {product.quantity === 0 && product.status !== "PRE_ORDER"
                        ? "Мавжуд эмас"
                        : "Қўшиш"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filteredProducts.length === 0 && !loading && !error && (
        <div className="text-center py-12">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Маҳсулот топилмади
          </h3>
          <p className="text-gray-600">Қидирув сўзини ўзгартиринг</p>
        </div>
      )}

      {showSaleModal && (
        <div className="fixed inset-0 bg-black backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">
                  Сотиш Савати
                </h3>
                <button
                  onClick={() => setShowSaleModal(false)}
                  className="text-gray-400 hover:text-red-400 hover:bg-slate-300 hover:rounded-md transition-colors text-2xl"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label
                  style={{ marginTop: "-20px" }}
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Етказиб бериш усули
                </label>
                <select
                  value={deliveryMethod}
                  onChange={(e) => setDeliveryMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1178f8] focus:border-transparent"
                >
                  <option value="self-pickup">Ўзи олиб кетиш</option>
                  <option value="delivery">Етказиб бериш</option>
                </select>
              </div>

              <div>
                <label
                  style={{ marginTop: "-20px" }}
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Тўлов усули
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1178f8] focus:border-transparent"
                >
                  <option value="cash">Нақд</option>
                  <option value="card">Карта</option>
                  <option value="credit">Кредит</option>
                </select>
              </div>

              {paymentMethod === "credit" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Исм
                    </label>
                    <input
                      type="text"
                      value={customerInfo.firstName}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, firstName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Фамилия
                    </label>
                    <input
                      type="text"
                      value={customerInfo.lastName}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, lastName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Телефон рақам
                    </label>
                    <input
                      type="tel"
                      value={customerInfo.phone}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={customerInfo.email}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Манзил
                    </label>
                    <input
                      type="text"
                      value={customerInfo.address}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, address: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">
                  Саватдаги маҳсулотлар
                </h4>
                {cart.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Сават бўш</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                            Маҳсулот
                          </th>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                            Нарх
                          </th>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                            Сони
                          </th>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                            Жами
                          </th>
                          {paymentMethod === "credit" && (
                            <>
                              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                                Ойлар
                              </th>
                              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                                Фоиз (%)
                              </th>
                              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                                Ойлик тўлов
                              </th>
                            </>
                          )}
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-700"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {cart.map((item) => (
                          <tr
                            key={item.id}
                            className="border-b border-gray-200"
                          >
                            <td className="px-4 py-2 text-sm">{item.name}</td>
                            <td className="px-4 py-2 text-sm">
                              {item.price.toLocaleString()} сўм
                            </td>
                            <td className="px-4 py-2 text-sm">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() =>
                                    updateQuantity(item.id, item.quantity - 1)
                                  }
                                  className="w-6 h-6 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center"
                                >
                                  -
                                </button>
                                <span className="w-8 text-center">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() =>
                                    updateQuantity(item.id, item.quantity + 1)
                                  }
                                  className="w-6 h-6 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center"
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td className="px-4 py-2 text-sm">
                              {(item.price * item.quantity).toLocaleString()}{" "}
                              сўм
                            </td>
                            {paymentMethod === "credit" && (
                              <>
                                <td className="px-4 py-2 text-sm">
                                  <input
                                    type="number"
                                    value={creditTerms[item.id]?.month || ""}
                                    onChange={(e) =>
                                      updateCreditTerms(item.id, "month", e.target.value)
                                    }
                                    className="w-20 px-2 py-1 border border-gray-300 rounded-lg"
                                    min="1"
                                    required
                                  />
                                </td>
                                <td className="px-4 py-2 text-sm">
                                  <input
                                    type="number"
                                    value={creditTerms[item.id]?.percent || ""}
                                    onChange={(e) =>
                                      updateCreditTerms(item.id, "percent", e.target.value)
                                    }
                                    className="w-20 px-2 py-1 border border-gray-300 rounded-lg"
                                    min="0"
                                    step="0.1"
                                    required
                                  />
                                </td>
                                <td className="px-4 py-2 text-sm">
                                  {creditTerms[item.id]?.month > 0 &&
                                  creditTerms[item.id]?.percent >= 0
                                    ? (
                                        (item.price *
                                          item.quantity *
                                          (1 + (creditTerms[item.id]?.percent || 0) / 100)) /
                                        (creditTerms[item.id]?.month || 1)
                                      ).toLocaleString() + " сўм"
                                    : "0 сўм"}
                                </td>
                              </>
                            )}
                            <td className="px-4 py-2 text-sm">
                              <button
                                onClick={() => removeFromCart(item.id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {cart.length > 0 && (
                <div className="border-t border-gray-100 pt-4">
                  <div className="space-y-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Тўланган сумма
                      </label>
                      <input
                        type="number"
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        min="0"
                      />
                    </div>
                    <div className="flex items-center justify-between text-2xl font-bold">
                      <span>Жами сумма:</span>
                      <span className="text-[#1178f8]">
                        {getTotalAmount().toLocaleString()} сўм
                      </span>
                    </div>
                    {paymentMethod === "credit" && (
                      <div className="flex items-center justify-between text-2xl font-bold">
                        <span>Фоиз билан жами:</span>
                        <span className="text-[#1178f8]">
                          {getCreditTotal().toLocaleString()} сўм
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-2xl font-bold">
                      <span>Қолган сумма:</span>
                      <span className="text-red-600">
                        {getRemainingBalance().toLocaleString()} сўм
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setShowSaleModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-red-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Бекор қилиш
                </button>
                <button
                  onClick={completeSale}
                  disabled={cart.length === 0}
                  className={`px-6 py-2 rounded-lg transition-colors ${
                    cart.length === 0
                      ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                      : "bg-[#1178f8] hover:bg-[#0f6ae5] text-white"
                  }`}
                >
                  Сотишни якунлаш
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-xl font-semibold text-gray-900">
                Сотишни тасдиқлаш
              </h3>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4">
                <strong>{cart.length}</strong> та маҳсулотни{" "}
                <strong>{customerInfo.fullName}</strong> учун
                сотишни тасдиқлайсизми? <br />
                Етказиб бериш усули:{" "}
                <strong>
                  {deliveryMethod === "delivery"
                    ? "Етказиб бериш"
                    : "Ўзи олиб кетиш"}
                </strong>{" "}
                <br />
                Тўлов усули:{" "}
                <strong>
                  {paymentMethod === "cash"
                    ? "Нақд"
                    : paymentMethod === "card"
                    ? "Карта"
                    : "Кредит"}
                </strong>{" "}
                <br />
                Жами сумма:{" "}
                <strong style={{ fontSize: "18px" }}>
                  {getTotalAmount().toLocaleString()} сўм
                </strong>
                <br />
                {paymentMethod === "credit" && (
                  <>
                    Фоиз билан жами:{" "}
                    <strong style={{ fontSize: "18px" }}>
                      {getCreditTotal().toLocaleString()} сўм
                    </strong>
                    <br />
                  </>
                )}
                Тўланган сумма:{" "}
                <strong style={{ fontSize: "18px" }}>
                  {amountPaid.toLocaleString()} сўм
                </strong>
                <br />
                Қолган сумма:{" "}
                <strong style={{ fontSize: "18px" }}>
                  {getRemainingBalance().toLocaleString()} сўм
                </strong>
              </p>
              {paymentMethod === "credit" && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700">
                    Кредит тўловлари:
                  </h4>
                  {cart.map((item) => (
                    <p key={item.id} className="text-sm text-gray-600">
                      {item.name}: {creditTerms[item.id]?.month || 0} ой,{" "}
                      {creditTerms[item.id]?.percent || 0}% — Ойлик тўлов:{" "}
                      <strong>
                        {creditTerms[item.id]?.month > 0
                          ? (
                              (item.price *
                                item.quantity *
                                (1 + (creditTerms[item.id]?.percent || 0) / 100)) /
                              (creditTerms[item.id]?.month || 1)
                            ).toLocaleString() + " сўм"
                          : "0 сўм"}
                      </strong>
                    </p>
                  ))}
                </div>
              )}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Бекор қилиш
                </button>
                <button
                  onClick={confirmSale}
                  className="px-6 py-2 bg-[#1178f8] hover:bg-[#0f6ae5] text-white rounded-lg transition-colors"
                >
                  Тасдиқлаш
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesManagement;
