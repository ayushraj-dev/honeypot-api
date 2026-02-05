export default function handler(req, res) {
  // 1. CORS Configuration

  
  // allow * for hackathon testing purposes

  
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-api-key'
  );

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 2. Method Validation
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  try {
    // 3. Authentication
    const clientApiKey = req.headers['x-api-key'];
    const serverApiKey = process.env.HONEYPOT_API_KEY;

    if (!serverApiKey || clientApiKey !== serverApiKey) {
      return res.status(401).json({ error: 'Unauthorized. Invalid or missing API Key.' });
    }

    // 4. Input Validation
    const { message } = req.body || {};
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Bad Request. JSON body must contain a "message" string.' });
    }

    // --- LOGIC START ---

    // Configuration: Scam Indicators
    const SCAM_KEYWORDS = [
      "lottery", "urgent", "password", "bank", "winner", "fund", "verify",
      "account", "prize", "million", "usd", "transfer", "inherit",
      "crypto", "btc", "investment", "congratulations", "claim", "expire",
      "otp", "pin", "manager", "customs", "delivery", "fee", "win", "cash"
    ];

    // Configuration: Agent Bait Scripts
    const BAIT_RESPONSES = [
      "Oh really? That sounds amazing! Tell me more about how I can claim it.",
      "Is this completely safe? I've been hacked before so I am worried.",
      "I want to claim the prize immediately. Do you need my details?",
      "Wow! I never win anything. This must be my lucky day. What is the next step?",
      "Can I call you to discuss the transfer details?",
      "I am currently at the bank. Should I ask the teller to help me with this?",
      "My grandson says this might be a scam, but I trust you. Go on.",
      "Please hold on, I am looking for my credit card.",
      "I am interested. Kindly explain the procedure clearly."
    ];

    const SAFE_RESPONSE = "Message received. No action required.";

    // 5. Analysis & Detection
    const lowerMessage = message.toLowerCase();
    const detectedKeywords = SCAM_KEYWORDS.filter(keyword => lowerMessage.includes(keyword));
    const isScam = detectedKeywords.length > 0;

    // Calculate a simple threat score (0-10)
    // 2 points per keyword, capped at 10
    const score = Math.min(detectedKeywords.length * 2, 10);

    // 6. Intelligence Extraction (Regex)
    // Extracts standard URL patterns (http/https)
    const urlRegex = /https?:\/\/[^\s]+/g;
    const foundLinks = message.match(urlRegex) || [];

    // Extracts UPI IDs (e.g., name@bank, user.name@upi)
    // Pattern: 2+ alphanumeric/dot/hyphen/underscore chars + @ + 2+ alpha chars
    const upiRegex = /[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}/g;
    const foundUpi = message.match(upiRegex) || [];

    // 7. Agent Response Selection
    let agentResponse = SAFE_RESPONSE;
    if (isScam) {
      const randomIndex = Math.floor(Math.random() * BAIT_RESPONSES.length);
      agentResponse = BAIT_RESPONSES[randomIndex];
    }

    // 8. Output Construction
    const payload = {
      success: true,
      analysis: {
        is_scam: isScam,
        score: score,
        detected_keywords: detectedKeywords
      },
      extracted_data: {
        upi_ids: foundUpi,
        links: foundLinks
      },
      agent_response: agentResponse
    };

    return res.status(200).json(payload);

  } catch (error) {
    // 9. Safety Net
    console.error('Honeypot API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      details: error.message
    });
  }

}
