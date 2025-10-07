import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Hero Section */}
      <div className="text-center py-12">
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
          EDA Platform
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-3xl mx-auto">
          Upload, analyze, and visualize your CSV data with our powerful Exploratory Data Analysis platform. 
          Get insights from your data in minutes.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg">
            <Link href="/upload">
              Upload CSV Files
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/data">
              View Data Analysis
            </Link>
          </Button>
        </div>
      </div>

      {/* Features Section */}
      <div className="grid md:grid-cols-3 gap-6 py-12">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📊 Data Upload
            </CardTitle>
            <CardDescription>
              Easily upload CSV files and parse them automatically
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Support for large CSV files with automatic header detection and data validation.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📈 EDA Analysis
            </CardTitle>
            <CardDescription>
              Comprehensive exploratory data analysis with visualizations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Get detailed statistics, correlation matrices, histograms, scatter plots, and data quality insights.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🚀 Fast & Secure
            </CardTitle>
            <CardDescription>
              Built with modern technologies for performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Powered by Next.js, Supabase, and Tailwind CSS for a fast and secure experience.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="py-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
          Quick Actions
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>Upload New Dataset</CardTitle>
              <CardDescription>
                Start by uploading a CSV file to begin your analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/upload">
                  Go to Upload
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>Browse Existing Data</CardTitle>
              <CardDescription>
                View and explore your previously uploaded datasets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href="/data">
                  View Data
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 dark:border-gray-700 py-8 mt-12">
        <div className="text-center text-gray-600 dark:text-gray-400">
          <p>© 2025 Shane Victor Bato-on. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}