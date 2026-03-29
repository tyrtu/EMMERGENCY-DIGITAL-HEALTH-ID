import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";
import QRCode from "https://esm.sh/qrcode@1.5.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    // Fetch avatar as base64 if available
    let avatarDataUri = "";
    if (profile?.avatar_url) {
      try {
        const avatarRes = await fetch(profile.avatar_url);
        if (avatarRes.ok) {
          const buf = await avatarRes.arrayBuffer();
          const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
          const contentType = avatarRes.headers.get("content-type") || "image/jpeg";
          avatarDataUri = `data:${contentType};base64,${base64}`;
        }
      } catch { /* fallback to initials */ }
    }

    const { data: medical } = await supabase
      .from("patient_medical_data")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    const name = profile?.full_name || "—";
    const healthId = profile?.health_id || "—";
    const dob = profile?.date_of_birth || "—";
    const gender = profile?.gender || "—";
    const bloodType = medical?.blood_type || "—";
    const allergies = (medical?.allergies || []).join(", ") || "None";
    const emergencyName = medical?.emergency_contact_name || "—";
    const emergencyPhone = medical?.emergency_contact_phone || "—";

    // Generate QR code as SVG string
    const qrPayload = JSON.stringify({
      v: 1,
      id: healthId,
      name,
      dob,
      gender,
      blood: bloodType,
      allergies: medical?.allergies || [],
      conditions: medical?.chronic_conditions || [],
      medications: medical?.current_medications || [],
      emergency: medical?.emergency_contact_name
        ? {
            name: medical.emergency_contact_name,
            phone: medical.emergency_contact_phone,
            relation: medical.emergency_contact_relation,
          }
        : null,
    });

    const qrSvgString = await QRCode.toString(qrPayload, {
      type: "svg",
      margin: 1,
      width: 160,
      color: { dark: "#1a2332", light: "#ffffff" },
    });

    // Extract inner SVG content (remove outer <svg> wrapper)
    const qrInner = qrSvgString
      .replace(/<svg[^>]*>/, "")
      .replace(/<\/svg>/, "");

    // Card dimensions: standard ID card ratio (85.6 × 53.98 mm) scaled up
    const W = 1012;
    const H = 638;

    // Initials for avatar
    const initials = name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="headerGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#1a56db"/>
      <stop offset="100%" stop-color="#1e40af"/>
    </linearGradient>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f8fafc"/>
      <stop offset="100%" stop-color="#e2e8f0"/>
    </linearGradient>
    <clipPath id="photoClip">
      <rect x="40" y="195" width="140" height="170" rx="10"/>
    </clipPath>
    <clipPath id="cardClip">
      <rect width="${W}" height="${H}" rx="24"/>
    </clipPath>
    <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%">
      <feDropShadow dx="0" dy="2" stdDeviation="6" flood-opacity="0.12"/>
    </filter>
  </defs>

  <!-- Card background -->
  <rect width="${W}" height="${H}" rx="24" fill="url(#bgGrad)" filter="url(#shadow)"/>
  <rect width="${W}" height="${H}" rx="24" fill="none" stroke="#cbd5e1" stroke-width="1.5"/>

  <!-- Header band -->
  <g clip-path="url(#cardClip)">
    <rect width="${W}" height="160" fill="url(#headerGrad)"/>
  </g>

  <!-- Header content -->
  <g fill="#ffffff">
    <!-- Medical cross icon -->
    <rect x="40" y="38" width="44" height="44" rx="10" fill="rgba(255,255,255,0.2)"/>
    <rect x="54" y="48" width="16" height="24" rx="2" fill="#ffffff"/>
    <rect x="50" y="54" width="24" height="12" rx="2" fill="#ffffff"/>

    <text x="96" y="60" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="700" fill="#ffffff">EMERGENCY HEALTH ID</text>
    <text x="96" y="82" font-family="Arial, Helvetica, sans-serif" font-size="13" fill="rgba(255,255,255,0.75)">Digital Medical Identity Card</text>

    <!-- ID Number on right -->
    <rect x="${W - 270}" y="30" width="240" height="56" rx="10" fill="rgba(255,255,255,0.15)"/>
    <text x="${W - 150}" y="54" font-family="'Courier New', monospace" font-size="12" fill="rgba(255,255,255,0.7)" text-anchor="middle">HEALTH ID</text>
    <text x="${W - 150}" y="76" font-family="'Courier New', monospace" font-size="18" font-weight="700" fill="#ffffff" text-anchor="middle">${healthId}</text>
  </g>

  <!-- Decorative stripe -->
  <g clip-path="url(#cardClip)">
    <rect y="148" width="${W}" height="12" fill="#f59e0b"/>
  </g>

  <!-- Photo area -->
  <rect x="40" y="195" width="140" height="170" rx="10" fill="#e2e8f0" stroke="#cbd5e1" stroke-width="1"/>
  ${avatarDataUri ? `
    <image href="${avatarDataUri}" x="40" y="195" width="140" height="170" clip-path="url(#photoClip)" preserveAspectRatio="xMidYMid slice"/>
  ` : `
    <circle cx="110" cy="260" r="35" fill="#94a3b8"/>
    <text x="110" y="268" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" fill="#ffffff" text-anchor="middle">${initials}</text>
    <text x="110" y="350" font-family="Arial, Helvetica, sans-serif" font-size="9" fill="#94a3b8" text-anchor="middle">PHOTO</text>
  `}

  <!-- Patient info -->
  <g font-family="Arial, Helvetica, sans-serif">
    <!-- Name -->
    <text x="210" y="208" font-size="11" fill="#64748b">FULL NAME</text>
    <text x="210" y="230" font-size="20" font-weight="700" fill="#1a2332">${escapeXml(name)}</text>

    <!-- Row: DOB | Gender | Blood -->
    <text x="210" y="268" font-size="11" fill="#64748b">DATE OF BIRTH</text>
    <text x="210" y="288" font-size="15" font-weight="600" fill="#1a2332">${escapeXml(dob)}</text>

    <text x="410" y="268" font-size="11" fill="#64748b">GENDER</text>
    <text x="410" y="288" font-size="15" font-weight="600" fill="#1a2332">${escapeXml(gender)}</text>

    <text x="560" y="268" font-size="11" fill="#64748b">BLOOD TYPE</text>
    <rect x="555" y="274" width="60" height="28" rx="6" fill="#fee2e2"/>
    <text x="585" y="294" font-size="16" font-weight="700" fill="#dc2626" text-anchor="middle">${escapeXml(bloodType)}</text>

    <!-- Allergies -->
    <text x="210" y="330" font-size="11" fill="#64748b">ALLERGIES</text>
    <text x="210" y="350" font-size="13" font-weight="500" fill="#1a2332">${escapeXml(truncate(allergies, 60))}</text>

    <!-- Emergency contact -->
    <text x="210" y="385" font-size="11" fill="#64748b">EMERGENCY CONTACT</text>
    <text x="210" y="405" font-size="13" font-weight="500" fill="#1a2332">${escapeXml(emergencyName)} · ${escapeXml(emergencyPhone)}</text>
  </g>

  <!-- QR Code section -->
  <rect x="${W - 220}" y="195" width="190" height="190" rx="12" fill="#ffffff" stroke="#e2e8f0" stroke-width="1"/>
  <g transform="translate(${W - 205}, 210)">
    ${qrInner}
  </g>
  <text x="${W - 125}" y="400" font-family="Arial, Helvetica, sans-serif" font-size="9" fill="#94a3b8" text-anchor="middle">SCAN FOR EMERGENCY DATA</text>

  <!-- Footer -->
  <g clip-path="url(#cardClip)">
    <rect y="${H - 80}" width="${W}" height="80" fill="#f1f5f9"/>
    <line x1="0" y1="${H - 80}" x2="${W}" y2="${H - 80}" stroke="#e2e8f0" stroke-width="1"/>
  </g>
  <g font-family="Arial, Helvetica, sans-serif">
    <text x="40" y="${H - 48}" font-size="10" fill="#94a3b8">This card contains critical medical information for emergency responders.</text>
    <text x="40" y="${H - 30}" font-size="10" fill="#94a3b8">Generated by Emergency Health ID System</text>
    <text x="${W - 40}" y="${H - 38}" font-size="10" fill="#94a3b8" text-anchor="end">Valid Until Revoked</text>
  </g>
</svg>`;

    return new Response(svg, {
      headers: {
        ...corsHeaders,
        "Content-Type": "image/svg+xml",
        "Content-Disposition": `attachment; filename="${healthId}-health-card.svg"`,
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
}
