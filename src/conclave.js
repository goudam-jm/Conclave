(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Conclave = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const instances = new WeakMap();
  const defaults = Object.freeze({ startIndex: 0, loop: true, autoplay: false, interval: 5000,
    keyboard: true, swipe: true, selectOnClick: true, pagination: true, swipeThreshold: 40 });

  class Conclave {
    constructor(element, options = {}) {
      const root = typeof element === 'string' ? document.querySelector(element) : element;
      if (!root || !root.querySelector) throw new TypeError('Conclave requires a carousel element.');
      if (instances.has(root)) throw new Error('This carousel is already initialized.');
      this.options = { ...defaults, ...options };
      if (!Number.isInteger(this.options.startIndex)) throw new TypeError('startIndex must be an integer.');
      if (!Number.isFinite(this.options.interval) || this.options.interval <= 0) throw new TypeError('interval must be positive.');
      if (!Number.isFinite(this.options.swipeThreshold) || this.options.swipeThreshold <= 0) throw new TypeError('swipeThreshold must be positive.');
      this.root = root;
      this.stage = root.querySelector('[data-conclave-track]');
      this.slides = this.stage ? [...this.stage.children].filter(el => el.matches('[data-conclave-slide]')) : [];
      if (!this.slides.length) throw new Error('Conclave requires a track with at least one slide.');
      this.document = root.ownerDocument;
      this.window = this.document.defaultView;
      this.media = this.window.matchMedia('(prefers-reduced-motion: reduce)');
      this.listeners = [];
      this.snapshots = new Map();
      this.generated = [];
      this.destroyed = false;
      this.playing = false;
      this.hovered = false;
      this.suppressClick = false;
      this.index = this.normalize(this.options.startIndex);
      instances.set(root, this);
      this.attr(root, 'class', `${root.className} conclave`.trim());
      this.attr(root, 'role', root.getAttribute('role') || 'region');
      this.attr(root, 'aria-roledescription', 'carousel');
      if (!root.hasAttribute('aria-label') && !root.hasAttribute('aria-labelledby')) this.attr(root, 'aria-label', 'Carousel');
      this.attr(root, 'tabindex', root.getAttribute('tabindex') || '0');
      this.attr(this.stage, 'class', `${this.stage.className} conclave__track`.trim());
      this.slides.forEach((slide, i) => {
        this.attr(slide, 'class', `${slide.className} conclave__slide`.trim());
        if (slide.tagName === 'BUTTON') this.attr(slide, 'type', 'button');
        if (!slide.hasAttribute('aria-label')) this.attr(slide, 'aria-label', `Slide ${i + 1} of ${this.slides.length}`);
        this.on(slide, 'click', event => {
          if (this.suppressClick) { event.preventDefault(); event.stopPropagation(); this.suppressClick = false; return; }
          if (this.options.selectOnClick) this.goTo(i);
        });
      });
      this.dots = [];
      const pagination = root.querySelector('[data-conclave-pagination]');
      if (pagination && this.options.pagination) {
        this.slides.forEach((slide, i) => {
          const dot = this.document.createElement('button');
          dot.type = 'button';
          dot.className = 'conclave__dot';
          dot.setAttribute('aria-label', `Go to slide ${i + 1} of ${this.slides.length}`);
          pagination.append(dot);
          this.generated.push(dot);
          this.dots.push(dot);
          this.on(dot, 'click', () => this.goTo(i));
        });
      }
      this.status = this.document.createElement('span');
      this.status.className = 'conclave__status';
      this.status.setAttribute('aria-live', 'polite');
      this.status.setAttribute('aria-atomic', 'true');
      root.append(this.status);
      this.generated.push(this.status);
      this.previousButton = root.querySelector('[data-conclave-prev]');
      this.nextButton = root.querySelector('[data-conclave-next]');
      this.playButton = root.querySelector('[data-conclave-play]');
      this.on(this.previousButton, 'click', () => this.prev());
      this.on(this.nextButton, 'click', () => this.next());
      this.on(this.playButton, 'click', () => this.playing ? this.pause() : this.play());
      this.on(root, 'keydown', event => {
        if (!this.options.keyboard || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey ||
          event.target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return;
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        this.goTo(event.key === 'Home' ? 0 : event.key === 'End' ? this.slides.length - 1 : this.index + (event.key === 'ArrowRight' ? 1 : -1));
      });
      this.on(this.stage, 'pointerdown', event => {
        this.suppressClick = false;
        if (this.options.swipe && event.isPrimary && event.button === 0 &&
          !event.target.closest('input, textarea, select, [contenteditable], a')) this.pointer = { x: event.clientX, y: event.clientY };
      });
      this.on(this.window, 'pointerup', event => {
        if (!this.pointer) return;
        const dx = event.clientX - this.pointer.x;
        const dy = event.clientY - this.pointer.y;
        this.pointer = null;
        if (Math.abs(dx) >= this.options.swipeThreshold && Math.abs(dx) > Math.abs(dy)) {
          this.suppressClick = true;
          this.goTo(this.index + (dx < 0 ? 1 : -1));
        }
      });
      this.on(this.window, 'pointercancel', () => { this.pointer = null; });
      this.on(root, 'mouseenter', () => { this.hovered = true; this.schedule(); });
      this.on(root, 'mouseleave', () => { this.hovered = false; this.schedule(); });
      this.on(root, 'focusin', () => this.schedule());
      this.on(root, 'focusout', () => {
        this.window.clearTimeout(this.focusTimer);
        this.focusTimer = this.window.setTimeout(() => this.schedule(), 0);
      });
      this.on(this.document, 'visibilitychange', () => this.schedule());
      this.on(this.media, 'change', () => { if (this.media.matches) this.pause(); });
      this.render(false);
      if (this.options.autoplay && !this.media.matches) this.play();
      else this.updatePlayback();
    }

    attr(element, name, value) {
      if (!this.snapshots.has(element)) this.snapshots.set(element, new Map());
      const saved = this.snapshots.get(element);
      if (!saved.has(name)) saved.set(name, element.getAttribute(name));
      if (value === null) element.removeAttribute(name);
      else element.setAttribute(name, String(value));
    }
    on(element, type, handler) {
      if (!element) return;
      element.addEventListener(type, handler);
      this.listeners.push(() => element.removeEventListener(type, handler));
    }
    normalize(index) {
      const count = this.slides.length;
      return this.options.loop ? ((index % count) + count) % count : Math.max(0, Math.min(index, count - 1));
    }
    goTo(index, announce = true) {
      if (this.destroyed) return this;
      if (!Number.isInteger(index)) throw new TypeError('Slide index must be an integer.');
      const previousIndex = this.index;
      this.index = this.normalize(index);
      this.render(announce && previousIndex !== this.index);
      if (previousIndex !== this.index) this.root.dispatchEvent(new this.window.CustomEvent('conclave:change', {
        detail: { index: this.index, previousIndex, slide: this.slides[this.index] }
      }));
      return this;
    }
    next() { return this.goTo(this.index + 1); }
    prev() { return this.goTo(this.index - 1); }
    render(announce) {
      const count = this.slides.length;
      this.slides.forEach((slide, i) => {
        let offset = i - this.index;
        if (this.options.loop) offset = ((offset + Math.floor(count / 2) + count) % count) - Math.floor(count / 2);
        this.attr(slide, 'data-conclave-position', Math.max(-3, Math.min(3, offset)));
        this.attr(slide, 'aria-current', String(i === this.index));
        this.attr(slide, 'aria-hidden', Math.abs(offset) > 2 ? 'true' : null);
        this.attr(slide, 'inert', Math.abs(offset) > 2 ? '' : null);
      });
      this.dots.forEach((dot, i) => dot.setAttribute('aria-current', String(i === this.index)));
      this.root.querySelectorAll('[data-conclave-current]').forEach(el => {
        this.attr(el, 'data-conclave-original-text', el.getAttribute('data-conclave-original-text') ?? el.textContent);
        el.textContent = String(this.index + 1).padStart(2, '0');
      });
      this.root.querySelectorAll('[data-conclave-total]').forEach(el => {
        this.attr(el, 'data-conclave-original-text', el.getAttribute('data-conclave-original-text') ?? el.textContent);
        el.textContent = String(count).padStart(2, '0');
      });
      if (this.previousButton) this.attr(this.previousButton, 'disabled', count === 1 || (!this.options.loop && this.index === 0) ? '' : null);
      if (this.nextButton) this.attr(this.nextButton, 'disabled', count === 1 || (!this.options.loop && this.index === count - 1) ? '' : null);
      if (announce) this.status.textContent = `Slide ${this.index + 1} of ${count}`;
      this.schedule();
    }
    schedule() {
      this.window.clearTimeout(this.timer);
      if (this.destroyed || !this.playing || this.slides.length < 2 || this.document.hidden || this.hovered || this.root.contains(this.document.activeElement)) return;
      if (!this.options.loop && this.index === this.slides.length - 1) { this.pause(); return; }
      this.timer = this.window.setTimeout(() => this.goTo(this.index + 1, false), this.options.interval);
    }
    updatePlayback() {
      if (!this.playButton) return;
      this.attr(this.playButton, 'aria-pressed', String(this.playing));
      this.attr(this.playButton, 'aria-label', this.playing ? 'Pause automatic slideshow' : 'Start automatic slideshow');
      this.attr(this.playButton, 'data-conclave-playing', String(this.playing));
    }
    play() {
      if (this.destroyed || this.slides.length < 2) return this;
      this.playing = true;
      this.updatePlayback();
      this.schedule();
      return this;
    }
    pause() {
      this.playing = false;
      if (!this.destroyed) this.updatePlayback();
      this.window.clearTimeout(this.timer);
      return this;
    }
    destroy() {
      if (this.destroyed) return;
      this.pause();
      this.window.clearTimeout(this.focusTimer);
      this.destroyed = true;
      this.listeners.forEach(remove => remove());
      this.generated.forEach(el => el.remove());
      this.root.querySelectorAll('[data-conclave-original-text]').forEach(el => { el.textContent = el.getAttribute('data-conclave-original-text'); });
      this.snapshots.forEach((attributes, element) => attributes.forEach((value, name) => {
        if (value === null) element.removeAttribute(name);
        else element.setAttribute(name, value);
      }));
      instances.delete(this.root);
    }
  }
  Conclave.defaults = defaults;
  return Conclave;
});
