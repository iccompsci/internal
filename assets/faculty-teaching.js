(() => {
  const courseNames = {
    IWD: 'Introduction to Web Development',
    IGD: 'Introduction to Game Design',
    WSD: 'Working with Structured Data',
    SSS: 'Scripting in Spreadsheets',
    WRD: 'Working with Relational Data',
    PTC: 'Plain-Text Computing',
    CS1: 'Computer Programming I',
    CS2: 'Computer Programming II',
    FSWD: 'Full Stack Web Development',
    GD: 'Game Development',
    Sys1: 'Computer Systems I',
    DM: 'Discrete Structures',
    DS: 'Data Structures',
    RDS: 'Relational Database Systems',
    MD: 'Mobile Development',
    Sys2: 'Computer Systems II',
    Alg: 'Algorithm Design',
    PL: 'Programming Languages',
    HCI: 'HCI: User Interface Design and Development',
    SE: 'Software Engineering',
    ML: 'Machine Learning',
    AIGR: 'AI for Games and Robotics',
    CN: 'Computer Networks',
    DB: 'Database Systems',
    AOS: 'Algorithms + Organization = Systems',
    TML: 'Topics in Machine Learning',
    NLP: 'Natural Language Processing'
  };

  const statusFromFill = fill => {
    if (fill === '#899a83') return 'Taught regularly';
    if (fill === '#d9ead3') return 'Taught in the past';
    return null;
  };

  const dialog = document.createElement('dialog');
  dialog.className = 'interactive-prereq-dialog faculty-course-dialog';
  dialog.setAttribute('aria-labelledby', 'faculty-course-title');
  dialog.innerHTML = '<button class="interactive-prereq-close" type="button" aria-label="Close course information">×</button><h2 id="faculty-course-title"></h2><p class="faculty-course-status"></p><p class="faculty-course-description"></p>';
  document.body.append(dialog);
  const closeButton = dialog.querySelector('button');
  closeButton.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });

  async function initialize(container, descriptions) {
    const faculty = container.dataset.faculty;
    try {
      const response = await fetch(container.dataset.diagram);
      if (!response.ok) throw new Error('Diagram unavailable');
      const xml = new DOMParser().parseFromString(await response.text(), 'image/svg+xml');
      if (xml.querySelector('parsererror')) throw new Error('Invalid SVG');
      // Only import graphical content from the supplied Graphviz SVGs.
      xml.querySelectorAll('script, foreignObject, a, image').forEach(element => element.remove());
      xml.querySelectorAll('*').forEach(element => {
        [...element.attributes].forEach(attribute => {
          if (attribute.name.startsWith('on')) element.removeAttribute(attribute.name);
        });
      });
      const svg = document.importNode(xml.documentElement, true);
      svg.removeAttribute('width');
      svg.removeAttribute('height');
      svg.setAttribute('role', 'group');
      svg.setAttribute('aria-label', 'Courses taught by ' + faculty + ', interactive diagram');
      // Graphviz exports a white page rectangle. The surrounding site uses cream.
      svg.querySelector('g.graph > polygon')?.remove();
      svg.querySelectorAll('g.edge').forEach(edge => edge.setAttribute('aria-hidden', 'true'));

      const mobile = document.createElement('details');
      mobile.className = 'interactive-mobile-map';
      mobile.innerHTML = '<summary>Browse taught courses as a list</summary><p class="mobile-diagram-note">Choose a course for teaching history and its description.</p><ul></ul>';
      const list = mobile.querySelector('ul');
      let activeCount = 0;

      svg.querySelectorAll('g.node').forEach(node => {
        const id = node.querySelector(':scope > title')?.textContent.trim();
        const name = courseNames[id];
        const shape = node.querySelector(':scope > polygon, :scope > ellipse, :scope > path');
        const status = statusFromFill(shape?.getAttribute('fill')?.toLowerCase());
        // Unfilled contextual nodes must remain entirely non-interactive.
        if (!name || !status) {
          node.setAttribute('aria-hidden', 'true');
          return;
        }

        const label = name + ', ' + status.toLowerCase() + ' by ' + faculty;
        node.classList.add('interactive-course');
        node.setAttribute('role', 'button');
        node.setAttribute('tabindex', '0');
        node.setAttribute('focusable', 'true');
        node.setAttribute('aria-label', label + '. Open course information.');
        const open = () => {
          dialog.querySelector('h2').textContent = name;
          dialog.querySelector('.faculty-course-status').textContent = status + ' by ' + faculty;
          dialog.querySelector('.faculty-course-description').textContent =
            descriptions[name] || 'A course description has not yet been added.';
          dialog.showModal();
          closeButton.focus();
        };
        node.addEventListener('click', open);
        node.addEventListener('keydown', event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            open();
          }
        });
        const item = document.createElement('li');
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = name;
        button.setAttribute('aria-label', label);
        button.addEventListener('click', open);
        const note = document.createElement('p');
        note.textContent = status;
        item.append(button, note);
        list.append(item);
        activeCount++;
      });
      if (!activeCount) throw new Error('No taught courses identified');
      container.replaceChildren(svg, mobile);
    } catch (error) {
      container.classList.add('map-status');
      container.textContent = 'The teaching diagram is temporarily unavailable.';
    }
  }

  const containers = document.querySelectorAll('.faculty-teaching');
  if (!containers.length) return;
  fetch('../assets/course-descriptions.json')
    .then(response => {
      if (!response.ok) throw new Error('Course descriptions unavailable');
      return response.json();
    })
    .then(descriptions => containers.forEach(container => initialize(container, descriptions)))
    .catch(() => containers.forEach(container => initialize(container, {})));
})();
