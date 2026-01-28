# TableTap - QR Code Menu Ordering System

A modern, fast, and fully responsive QR code-based menu ordering system for cafes built with Next.js, Firebase, and Tailwind CSS.

## Features

### Customer Features
- **QR Code Scanning**: Unique QR code for each table
- **Menu Browsing**: Beautiful, mobile-optimized menu display
- **Order Management**: Add/remove items, customize quantities
- **Payment Options**: Pay at counter or online via UPI (Google Pay, PhonePe, Paytm)
- **Order Tracking**: Real-time order status updates

### Cafe Owner Features
- **Dashboard**: Overview of all operations
- **Subscription Management**: Choose from Basic, Standard, Premium plans
- **Menu Management**: Add, edit, delete menu items
- **Order Management**: Track and manage all orders
- **Staff Access**: Manage kitchen and counter staff

### Staff Features (Kitchen/Counter)
- **Order Dashboard**: Real-time order notifications
- **Order Status Updates**: Move orders through preparation pipeline
- **Menu Management**: Update item availability and pricing
- **Order Analytics**: View order statistics

### Admin Features (Developer)
- **Platform Analytics**: Track all cafes and revenue
- **Cafe Management**: Monitor all connected cafes
- **Subscription Tracking**: Manage cafe subscriptions
- **Performance Monitoring**: System load and metrics

## Tech Stack

- **Frontend**: Next.js 16 with React 19
- **Database**: Firebase Realtime Database
- **Authentication**: Firebase Auth
- **Styling**: Tailwind CSS v4
- **Payments**: UPI (No third-party payment gateway needed)
- **Hosting**: Optimized for Vercel

## Prerequisites

Before you begin, ensure you have:
- Node.js 18+ installed
- Firebase project created
- GitHub account (for deployment)
- UPI ID (cafe owners will provide their own for payment collection)

## Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_MAIN_DOMAIN=tabletap.com

# Admin Configuration
NEXT_PUBLIC_ADMIN_PASSWORD=admin123
```

## Installation

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd tabletap
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Set Up Firebase

1. Create a Firebase project at [firebase.google.com](https://firebase.google.com)
2. Enable Authentication (Email/Password)
3. Create a Realtime Database
4. Copy your Firebase config to `.env`

### 4. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
tabletap/
├── app/
│   ├── page.tsx                 # Landing page
│   ├── [cafeSlug]/
│   │   ├── menu/               # Customer menu
│   │   ├── checkout/           # Checkout page
│   │   ├── order-confirmation/ # Order confirmation
│   │   ├── staff/
│   │   │   ├── login/          # Staff login
│   │   │   └── dashboard/      # Staff dashboard
│   │   └── owner/
│   │       ├── menu-setup/     # Menu setup
│   │       └── settings/       # Cafe settings
│   ├── owner/
│   │   ├── register/           # Owner registration
│   │   ├── login/              # Owner login
│   │   └── dashboard/          # Owner dashboard
│   └── admin/
│       ├── login/              # Admin login
│       └── dashboard/          # Admin dashboard
├── components/
│   ├── MenuCard.tsx            # Menu item card
│   ├── OrderCart.tsx           # Shopping cart
│   ├── StaffOrdersView.tsx     # Staff order view
│   ├── MenuManagement.tsx      # Menu management
│   ├── SubscriptionPlans.tsx   # Subscription plans
│   └── ui/                     # Shadcn components
├── lib/
│   ├── firebase.ts             # Firebase config
│   ├── db.ts                   # Database operations
│   ├── razorpay.ts             # Razorpay integration
│   └── context/                # React contexts
├── .env.example                # Environment variables template
└── README.md                   # This file
```

## Database Schema

### Collections

#### `cafes`
- `id`: string (unique identifier)
- `name`: string
- `slug`: string (URL-friendly name)
- `email`: string
- `phone`: string
- `address`: string
- `tables`: number
- `subscriptionPlan`: 'basic' | 'standard' | 'premium'
- `subscriptionStartDate`: number (timestamp)
- `subscriptionEndDate`: number (timestamp)
- `isActive`: boolean
- `createdAt`: number (timestamp)
- `updatedAt`: number (timestamp)

#### `menuItems`
- `id`: string
- `cafeId`: string (foreign key)
- `name`: string
- `description`: string
- `price`: number
- `category`: string
- `isAvailable`: boolean
- `image`: string (optional)
- `createdAt`: number
- `updatedAt`: number

#### `orders`
- `id`: string
- `cafeId`: string (foreign key)
- `tableId`: number
- `items`: Array of {menuItemId, name, quantity, price}
- `totalAmount`: number
- `status`: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served'
- `paymentStatus`: 'pending' | 'paid' | 'failed'
- `paymentMethod`: 'online' | 'counter'
- `notes`: string (optional)
- `createdAt`: number
- `updatedAt`: number

#### `subscriptions`
- `id`: string
- `cafeId`: string (foreign key)
- `plan`: 'basic' | 'standard' | 'premium'
- `tablesIncluded`: number
- `monthlyCost`: number
- `startDate`: number
- `endDate`: number
- `isActive`: boolean
- `autoRenew`: boolean
- `createdAt`: number
- `updatedAt`: number

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Connect your GitHub repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

```bash
vercel deploy
```

### Subdomain Configuration

For subdomain routing (e.g., `abc-cafe.tabletap.com`), configure your domain provider:

1. Add wildcard DNS record: `*.tabletap.com` → Vercel
2. Update `NEXT_PUBLIC_MAIN_DOMAIN` in environment variables
3. Configure middleware for subdomain handling (if needed)

## Usage

### For Cafe Owners

1. Visit `/owner/register` to create an account
2. Choose a subscription plan
3. Set up your menu items
4. Generate QR codes for each table
5. Start receiving orders!

### For Customers

1. Scan QR code at table
2. Browse menu by category
3. Add items to cart
4. Proceed to checkout
5. Pay online or at counter
6. Track order status

### For Staff

1. Visit `/{cafe-slug}/staff/login`
2. Enter access code
3. View incoming orders
4. Update order status
5. Manage menu availability

### For Admin

1. Visit `/admin/login`
2. Enter admin password (default: `admin123`)
3. View platform analytics
4. Monitor all connected cafes
5. Track revenue and metrics

## Security Considerations

1. **Authentication**: Uses Firebase Auth for secure user management
2. **Passwords**: Change default admin password immediately in production
3. **API Keys**: Store Razorpay keys securely in environment variables
4. **Data Validation**: All inputs are validated on both client and server
5. **CORS**: Configure appropriate CORS policies for your domain

## Performance Optimization

- **Image Optimization**: Next.js Image component for automatic optimization
- **Code Splitting**: Automatic code splitting by Next.js
- **Caching**: Firebase caching strategies
- **Real-time Updates**: Firebase listeners for instant updates
- **Mobile First**: Responsive design optimized for all devices

## Common Issues & Solutions

### Firebase Connection Error
- Verify Firebase configuration in `.env`
- Check Firebase project is active
- Ensure Realtime Database is enabled

### Razorpay Payment Failed
- Verify Razorpay API keys in `.env`
- Check Razorpay account is live mode
- Ensure correct payment amount format

### Subdomain Routing Not Working
- Check DNS records are configured correctly
- Verify `NEXT_PUBLIC_MAIN_DOMAIN` matches domain
- Clear browser cache

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - feel free to use for your projects

## Support

For support, email support@tabletap.com or open an issue on GitHub.

## Future Enhancements

- [ ] WhatsApp integration for orders
- [ ] SMS notifications
- [ ] Loyalty program
- [ ] Customer reviews and ratings
- [ ] Multi-language support
- [ ] Advanced analytics dashboard
- [ ] AI-powered recommendations
- [ ] Inventory management
- [ ] Employee management system
- [ ] Custom branding for Premium tier

---

Built with ❤️ for cafe owners and their customers
