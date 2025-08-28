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

  window.addEventListener('resize', applyWorkoutListLabels, { passive: true });
  document.addEventListener('DOMContentLoaded', applyWorkoutListLabels);
})();
