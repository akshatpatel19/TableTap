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
  createdAt: number;
  updatedAt: number;
}

export interface AdminSettings {
  id: string;
  upiId: string; // Admin's UPI ID for receiving payments
  setupFeeAmount: number; // 4999
  monthlyFeePerTable: number; // 199
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
        status: approved ? 'paid' : 'rejected',
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
        status: approved ? 'paid' : 'rejected',
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

// Generate unique payment ID
const generatePaymentId = (): string => {
  return `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
};
