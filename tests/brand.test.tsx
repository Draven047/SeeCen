import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { BrandMark } from '../src/components/BrandMark';
import { brand } from '../src/config/brand';

describe('SeeCen brand identity', () => {
  test('shared mark uses the reference purple gradient and white bag', () => {
    const svg = readFileSync(new URL(`../public${brand.logo}`, import.meta.url), 'utf8');
    expect(svg).toContain('#8772ff');
    expect(svg).toContain('#4e3adf');
    expect(svg).toContain('stroke="#fff"');
    expect(svg).toContain('viewBox="0 0 128 128"');
    expect(readFileSync(new URL('../public/favicon.svg', import.meta.url), 'utf8')).toBe(svg);
  });

  test('decorative and standalone marks have appropriate accessible names', () => {
    expect(renderToStaticMarkup(<BrandMark />)).toContain('alt=""');
    expect(renderToStaticMarkup(<BrandMark labelled />)).toContain(`alt="${brand.name} logo"`);
    expect(renderToStaticMarkup(<BrandMark />)).toContain(`src="${brand.logo}"`);
  });

  test('installable icons have the expected dimensions', () => {
    for (const [name, size] of [['apple-touch-icon', 180], ['pwa-192', 192], ['pwa-512', 512], ['pwa-maskable-512', 512]] as const) {
      const png = readFileSync(new URL(`../public/brand/${name}-v1.png`, import.meta.url));
      expect(png.subarray(1, 4).toString()).toBe('PNG');
      expect(png.readUInt32BE(16)).toBe(size);
      expect(png.readUInt32BE(20)).toBe(size);
    }
    const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    expect(html).toContain(`href="${brand.logo}"`);
    expect(html).toContain('/brand/apple-touch-icon-v1.png');
  });
});
