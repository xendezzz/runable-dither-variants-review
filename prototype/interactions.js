(() => {
  const notice = document.querySelector('.prototype-notice');
  let timer;
  document.querySelectorAll('.claim-spot').forEach(button => {
    button.addEventListener('click', () => {
      notice.textContent = 'Registration link will be added to this prototype.';
      notice.classList.add('is-visible');
      clearTimeout(timer);
      timer = setTimeout(() => notice.classList.remove('is-visible'), 3000);
    });
  });

  // Replay the reveal after a section fully leaves and re-enters the viewport.
  // The markup stays visible if the observer is unavailable or motion is reduced.
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const running = new WeakMap();
  function stopAnimation(element) {
    const animation = running.get(element);
    if (!animation) return;
    clearTimeout(animation.timer);
    element.removeEventListener('animationend', animation.finish);
    running.delete(element);
  }

  function prepare(element) {
    if (!element) return;
    stopAnimation(element);
    element.classList.remove('reveal-enter');
    element.classList.add('reveal-pending');
    element.style.removeProperty('--reveal-delay');
  }

  function reveal(element, delay) {
    if (!element || !element.classList.contains('reveal-pending')) return;
    element.style.setProperty('--reveal-delay', `${delay}ms`);
    const finish = event => {
      if (event && event.target !== element) return;
      if (running.get(element)?.finish !== finish) return;
      stopAnimation(element);
      element.classList.remove('reveal-pending', 'reveal-enter');
      element.style.removeProperty('--reveal-delay');
    };
    const timer = setTimeout(finish, delay + 1750);
    running.set(element, { finish, timer });
    element.addEventListener('animationend', finish);
    element.classList.add('reveal-enter');
  }

  const sectionPlans = [
    {
      section: document.querySelector('#academy'),
      selector: '.intro h1, .intro p, .lesson-card, .lesson-heading, .lesson-thumbnail, .lesson-details, .academy-cta',
      step: 105
    },
    {
      section: document.querySelector('#webinars'),
      selector: '.webinar-intro h2, .webinar-intro p',
      step: 110
    },
    {
      section: document.querySelector('#desktop-app'),
      selector: '.desktop-content h2, .download-card, .download-heading, .download-bottom p, .download-button, .coming-soon',
      step: 95
    }
  ];

  const webinarList = document.querySelector('.webinar-list');
  const webinarCards = [...document.querySelectorAll('.webinar-list .workshop-card')];
  const revealStartDelay = 280;
  const cardParts = card => [card, card.querySelector('h3'), card.querySelector('.workshop-benefit'), card.querySelector('.workshop-info p'), card.querySelector('.claim-spot')];
  webinarCards.forEach(card => cardParts(card).forEach(prepare));
  sectionPlans.forEach(plan => {
    plan.items = plan.section ? [...plan.section.querySelectorAll(plan.selector)] : [];
    plan.active = false;
    plan.items.forEach(prepare);
  });

  let webinarObserver;
  const resetObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const plan = sectionPlans.find(item => item.section === entry.target);
      if (!plan || entry.isIntersecting || !plan.active) return;
      plan.active = false;
      plan.items.forEach(prepare);
      if (plan.section.id === 'webinars') {
        webinarObserver?.disconnect();
        webinarObserver = undefined;
        webinarCards.forEach(card => cardParts(card).forEach(prepare));
      }
    });
  }, { threshold: 0 });

  // The heading enters at the right moment in either scroll direction.
  const headingObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const plan = sectionPlans.find(item => item.items[0] === entry.target);
      if (!plan || plan.active) return;
      plan.active = true;
      plan.items.forEach((item, index) => reveal(item, revealStartDelay + index * plan.step));

      if (plan.section.id === 'webinars' && webinarList) {
        let revealedCards = 0;
        const cardObserver = new IntersectionObserver(cardEntries => {
          if (!plan.active || webinarObserver !== cardObserver) return;
          cardEntries.filter(item => item.isIntersecting)
            .sort((a, b) => webinarCards.indexOf(a.target) - webinarCards.indexOf(b.target))
            .forEach(item => {
              cardObserver.unobserve(item.target);
              const base = revealStartDelay + 200 + (revealedCards % 2) * 220;
              cardParts(item.target).forEach((part, index) => reveal(part, base + index * 60));
              revealedCards++;
            });
        }, { threshold: 0.12 });
        webinarObserver = cardObserver;
        webinarCards.forEach(card => cardObserver.observe(card));
      }
    });
  }, { threshold: 0 });
  sectionPlans.forEach(plan => {
    if (plan.section) resetObserver.observe(plan.section);
    if (plan.items[0]) headingObserver.observe(plan.items[0]);
  });
})();
