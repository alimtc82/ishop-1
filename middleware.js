const SOCIAL_CRAWLERS = /facebookexternalhit|facebot|twitterbot|linkedinbot|whatsapp|telegrambot|discordbot|slackbot|googlebot|bingbot|pinterest|skypeuripreview|instagram/i;

export async function middleware(request) {
  const userAgent = request.headers.get('user-agent') || '';
  if (!SOCIAL_CRAWLERS.test(userAgent)) return;

  const url = new URL(request.url);
  const match = url.pathname.match(/^\/(?:product|d)\/([^/]+)\/?$/);
  if (!match) return;

  const previewUrl = new URL('/api/product-preview', url.origin);
  previewUrl.searchParams.set('id', match[1]);
  previewUrl.searchParams.set('path', url.pathname);

  try {
    const preview = await fetch(previewUrl, {
      headers: {
        'user-agent': userAgent,
        'x-forwarded-host': url.host,
        'x-forwarded-proto': url.protocol.replace(':', ''),
      },
    });
    if (!preview.ok) return;

    const html = await preview.text();
    return new Response(html, {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'public, s-maxage=60, stale-while-revalidate=300',
        'x-robots-tag': 'noindex',
      },
    });
  } catch (_) {
    return;
  }
}

export const config = { matcher: ['/product/:path*', '/d/:path*'] };
