export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
    const payload = JSON.parse(event.body || "{}");
    const {
      product = "Premium Detergent",
      audience = "busy families",
      tone = "persuasive, upbeat, and trustworthy",
      offer = "10% off first order",
      call_to_action = "Shop now",
      language = "en",
      variants = 2,
      brand = { name: "OmniStudio", valueProps: ["eco-friendly", "hypoallergenic", "premium cleaning power"] }
    } = payload;

    const n = Math.min(Math.max(Number(variants) || 2, 1), 5);

    // Helper: safe JSON
    const respond = (arr) => ({
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok: true, variants: arr })
    });

    // If OPENAI_API_KEY exists, try GPT
    const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_APIKEY || process.env.OPENAI_KEY;
    if (apiKey) {
      try {
        const sys = [
          "You write high-converting email campaigns with crisp subjects (<=55 chars) and scannable bodies.",
          "Return strictly JSON with {variants:[{subject, body_html}...]}.",
          "Body must be HTML: short intro, 3 bulleted benefits, 1 featured image placeholder, strong CTA button, footer with contact."
        ].join(" ");

        const usr = `Language: ${language}
Brand: ${brand?.name||"Brand"}
Value props: ${(brand?.valueProps||[]).join(", ")}
Product: ${product}
Audience: ${audience}
Tone: ${tone}
Offer: ${offer}
CTA: ${call_to_action}
Variants: ${n}
Constraints:
- No spammy words, mobile-first, paragraphs <= 3 lines.
- Use semantic HTML, inline styles minimal, include preview text line (<span style="display:none">...</span>).
- Include {{first_name}} merge tag safely (fallback to "there" if missing).`;

        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "authorization": `Bearer ${apiKey}`,
            "content-type": "application/json"
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            temperature: 0.7,
            messages: [
              { role: "system", content: sys },
              { role: "user", content: usr }
            ],
            response_format: { type: "json_object" }
          })
        });

        if (!res.ok) {
          const txt = await res.text();
          throw new Error(`OpenAI error: ${res.status} ${txt}`);
        }

        const data = await res.json();
        // try to parse a JSON object from assistant message
        const content = data?.choices?.[0]?.message?.content || "{}";
        const parsed = JSON.parse(content);
        if (parsed?.variants && Array.isArray(parsed.variants)) {
          // ensure fields
          const cleaned = parsed.variants.slice(0, n).map(v => ({
            subject: String(v.subject||"").slice(0,120),
            body_html: String(v.body_html||"")
          }));
          return respond(cleaned);
        }
      } catch (err) {
        // fall through to template fallback
        console.warn("AI generation failed, using fallback:", err?.message || err);
      }
    }

    // Fallback: rule-based professional templates (no external cost)
    const benefits = (brand?.valueProps || ["fast stain removal", "fresh long-lasting scent", "gentle on skin"]).slice(0,3);
    const mk = (idx) => {
      const subj = [
        `[${offer}] ${product} for ${audience}`,
        `${product}: cleaner clothes, less effort (${offer})`,
        `${brand?.name||"Our Brand"} • ${product} — ${offer}`
      ][idx % 3];
      const btn = call_to_action || "Shop now";
      const preview = `A cleaner routine starts today — ${offer}.`;
      const bullets = benefits.map(b => `<li>${b}</li>`).join("");
      return {
        subject: subj,
        body_html:
`<div style="font-family:system-ui,Segoe UI,Roboto,Arial; background:#0b1320; color:#e6eefc; padding:24px;">
  <span style="display:none;visibility:hidden;opacity:0;height:0;overflow:hidden">${preview}</span>
  <table role="presentation" width="100%" style="max-width:640px;margin:0 auto;background:#0f1e33;border:1px solid rgba(255,255,255,.08);border-radius:12px;">
    <tr><td style="padding:22px;">
      <h2 style="margin:0 0 10px 0; color:#ffffff;">Hi {{first_name||there}}, meet ${product}</h2>
      <p style="margin:0 0 12px 0; color:#cfe1ff;">Perfect for ${audience}. ${offer ? "Limited offer: "+offer+"." : ""}</p>
      <img alt="${product}" src="https://via.placeholder.com/1200x500?text=${encodeURIComponent(product)}" style="width:100%;height:auto;border-radius:10px;margin:6px 0 14px 0"/>
      <ul style="margin:0 0 14px 20px; padding:0; color:#e6eefc;">${bullets}</ul>
      <div style="margin:16px 0;">
        <a href="#" style="background:#2b3aff;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;display:inline-block">${btn}</a>
      </div>
      <p style="font-size:12px;color:#93a6d1; margin-top:18px;">You’re receiving this because you opted in to updates from ${brand?.name||"our store"}. <br/>Unsubscribe anytime.</p>
    </td></tr>
  </table>
</div>`
      };
    };
    const out = Array.from({ length: n }, (_, i) => mk(i));
    return respond(out);
  } catch (e) {
    return { statusCode: 500, body: "ai-generate-email error: " + (e.message || e) };
  }
}
