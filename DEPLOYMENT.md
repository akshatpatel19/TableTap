# TableTap Deployment Guide

## Quick Start Checklist

Before deploying to production, ensure you've completed:

- [ ] Set up Firebase project
- [ ] Created Razorpay account
- [ ] Configured environment variables
- [ ] Tested all user flows locally
- [ ] Set admin password
- [ ] Configured DNS/domain settings

## Step-by-Step Deployment

### 1. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project: "TableTap"
3. Enable Realtime Database
4. Set database rules (see below)
5. Enable Email/Password authentication
6. Copy credentials to `.env`

#### Firebase Realtime Database Rules

```json
{
  "rules": {
    "cafes": {
      "$uid": {
        ".read": "$uid === auth.uid || root.child('admins').child(auth.uid).exists()",
        ".write": "$uid === auth.uid || root.child('admins').child(auth.uid).exists()"
      }
    },
    "menuItems": {
      ".read": true,
      ".write": "auth != null"
    },
    "orders": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "subscriptions": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

### 2. Razorpay Configuration

1. Sign up at [Razorpay](https://razorpay.com)
2. Go to Settings → API Keys
3. Copy Key ID and Key Secret
4. Add to `.env`:
   ```
   NEXT_PUBLIC_RAZORPAY_KEY_ID=your_key_id
   RAZORPAY_KEY_SECRET=your_key_secret
   ```

### 3. Domain & DNS Setup

#### For Subdomain Support (e.g., abc-cafe.tabletap.com)

1. Update your domain registrar DNS settings:
   ```
   Type: A Record
   Name: *.tabletap.com
   Value: Your Vercel IP (provided by Vercel)
   ```

2. Add to Vercel project settings:
   - Domain: `*.tabletap.com`
   - Root domain: `tabletap.com`

3. Update environment variable:
   ```
   NEXT_PUBLIC_MAIN_DOMAIN=tabletap.com
   ```

### 4. Deploy to Vercel

#### Option A: Using Vercel CLI

```bash
npm install -g vercel
vercel
# Follow the prompts
```

#### Option B: Using GitHub

1. Push code to GitHub
2. Go to [Vercel Dashboard](https://vercel.com/new)
3. Import your GitHub repository
4. Add environment variables in Settings
5. Deploy!

#### Environment Variables to Add

```
NEXT_PUBLIC_FIREBASE_API_KEY=xxxx
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=xxxx
NEXT_PUBLIC_FIREBASE_PROJECT_ID=xxxx
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=xxxx
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=xxxx
NEXT_PUBLIC_FIREBASE_APP_ID=xxxx
NEXT_PUBLIC_RAZORPAY_KEY_ID=xxxx
RAZORPAY_KEY_SECRET=xxxx
NEXT_PUBLIC_APP_URL=https://tabletap.com
NEXT_PUBLIC_MAIN_DOMAIN=tabletap.com
```

### 5. SSL/TLS Certificate

Vercel automatically provides SSL certificates for:
- Your main domain
- All subdomains (*.yourdomain.com)

No additional configuration needed!

## Post-Deployment Tasks

### 1. Change Admin Password

The default admin password is `admin123`. Change it immediately:

```bash
# Update in code or environment variable
NEXT_PUBLIC_ADMIN_PASSWORD=your_secure_password
```

### 2. Test All Features

- [ ] Customer ordering flow
- [ ] Staff dashboard
- [ ] Cafe owner dashboard
- [ ] Admin dashboard
- [ ] Razorpay payment
- [ ] QR code generation
- [ ] Order status updates

### 3. Set Up Monitoring

- Enable Vercel Analytics
- Set up error tracking (Sentry)
- Monitor Firebase usage
- Track Razorpay transactions

### 4. Backup Strategy

- Enable Firebase automatic backups
- Set up database export schedule
- Document backup procedures

## Troubleshooting

### Issue: Subdomain not routing correctly

**Solution:**
1. Verify DNS records are propagated (use `nslookup`)
2. Check Vercel domain settings
3. Clear browser cache
4. Test with different subdomain (test-cafe.tabletap.com)

### Issue: Firebase connection timeout

**Solution:**
1. Verify Firebase credentials in `.env`
2. Check Firebase project is active
3. Ensure database rules allow access
4. Test with Firebase Console

### Issue: Razorpay payment failing

**Solution:**
1. Verify API keys are in test/live mode correctly
2. Check payment amount format (in paise)
3. Test with Razorpay test card
4. Enable payment gateway in Razorpay settings

### Issue: QR codes not generating

**Solution:**
1. Verify `NEXT_PUBLIC_MAIN_DOMAIN` is correct
2. Test QR URL directly in browser
3. Check subdomain DNS is configured
4. Ensure cafe slug exists in database

## Performance Optimization Tips

1. **Image Optimization**: Images are auto-optimized by Next.js
2. **Caching**: Enable browser caching in Vercel settings
3. **Database Queries**: Use Firebase indexing for common queries
4. **Code Splitting**: Already configured in Next.js
5. **CDN**: Vercel automatically uses Edge CDN

## Security Checklist

- [ ] Change default admin password
- [ ] Use environment variables for sensitive data
- [ ] Enable HTTPS everywhere
- [ ] Set up rate limiting for API endpoints
- [ ] Review Firebase security rules
- [ ] Enable two-factor authentication for Firebase account
- [ ] Regularly update dependencies
- [ ] Monitor Firebase audit logs

## Scaling Considerations

As you grow:

1. **Database**: Migrate to Firebase Firestore for better scalability
2. **Payments**: Consider batch payment processing
3. **Notifications**: Implement real-time notifications service
4. **Analytics**: Set up detailed usage analytics
5. **API**: Create public API for third-party integrations
6. **Caching**: Implement Redis for session management

## Support & Maintenance

### Regular Tasks
- Monitor error logs (weekly)
- Review database usage (monthly)
- Update dependencies (monthly)
- Security audit (quarterly)
- Performance review (monthly)

### Backup Schedule
- Database: Daily automatic backups
- Configuration: Weekly manual backups
- Code: Continuous via GitHub

## Next Steps After Launch

1. Market your platform to cafe owners
2. Gather user feedback
3. Implement requested features
4. Scale infrastructure as needed
5. Expand to new regions
6. Partner with cafe associations

---

For support, contact: support@tabletap.com
