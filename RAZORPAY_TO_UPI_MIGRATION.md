# Migration from Razorpay to UPI Payment System

This document outlines the changes made to migrate from Razorpay to a custom UPI-based payment system.

## What Changed

### Removed Files
- `/lib/razorpay.ts` - Razorpay client-side integration
- `/app/actions/payment.ts` - Razorpay server-side actions

### New Files Added
- `/lib/upi.ts` - UPI utilities and deep-link generation
- `/app/[cafeSlug]/upi-payment/page.tsx` - UPI payment confirmation page
- `/app/[cafeSlug]/upi-payment/loading.tsx` - Loading boundary
- `/components/UPISettings.tsx` - Cafe owner UPI settings component
- `/.env.example` - Updated environment variables
- `/UPI_PAYMENT_GUIDE.md` - Complete UPI payment documentation
- `/RAZORPAY_TO_UPI_MIGRATION.md` - This file

### Updated Files
- `/lib/db.ts` - Added `upiId` and `upiQrCode` fields to Cafe interface
- `/app/[cafeSlug]/checkout/page.tsx` - Replaced Razorpay logic with UPI flow
- `/app/[cafeSlug]/order-confirmation/page.tsx` - Added payment status displays
- `/README.md` - Updated tech stack and setup instructions

## Key Differences

### Razorpay Flow (Old)
```
Customer Checkout → Razorpay Gateway → Payment Verification (Automatic) → Order Confirmed
```

### UPI Flow (New)
```
Customer Checkout → UPI App (Customer's Device) → Manual Verification → Order Confirmed
```

## Why This Change is Better

### For Cafe Owners
- **No Third-Party Fees**: No commission on UPI transactions (only platform subscription)
- **Direct Payments**: Money goes directly to your bank account
- **Full Control**: No API key management or gateway setup needed
- **Simpler Setup**: Just provide your UPI ID

### For Customers
- **More Options**: Works with any UPI app they prefer (Google Pay, PhonePe, Paytm, etc.)
- **Lower Friction**: Direct UPI payment without gateway redirect
- **Familiar Process**: Native UPI experience they're already using

### Technical Benefits
- **No External Dependencies**: Removes Razorpay API dependency
- **Lower Cost**: No payment gateway fees
- **Simpler Code**: Less complexity in payment handling
- **Better Privacy**: Direct peer-to-peer transaction

## Database Changes

### Cafe Collection Updates

Added two new optional fields:

```typescript
interface Cafe {
  // ... existing fields
  upiId?: string;        // e.g., "user@paytm"
  upiQrCode?: string;    // Base64 encoded QR code image
}
```

### Migration for Existing Data

If you have existing cafes in Firestore:
1. The new fields are optional, so no immediate action needed
2. Existing cafes will work with pay-at-counter only
3. Cafe owners can add UPI details anytime through settings

## Order Schema Changes

No breaking changes to Order schema. Added support for:
- Payment status: `pending` (for UPI verification) and `paid` (for counter orders)
- Payment method: `online` (UPI) or `counter`

## Environment Variables

### Removed Variables
```
NEXT_PUBLIC_RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
```

### Current Variables
```
# Firebase (unchanged)
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID

# App Configuration (unchanged)
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_MAIN_DOMAIN

# Admin (unchanged)
NEXT_PUBLIC_ADMIN_PASSWORD
```

See `.env.example` for current required variables.

## Payment Verification Flow

### Old (Razorpay)
1. Customer completes payment on Razorpay gateway
2. Razorpay sends webhook to server
3. Server verifies signature
4. Order automatically marked as paid
5. Cafe receives notification

### New (UPI)
1. Customer initiates UPI payment in their app
2. Customer completes payment
3. Customer returns to app and clicks "I Have Made the Payment"
4. Order sent to cafe with payment pending status
5. Cafe staff manually verifies payment in their bank account
6. Cafe staff confirms payment in dashboard
7. Order status updated

## Rollout Steps

If deploying to existing system:

1. **Backup Database**: Export Firestore data before deploying
2. **Deploy New Code**: Push changes to production
3. **Notify Users**: Email cafe owners about new UPI feature
4. **Gradual Rollout**: 
   - First week: UPI and pay-at-counter both available
   - Continue supporting both indefinitely
5. **Monitor**: Watch for payment issues, collect feedback

## Future Enhancements

Possible additions to UPI system:
- Automatic payment verification through banking API integration
- Bulk payment reports and settlement
- Multiple UPI IDs per cafe
- Payment reminder notifications
- Advanced analytics on payment methods

## Support & Troubleshooting

### Common Issues

**Q: Customer says payment was sent but we don't see it?**
A: Check bank account directly. Have customer provide transaction reference (order ID).

**Q: QR code generation fails?**
A: Verify UPI ID format. Check internet connection. Try regenerating.

**Q: Payment app not opening from link?**
A: Ensure customer has UPI app installed. Try manual entry instead.

## Rollback (If Needed)

To rollback to Razorpay:
1. Restore `/lib/razorpay.ts` and `/app/actions/payment.ts` from git history
2. Update checkout page imports
3. Redeploy
4. Note: Customers can still use pay-at-counter during rollback

## Questions?

Refer to `/UPI_PAYMENT_GUIDE.md` for detailed UPI payment documentation.
