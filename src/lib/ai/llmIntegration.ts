'use client';

import { MLPrediction } from '../ml/fraudDetectionModels';
import { AnomalyAlert } from '../ml/anomalyDetection';
import { logger } from '../security/productionLogger';

interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'azure' | 'local';
  model: string;
  apiKey?: string;
  endpoint?: string;
  temperature: number;
  maxTokens: number;
}

interface InvestigationContext {
  userId: string;
  fraudType: string;
  evidence: string[];
  timeline: Array<{ timestamp: number; event: string; details: any }>;
  relatedCases: string[];
  financialImpact: number;
  confidence: number;
}

interface AIInsight {
  id: string;
  type: 'summary' | 'recommendation' | 'prediction' | 'explanation' | 'investigation';
  title: string;
  content: string;
  confidence: number;
  reasoning: string[];
  actionable: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
  generatedAt: number;
  sources: string[];
}

interface ChatSession {
  id: string;
  userId: string;
  userRole: 'admin' | 'operator' | 'investigator';
  messages: ChatMessage[];
  context: InvestigationContext | null;
  startedAt: number;
  lastActivity: number;
  status: 'active' | 'completed' | 'escalated';
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  attachments?: Array<{
    type: 'fraud_alert' | 'user_profile' | 'transaction' | 'chart' | 'report';
    id: string;
    data: any;
  }>;
  actions?: Array<{
    type: 'investigate' | 'block' | 'escalate' | 'close' | 'export';
    label: string;
    payload: any;
  }>;
}

interface NaturalLanguageQuery {
  query: string;
  intent: 'search' | 'analyze' | 'report' | 'investigate' | 'summarize';
  entities: Array<{
    type: 'user_id' | 'date_range' | 'region' | 'fraud_type' | 'metric';
    value: string;
    confidence: number;
  }>;
  filters: Record<string, any>;
  sqlQuery?: string;
  visualizationType?: 'table' | 'chart' | 'map' | 'summary';
}

class LLMIntelligenceEngine {
  private static instance: LLMIntelligenceEngine;
  private config: LLMConfig;
  private chatSessions: Map<string, ChatSession> = new Map();
  private aiInsights: AIInsight[] = [];
  private processingQueue: Array<{ type: string; data: any; callback: Function }> = [];

  private constructor() {
    this.config = {
      provider: 'openai',
      model: 'gpt-4-turbo',
      temperature: 0.1, // Low temperature for analytical tasks
      maxTokens: 2048
    };
    this.startProcessingQueue();
  }

  static getInstance(): LLMIntelligenceEngine {
    if (!LLMIntelligenceEngine.instance) {
      LLMIntelligenceEngine.instance = new LLMIntelligenceEngine();
    }
    return LLMIntelligenceEngine.instance;
  }

  private startProcessingQueue(): void {
    setInterval(() => {
      if (this.processingQueue.length > 0) {
        const task = this.processingQueue.shift();
        if (task) {
          this.processTask(task);
        }
      }
    }, 1000);
  }

  private async processTask(task: { type: string; data: any; callback: Function }): Promise<void> {
    try {
      let result;
      switch (task.type) {
        case 'generate_summary':
          result = await this.generateIntelligentSummary(task.data);
          break;
        case 'analyze_fraud':
          result = await this.analyzeFraudCase(task.data);
          break;
        case 'process_query':
          result = await this.processNaturalLanguageQuery(task.data);
          break;
        default:
          logger.warn(`Unknown task type: ${task.type}`);
          return;
      }
      task.callback(result);
    } catch (error) {
      logger.error('Error processing LLM task:', error instanceof Error ? error.message : error);
      task.callback(null, error);
    }
  }

  async generateIntelligentSummary(
    alerts: AnomalyAlert[], 
    predictions: MLPrediction[],
    timeframe: string = '24h'
  ): Promise<AIInsight> {
    const prompt = this.buildSummaryPrompt(alerts, predictions, timeframe);
    const response = await this.callLLM(prompt, 'summary_generation');

    const insight: AIInsight = {
      id: `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'summary',
      title: `Fraud Activity Summary - ${timeframe}`,
      content: response.content,
      confidence: response.confidence || 0.85,
      reasoning: response.reasoning || [],
      actionable: response.actionable || false,
      priority: this.determinePriority(alerts),
      tags: ['ai_generated', 'summary', timeframe],
      generatedAt: Date.now(),
      sources: ['fraud_alerts', 'ml_predictions', 'anomaly_detection']
    };

    this.aiInsights.push(insight);
    return insight;
  }

  private buildSummaryPrompt(
    alerts: AnomalyAlert[], 
    predictions: MLPrediction[], 
    timeframe: string
  ): string {
    const alertSummary = this.summarizeAlerts(alerts);
    const predictionSummary = this.summarizePredictions(predictions);

    return `As an expert fraud analyst for Xpress rideshare platform in the Philippines, analyze the following fraud detection data from the last ${timeframe}:

**FRAUD ALERTS (${alerts.length} total):**
${alertSummary}

**ML PREDICTIONS (${predictions.length} total):**
${predictionSummary}

**CONTEXT:**
- Operating regions: Manila, Cebu, Davao
- Peak fraud times: Late evening, bonus periods
- Common patterns: GPS spoofing, multi-account abuse, incentive fraud

Please provide:
1. **Executive Summary**: 2-3 sentence overview of fraud activity
2. **Key Trends**: Most significant patterns or changes
3. **Risk Assessment**: Current threat level and areas of concern  
4. **Recommended Actions**: 3-5 specific operational recommendations
5. **Predictions**: What to expect in the next 24-48 hours

Format as structured JSON with confidence scores for each section.
Keep language professional but accessible to operations teams.
Focus on actionable insights over technical details.`;
  }

  private summarizeAlerts(alerts: AnomalyAlert[]): string {
    const bySeverity = alerts.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byType = alerts.reduce((acc, alert) => {
      acc[alert.type] = (acc[alert.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return `
- Severity breakdown: ${Object.entries(bySeverity).map(([k,v]) => `${k}: ${v}`).join(', ')}
- Type breakdown: ${Object.entries(byType).map(([k,v]) => `${k}: ${v}`).join(', ')}
- Recent patterns: ${alerts.slice(0, 3).map(a => a.description).join('; ')}`;
  }

  private summarizePredictions(predictions: MLPrediction[]): string {
    const avgScore = predictions.reduce((sum, p) => sum + p.fraudScore, 0) / predictions.length;
    const highRisk = predictions.filter(p => p.fraudScore > 0.7).length;
    const topReasons = predictions.flatMap(p => p.reasons).slice(0, 5);

    return `
- Average fraud score: ${avgScore.toFixed(2)}
- High-risk cases: ${highRisk}
- Top indicators: ${topReasons.join('; ')}`;
  }

  async startInvestigationChat(
    userId: string,
    userRole: 'admin' | 'operator' | 'investigator',
    context?: InvestigationContext
  ): Promise<string> {
    const sessionId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const session: ChatSession = {
      id: sessionId,
      userId,
      userRole,
      messages: [],
      context: context || null,
      startedAt: Date.now(),
      lastActivity: Date.now(),
      status: 'active'
    };

    // Add welcome message
    const welcomeMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'assistant',
      content: this.generateWelcomeMessage(userRole, context),
      timestamp: Date.now(),
      actions: this.generateInitialActions(context)
    };

    session.messages.push(welcomeMessage);
    this.chatSessions.set(sessionId, session);

    logger.info(`Started AI investigation chat session: ${sessionId}`);
    return sessionId;
  }

  private generateWelcomeMessage(
    userRole: string, 
    context?: InvestigationContext
  ): string {
    if (context) {
      return `Hello! I'm your AI fraud investigation assistant. I see you're looking into a ${context.fraudType} case for user ${context.userId}. 

**Case Overview:**
- Fraud Type: ${context.fraudType}
- Confidence: ${Math.round(context.confidence * 100)}%
- Financial Impact: ₱${context.financialImpact.toLocaleString()}
- Evidence Points: ${context.evidence.length}

I can help you:
- Analyze the evidence and timeline
- Find similar cases
- Generate investigation reports
- Recommend next actions

What would you like to explore first?`;
    }

    return `Hello! I'm your AI fraud investigation assistant for Xpress Ops. I can help you with:

- 📊 **Analyze fraud patterns** across Manila, Cebu, and Davao
- 🔍 **Investigate specific cases** with detailed evidence analysis  
- 📈 **Generate insights** from recent fraud trends
- 📋 **Create reports** and summaries
- 💡 **Recommend actions** based on current threats

What would you like to investigate today?`;
  }

  private generateInitialActions(context?: InvestigationContext): ChatMessage['actions'] {
    if (context) {
      return [
        { type: 'investigate', label: 'Deep Dive Analysis', payload: { action: 'deep_analysis' } },
        { type: 'escalate', label: 'Find Similar Cases', payload: { action: 'similar_cases' } },
        { type: 'export', label: 'Generate Report', payload: { action: 'generate_report' } }
      ];
    }

    return [
      { type: 'investigate', label: 'Show Recent Alerts', payload: { action: 'recent_alerts' } },
      { type: 'analyze', label: 'Analyze Trends', payload: { action: 'trend_analysis' } },
      { type: 'report', label: 'Generate Summary', payload: { action: 'daily_summary' } }
    ];
  }

  async sendChatMessage(sessionId: string, userMessage: string): Promise<ChatMessage> {
    const session = this.chatSessions.get(sessionId);
    if (!session) {
      throw new Error(`Chat session not found: ${sessionId}`);
    }

    // Add user message
    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}_user`,
      role: 'user',
      content: userMessage,
      timestamp: Date.now()
    };
    session.messages.push(userMsg);

    // Generate AI response
    const prompt = this.buildChatPrompt(session, userMessage);
    const response = await this.callLLM(prompt, 'chat_response');

    const assistantMsg: ChatMessage = {
      id: `msg_${Date.now()}_assistant`,
      role: 'assistant',
      content: response.content,
      timestamp: Date.now(),
      attachments: response.attachments || [],
      actions: response.actions || []
    };

    session.messages.push(assistantMsg);
    session.lastActivity = Date.now();
    this.chatSessions.set(sessionId, session);

    return assistantMsg;
  }

  private buildChatPrompt(session: ChatSession, userMessage: string): string {
    const context = session.context ? `
**INVESTIGATION CONTEXT:**
- User ID: ${session.context.userId}
- Fraud Type: ${session.context.fraudType}
- Evidence: ${session.context.evidence.join(', ')}
- Financial Impact: ₱${session.context.financialImpact.toLocaleString()}
` : '';

    const conversationHistory = session.messages
      .slice(-10) // Last 10 messages for context
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    return `You are an expert AI fraud analyst for Xpress rideshare operations in the Philippines.

${context}

**CONVERSATION HISTORY:**
${conversationHistory}

**USER MESSAGE:**
${userMessage}

**INSTRUCTIONS:**
- Provide helpful, accurate analysis based on fraud detection expertise
- Reference specific Philippine regions (Manila, Cebu, Davao) when relevant
- Suggest actionable next steps
- If asked for data, provide realistic examples
- Keep responses concise but informative
- Include confidence levels for predictions
- Always prioritize fraud prevention and user safety

**CAPABILITIES:**
- Analyze fraud patterns and anomalies
- Generate investigation reports
- Recommend operational actions
- Explain ML model predictions
- Create data visualizations (describe what to show)
- Connect related fraud cases

Respond as the AI assistant:`;
  }

  async processNaturalLanguageQuery(query: string): Promise<NaturalLanguageQuery> {
    const prompt = `Parse this natural language query into structured data for a fraud detection system:

Query: "${query}"

Extract:
1. Intent (search, analyze, report, investigate, summarize)
2. Entities (user_id, date_range, region, fraud_type, metric)
3. Filters and parameters
4. Suggested visualization type

Respond in JSON format with extracted information and confidence scores.
Focus on Philippine rideshare fraud detection context.`;

    const response = await this.callLLM(prompt, 'query_parsing');

    return {
      query,
      intent: response.intent || 'search',
      entities: response.entities || [],
      filters: response.filters || {},
      sqlQuery: response.sqlQuery,
      visualizationType: response.visualizationType
    };
  }

  async generateInvestigationReport(context: InvestigationContext): Promise<AIInsight> {
    const prompt = `Generate a comprehensive fraud investigation report for:

**CASE DETAILS:**
- User ID: ${context.userId}
- Fraud Type: ${context.fraudType}
- Confidence Level: ${Math.round(context.confidence * 100)}%
- Financial Impact: ₱${context.financialImpact.toLocaleString()}

**EVIDENCE:**
${context.evidence.map((e, i) => `${i + 1}. ${e}`).join('\n')}

**TIMELINE:**
${context.timeline.map(t => `- ${new Date(t.timestamp).toLocaleString()}: ${t.event}`).join('\n')}

**RELATED CASES:** ${context.relatedCases.length} similar cases found

Create a professional investigation report with:
1. Executive Summary
2. Evidence Analysis
3. Pattern Recognition
4. Risk Assessment
5. Recommended Actions
6. Next Steps

Format for operations team consumption.`;

    const response = await this.callLLM(prompt, 'investigation_report');

    return {
      id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'investigation',
      title: `Investigation Report: ${context.fraudType} - User ${context.userId}`,
      content: response.content,
      confidence: response.confidence || 0.9,
      reasoning: [`Analyzed ${context.evidence.length} evidence points`, `Reviewed ${context.timeline.length} timeline events`],
      actionable: true,
      priority: 'high',
      tags: ['investigation', 'report', context.fraudType],
      generatedAt: Date.now(),
      sources: ['evidence_analysis', 'pattern_matching', 'related_cases']
    };
  }

  private async callLLM(prompt: string, taskType: string): Promise<any> {
    // Simulate LLM call - in production, this would call actual LLM APIs
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    // Return realistic AI responses based on task type
    switch (taskType) {
      case 'summary_generation':
        return {
          content: `**Executive Summary:** Detected 47 fraud attempts in the last 24 hours, primarily GPS spoofing (60%) and multi-account abuse (25%) concentrated in Manila CBD area.

**Key Trends:** 
- 23% increase in GPS spoofing during evening bonus periods
- New coordinated multi-account pattern emerging in Cebu IT Park
- Payment fraud down 15% due to enhanced validation

**Risk Assessment:** MEDIUM-HIGH - Current patterns suggest organized fraud groups adapting to recent detection improvements.

**Recommended Actions:**
1. Increase monitoring in Manila CBD during 7-10 PM
2. Deploy enhanced device fingerprinting in Cebu region  
3. Review bonus eligibility criteria for high-risk areas
4. Investigate coordinated account creation patterns
5. Consider temporary GPS accuracy threshold adjustment

**Predictions:** Expect 20-30% increase in fraud attempts this weekend, particularly route manipulation schemes.`,
          confidence: 0.87,
          reasoning: ['High consistency in fraud patterns', 'Strong correlation with historical data'],
          actionable: true
        };

      case 'chat_response':
        return {
          content: "I can help you analyze that fraud case. Based on the GPS data showing impossible speed calculations (>200 km/h) and multiple location jumps within Manila, this appears to be a clear GPS spoofing attempt. The user has made 15 similar trips in the past 3 days, all during bonus periods. Would you like me to:\n\n1. Find similar cases from other users\n2. Analyze the financial impact\n3. Generate a detailed evidence report\n4. Recommend immediate actions",
          attachments: [
            {
              type: 'fraud_alert',
              id: 'alert_123',
              data: { severity: 'high', type: 'gps_spoofing' }
            }
          ],
          actions: [
            { type: 'investigate', label: 'Find Similar Cases', payload: { action: 'similar_cases' } },
            { type: 'block', label: 'Block User', payload: { userId: 'user_123' } }
          ]
        };

      case 'investigation_report':
        return {
          content: `# FRAUD INVESTIGATION REPORT

## Executive Summary
Investigation into User ${prompt.includes('user_') ? 'ID ending in ***' : 'REDACTED'} reveals systematic GPS spoofing fraud with estimated impact of ₱75,000+. High confidence (91%) recommendation for immediate account suspension.

## Evidence Analysis
**Strong Indicators:**
- 12 impossible location jumps (>50km in <1min)
- Consistent GPS accuracy <10m during spoofing events
- Speed calculations exceeding 200 km/h on 8 occasions
- All fraudulent trips occurred during bonus eligibility periods

**Supporting Evidence:**
- Device fingerprint matches 2 other flagged accounts
- IP address history shows VPN usage
- Payment pattern anomalies (100% cash trips during fraud period)

## Risk Assessment
**CRITICAL RISK** - Organized fraud operation with potential network connections.

## Recommended Actions
1. **IMMEDIATE**: Suspend account and block associated devices
2. **INVESTIGATE**: Review accounts with matching device fingerprints  
3. **MONITOR**: Enhanced tracking of related IP ranges
4. **REPORT**: Submit case to fraud investigation team
5. **PREVENT**: Update GPS validation algorithms`,
          confidence: 0.91
        };

      case 'query_parsing':
        return {
          intent: 'analyze',
          entities: [
            { type: 'region', value: 'manila', confidence: 0.9 },
            { type: 'fraud_type', value: 'gps_spoofing', confidence: 0.85 },
            { type: 'date_range', value: 'last_week', confidence: 0.8 }
          ],
          filters: { region: 'manila', fraudType: 'gps_spoofing', timeframe: '7d' },
          visualizationType: 'chart'
        };

      default:
        return { content: 'AI processing completed', confidence: 0.8 };
    }
  }

  private determinePriority(alerts: AnomalyAlert[]): 'low' | 'medium' | 'high' | 'critical' {
    const criticalCount = alerts.filter(a => a.severity === 'critical').length;
    const highCount = alerts.filter(a => a.severity === 'high').length;

    if (criticalCount > 0) return 'critical';
    if (highCount > 5) return 'high';
    if (alerts.length > 20) return 'medium';
    return 'low';
  }

  // Public API methods
  getActiveChats(userId?: string): ChatSession[] {
    const sessions = Array.from(this.chatSessions.values())
      .filter(session => session.status === 'active');
    
    return userId ? sessions.filter(s => s.userId === userId) : sessions;
  }

  getChatSession(sessionId: string): ChatSession | null {
    return this.chatSessions.get(sessionId) || null;
  }

  getRecentInsights(limit: number = 10): AIInsight[] {
    return this.aiInsights
      .sort((a, b) => b.generatedAt - a.generatedAt)
      .slice(0, limit);
  }

  async generateExecutiveBriefing(timeframe: '24h' | '7d' | '30d' = '24h'): Promise<AIInsight> {
    // This would integrate with the existing fraud detection systems
    return this.generateIntelligentSummary([], [], timeframe);
  }

  updateConfiguration(config: Partial<LLMConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('LLM configuration updated:', JSON.stringify(config));
  }

  getUsageStats(): {
    totalSessions: number;
    activeChats: number;
    insightsGenerated: number;
    averageResponseTime: number;
  } {
    return {
      totalSessions: this.chatSessions.size,
      activeChats: this.getActiveChats().length,
      insightsGenerated: this.aiInsights.length,
      averageResponseTime: 1500 // ms
    };
  }
}

export const llmIntelligenceEngine = LLMIntelligenceEngine.getInstance();
export type { AIInsight, ChatSession, ChatMessage, InvestigationContext, NaturalLanguageQuery };
export default LLMIntelligenceEngine;