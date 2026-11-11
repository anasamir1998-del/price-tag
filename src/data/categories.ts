import { CategoryInfo, CategoryType } from '../types';

export const CATEGORIES_LIST: CategoryInfo[] = [
  {
    id: 'supermarket',
    nameAr: 'سوبرماركت ومواد غذائية',
    nameEn: 'Supermarket & Groceries',
    icon: '🛒',
    badgeBg: 'bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    badgeText: '#047857',
    borderColor: '#10b981',
    description: 'الأغذية، المعلبات، المنظفات، والمواد الاستهلاكية',
  },
  {
    id: 'bakery',
    nameAr: 'مخبوزات وحلويات',
    nameEn: 'Bakery & Sweets',
    icon: '🥐',
    badgeBg: 'bg-amber-500/15 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30',
    badgeText: '#b45309',
    borderColor: '#f59e0b',
    description: 'الخبز الطازج، الكيك، الحلويات الشرقية والغربية',
  },
  {
    id: 'fruits_veg',
    nameAr: 'خضار وفواكه طازجة',
    nameEn: 'Fruits & Vegetables',
    icon: '🥦',
    badgeBg: 'bg-green-500/15 dark:bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30',
    badgeText: '#15803d',
    borderColor: '#22c55e',
    description: 'الخضروات الورقية، الفواكه الموسمية، والمنتجات العضوية',
  },
  {
    id: 'meat_fish',
    nameAr: 'لحوم ودواجن وأسماك',
    nameEn: 'Meat, Poultry & Seafood',
    icon: '🥩',
    badgeBg: 'bg-rose-500/15 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/30',
    badgeText: '#be123c',
    borderColor: '#f43f5e',
    description: 'اللحوم الطازجة، الدواجن المبردة، والأسماك والمأكولات البحرية',
  },
  {
    id: 'electronics',
    nameAr: 'إلكترونيات وأجهزة ذكية',
    nameEn: 'Electronics & Smart Devices',
    icon: '📱',
    badgeBg: 'bg-blue-500/15 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30',
    badgeText: '#1d4ed8',
    borderColor: '#3b82f6',
    description: 'الهواتف، الأجهزة اللوحية، الإكسسوارات، والشواحن',
  },
  {
    id: 'apparel',
    nameAr: 'أزياء وملابس وأحذية',
    nameEn: 'Apparel, Fashion & Shoes',
    icon: '👕',
    badgeBg: 'bg-purple-500/15 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30',
    badgeText: '#6d28d9',
    borderColor: '#a855f7',
    description: 'الملابس الرجالية والنسائية، ملابس الأطفال، والأحذية',
  },
  {
    id: 'pharmacy',
    nameAr: 'صيدلية وعناية صحية',
    nameEn: 'Pharmacy & Healthcare',
    icon: '💊',
    badgeBg: 'bg-cyan-500/15 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
    badgeText: '#0e7490',
    borderColor: '#06b6d4',
    description: 'المكملات الغذائية، الإسعافات، وأجهزة العناية الصحية',
  },
  {
    id: 'perfumes',
    nameAr: 'عطور وتجميل وعناية',
    nameEn: 'Perfumes & Cosmetics',
    icon: '🌸',
    badgeBg: 'bg-pink-500/15 dark:bg-pink-500/20 text-pink-700 dark:text-pink-300 border-pink-500/30',
    badgeText: '#be185d',
    borderColor: '#ec4899',
    description: 'العطور الشرقية والفرنسية، المكياج، ومنتجات العناية بالبشرة',
  },
  {
    id: 'promo',
    nameAr: 'عروض وتخفيضات موسمية',
    nameEn: 'Promotions & Special Offers',
    icon: '🏷️',
    badgeBg: 'bg-red-500/15 dark:bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30',
    badgeText: '#b91c1c',
    borderColor: '#ef4444',
    description: 'عروض التصفية، الجمعة البيضاء، ومهرجانات الأسعار',
  },
  {
    id: 'thermal',
    nameAr: 'ملصقات حرارية وطابعات باركود',
    nameEn: 'Thermal Stickers & Rolls',
    icon: '🖨️',
    badgeBg: 'bg-slate-500/15 dark:bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-500/30',
    badgeText: '#475569',
    borderColor: '#64748b',
    description: 'رولات حرارية 50×30 مم، 80 مم، واستيكرات الموازين',
  },
  {
    id: 'general',
    nameAr: 'عام / أقسام أخرى',
    nameEn: 'General & Miscellaneous',
    icon: '📦',
    badgeBg: 'bg-slate-500/15 dark:bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-500/30',
    badgeText: '#475569',
    borderColor: '#94a3b8',
    description: 'أصناف غير مصنفة أو متعددة الاستخدامات',
  },
];

export const getCategoryById = (id?: string | CategoryType): CategoryInfo => {
  if (!id) return CATEGORIES_LIST[CATEGORIES_LIST.length - 1]; // general
  const found = CATEGORIES_LIST.find((c) => c.id === id);
  if (found) return found;

  // Try matching Arabic text (e.g. from Excel imports or custom text)
  const byName = CATEGORIES_LIST.find(
    (c) => c.nameAr.toLowerCase().includes(String(id).toLowerCase()) || String(id).toLowerCase().includes(c.nameAr.toLowerCase())
  );
  if (byName) return byName;

  return {
    id: 'general',
    nameAr: String(id),
    nameEn: String(id),
    icon: '🏷️',
    badgeBg: 'bg-brand-500/15 dark:bg-brand-500/20 text-brand-700 dark:text-brand-300 border-brand-500/30',
    badgeText: '#4f46e5',
    borderColor: '#6366f1',
    description: String(id),
  };
};
