const SOCIAL_CRAWLERS = /facebookexternalhit|facebot|twitterbot|linkedinbot|whatsapp|telegrambot|discordbot|slackbot|googlebot|bingbot|pinterest|skypeuripreview|instagram/i;

export function middleware(request) {
  const userAgent = request.headers.get('user-agent') || '';
  if (!SOCIAL_CRAWLERS.test(userAgent)) return;

  const url = new URL(request.url);
  const match = url.pathname.match(/^\/product\/([^/]+)\/?$/);
  if (!match) return;

  const previewUrl = new URL('/api/product-preview', url.origin);
  previewUrl.searchParams.set('id', match[1]);
  return Response.redirect(previewUrl, 307);
}

export const config = { matcher: ['/product/:path*'] };
