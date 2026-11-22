const dialog = document.getElementById('poster-dialog');
const image = document.getElementById('poster-image');
const viewer = document.getElementById('poster-preview-scroll');
const title = document.getElementById('poster-dialog-title');
const original = document.getElementById('poster-original');

if (dialog && image && viewer && title && original && typeof dialog.showModal === 'function') {
  const textLink = document.createElement('a');
  textLink.textContent = 'Read text version ↗';
  dialog.querySelector('.poster-dialog-actions')?.insertBefore(textLink, document.getElementById('poster-close'));
  const zoomButton = document.createElement('button');
  zoomButton.type = 'button';
  zoomButton.textContent = 'Zoom poster';
  zoomButton.setAttribute('aria-pressed', 'false');
  dialog.querySelector('.poster-dialog-actions')?.insertBefore(zoomButton, document.getElementById('poster-close'));
  viewer.tabIndex = 0;
  function toggleZoom() {
    const zoomed = viewer.classList.toggle('is-zoomed');
    zoomButton.setAttribute('aria-pressed', String(zoomed));
    zoomButton.textContent = zoomed ? 'Fit poster to window' : 'Zoom poster';
  }
  zoomButton.addEventListener('click', toggleZoom);
  document.querySelectorAll('.poster-card > a').forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      const card = link.closest('.poster-card');
      const thumb = link.querySelector('img');
      title.textContent = card?.querySelector('h2')?.textContent || 'Research poster';
      original.href = link.href;
      textLink.href = 'poster-text/' + link.href.split('/').pop().replace(/\.pdf(?:\?.*)?$/i, '.html');
      image.src = thumb.src.replace(/\/posters\/([^/]+)\.(?:jpe?g|png)$/i, '/posters/full/$1.jpg');
      image.alt = `Enlarged poster: ${title.textContent}`;
      viewer.classList.remove('is-zoomed');
      zoomButton.setAttribute('aria-pressed', 'false');
      zoomButton.textContent = 'Zoom poster';
      viewer.scrollTop = 0;
      viewer.scrollLeft = 0;
      dialog.showModal();
    });
  });

  image.addEventListener('click', toggleZoom);
  document.getElementById('poster-close')?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => {
    image.removeAttribute('src');
  });
}
