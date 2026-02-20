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
  onSnapshot
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
  categories?: string[]; // Custom categories created by cafe owner
  // Subscription payment tracking
  setupFeeStatus: 'pending' | 'paid' | 'rejected'; // Setup fee payment status
  setupFeeAmount: number; // 4999 rupees
  setupFeeVerifiedAt?: number; // When admin verified payment
  setupFeePaymentId?: string; // Unique payment ID for setup fee
  lastMonthlyPaymentDate?: number; // When last monthly subscription was paid
  nextMonthlyPaymentDueDate?: number; // When next monthly payment is due
  monthlySubscriptionAmount: number; // Per table per month (199 * number of tables)
  subscriptionPayments: Array<{
    id: string;
    paymentId: string; // Unique payment ID
    type: 'setup' | 'monthly';
    amount: number;
    dueDate: number;
    paidDate?: number;
    status: 'pending' | 'paid' | 'overdue' | 'rejected';
    verifiedBy?: string; // Admin ID who verified
    verifiedAt?: number;
    notes?: string;
  }>;
  tableUpgradePayments?: Array<{
    id: string;
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
  }>;
  upcomingPaymentEmailSentAt?: number | null;
  overduePaymentEmailSentAt?: number | null;
  suspensionWarningEmailSentAt?: number | null;
  createdAt: number;
  updatedAt: number;
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

export interface MenuItem {
  id: string;
  cafeId: string;
  name: string;
  description: string;
  price: number;
  isAvailable: boolean;
  category: string;
  image?: string;
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
    price: number;
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

// Cafe operations
export const createCafe = async (cafeData: Omit<Cafe, 'id' | 'createdAt' | 'updatedAt'>) => {
  const cafeRef = doc(collection(db, 'cafes'));
  const creationTime = Date.now();
  // const nextPaymentDueDate = creationTime + 30 * 24 * 60 * 60 * 1000; // 30 days from creation
  const nextPaymentDueDate = creationTime; // 30 days from creation

  const cafe: Cafe = {
    ...cafeData,
    id: cafeRef.id,
    setupFeeStatus: 'pending',
    setupFeeAmount: 4999,
    monthlySubscriptionAmount: (cafeData.tables || 5) * 199,
    subscriptionPayments: [],
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
  return menuItem;
};

export const getMenuItems = async (cafeId: string) => {
  const q = query(collection(db, 'menuItems'), where('cafeId', '==', cafeId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => doc.data() as MenuItem);
};

export const updateMenuItem = async (menuItemId: string, updates: Partial<MenuItem>) => {
  const menuRef = doc(db, 'menuItems', menuItemId);
  await updateDoc(menuRef, { ...updates, updatedAt: Date.now() });
};

export const deleteMenuItem = async (menuItemId: string) => {
  const menuRef = doc(db, 'menuItems', menuItemId);
  await deleteDoc(menuRef);
};

// Order operations
export const createOrder = async (orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => {
  const orderRef = doc(collection(db, 'orders'));
  const order: Order = {
    ...orderData,
    id: orderRef.id,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await setDoc(orderRef, order);
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
  await updateDoc(orderRef, { ...updates, updatedAt: Date.now() });
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
  const setupPayment = {
    id: `setup-${Date.now()}`,
    paymentId,
    type: 'setup' as const,
    amount: 4999,
    dueDate: cafe.createdAt,
    paidDate: Date.now(),
    status: 'pending' as const,
    notes: 'Awaiting admin verification',
  };

  const updatedPayments = [...(cafe.subscriptionPayments || []), setupPayment];
  await updateCafe(cafeId, {
    subscriptionPayments: updatedPayments,
    setupFeeStatus: 'pending',
    setupFeePaymentId: paymentId,
  });

  return setupPayment;
};

export const verifySetupFeePayment = async (cafeId: string, adminId: string, approved: boolean) => {
  const cafe = await getCafe(cafeId);
  if (!cafe) throw new Error('Cafe not found');

  const verificationTime = Date.now(); // Capture verification time

  const updatedPayments = cafe.subscriptionPayments.map((payment) => {
    if (payment.type === 'setup' && payment.status === 'pending') {
      return {
        ...payment,
        status: (approved ? 'paid' : 'rejected') as 'paid' | 'rejected',
        verifiedBy: adminId,
        verifiedAt: verificationTime,
      };
    }
    return payment;
  });

  // Payment dates are set at account creation and should not change during verification
  // Only update status and verification timestamp
  await updateCafe(cafeId, {
    subscriptionPayments: updatedPayments,
    setupFeeStatus: approved ? 'paid' : 'rejected',
    setupFeeVerifiedAt: approved ? verificationTime : undefined,
  });

  return approved;
};

export const recordMonthlyPayment = async (cafeId: string) => {
  const cafe = await getCafe(cafeId);
  if (!cafe) throw new Error('Cafe not found');

  const monthlyAmount = cafe.tables * 199;
  const paymentId = generatePaymentId();
  const monthlyPayment = {
    id: `monthly-${Date.now()}`,
    paymentId,
    type: 'monthly' as const,
    amount: monthlyAmount,
    dueDate: cafe.nextMonthlyPaymentDueDate || Date.now(),
    paidDate: Date.now(),
    status: 'pending' as const,
    notes: 'Awaiting admin verification',
  };

  const updatedPayments = [...(cafe.subscriptionPayments || []), monthlyPayment];
  await updateCafe(cafeId, {
    subscriptionPayments: updatedPayments,
  });

  return monthlyPayment;
};

export const verifyMonthlyPayment = async (cafeId: string, paymentId: string, adminId: string, approved: boolean) => {
  const cafe = await getCafe(cafeId);
  if (!cafe) throw new Error('Cafe not found');

  const verificationTime = Date.now(); // Capture verification time

  const updatedPayments = cafe.subscriptionPayments.map((payment) => {
    if (payment.id === paymentId) {
      return {
        ...payment,
        status: (approved ? 'paid' : 'rejected') as 'paid' | 'rejected',
        verifiedBy: adminId,
        verifiedAt: verificationTime,
      };
    }
    return payment;
  });

  // Payment dates are set at account creation and rolled forward each payment cycle
  // When payment is approved, advance the next payment date by 30 days
  const nextMonthlyDue = approved
    ? (cafe.nextMonthlyPaymentDueDate || Date.now()) + 30 * 24 * 60 * 60 * 1000
    : cafe.nextMonthlyPaymentDueDate;

  await updateCafe(cafeId, {
    subscriptionPayments: updatedPayments,
    nextMonthlyPaymentDueDate: nextMonthlyDue,
    upcomingPaymentEmailSentAt: null,
    overduePaymentEmailSentAt: null,
    suspensionWarningEmailSentAt: null,
  });

  return approved;
};

export const getPendingPayments = async (cafeId: string) => {
  const cafe = await getCafe(cafeId);
  if (!cafe) return { setupFee: null, monthlyPayment: null };

  const setupFee = cafe.subscriptionPayments?.find((p) => p.type === 'setup' && p.status === 'pending');
  const monthlyPayment = cafe.subscriptionPayments?.find(
    (p) => p.type === 'monthly' && p.status === 'pending' && Date.now() >= p.dueDate
  );

  return { setupFee, monthlyPayment };
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

  const upgradePayment = {
    id: `upgrade-${Date.now()}`,
    paymentId,
    oldTableCount,
    newTableCount,
    tablesAdded,
    amount,
    daysRemaining,
    status: 'pending' as const,
    paidDate: Date.now(),
    notes: 'Awaiting admin verification',
  };

  const updatedUpgradePayments = [...(cafe.tableUpgradePayments || []), upgradePayment];
  await updateCafe(cafeId, {
    tableUpgradePayments: updatedUpgradePayments,
  });

  return upgradePayment;
};

// Verify table upgrade payment
export const verifyTableUpgradePayment = async (
  cafeId: string,
  paymentId: string,
  adminId: string,
  approved: boolean
) => {
  const cafe = await getCafe(cafeId);
  if (!cafe) throw new Error('Cafe not found');

  const upgradePayment = cafe.tableUpgradePayments?.find((p) => p.paymentId === paymentId);
  if (!upgradePayment) throw new Error('Payment not found');

  const verificationTime = Date.now();

  const updatedUpgradePayments = (cafe.tableUpgradePayments || []).map((payment) => {
    if (payment.paymentId === paymentId) {
      return {
        ...payment,
        status: (approved ? 'paid' : 'rejected') as 'paid' | 'rejected',
        verifiedBy: adminId,
        verifiedAt: verificationTime,
      };
    }
    return payment;
  });

  // If approved, update the cafe's table count
  if (approved) {
    await updateCafe(cafeId, {
      tableUpgradePayments: updatedUpgradePayments,
      tables: upgradePayment.newTableCount,
    });
  } else {
    await updateCafe(cafeId, {
      tableUpgradePayments: updatedUpgradePayments,
    });
  }

  return approved;
};

// Get table upgrade payments for a cafe
export const getTableUpgradePayments = async (cafeId: string) => {
  const cafe = await getCafe(cafeId);
  if (!cafe) return [];
  return cafe.tableUpgradePayments || [];
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

  const downgradePayment = {
    id: `downgrade-${Date.now()}`,
    paymentId: generatePaymentId(),
    oldTableCount,
    newTableCount,
    tablesAdded: -tablesRemoved, // Negative to indicate removal
    amount: 0, // No charge for downgrade
    daysRemaining: 0,
    status: 'paid' as const, // Auto-approved, no payment needed
    paidDate: Date.now(),
    verifiedAt: Date.now(),
    notes: 'Table downgrade - no payment required',
  };

  // Update table count immediately
  await updateCafe(cafeId, {
    tables: newTableCount,
    tableUpgradePayments: [...(cafe.tableUpgradePayments || []), downgradePayment],
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
    const cafes = querySnapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Cafe) } as Cafe));
    callback(cafes);
  });
}
// Enforce automatic suspensions for cafes overdue by more than 30 days
export const enforceOverdueSuspensions = async () => {
  try {
    const cafes = await getAllCafes();
    const now = Date.now();
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

    for (const cafe of cafes) {
      if (!cafe.isActive || cafe.setupFeeStatus !== 'paid') continue;

      const dueDate = cafe.nextMonthlyPaymentDueDate;
      if (!dueDate) continue;

      // 1. Upcoming Warning (3 days before due)
      if (now >= dueDate - THREE_DAYS_MS && now < dueDate && !cafe.upcomingPaymentEmailSentAt) {
        await fetch(`/api/admin/send-system-email`, {
          method: 'POST',
          body: JSON.stringify({ cafeName: cafe.name, cafeEmail: cafe.email, notificationType: 'upcoming' })
        }).catch(err => console.error(err));
        await updateCafe(cafe.id, { upcomingPaymentEmailSentAt: now });
      }

      // 2. Overdue Warning (Day 0)
      if (now >= dueDate && now < dueDate + THIRTY_DAYS_MS - THREE_DAYS_MS && !cafe.overduePaymentEmailSentAt) {
        await fetch(`/api/admin/send-system-email`, {
          method: 'POST',
          body: JSON.stringify({ cafeName: cafe.name, cafeEmail: cafe.email, notificationType: 'overdue' })
        }).catch(err => console.error(err));
        await updateCafe(cafe.id, { overduePaymentEmailSentAt: now });
      }

      // 3. Final Suspension Warning (Day 27 overdue, 3 days before block)
      if (now >= dueDate + THIRTY_DAYS_MS - THREE_DAYS_MS && now < dueDate + THIRTY_DAYS_MS && !cafe.suspensionWarningEmailSentAt) {
        await fetch(`/api/admin/send-system-email`, {
          method: 'POST',
          body: JSON.stringify({ cafeName: cafe.name, cafeEmail: cafe.email, notificationType: 'suspension_warning' })
        }).catch(err => console.error(err));
        await updateCafe(cafe.id, { suspensionWarningEmailSentAt: now });
      }

      // 4. Execution Block
      if (now >= dueDate + THIRTY_DAYS_MS) {
        await updateCafe(cafe.id, { isActive: false });
        console.log(`[Overdue Enforcement] Auto-suspended cafe ${cafe.id} for 30+ days overdue payment.`);
      }
    }
  } catch (error) {
    console.error('[v0] Error running overdue enforcement:', error);
  }
};
