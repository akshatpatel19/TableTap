import { db } from './firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Query,
  QueryConstraint,
  onSnapshot,
  increment
} from 'firebase/firestore';

export interface Cafe {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string;
  address: string;
  tables: number;
  subscriptionPlan: 'basic' | 'standard' | 'premium';
  subscriptionStartDate: number;
  subscriptionEndDate: number;
  isActive: boolean;
  upiId?: string; // UPI ID for payments (e.g., user@upi)
  upiQrCode?: string; // Base64 encoded QR code image
  gstNumber?: string; // GST number for billing
  cafeCode?: string; // Unique 6-character code for staff login
  categories?: string[]; // Custom categories created by cafe owner
  // Subscription payment tracking
  setupFeeStatus: 'pending' | 'paid' | 'rejected'; // Setup fee payment status
  setupFeeAmount: number; // 4999 rupees
  setupFeeVerifiedAt?: number; // When admin verified payment
  setupFeePaymentId?: string; // Unique payment ID for setup fee
  lastMonthlyPaymentDate?: number; // When last monthly subscription was paid
  nextMonthlyPaymentDueDate?: number; // When next monthly payment is due
  monthlySubscriptionAmount: number; // Per table per month (199 * number of tables)
  // Counters for Aggregation (Issue 10)
  activeOrdersCount: number;
  totalOrdersCount: number;
  upcomingPaymentEmailSentAt?: number | null;
  overduePaymentEmailSentAt?: number | null;
  suspensionWarningEmailSentAt?: number | null;
  createdAt: number;
  updatedAt: number;
}

// Extracted interfaces from Cafe (Issue 1)
export interface SubscriptionPayment {
  id: string;
  cafeId: string; // Foreign key
  paymentId: string; // Unique payment ID
  type: 'setup' | 'monthly';
  amount: number;
  dueDate: number;
  paidDate?: number;
  status: 'pending' | 'paid' | 'overdue' | 'rejected';
  verifiedBy?: string; // Admin ID who verified
  verifiedAt?: number;
  notes?: string;
}

export interface TableUpgradePayment {
  id: string;
  cafeId: string; // Foreign key
  paymentId: string;
  oldTableCount: number;
  newTableCount: number;
  tablesAdded: number;
  amount: number;
  daysRemaining: number;
  paidDate?: number;
  status: 'pending' | 'paid' | 'rejected';
  verifiedBy?: string;
  verifiedAt?: number;
  notes?: string;
}


export interface AdminSettings {
  id: string;
  upiId: string; // Admin's UPI ID for receiving payments
  setupFeeAmount: number; // 4999
  monthlyFeePerTable: number; // 199
  globalNotice?: string;
  noticeActive?: boolean;
  maintenanceMode?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface AddOn {
  id: string;
  name: string;
  price: number;
  isAvailable?: boolean;
}

export interface MenuItem {
  id: string;
  cafeId: string;
  name: string;
  description: string;
  price: number;
  isAvailable: boolean;
  category: string;
  foodType: 'vegetarian' | 'non-vegetarian' | 'eggitarian';
  image?: string;
  addOns?: AddOn[];
  createdAt: number;
  updatedAt: number;
}

export interface Discount {
  id: string;
  cafeId: string;
  type: 'menu' | 'category' | 'item' | 'special'; // menu: whole menu, category: specific category, item: single item, special: buy 1 get 1
  name: string;
  description: string; // empty string if no description
  discountValue: number; // percentage for regular discounts, or specific value for special offers
  discountType: 'percentage' | 'fixed' | 'bogo'; // percentage, fixed amount, or buy one get one
  applicableTo: string; // category name or item ID, empty string for whole menu
  startDate: number;
  endDate: number;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Order {
  id: string;
  cafeId: string;
  tableId: number;
  customerEmail: string;
  customerPhone: string;
  items: Array<{
    menuItemId: string;
    name: string;
    quantity: number;
    basePrice: number; // Price of the base item
    addOns?: Array<{
      id: string;
      name: string;
      price: number;
    }>;
    addOnsTotal?: number; // Total price of all add-ons
    price: number; // Total price (basePrice + addOnsTotal)
  }>;
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed';
  paymentMethod: 'online' | 'counter';
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Subscription {
  id: string;
  cafeId: string;
  plan: 'basic' | 'standard' | 'premium';
  tablesIncluded: number;
  monthlyCost: number;
  startDate: number;
  endDate: number;
  isActive: boolean;
  autoRenew: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface PopupField {
  id: string;
  name: string;
  type: 'text' | 'email' | 'checkbox' | 'textarea' | 'select';
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[]; // For select type
}

export interface AdminPopup {
  id: string;
  title: string;
  description: string;
  content: string;
  templateType: 'notification' | 'confirmation' | 'form' | 'terms';
  hasCheckbox: boolean;
  checkboxText?: string;
  isUnclosable: boolean;
  fields?: PopupField[]; // For form type
  targetCafes: 'all' | 'specific'; // all cafes or specific ones
  cafeIds?: string[]; // If specific
  status: 'draft' | 'active' | 'archived';
  createdAt: number;
  updatedAt: number;
  createdBy: string;
}

export interface CafePopup {
  id: string;
  popupId: string;
  cafeId: string;
  dismissed: boolean;
  dismissedAt?: number;
  agreedToTerms?: boolean;
  agreedAt?: number;
  formResponse?: Record<string, any>;
  createdAt: number;
}

// Cafe operations
export const getUniqueCafeCode = async () => {
  let isUnique = false;
  let code = '';
  while (!isUnique) {
    const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26)); // A-Z
    const numbers = Math.floor(10000 + Math.random() * 90000); // 5 digit number
    code = `${letter}${numbers}`;
    const q = query(collection(db, 'cafes'), where('cafeCode', '==', code));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      isUnique = true;
    }
  }
  return code;
};

export const createCafe = async (cafeData: Omit<Cafe, 'id' | 'createdAt' | 'updatedAt'>) => {
  const cafeRef = doc(collection(db, 'cafes'));
  const creationTime = Date.now();
  // const nextPaymentDueDate = creationTime + 30 * 24 * 60 * 60 * 1000; // 30 days from creation
  const nextPaymentDueDate = creationTime; // 30 days from creation

  const cafeCode = await getUniqueCafeCode();

  const cafe: Cafe = {
    ...cafeData,
    id: cafeRef.id,
    cafeCode,
    setupFeeStatus: 'pending',
    setupFeeAmount: 4999,
    monthlySubscriptionAmount: (cafeData.tables || 5) * 199,
    activeOrdersCount: 0,
    totalOrdersCount: 0,
    // Set payment dates based on account creation date
    lastMonthlyPaymentDate: creationTime,
    nextMonthlyPaymentDueDate: nextPaymentDueDate,
    createdAt: creationTime,
    updatedAt: creationTime,
  };
  await setDoc(cafeRef, cafe);
  return cafe;
};

export const getCafe = async (cafeId: string) => {
  const cafeRef = doc(db, 'cafes', cafeId);
  const cafeSnap = await getDoc(cafeRef);
  return cafeSnap.exists() ? (cafeSnap.data() as Cafe) : null;
};

export const getCafeBySlug = async (slug: string) => {
  const q = query(collection(db, 'cafes'), where('slug', '==', slug));
  const querySnapshot = await getDocs(q);
  return querySnapshot.empty ? null : (querySnapshot.docs[0].data() as Cafe);
};

export const getCafeByEmail = async (email: string) => {
  const q = query(collection(db, 'cafes'), where('email', '==', email));
  const querySnapshot = await getDocs(q);
  return querySnapshot.empty ? null : (querySnapshot.docs[0].data() as Cafe);
};

export const updateCafe = async (cafeId: string, updates: Partial<Cafe>) => {
  const cafeRef = doc(db, 'cafes', cafeId);
  await updateDoc(cafeRef, { ...updates, updatedAt: Date.now() });
};

export const getAllCafes = async () => {
  const cafesRef = collection(db, 'cafes');
  const querySnapshot = await getDocs(cafesRef);
  return querySnapshot.docs.map((doc) => doc.data() as Cafe);
};

// Menu cache to prevent read amplification (Issue 5)
const menuCache = new Map<string, { data: MenuItem[], timestamp: number }>();
const MENU_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const invalidateMenuCache = (cafeId: string) => {
  menuCache.delete(cafeId);
};

// Menu item operations
export const createMenuItem = async (menuData: Omit<MenuItem, 'id' | 'createdAt' | 'updatedAt'>) => {
  const menuRef = doc(collection(db, 'menuItems'));
  const menuItem: MenuItem = {
    ...menuData,
    id: menuRef.id,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await setDoc(menuRef, menuItem);
  invalidateMenuCache(menuData.cafeId);
  return menuItem;
};

export const getMenuItems = async (cafeId: string) => {
  const now = Date.now();
  const cached = menuCache.get(cafeId);
  if (cached && now - cached.timestamp < MENU_CACHE_TTL) {
    return cached.data;
  }

  const q = query(collection(db, 'menuItems'), where('cafeId', '==', cafeId));
  const querySnapshot = await getDocs(q);
  const data = querySnapshot.docs.map((doc) => doc.data() as MenuItem);

  menuCache.set(cafeId, { data, timestamp: now });
  return data;
};

export const updateMenuItem = async (menuItemId: string, updates: Partial<MenuItem>) => {
  const menuRef = doc(db, 'menuItems', menuItemId);

  let cafeId = updates.cafeId;
  if (!cafeId) {
    const docSnap = await getDoc(menuRef);
    if (docSnap.exists()) {
      cafeId = (docSnap.data() as MenuItem).cafeId;
    }
  }

  await updateDoc(menuRef, { ...updates, updatedAt: Date.now() });

  if (cafeId) {
    invalidateMenuCache(cafeId);
  }
};

export const deleteMenuItem = async (menuItemId: string) => {
  const menuRef = doc(db, 'menuItems', menuItemId);

  const docSnap = await getDoc(menuRef);
  let cafeId;
  if (docSnap.exists()) {
    cafeId = (docSnap.data() as MenuItem).cafeId;
  }

  await deleteDoc(menuRef);

  if (cafeId) {
    invalidateMenuCache(cafeId);
  }
};

// Order operations
import { runTransaction } from 'firebase/firestore';

export const createOrder = async (orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => {
  const orderRef = doc(collection(db, 'orders'));
  const order: Order = {
    ...orderData,
    id: orderRef.id,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const cafeRef = doc(db, 'cafes', orderData.cafeId);

  await runTransaction(db, async (transaction) => {
    // Read the cafe doc first (required by transaction rules)
    const cafeDoc = await transaction.get(cafeRef);
    if (!cafeDoc.exists()) {
      throw new Error('Cafe does not exist!');
    }

    // Write the order doc
    transaction.set(orderRef, order);

    // Increment counters
    const currentActive = cafeDoc.data().activeOrdersCount || 0;
    const currentTotal = cafeDoc.data().totalOrdersCount || 0;

    transaction.update(cafeRef, {
      activeOrdersCount: currentActive + 1,
      totalOrdersCount: currentTotal + 1,
    });
  });

  return order;
};

export const getOrder = async (orderId: string) => {
  const orderRef = doc(db, 'orders', orderId);
  const orderSnap = await getDoc(orderRef);
  return orderSnap.exists() ? (orderSnap.data() as Order) : null;
};

export const getOrders = async (cafeId: string) => {
  const q = query(collection(db, 'orders'), where('cafeId', '==', cafeId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => doc.data() as Order);
};

export const getCafeOrders = async (cafeId: string, status?: string) => {
  let q: Query;
  if (status) {
    q = query(
      collection(db, 'orders'),
      where('cafeId', '==', cafeId),
      where('status', '==', status)
    );
  } else {
    q = query(collection(db, 'orders'), where('cafeId', '==', cafeId));
  }
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => doc.data() as Order);
};

export const updateOrder = async (orderId: string, updates: Partial<Order>) => {
  const orderRef = doc(db, 'orders', orderId);

  if (updates.status && ['served', 'cancelled'].includes(updates.status)) {
    await runTransaction(db, async (transaction) => {
      const orderDoc = await transaction.get(orderRef);
      if (!orderDoc.exists()) return;

      const orderData = orderDoc.data() as Order;
      let cafeDoc = null;
      let cafeRef = null;

      // If it wasn't already served or cancelled, we will need to decrement the count
      // Therefore we must read the cafe document BEFORE any writes.
      if (!['served', 'cancelled'].includes(orderData.status)) {
        cafeRef = doc(db, 'cafes', orderData.cafeId);
        cafeDoc = await transaction.get(cafeRef);
      }

      // WRITES SECTION
      // Update the order itself
      transaction.update(orderRef, { ...updates, updatedAt: Date.now() });

      // Apply the decremented count if applicable
      if (cafeDoc && cafeDoc.exists() && cafeRef) {
        const currentActive = cafeDoc.data().activeOrdersCount || 0;
        // Ensure we don't go below 0
        transaction.update(cafeRef, {
          activeOrdersCount: Math.max(0, currentActive - 1)
        });
      }
    });
  } else {
    // Standard update without counter changes
    await updateDoc(orderRef, { ...updates, updatedAt: Date.now() });
  }
};

// Subscription operations
export const createSubscription = async (
  subData: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>
) => {
  const subRef = doc(collection(db, 'subscriptions'));
  const subscription: Subscription = {
    ...subData,
    id: subRef.id,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await setDoc(subRef, subscription);
  return subscription;
};

export const getSubscription = async (cafeId: string) => {
  const q = query(collection(db, 'subscriptions'), where('cafeId', '==', cafeId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.empty ? null : (querySnapshot.docs[0].data() as Subscription);
};

export const updateSubscription = async (subscriptionId: string, updates: Partial<Subscription>) => {
  const subRef = doc(db, 'subscriptions', subscriptionId);
  await updateDoc(subRef, { ...updates, updatedAt: Date.now() });
};

// Category operations
export const addCategory = async (cafeId: string, categoryName: string) => {
  const cafe = await getCafe(cafeId);
  if (!cafe) throw new Error('Cafe not found');

  const categories = cafe.categories || [];
  if (!categories.includes(categoryName)) {
    categories.push(categoryName);
    await updateCafe(cafeId, { categories });
  }

  return categories;
};

export const removeCategory = async (cafeId: string, categoryName: string) => {
  const cafe = await getCafe(cafeId);
  if (!cafe) throw new Error('Cafe not found');

  const categories = cafe.categories || [];
  const filtered = categories.filter((cat) => cat !== categoryName);
  await updateCafe(cafeId, { categories: filtered });

  return filtered;
};

export const getCafeCategories = async (cafeId: string) => {
  const cafe = await getCafe(cafeId);
  return cafe?.categories || [];
};

// Discount operations
export const createDiscount = async (discount: Omit<Discount, 'id'>) => {
  const discountRef = doc(collection(db, 'discounts'));
  const discountData: Discount = {
    ...discount,
    id: discountRef.id,
  };
  await setDoc(discountRef, discountData);
  return discountData;
};

export const getDiscount = async (discountId: string) => {
  const docRef = doc(db, 'discounts', discountId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? (docSnap.data() as Discount) : null;
};

export const getCafeDiscounts = async (cafeId: string) => {
  const q = query(collection(db, 'discounts'), where('cafeId', '==', cafeId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => doc.data() as Discount);
};

export const updateDiscount = async (discountId: string, updates: Partial<Discount>) => {
  const docRef = doc(db, 'discounts', discountId);
  await updateDoc(docRef, { ...updates, updatedAt: Date.now() });
};

export const deleteDiscount = async (discountId: string) => {
  const docRef = doc(db, 'discounts', discountId);
  await deleteDoc(docRef);
};

// Subscription Payment Operations
export const recordSetupFeePayment = async (cafeId: string) => {
  const cafe = await getCafe(cafeId);
  if (!cafe) throw new Error('Cafe not found');

  const paymentId = generatePaymentId();
  const paymentRef = doc(collection(db, 'subscription_payments'));

  const setupPayment: SubscriptionPayment = {
    id: paymentRef.id,
    cafeId,
    paymentId,
    type: 'setup',
    amount: 4999,
    dueDate: cafe.createdAt,
    paidDate: Date.now(),
    status: 'pending',
    notes: 'Awaiting admin verification',
  };

  await setDoc(paymentRef, setupPayment);

  await updateCafe(cafeId, {
    setupFeeStatus: 'pending',
    setupFeePaymentId: paymentId,
  });

  return setupPayment;
};

export const verifySetupFeePayment = async (cafeId: string, adminId: string, approved: boolean, adminPassword?: string) => {
  // Call the new secure API route
  const response = await fetch('/api/admin/payments/verify-setup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      cafeId,
      adminId,
      approved,
      adminPassword,
    }),
  });

  if (!response.ok) {
    console.error('Failed to process verification:', await response.text());
    return false;
  }

  const result = await response.json();
  return result.approved;
};

export const recordMonthlyPayment = async (cafeId: string) => {
  const cafe = await getCafe(cafeId);
  if (!cafe) throw new Error('Cafe not found');

  const monthlyAmount = cafe.tables * 199;
  const paymentId = generatePaymentId();
  const paymentRef = doc(collection(db, 'subscription_payments'));

  const monthlyPayment: SubscriptionPayment = {
    id: paymentRef.id,
    cafeId,
    paymentId,
    type: 'monthly',
    amount: monthlyAmount,
    dueDate: cafe.nextMonthlyPaymentDueDate || Date.now(),
    paidDate: Date.now(),
    status: 'pending',
    notes: 'Awaiting admin verification',
  };

  await setDoc(paymentRef, monthlyPayment);

  return monthlyPayment;
};

export const verifyMonthlyPayment = async (cafeId: string, paymentId: string, adminId: string, approved: boolean, adminPassword?: string) => {
  // Call the new secure API route
  const response = await fetch('/api/admin/payments/verify-monthly', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      cafeId,
      paymentId,
      adminId,
      approved,
      adminPassword,
    }),
  });

  if (!response.ok) {
    console.error('Failed to process verification:', await response.text());
    return false;
  }

  const result = await response.json();
  return result.approved;
};

export const getPendingPayments = async (cafeId: string) => {
  const cafe = await getCafe(cafeId);
  if (!cafe) return { setupFee: null, monthlyPayment: null };

  const q = query(collection(db, 'subscription_payments'), where('cafeId', '==', cafeId), where('status', '==', 'pending'));
  const querySnapshot = await getDocs(q);
  const pendingPayments = querySnapshot.docs.map(doc => doc.data() as SubscriptionPayment);

  const setupFee = pendingPayments.find((p) => p.type === 'setup');
  const monthlyPayment = pendingPayments.find(
    (p) => p.type === 'monthly' && Date.now() >= p.dueDate
  );

  return { setupFee, monthlyPayment };
};

export const getSubscriptionPayments = async (cafeId: string) => {
  const q = query(collection(db, 'subscription_payments'), where('cafeId', '==', cafeId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data() as SubscriptionPayment);
};

export const isMonthlyPaymentDue = async (cafeId: string) => {
  const cafe = await getCafe(cafeId);
  if (!cafe) return false;
  if (cafe.setupFeeStatus !== 'paid') return false;

  const now = Date.now();
  const dueDate = cafe.nextMonthlyPaymentDueDate || Date.now();

  return now >= dueDate;
};

// Check if payment reminder should be shown (3 days before due date)
export const isPaymentReminderDue = async (cafeId: string) => {
  const cafe = await getCafe(cafeId);
  if (!cafe) return false;
  if (cafe.setupFeeStatus !== 'paid') return false;

  const now = Date.now();
  const dueDate = cafe.nextMonthlyPaymentDueDate || Date.now();
  const threeDaysBeforeDue = dueDate - (3 * 24 * 60 * 60 * 1000); // 3 days in milliseconds

  // Show reminder if payment is within 3 days AND not yet overdue
  return now >= threeDaysBeforeDue && now < dueDate;
};

// Check if payment is overdue (past due date)
export const isPaymentOverdue = async (cafeId: string) => {
  const cafe = await getCafe(cafeId);
  if (!cafe) return false;
  if (cafe.setupFeeStatus !== 'paid') return false;

  const now = Date.now();
  const dueDate = cafe.nextMonthlyPaymentDueDate || Date.now();

  return now >= dueDate;
};

// Admin Settings Operations
export const getAdminSettings = async (): Promise<AdminSettings | null> => {
  try {
    const docRef = doc(db, 'adminSettings', 'global');
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? (docSnap.data() as AdminSettings) : null;
  } catch (error) {
    console.error('[v0] Error fetching admin settings:', error);
    return null;
  }
};

export const updateAdminSettings = async (settings: Partial<AdminSettings>) => {
  try {
    const docRef = doc(db, 'adminSettings', 'global');
    const existingSettings = await getAdminSettings();

    if (existingSettings) {
      await updateDoc(docRef, {
        ...settings,
        updatedAt: Date.now(),
      });
    } else {
      await setDoc(docRef, {
        id: 'global',
        upiId: settings.upiId || '',
        setupFeeAmount: settings.setupFeeAmount || 4999,
        monthlyFeePerTable: settings.monthlyFeePerTable || 199,
        globalNotice: settings.globalNotice || '',
        noticeActive: settings.noticeActive || false,
        maintenanceMode: settings.maintenanceMode || false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return getAdminSettings();
  } catch (error) {
    console.error('[v0] Error updating admin settings:', error);
    throw error;
  }
};

// Get days remaining until payment is due
export const getDaysRemainingUntilDue = async (cafeId: string): Promise<number | null> => {
  const cafe = await getCafe(cafeId);
  if (!cafe) return null;
  if (cafe.setupFeeStatus !== 'paid') return null;

  const now = Date.now();
  const dueDate = cafe.nextMonthlyPaymentDueDate || Date.now();

  const msPerDay = 24 * 60 * 60 * 1000;
  const daysRemaining = Math.ceil((dueDate - now) / msPerDay);

  return daysRemaining > 0 ? daysRemaining : null;
};

// Calculate upgrade cost based on remaining days and tables added
export const calculateUpgradeCost = (
  tablesAdded: number,
  daysRemaining: number,
  monthlyFeePerTable: number
): number => {
  // Cost = (daysRemaining / 30) * monthlyFeePerTable * tablesAdded
  const proratedCost = (daysRemaining / 30) * monthlyFeePerTable * tablesAdded;
  return Math.ceil(proratedCost); // Round up to nearest rupee
};

// Record table upgrade payment
export const recordTableUpgradePayment = async (
  cafeId: string,
  oldTableCount: number,
  newTableCount: number,
  daysRemaining: number,
  monthlyFeePerTable: number
) => {
  const cafe = await getCafe(cafeId);
  if (!cafe) throw new Error('Cafe not found');

  const tablesAdded = newTableCount - oldTableCount;
  if (tablesAdded <= 0) throw new Error('New table count must be greater than current count');

  const amount = calculateUpgradeCost(tablesAdded, daysRemaining, monthlyFeePerTable);
  const paymentId = generatePaymentId();
  const paymentRef = doc(collection(db, 'table_upgrade_payments'));

  const upgradePayment: TableUpgradePayment = {
    id: paymentRef.id,
    cafeId,
    paymentId,
    oldTableCount,
    newTableCount,
    tablesAdded,
    amount,
    daysRemaining,
    status: 'pending',
    paidDate: Date.now(),
    notes: 'Awaiting admin verification',
  };

  await setDoc(paymentRef, upgradePayment);

  return upgradePayment;
};

// Verify table upgrade payment
export const verifyTableUpgradePayment = async (
  cafeId: string,
  paymentId: string,
  adminId: string,
  approved: boolean,
  adminPassword?: string
) => {
  // Call the new secure API route
  const response = await fetch('/api/admin/payments/verify-upgrade', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      cafeId,
      paymentId,
      adminId,
      approved,
      adminPassword,
    }),
  });

  if (!response.ok) {
    console.error('Failed to process verification:', await response.text());
    return false;
  }

  const result = await response.json();
  return result.approved;
};

// Get table upgrade payments for a cafe
export const getTableUpgradePayments = async (cafeId: string) => {
  const q = query(collection(db, 'table_upgrade_payments'), where('cafeId', '==', cafeId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data() as TableUpgradePayment);
};

// Get pending table upgrade payments for a cafe
export const getPendingTableUpgradePayments = async (cafeId: string) => {
  const payments = await getTableUpgradePayments(cafeId);
  return payments.filter((p) => p.status === 'pending');
};

// Record table downgrade (no payment required)
export const recordTableDowngrade = async (
  cafeId: string,
  oldTableCount: number,
  newTableCount: number
) => {
  const cafe = await getCafe(cafeId);
  if (!cafe) throw new Error('Cafe not found');

  const tablesRemoved = oldTableCount - newTableCount;
  if (tablesRemoved <= 0) throw new Error('New table count must be less than current count');

  const paymentRef = doc(collection(db, 'table_upgrade_payments'));
  const downgradePayment: TableUpgradePayment = {
    id: paymentRef.id,
    cafeId,
    paymentId: generatePaymentId(),
    oldTableCount,
    newTableCount,
    tablesAdded: -tablesRemoved, // Negative to indicate removal
    amount: 0, // No charge for downgrade
    daysRemaining: 0,
    status: 'paid', // Auto-approved, no payment needed
    paidDate: Date.now(),
    verifiedAt: Date.now(),
    notes: 'Table downgrade - no payment required',
  };

  await setDoc(paymentRef, downgradePayment);

  // Update table count immediately
  await updateCafe(cafeId, {
    tables: newTableCount,
  });

  return downgradePayment;
};

// Generate unique payment ID
const generatePaymentId = (): string => {
  return `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
};

// REALTIME LISTENERS
export function subscribeToAdminSettings(callback: (settings: AdminSettings | null) => void) {
  const docRef = doc(db, 'adminSettings', 'global');
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...docSnap.data() } as AdminSettings);
    } else {
      callback(null);
    }
  });
}

export function subscribeToCafeByEmail(email: string, callback: (cafe: Cafe | null) => void) {
  const q = query(collection(db, 'cafes'), where('email', '==', email));
  return onSnapshot(q, (querySnapshot) => {
    if (!querySnapshot.empty) {
      const docSnap = querySnapshot.docs[0];
      callback({ id: docSnap.id, ...docSnap.data() } as Cafe);
    } else {
      callback(null);
    }
  });
}

// Subscribe to all cafes (useful for admin dashboards needing realtime updates)
export function subscribeToAllCafes(callback: (cafes: Cafe[]) => void) {
  const cafesRef = collection(db, 'cafes');
  return onSnapshot(cafesRef, (querySnapshot) => {
    const cafes = querySnapshot.docs.map((docSnap) => ({ ...(docSnap.data() as Cafe), id: docSnap.id }));
    callback(cafes);
  });
}

// Global listeners for Admin Dashboard (Issue 1)
export function subscribeToSystemPendingSubscriptionPayments(callback: (payments: SubscriptionPayment[]) => void) {
  const q = query(collection(db, 'subscription_payments'), where('status', '==', 'pending'));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => doc.data() as SubscriptionPayment));
  });
}

export function subscribeToSystemPendingUpgradePayments(callback: (payments: TableUpgradePayment[]) => void) {
  const q = query(collection(db, 'table_upgrade_payments'), where('status', '==', 'pending'));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => doc.data() as TableUpgradePayment));
  });
}
export const enforceOverdueSuspensions = async (adminPassword?: string) => {
  try {
    const response = await fetch('/api/admin/enforce-suspensions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ adminPassword }),
    });

    if (!response.ok) {
      console.error('Failed to run overdue enforcement:', await response.text());
      return;
    }

    const result = await response.json();
    console.log(`[Overdue Enforcement] Processed ${result.processed} cafes, suspended ${result.suspended}.`);
  } catch (error) {
    console.error('[v0] Error running overdue enforcement:', error);
  }
};

// Popup operations
export const createAdminPopup = async (popupData: Omit<AdminPopup, 'id'>) => {
  const popupRef = doc(collection(db, 'admin_popups'));
  const popup: AdminPopup = {
    ...popupData,
    id: popupRef.id,
  };
  await setDoc(popupRef, popup);
  return popup;
};

export const getAdminPopup = async (popupId: string): Promise<AdminPopup | null> => {
  const docSnap = await getDoc(doc(db, 'admin_popups', popupId));
  return docSnap.exists() ? ({ id: docSnap.id, ...docSnap.data() } as AdminPopup) : null;
};

export const getAllAdminPopups = async (): Promise<AdminPopup[]> => {
  const querySnapshot = await getDocs(query(collection(db, 'admin_popups'), where('status', '!=', 'archived')));
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as AdminPopup));
};

export const updateAdminPopup = async (popupId: string, updates: Partial<AdminPopup>) => {
  await updateDoc(doc(db, 'admin_popups', popupId), { ...updates, updatedAt: Date.now() });
};

export const deleteAdminPopup = async (popupId: string) => {
  await updateDoc(doc(db, 'admin_popups', popupId), { status: 'archived', updatedAt: Date.now() });
};

export const getCafePopups = async (cafeId: string): Promise<AdminPopup[]> => {
  const allPopups = await getAllAdminPopups();
  const filteredByTarget = allPopups.filter(popup =>
    popup.targetCafes === 'all' || (popup.cafeIds && popup.cafeIds.includes(cafeId))
  );

  // Filter out popups where cafe has already agreed or dismissed
  const q = query(collection(db, 'cafe_popups'), where('cafeId', '==', cafeId));
  const querySnapshot = await getDocs(q);
  const cafeResponses = querySnapshot.docs.map(doc => doc.data() as CafePopup);

  // Only return popups that the cafe hasn't agreed to yet
  return filteredByTarget.filter(popup =>
    !cafeResponses.find(response => response.popupId === popup.id && response.agreedToTerms === true)
  );
};

export const getCafePopupResponses = async (popupId: string) => {
  const q = query(collection(db, 'cafe_popups'), where('popupId', '==', popupId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data() as CafePopup);
};

export const saveCafePopupResponse = async (cafeId: string, popupId: string, response: any) => {
  const docRef = doc(collection(db, 'cafe_popups'));
  const cafePopup: CafePopup = {
    id: docRef.id,
    popupId,
    cafeId,
    dismissed: response.agreedToTerms ? false : true,
    agreedToTerms: response.agreedToTerms,
    formResponse: response.formData,
    createdAt: Date.now(),
    ...(response.agreedToTerms && { agreedAt: Date.now() }),
    ...(!response.agreedToTerms && { dismissedAt: Date.now() }),
  };
  await setDoc(docRef, cafePopup);
  return cafePopup;
};

export const dismissCafePopup = async (cafeId: string, popupId: string) => {
  const q = query(collection(db, 'cafe_popups'), where('cafeId', '==', cafeId), where('popupId', '==', popupId));
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    const docId = querySnapshot.docs[0].id;
    await updateDoc(doc(db, 'cafe_popups', docId), { dismissed: true, dismissedAt: Date.now() });
  } else {
    // Create a new record if it doesn't exist
    const docRef = doc(collection(db, 'cafe_popups'));
    const cafePopup: CafePopup = {
      id: docRef.id,
      popupId,
      cafeId,
      dismissed: true,
      dismissedAt: Date.now(),
      agreedToTerms: false,
      createdAt: Date.now(),
    };
    await setDoc(docRef, cafePopup);
  }
};
