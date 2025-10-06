'use server';

import Groq from 'groq-sdk';
import { createClient } from '@/lib/supabase/server';

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface DatasetContext {
  datasetId: number;
  fileName: string;
  columns: string[];
  columnTypes: Record<string, string>;
  sampleData: Record<string, unknown>[];
  analysis?: {
    summary_stats: Record<string, Record<string, number | string | { value: string; count: number }[]>>;
    missing_values: Record<string, number>;
    correlation_matrix: Record<string, Record<string, number>>;
  };
}

export async function generateQuestions(datasetContext: DatasetContext): Promise<string[]> {
  const { fileName, columns, columnTypes, sampleData } = datasetContext;
  
  try {
    const prompt = `You are a data analysis assistant. Based on the following dataset information, generate 6 relevant questions that a user might ask about this data:

Dataset: ${fileName}
Columns: ${columns.join(', ')}
Column Types: ${JSON.stringify(columnTypes)}
Sample Data (first 3 rows): ${JSON.stringify(sampleData.slice(0, 3))}

Generate 6 specific, actionable questions that would help users explore this dataset. Focus on:
1. Statistical analysis (averages, min/max, distributions)
2. Data quality (missing values, completeness)
3. Relationships and correlations
4. Data exploration and insights

Return only the questions, one per line, without numbering or bullet points.`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a helpful data analysis assistant. Generate specific, actionable questions about datasets."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: "openai/gpt-oss-20b",
      temperature: 0.7,
      max_tokens: 500,
    });

    const response = completion.choices[0]?.message?.content || '';
    const questions = response.split('\n')
      .map(q => q.trim())
      .filter(q => q.length > 0)
      .slice(0, 6);

    // Fallback questions if LLM doesn't provide enough
    if (questions.length < 3) {
      const numericColumns = Object.entries(columnTypes)
        .filter(([, type]) => type === 'numeric')
        .map(([name]) => name);
      
      const textColumns = Object.entries(columnTypes)
        .filter(([, type]) => type === 'text')
        .map(([name]) => name);

      const fallbackQuestions = [
        `What is the average value of ${numericColumns[0] || 'the numeric columns'}?`,
        `What are the most common values in ${textColumns[0] || 'the text columns'}?`,
        `How many records are in this dataset?`,
        `What columns have missing values?`,
        `What is the correlation between numeric variables?`,
        `Show me a sample of the data`
      ];

      return [...questions, ...fallbackQuestions.slice(questions.length)].slice(0, 6);
    }

    return questions;
  } catch (error) {
    console.error('Error generating questions with Groq:', error);
    
    // Fallback to hardcoded questions
    const numericColumns = Object.entries(columnTypes)
      .filter(([, type]) => type === 'numeric')
      .map(([name]) => name);
    
    const textColumns = Object.entries(columnTypes)
      .filter(([, type]) => type === 'text')
      .map(([name]) => name);

    return [
      `What is the average value of ${numericColumns[0] || 'the numeric columns'}?`,
      `What are the most common values in ${textColumns[0] || 'the text columns'}?`,
      `How many records are in this dataset?`,
      `What columns have missing values?`,
      `What is the correlation between numeric variables?`,
      `Show me a sample of the data`
    ];
  }
}

export async function processChatMessage(
  message: string,
  datasetContext: DatasetContext,
  chatHistory: ChatMessage[]
): Promise<{ response: string; shouldQueryData: boolean; queryType?: string }> {
  
  try {
    const systemPrompt = `You are a helpful data analysis assistant for a dataset called "${datasetContext.fileName}". 

Dataset Information:
- Columns: ${datasetContext.columns.join(', ')}
- Column Types: ${JSON.stringify(datasetContext.columnTypes)}
- Sample Data: ${JSON.stringify(datasetContext.sampleData.slice(0, 2))}

You can help users with:
1. Statistical analysis (averages, min/max, distributions)
2. Data quality assessment (missing values, completeness)
3. Correlation analysis between variables
4. Data exploration and insights
5. Sample data viewing

When users ask questions that require data analysis, respond with a helpful message and indicate what type of analysis you'll perform. Be conversational and helpful.`;

    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...chatHistory.slice(-5).map(msg => ({ role: msg.role, content: msg.content })),
      { role: "user" as const, content: message }
    ];

    const completion = await groq.chat.completions.create({
      messages,
      model: "openai/gpt-oss-20b",
      temperature: 0.7,
      max_tokens: 500,
    });

    const response = completion.choices[0]?.message?.content || 'I apologize, but I could not process your request.';
    
    // Determine if this requires data querying
    const lowerMessage = message.toLowerCase();
    const lowerResponse = response.toLowerCase();
    
    let shouldQueryData = false;
    let queryType = '';
    
    if (lowerMessage.includes('average') || lowerMessage.includes('mean') || lowerResponse.includes('average')) {
      shouldQueryData = true;
      queryType = 'statistics';
    } else if (lowerMessage.includes('correlation') || lowerResponse.includes('correlation')) {
      shouldQueryData = true;
      queryType = 'correlation';
    } else if (lowerMessage.includes('missing') || lowerMessage.includes('null') || lowerResponse.includes('missing')) {
      shouldQueryData = true;
      queryType = 'missing_values';
    } else if (lowerMessage.includes('sample') || lowerMessage.includes('show me') || lowerResponse.includes('sample')) {
      shouldQueryData = true;
      queryType = 'sample_data';
    } else if (lowerMessage.includes('count') || lowerMessage.includes('how many') || lowerResponse.includes('count')) {
      shouldQueryData = true;
      queryType = 'count';
    }

    return { response, shouldQueryData, queryType };
    
  } catch (error) {
    console.error('Error processing chat message with Groq:', error);
    
    // Fallback response
    return {
      response: `I apologize, but I'm having trouble processing your request right now. I can help you with statistical analysis, data quality assessment, correlations, and data exploration for your dataset "${datasetContext.fileName}". Please try asking a specific question about your data.`,
      shouldQueryData: false
    };
  }
}

export async function executeDataQuery(
  queryType: string,
  datasetContext: DatasetContext
): Promise<{ result: { type: string; data: unknown; message: string } | { type: string; message: string }; visualization?: string }> {
  
  const { analysis, sampleData } = datasetContext;
  
  switch (queryType) {
    case 'statistics':
      if (analysis?.summary_stats) {
        const numericStats = Object.entries(analysis.summary_stats)
          .filter(([, stats]: [string, Record<string, number | string | { value: string; count: number }[]>]) => typeof (stats as Record<string, number>).mean === 'number')
          .map(([column, stats]: [string, Record<string, number | string | { value: string; count: number }[]>]) => ({
            column,
            mean: (stats as Record<string, number>).mean,
            median: (stats as Record<string, number>).median,
            min: (stats as Record<string, number>).min,
            max: (stats as Record<string, number>).max,
            std_dev: (stats as Record<string, number>).std_dev
          }));
        
        return {
          result: {
            type: 'statistics',
            data: numericStats,
            message: `Statistical summary for ${numericStats.length} numeric columns`
          }
        };
      }
      break;
      
    case 'correlation':
      if (analysis?.correlation_matrix) {
        const correlations = [];
        const matrix = analysis.correlation_matrix;
        const columns = Object.keys(matrix);
        
        for (let i = 0; i < columns.length; i++) {
          for (let j = i + 1; j < columns.length; j++) {
            const corr = matrix[columns[i]][columns[j]];
            if (Math.abs(corr) > 0.1) {
              correlations.push({
                pair: `${columns[i]} ↔ ${columns[j]}`,
                correlation: corr,
                strength: Math.abs(corr) > 0.7 ? 'Strong' : Math.abs(corr) > 0.3 ? 'Moderate' : 'Weak'
              });
            }
          }
        }
        
        correlations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
        
        return {
          result: {
            type: 'correlation',
            data: correlations.slice(0, 10),
            message: `Top ${Math.min(10, correlations.length)} correlations found`
          }
        };
      }
      break;
      
    case 'missing_values':
      if (analysis?.missing_values) {
        const missingData = Object.entries(analysis.missing_values)
          .filter(([, count]) => count > 0)
          .map(([column, count]) => ({
            column,
            missing_count: count,
            percentage: ((count / datasetContext.sampleData.length) * 100).toFixed(2)
          }));
        
        return {
          result: {
            type: 'missing_values',
            data: missingData,
            message: `${missingData.length} columns have missing values`
          }
        };
      }
      break;
      
    case 'sample_data':
      return {
        result: {
          type: 'sample_data',
          data: sampleData.slice(0, 5),
          message: `Sample of first 5 records`
        }
      };
      
    case 'count':
      return {
        result: {
          type: 'count',
          data: {
            total_records: sampleData.length,
            total_columns: datasetContext.columns.length,
            numeric_columns: Object.values(datasetContext.columnTypes).filter(type => type === 'numeric').length,
            text_columns: Object.values(datasetContext.columnTypes).filter(type => type === 'text').length
          },
          message: `Dataset overview`
        }
      };
  }
  
  return {
    result: {
      type: 'error',
      message: 'Unable to process this query type'
    }
  };
}

export async function getDatasetContext(datasetId: number): Promise<DatasetContext | null> {
  try {
    const supabase = await createClient();
    
    // Fetch dataset
    const { data: dataset, error: datasetError } = await supabase
      .from('datasets')
      .select('*')
      .eq('id', datasetId)
      .single();

    if (datasetError || !dataset) {
      console.error('Error fetching dataset:', datasetError);
      return null;
    }

    // Fetch analysis
    const { data: analysis, error: analysisError } = await supabase
      .from('dataset_analyses')
      .select('*')
      .eq('dataset_id', datasetId)
      .single();

    if (analysisError) {
      console.error('Error fetching analysis:', analysisError);
    }

    // Extract columns and types from the data
    const csvData = dataset.data as Record<string, unknown>[];
    const columns = csvData.length > 0 ? Object.keys(csvData[0]) : [];
    
    // Determine column types
    const columnTypes: Record<string, string> = {};
    columns.forEach(column => {
      const sampleValues = csvData.slice(0, 10).map(row => row[column]).filter(val => val !== null && val !== undefined && val !== '');
      
      if (sampleValues.length === 0) {
        columnTypes[column] = 'text';
        return;
      }
      
      const isNumeric = sampleValues.every(val => {
        const num = Number(val);
        return !isNaN(num) && isFinite(num);
      });
      
      columnTypes[column] = isNumeric ? 'numeric' : 'text';
    });

    return {
      datasetId: dataset.id,
      fileName: dataset.file_name,
      columns,
      columnTypes,
      sampleData: csvData.slice(0, 10), // First 10 rows for context
      analysis: analysis ? {
        summary_stats: analysis.summary_stats,
        missing_values: analysis.missing_values,
        correlation_matrix: analysis.correlation_matrix
      } : undefined
    };
  } catch (error) {
    console.error('Error getting dataset context:', error);
    return null;
  }
}
