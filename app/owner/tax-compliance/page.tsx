'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, FileCheck } from 'lucide-react';

export default function TaxCompliancePage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-background p-6">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <Button variant="outline" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">Tax Compliance</h1>
                        <p className="text-muted-foreground">Manage your GST and tax reports</p>
                    </div>
                </div>

                <Card className="p-12 flex flex-col items-center justify-center text-center min-h-[400px] border-dashed border-2">
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                        <FileCheck className="h-10 w-10 text-primary" />
                    </div>
                    <h2 className="text-3xl font-bold text-foreground mb-4">Coming Very Soon</h2>
                    <p className="text-lg text-muted-foreground max-w-md">
                        We are working hard to bring you comprehensive tax compliance and GST reporting tools. Stay tuned!
                    </p>
                </Card>
            </div>
        </div>
    );
}
