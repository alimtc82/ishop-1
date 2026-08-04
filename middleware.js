const SOCIAL_CRAWLERS = /facebookexternalhit|facebot|twitterbot|linkedinbot|whatsapp|telegrambot|discordbot|slackbot|googlebot|bingbot|pinterest|skypeuripreview|instagram/i;

export function middleware(request) {
  const userAgent = request.headers.get('user-agent') || '';
  if (!SOCIAL_CRAWLERS.test(userAgent)) return;

  const url = new URL(request.url);

  const productMatch = url.pathname.match(/^\/product\/([^/]+)\/?$/);
  if (productMatch) {
    const previewUrl = new URL('/api/product-preview', url.origin);
    previewUrl.searchParams.set('id', productMatch[1]);
    previewUrl.searchParams.set('path', url.pathname);
    return Response.redirect(previewUrl, 307);
  }

  const deviceMatch = url.pathname.match(/^\/d\/([^/]+)\/?$/);
  if (deviceMatch) {
    const previewUrl = new URL('/api/device-preview', url.origin);
    previewUrl.searchParams.set('code', deviceMatch[1]);
    return Response.redirect(previewUrl, 307);
  }
}

export const config = { matcher: ['/product/:path*', '/d/:path*'] };
