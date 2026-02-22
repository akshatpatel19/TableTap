import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy - TableTap',
  description: 'Privacy policy for TableTap cafe management platform',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-background rounded-lg shadow-sm border p-8 md:p-12">
        <Link href="/owner/register" className="inline-flex items-center gap-2 text-primary hover:underline mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to Register
        </Link>

        <h1 className="text-4xl font-bold text-foreground mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: February 22, 2026</p>

        <div className="space-y-8 text-foreground">
          <section>
            <h2 className="text-2xl font-bold mb-4">1. Introduction</h2>
            <p className="text-muted-foreground mb-3">
              TableTap ("we," "us," "our," or "Company") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">2. Information We Collect</h2>
            <p className="text-muted-foreground mb-3">
              We may collect information about you in a variety of ways. The information we may collect on the Site includes:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-3">
              <li><strong>Personal Data:</strong> Name, email address, phone number, business address, and other contact information</li>
              <li><strong>Financial Data:</strong> Financial information such as payment methods, transaction history, and billing information</li>
              <li><strong>Data From Third Parties:</strong> Information from payment processors and analytics providers</li>
              <li><strong>Mobile Device Data:</strong> Device identifiers, mobile device operating system, and browser type</li>
              <li><strong>Usage Data:</strong> Information about your interactions with our platform and services</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">3. Use of Your Information</h2>
            <p className="text-muted-foreground mb-3">
              Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the Site to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-3">
              <li>Create and manage your account</li>
              <li>Process your transactions and send related information</li>
              <li>Email you regarding your account or order</li>
              <li>Fulfill and manage purchases, orders, payments, and other transactions related to the Site</li>
              <li>Generate a personal profile about you for marketing purposes</li>
              <li>Increase the efficiency and operation of the Site</li>
              <li>Monitor and analyze usage and trends to improve your experience with the Site</li>
              <li>Notify you of updates to the Site</li>
              <li>Offer new products, services, and/or recommendations to you</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4. Disclosure of Your Information</h2>
            <p className="text-muted-foreground mb-3">
              We may share information we have collected about you in certain situations:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-3">
              <li><strong>By Law or to Protect Rights:</strong> If we believe the release of information is necessary to comply with the law</li>
              <li><strong>Third-Party Service Providers:</strong> We may share your information with third parties that perform services for us, including payment processing, data analysis, email delivery, hosting services, and customer service</li>
              <li><strong>Business Transfers:</strong> Your information may be transferred as part of a merger, acquisition, or asset sale</li>
              <li><strong>With Your Consent:</strong> We may disclose your information when you give us explicit consent to do so</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">5. Security of Your Information</h2>
            <p className="text-muted-foreground mb-3">
              We use administrative, technical, and physical security measures to protect your personal information. However, perfect security does not exist online. We cannot guarantee the absolute security of your information and are not responsible for any breach of security unless it is due to our gross negligence.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">6. Contact Us</h2>
            <p className="text-muted-foreground mb-3">
              If you have questions or comments about this Privacy Policy, please contact us at:
            </p>
            <p className="text-muted-foreground">
              <strong>Email:</strong> privacy@tabletap.com<br />
              Through our platform's contact form
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">7. Cookies</h2>
            <p className="text-muted-foreground mb-3">
              We use cookies to understand and save your preferences for future visits and compile aggregate data about site traffic and site interaction so that we can offer better site experiences and tools in the future. You can choose to have your computer warn you each time a cookie is being sent, or you can choose to turn off all cookies.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">8. Your Privacy Rights</h2>
            <p className="text-muted-foreground mb-3">
              Depending on your location, you may have certain rights regarding your personal information, including:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-3">
              <li>The right to access your personal data</li>
              <li>The right to correct inaccurate data</li>
              <li>The right to request deletion of your data</li>
              <li>The right to restrict or object to processing of your data</li>
              <li>The right to data portability</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">9. Policy Updates</h2>
            <p className="text-muted-foreground mb-3">
              We may update this Privacy Policy from time to time in order to reflect, for example, changes to our practices or for other operational, legal, or regulatory reasons. We will notify you of any material changes by updating the "Last Updated" date of this Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">10. Children's Privacy</h2>
            <p className="text-muted-foreground mb-3">
              Our Site is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If we learn that personal information of persons less than 13 has been collected through the Site, we will delete such information and the account responsible for such collection.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t">
          <Link href="/owner/register" className="inline-block">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2">
              Back to Register
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
