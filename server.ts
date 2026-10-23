import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));

// Server-side Gemini AI setup
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// POST /api/gemini/insights
// Computes business insights grounded STRICTLY in calculated dataset statistics
app.post('/api/gemini/insights', async (req, res) => {
  try {
    const { statistics } = req.body;

    if (!statistics) {
      return res.status(400).json({ error: 'Missing statistics object in request body.' });
    }

    if (!ai) {
      return res.json({
        source: 'rule-based-fallback',
        message: 'No GEMINI_API_KEY configured. Providing deterministic analytical insights grounded in data statistics.',
        insights: null,
      });
    }

    const prompt = `You are a Principal Retail Data Analyst and Decision Intelligence Consultant.
You are analyzing verified, aggregated retail transaction metrics for a business.

DATASET AGGREGATED STATISTICS:
- Date Range: ${statistics.dateRange || 'N/A'}
- Total Revenue: $${Number(statistics.totalRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Total Profit: $${Number(statistics.totalProfit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Profit Margin: ${Number(statistics.profitMargin || 0).toFixed(1)}%
- Total Orders: ${statistics.totalOrders}
- Total Units Sold: ${statistics.totalUnitsSold}
- Average Order Value (AOV): $${Number(statistics.aov || 0).toFixed(2)}
- Unique Customers: ${statistics.uniqueCustomers}
- Top Categories by Revenue: ${JSON.stringify(statistics.topCategories || [])}
- Category Profitability: ${JSON.stringify(statistics.categoryProfitability || [])}
- Top Products: ${JSON.stringify(statistics.topProducts || [])}
- Low/Negative Profit Products: ${JSON.stringify(statistics.negativeProfitProducts || [])}
- Customer RFM Segments: ${JSON.stringify(statistics.rfmSegments || {})}
- Regional Revenue & Profit: ${JSON.stringify(statistics.regionalBreakdown || [])}
- Outliers & Data Quality: ${statistics.dataQualityNote || 'None'}

STRICT INSTRUCTIONS:
1. Do NOT invent numbers, percentages, or metrics not present in or directly derived from the statistics above.
2. Do NOT claim causation where only correlation or association exists.
3. Every insight MUST have:
   - "title": Short descriptive title
   - "category": One of "Key Finding", "Revenue Trend", "Customer Behavior", "Product Performance", "Profitability Risk", "Recommendation"
   - "finding": Clear summary of the factual finding
   - "supportingMetric": The exact metric/number that supports this finding
   - "businessInterpretation": What this means for retail operations and strategy
   - "suggestedAction": Practical, high-impact business decision or mitigation
   - "limitationOrUncertainty": What data is missing or what uncertainty exists

Provide exactly:
- 5 Key Findings
- 1 Revenue Trend finding
- 1 Customer Behavior finding
- 1 Product Performance finding
- 1 Profitability Risk finding
- 4 Actionable Strategic Recommendations

Return your response in valid JSON matching this exact structure:
{
  "insights": [
    {
      "title": "string",
      "category": "Key Finding" | "Revenue Trend" | "Customer Behavior" | "Product Performance" | "Profitability Risk" | "Recommendation",
      "finding": "string",
      "supportingMetric": "string",
      "businessInterpretation": "string",
      "suggestedAction": "string",
      "limitationOrUncertainty": "string"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text || '{}';
    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      // If parsing fails, extract JSON block if any
      const match = responseText.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        throw new Error('Unable to parse JSON from AI model response');
      }
    }

    return res.json({
      source: 'gemini-3.8-flash',
      insights: parsed.insights || parsed,
    });
  } catch (error: any) {
    console.error('Gemini insights generation error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to generate AI insights',
      fallbackRequired: true,
    });
  }
});

// Production / Dev handling
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`RetailIQ server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
