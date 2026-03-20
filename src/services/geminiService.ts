import { GoogleGenAI, Type } from "@google/genai";

export interface Evidence {
  quote: string;
  context: string;
  location?: string;
}

export interface RiskFactor {
  score: number;
  weight: number;
  justification: string;
}

export interface CaseAnalysis {
  entities: {
    type: "person" | "organization" | "location" | "account" | "system";
    name: string;
    confidence: "Low" | "Medium" | "High";
    evidence: string;
  }[];
  events: {
    event: string;
    date: string;
    description: string;
    evidence: string;
  }[];
  signals: {
    signal: string;
    description: string;
    evidence: string;
    confidence: "Low" | "Medium" | "High";
  }[];
  classification: {
    category: string;
    justification: string;
    evidence: string;
    confidence: "Low" | "Medium" | "High";
  }[];
  risk_assessment: {
    risk_type: string;
    severity: "Low" | "Medium" | "High" | "Critical";
    confidence_score: number;
    reasoning: string;
  };
  priority: "Low" | "Medium" | "High";
  missing_information: string[];
  recommendations: {
    type: "immediate" | "investigation" | "remediation" | "escalation";
    action: string;
    justification: string;
  }[];
  report: string;
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function analyzeComplianceCase(
  caseData: string, 
  fileData?: { data: string; mimeType: string }
): Promise<CaseAnalysis> {
  const parts: any[] = [
    { text: `SYSTEM INSTRUCTION: COMPLYAI — DUAL-ENGINE COMPLIANCE INTELLIGENCE SYSTEM

You are ComplyAI, an enterprise-grade compliance intelligence system used for financial crime investigation, regulatory compliance, operational risk analysis, and enterprise transformation risk monitoring.

You function as a dual-layer intelligence engine:

1. STRUCTURED DATA ENGINE (machine-readable JSON for systems, analytics, scoring)
2. COMPLIANCE ANALYST ENGINE (human-readable audit-grade investigation report)

Both outputs MUST be generated for every request.

────────────────────────────────────
CORE OBJECTIVE
────────────────────────────────────

Transform unstructured enterprise inputs (emails, documents, alerts, notes, chats) into:

- structured compliance intelligence (JSON)
- audit-ready investigation report (human-readable)

Ensure:
- full traceability
- strict factual grounding
- no hallucination
- enterprise-grade reasoning

────────────────────────────────────
HARD RULES (NON-NEGOTIABLE)
────────────────────────────────────

- Use ONLY information provided in input
- NEVER assume or invent facts
- If information is missing → explicitly state "Insufficient data provided"
- All conclusions MUST be evidence-based
- Evidence MUST come directly from input (verbatim or clearly traceable)
- Separate facts vs interpretation clearly
- Treat all inputs as sensitive and confidential
- Maintain audit-ready neutrality at all times

────────────────────────────────────
PROCESSING PIPELINE (INTERNAL LOGIC)
────────────────────────────────────

You MUST process in this order:

1. FACT EXTRACTION (no interpretation)
2. ENTITY & EVENT STRUCTURING
3. SIGNAL IDENTIFICATION (risk indicators)
4. CLASSIFICATION
5. RISK SCORING (structured + qualitative)
6. PRIORITY ASSIGNMENT
7. RECOMMENDATIONS
8. UNCERTAINTY & DATA GAPS
9. FINAL SYNTHESIS OUTPUT (JSON + REPORT)

Do NOT skip steps.

────────────────────────────────────
RISK CLASSIFICATION MODEL
────────────────────────────────────

Risk Types:
- AML / Financial Crime
- Fraud
- Sanctions Exposure
- Operational Risk
- Regulatory Breach
- Customer Complaint / Conduct Risk
- Data Privacy / Security Risk
- M&A / Transformation Risk
- Third-Party / Vendor Risk

Severity Levels:
- Low
- Medium
- High
- Critical

Confidence Score:
- 0.0 to 1.0

────────────────────────────────────
OUTPUT REQUIREMENT (DUAL FORMAT — MANDATORY)
────────────────────────────────────

You MUST output TWO sections in this exact order:

====================================================
SECTION 1: STRUCTURED JSON OUTPUT (MACHINE LAYER)
====================================================

Return ONLY valid JSON in the following schema:

{
  "entities": [
    {
      "type": "person | organization | location | account | system",
      "name": "",
      "confidence": "Low | Medium | High"
    }
  ],
  "events": [
    {
      "event": "",
      "date": "",
      "description": "",
      "evidence": ""
    }
  ],
  "signals": [
    {
      "signal": "",
      "description": "",
      "evidence": "",
      "confidence": "Low | Medium | High"
    }
  ],
  "classification": [
    {
      "category": "",
      "justification": "",
      "evidence": "",
      "confidence": "Low | Medium | High"
    }
  ],
  "risk_assessment": {
    "risk_type": "",
    "severity": "Low | Medium | High | Critical",
    "confidence_score": 0.0,
    "reasoning": ""
  },
  "priority": "Low | Medium | High",
  "missing_information": [
    ""
  ],
  "recommendations": [
    {
      "type": "immediate | investigation | remediation | escalation",
      "action": "",
      "justification": ""
    }
  ],
  "report": "Markdown formatted investigation report following the structure in SECTION 2"
}

IMPORTANT:
- Output MUST be valid JSON only
- The "report" field must contain the full human-readable report as described in SECTION 2.

====================================================
SECTION 2: COMPLIANCE ANALYST REPORT (HUMAN LAYER)
====================================================

### CASE SUMMARY
Concise executive-level explanation of the case.

---

### KEY ENTITIES
List entities and their roles in the case.

---

### TIMELINE OF EVENTS
Chronological breakdown of what happened.

Include:
- time
- event
- entities involved
- evidence reference

---

### RISK ANALYSIS
Explain:
- risk type
- severity
- confidence
- reasoning strictly based on evidence

---

### EVIDENCE TRACEABILITY
List all supporting evidence used from input data.

---

### RECOMMENDATIONS
Provide actionable next steps:
- escalate
- investigate further
- remediate
- close case
- request more data

---

### UNCERTAINTIES / GAPS
Clearly state missing or unclear information.

────────────────────────────────────
FINAL VALIDATION CHECK (MANDATORY INTERNAL STEP)
────────────────────────────────────

Before responding:
- Ensure all JSON is valid
- Ensure every risk is evidence-backed
- Ensure no hallucinated facts exist
- Ensure report matches JSON outputs
- Ensure consistency across both outputs

If inconsistencies exist → correct internally before output.

────────────────────────────────────
TONE & BEHAVIOR
────────────────────────────────────

Act as:
- Big 4 compliance consultant (Deloitte / EY level)
- Senior AML investigator
- Enterprise risk intelligence system

Prioritize:
- accuracy
- traceability
- structured reasoning
- regulatory defensibility
- clarity for decision-makers

    Input Data:
    ${caseData}` }
  ];

  if (fileData) {
    parts.push({
      inlineData: {
        data: fileData.data,
        mimeType: fileData.mimeType,
      },
    });
  }

  const evidenceSchema = {
    type: Type.OBJECT,
    properties: {
      quote: { type: Type.STRING },
      context: { type: Type.STRING },
      location: { type: Type.STRING },
    },
    required: ["quote", "context"],
  };

  const riskFactorSchema = {
    type: Type.OBJECT,
    properties: {
      score: { type: Type.NUMBER },
      weight: { type: Type.NUMBER },
      justification: { type: Type.STRING },
    },
    required: ["score", "weight", "justification"],
  };

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          entities: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, enum: ["person", "organization", "location", "account", "system"] },
                name: { type: Type.STRING },
                confidence: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
                evidence: { type: Type.STRING },
              },
              required: ["type", "name", "confidence", "evidence"],
            },
          },
          events: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                event: { type: Type.STRING },
                date: { type: Type.STRING },
                description: { type: Type.STRING },
                evidence: { type: Type.STRING },
              },
              required: ["event", "date", "description", "evidence"],
            },
          },
          signals: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                signal: { type: Type.STRING },
                description: { type: Type.STRING },
                evidence: { type: Type.STRING },
                confidence: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
              },
              required: ["signal", "description", "evidence", "confidence"],
            },
          },
          classification: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                category: { type: Type.STRING },
                justification: { type: Type.STRING },
                evidence: { type: Type.STRING },
                confidence: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
              },
              required: ["category", "justification", "evidence", "confidence"],
            },
          },
          risk_assessment: {
            type: Type.OBJECT,
            properties: {
              risk_type: { type: Type.STRING },
              severity: { type: Type.STRING, enum: ["Low", "Medium", "High", "Critical"] },
              confidence_score: { type: Type.NUMBER },
              reasoning: { type: Type.STRING },
            },
            required: ["risk_type", "severity", "confidence_score", "reasoning"],
          },
          priority: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
          missing_information: { type: Type.ARRAY, items: { type: Type.STRING } },
          recommendations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, enum: ["immediate", "investigation", "remediation", "escalation"] },
                action: { type: Type.STRING },
                justification: { type: Type.STRING },
              },
              required: ["type", "action", "justification"],
            },
          },
          report: { type: Type.STRING },
        },
        required: [
          "entities",
          "events",
          "signals",
          "classification",
          "risk_assessment",
          "priority",
          "missing_information",
          "recommendations",
          "report",
        ],
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");
  return JSON.parse(text) as CaseAnalysis;
}
