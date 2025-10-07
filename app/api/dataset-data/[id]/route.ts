import { NextRequest, NextResponse } from 'next/server';
import { getDatasetData } from '@/app/actions/getDatasetData';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const datasetId = parseInt(resolvedParams.id);
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '1000');

    if (isNaN(datasetId)) {
      return NextResponse.json(
        { error: 'Invalid dataset ID' },
        { status: 400 }
      );
    }

    const result = await getDatasetData(datasetId, page, pageSize);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching dataset data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dataset data' },
      { status: 500 }
    );
  }
}
