# 📊 EDA Platform - Exploratory Data Analysis Tool

<div align="center">

![EDA Platform](https://img.shields.io/badge/EDA-Platform-blue?style=for-the-badge&logo=chart-bar)
![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![Supabase](https://img.shields.io/badge/Supabase-Database-green?style=for-the-badge&logo=supabase)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)

**A powerful web application for automated Exploratory Data Analysis (EDA) of CSV datasets**

[🚀 Live Demo](#demo) • [📖 Documentation](#features) • [🛠️ Setup](#setup) • [📊 Screenshots](#screenshots)

</div>

---

## 🎯 Overview

The **EDA Platform** is a comprehensive web application designed to automate and streamline the process of Exploratory Data Analysis (EDA) for CSV datasets. Built with modern web technologies, it provides an intuitive interface for data scientists, analysts, and researchers to quickly understand their data through automated statistical analysis and visualizations.

### 🌟 Key Highlights

- **🤖 Automated EDA**: Upload any CSV file and get instant comprehensive analysis
- **📈 Rich Visualizations**: Interactive charts, histograms, scatter plots, and correlation heatmaps
- **📄 PDF Reports**: Generate professional analysis reports
- **⚡ High Performance**: Optimized for large datasets with lazy loading and caching
- **🎨 Modern UI**: Clean, responsive design with dark/light mode support

---

## ✨ Features

### 📊 **Automated Data Analysis**
- **Summary Statistics**: Mean, median, standard deviation, quartiles for numeric columns
- **Data Type Detection**: Automatic identification of numeric, text, and categorical data
- **Missing Value Analysis**: Comprehensive missing data detection and visualization
- **Correlation Analysis**: Pearson correlation matrix with heatmap visualization

### 📈 **Advanced Visualizations**
- **Distribution Charts**: Histograms for numeric data distribution analysis
- **Relationship Analysis**: Scatter plots for correlation exploration
- **Data Quality Charts**: Missing value patterns and data completeness metrics
- **Interactive Charts**: Built with Recharts for smooth user experience

### 📄 **Professional Reporting**
- **PDF Export**: Generate comprehensive analysis reports
- **Print-Friendly**: Optimized layouts for both screen and print
- **Customizable**: Include/exclude sections based on your needs
- **Professional Formatting**: Clean, structured reports ready for presentation

### ⚡ **Performance & Scalability**
- **Lazy Loading**: Load data on-demand to handle large datasets
- **Data Sampling**: Intelligent sampling for visualization performance
- **Caching**: In-memory caching for faster repeated access
- **Pagination**: Efficient handling of large datasets

### 🎨 **User Experience**
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Dark/Light Mode**: Toggle between themes for comfortable viewing
- **Intuitive Navigation**: Clean, organized interface
- **Real-time Feedback**: Loading states and progress indicators

---

## 🛠️ Technology Stack

### **Frontend**
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Modern component library
- **Recharts** - Data visualization library
- **Lucide React** - Beautiful icons

### **Backend & Database**
- **Supabase** - Backend-as-a-Service
- **PostgreSQL** - Relational database
- **Row Level Security (RLS)** - Data security
- **Server Actions** - Server-side data processing

### **Analytics**
- **Papa Parse** - CSV parsing and processing
- **Statistical Analysis** - Custom algorithms for EDA

### **Development Tools**
- **ESLint** - Code linting
- **PostCSS** - CSS processing
- **Git** - Version control

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm, yarn, or pnpm
- Supabase account (free tier available)

### 1. Clone the Repository
   ```bash
git clone <your-repo-url>
cd eda-platform
   ```

### 2. Install Dependencies
   ```bash
npm install
# or
yarn install
# or
pnpm install
```

### 3. Set Up Supabase
1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Settings → API to get your project URL and anon key
3. Create the required database tables (see [Database Setup](#database-setup))

### 4. Environment Configuration
Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY=your_supabase_anon_key
```

### 5. Run the Development Server
   ```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🗄️ Database Setup

### Required Tables

#### 1. Datasets Table
```sql
CREATE TABLE datasets (
  id SERIAL PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;

-- Allow public access for demo
CREATE POLICY "Allow all access for demo" ON datasets FOR ALL TO anon USING (true);
```

#### 2. Dataset Analyses Table
```sql
CREATE TABLE dataset_analyses (
  id SERIAL PRIMARY KEY,
  dataset_id INTEGER REFERENCES datasets(id) ON DELETE CASCADE,
  summary_stats JSONB NOT NULL,
  missing_values JSONB NOT NULL,
  column_types JSONB NOT NULL,
  correlation_matrix JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE dataset_analyses ENABLE ROW LEVEL SECURITY;

-- Allow public access for demo
CREATE POLICY "Allow all access for demo" ON dataset_analyses FOR ALL TO anon USING (true);
```

---

## 📱 Usage Guide

### 1. **Upload Your Data**
- Navigate to the Upload page
- Select a CSV file from your computer
- The system will automatically parse and analyze your data

### 2. **Explore Analysis Results**
- View comprehensive summary statistics
- Examine data types and missing value patterns
- Review correlation matrices

### 3. **Visualize Your Data**
- Browse interactive charts and graphs
- Explore data distributions with histograms
- Analyze relationships with scatter plots
- Review data quality metrics

### 4. **Generate Reports**
- Create professional PDF reports
- Customize report content
- Export for presentations or documentation

---

## 🏗️ Project Structure

```
eda-platform/
├── app/                          # Next.js App Router
│   ├── data/                     # Data analysis page
│   ├── upload/                   # CSV upload page
│   ├── api/                      # API routes
│   └── layout.tsx               # Root layout
├── components/                   # React components
│   ├── charts/                  # Chart components
│   │   ├── HistogramChart.tsx
│   │   ├── ScatterPlot.tsx
│   │   ├── CorrelationHeatmap.tsx
│   │   └── MissingValuesChart.tsx
│   ├── AdvancedCharts.tsx       # Main visualization component
│   ├── AnalysisResults.tsx      # Analysis display
│   ├── OptimizedDatasetTabs.tsx # Dataset management
│   ├── ReportGenerator.tsx      # PDF report generation
│   └── ui/                      # shadcn/ui components
├── lib/                         # Utilities and configurations
│   ├── supabase/               # Supabase client setup
│   └── utils.ts                # Helper functions
└── app/actions/                # Server actions
    ├── analyzeData.ts          # EDA analysis logic
    └── getDatasetData.ts       # Data fetching utilities
```

---

## 🔧 Configuration

### Customization Options
- **Chart Colors**: Modify color schemes in chart components
- **Analysis Parameters**: Adjust statistical calculations in `analyzeData.ts`
- **UI Themes**: Customize Tailwind CSS classes
- **Report Templates**: Modify `ReportTemplate.tsx` for custom report layouts

---

## 🚀 Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically

### Other Platforms
The application can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Use meaningful commit messages
- Add tests for new features
- Update documentation as needed

---

## 📊 Performance

### Optimizations Implemented
- **Lazy Loading**: Data loaded on-demand
- **Data Sampling**: Reduced data points for visualizations
- **Caching**: In-memory caching for repeated requests
- **Pagination**: Efficient handling of large datasets
- **Bundle Optimization**: Tree-shaking and code splitting

### Benchmarks
- **Small Datasets** (< 1,000 rows): < 2 seconds analysis time
- **Medium Datasets** (1,000-10,000 rows): < 5 seconds analysis time
- **Large Datasets** (10,000+ rows): < 10 seconds analysis time with sampling

---

## 🔒 Security

### Data Protection
- **No Authentication Required**: Public demo mode for easy access
- **Row Level Security**: Database-level access control
- **Input Validation**: Sanitized CSV parsing
- **Error Handling**: Graceful error management

### Privacy
- Data is stored in your Supabase instance
- Dataset content is not sent to an external AI provider
- You maintain full control over your data

---

## 🐛 Troubleshooting

### Common Issues

#### Build Errors
   ```bash
# Clear Next.js cache
rm -rf .next
npm run build
```

#### Supabase Connection Issues
- Verify your environment variables
- Check Supabase project status
- Ensure RLS policies are correctly configured

#### CSV Upload Issues
- Ensure file is valid CSV format
- Check file size limits
- Verify file encoding (UTF-8 recommended)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Next.js Team** - For the amazing React framework
- **Supabase Team** - For the powerful backend platform
- **shadcn/ui** - For the beautiful component library
- **Recharts** - For the excellent charting library

---

## 📞 Support

- **Documentation**: Check this README and inline code comments
- **Issues**: Open an issue on GitHub for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions and ideas

---

<div align="center">

**Built with ❤️ for the data science community**

[⭐ Star this repo](https://github.com/your-username/eda-platform) • [🐛 Report Bug](https://github.com/your-username/eda-platform/issues) • [💡 Request Feature](https://github.com/your-username/eda-platform/issues)

</div>
