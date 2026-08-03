import { NextRequest, NextResponse } from 'next/server';
import { getDatasetData } from '@/app/actions/getDatasetData';
import { requireDatasetId, requirePage, requirePageSize } from '@/lib/security/identifiers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const datasetId = parseInteger(resolvedParams.id);
    const { searchParams } = new URL(request.url);
    const page = parseInteger(searchParams.get('page') || '1');
    const pageSize = parseInteger(searchParams.get('pageSize') || '1000');

    try {
      requireDatasetId(datasetId);
      requirePage(page);
      requirePageSize(pageSize);
    } catch {
      return NextResponse.json(
        { error: 'Invalid dataset or pagination parameters' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const result = await getDatasetData(datasetId, page, pageSize);
    
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    console.error('Error fetching dataset data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dataset data' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

function parseInteger(value: string): number {
  return /^\d+$/.test(value) ? Number(value) : Number.NaN;
}
