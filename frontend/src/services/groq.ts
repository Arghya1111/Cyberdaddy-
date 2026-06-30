import Groq from 'groq-sdk';
import type { ChatCompletionContentPart, ChatCompletionMessageParam } from 'groq-sdk/resources/chat/completions';
import { GroqMessage, RiskScore } from '@/types';

// ─── Client (singleton) ──────────────────────────────────

function getGroqApiKey(): string {
  const key = process.env.NEXT_PUBLIC_GROQ_API_KEY?.trim() ?? '';
  if (!key) {
    throw new Error(
      'Groq API key is not configured. Add NEXT_PUBLIC_GROQ_API_KEY to frontend/.env.local ' +
        '(get a key at console.groq.com/keys), then restart the dev server.'
    );
  }
  return key;
}

const groq = new Groq({
  apiKey: getGroqApiKey(),
  dangerouslyAllowBrowser: true, // MVP: client-side calls
});

const SYSTEM_PROMPT = `You are CyberDaddy, an expert AI cybersecurity assistant built to protect individuals and families from online scams, phishing, and digital threats. 

Your personality:
- Professional yet approachable
- Concise and clear explanations
- Always prioritize user safety
- Use emojis sparingly for clarity
- Format responses with markdown for readability

When analyzing screenshots or images:
- Identify phishing indicators, scam patterns, malicious URLs
- Check for social engineering tactics
- Look for urgency manipulation, fake branding, suspicious links
- Provide actionable next steps

Available slash commands users can use:
/help - Show available commands
/pay - Show subscription plans  
/dashboard - Open cybersecurity dashboard
/profile - Show user profile
/family - Show family protection circle
/scan - Start screenshot analysis
/history - Show previous scans
/settings - Open settings`;

// ─── Chat Completion ─────────────────────────────────────

export async function chatCompletion(
  messages: GroqMessage[],
  onChunk?: (chunk: string) => void
): Promise<string> {
  const allMessages: ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages.map((m) => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
    })) as ChatCompletionMessageParam[],
  ];

  if (onChunk) {
    const stream = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: allMessages,
      stream: true,
      temperature: 0.7,
      max_tokens: 1024,
    });

    let full = '';
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? '';
      full += delta;
      onChunk(delta);
    }
    return full;
  } else {
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: allMessages,
      temperature: 0.7,
      max_tokens: 1024,
    });
    return response.choices[0]?.message?.content ?? '';
  }
}


// ─── Screenshot Analysis ──────────────────────────────────

export async function analyzeScreenshot(base64Image: string): Promise<string> {
  const content: ChatCompletionContentPart[] = [
    {
      type: 'text',
      text: `Analyze this screenshot for cybersecurity threats. Look for:
1. Phishing indicators (fake login pages, urgency tactics, suspicious URLs)
2. Scam patterns (lottery wins, fake prizes, too-good-to-be-true offers)
3. Social engineering (impersonation, fear tactics, fake authority)
4. Malicious content (fake software, dangerous downloads)
5. Privacy risks (data harvesting forms, suspicious permissions)

Provide a detailed analysis with:
- Overall threat assessment
- Specific red flags found
- Risk level (Safe/Low/Medium/High/Critical)
- Recommended actions
- Technical indicators`,
    },
    {
      type: 'image_url',
      image_url: { url: base64Image },
    },
  ];

  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content },
  ];

  const response = await groq.chat.completions.create({
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    messages,
    temperature: 0.3,
    max_tokens: 1500,
  });

  return response.choices[0]?.message?.content ?? 'Unable to analyze image.';
}


// ─── Risk Score Generation ────────────────────────────────

export async function generateRiskScore(analysis: string): Promise<RiskScore> {
  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content:
          'You are a cybersecurity risk scoring engine. Output ONLY valid JSON with no markdown.',
      },
      {
        role: 'user',
        content: `Based on this security analysis, generate a risk score JSON object:

Analysis: ${analysis}

Return ONLY this JSON structure (no markdown, no explanation):
{
  "score": <number 0-100>,
  "level": <"safe"|"low"|"medium"|"high"|"critical">,
  "category": <string, e.g. "Phishing", "Scam", "Malware", "Safe Content">,
  "explanation": <one sentence summary>,
  "flags": [<array of up to 5 specific red flag strings>]
}`,
      },
    ],
    temperature: 0.1,
    max_tokens: 300,
  });

  try {
    const raw = response.choices[0]?.message?.content ?? '{}';
    const cleaned = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned) as RiskScore;
  } catch {
    return {
      score: 50,
      level: 'medium',
      category: 'Unknown',
      explanation: 'Risk analysis could not be completed.',
      flags: [],
    };
  }
}

// ─── Explain Threat ───────────────────────────────────────

export async function explainThreat(threatText: string): Promise<string> {
  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Explain this cybersecurity threat in simple terms that a non-technical user can understand, and provide specific steps to stay safe:\n\n${threatText}`,
      },
    ],
    temperature: 0.6,
    max_tokens: 800,
  });

  return response.choices[0]?.message?.content ?? '';
}
