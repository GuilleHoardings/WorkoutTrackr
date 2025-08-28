// Basic mobile responsive JS enhancements (accordion for charts optional placeholder)
(function(){
  // Ensure chart canvases resize properly
  if (window.Chart) {
    Chart.defaults.responsive = true;
    Chart.defaults.maintainAspectRatio = false;
  }

  // Convert workout list to card labels on narrow screens dynamically (if needed)
  function applyWorkoutListLabels() {
    const isMobile = window.matchMedia('(max-width: 799px)').matches;
    const rows = document.querySelectorAll('#workout-list-container .workout-item');
    rows.forEach(row => {
      // Skip if already processed
      if (row.dataset.cardified === 'true') return;
      if (isMobile) {
        const details = row.querySelectorAll('.workout-detail');
        const labels = ['Date','Exercise','Reps','Time','Reps/min'];
        details.forEach((el,i) => {
          if (!el.querySelector('.mobile-label')) {
            const span = document.createElement('span');
            span.className = 'mobile-label';
            span.textContent = labels[i] + ': ';
            span.style.fontWeight = '600';
            span.style.marginRight = '4px';
            el.prepend(span);
          }
        });
        row.dataset.cardified = 'true';
      }
    });
  }

  // Collapsing logic: show only first 10 workout items (with their series container) on mobile
  // Determine if layout is currently single-column (regardless of viewport size threshold)
  function isSingleColumnLayout() {
    const container = document.querySelector('.container');
    if (!container) return false;
    const style = window.getComputedStyle(container);
  if (style.flexDirection === 'column') return true;
    // Fallback heuristic: right-side appears below left-side
    const left = document.querySelector('.left-side');
    const right = document.querySelector('.right-side');
    if (left && right) {
      return right.getBoundingClientRect().top - left.getBoundingClientRect().bottom > -5; // gap or stacked
    }
    return false;
  }

  function applyWorkoutListCollapse() {
    const isSingleColumn = isSingleColumnLayout();
    const container = document.getElementById('workout-list-container');
    if (!container) return;
    let btn = document.getElementById('workout-list-expand-btn');
    const items = Array.from(container.querySelectorAll('.workout-item'));
    if (!items.length) return;

    // Ensure button exists if needed
  if (isSingleColumn && items.length > 10) {
      if (!btn) {
        btn = document.createElement('button');
        btn.id = 'workout-list-expand-btn';
        btn.className = 'collapsed';
        btn.type = 'button';
        btn.textContent = 'Show more workouts';
        container.parentNode.insertBefore(btn, container.nextSibling);
        btn.addEventListener('click', () => toggleCollapse(btn, items));
      }
      collapse(items, btn);
    } else {
      // Remove collapse state & button if returning to multi-column or insufficient items
      items.forEach(it => { it.classList.remove('mobile-collapsed-row'); });
      const seriesContainers = container.querySelectorAll('.series-container');
      seriesContainers.forEach(sc => sc.classList.remove('mobile-collapsed-row'));
      if (btn) btn.remove();
    }
  }

  function collapse(items, btn) {
    items.forEach((item, idx) => {
      const series = item.nextElementSibling && item.nextElementSibling.classList.contains('series-container')
        ? item.nextElementSibling : null;
      if (idx >= 10) {
        item.classList.add('mobile-collapsed-row');
        if (series) series.classList.add('mobile-collapsed-row');
      } else {
        item.classList.remove('mobile-collapsed-row');
        if (series) series.classList.remove('mobile-collapsed-row');
      }
    });
    btn.classList.remove('expanded');
    btn.classList.add('collapsed');
    btn.textContent = 'Show more workouts';
  }

  function expand(items, btn) {
    items.forEach(item => {
      item.classList.remove('mobile-collapsed-row');
      const series = item.nextElementSibling && item.nextElementSibling.classList.contains('series-container')
        ? item.nextElementSibling : null;
      if (series) series.classList.remove('mobile-collapsed-row');
    });
    btn.classList.remove('collapsed');
    btn.classList.add('expanded');
    btn.textContent = 'Show fewer workouts';
  }

  function toggleCollapse(btn, items) {
    if (btn.classList.contains('collapsed')) {
      expand(items, btn);
    } else {
      collapse(items, btn);
      // Scroll back to top of list for usability
      const containerTop = document.getElementById('workout-list-container').offsetTop;
      window.scrollTo({ top: containerTop - 60, behavior: 'smooth' });
    }
  }

  function handleUpdates() {
    applyWorkoutListLabels();
    applyWorkoutListCollapse();
  }

  // Observe mutations to reapply collapse when list updates
  const observer = new MutationObserver(() => {
    handleUpdates();
  });
  document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('workout-list-container');
    if (container) {
      observer.observe(container, { childList: true, subtree: false });
    }
    handleUpdates();
  });
  document.addEventListener('workoutListUpdated', handleUpdates);
  window.addEventListener('resize', handleUpdates, { passive: true });
})();
