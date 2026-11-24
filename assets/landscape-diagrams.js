/* Responsive landscape rendering for existing Graphviz SVG diagrams.
   The portrait SVG remains the source of truth and the mobile fallback. */
(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const make = (name) => document.createElementNS(NS, name);
  let diagramNumber = 0;

  function bounds(shape) {
    if (!shape) return null;
    if (shape.tagName.toLowerCase() === 'ellipse') {
      const x = Number(shape.getAttribute('cx'));
      const y = Number(shape.getAttribute('cy'));
      const rx = Number(shape.getAttribute('rx'));
      const ry = Number(shape.getAttribute('ry'));
      return { x, y, w: rx * 2, h: ry * 2 };
    }
    const points = (shape.getAttribute('points') || '').trim().split(/\s+/)
      .map(pair => pair.split(',').map(Number)).filter(pair => pair.length === 2 && pair.every(Number.isFinite));
    if (!points.length) return null;
    const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
    return { x: (Math.min(...xs) + Math.max(...xs)) / 2,
      y: (Math.min(...ys) + Math.max(...ys)) / 2,
      w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  }

  function createLandscape(portrait) {
    const groups = Array.from(portrait.querySelectorAll('g.node'));
    const nodes = groups.map(group => {
      const key = group.querySelector(':scope > title')?.textContent.trim();
      const shape = group.querySelector(':scope > polygon, :scope > ellipse');
      const position = bounds(shape);
      return key && position ? { key, group, ...position } : null;
    }).filter(Boolean);
    if (nodes.length < 3) return null;
    const minX = Math.min(...nodes.map(node => node.x));
    const minY = Math.min(...nodes.map(node => node.y));
    nodes.forEach(node => {
      node.newX = 70 + (node.x - minX) * 1.78;
      node.newY = 52 + (node.y - minY) * .65;
    });
    const byKey = new Map(nodes.map(node => [node.key, node]));
    const width = Math.ceil(Math.max(...nodes.map(node => node.newX + node.w / 2)) + 46);
    const height = Math.ceil(Math.max(...nodes.map(node => node.newY + node.h / 2)) + 35);
    const view = make('svg');
    view.classList.add('landscape-diagram');
    view.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
    view.setAttribute('role', 'group');
    view.setAttribute('aria-label', (portrait.getAttribute('aria-label') || 'Course diagram') + ', landscape layout');
    const markerId = 'landscape-arrow-' + (++diagramNumber);
    const defs = make('defs'), marker = make('marker'), tip = make('path');
    marker.setAttribute('id', markerId);
    marker.setAttribute('viewBox', '0 0 10 10');
    marker.setAttribute('refX', '9');
    marker.setAttribute('refY', '5');
    marker.setAttribute('markerWidth', '7');
    marker.setAttribute('markerHeight', '7');
    marker.setAttribute('orient', 'auto-start-reverse');
    tip.setAttribute('d', 'M 0 1 L 9 5 L 0 9 z');
    tip.setAttribute('fill', '#5b6c65');
    marker.append(tip); defs.append(marker); view.append(defs);

    portrait.querySelectorAll('g.edge').forEach(edge => {
      const title = edge.querySelector(':scope > title')?.textContent.trim() || '';
      const [start, end] = title.split('->');
      const from = byKey.get(start), to = byKey.get(end);
      if (!from || !to) return;
      const path = make('path');
      const rightToLeft = to.newX > from.newX;
      const x1 = from.newX + (rightToLeft ? from.w / 2 : -from.w / 2) + (rightToLeft ? 2 : -2);
      const x2 = to.newX - (rightToLeft ? to.w / 2 : -to.w / 2) - (rightToLeft ? 5 : -5);
      const mid = (x1 + x2) / 2;
      path.setAttribute('d', 'M ' + x1 + ' ' + from.newY +
        ' C ' + mid + ' ' + from.newY + ', ' + mid + ' ' + to.newY + ', ' + x2 + ' ' + to.newY);
      const original = edge.querySelector('path');
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', original?.getAttribute('stroke') || '#5b6c65');
      path.setAttribute('stroke-width', original?.getAttribute('stroke-width') || '1.3');
      if (original?.hasAttribute('stroke-dasharray')) {
        path.setAttribute('stroke-dasharray', original.getAttribute('stroke-dasharray'));
      }
      path.setAttribute('marker-end', 'url(#' + markerId + ')');
      path.setAttribute('aria-hidden', 'true');
      view.append(path);
    });

    nodes.forEach(node => {
      const clone = node.group.cloneNode(true);
      clone.setAttribute('transform', 'translate(' + (node.newX - node.x) + ' ' + (node.newY - node.y) + ')');
      if (node.group.classList.contains('interactive-course')) {
        clone.setAttribute('role', 'button');
        clone.setAttribute('tabindex', '0');
        clone.addEventListener('click', () => node.group.click());
        clone.addEventListener('keydown', event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            node.group.click();
          }
        });
      } else {
        clone.removeAttribute('tabindex');
        clone.setAttribute('aria-hidden', 'true');
      }
      view.append(clone);
    });
    return view;
  }

  function enhance() {
    document.querySelectorAll('.interactive-curriculum, .faculty-teaching').forEach(container => {
      if (container.classList.contains('landscape-ready')) return;
      const portrait = container.querySelector(':scope > svg:not(.landscape-diagram)');
      if (!portrait || !portrait.querySelector('g.node')) return;
      try {
        const landscape = createLandscape(portrait);
        if (!landscape) return;
        portrait.classList.add('portrait-diagram');
        portrait.insertAdjacentElement('afterend', landscape);
        container.classList.add('landscape-ready');
      } catch (error) {
        // Keep the unmodified portrait diagram if enhancement fails.
      }
    });
  }

  const observer = new MutationObserver(enhance);
  observer.observe(document.body, { childList: true, subtree: true });
  enhance();
})();
