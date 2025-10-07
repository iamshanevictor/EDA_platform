'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  MessageCircle, 
  Send, 
  X, 
  Bot, 
  User, 
  Loader2
} from 'lucide-react';
import { 
  generateQuestions, 
  processChatMessage, 
  executeDataQuery,
  getDatasetContext,
  type ChatMessage,
  type DatasetContext 
} from '@/app/actions/chatbot';

interface DataChatbotProps {
  datasetId: number;
  isOpen: boolean;
  onToggle: () => void;
}

export function DataChatbot({ datasetId, isOpen, onToggle }: DataChatbotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [datasetContext, setDatasetContext] = useState<DatasetContext | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadDatasetContext = useCallback(async () => {
    try {
      setIsLoading(true);
      const context = await getDatasetContext(datasetId);
      if (context) {
        setDatasetContext(context);
        
        // Generate suggested questions
        const questions = await generateQuestions(context);
        setSuggestedQuestions(questions);
        
        // Add welcome message
        setMessages([{
          role: 'assistant',
          content: `Hello! I'm your data analysis assistant for the dataset "${context.fileName}". I can help you explore your data, answer questions about statistics, correlations, missing values, and more. What would you like to know?`,
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error('Error loading dataset context:', error);
      setMessages([{
        role: 'assistant',
        content: 'Sorry, I encountered an error loading your dataset. Please try again.',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [datasetId]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Load dataset context and generate questions when chat opens
  useEffect(() => {
    if (isOpen && datasetId && !datasetContext) {
      loadDatasetContext();
    }
  }, [isOpen, datasetId, datasetContext, loadDatasetContext]);

  const handleSendMessage = async (message?: string) => {
    const messageToSend = message || inputMessage.trim();
    if (!messageToSend || !datasetContext) return;

    // Add user message
    const userMessage: ChatMessage = {
      role: 'user',
      content: messageToSend,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Process message with LLM
      const { response, shouldQueryData, queryType } = await processChatMessage(
        messageToSend,
        datasetContext,
        messages
      );

      // Add assistant response
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMessage]);

      // Execute data query if needed
      if (shouldQueryData && queryType) {
        const queryResult = await executeDataQuery(queryType, datasetContext);
        
        // Add query result as a follow-up message
        const resultMessage: ChatMessage = {
          role: 'assistant',
          content: formatQueryResult(queryResult),
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, resultMessage]);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatQueryResult = (result: { result: { type: string; data: unknown; message: string } | { type: string; message: string }; visualization?: string } | null): string => {
    if (!result || !result.result) return 'No results found.';
    
    const { type, message } = result.result;
    const data = 'data' in result.result ? result.result.data : null;
    
    switch (type) {
      case 'statistics':
        return `📊 **Statistical Summary**\n\n${message}\n\n${data ? (data as Array<{column: string; mean: number; median: number; min: number; max: number}>).map((stat) => 
          `**${stat.column}**: Mean: ${stat.mean?.toFixed(2)}, Median: ${stat.median?.toFixed(2)}, Min: ${stat.min}, Max: ${stat.max}`
        ).join('\n') : 'No data available'}`;
        
      case 'correlation':
        return `🔗 **Correlation Analysis**\n\n${message}\n\n${data ? (data as Array<{pair: string; correlation: number; strength: string}>).map((corr) => 
          `**${corr.pair}**: ${corr.correlation.toFixed(3)} (${corr.strength})`
        ).join('\n') : 'No data available'}`;
        
      case 'missing_values':
        return `⚠️ **Missing Values Analysis**\n\n${message}\n\n${data ? (data as Array<{column: string; missing_count: number; percentage: string}>).map((missing) => 
          `**${missing.column}**: ${missing.missing_count} missing (${missing.percentage}%)`
        ).join('\n') : 'No data available'}`;
        
      case 'sample_data':
        return `👁️ **Sample Data**\n\n${message}\n\n${data ? JSON.stringify(data, null, 2) : 'No data available'}`;
        
      case 'count':
        return `📈 **Dataset Overview**\n\n${message}\n\n${data ? `**Total Records**: ${(data as {total_records: number; total_columns: number; numeric_columns: number; text_columns: number}).total_records}\n**Total Columns**: ${(data as {total_records: number; total_columns: number; numeric_columns: number; text_columns: number}).total_columns}\n**Numeric Columns**: ${(data as {total_records: number; total_columns: number; numeric_columns: number; text_columns: number}).numeric_columns}\n**Text Columns**: ${(data as {total_records: number; total_columns: number; numeric_columns: number; text_columns: number}).text_columns}` : 'No data available'}`;
        
      default:
        return `Result: ${data ? JSON.stringify(data, null, 2) : 'No data available'}`;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getMessageIcon = (role: 'user' | 'assistant') => {
    return role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />;
  };


  if (!isOpen) {
    return (
      <Button
        onClick={onToggle}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full transition-all duration-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-none"
        size="icon"
        variant="outline"
      >
        <MessageCircle className="h-6 w-6 text-gray-600 dark:text-gray-400" />
      </Button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col z-50">
      {/* Header */}
      <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
        <CardTitle className="text-lg flex items-center gap-2">
          <Bot className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          Data Assistant
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={onToggle} className="h-8 w-8 p-0">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>

      {/* Messages */}
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role === 'assistant' && (
              <div className="flex-shrink-0 w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                {getMessageIcon(message.role)}
              </div>
            )}
            <div
              className={`max-w-[80%] p-3 rounded-lg ${
                message.role === 'user'
                  ? 'bg-gray-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
              }`}
            >
              <div className="whitespace-pre-wrap text-sm">{message.content}</div>
              <div className="text-xs opacity-70 mt-1">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
            {message.role === 'user' && (
              <div className="flex-shrink-0 w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                {getMessageIcon(message.role)}
              </div>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="flex gap-2 justify-start">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
              <Bot className="h-4 w-4" />
            </div>
            <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </CardContent>

      {/* Suggested Questions */}
      {suggestedQuestions.length > 0 && messages.length <= 1 && (
        <div className="p-4 border-t">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-3">Suggested questions:</div>
          <div className="space-y-2">
            {suggestedQuestions.slice(0, 3).map((question, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => handleSendMessage(question)}
                className="w-full text-left justify-start text-xs h-auto py-2 px-3 whitespace-normal break-words hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <span className="block leading-relaxed">{question}</span>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about your data..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={() => handleSendMessage()}
            disabled={isLoading || !inputMessage.trim()}
            size="icon"
            className="h-10 w-10"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
