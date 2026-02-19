import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { QrCode, Zap, TrendingUp, Lock, BarChart3, Smartphone, CheckCircle2, Users, Clock, ShoppingCart, Wifi, GitBranch } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Navigation */}
      <nav className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">TableTap</h1>
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
      <section className="max-w-7xl mx-auto px-4 py-24 text-center relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/10 blur-3xl -z-10 rounded-full"></div>
        <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
          <span className="text-sm font-medium text-primary">Now serving modern cafes worldwide</span>
        </div>

        <h1 className="text-6xl md:text-7xl font-bold text-foreground mb-6 leading-tight">
          Transform Your Cafe <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Experience</span>
        </h1>

        <p className="text-xl md:text-2xl text-muted-foreground mb-4 max-w-3xl mx-auto font-light">
          The ultimate QR-based ordering system designed for modern cafes. Simplify operations, delight customers, and grow your business.
        </p>

        <div className="flex gap-4 justify-center flex-wrap mb-12">
          <Link href="/owner/register">
            <Button size="lg" className="bg-gradient-to-r from-primary to-primary/80 hover:shadow-lg hover:shadow-primary/20 text-primary-foreground font-semibold px-8 py-6 text-lg">
              Register Now
            </Button>
          </Link>
          <Button size="lg" variant="outline" className="px-8 py-6 text-lg">
            Watch Demo
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">✓ No credit card required  •  ✓ Setup in minutes</p>
      </section>

      {/* Product Highlight */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6 leading-tight">
              One QR Code, Endless Possibilities
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Give each table a unique QR code. Customers scan it, browse your menu instantly, and place orders from their phones. It's that simple.
            </p>

            <div className="space-y-4">
              {[
                'Instant digital menu access with no app required',
                'Real-time order tracking for customers',
                'Seamless payment processing with UPI support',
                'Zero contact - fully digital ordering',
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-foreground">{item}</p>
                </div>
              ))}
            </div>

            <Link href="/owner/register">
              <Button size="lg" variant="outline" className="mt-8 px-8">
                Get Your QR Codes Today
              </Button>
            </Link>
          </div>

          <div className="relative">
            <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl p-8 border border-primary/20">
              <div className="bg-card rounded-xl p-6 shadow-lg">
                <div className="space-y-4">
                  <div className="h-12 bg-primary/10 rounded-lg"></div>
                  <div className="h-8 bg-primary/10 rounded-lg w-3/4"></div>
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-6 bg-primary/5 rounded-lg"></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Powerful Features Built For Growth</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">Everything you need to run a modern cafe successfully</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: QrCode,
              title: 'Smart QR Code System',
              description: 'Generate unique QR codes for each table. Customers scan once and get instant access to your digital menu.',
            },
            {
              icon: Smartphone,
              title: 'Mobile-First Interface',
              description: 'Beautiful, responsive design that works flawlessly on all devices. No app download required.',
            },
            {
              icon: ShoppingCart,
              title: 'Effortless Ordering',
              description: 'Intuitive cart system with real-time order confirmation and status updates for every customer.',
            },
            {
              icon: Lock,
              title: 'Secure UPI Payments',
              description: 'Integrated UPI payment gateway for safe, fast transactions. Support for all major digital payment methods.',
            },
            {
              icon: TrendingUp,
              title: 'Business Analytics',
              description: 'Track sales, popular items, peak hours, and customer trends with comprehensive dashboards.',
            },
            {
              icon: Users,
              title: 'Staff Management',
              description: 'Manage kitchen staff, assign orders, track completion, and optimize workflow efficiency.',
            },
            {
              icon: BarChart3,
              title: 'Dynamic Menu Control',
              description: 'Update prices, availability, and items in real-time. Mark items as unavailable instantly.',
            },
            {
              icon: Clock,
              title: 'Order Management',
              description: 'Centralized dashboard to manage all orders, prioritize, and track preparation time.',
            },
            {
              icon: Zap,
              title: 'Lightning Performance',
              description: 'Built on Next.js and Firebase for instant page loads and real-time synchronization.',
            },
          ].map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <Card key={idx} className="p-6 border border-primary/10 hover:border-primary/30 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </Card>
            );
          })}
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">How TableTap Works</h2>
          <p className="text-xl text-muted-foreground">Simple setup, powerful results</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {[
            {
              number: '01',
              title: 'Register Your Cafe',
              description: 'Sign up and create your cafe profile. Set up your basic information and preferences.',
            },
            {
              number: '02',
              title: 'Add Your Menu',
              description: 'Upload your menu items with descriptions, prices, and images. Organize by categories.',
            },
            {
              number: '03',
              title: 'Generate QR Codes',
              description: 'Our system generates unique QR codes for each table. Print and place them immediately.',
            },
            {
              number: '04',
              title: 'Start Taking Orders',
              description: 'Customers scan the QR code and start ordering. Receive orders instantly in your dashboard.',
            },
          ].map((step, idx) => (
            <div key={idx} className="relative">
              {idx < 3 && (
                <div className="hidden md:block absolute top-12 left-full w-8 h-0.5 bg-gradient-to-r from-primary/50 to-transparent"></div>
              )}
              <div className="bg-card rounded-xl p-6 border border-primary/10">
                <div className="text-3xl font-bold text-primary mb-3">{step.number}</div>
                <h3 className="text-lg font-bold text-foreground mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6 leading-tight">
                Why Cafes Choose <span className="text-primary">TableTap</span>
              </h2>
            </div>

            {[
              {
                title: 'Increase Revenue',
                description: 'Customers spend more when ordering from digital menus. Smart recommendations and upselling opportunities built-in.',
              },
              {
                title: 'Reduce Wait Times',
                description: 'Orders are processed instantly. No more miscommunications. Customers know exactly when their order is ready.',
              },
              {
                title: 'Save Money',
                description: 'No printing costs. No staff needed for taking orders. Reduce operational overhead significantly.',
              },
              {
                title: 'Better Customer Experience',
                description: 'Contactless ordering, transparent pricing, and easy payment. Customers love the convenience.',
              },
              {
                title: 'Real-time Insights',
                description: 'Understand customer preferences, peak hours, and best-selling items instantly with analytics.',
              },
              {
                title: 'Eco-Friendly',
                description: 'Go completely paperless. Reduce your cafe\'s environmental footprint with digital ordering.',
              },
            ].map((benefit, idx) => (
              <div key={idx} className="flex gap-4">
                <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-bold text-foreground mb-1">{benefit.title}</h4>
                  <p className="text-muted-foreground text-sm">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Active Cafes', value: '500+' },
              { label: 'Orders Processed', value: '100K+' },
              { label: 'Customer Satisfaction', value: '98%' },
              { label: 'Uptime Guarantee', value: '99.9%' },
            ].map((stat, idx) => (
              <Card key={idx} className="p-6 border border-primary/10 bg-card/50 backdrop-blur">
                <p className="text-3xl font-bold text-primary mb-1">{stat.value}</p>
                <p className="text-muted-foreground text-sm">{stat.label}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Everything You Need</h2>
          <p className="text-xl text-muted-foreground">A complete platform for modern cafe operations</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            {
              title: '📱 Customer-Facing Features',
              items: [
                'Digital menu browsing with images and descriptions',
                'Easy-to-use ordering interface',
                'Real-time order status tracking',
                'Multiple payment options (UPI, cards, wallets)',
                'Order history and wishlist',
                'Personalized recommendations',
              ],
            },
            {
              title: '👨‍💼 Owner Dashboard',
              items: [
                'Comprehensive sales analytics',
                'Real-time order management',
                'Menu management and updates',
                'Customer insights and behavior',
                'Revenue reports and trends',
                'Performance metrics',
              ],
            },
            {
              title: '👥 Staff Management',
              items: [
                'Staff login system',
                'Order assignment and tracking',
                'Order preparation status',
                'Real-time notifications',
                'Performance analytics',
                'Shift management',
              ],
            },
            {
              title: '🛠️ Admin Tools',
              items: [
                'Multi-cafe support',
                'User management',
                'System monitoring',
                'Transaction management',
                'Platform analytics',
                'Support & documentation',
              ],
            },
          ].map((section, idx) => (
            <Card key={idx} className="p-8 border border-primary/10 hover:border-primary/30 transition-colors">
              <h3 className="text-2xl font-bold text-foreground mb-6">{section.title}</h3>
              <ul className="space-y-3">
                {section.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="flex items-start gap-3">
                    <div className="h-2 w-2 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </section>



      {/* Final CTA */}
      <section className="max-w-4xl mx-auto px-4 py-24 text-center relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/10 blur-3xl -z-10 rounded-full"></div>

        <h2 className="text-5xl md:text-6xl font-bold text-foreground mb-6">
          Ready to Revolutionize Your Cafe?
        </h2>
        <p className="text-lg md:text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
          Join hundreds of successful cafes already using TableTap to serve customers better and grow their business faster.
        </p>

        <div className="flex gap-4 justify-center flex-wrap">
          <Link href="/owner/register">
            <Button size="lg" className="bg-gradient-to-r from-primary to-primary/80 hover:shadow-lg hover:shadow-primary/20 text-primary-foreground font-semibold px-8 py-6 text-lg">
              Register Now
            </Button>
          </Link>
          <Button size="lg" variant="outline" className="px-8 py-6 text-lg">
            Contact Sales
          </Button>
        </div>

        <p className="text-sm text-muted-foreground mt-8">No credit card required • Easy setup • Cancel anytime</p>
      </section>


      {/* Footer */}
      <footer className="bg-gradient-to-b from-card/50 to-card border-t mt-20">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div>
              <h3 className="font-bold text-lg text-foreground mb-4 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">TableTap</h3>
              <p className="text-sm text-muted-foreground">QR code ordering for modern cafes. Delight customers, simplify operations, and grow your business.</p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="#" className="hover:text-foreground transition-colors">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground transition-colors">
                    How It Works
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground transition-colors">
                    Security
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="#" className="hover:text-foreground transition-colors">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground transition-colors">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground transition-colors">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="#" className="hover:text-foreground transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground transition-colors">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-primary/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">&copy; 2026 TableTap. All rights reserved.</p>
            <p className="text-sm text-muted-foreground">Made with ❤️ for cafe owners</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
