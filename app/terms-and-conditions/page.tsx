import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Terms and Conditions - TableTap',
  description: 'Terms and conditions for TableTap cafe management platform',
};

export default function TermsAndConditionsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-background rounded-lg shadow-sm border p-8 md:p-12">
        <Link href="/owner/register" className="inline-flex items-center gap-2 text-primary hover:underline mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to Register
        </Link>

        <h1 className="text-4xl font-bold text-foreground mb-2">Terms and Conditions</h1>
        <p className="text-muted-foreground mb-8">Last updated: February 22, 2026</p>

        <div className="space-y-8 text-foreground">
          <section>
            <h2 className="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground mb-3">
              By accessing and using TableTap, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">2. Use License</h2>
            <p className="text-muted-foreground mb-3">
              Permission is granted to temporarily download one copy of the materials (information or software) on TableTap for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-3">
              <li>Modifying or copying the materials</li>
              <li>Using the materials for any commercial purpose or for any public display</li>
              <li>Attempting to decompile or reverse engineer any software contained on TableTap</li>
              <li>Removing any copyright or other proprietary notations from the materials</li>
              <li>Transferring the materials to another person or "mirroring" the materials on any other server</li>
              <li>Using automated tools to access the platform</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">3. Disclaimer</h2>
            <p className="text-muted-foreground mb-3">
              The materials on TableTap are provided "as is". TableTap makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4. Limitations</h2>
            <p className="text-muted-foreground mb-3">
              In no event shall TableTap or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on TableTap, even if TableTap or an authorized representative has been notified orally or in writing of the possibility of such damage.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">5. Accuracy of Materials</h2>
            <p className="text-muted-foreground mb-3">
              The materials appearing on TableTap could include technical, typographical, or photographic errors. TableTap does not warrant that any of the materials on its website are accurate, complete, or current. TableTap may make changes to the materials contained on its website at any time without notice.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">6. Links</h2>
            <p className="text-muted-foreground mb-3">
              TableTap has not reviewed all of the sites linked to its website and is not responsible for the contents of any such linked site. The inclusion of any link does not imply endorsement by TableTap of the site. Use of any such linked website is at the user's own risk.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">7. Modifications</h2>
            <p className="text-muted-foreground mb-3">
              TableTap may revise these terms of service for its website at any time without notice. By using this website, you are agreeing to be bound by the then current version of these terms of service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">8. Governing Law</h2>
            <p className="text-muted-foreground mb-3">
              These terms and conditions are governed by and construed in accordance with the laws of the jurisdiction in which TableTap operates, and you irrevocably submit to the exclusive jurisdiction of the courts in that location.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">9. User Responsibilities</h2>
            <p className="text-muted-foreground mb-3">
              As a user of TableTap, you are responsible for:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-3">
              <li>Maintaining the confidentiality of your account information</li>
              <li>Notifying TableTap immediately of any unauthorized use of your account</li>
              <li>Ensuring all information provided is accurate and up-to-date</li>
              <li>Complying with all applicable laws and regulations</li>
              <li>Not engaging in any illegal or prohibited activities</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">10. Contact Information</h2>
            <p className="text-muted-foreground mb-3">
              If you have any questions about these Terms and Conditions, please contact us through our platform or at the email address provided in your account settings.
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
