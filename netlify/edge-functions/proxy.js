export default async (request, context) => {
  const urlObj = new URL(request.url);
  const targetUrl = urlObj.searchParams.get("url");

  if (!targetUrl) return new Response("Proxy Active 🚀", { status: 200 });

  try {
    const decodedUrl = decodeURIComponent(targetUrl);
    
    // FETCH WITH STEALTH HEADERS
    const response = await fetch(decodedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": new URL(decodedUrl).origin + "/",
        "Accept": "*/*"
      }
    });

    if (!response.ok) return new Response(`Origin Error: ${response.status}`, { status: response.status });

    // IF PLAYLIST (.m3u8): REWRITE THE LINKS
    if (decodedUrl.includes(".m3u8")) {
      let body = await response.text();
      const originUrl = new URL(decodedUrl);
      const baseUrl = originUrl.origin + originUrl.pathname.substring(0, originUrl.pathname.lastIndexOf('/') + 1);

      const rewrittenBody = body.split('\n').map(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const absoluteUrl = trimmed.startsWith('http') ? trimmed : baseUrl + trimmed;
          // Dynamically route back to the current path
          return `${urlObj.origin}${urlObj.pathname}?url=${encodeURIComponent(absoluteUrl)}`;
        }
        return line;
      }).join('\n');

      return new Response(rewrittenBody, {
        headers: { 
          "Content-Type": "application/vnd.apple.mpegurl", 
          "Access-Control-Allow-Origin": "*" 
        }
      });
    }

    // IF VIDEO (.ts): STREAM IT (No 10s timeout!)
    return new Response(response.body, {
      headers: {
        "Content-Type": "video/mp2t",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600"
      }
    });

  } catch (err) {
    return new Response(err.message, { status: 500 });
  }
};

// This tells Netlify to use this script for both your paths
export const config = { path: ["/api/proxy", "/api/ts"] };
