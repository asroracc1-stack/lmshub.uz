const puppeteer = require('puppeteer');
const fs = require('fs');

const svgContent = `
<svg 
  width="1200" 
  height="630" 
  viewBox="0 0 1200 630" 
  fill="#f8fafc" 
  xmlns="http://www.w3.org/2000/svg"
>
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f8fafc"/>
      <stop offset="100%" stop-color="#e2e8f0"/>
    </linearGradient>
    <linearGradient id="tealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34d399"/>
      <stop offset="100%" stop-color="#059669"/>
    </linearGradient>
    <filter id="glow" x="-25%" y="-25%" width="150%" height="150%">
      <feGaussianBlur stdDeviation="4" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)" />
  
  <!-- Subtle background patterns -->
  <circle cx="1000" cy="100" r="300" fill="#10b981" opacity="0.05" />
  <circle cx="200" cy="500" r="250" fill="#3b82f6" opacity="0.03" />

  <g transform="translate(370, 235)">
    <g>
      <ellipse cx="78" cy="80" rx="60" ry="20" fill="none" stroke="#10b981" stroke-width="2" transform="rotate(-35 78 80)"/>
      <circle cx="43" cy="33" r="4.5" fill="#10b981"/>
      <circle cx="43" cy="33" r="2.5" fill="white"/>
      <circle cx="118" cy="118" r="3" fill="#10b981" opacity="0.7"/>
      <circle cx="78" cy="80" r="44" fill="none" stroke="#10b981" stroke-width="3.5"/>
      <circle cx="78" cy="80" r="30" fill="none" stroke="#10b981" stroke-width="2.5" opacity="0.5"/>
      <text x="78" y="86" font-family="'Arial Black', 'Helvetica Neue', Arial, sans-serif" font-size="16" font-weight="900" fill="#0f172a" text-anchor="middle" letter-spacing="0.5">LMS</text>
    </g>
    <line x1="152" y1="36" x2="152" y2="124" stroke="#10b981" stroke-width="1.5" opacity="0.3"/>
    
    <text x="172" y="107" font-family="'Arial Black', 'Helvetica Neue', Arial, sans-serif" font-size="60" font-weight="900" fill="#0f172a" letter-spacing="-1">LMS</text>
    <text x="318" y="107" font-family="'Arial Black', 'Helvetica Neue', Arial, sans-serif" font-size="60" font-weight="900" fill="#10b981" letter-spacing="-1">H</text>
    <text x="364" y="107" font-family="'Arial Black', 'Helvetica Neue', Arial, sans-serif" font-size="60" font-weight="900" fill="#10b981" letter-spacing="-1">u</text>
    <text x="401" y="107" font-family="'Arial Black', 'Helvetica Neue', Arial, sans-serif" font-size="60" font-weight="900" fill="#0f172a" letter-spacing="-1">b</text>
    
    <rect x="318" y="113" width="128" height="2.5" rx="1.2" fill="#10b981" opacity="0.5"/>
    <circle cx="452" cy="114.5" r="3.5" fill="#10b981"/>
  </g>
</svg>
`;

const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; padding: 0; background: #f8fafc; display: flex; align-items: center; justify-content: center; width: 1200px; height: 630px; }
  </style>
</head>
<body>
  ${svgContent}
</body>
</html>
`;

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630 });
  await page.setContent(html);
  await page.screenshot({ path: 'public/og-image.png' });
  await browser.close();
  console.log('Successfully created og-image.png');
})();
