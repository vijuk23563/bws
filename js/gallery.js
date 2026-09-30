(function initFirebaseGallery() {
  const fullGrid = document.querySelector('.gallery-full-grid');
  const homeGrid = document.querySelector('.gallery-grid');
  if (!fullGrid && !homeGrid) return;

  const categories = {
    furniture: 'Furniture',
    doors: 'Doors & Windows',
    interior: 'Interior',
    office: 'Office',
    custom: 'Custom Designs'
  };

  function escapeHTML(value) {
    return String(value || '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
  }

  function safeImageURL(value) {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' ? url.href : '';
    } catch {
      return '';
    }
  }

  function render(items) {
    const photos = items.filter(photo => safeImageURL(photo.imageUrl));
    if (fullGrid) {
      fullGrid.innerHTML = photos.length ? photos.map(photo => `
        <article class="gallery-full-item" data-category="${escapeHTML(photo.category)}">
          <img src="${escapeHTML(safeImageURL(photo.imageUrl))}" alt="${escapeHTML(photo.title)}" style="width:100%;height:220px;object-fit:cover;display:block;" loading="lazy" />
          <div class="gf-overlay"><h4>${escapeHTML(photo.title)}</h4><p>${escapeHTML(photo.description || photo.material || categories[photo.category] || '')}</p></div>
        </article>`).join('') : '<p class="gallery-empty">Our gallery is being updated. Please check back soon.</p>';
    }

    if (homeGrid) {
      const homePhotos = photos.filter(photo => photo.showOnHome).slice(0, 5);
      homeGrid.innerHTML = homePhotos.length ? homePhotos.map(photo => `
        <article class="gallery-item">
          <img src="${escapeHTML(safeImageURL(photo.imageUrl))}" alt="${escapeHTML(photo.title)} - Balaji Wooden Solutions" style="width:100%;height:100%;object-fit:cover;" loading="lazy" />
          <div class="gallery-overlay">${escapeHTML(photo.title)}</div>
        </article>`).join('') : '<p class="gallery-empty">New project photos coming soon.</p>';
    }
  }

  document.addEventListener('firebase-ready', () => {
    listenGallery(render, error => console.warn('Public gallery unavailable:', error.message));
  }, { once: true });
})();