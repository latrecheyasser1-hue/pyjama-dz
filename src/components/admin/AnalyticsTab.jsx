import React, { useState, useMemo } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Plus, Trash2, Calendar, Wallet, AlertTriangle, Users, UserCheck, UserX } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getTopSellingProducts, getTopWilayas, getDeliveryStats, getDeadStock } from '../../utils/analytics';
import { showToast } from '../../utils/toast';

export default function AnalyticsTab({ orders, products, expenses, onAddExpense, onDeleteExpense, settings, onUpdateSettings }) {
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [period, setPeriod] = useState('all');
  const [saleType, setSaleType] = useState('all');
  const [expenseSearchDate, setExpenseSearchDate] = useState('');

  // Employees & Salaries State
  const [empName, setEmpName] = useState('');
  const [empRole, setEmpRole] = useState('');
  const [empSalary, setEmpSalary] = useState('');

  const employees = useMemo(() => {
    let list = settings?.employees;
    if (typeof list === 'string') {
      try { list = JSON.parse(list); } catch (e) { list = []; }
    }
    return Array.isArray(list) ? list : [];
  }, [settings?.employees]);

  const activeEmployees = useMemo(() => employees.filter(e => e && e.active !== false), [employees]);
  const totalMonthlySalary = useMemo(() => activeEmployees.reduce((sum, e) => sum + Number(e.salary || 0), 0), [activeEmployees]);

  // Calculate salary deduction proportional to the selected period
  const periodSalaryCost = useMemo(() => {
    if (totalMonthlySalary <= 0) return 0;
    if (period === 'today' || period === 'yesterday') {
      return Math.round(totalMonthlySalary / 30);
    }
    if (period === 'last_week') {
      return Math.round((totalMonthlySalary / 30) * 7);
    }
    if (period === 'last_month') {
      return totalMonthlySalary;
    }
    if (period === 'last_3_months') {
      return totalMonthlySalary * 3;
    }
    if (period === 'last_6_months') {
      return totalMonthlySalary * 6;
    }
    if (period === 'this_year') {
      const currentMonth = new Date().getMonth() + 1;
      return totalMonthlySalary * currentMonth;
    }
    // 'all'
    if (orders && orders.length > 0) {
      const dates = orders.map(o => new Date(o.created_at || o.date).getTime()).filter(t => !isNaN(t));
      if (dates.length > 0) {
        const earliest = Math.min(...dates);
        const diffMonths = Math.max(1, Math.round((Date.now() - earliest) / (30 * 24 * 60 * 60 * 1000)));
        return totalMonthlySalary * diffMonths;
      }
    }
    return totalMonthlySalary;
  }, [totalMonthlySalary, period, orders]);

  const handleAddEmployee = (e) => {
    e.preventDefault();
    if (!empName.trim() || !empSalary) {
      showToast("⚠️ الرجاء إدخال اسم العامل والراتب الشهري", 'warning');
      return;
    }
    const newEmp = {
      id: 'emp_' + Date.now(),
      name: empName.trim(),
      role: empRole.trim() || 'عامل في المتجر',
      salary: Number(empSalary),
      active: true,
      createdAt: new Date().toISOString().split('T')[0]
    };
    const nextList = [...employees, newEmp];
    if (onUpdateSettings) {
      onUpdateSettings({ employees: nextList });
    }
    setEmpName('');
    setEmpRole('');
    setEmpSalary('');
    showToast("✅ تم إضافة العامل بنجاح وخصم راتبه من الحسابات", 'success');
  };

  const handleToggleEmployeeActive = (empId) => {
    const nextList = employees.map(emp => {
      if (emp.id === empId) {
        return { ...emp, active: emp.active === false ? true : false };
      }
      return emp;
    });
    if (onUpdateSettings) {
      onUpdateSettings({ employees: nextList });
    }
    showToast("تم تحديث حالة العامل", 'info');
  };

  const handleDeleteEmployee = (empId) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا العامل من السيستيم؟")) return;
    const nextList = employees.filter(emp => emp.id !== empId);
    if (onUpdateSettings) {
      onUpdateSettings({ employees: nextList });
    }
    showToast("تم حذف العامل بنجاح", 'info');
  };

  // Helper to filter by date
  const filterByPeriod = (items, dateField) => {
    if (period === 'all') return items;
    
    const now = new Date();
    // Normalize now to midnight to ensure clean day boundaries
    now.setHours(23, 59, 59, 999);
    
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    
    const yesterdayEnd = new Date(todayStart);
    yesterdayEnd.setMilliseconds(-1);
    
    return items.filter(item => {
      let itemDateStr = item[dateField] || item.created_at || item.date;
      if (!itemDateStr) return true; // Keep items with no dates

      // Parse the date. Note: expense dates are YYYY-MM-DD. Order created_at is ISO string.
      let itemDate;
      // Handle DD/MM/YYYY format if it still exists in old orders
      if (typeof itemDateStr === 'string' && itemDateStr.includes('/') && itemDateStr.split('/').length === 3) {
        const [day, month, year] = itemDateStr.split('/');
        itemDate = new Date(`${year}-${month}-${day}`);
      } else {
        itemDate = new Date(itemDateStr);
      }
      
      if (isNaN(itemDate.getTime())) return true;

      const diffTime = Math.abs(now - itemDate);
      const diffDays = diffTime / (1000 * 60 * 60 * 24);

      if (period === 'today') return itemDate >= todayStart && itemDate <= now;
      if (period === 'yesterday') return itemDate >= yesterdayStart && itemDate <= yesterdayEnd;
      if (period === 'last_week') return diffDays <= 7;
      if (period === 'last_month') return diffDays <= 30;
      if (period === 'last_3_months') return diffDays <= 90;
      if (period === 'last_6_months') return diffDays <= 180;
      if (period === 'this_year') return itemDate.getFullYear() === now.getFullYear();
      
      return true;
    });
  };

  const filteredOrders = useMemo(() => {
    let filtered = filterByPeriod(orders, 'created_at');
    
    if (saleType !== 'all') {
      filtered = filtered.filter(o => {
        const isPos = o.isPos || o.clientName === 'زبون المحل (بيع حضوري)' || o.commune === 'المتجر الحضوري';
        const isGros = (o.product && o.product.includes('(جملة -')) || 
                       (o.clientName && o.clientName.includes('(واتساب:')) ||
                       (o.items && o.items.some(it => it.size === 'Série')) || 
                       o.stockMode === 'gros';
                       
        if (saleType === 'gros') return isGros;
        if (saleType === 'retail') return !isGros; // Includes POS and Livraison
        return true;
      });
    }
    
    return filtered;
  }, [orders, period, saleType]);
  const filteredExpenses = useMemo(() => filterByPeriod(expenses, 'date'), [expenses, period]);

  // Calculate confirmed + delivered + shipped orders (exclude annulee and retour for CA)
  const validOrders = filteredOrders.filter(o => o.status !== 'annulee' && o.status !== 'retour');
  
  const totalCA = validOrders.reduce((sum, o) => sum + Number(o.price || 0), 0);
  
  // Estimate cost of goods sold based on product purchasePrice
  const totalCostGoods = validOrders.reduce((sum, o) => {
    let cost = 0;
    if (o.items && o.items.length > 0) {
      o.items.forEach(item => {
        const matchedProduct = products.find(p => p.id === item.productId || p.title === item.product);
        const itemCost = matchedProduct?.purchasePrice || Math.round(Number(item.price || 0) * 0.65);
        cost += itemCost * (Number(item.qty) || 1);
      });
    } else {
      const matchedProduct = products.find(p => p.title === o.product);
      cost = matchedProduct?.purchasePrice || Math.round(Number(o.price || 0) * 0.65);
    }
    return sum + cost;
  }, 0);

  const totalSideExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  
  const netProfit = totalCA - totalCostGoods - totalSideExpenses - periodSalaryCost;

  // Analytics
  const topProductsData = useMemo(() => getTopSellingProducts(filteredOrders), [filteredOrders]);
  const wilayaData = useMemo(() => getTopWilayas(filteredOrders), [filteredOrders]);
  const deliveryData = useMemo(() => getDeliveryStats(filteredOrders), [filteredOrders]);
  const deadStockData = useMemo(() => getDeadStock(products, filteredOrders), [products, filteredOrders]);

  const COLORS = ['#8B5CF6', '#EC4899', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!desc || !amount) {
      showToast("⚠️ الرجاء إدخال اسم المصروف والمبلغ", 'warning');
      return;
    }

    onAddExpense({
      id: Date.now(),
      desc,
      amount: Number(amount),
      date
    });

    setDesc('');
    setAmount('');
  };

  return (
    <div className="animate-fade-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--burgundy-dark)' }}>
            📊 التحليلات المالية والصندوق اليومي (Caisse & Analytics)
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            متابعة شاملة للمداخيل، تكلفة شراء السلع، مصاريف المتجر، وخصم رواتب العمال لحساب صافي الأرباح بدقة.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <select 
            value={saleType} 
            onChange={(e) => setSaleType(e.target.value)}
            className="form-select"
            style={{ fontWeight: 800, padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-light)', cursor: 'pointer' }}
          >
            <option value="all">كل المبيعات (Toutes les ventes)</option>
            <option value="retail">التجزئة والحضوري (Détail & Boutique)</option>
            <option value="gros">الجملة فقط (Gros uniquement)</option>
          </select>
          <select 
            value={period} 
            onChange={(e) => setPeriod(e.target.value)}
            className="form-select"
            style={{ fontWeight: 800, padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-light)', cursor: 'pointer' }}
          >
            <option value="all">كل الأوقات (Toute la période)</option>
            <option value="today">اليوم (Aujourd'hui)</option>
            <option value="yesterday">أمس (Hier)</option>
            <option value="last_week">آخر 7 أيام (7 derniers jours)</option>
            <option value="last_month">آخر 30 يوم (30 derniers jours)</option>
            <option value="last_3_months">آخر 3 أشهر (3 derniers mois)</option>
            <option value="last_6_months">آخر 6 أشهر (6 derniers mois)</option>
            <option value="this_year">هذا العام (Cette année)</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 700 }}>المداخيل الإجمالية (CA Brut)</span>
            <div style={{ background: '#E3F7EB', padding: 8, borderRadius: 10, color: '#1F8A55' }}><DollarSign size={18} /></div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1F8A55' }}>{totalCA.toLocaleString()} DA</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sur {validOrders.length} commandes</span>
        </div>

        <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 700 }}>تكلفة شراء السلع (Achats)</span>
            <div style={{ background: '#FFF3E0', padding: 8, borderRadius: 10, color: '#E65100' }}><TrendingDown size={18} /></div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#E65100' }}>{totalCostGoods.toLocaleString()} DA</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Coût grossiste des pyjamas</span>
        </div>

        <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 700 }}>المصاريف اليومية (Masarif)</span>
            <div style={{ background: '#FFEBEE', padding: 8, borderRadius: 10, color: '#C62828' }}><Wallet size={18} /></div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#C62828' }}>{totalSideExpenses.toLocaleString()} DA</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Transport, emballages, repas...</span>
        </div>

        <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 700 }}>رواتب العمال (Salaires)</span>
            <div style={{ background: '#EEF2FF', padding: 8, borderRadius: 10, color: '#4F46E5' }}><Users size={18} /></div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#4F46E5' }}>{periodSalaryCost.toLocaleString()} DA</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {activeEmployees.length} عمال نشطين ({totalMonthlySalary.toLocaleString()} DA/شهر)
          </span>
        </div>

        <div style={{ background: 'var(--burgundy-dark)', color: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 8px 24px rgba(74,14,23,0.25)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--champagne)', fontWeight: 700 }}>الربح الصافي الحقيقي (Safi / Net)</span>
            <div style={{ background: 'rgba(255,255,255,0.15)', padding: 8, borderRadius: 10, color: '#FFD700' }}><TrendingUp size={18} /></div>
          </div>
          <div style={{ fontSize: '1.55rem', fontWeight: 900, color: netProfit >= 0 ? '#FFD700' : '#FF6B6B' }}>
            {netProfit.toLocaleString()} DA
          </div>
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>بعد خصم السلعة والمصاريف والرواتب</span>
        </div>
      </div>

      {/* Advanced Analytics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
        
        {/* Products Chart */}
        <div style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-dark)', marginBottom: 24, display: 'flex', alignItems: 'center', gap: '8px' }}>
            🛍️ المنتجات الأكثر مبيعاً (Top Produits)
          </h3>
          <div style={{ height: 300, width: '100%' }}>
            {topProductsData.length > 0 ? (
              <ResponsiveContainer>
                <BarChart data={topProductsData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                  <XAxis type="number" stroke="#9CA3AF" fontSize={12} />
                  <YAxis dataKey="name" type="category" width={120} stroke="#4B5563" fontSize={11} fontWeight={600} tickFormatter={(val) => val.length > 15 ? val.substring(0, 15) + '...' : val} />
                  <RechartsTooltip cursor={{fill: '#F3F4F6'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                  <Bar dataKey="sales" fill="var(--burgundy)" radius={[0, 4, 4, 0]} barSize={24} name="Ventes (Unités)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Aucune donnée de vente</div>
            )}
          </div>
        </div>

        {/* Customer Demographics Pie Chart */}
        <div style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-dark)', marginBottom: 24, display: 'flex', alignItems: 'center', gap: '8px' }}>
            🗺️ الولايات الأكثر طلباً (Top Wilayas)
          </h3>
          <div style={{ height: 300, width: '100%' }}>
            {wilayaData.length > 0 ? (
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={wilayaData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {wilayaData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Aucune donnée client</div>
            )}
          </div>
        </div>

        {/* Deliveries and Returns */}
        <div style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-dark)', marginBottom: 24, display: 'flex', alignItems: 'center', gap: '8px' }}>
            📦 معدل التوصيل والاسترجاع (Taux de Livraison)
          </h3>
          <div style={{ height: 300, width: '100%' }}>
            {deliveryData.length > 0 ? (
              <ResponsiveContainer>
                <BarChart data={deliveryData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} fontWeight={600} />
                  <YAxis stroke="#9CA3AF" fontSize={12} />
                  <RechartsTooltip cursor={{fill: '#F3F4F6'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40} name="Commandes">
                    {deliveryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Aucune donnée de commande</div>
            )}
          </div>
        </div>

        {/* Dead Stock Alert */}
        <div style={{ background: '#FFF1F2', padding: '24px', borderRadius: '16px', border: '1px solid #FECDD3', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#9F1239', marginBottom: 16, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={20} />
            ⚠️ سلع راكدة (Stock Mort - 0 Ventes)
          </h3>
          <p style={{ color: '#BE123C', fontSize: '0.85rem', marginBottom: 16 }}>
            Ces produits ont du stock mais n'ont généré aucune vente. Envisagez de faire des remises.
          </p>
          
          <div style={{ flex: 1, overflowY: 'auto', background: 'white', borderRadius: '8px', border: '1px solid #FFE4E6' }}>
            {deadStockData.length > 0 ? (
              <table style={{ width: '100%', fontSize: '0.85rem' }}>
                <thead style={{ background: '#FFF1F2', borderBottom: '1px solid #FFE4E6' }}>
                  <tr>
                    <th style={{ padding: '10px 16px', textAlign: 'right', color: '#9F1239' }}>Produit</th>
                    <th style={{ padding: '10px 16px', textAlign: 'center', color: '#9F1239' }}>Stock Restant</th>
                  </tr>
                </thead>
                <tbody>
                  {deadStockData.slice(0, 5).map((item, idx) => (
                    <tr key={item.id} style={{ borderBottom: idx < deadStockData.length - 1 ? '1px solid #FFE4E6' : 'none' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#4C1D95' }}>{item.title}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 800, color: '#E11D48' }}>{item.stock} pcs</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: 32, textAlign: 'center', color: '#10B981', fontWeight: 700 }}>
                ✨ ممتاز! لا توجد سلع راكدة (Aucun stock mort)
              </div>
            )}
          </div>
        </div>

      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
        {/* Add Expense Form */}
        <div style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-light)', height: 'fit-content', boxShadow: 'var(--shadow-sm)' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--burgundy)', marginBottom: 16 }}>
            💸 تسجيل مصروف جديد (Ajouter une Dépense)
          </h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">إسم أو نوع المصروف (Description) *</label>
              <input 
                type="text" 
                required 
                value={desc} 
                onChange={(e) => setDesc(e.target.value)} 
                className="form-input" 
                placeholder="Ex: Transport Yalidine, Repas déjeuner, Sacs emballages..." 
              />
            </div>
            <div className="form-group">
              <label className="form-label">المبلغ المصروف (Montant en DA) *</label>
              <input 
                type="number" 
                required 
                value={amount} 
                onChange={(e) => setAmount(e.target.value)} 
                className="form-input" 
                placeholder="Ex: 1500" 
              />
            </div>
            <div className="form-group">
              <label className="form-label">التاريخ (Date)</label>
              <input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)} 
                className="form-input" 
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center', padding: '12px' }}>
              <Plus size={18} />
              <span>تسجيل و خصم من الربح الصافي</span>
            </button>
          </form>
        </div>

        {/* Expenses Ledger */}
        <div style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--burgundy-dark)', margin: 0 }}>
              📜 دفتر المصاريف اليومية (Journal des Dépenses)
            </h3>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>بحث بالتاريخ:</span>
              <input 
                type="date" 
                value={expenseSearchDate}
                onChange={(e) => setExpenseSearchDate(e.target.value)}
                className="form-input"
                style={{ width: 'auto', padding: '6px 12px', minHeight: '36px' }}
              />
              {expenseSearchDate && (
                <button 
                  onClick={() => setExpenseSearchDate('')}
                  style={{ background: 'none', border: 'none', color: '#D32F2F', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' }}
                >
                  إلغاء
                </button>
              )}
            </div>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>التاريخ</th>
                  <th>البيان والمصروف</th>
                  <th>المبلغ الخصوم</th>
                  <th>حذف</th>
                </tr>
              </thead>
              <tbody>
                {expenses.filter(e => !expenseSearchDate || e.date === expenseSearchDate).length === 0 ? (
                  <tr><td colSpan="4" style={{ textAlign: 'center', padding: 24 }}>Aucune dépense trouvée.</td></tr>
                ) : (
                  expenses.filter(e => !expenseSearchDate || e.date === expenseSearchDate).map(e => (
                    <tr key={e.id}>
                      <td style={{ fontWeight: 600 }}>{e.date}</td>
                      <td style={{ fontWeight: 700, color: 'var(--text-dark)' }}>{e.desc}</td>
                      <td style={{ fontWeight: 800, color: '#C62828' }}>- {Number(e.amount).toLocaleString()} DA</td>
                      <td>
                        <button 
                          onClick={() => onDeleteExpense(e.id)}
                          style={{ background: 'none', border: 'none', color: '#D32F2F', cursor: 'pointer' }}
                          title="Supprimer la dépense"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Employee & Salaries Management Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', marginTop: '24px' }}>
        {/* Add Employee Form */}
        <div style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-light)', height: 'fit-content', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 16 }}>
            <Users size={22} color="var(--burgundy)" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--burgundy)', margin: 0 }}>
              👥 إضافة عامل جديد (Salaires & Employés)
            </h3>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginBottom: '16px', lineHeight: 1.5 }}>
            الراتب الشهري يُخصم أوتوماتيكياً من صافي الأرباح (Net Profit) حسب الفترة المحددة في الفلتر أعلاه.
          </p>
          <form onSubmit={handleAddEmployee} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">إسم العامل (Nom de l'employé) *</label>
              <input 
                type="text" 
                required 
                value={empName} 
                onChange={(e) => setEmpName(e.target.value)} 
                className="form-input" 
                placeholder="مثال: يوسف، أحمد، سارة..." 
              />
            </div>
            <div className="form-group">
              <label className="form-label">المنصب / المهمة (Poste / Rôle)</label>
              <input 
                type="text" 
                value={empRole} 
                onChange={(e) => setEmpRole(e.target.value)} 
                className="form-input" 
                placeholder="Ex: مسؤول التغليف، خدمة الزبائن، التوصيل..." 
              />
            </div>
            <div className="form-group">
              <label className="form-label">الراتب الشهري (Salaire Mensuel en DA) *</label>
              <input 
                type="number" 
                required 
                min="0"
                step="500"
                value={empSalary} 
                onChange={(e) => setEmpSalary(e.target.value)} 
                className="form-input" 
                placeholder="Ex: 35000" 
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '8px' }}>
              <Plus size={18} />
              <span>إضافة العامل وحفظ الراتب</span>
            </button>
          </form>
        </div>

        {/* Employees Table List */}
        <div style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--burgundy)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>قائمة العمال والرواتب</span>
              <span style={{ fontSize: '0.8rem', background: '#E3F2FD', color: '#1565C0', padding: '3px 10px', borderRadius: '20px', fontWeight: 700 }}>
                {activeEmployees.length} نشط
              </span>
            </h3>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#2E7D32', background: '#E8F5E9', padding: '6px 14px', borderRadius: '10px' }}>
              إجمالي الرواتب: {totalMonthlySalary.toLocaleString()} DA / شهر
            </div>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>اسم العامل</th>
                  <th>المنصب</th>
                  <th>الراتب الشهري</th>
                  <th>الحالة</th>
                  <th>حذف</th>
                </tr>
              </thead>
              <tbody>
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-light)' }}>
                      لم تقم بإضافة أي عامل بعد. أضف عمالك لحساب صافي الأرباح بدقة واحترافية.
                    </td>
                  </tr>
                ) : (
                  employees.map(emp => {
                    const isActive = emp.active !== false;
                    return (
                      <tr key={emp.id} style={{ opacity: isActive ? 1 : 0.6, background: isActive ? 'inherit' : '#fafafa' }}>
                        <td>
                          <div style={{ fontWeight: 800, color: 'var(--text-dark)' }}>{emp.name}</div>
                          {emp.createdAt && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>
                              منذ: {emp.createdAt}
                            </div>
                          )}
                        </td>
                        <td>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-dark)', fontWeight: 600 }}>
                            {emp.role || 'عامل'}
                          </span>
                        </td>
                        <td style={{ fontWeight: 800, color: '#C62828' }}>
                          - {Number(emp.salary || 0).toLocaleString()} DA
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => handleToggleEmployeeActive(emp.id)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '4px 10px',
                              borderRadius: '20px',
                              border: 'none',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              background: isActive ? '#E8F5E9' : '#FFEBEE',
                              color: isActive ? '#2E7D32' : '#C62828',
                              transition: 'all 0.2s ease'
                            }}
                            title={isActive ? "انقر للتعطيل مؤقتاً" : "انقر للتفعيل"}
                          >
                            {isActive ? <UserCheck size={14} /> : <UserX size={14} />}
                            <span>{isActive ? 'نشط (محتسب)' : 'متوقف'}</span>
                          </button>
                        </td>
                        <td>
                          <button 
                            type="button"
                            onClick={() => handleDeleteEmployee(emp.id)}
                            style={{ background: 'none', border: 'none', color: '#D32F2F', cursor: 'pointer', padding: '4px' }}
                            title="حذف العامل"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
