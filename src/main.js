import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { initScrollRestore } from './modules/scrollRestore.js'
import { initLoader } from './modules/loader.js'
import { initI18n } from './modules/i18n.js'
import { initNav } from './modules/nav.js'
import { initHero } from './modules/hero.js'
import { initFeatures } from './modules/features.js'
import { initReveal } from './modules/reveal.js'
import { initCounters } from './modules/counters.js'
import { initGallery } from './modules/gallery.js'
import { initFaq } from './modules/faq.js'
import { initModal } from './modules/modal.js'
import { initAbout } from './modules/about.js'
import { initUi } from './modules/ui.js'

gsap.registerPlugin(ScrollTrigger)

const enter = (animation, { trigger, start = 'top 88%' }) => {
  const play = () => {
    const { top, bottom } = trigger.getBoundingClientRect()
    if (bottom <= 0) animation.progress(1)
    else if (top < innerHeight) animation.play()
    else ScrollTrigger.create({ trigger, start, once: true, animation })
  }
  if (window.__kkReady) play()
  else document.addEventListener('kk:ready', play, { once: true })
}

const ctx = { gsap, enter, reduced: matchMedia('(prefers-reduced-motion: reduce)').matches }

initScrollRestore()
initLoader(ctx)
initI18n()
initNav(ctx)
initHero(ctx)
initFeatures(ctx)
initReveal(ctx)
initCounters(ctx)
initGallery(ctx)
initFaq(ctx)
initModal(ctx)
initAbout(ctx)
initUi(ctx)

if (window.__kkReady) ScrollTrigger.refresh()
else document.addEventListener('kk:ready', () => ScrollTrigger.refresh(), { once: true })