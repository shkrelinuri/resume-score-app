import pdfParse from "pdf-parse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function verifyLicenseKey(licenseKey) {
  if (!licenseKey || !process.env.GUMROAD_PRODUCT_PERMALINK) {
    return false;
  }

  const params = new URLSearchParams();
  params.append("product_permalink", process.env.GUMROAD_PRODUCT_PERMALINK);
  params.append("license_key", licenseKey);

  const response = await fetch("https://api.gumroad.com/v2/licenses/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const data = await response.json();
  return Boolean(data.success);
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("resume");
    const targetRole = formData.get("targetRole") || "not specified; give a general resume assessment";
    const jobDescription = formData.get("jobDescription") || "not provided; assess keyword match generally";
    const licenseKey = String(formData.get("licenseKey") || "").trim();

    if (!file) {
      return Response.json({ error: "No resume file received." }, { status: 400 });
    }

    if (process.env.DEMO_MODE === "true" && !licenseKey) {
      return Response.json({
        overallScore: 54,
        verdict: "Promising, but not interview-ready",
        summary: "The structure is usable, but the resume is not proving enough impact yet. Stronger metrics, sharper bullets, and closer keyword alignment would materially improve it.",
        categories: [
          { name: "ATS Compatibility", score: 68 },
          { name: "Quantified Impact", score: 42 },
          { name: "Clarity", score: 61 },
          { name: "Keyword Match", score: targetRole === "not specified; give a general resume assessment" ? 49 : 58 },
        ],
      });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let resumeText;
    try {
      const parsed = await pdfParse(buffer);
      resumeText = parsed.text;
    } catch (e) {
      return Response.json(
        { error: "Couldn't read that PDF. Please try a different file." },
        { status: 400 }
      );
    }

    if (!resumeText || resumeText.trim().length < 50) {
      return Response.json(
        { error: "That resume looks too short or empty to score." },
        { status: 400 }
      );
    }

    let fullReport = false;
    if (licenseKey) {
      try {
        fullReport = await verifyLicenseKey(licenseKey);
      } catch (error) {
        console.error("Gumroad license error:", error);
        return Response.json({ error: "License verification is unavailable right now." }, { status: 502 });
      }

      if (!fullReport) {
        return Response.json({ error: "That license key could not be verified." }, { status: 402 });
      }
    }

      const prompt = `You are a skeptical, exacting resume reviewer and ATS specialist. Your job is to find reasons a recruiter would reject this resume, not to encourage the applicant. Be useful but brutally honest. Do not inflate scores to be polite.

Target job title: ${targetRole}

Job description:
"""
${String(jobDescription).slice(0, 8000)}
"""

Resume text:
"""
${resumeText.slice(0, 12000)}
"""

Score the resume across these four categories, each out of 100. Use this strict scale: 90-100 is exceptional and rare; 75-89 is strong and interview-ready; 60-74 is acceptable but has meaningful weaknesses; 40-59 is weak and likely to lose interviews; below 40 is seriously deficient. A typical imperfect resume should land between 45 and 70, not above 80.
- ATS Compatibility (formatting, parseable structure, standard section headers)
- Quantified Impact (do bullets include numbers/metrics/outcomes?)
- Clarity (concise language, no jargon overload, active voice)
- Keyword Match (relevance to the target job title and job description, if given)

Apply these penalties when relevant:
- Deduct for vague responsibilities, empty buzzwords, repeated verbs, unexplained employment gaps, weak summaries, missing metrics, or bullets that describe tasks without outcomes.
- If no target role or job description is provided, do not guess keyword relevance; score Keyword Match conservatively.
- Do not reward a clean layout enough to offset weak evidence of results.
- Only call a resume interview-ready when the evidence supports it.

Then give:
- overallScore: a single 0-100 score (a reasonable weighted average)
- verdict: a punchy one-line summary (under 10 words)
- summary: a general 1-2 sentence assessment of the resume's strongest signal and biggest weakness. Do not mention a target role when one was not provided.
- 4-6 specific, actionable rewrite suggestions referencing actual content from the resume

Respond with ONLY valid JSON, no other text, no markdown code fences, in exactly this shape:
{
  "overallScore": number,
  "verdict": string,
  "summary": string,
  "categories": [
    {"name": "ATS Compatibility", "score": number},
    {"name": "Quantified Impact", "score": number},
    {"name": "Clarity", "score": number},
    {"name": "Keyword Match", "score": number}
  ],
  "suggestions": [string, string, string]
}`;

    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json(
        { error: "AI scoring is not configured yet. Add ANTHROPIC_API_KEY to .env.local and restart the app." },
        { status: 503 }
      );
    }

    const apiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
        max_tokens: 1500,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!apiRes.ok) {
      const errText = await apiRes.text();
      console.error("Anthropic API error:", errText);
      return Response.json(
        { error: "Scoring service is unavailable right now." },
        { status: 502 }
      );
    }

    const apiData = await apiRes.json();
    const textBlock = (apiData.content || []).find((b) => b.type === "text");
    if (!textBlock) {
      return Response.json({ error: "Unexpected response from scoring service." }, { status: 502 });
    }

    let cleaned = textBlock.text.trim();
    cleaned = cleaned.replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();

    let scoreData;
    try {
      scoreData = JSON.parse(cleaned);
    } catch (e) {
      console.error("Failed to parse model JSON:", cleaned);
      return Response.json({ error: "Couldn't parse the score result." }, { status: 502 });
    }

    if (!fullReport) {
      delete scoreData.suggestions;
    }

    return Response.json(scoreData);
  } catch (err) {
    console.error("Score route error:", err);
    return Response.json({ error: "Something went wrong." }, { status: 500 });
  }
}
