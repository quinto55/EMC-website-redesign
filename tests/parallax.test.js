import { describe, it, expect, vi } from 'vitest';
import {
  HERO_PARALLAX,
  CURTAIN_SECTIONS,
  buildCurtain,
  initHeroParallax,
  initCurtains,
} from '../src/parallax.js';

describe('HERO_PARALLAX layer map', () => {
  it('moves headline faster than embers and scales the video', () => {
    const bySel = Object.fromEntries(HERO_PARALLAX);
    expect(bySel['.hero__video'].scale).toBeGreaterThan(1);
    expect(bySel['.hero__headline'].y).toBe(-60);
    expect(bySel['.hero__embers'].y).toBe(-20);
  });
});

describe('CURTAIN_SECTIONS', () => {
  it('covers the four homepage sections', () => {
    expect(CURTAIN_SECTIONS).toEqual(['.partners', '#what-we-do', '#industry-leader', '.intake']);
  });
});

describe('buildCurtain', () => {
  it('prepends an aria-hidden curtain overlay', () => {
    document.body.innerHTML = '<section id="s"><p>content</p></section>';
    const section = document.getElementById('s');
    const curtain = buildCurtain(section);
    expect(section.firstChild).toBe(curtain);
    expect(curtain.className).toBe('curtain');
    expect(curtain.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('initHeroParallax', () => {
  it('does nothing when reduced motion is set', () => {
    document.body.innerHTML = '<section class="hero"><video class="hero__video"></video></section>';
    const gsap = { to: vi.fn() };
    initHeroParallax({ gsap, reduced: true });
    expect(gsap.to).not.toHaveBeenCalled();
  });

  it('creates one scrubbed tween per present layer', () => {
    document.body.innerHTML = `
      <section class="hero">
        <video class="hero__video"></video>
        <div class="hero__headline"></div>
      </section>`;
    const gsap = { to: vi.fn() };
    initHeroParallax({ gsap, reduced: false });
    // .hero__embers absent -> only 2 tweens
    expect(gsap.to).toHaveBeenCalledTimes(2);
    const vars = gsap.to.mock.calls[0][1];
    expect(vars.ease).toBe('none');
    expect(vars.scrollTrigger.scrub).toBe(true);
    expect(vars.scrollTrigger.start).toBe('top top');
    expect(vars.scrollTrigger.end).toBe('bottom top');
  });
});

describe('initCurtains', () => {
  it('does nothing when reduced motion is set', () => {
    document.body.innerHTML = '<section class="partners"></section>';
    const gsap = { to: vi.fn() };
    initCurtains({ gsap, reduced: true });
    expect(gsap.to).not.toHaveBeenCalled();
    expect(document.querySelector('.curtain')).toBeNull();
  });

  it('builds one curtain per present section and animates it once at 70% viewport', () => {
    document.body.innerHTML = `
      <section class="partners"></section>
      <section id="what-we-do"></section>
      <section class="intake"></section>`;
    const gsap = { to: vi.fn() };
    initCurtains({ gsap, reduced: false });
    // #industry-leader absent -> 3 curtains, 3 tweens
    expect(document.querySelectorAll('.curtain')).toHaveLength(3);
    expect(gsap.to).toHaveBeenCalledTimes(3);
    const sections = [...document.querySelectorAll('section')];
    expect(sections.every((s) => s.classList.contains('has-curtain'))).toBe(true);
    const vars = gsap.to.mock.calls[0][1];
    expect(vars.scaleY).toBe(0);
    expect(vars.duration).toBe(0.9);
    expect(vars.ease).toBe('power2.inOut');
    expect(vars.scrollTrigger).toEqual({ trigger: sections[0], start: 'top 70%', once: true });
  });
});
