# 🤖 Groq LLM Chatbot Setup Guide

## 📋 **Setup Steps**

### **1. Get Your Groq API Key**

1. **Go to**: https://console.groq.com/
2. **Sign up/Login** with your account
3. **Navigate to**: API Keys section
4. **Create a new API key**
5. **Copy the API key** (starts with `gsk_...`)

### **2. Add Environment Variable**

Create a `.env.local` file in your project root (if it doesn't exist) and add:

```env
# Groq API Configuration
GROQ_API_KEY=gsk_your_actual_api_key_here

# Your existing Supabase keys (if not already set)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY=your_supabase_anon_key_here
```

### **3. Restart Your Development Server**

```bash
npm run dev
```

## 🎯 **Features Implemented**

### **✅ Auto-Generated Questions**
- The chatbot automatically generates 6 relevant questions based on your dataset
- Questions are tailored to your specific data structure and column types

### **✅ Natural Language Processing**
- Ask questions in plain English
- Examples:
  - "What is the average age?"
  - "Show me missing values"
  - "What are the correlations?"
  - "How many records are there?"

### **✅ Data Analysis Integration**
- Direct access to your dataset analysis results
- Real-time statistical calculations
- Correlation analysis
- Missing value detection

### **✅ Smart Responses**
- Context-aware responses based on your dataset
- Automatic data query execution
- Formatted results with visual indicators

## 🎨 **UI/UX Features**

### **Floating Chat Button**
- Blue chat icon in bottom-right corner
- Expands to full chat interface
- Minimizable and resizable

### **Chat Interface**
- Message history with timestamps
- Suggested question buttons
- Loading states with animations
- User/Assistant message differentiation

### **Response Formatting**
- Statistical summaries with icons
- Correlation analysis with strength indicators
- Missing value reports with percentages
- Sample data display

## 🔧 **How It Works**

### **1. Dataset Context Loading**
- When you open the chat, it loads your dataset information
- Extracts column names, types, and sample data
- Generates relevant questions using Groq LLM

### **2. Message Processing**
- Your messages are sent to Groq's Llama 3.1 model
- The AI understands your intent and context
- Determines if data querying is needed

### **3. Data Query Execution**
- For statistical questions, it queries your analysis results
- For correlations, it processes the correlation matrix
- For missing values, it checks the missing_values data
- Results are formatted and displayed

## 🚀 **Usage Examples**

### **Statistical Questions**
- "What is the average salary?"
- "Show me the min and max values"
- "What's the standard deviation?"

### **Data Quality**
- "Which columns have missing values?"
- "What's the data completeness?"
- "How many null values are there?"

### **Relationships**
- "What are the correlations?"
- "Which variables are most related?"
- "Show me strong correlations"

### **Exploration**
- "Show me a sample of the data"
- "How many records are there?"
- "What columns do I have?"

## 🛠️ **Technical Details**

### **Models Used**
- **Primary**: GPT-OSS-20B (via Groq)
- **Fallback**: Hardcoded responses if API fails

### **API Limits**
- **Groq Free Tier**: Very generous limits
- **Rate Limiting**: Built-in error handling
- **Fallback System**: Works even if API is down

### **Data Security**
- No data is sent to external services except for question generation
- All data analysis happens locally using your existing analysis results
- Only the dataset structure and sample data are sent to Groq for context

## 🔍 **Troubleshooting**

### **"API Key Not Found" Error**
1. Check your `.env.local` file exists
2. Verify the `GROQ_API_KEY` is set correctly
3. Restart your development server

### **"Rate Limit Exceeded" Error**
- Groq has very generous limits, but if you hit them:
- Wait a few minutes and try again
- The system will fall back to hardcoded responses

### **Chat Not Opening**
1. Make sure you have a dataset selected
2. Check browser console for errors
3. Verify the chatbot component is imported correctly

## 🎉 **You're All Set!**

The chatbot is now fully integrated into your EDA platform. Users can:

1. **Click the chat button** in the bottom-right corner
2. **Ask questions** about their data in natural language
3. **Get instant answers** with statistical analysis
4. **Explore suggested questions** for quick insights

The system is designed to be robust, with fallbacks and error handling to ensure it works even if the LLM API is temporarily unavailable.

Happy data exploring! 🚀📊
