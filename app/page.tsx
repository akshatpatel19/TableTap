import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { QrCode, Zap, TrendingUp, Lock, BarChart3, Smartphone } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-40 bg-card/80 backdrop-blur border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">TableTap</h1>
          <div className="flex items-center gap-4">
            <Link href="/owner/login">
              <Button variant="outline" size="sm">
                Cafe Owner
              </Button>
            </Link>
            <Link href="/admin/login">
              <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                Admin
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h2 className="text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
          QR Code Menu Ordering for Modern Cafes
        </h2>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Enable customers to scan QR codes at their tables, browse your menu, and place orders directly. Fast, seamless, and fully contactless.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link href="/owner/register">
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8">
              Get Started for Free
            </Button>
          </Link>
          <Button size="lg" variant="outline" className="px-8 bg-transparent">
            Learn More
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <h2 className="text-4xl font-bold text-foreground mb-12 text-center">Why TableTap?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: QrCode,
              title: 'QR Code Ordering',
              description: 'Customers scan a unique QR code at each table to browse and order directly from their phones.',
            },
            {
              icon: Zap,
              title: 'Lightning Fast',
              description: 'Built with Next.js and Firebase for instant page loads and real-time order updates.',
            },
            {
              icon: Smartphone,
              title: 'Mobile First',
              description: 'Fully responsive design optimized for all devices with intuitive navigation.',
            },
            {
              icon: TrendingUp,
              title: 'Real-time Analytics',
              description: 'Track orders, revenue, and cafe performance with detailed insights and metrics.',
            },
            {
              icon: Lock,
              title: 'Secure Payments',
              description: 'Integrated Razorpay support for secure online payments with multiple payment methods.',
            },
            {
              icon: BarChart3,
              title: 'Menu Management',
              description: 'Update menu items, prices, and availability in real-time from your dashboard.',
            },
          ].map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <Card key={idx} className="p-6 hover:shadow-lg transition-shadow">
                <Icon className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-bold text-foreground mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Pricing Section */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <h2 className="text-4xl font-bold text-foreground mb-12 text-center">Simple Pricing</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              name: 'Basic',
              price: '₹499',
              period: '/month',
              tables: 'Up to 5 tables',
              features: [
                'Basic menu management',
                'Order tracking',
                'Pay at counter option',
                'Email support',
              ],
            },
            {
              name: 'Standard',
              price: '₹999',
              period: '/month',
              tables: 'Up to 15 tables',
              popular: true,
              features: [
                'Advanced menu management',
                'Real-time notifications',
                'Razorpay integration',
                'Order analytics',
                'Priority support',
              ],
            },
            {
              name: 'Premium',
              price: '₹1999',
              period: '/month',
              tables: 'Up to 50 tables',
              features: [
                'Multi-location support',
                'Custom branding',
                'Advanced analytics',
                'API access',
                'Dedicated support',
                'Staff management',
              ],
            },
          ].map((plan, idx) => (
            <Card
              key={idx}
              className={`p-8 relative ${plan.popular ? 'ring-2 ring-primary md:scale-105' : ''}`}
            >
              {plan.popular && (
                <div className="absolute top-4 right-4 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-semibold">
                  Most Popular
                </div>
              )}
              <h3 className="text-2xl font-bold text-foreground mb-2">{plan.name}</h3>
              <p className="text-muted-foreground text-sm mb-4">{plan.tables}</p>
              <div className="mb-6 pb-6 border-b">
                <span className="text-4xl font-bold text-primary">{plan.price}</span>
                <span className="text-muted-foreground text-sm">{plan.period}</span>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, fidx) => (
                  <li key={fidx} className="flex items-start gap-2 text-sm text-foreground">
                    <span className="text-primary font-bold">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <Button className="w-full" variant={plan.popular ? 'default' : 'outline'}>
                Get Started
              </Button>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h2 className="text-3xl font-bold text-foreground mb-4">Ready to Transform Your Cafe?</h2>
        <p className="text-lg text-muted-foreground mb-8">
          Join hundreds of cafes using TableTap to increase orders and improve customer experience.
        </p>
        <Link href="/owner/register">
          <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8">
            Start Your Free Trial
          </Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t mt-20">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-bold text-foreground mb-4">TableTap</h3>
              <p className="text-sm text-muted-foreground">QR code menu ordering for modern cafes.</p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="#" className="hover:text-foreground">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground">
                    Pricing
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="#" className="hover:text-foreground">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="#" className="hover:text-foreground">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground">
                    Terms
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t pt-8 flex justify-between items-center">
            <p className="text-sm text-muted-foreground">&copy; 2026 TableTap. All rights reserved.</p>
            <p className="text-sm text-muted-foreground">Made with care for cafe owners</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
