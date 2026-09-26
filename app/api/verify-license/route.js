export async function POST(request) {
  try {
    const { licenseKey } = await request.json();

    if (!licenseKey) {
      return Response.json({ valid: false, error: "No license key provided." }, { status: 400 });
    }

    const params = new URLSearchParams();
    params.append("product_permalink", process.env.GUMROAD_PRODUCT_PERMALINK);
    params.append("license_key", licenseKey);

    const res = await fetch("https://api.gumroad.com/v2/licenses/verify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    const data = await res.json();

    // Gumroad returns { success: true, purchase: {...} } for a valid key,
    // or { success: false, message: "..." } for an invalid one.
    if (data.success) {
      return Response.json({ valid: true });
    }
    return Response.json({ valid: false });
  } catch (err) {
    console.error("License verify error:", err);
    return Response.json({ valid: false, error: "Verification failed." }, { status: 500 });
  }
}
