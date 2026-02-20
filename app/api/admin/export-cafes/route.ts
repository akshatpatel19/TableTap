import { NextResponse } from 'next/server';
import { getAllCafes } from '@/lib/db';

export async function GET(request: Request) {
    try {
        const cafes = await getAllCafes();

        if (!cafes || cafes.length === 0) {
            return new NextResponse('No cafes found', { status: 404 });
        }

        // Define CSV headers
        const headers = [
            'ID',
            'Name',
            'Slug',
            'Email',
            'Phone',
            'Address',
            'Tables',
            'Plan',
            'Status',
            'Setup Fee Status',
            'Created At'
        ];

        // Map cafe data to CSV rows
        const rows = cafes.map(cafe => {
            const createdAt = new Date(cafe.createdAt).toLocaleDateString();
            return [
                cafe.id,
                `"${cafe.name.replace(/"/g, '""')}"`, // Escape quotes
                cafe.slug,
                cafe.email,
                cafe.phone,
                `"${cafe.address.replace(/"/g, '""')}"`,
                cafe.tables,
                cafe.subscriptionPlan,
                cafe.isActive ? 'Active' : 'Blocked',
                cafe.setupFeeStatus,
                createdAt
            ].join(',');
        });

        // Combine headers and rows
        const csvContent = [headers.join(','), ...rows].join('\n');

        // Return the CSV file
        return new NextResponse(csvContent, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="cafes_export_${new Date().toISOString().split('T')[0]}.csv"`,
            },
        });

    } catch (error) {
        console.error('Error exporting cafes:', error);
        return new NextResponse('Failed to export cafes', { status: 500 });
    }
}
