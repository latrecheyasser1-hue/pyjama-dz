import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Edit2, Upload, Check, X, Layers, PlusCircle, MinusCircle, Printer, Image as ImageIcon, Barcode as BarcodeIcon, Pipette } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import { showToast } from '../../utils/toast';

const ALL_SIZES = ["Standard", "S", "M", "L", "XL", "2XL", "3XL", "4XL"];

const getProductCategoryGroupId = (prodCategory, categoriesList) => {
  if (!Array.isArray(categoriesList)) return prodCategory;
  
  // Extract base category if it has a prefix
  let baseCat = prodCategory || '';
  if (baseCat.includes('__')) {
    baseCat = baseCat.split('__')[1] || '';
  }
  
  const exact = categoriesList.find(c => c && typeof c === 'object' && c.id === baseCat);
  if (exact) return exact.id || baseCat;
  
  const pCat = baseCat.toLowerCase().trim();
  if (pCat === 'satin' || pCat === 'coton' || pCat === 'ensembles' || pCat.includes('pyjama')) {
    const pyjamasCat = categoriesList.find(c => c && typeof c === 'object' && (c.title || '').toLowerCase().includes('pyjama'));
    if (pyjamasCat) return pyjamasCat.id || baseCat;
  }
  if (pCat === 'mariee' || pCat === 'abayas' || pCat.includes('robe') || pCat.includes('mari')) {
    const robesCat = categoriesList.find(c => c && typeof c === 'object' && ((c.title || '').toLowerCase().includes('robe') || (c.title || '').toLowerCase().includes('mari')));
    if (robesCat) return robesCat.id || baseCat;
  }
  return baseCat;
};

export default function StockTab({ products, onAddProduct, onUpdateProduct, onDeleteProduct, suppliers, settings, stockMode = 'livraison', onTabChange, isPosOpen }) {
  const categoriesList = Array.isArray(settings?.categories) ? settings.categories : [];
  const selectableCategories = categoriesList.filter(c => {
    if (c.id === 'all') return false;
    if ((stockMode === 'gros' || stockMode === 'super_gros') && c.id === 'promo') return false;
    return true;
  });

  const filteredProductsByMode = (products || []).filter(p => {
    if (stockMode === 'boutique') return p.category && (p.category === '__boutique__' || p.category.startsWith('boutique__'));
    if (stockMode === 'gros') return p.category && p.category.startsWith('gros__');
    if (stockMode === 'super_gros') return p.category && p.category.startsWith('super_gros__');
    return p.category && !p.category.includes('__');
  });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedViewCategory, setSelectedViewCategory] = useState(null);

  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [sizeSystem, setSizeSystem] = useState('standard');
  const [minPointure, setMinPointure] = useState(36);
  const [maxPointure, setMaxPointure] = useState(42);
  const [activeColorPickerIndex, setActiveColorPickerIndex] = useState(null);
  const [pickerImageSrc, setPickerImageSrc] = useState('');
  const [pickerHoveredColor, setPickerHoveredColor] = useState('#E11D48');
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, targetId: null, targetTitle: '' });
  const canvasRef = useRef(null);

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('satin');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [price, setPrice] = useState('');
  const [oldPrice, setOldPrice] = useState('');
  const [supplierName, setSupplierName] = useState(suppliers[0]?.name || '');
  const [images, setImages] = useState([]);
  const [barcode, setBarcode] = useState('');
  const [description, setDescription] = useState('Pyjama en tissu luxueux de haute qualité.');
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const activeQuickViewProduct = quickViewProduct ? (products.find(p => p.id === quickViewProduct.id) || quickViewProduct) : null;
  const [minQtyGros, setMinQtyGros] = useState(1);
  const [minQtySuperGros, setMinQtySuperGros] = useState(60);
  const [serieConfig, setSerieConfig] = useState({});
  const [isActiveOnWebsite, setIsActiveOnWebsite] = useState(true);
  const [bulkPrice5, setBulkPrice5] = useState('');
  const [linkedProductIds, setLinkedProductIds] = useState([]);
  const [crossSellSearch, setCrossSellSearch] = useState('');
  
  // Matrix State: Array of { color: string, selectedSizes: { "M": 10, "L": 15 } }
  const [colorVariants, setColorVariants] = useState([
    { color: '', image: '', selectedSizes: {} }
  ]);

  useEffect(() => {
    let buffer = "";
    let lastKeyTime = Date.now();

    const handleKeyDown = (e) => {
      if (isFormOpen || isPosOpen) {
        return;
      }
      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTime;

      if (timeDiff > 80) {
        buffer = "";
      }
      lastKeyTime = currentTime;

      if (e.key.length === 1) {
        buffer += e.key;
      }

      if (e.key === 'Enter') {
        const potentialBarcode = buffer.trim();
        if (potentialBarcode.length >= 6) {
          e.preventDefault();
          e.stopPropagation();
          buffer = "";
          handleBarcodeScanned(potentialBarcode);
        }
      }
    };

    const handleBarcodeScanned = (scannedBarcode) => {
      const foundInCurrent = filteredProductsByMode.find(
        p => p.barcode && p.barcode.trim() === scannedBarcode
      );

      if (foundInCurrent) {
        setQuickViewProduct(foundInCurrent);
        showToast(`🔍 تم العثور على المنتج في القسم الحالي`, 'success');
      } else {
        const foundAnywhere = (products || []).find(
          p => p.barcode && p.barcode.trim() === scannedBarcode
        );

        if (foundAnywhere) {
          let targetTab = 'stock_livraison';
          if (foundAnywhere.category && foundAnywhere.category.startsWith('boutique__')) {
            targetTab = 'stock_boutique';
          } else if (foundAnywhere.category && foundAnywhere.category.startsWith('gros__')) {
            targetTab = 'stock_gros';
          }

          if (onTabChange) {
            onTabChange(targetTab);
          }
          setQuickViewProduct(foundAnywhere);
          showToast(`🔍 تم الانتقال للقسم المناسب وعرض المنتج`, 'success');
        } else {
          if (onTabChange) {
            onTabChange('stock_livraison');
          }
          setEditingId(null);
          setTitle('');
          setCategory(selectableCategories[0]?.id || 'satin');
          setPurchasePrice('');
          setPrice('');
          setOldPrice('');
          setBulkPrice5('');
          setLinkedProductIds([]);
          setCrossSellSearch('');
          setSupplierName(suppliers[0]?.name || '');
          setImages([]);
          setBarcode(scannedBarcode);
          setDescription('');
          setMinQtyGros(12);
          setMinQtySuperGros(60);
          setSerieConfig({});
          setColorVariants([{ color: '', image: '', selectedSizes: {} }]);
          setIsCustomCategory(false);
          setCustomCategoryInput('');
          setSizeSystem('standard');
          setIsFormOpen(true);

          showToast(`📋 باركود جديد: ${scannedBarcode}. تم فتح استمارة الإضافة في مخزن التوصيل.`, 'info');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [products, stockMode, filteredProductsByMode, selectableCategories, suppliers, onTabChange, isFormOpen, isPosOpen]);

  const handleOpenNew = () => {
    setEditingId(null);
    setTitle('');
    setCategory(stockMode === 'livraison' ? 'satin' : '__' + stockMode);
    setPurchasePrice('');
    setPrice('');
    setOldPrice('');
    setBulkPrice5('');
    setLinkedProductIds([]);
    setCrossSellSearch('');
    setSupplierName(suppliers[0]?.name || '');
    setImages([]);
    setBarcode(String(100000000000 + Math.floor(Math.random() * 900000000000)));
    setDescription('');
    setMinQtyGros(12);
    setMinQtySuperGros(60);
    setSerieConfig({});
    setColorVariants([{ color: '', image: '', selectedSizes: {} }]);
    setIsCustomCategory(false);
    setCustomCategoryInput('');
    setSizeSystem('standard');
    setIsActiveOnWebsite(true);
    setIsFormOpen(true);
  };

  const handleOpenNewForCategory = (catId) => {
    handleOpenNew();
    setCategory(catId);
    setIsCustomCategory(false);
  };

  const handleOpenEdit = (p) => {
    setEditingId(p.id);
    setTitle(p.title);
    
    let cleanCategory = p.category;
    if (p.category && (p.category.startsWith('gros__') || p.category.startsWith('super_gros__') || p.category.startsWith('boutique__'))) {
      cleanCategory = p.category.split('__')[1] || '';
    }
    setCategory(cleanCategory);
    setPurchasePrice(p.purchasePrice || Math.round(p.price * 0.65));
    setPrice(p.price);
    setOldPrice(p.oldPrice || '');
    setSupplierName(p.supplier || suppliers[0]?.name || '');
    setImages(p.images && p.images.length > 0 ? p.images : (p.image ? [p.image] : []));
    setBarcode(p.barcode || String(100000000000 + Math.floor(Math.random() * 900000000000)));
    setDescription(p.description || '');

    if (p.colorVariants && p.colorVariants.length > 0) {
      setColorVariants(p.colorVariants.map(cv => ({
        color: cv.color,
        colorHex: cv.colorHex || '#CBD5E1',
        image: cv.image || '',
        selectedSizes: { ...cv.stock }
      })));
    } else {
      // Fallback from basic sizes
      const sizesObj = {};
      (p.sizes || ["M", "L"]).forEach(s => { sizesObj[s] = 10; });
      setColorVariants([{ color: 'Standard', selectedSizes: sizesObj }]);
    }

    const descParts = (p.description || '').split('|||');
    setDescription(descParts[0] || '');
    try {
      const meta = descParts[1] ? JSON.parse(descParts[1]) : {};
      setMinQtyGros(meta.minQtyGros || 1);
      setMinQtySuperGros(meta.minQtySuperGros || 60);
      setSerieConfig(meta.serieConfig || {});
      setBulkPrice5(meta.bulkPrice5 || '');
      setLinkedProductIds(meta.linkedProductIds || []);
      setCrossSellSearch('');
    } catch(e) {
      setMinQtyGros(12);
      setMinQtySuperGros(60);
      setSerieConfig({});
      setBulkPrice5('');
      setLinkedProductIds([]);
      setCrossSellSearch('');
    }

    setIsCustomCategory(false);
    setCustomCategoryInput('');
    // Attempt to detect if it's using shoes pointures
    const firstVariantSizes = p.colorVariants?.[0]?.stock || sizesObj;
    const sizeKeys = Object.keys(firstVariantSizes);
    const hasNumbers = sizeKeys.some(k => !isNaN(k) && Number(k) > 20);
    if (hasNumbers) {
      setSizeSystem('shoes');
      const nums = sizeKeys.filter(k => !isNaN(k)).map(Number);
      if (nums.length > 0) {
        setMinPointure(Math.min(...nums));
        setMaxPointure(Math.max(...nums));
      }
    } else {
      setSizeSystem('standard');
    }

    setIsFormOpen(true);
  };

  // Multiple Image Handlers
  const handleAddImageUrl = () => setImages(prev => [...prev, '']);
  const handleUpdateImageUrl = (index, val) => setImages(prev => prev.map((img, i) => i === index ? val : img));
  const handleRemoveImage = (index) => setImages(prev => prev.filter((_, i) => i !== index));
  const generateBarcode = () => setBarcode(String(100000000000 + Math.floor(Math.random() * 900000000000)));

  const handlePrintBarcodeDirectly = (product) => {
    const printWindow = window.open('', '_blank', 'width=400,height=400');
    const barcodeValue = product.barcode || String(100000000000 + Math.floor(Math.random() * 900000000000));
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Barcode</title>
          <style>
            body { margin: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif; overflow: hidden; background: #fff; }
            @page { margin: 0; }
            .price { font-size: 14px; font-weight: bold; margin-top: 4px; color: #000; }
            .title { font-size: 12px; font-weight: bold; margin-bottom: 4px; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #000; text-align: center; }
            svg { max-width: 100%; height: auto; }
          </style>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        </head>
        <body>
          <div class="title">${product.title}</div>
          <svg id="barcode"></svg>
          <div class="price">${product.price.toLocaleString()} DA</div>
          <script>
            window.onload = function() {
              JsBarcode("#barcode", "${barcodeValue}", {
                width: 1.2,
                height: 40,
                fontSize: 12,
                margin: 0,
                background: "#ffffff",
                lineColor: "#000000"
              });
              setTimeout(() => {
                window.focus();
                window.print();
                window.close();
              }, 250);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Matrix handlers
  const handleAddColor = () => {
    setColorVariants(prev => [...prev, { color: '', colorHex: '', image: '', selectedSizes: {} }]);
  };

  const handleRemoveColor = (index) => {
    setColorVariants(prev => prev.filter((_, i) => i !== index));
  };

  const handleColorNameChange = (index, newName) => {
    setColorVariants(prev => prev.map((item, i) => i === index ? { ...item, color: newName } : item));
  };

  const handleColorHexChange = (index, newHex) => {
    setColorVariants(prev => prev.map((item, i) => i === index ? { ...item, colorHex: newHex } : item));
  };

  const handleColorImageChange = (index, newImgUrl) => {
    setColorVariants(prev => prev.map((item, i) => i === index ? { ...item, image: newImgUrl } : item));
  };

  const handleVariantImageUpload = (index, e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_SIZE = 800;
        if (width > height && width > MAX_SIZE) {
          height *= MAX_SIZE / width;
          width = MAX_SIZE;
        } else if (height > MAX_SIZE) {
          width *= MAX_SIZE / height;
          height = MAX_SIZE;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        setImages(prev => prev.includes(compressedBase64) ? prev : [...prev, compressedBase64]);
        handleColorImageChange(index, compressedBase64);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const openImageColorPicker = (index) => {
    const targetImg = colorVariants[index]?.image || images[0] || '';
    setPickerImageSrc(targetImg);
    setActiveColorPickerIndex(index);
    setPickerHoveredColor(colorVariants[index]?.colorHex || '#E11D48');
  };

  useEffect(() => {
    if (activeColorPickerIndex !== null && pickerImageSrc && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        const maxW = 500;
        const scale = img.width > maxW ? maxW / img.width : 1;
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = pickerImageSrc;
    }
  }, [activeColorPickerIndex, pickerImageSrc]);

  const handleToggleSize = (colorIndex, size) => {
    setColorVariants(prev => prev.map((item, i) => {
      if (i !== colorIndex) return item;
      const nextSizes = { ...item.selectedSizes };
      if (nextSizes[size] !== undefined) {
        delete nextSizes[size];
      } else {
        nextSizes[size] = 5; // default qty
      }
      return { ...item, selectedSizes: nextSizes };
    }));
  };

  const generatePointuresGlobally = () => {
    const min = Math.min(Number(minPointure), Number(maxPointure)) || 36;
    const max = Math.max(Number(minPointure), Number(maxPointure)) || 42;
    if (min > max) return;
    
    setColorVariants(prev => prev.map(variant => {
      const updatedSizes = { ...variant.selectedSizes };
      for (let i = min; i <= max; i++) {
        if (updatedSizes[String(i)] === undefined) {
           updatedSizes[String(i)] = 10;
        }
      }
      return { ...variant, selectedSizes: updatedSizes };
    }));
  };

  const handleSelectAllSizes = (colorIndex) => {
    let sizesList = [];
    if (sizeSystem === 'shoes') {
      const min = Math.min(Number(minPointure), Number(maxPointure)) || 36;
      const max = Math.max(Number(minPointure), Number(maxPointure)) || 42;
      const sizeKeys = Object.keys(colorVariants[colorIndex]?.selectedSizes || {}).filter(k => !isNaN(k) && k.trim() !== '').map(Number);
      const finalMin = sizeKeys.length > 0 ? Math.min(min, ...sizeKeys) : min;
      const finalMax = sizeKeys.length > 0 ? Math.max(max, ...sizeKeys) : max;
      for (let p = finalMin; p <= finalMax; p++) {
        sizesList.push(String(p));
      }
    } else {
      sizesList = ALL_SIZES;
    }

    setColorVariants(prev => prev.map((item, i) => {
      if (i !== colorIndex) return item;
      const nextSizes = { ...item.selectedSizes };
      sizesList.forEach(size => {
        if (nextSizes[size] === undefined) {
          nextSizes[size] = 5; // default qty
        }
      });
      return { ...item, selectedSizes: nextSizes };
    }));
  };

  const handleDeselectAllSizes = (colorIndex) => {
    setColorVariants(prev => prev.map((item, i) => {
      if (i !== colorIndex) return item;
      return { ...item, selectedSizes: {} };
    }));
  };

  const handleSizeQtyChange = (colorIndex, size, qty) => {
    setColorVariants(prev => prev.map((item, i) => {
      if (i !== colorIndex) return item;
      return {
        ...item,
        selectedSizes: { ...item.selectedSizes, [size]: Number(qty) }
      };
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title) {
      showToast("⚠️ الرجاء إدخال اسم المنتج", 'warning');
      return;
    }

    // Aggregate unique available sizes across all colors for quick storefront filtering
    const allAvailableSizesSet = new Set();
    const formattedVariants = colorVariants.map(cv => {
      const stockObj = {};
      Object.entries(cv.selectedSizes).forEach(([sz, qty]) => {
        if (qty !== undefined && qty !== null && qty !== '') {
          stockObj[sz] = Number(qty) || 0;
          allAvailableSizesSet.add(sz);
        }
      });
      return {
        color: cv.color || "Couleur Standard",
        colorHex: cv.colorHex || "#CBD5E1",
        image: cv.image || "",
        stock: stockObj
      };
    });

    let finalCategory;
    if (stockMode === 'boutique') {
      finalCategory = `boutique__${category}`;
    } else if (stockMode === 'livraison') {
      finalCategory = (category === '__custom__' || isCustomCategory)
        ? (customCategoryInput.trim().toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-') || 'custom')
        : category;
    } else {
      const baseCat = (category === '__custom__' || isCustomCategory)
        ? (customCategoryInput.trim().toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-') || 'custom')
        : category;
      finalCategory = `${stockMode}__${baseCat}`;
    }

    const derivedImages = formattedVariants.map(cv => cv.image).filter(img => img && img.trim() !== "");
    const finalImages = derivedImages.length > 0 ? derivedImages : [];

    const serializedDescription = description + '|||' + JSON.stringify({
      minQtyGros: Number(minQtyGros || 1),
      minQtySuperGros: Number(minQtySuperGros || 60),
      serieConfig: serieConfig,
      bulkPrice5: Number(bulkPrice5 || 0),
      linkedProductIds: linkedProductIds
    });

    const baseCat = (category === '__custom__' || isCustomCategory)
      ? (customCategoryInput.trim().toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-') || 'custom')
      : category;

    const clonedColorVariants = formattedVariants.map(cv => ({
      ...cv,
      stock: Object.fromEntries(Object.keys(cv.stock || {}).map(sz => [sz, 0]))
    }));

    const productData = {
      id: editingId || Date.now(),
      title,
      category: finalCategory,
      purchasePrice: stockMode === 'gros' ? 0 : Number(purchasePrice),
      price: Number(price),
      oldPrice: Number(oldPrice),
      supplier: supplierName,
      images: finalImages,
      image: finalImages[0] || '',
      barcode,
      description: serializedDescription,
      sizes: Array.from(allAvailableSizesSet).length > 0 ? Array.from(allAvailableSizesSet) : ["Standard"],
      colorVariants: (stockMode === 'livraison' && !editingId && !isActiveOnWebsite) ? clonedColorVariants : formattedVariants,
      promo: stockMode === 'gros' ? false : Number(oldPrice) > Number(price),
      badge: stockMode === 'gros' ? "Gros 📦" : (Number(oldPrice) > Number(price) ? "Promo 🔥" : "Nouveau ✨")
    };

    if (editingId) {
      onUpdateProduct(productData);
    } else {
      onAddProduct(productData);

      // If added in Livraison mode, auto-clone it to Boutique and Gros
      if (stockMode === 'livraison') {
        // 1. Boutique Clone
        const boutiqueProduct = {
          ...productData,
          category: `boutique__${baseCat}`,
          colorVariants: isActiveOnWebsite ? clonedColorVariants : formattedVariants,
          promo: productData.promo,
          badge: "Boutique 🏪"
        };
        onAddProduct(boutiqueProduct);

        // 2. Gros Clone
        const grosProduct = {
          ...productData,
          category: `gros__${baseCat}`,
          purchasePrice: 0,
          price: 0,
          oldPrice: 0,
          colorVariants: clonedColorVariants,
          promo: false,
          badge: "Gros 📦"
        };
        onAddProduct(grosProduct);
      }
    }

    setIsFormOpen(false);
  };

  // Quick stock quantity adjuster
  const handleQuickQtyAdjust = (product, colorIdx, size, delta) => {
    const updatedVariants = product.colorVariants.map((cv, i) => {
      if (i !== colorIdx) return cv;
      const currentQty = cv.stock[size] || 0;
      const nextQty = Math.max(0, currentQty + delta);
      return {
        ...cv,
        stock: { ...cv.stock, [size]: nextQty }
      };
    });

    onUpdateProduct({
      ...product,
      colorVariants: updatedVariants
    });
  };

  // Selected supplier phone
  const selectedSupplierObj = suppliers.find(s => s.name === supplierName);

  const getStockModeTitle = () => {
    switch (stockMode) {
      case 'boutique': return '🏪 مخزن المحل (Stock Boutique)';
      case 'gros': return '📦 مخزن الجملة والجملة الكبيرة (Stock Gros & Super Gros)';
      case 'super_gros': return '👑 مخزن الجملة الكبيرة (Stock Super Gros)';
      case 'livraison':
      default:
        return '🚚 مخزن التوصيل (Stock Livraison)';
    }
  };

  return (
    <>
    <div className="animate-fade-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--burgundy-dark)' }}>
            {getStockModeTitle()}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Ajoutez vos pyjamas avec prix d'achat/vente, photos, et gérez les quantités exactes par couleur et taille.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <input 
            type="text" 
            placeholder="بحث عن منتج... (Rechercher)" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input"
            style={{ width: '250px' }}
          />
          <button onClick={handleOpenNew} className="btn btn-primary">
            <Plus size={18} />
            <span>إضافة منتج جديد (Ajouter un Pyjama)</span>
          </button>
        </div>
      </div>
      </div>

      {/* Form Modal */}
      {isFormOpen && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--burgundy)' }}>
                {editingId ? "✏️ تعديل المنتج (Modifier Pyjama)" : "✨ إضافة منتج جديد للمخزون"}
              </h3>
              <button onClick={() => setIsFormOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: stockMode === 'livraison' ? '1fr 1fr' : '1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">إسم المنتج (Nom du Pyjama) *</label>
                  <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="form-input" placeholder="Ex: Ensemble Royale Satin..." />
                </div>
                {stockMode !== 'boutique' && (
                  <div className="form-group">
                    <label className="form-label">الصنف (Catégorie) *</label>
                    <select
                      value={isCustomCategory ? '__custom__' : category}
                      onChange={(e) => {
                        if (e.target.value === '__custom__') {
                          setIsCustomCategory(true);
                          setCategory('__custom__');
                        } else {
                          setIsCustomCategory(false);
                          setCategory(e.target.value);
                        }
                      }}
                      className="form-select"
                      style={{ marginBottom: (isCustomCategory || category === '__custom__') ? '8px' : '4px', fontWeight: 700 }}
                    >
                      {selectableCategories.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.icon || '📦'} {cat.title}
                        </option>
                      ))}
                      <option value="__custom__">➕ إضافة صنف آخر مخصص (Autre catégorie)...</option>
                    </select>

                    {(isCustomCategory || category === '__custom__') && (
                      <input
                        type="text"
                        required
                        value={customCategoryInput}
                        placeholder="أدخل معرف أو إسم الصنف (مثال: robes-soiree)"
                        className="form-input"
                        style={{ marginBottom: '4px' }}
                        onChange={(e) => setCustomCategoryInput(e.target.value)}
                      />
                    )}
                    <span style={{ fontSize: '0.78rem', color: 'var(--burgundy-dark)', fontWeight: 600 }}>
                      💡 نصيحة: لإضافة صنف جديد بالكامل مع إيموجي وصورة، استخدم تبويب "🏷️ الأقسام والتصنيفات" في القائمة الجانبية.
                    </span>
                  </div>
                )}

                {stockMode === 'livraison' && !editingId && (
                  <div className="form-group" style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '8px', background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-light)', marginBottom: '8px' }}>
                    <input 
                      type="checkbox" 
                      id="isActiveOnWebsite" 
                      checked={isActiveOnWebsite} 
                      onChange={(e) => setIsActiveOnWebsite(e.target.checked)}
                      style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                    />
                    <label htmlFor="isActiveOnWebsite" style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--burgundy-dark)', cursor: 'pointer', userSelect: 'none', margin: 0 }}>
                      🌐 تفعيل وعرض المنتج على موقع الزبائن (Activer sur le site web)
                    </label>
                  </div>
                )}
              </div>

              {/* Pricing Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: stockMode === 'gros' ? '1fr 1fr' : (stockMode === 'livraison' ? '1fr 1fr 1fr 1fr' : '1fr 1fr 1fr'), gap: '16px', background: '#F7F5F2', padding: '16px', borderRadius: '12px' }}>
                {stockMode !== 'gros' && (
                  <div className="form-group">
                    <label className="form-label">سعر الشراء (Prix d'achat DA) *</label>
                    <input type="number" required value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} className="form-input" style={{ borderColor: '#1F8A55' }} />
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">{stockMode === 'gros' ? "سعر السيري (Prix Série Gros) *" : "سعر البيع (Prix de Vente DA) *"}</label>
                  <input type="number" required value={price} onChange={(e) => setPrice(e.target.value)} className="form-input" style={{ borderColor: 'var(--burgundy)', fontWeight: 800 }} />
                </div>
                <div className="form-group">
                  {stockMode === 'gros' ? (
                    <>
                      <label className="form-label">سعر السيري (Prix Série Super Gros) *</label>
                      <input type="number" required value={oldPrice} onChange={(e) => setOldPrice(e.target.value)} className="form-input" style={{ borderColor: '#4F46E5', fontWeight: 800 }} />
                    </>
                  ) : (
                    <>
                      <label className="form-label">السعر القديم قبل الخصم (DA)</label>
                      <input type="number" value={oldPrice} onChange={(e) => setOldPrice(e.target.value)} className="form-input" />
                    </>
                  )}
                </div>
                {(stockMode === 'livraison' || stockMode === 'boutique') && (
                  <div className="form-group">
                    <label className="form-label" style={{ color: 'var(--burgundy-dark)', fontWeight: 800 }}>💰 سعر 5 حبات فما فوق (DA)</label>
                    <input type="number" value={bulkPrice5} onChange={(e) => setBulkPrice5(e.target.value)} className="form-input" style={{ borderColor: 'var(--burgundy-dark)', fontWeight: 800 }} placeholder="مثال: 1000" />
                  </div>
                )}
              </div>

              {/* Serie Config for Gros */}
              {stockMode === 'gros' && (
                <div style={{ background: '#F1F5F9', padding: '16px', borderRadius: '12px', marginTop: '16px', border: '1px solid #CBD5E1' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--burgundy-dark)', marginBottom: '12px' }}>
                    📦 إعدادات السيري (Configuration de la Série)
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="form-group">
                      <label className="form-label">الحد الأدنى من السيريات لـ Super Gros (Min Séries) *</label>
                      <input type="number" required value={minQtySuperGros} onChange={(e) => setMinQtySuperGros(e.target.value)} className="form-input" style={{ borderColor: '#4F46E5', maxWidth: '200px', fontWeight: 800 }} />
                    </div>
                    <div>
                      <label className="form-label" style={{ marginBottom: '8px' }}>محتوى السيري الواحدة (اختر المقاسات وكمية كل مقاس):</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                        {ALL_SIZES.map(size => {
                          const isChecked = serieConfig[size] !== undefined;
                          return (
                            <button
                              type="button"
                              key={size}
                              onClick={() => {
                                setSerieConfig(prev => {
                                  const next = { ...prev };
                                  if (next[size] !== undefined) delete next[size];
                                  else next[size] = 1;
                                  return next;
                                });
                              }}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                border: isChecked ? '2px solid var(--burgundy)' : '1px solid var(--border-light)',
                                background: isChecked ? 'var(--rose-light)' : '#FFF',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              {isChecked ? '✅ ' : ''}{size}
                            </button>
                          );
                        })}
                      </div>
                      
                      {Object.keys(serieConfig).length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px', background: '#FFF', padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                          {Object.entries(serieConfig).map(([sz, qty]) => (
                            <div key={sz}>
                              <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>{sz} (الكمية):</label>
                              <input 
                                type="number" 
                                min="1" 
                                value={qty} 
                                onChange={(e) => {
                                  const val = Math.max(1, parseInt(e.target.value) || 1);
                                  setSerieConfig(prev => ({ ...prev, [sz]: val }));
                                }}
                                className="form-input"
                                style={{ padding: '6px', textAlign: 'center', fontWeight: 800 }}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                      {Object.keys(serieConfig).length > 0 && (
                        <div style={{ marginTop: '8px', fontSize: '0.85rem', fontWeight: 800, color: 'var(--burgundy-dark)' }}>
                          مجموع القطع في السيري الواحدة: {Object.values(serieConfig).reduce((sum, q) => sum + q, 0)} قطعة
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Supplier Selection */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', alignItems: 'end' }}>
                <div className="form-group">
                  <label className="form-label">المورد (Fournisseur) *</label>
                  <select value={supplierName} onChange={(e) => setSupplierName(e.target.value)} className="form-select">
                    <option value="">-- Choisir un fournisseur --</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">رقم هاتف المورد (Téléphone)</label>
                  <input type="text" readOnly disabled value={selectedSupplierObj?.phone || "N/A"} className="form-input" style={{ background: '#EEE' }} />
                </div>
              </div>

              {/* Barcode Generation */}
              <div className="form-group" style={{ background: '#F0F9FF', padding: '16px', borderRadius: '12px', border: '1px solid #BAE6FD' }}>
                <label className="form-label">باركود المنتج (Code-barres) *</label>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <input type="text" required value={barcode} onChange={(e) => setBarcode(e.target.value)} className="form-input" placeholder="Scannez ou entrez le code-barres" style={{ flex: 1, fontWeight: 'bold' }} />
                  <button type="button" onClick={generateBarcode} className="btn btn-secondary" style={{ flexShrink: 0 }}>
                    <Layers size={16} /> Générer Aléatoire
                  </button>
                </div>
              </div>

              {/* Multi-Color & Multi-Size Matrix */}
              {stockMode !== 'gros' ? (
              <div style={{ border: '2px dashed var(--border-light)', padding: '16px', borderRadius: '12px', background: '#FAF8F5' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--burgundy-dark)' }}>
                    🎨 الألوان والمقاسات والكمية (Matrice Couleurs & Tailles)
                  </h4>
                  <button type="button" onClick={handleAddColor} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                    <Plus size={14} /> إضافة لون آخر
                  </button>
                </div>

                {/* NOUVEAU: Selecteur de type de tailles et generateur de pointures */}
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '14px', borderRadius: '10px', marginBottom: '14px', display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#334155' }}>نوع المقاسات (Type de Tailles) :</label>
                    <select
                      value={sizeSystem}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSizeSystem(val);
                        if (val === 'clothes') {
                          setColorVariants(prev => prev.map(cv => ({ ...cv, selectedSizes: { "M": 5, "L": 5 } })));
                        } else {
                          setColorVariants(prev => prev.map(cv => ({ ...cv, selectedSizes: {} })));
                        }
                      }}
                      style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFF', fontWeight: 700 }}
                    >
                      <option value="clothes">👚 ملابس (S, M, L...)</option>
                      <option value="shoes">👟 مقاسات بالأرقام (Pointures / Chaussures)</option>
                    </select>
                  </div>

                  {sizeSystem === 'shoes' && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'flex-end', borderLeft: '2px solid #E2E8F0', paddingLeft: '14px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '90px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>أصغر مقاس :</label>
                        <input
                          type="number"
                          min="15"
                          max="60"
                          value={minPointure}
                          onChange={(e) => setMinPointure(e.target.value)}
                          style={{ padding: '6px', borderRadius: '6px', border: '1px solid #CBD5E1', textAlign: 'center', fontWeight: 800 }}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '90px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>أكبر مقاس :</label>
                        <input
                          type="number"
                          min="15"
                          max="60"
                          value={maxPointure}
                          onChange={(e) => setMaxPointure(e.target.value)}
                          style={{ padding: '6px', borderRadius: '6px', border: '1px solid #CBD5E1', textAlign: 'center', fontWeight: 800 }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={generatePointuresGlobally}
                        className="btn btn-secondary"
                        style={{ padding: '8px 14px', height: '38px', background: 'linear-gradient(135deg, #1E293B, #334155)', color: '#FFF', fontWeight: 800, border: 'none' }}
                      >
                        ⚡ توليد المقاسات (Générer)
                      </button>
                    </div>
                  )}
                </div>

                {colorVariants.map((variant, cIndex) => {
                  const variantImg = variant.image || images[0] || '';
                  return (
                  <div key={cIndex} style={{ background: 'white', padding: '14px', borderRadius: '10px', marginBottom: '14px', border: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginBottom: '12px', background: '#F8FAFC', padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                      <span style={{ fontWeight: 800, color: 'var(--burgundy)' }}>#{cIndex + 1} اللون :</span>
                      
                      {/* Image Thumbnail & Selector for this variant */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {variantImg ? (
                          <img src={variantImg} alt="variant" style={{ width: '44px', height: '44px', objectFit: 'cover', borderRadius: '8px', border: '2px solid var(--border-light)' }} />
                        ) : (
                          <div style={{ width: '44px', height: '44px', borderRadius: '8px', background: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: '#64748B' }}>
                            لا صورة
                          </div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {images.length > 0 && (
                            <select
                              value={variantImg}
                              onChange={(e) => handleColorImageChange(cIndex, e.target.value)}
                              style={{ fontSize: '0.75rem', padding: '2px 4px', borderRadius: '4px', border: '1px solid #CBD5E1', maxWidth: '110px' }}
                            >
                              <option value="">-- صورة اللون --</option>
                              {images.map((imgUrl, iIdx) => (
                                <option key={iIdx} value={imgUrl}>صورة #{iIdx + 1}</option>
                              ))}
                            </select>
                          )}
                          <label style={{ fontSize: '0.72rem', color: 'var(--burgundy)', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <Upload size={12} /> رفع صورة للون
                            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleVariantImageUpload(cIndex, e)} />
                          </label>
                        </div>
                      </div>

                      {/* Color Square Box & Eyedropper Launcher */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => openImageColorPicker(cIndex)}
                          title="اضغط لاختيار اللون من الصورة"
                          style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '8px',
                            background: variant.colorHex || '#FFFFFF',
                            border: variant.colorHex ? '2px solid #334155' : '2px dashed #94A3B8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                            position: 'relative'
                          }}
                        >
                          {!variant.colorHex && <Pipette size={18} color="#64748B" />}
                        </button>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--burgundy)' }}>
                            {variant.colorHex ? 'درجة اللون:' : 'مربع اللون (فارغ):'}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#64748B', fontFamily: 'monospace' }}>
                            {variant.colorHex || 'اضغط للاختيار'}
                          </span>
                        </div>
                      </div>

                      <div style={{ flex: 1, minWidth: '160px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input 
                          type="text" 
                          placeholder="اسم اللون (Ex: Rose Poudre, أحمر)..." 
                          value={variant.color} 
                          onChange={(e) => handleColorNameChange(cIndex, e.target.value)}
                          className="form-input" 
                          style={{ flex: 1, padding: '6px 10px', fontWeight: 700 }}
                        />
                        {colorVariants.length > 1 && (
                          <button type="button" onClick={() => handleRemoveColor(cIndex)} style={{ background: 'none', border: 'none', color: '#D32F2F', cursor: 'pointer' }}>
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                        ✔️ اختر المقاسات المتوفرة وأدخل الكمية (Cochez les tailles en stock) :
                      </p>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => handleSelectAllSizes(cIndex)}
                          style={{
                            padding: '4px 10px',
                            background: '#F1F5F9',
                            border: '1px solid #CBD5E1',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            color: '#1E293B',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseOver={(e) => { e.currentTarget.style.background = '#E2E8F0'; }}
                          onMouseOut={(e) => { e.currentTarget.style.background = '#F1F5F9'; }}
                        >
                          ✓ تحديد الكل (Tout sélectionner)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeselectAllSizes(cIndex)}
                          style={{
                            padding: '4px 10px',
                            background: '#FFF5F5',
                            border: '1px solid #FEE2E2',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            color: '#991B1B',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseOver={(e) => { e.currentTarget.style.background = '#FEE2E2'; }}
                          onMouseOut={(e) => { e.currentTarget.style.background = '#FFF5F5'; }}
                        >
                          ✕ إلغاء الكل (Désélectionner)
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                      {(sizeSystem === 'shoes'
                        ? (() => {
                            const min = Math.min(Number(minPointure), Number(maxPointure)) || 36;
                            const max = Math.max(Number(minPointure), Number(maxPointure)) || 42;
                            const sizeKeys = Object.keys(variant.selectedSizes).filter(k => !isNaN(k) && k.trim() !== '').map(Number);
                            const finalMin = sizeKeys.length > 0 ? Math.min(min, ...sizeKeys) : min;
                            const finalMax = sizeKeys.length > 0 ? Math.max(max, ...sizeKeys) : max;
                            const arr = [];
                            for (let p = finalMin; p <= finalMax; p++) {
                              arr.push(String(p));
                            }
                            return arr;
                          })()
                        : ALL_SIZES
                      ).map(size => {
                        const isChecked = variant.selectedSizes[size] !== undefined;
                        return (
                          <button
                            type="button"
                            key={size}
                            onClick={() => handleToggleSize(cIndex, size)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: isChecked ? '2px solid var(--burgundy)' : '1px solid var(--border-light)',
                              background: isChecked ? 'var(--rose-light)' : '#FAF8F5',
                              fontWeight: 700,
                              fontSize: '0.85rem',
                              cursor: 'pointer'
                            }}
                          >
                            {isChecked ? '✅ ' : ''}{size}
                          </button>
                        );
                      })}
                    </div>

                    {/* Quantity Inputs for checked sizes */}
                    {Object.keys(variant.selectedSizes).length > 0 && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', background: '#F7F5F2', padding: '10px', borderRadius: '8px' }}>
                        {Object.entries(variant.selectedSizes).sort((a, b) => {
                          const numA = Number(a[0]);
                          const numB = Number(b[0]);
                          if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                          if (!isNaN(numA)) return -1;
                          if (!isNaN(numB)) return 1;
                          return ALL_SIZES.indexOf(a[0]) - ALL_SIZES.indexOf(b[0]);
                        }).map(([sz, qty]) => (
                          <div key={sz}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>Quantité ({sz}) :</label>
                            <input 
                              type="number" 
                              min="0" 
                              value={qty} 
                              onChange={(e) => handleSizeQtyChange(cIndex, sz, e.target.value)}
                              className="form-input"
                              style={{ padding: '6px', textAlign: 'center', fontWeight: 800 }}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              </div>
              ) : (
                <div style={{ border: '2px dashed var(--border-light)', padding: '16px', borderRadius: '12px', background: '#FAF8F5' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--burgundy-dark)' }}>
                      🎨 ألوان المنتج (Couleurs disponibles)
                    </h4>
                    <button type="button" onClick={handleAddColor} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                      <Plus size={14} /> إضافة لون آخر
                    </button>
                  </div>
                  
                  {colorVariants.map((variant, cIndex) => {
                    const variantImg = variant.image || images[0] || '';
                    return (
                      <div key={cIndex} style={{ background: 'white', padding: '14px', borderRadius: '10px', marginBottom: '14px', border: '1px solid var(--border-light)', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                        <span style={{ fontWeight: 800, color: 'var(--burgundy)' }}>#{cIndex + 1} اللون :</span>
                        
                        {/* Image Thumbnail & Selector */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {variantImg ? (
                            <img src={variantImg} alt="variant" style={{ width: '44px', height: '44px', objectFit: 'cover', borderRadius: '8px', border: '2px solid var(--border-light)' }} />
                          ) : (
                            <div style={{ width: '44px', height: '44px', borderRadius: '8px', background: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: '#64748B' }}>
                              لا صورة
                            </div>
                          )}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {images.length > 0 && (
                              <select
                                value={variantImg}
                                onChange={(e) => handleColorImageChange(cIndex, e.target.value)}
                                style={{ fontSize: '0.75rem', padding: '2px 4px', borderRadius: '4px', border: '1px solid #CBD5E1', maxWidth: '110px' }}
                              >
                                <option value="">-- صورة اللون --</option>
                                {images.map((imgUrl, iIdx) => (
                                  <option key={iIdx} value={imgUrl}>صورة #{iIdx + 1}</option>
                                ))}
                              </select>
                            )}
                            <label style={{ fontSize: '0.72rem', color: 'var(--burgundy)', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}>
                              <Upload size={12} /> رفع صورة
                              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleVariantImageUpload(cIndex, e)} />
                            </label>
                          </div>
                        </div>

                        {/* Color Picker Box */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => openImageColorPicker(cIndex)}
                            style={{
                              width: '42px', height: '42px', borderRadius: '8px',
                              background: variant.colorHex || '#FFFFFF',
                              border: variant.colorHex ? '2px solid #334155' : '2px dashed #94A3B8',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              cursor: 'pointer'
                            }}
                          >
                            {!variant.colorHex && <Pipette size={18} color="#64748B" />}
                          </button>
                        </div>

                        <div style={{ flex: 1, minWidth: '160px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input 
                            type="text" 
                            placeholder="اسم اللون (Ex: Rouge)..." 
                            value={variant.color} 
                            onChange={(e) => handleColorNameChange(cIndex, e.target.value)}
                            className="form-input" 
                            style={{ flex: 1, padding: '6px 10px', fontWeight: 700 }}
                          />
                          {colorVariants.length > 1 && (
                            <button type="button" onClick={() => handleRemoveColor(cIndex)} style={{ background: 'none', border: 'none', color: '#D32F2F', cursor: 'pointer' }}>
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">وصف المنتج (Description)</label>
                <textarea rows="2" value={description} onChange={(e) => setDescription(e.target.value)} className="form-input" />
              </div>

              {stockMode === 'livraison' && (
                <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--burgundy-dark)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    🔗 منتجات مكملة (Produits complémentaires / Cross-sell)
                  </h4>
                  <p style={{ color: '#64748B', fontSize: '0.82rem', margin: 0 }}>
                    اختر المنتجات التي تود اقتراحها للزبائن ليشتروها مع هذا المنتج (مثل بلغة/حذاء مع بيجامة).
                  </p>
                  
                  <input 
                    type="text" 
                    placeholder="ابحث عن منتج مكمل باسمه... (Rechercher)"
                    value={crossSellSearch}
                    onChange={(e) => setCrossSellSearch(e.target.value)}
                    className="form-input"
                    style={{ fontSize: '0.88rem', padding: '8px 12px' }}
                  />

                  {(() => {
                    const otherRetailProducts = (products || []).filter(p => {
                      if (!p) return false;
                      if (p.id === editingId) return false;
                      if (p.category && p.category.includes('__')) return false;
                      return true;
                    });
                    const filteredCrossSellProducts = otherRetailProducts.filter(p => {
                      const q = crossSellSearch.toLowerCase().trim();
                      if (!q) return true;
                      return p.title && p.title.toLowerCase().includes(q);
                    });

                    if (otherRetailProducts.length > 0) {
                      return (
                        <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: '8px', background: 'white', display: 'flex', flexDirection: 'column' }}>
                          {filteredCrossSellProducts.map(p => {
                            const isChecked = linkedProductIds.includes(p.id);
                            const firstImage = p.images?.[0] || p.image || '';
                            
                            return (
                              <label 
                                key={p.id} 
                                style={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: '12px', 
                                  padding: '8px 12px', 
                                  borderBottom: '1px solid #F1F5F9', 
                                  cursor: 'pointer',
                                  userSelect: 'none',
                                  margin: 0,
                                  background: isChecked ? '#FFF5F5' : 'transparent',
                                  transition: 'background 0.2s'
                                }}
                              >
                                <input 
                                  type="checkbox" 
                                  checked={isChecked}
                                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                  onChange={() => {
                                    if (isChecked) {
                                      setLinkedProductIds(prev => prev.filter(id => id !== p.id));
                                    } else {
                                      setLinkedProductIds(prev => [...prev, p.id]);
                                    }
                                  }}
                                />
                                {firstImage && (
                                  <img src={firstImage} alt={p.title} style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #E2E8F0' }} />
                                )}
                                <div style={{ flex: 1, fontSize: '0.88rem', fontWeight: isChecked ? 750 : 600, color: isChecked ? 'var(--burgundy-dark)' : '#334155' }}>
                                  {p.title}
                                </div>
                                <span style={{ fontSize: '0.82rem', color: '#64748B', fontWeight: 700 }}>
                                  {p.price?.toLocaleString()} DA
                                </span>
                              </label>
                            );
                          })}
                          {filteredCrossSellProducts.length === 0 && (
                            <div style={{ padding: '20px', color: '#94A3B8', fontSize: '0.88rem', textAlign: 'center' }}>
                              لم يتم العثور على أي منتج يطابق البحث
                            </div>
                          )}
                        </div>
                      );
                    } else {
                      return (
                        <div style={{ padding: '16px', background: '#F1F5F9', borderRadius: '8px', color: '#64748B', fontSize: '0.88rem', textAlign: 'center' }}>
                          لا توجد منتجات أخرى في المخزن لربطها
                        </div>
                      );
                    }
                  })()}
                </div>
              )}

              <button type="submit" className="btn btn-primary" style={{ padding: '14px', fontSize: '1.05rem', justifyContent: 'center' }}>
                <span>{editingId ? "💾 حفظ التعديلات (Enregistrer les modifications)" : "💾 حفظ المنتج في المخزون (Enregistrer dans le Stock)"}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="animate-fade-up">
      {/* View Selection: Categories Grid vs Product List */}
      {(selectedViewCategory === null && searchQuery.trim() === '' && stockMode !== 'boutique') ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
          {selectableCategories.map(cat => {
            const count = filteredProductsByMode.filter(p => {
              return getProductCategoryGroupId(p.category, categoriesList) === cat.id;
            }).length;
            return (
              <div 
                key={cat.id} 
                onClick={() => setSelectedViewCategory(cat.id)}
                style={{
                  background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-light)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', cursor: 'pointer',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.05)', transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 15px rgba(0,0,0,0.1)'; }}
                onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)'; }}
              >
                <div style={{ fontSize: '3rem' }}>{cat.icon || '📁'}</div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-dark)', margin: 0, textAlign: 'center' }}>{cat.title}</h3>
                <span style={{ background: '#F1F5F9', color: '#475569', padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 700 }}>
                  {count} منتجات
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <>
          {selectedViewCategory !== null && searchQuery.trim() === '' && (
            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <button onClick={() => setSelectedViewCategory(null)} className="btn btn-secondary" style={{ padding: '8px 16px', background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  ⬅️ رجوع للأقسام (Retour aux catégories)
                </button>
                <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--burgundy-dark)' }}>
                  {selectableCategories.find(c => c.id === selectedViewCategory)?.title}
                </h3>
              </div>
              <button onClick={() => handleOpenNewForCategory(selectedViewCategory)} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
                <Plus size={16} /> إضافة في هذا القسم
              </button>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: stockMode === 'boutique' ? 'repeat(auto-fill, minmax(160px, 1fr))' : 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
            {filteredProductsByMode
              .filter(p => {
                if (selectedViewCategory === null || searchQuery.trim() !== '') return true;
                return getProductCategoryGroupId(p.category, categoriesList) === selectedViewCategory;
              })
              .filter(p => {
                const q = searchQuery.toLowerCase().trim();
                if (!q) return true;
                return p.title.toLowerCase().startsWith(q) || (p.barcode && String(p.barcode).startsWith(q));
              })
              .map(p => stockMode === 'boutique' ? (
                <div key={p.id} onClick={() => setQuickViewProduct(p)} style={{ background: 'white', borderRadius: '12px', border: '1px solid var(--border-light)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', position: 'relative', cursor: 'pointer' }}>
                  <div style={{ position: 'relative', height: '140px' }}>
                    <img src={(p.images && p.images[0]) || p.image || ''} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover', backgroundColor: '#f3f4f6' }} />
                    <div style={{ position: 'absolute', top: 6, right: 6, display: 'flex', gap: 4 }}>
                      <button type="button" onClick={(e) => { e.stopPropagation(); handlePrintBarcodeDirectly(p); }} style={{ background: 'white', border: 'none', padding: 5, borderRadius: '50%', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Barcode">
                        <BarcodeIcon size={12} color="#4F46E5" />
                      </button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); handleOpenEdit(p); }} style={{ background: 'white', border: 'none', padding: 5, borderRadius: '50%', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Modifier">
                        <Edit2 size={12} color="#1565C0" />
                      </button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); if(window.confirm("Supprimer définitivement ce pyjama ?")) onDeleteProduct(p.id); }} style={{ background: 'white', border: 'none', padding: 5, borderRadius: '50%', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Supprimer">
                        <Trash2 size={12} color="#D32F2F" />
                      </button>
                    </div>
                  </div>
                  <div style={{ padding: '8px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <h4 style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-dark)', margin: 0, textAlign: 'center', height: '36px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: '1.2' }}>
                      {p.title}
                    </h4>
                  </div>
                </div>
              ) : (
              <div key={p.id} style={{ background: 'white', borderRadius: '16px', border: '1px solid var(--border-light)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ position: 'relative', height: '280px' }}>
                  <div className="hide-scrollbar" style={{ display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory', width: '100%', height: '100%', scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch' }}>
                    {(p.images && p.images.length > 0 ? p.images : (p.image ? [p.image] : [])).map((img, idx) => (
                      <img key={idx} src={img} alt={`${p.title} ${idx + 1}`} style={{ minWidth: '100%', height: '100%', objectFit: 'cover', scrollSnapAlign: 'start', backgroundColor: '#f3f4f6' }} />
                    ))}
                  </div>
                  {stockMode !== 'boutique' ? (
                    <span style={{ position: 'absolute', top: 10, left: 10, background: 'var(--burgundy-dark)', color: 'white', padding: '4px 10px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {(() => {
                        const cleanCat = p.category ? p.category.replace(`${stockMode}__`, '') : '';
                        const catObj = categoriesList.find(c => c && c.id === cleanCat);
                        return (
                          <>
                            {catObj?.icon || '📦'} {catObj?.title || cleanCat.toUpperCase()}
                          </>
                        );
                      })()}
                    </span>
                  ) : null}
              <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 6 }}>
                <button type="button" onClick={() => handlePrintBarcodeDirectly(p)} style={{ background: 'white', border: 'none', padding: 8, borderRadius: '50%', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }} title="Imprimer Code Barres">
                  <BarcodeIcon size={16} color="#4F46E5" />
                </button>
                <button type="button" onClick={() => handleOpenEdit(p)} style={{ background: 'white', border: 'none', padding: 8, borderRadius: '50%', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }} title="Modifier">
                  <Edit2 size={16} color="#1565C0" />
                </button>
                <button type="button" onClick={() => { if(window.confirm("Supprimer définitivement ce pyjama ?")) onDeleteProduct(p.id); }} style={{ background: 'white', border: 'none', padding: 8, borderRadius: '50%', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }} title="Supprimer">
                  <Trash2 size={16} color="#D32F2F" />
                </button>
              </div>
            </div>

            <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-dark)', marginBottom: 6 }}>{p.title}</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                  🏢 Fournisseur : <strong>{p.supplier || 'N/A'}</strong>
                </p>

                {/* Colors & Sizes breakdown */}
                {stockMode === 'gros' ? (
                  <div style={{ background: '#F1F5F9', padding: '10px', borderRadius: '8px', marginBottom: 14 }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--burgundy)' }}>📊 الألوان المتاحة وتكوين السيري :</span>
                    <div style={{ marginTop: 6, marginBottom: 8, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#333' }}>🎨 الألوان:</span> 
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {p.colorVariants?.map((cv, i) => (
                          <div key={i} title={cv.color} style={{ width: '16px', height: '16px', borderRadius: '50%', background: cv.colorHex || '#CBD5E1', border: '1px solid #94A3B8' }} />
                        ))}
                      </div>
                    </div>
                    {(() => {
                      const descParts = (p.description || '').split('|||');
                      try {
                        const meta = descParts[1] ? JSON.parse(descParts[1]) : {};
                        if (meta.serieConfig && Object.keys(meta.serieConfig).length > 0) {
                          return (
                            <div style={{ fontSize: '0.8rem' }}>
                              <span style={{ fontWeight: 700, color: '#333' }}>📦 السيري الواحدة تحتوي على:</span>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                                {Object.entries(meta.serieConfig).map(([sz, qty]) => (
                                  <span key={sz} style={{ background: 'white', border: '1px solid #CBD5E1', padding: '2px 6px', borderRadius: 4 }}>{sz}: <strong>{qty}</strong></span>
                                ))}
                              </div>
                            </div>
                          );
                        }
                      } catch(e) {}
                      return null;
                    })()}
                  </div>
                ) : (
                  <div style={{ background: '#FAF8F5', padding: '10px', borderRadius: '8px', marginBottom: 14 }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--burgundy)' }}>📊 المخزون الحالي حسب اللون والمقاس :</span>
                    {p.colorVariants?.map((cv, cIdx) => (
                      <div key={cIdx} style={{ marginTop: 8, borderTop: cIdx > 0 ? '1px dashed #DDD' : 'none', paddingTop: cIdx > 0 ? 6 : 0 }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#333' }}>🎨 {cv.color} :</span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                          {Object.entries(cv.stock || {}).sort((a, b) => {
                            const numA = Number(a[0]);
                            const numB = Number(b[0]);
                            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                            if (!isNaN(numA)) return -1;
                            if (!isNaN(numB)) return 1;
                            return ALL_SIZES.indexOf(a[0]) - ALL_SIZES.indexOf(b[0]);
                          }).map(([sz, qty]) => (
                            <div key={sz} style={{ display: 'flex', alignItems: 'center', background: 'white', border: '1px solid #E0E0E0', padding: '2px 8px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700 }}>
                              <span>{sz}: <strong style={{ color: qty > 0 ? '#2E7D32' : '#D32F2F' }}>{qty}</strong> قطعة</span>
                              <div style={{ display: 'flex', marginLeft: 6, gap: 2 }}>
                                <button onClick={() => handleQuickQtyAdjust(p, cIdx, sz, 1)} style={{ border: 'none', background: '#E8F5E9', color: '#2E7D32', cursor: 'pointer', borderRadius: 2, padding: '0 4px', fontWeight: 900 }}>+</button>
                                <button onClick={() => handleQuickQtyAdjust(p, cIdx, sz, -1)} style={{ border: 'none', background: '#FFEBEE', color: '#C62828', cursor: 'pointer', borderRadius: 2, padding: '0 4px', fontWeight: 900 }}>-</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-light)', paddingTop: 12 }}>
                <div>
                  {stockMode === 'gros' ? (
                    <>
                      <span style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--burgundy)', display: 'block' }}>
                        📦 الجملة : {p.price.toLocaleString()} DA (سعر السيري الواحدة)
                      </span>
                      <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#4F46E5', display: 'block' }}>
                        👑 جملة كبيرة : {p.oldPrice ? `${p.oldPrice.toLocaleString()} DA` : '0 DA'} (من {(() => {
                          const descParts = (p.description || '').split('|||');
                          try {
                            const meta = descParts[1] ? JSON.parse(descParts[1]) : {};
                            return meta.minQtySuperGros || 5;
                          } catch(e) { return 5; }
                        })()} سيريات)
                      </span>
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Achat : {p.purchasePrice ? `${p.purchasePrice.toLocaleString()} DA` : 'N/A'}</span>
                      <span style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--burgundy)' }}>Vente : {p.price.toLocaleString()} DA</span>
                    </>
                  )}
                </div>
                <button onClick={() => handleOpenEdit(p)} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                  <Edit2 size={14} /> Modifier
                </button>
              </div>
            </div>
            </div>
          ))}
        </div>
        </>
      )}
      </div>

      {/* Canvas Color Picker from Image Modal */}
      {activeColorPickerIndex !== null && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '16px' }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '20px', maxWidth: '600px', width: '100%', maxHeight: '90vh', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: '10px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--burgundy)', margin: 0 }}>
                🎨 اختر درجة اللون من صورة البيجامة (Pipette)
              </h3>
              <button type="button" onClick={() => setActiveColorPickerIndex(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="#64748B" />
              </button>
            </div>

            <p style={{ fontSize: '0.82rem', color: '#475569', margin: 0 }}>
              💡 مرر الفأرة أو اصبعك فوق الصورة لاختيار درجة اللون بدقة، ثم اضغط على المكان المطلوب:
            </p>

            {/* Image selector inside picker if multiple images exist */}
            {images.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px' }}>
                {images.map((imgUrl, idx) => (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => setPickerImageSrc(imgUrl)}
                    style={{
                      border: pickerImageSrc === imgUrl ? '3px solid var(--burgundy)' : '1px solid #CBD5E1',
                      borderRadius: '8px',
                      padding: 0,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                  >
                    <img src={imgUrl} alt={`img-${idx}`} style={{ width: '50px', height: '50px', objectFit: 'cover', display: 'block' }} />
                  </button>
                ))}
              </div>
            )}

            {/* Live Hover Preview Loupe */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#F8FAFC', padding: '10px 14px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: pickerHoveredColor, border: '3px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.2)', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B' }}>اللون تحت المؤشر :</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#1E293B', fontFamily: 'monospace' }}>{pickerHoveredColor}</div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>أو اختر يدوياً:</label>
                <input
                  type="color"
                  value={pickerHoveredColor}
                  onChange={(e) => setPickerHoveredColor(e.target.value)}
                  style={{ width: '40px', height: '36px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                />
              </div>
            </div>

            {/* Canvas Area */}
            <div style={{ display: 'flex', justifyContent: 'center', background: '#1E293B', padding: '12px', borderRadius: '12px', overflow: 'auto', minHeight: '200px' }}>
              {pickerImageSrc ? (
                <canvas
                  ref={canvasRef}
                  onClick={() => {
                    handleColorHexChange(activeColorPickerIndex, pickerHoveredColor);
                    setActiveColorPickerIndex(null);
                  }}
                  onMouseMove={(e) => {
                    const canvas = canvasRef.current;
                    if (!canvas) return;
                    const rect = canvas.getBoundingClientRect();
                    const scaleX = canvas.width / rect.width;
                    const scaleY = canvas.height / rect.height;
                    const x = Math.floor((e.clientX - rect.left) * scaleX);
                    const y = Math.floor((e.clientY - rect.top) * scaleY);
                    const ctx = canvas.getContext('2d');
                    try {
                      const data = ctx.getImageData(x, y, 1, 1).data;
                      const hex = "#" + ((1 << 24) + (data[0] << 16) + (data[1] << 8) + data[2]).toString(16).slice(1).toUpperCase();
                      setPickerHoveredColor(hex);
                    } catch (err) {}
                  }}
                  style={{ cursor: 'crosshair', maxWidth: '100%', height: 'auto', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
                />
              ) : (
                <div style={{ color: 'white', textAlign: 'center', padding: '30px', fontSize: '0.9rem' }}>
                  ❌ لا توجد صورة محملة للمنتج بعد. يرجى رفع صور للمنتج أولاً.
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => {
                  handleColorHexChange(activeColorPickerIndex, pickerHoveredColor);
                  setActiveColorPickerIndex(null);
                }}
                className="btn btn-primary"
                style={{ padding: '8px 18px', fontSize: '0.9rem' }}
              >
                ✅ اعتماد هذا اللون ({pickerHoveredColor})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick View Product Details Modal */}
      {activeQuickViewProduct && (() => {
        const quickViewProduct = activeQuickViewProduct;
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
          <div className="hide-scrollbar" style={{ background: 'white', borderRadius: '24px', padding: '24px', maxWidth: '650px', width: '100%', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 20px 40px rgba(0,0,0,0.25)', position: 'relative' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--burgundy-dark)', margin: 0 }}>
                🔍 تفاصيل المنتج (Détails du Produit)
              </h3>
              <button type="button" onClick={() => setQuickViewProduct(null)} style={{ background: '#F1F5F9', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={20} color="#64748B" />
              </button>
            </div>

            {/* Content layout */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '20px' }}>
              
              {/* Left: Product Images */}
              <div>
                <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid #E2E8F0', height: '220px', background: '#F8FAFC' }}>
                  <img 
                    src={(quickViewProduct.images && quickViewProduct.images[0]) || quickViewProduct.image || ''} 
                    alt={quickViewProduct.title} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                </div>
                {/* Images grid if multiple */}
                {quickViewProduct.images && quickViewProduct.images.length > 1 && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
                    {quickViewProduct.images.map((img, idx) => (
                      <img 
                        key={idx} 
                        src={img} 
                        alt="" 
                        style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #E2E8F0', flexShrink: 0 }} 
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Right: Info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#1E293B', margin: 0 }}>
                  {quickViewProduct.title}
                </h4>

                <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '12px', fontSize: '0.88rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div>🏷️ الصنف: <strong>{(() => {
                    const cleanCat = quickViewProduct.category ? quickViewProduct.category.replace(`${stockMode}__`, '') : '';
                    const catObj = categoriesList.find(c => c && c.id === cleanCat);
                    return `${catObj?.icon || '📦'} ${catObj?.title || cleanCat.toUpperCase()}`;
                  })()}</strong></div>
                  <div>🏢 المورد: <strong>{quickViewProduct.supplier || 'N/A'}</strong></div>
                  <div>📊 الكودبار: <strong style={{ color: '#4F46E5', fontFamily: 'monospace', letterSpacing: '0.5px' }}>{quickViewProduct.barcode || 'N/A'}</strong></div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ background: '#FFF7ED', padding: '10px', borderRadius: '12px', textAlign: 'center', border: '1px solid #FED7AA' }}>
                    <span style={{ fontSize: '0.75rem', color: '#C2410C', display: 'block', fontWeight: 700 }}>سعر البيع (Vente)</span>
                    <strong style={{ fontSize: '1.1rem', color: 'var(--burgundy)', fontWeight: 900 }}>{quickViewProduct.price?.toLocaleString()} DA</strong>
                  </div>
                  {!quickViewProduct.category?.startsWith('boutique__') && quickViewProduct.purchasePrice ? (
                    <div style={{ background: '#F0FDF4', padding: '10px', borderRadius: '12px', textAlign: 'center', border: '1px solid #BBF7D0' }}>
                      <span style={{ fontSize: '0.75rem', color: '#166534', display: 'block', fontWeight: 700 }}>سعر الشراء (Achat)</span>
                      <strong style={{ fontSize: '1.1rem', color: '#15803D', fontWeight: 900 }}>{quickViewProduct.purchasePrice?.toLocaleString()} DA</strong>
                    </div>
                  ) : (
                    <div style={{ background: '#F8FAFC', padding: '10px', borderRadius: '12px', textAlign: 'center', border: '1px solid #E2E8F0' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'block', fontWeight: 700 }}>سعر الشراء</span>
                      <strong style={{ fontSize: '1.1rem', color: '#475569', fontWeight: 900 }}>{quickViewProduct.purchasePrice ? `${quickViewProduct.purchasePrice.toLocaleString()} DA` : '0 DA'}</strong>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Color & Sizes breakdown */}
            <div style={{ background: '#FAF8F5', padding: '16px', borderRadius: '16px', border: '1px solid #F5EBE6' }}>
              <h5 style={{ margin: '0 0 10px 0', fontSize: '0.92rem', fontWeight: 800, color: 'var(--burgundy-dark)', borderBottom: '1px dashed #E2E8F0', paddingBottom: '6px' }}>
                📊 المخزون والكميات الحالية حسب اللون والمقاس :
              </h5>
              {quickViewProduct.colorVariants?.map((cv, cIdx) => (
                <div key={cIdx} style={{ marginTop: 8, borderTop: cIdx > 0 ? '1px dashed #DDD' : 'none', paddingTop: cIdx > 0 ? 8 : 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: cv.colorHex || '#CBD5E1', display: 'inline-block', border: '1px solid #94A3B8' }} />
                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1E293B' }}>🎨 {cv.color} :</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                    {Object.entries(cv.stock || {}).map(([sz, qty]) => (
                      <div key={sz} style={{ display: 'flex', alignItems: 'center', background: 'white', border: '1px solid #E2E8F0', padding: '4px 10px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700 }}>
                        <span>{sz}: <strong style={{ color: qty > 0 ? '#166534' : '#C2410C' }}>{qty}</strong> قطعة</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Description */}
            {(() => {
              const descParts = (quickViewProduct.description || '').split('|||');
              const mainDesc = descParts[0] || '';
              if (mainDesc.trim()) {
                return (
                  <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '12px' }}>
                    <h5 style={{ margin: '0 0 6px 0', fontSize: '0.88rem', fontWeight: 800, color: '#475569' }}>وصف المنتج (Description):</h5>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748B', lineHeight: '1.4' }}>{mainDesc}</p>
                  </div>
                );
              }
              return null;
            })()}

            {/* Footer Buttons */}
            <div style={{ display: 'flex', gap: '12px', borderTop: '1px solid #E2E8F0', paddingTop: '16px', justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                onClick={() => { 
                  setQuickViewProduct(null); 
                  handleOpenEdit(quickViewProduct); 
                }} 
                className="btn btn-primary" 
                style={{ padding: '10px 20px', fontSize: '0.9rem' }}
              >
                ✏️ تعديل المنتج (Modifier)
              </button>
              <button 
                type="button" 
                onClick={() => setQuickViewProduct(null)} 
                className="btn btn-secondary" 
                style={{ padding: '10px 20px', fontSize: '0.9rem', background: '#F1F5F9', border: 'none', color: '#475569' }}
              >
                إغلاق (Fermer)
              </button>
            </div>

          </div>
        </div>
      );
      })()}

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="تأكيد حذف المنتج"
        message={`هل أنت متأكد من رغبتك في حذف بيجاما/منتج "${deleteModal.targetTitle}" نهائياً من المخزون؟`}
        confirmText="نعم، حذف المنتج"
        cancelText="تراجع وإلغاء"
        onConfirm={() => {
          if (deleteModal.targetId) {
            onDeleteProduct(deleteModal.targetId);
          }
        }}
        onClose={() => setDeleteModal({ isOpen: false, targetId: null, targetTitle: '' })}
      />
    </>
  );
}
