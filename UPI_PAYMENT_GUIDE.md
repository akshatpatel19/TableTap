# UPI Payment System Guide

## Overview

TableTap uses a UPI-based payment system that allows cafe owners to collect payments directly through UPI without needing a third-party payment gateway like Razorpay.

## How It Works

### For Customers

1. **Browse Menu**: Customer scans QR code at their table and browses the menu
2. **Place Order**: Add items to cart and proceed to checkout
3. **Choose Payment Method**:
   - **Pay at Counter**: Pay when order is ready (no online payment)
   - **Pay via UPI**: Initiate payment through UPI app
4. **UPI Payment Flow**:
   - Click "Open UPI App" button
   - Select preferred UPI app (Google Pay, PhonePe, Paytm, etc.)
   - Send payment to cafe's UPI ID
   - Return to app and click "I Have Made the Payment"
5. **Order Confirmation**: Order is sent to kitchen while payment is pending verification
6. **Verification**: Cafe staff verifies the payment manually and confirms the order

### For Cafe Owners

1. **Setup UPI Details**:
   - Go to Cafe Owner Dashboard
   - Navigate to UPI Settings
   - Enter your UPI ID (e.g., `yourname@paytm` or `mobilenumber@okhdfcbank`)
   - Generate QR code (optional but recommended)
   - Save settings

2. **Monitor Orders**:
   - View incoming orders in Staff Dashboard
   - See payment method and payment status
   - Manually verify UPI payments received in your bank account
   - Update order status as needed

## UPI ID Formats

Valid UPI ID formats:
- `username@upi` (e.g., `john@upi`)
- `username@bankname` (e.g., `owner@okhdfcbank`, `merchant@ybl`)
- `mobilenumber@bankname` (e.g., `9876543210@paytm`)

Common UPI providers:
- `@upi` - Google Pay
- `@okhdfcbank` - HDFC Bank
- `@ybl` - Paytm
- `@ibl` - ICICI Bank
- `@okaxis` - Axis Bank
- `@okdfc` - DFC Bank
- `@airtel` - Airtel Payments Bank

## QR Code

The system automatically generates a QR code from your UPI ID. This QR code can be:
- Displayed on your menu/table
- Printed and placed at checkout
- Shared digitally with customers

## Payment Flow Details

### Customer Journey

```
Menu → Checkout → Select UPI Payment
    ↓
    → Enter Details (Email, Phone)
    ↓
    → Review Order
    ↓
    → Click "Open UPI App"
    ↓
    → UPI App Opens
    ↓
    → Customer Completes Payment
    ↓
    → Return to App
    ↓
    → Click "I Have Made the Payment"
    ↓
    → Order Sent to Kitchen (Payment Pending)
    ↓
    → Cafe Verifies Payment
    ↓
    → Order Confirmation
```

### Payment Statuses

- **Paid**: Payment received and verified (Pay at Counter orders)
- **Pending**: Awaiting manual verification (Online UPI payments)
- **Failed**: Payment not received

### Order Statuses

- **Pending**: Order received, awaiting payment verification
- **Confirmed**: Payment verified, order sent to kitchen
- **Preparing**: Kitchen is preparing the order
- **Ready**: Order ready for pickup
- **Served**: Order delivered to customer

## Security

### For Customers
- No sensitive payment information is stored
- UPI transactions are secure and encrypted
- Direct payment to cafe owner's UPI ID
- No intermediary handling payments

### For Cafe Owners
- Payments go directly to your UPI-registered bank account
- Manual verification prevents fraud
- Order receipt stored in system
- Transaction reference saved in order details

## Troubleshooting

### UPI App Not Opening

1. Ensure you have at least one UPI app installed (Google Pay, PhonePe, Paytm)
2. Check if UPI deep linking is enabled on your device
3. Try manually entering the UPI ID in your app

### QR Code Not Generating

1. Verify UPI ID format is correct
2. Check internet connection
3. Clear browser cache and try again
4. Use a valid UPI ID format

### Payment Not Verified

1. Check if payment actually reached the cafe's bank account
2. Verify the transaction reference matches the order ID
3. Update order manually if needed (admin function)

## Best Practices for Cafe Owners

1. **Clear Signage**: Display QR codes prominently on tables and at checkout
2. **Regular Verification**: Check payments regularly to avoid delays
3. **Customer Communication**: Inform customers about payment verification time
4. **Backup Plans**: Keep cash payment option available
5. **Record Keeping**: Maintain records of verified UPI payments

## FAQ

**Q: Does TableTap take a commission on UPI payments?**
A: No. Payments go directly to cafe owners. We only charge subscription fees for platform access.

**Q: What if customer says they paid but didn't?**
A: Check your bank account and order records. UPI payments have transaction IDs that can be verified.

**Q: Can multiple UPI IDs be configured?**
A: Currently, one UPI ID per cafe. Contact support for multiple IDs per manager.

**Q: Is there a transaction limit for UPI?**
A: UPI limits are set by your bank. Most banks allow ₹100,000+ per transaction.

**Q: What happens if customer closes app without confirming payment?**
A: Order remains in "pending" status. Customer can complete confirmation anytime. Cafe can manually verify from bank records.
