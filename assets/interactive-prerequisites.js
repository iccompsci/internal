(() => {
  const courseNames = {
    IWD: 'Introduction to Web Development', IGD: 'Introduction to Game Design',
    WSD: 'Working with Structured Data', SSS: 'Scripting in Spreadsheets',
    WRD: 'Working with Relational Data', CS1: 'Computer Programming I',
    CS2: 'Computer Programming II', FSWD: 'Full Stack Web Development',
    GD: 'Game Development', Sys1: 'Computer Systems I',
    DM: 'Discrete Structures', DS: 'Data Structures',
    RDS: 'Relational Database Systems', MD: 'Mobile Development',
    Sys2: 'Computer Systems II', Alg: 'Algorithm Design',
    PL: 'Programming Languages',
    HCI: 'HCI: User Interface Design and Development',
    SE: 'Software Engineering', ML: 'Machine Learning',
    AIGR: 'AI for Games and Robotics', CN: 'Computer Networks',
    DB: 'Database Systems', AOS: 'Algorithms + Organization = Systems',
    TML: 'Topics in Machine Learning', NLP: 'Natural Language Processing'
  };
  const requirementNames = {
    Stats: 'Statistics requirement', LA: 'Linear algebra requirement',
    StatBEM: 'Business, Economics, or Management statistics',
    StatsHLSS: 'Health, Life, or Social Sciences statistics',
    StatDS: 'Data Science statistics', AppLA: 'Applied linear algebra',
    NormLA: 'Standard linear algebra'
  };
  const labelFor = id => courseNames[id] || requirementNames[id] || id;

  const dialog = document.createElement('dialog');
  dialog.className = 'interactive-prereq-dialog';
  dialog.setAttribute('aria-labelledby', 'interactive-course-title');
  dialog.innerHTML = '<button class="interactive-prereq-close" type="button" aria-label="Close description">×</button><h2 id="interactive-course-title"></h2><p class="course-description"></p><section class="course-requirements" aria-label="Prerequisite relationships"><h3>Prerequisites</h3><div class="prereq-details"></div><h3>Courses that follow</h3><div class="following-details"></div></section>';
  document.body.append(dialog);
  dialog.querySelector('button').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  const titleElement = dialog.querySelector('h2');
  const descriptionElement = dialog.querySelector('.course-description');
  const prerequisitesElement = dialog.querySelector('.prereq-details');
  const followingElement = dialog.querySelector('.following-details');

  function listInto(container, items, prefix) {
    if (!items.length) return;
    if (prefix) {
      const p = document.createElement('p');
      p.textContent = prefix;
      container.append(p);
    }
    const list = document.createElement('ul');
    items.forEach(value => {
      const item = document.createElement('li');
      item.textContent = value;
      list.append(item);
    });
    container.append(list);
  }

  function incomingDescription(id, edges, nested = false) {
    const parents = edges.filter(edge => edge.to === id);
    if (!parents.length) return 'No prerequisite arrows are shown.';
    const names = parents.map(edge => {
      const child = edge.from === 'Stats' || edge.from === 'LA'
        ? ` (choose one of: ${edges.filter(candidate => candidate.to === edge.from).map(candidate => labelFor(candidate.from)).join(', ')})`
        : '';
      return labelFor(edge.from) + child;
    });
    if (parents.every(edge => edge.alternative)) return 'One of: ' + names.join('; ');
    if (parents.every(edge => !edge.alternative)) return 'All required: ' + names.join('; ');
    return parents.map((edge, index) => (edge.alternative ? 'Alternative: ' : 'Required: ') + names[index]).join('; ');
  }

  async function initialize(container, descriptions) {
    const url = container.dataset.diagram;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Diagram could not be loaded');
      const text = await response.text();
      const xml = new DOMParser().parseFromString(text, 'image/svg+xml');
      if (xml.querySelector('parsererror')) throw new Error('Invalid diagram');
      const svg = document.importNode(xml.documentElement, true);
      svg.removeAttribute('width');
      svg.removeAttribute('height');
      svg.setAttribute('role', 'group');
      svg.setAttribute('aria-label', container.dataset.label + ' interactive prerequisite diagram');
      const edges = Array.from(svg.querySelectorAll('g.edge')).map(edge => {
        const title = edge.querySelector(':scope > title')?.textContent.trim() || '';
        const [from, to] = title.split('->');
        return { from, to, alternative: !!edge.querySelector('path[stroke-dasharray]') };
      }).filter(edge => edge.from && edge.to);
      svg.querySelectorAll('g.edge').forEach(edge => edge.setAttribute('aria-hidden', 'true'));
      const mobile = document.createElement('details');
      mobile.className = 'interactive-mobile-map';
      mobile.setAttribute('aria-label', container.dataset.label + ' prerequisite list');
      const mobileSummary = document.createElement('summary');
      mobileSummary.textContent = 'Browse courses as a list';
      const mobileNote = document.createElement('p');
      mobileNote.className = 'mobile-diagram-note';
      mobileNote.textContent = 'Courses and their immediate prerequisites. Select a course to read its full description and related courses.';
      const mobileList = document.createElement('ul');
      mobile.append(mobileSummary, mobileNote, mobileList);
      let count = 0;
      svg.querySelectorAll('g.node').forEach(node => {
        const id = node.querySelector(':scope > title')?.textContent.trim();
        const name = courseNames[id];
        const description = descriptions[name];
        // Only the two green course categories are interactive. An unfilled
        // contextual node may have a description elsewhere, but its border
        // must not act as a hidden click target.
        const shape = node.querySelector(':scope > polygon, :scope > ellipse, :scope > path');
        const fill = shape?.getAttribute('fill')?.toLowerCase();
        if (!name || !description || !['#899a83', '#d9ead3'].includes(fill)) return;
        node.classList.add('interactive-course');
        node.setAttribute('role', 'button');
        node.setAttribute('tabindex', '0');
        node.setAttribute('aria-label', 'Description of ' + name);
        const open = () => {
          titleElement.textContent = name;
          descriptionElement.textContent = description;
          prerequisitesElement.replaceChildren();
          const parents = edges.filter(edge => edge.to === id);
          if (!parents.length) prerequisitesElement.textContent = 'No prerequisite arrows are shown in this diagram.';
          else {
            const required = parents.filter(edge => !edge.alternative).map(edge => labelFor(edge.from));
            const alternatives = parents.filter(edge => edge.alternative).map(edge => labelFor(edge.from));
            listInto(prerequisitesElement, required, alternatives.length ? 'Required:' : '');
            listInto(prerequisitesElement, alternatives, 'Choose one:');
            // Display the options represented by the two shorthand requirement nodes.
            parents.filter(edge => ['Stats', 'LA'].includes(edge.from)).forEach(edge => {
              listInto(prerequisitesElement,
                edges.filter(candidate => candidate.to === edge.from).map(candidate => labelFor(candidate.from)),
                labelFor(edge.from) + ' may be satisfied by one of:');
            });
          }
          followingElement.replaceChildren();
          const following = edges.filter(edge => edge.from === id).map(edge => labelFor(edge.to));
          if (following.length) listInto(followingElement, following);
          else followingElement.textContent = 'No subsequent courses are shown.';
          dialog.showModal();
          dialog.querySelector('button').focus();
        };
        node.addEventListener('click', open);
        node.addEventListener('keydown', event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            open();
          }
        });
        const listItem = document.createElement('li');
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = name;
        button.addEventListener('click', open);
        const requirement = document.createElement('p');
        requirement.textContent = incomingDescription(id, edges);
        listItem.append(button, requirement);
        mobileList.append(listItem);
        count++;
      });
      if (!count) throw new Error('No course descriptions could be matched');
      container.replaceChildren(svg, mobile);
    } catch (error) {
      container.textContent = 'The interactive map is unavailable. Please use the course descriptions below.';
      container.classList.add('map-status');
    }
  }

  const mapElements = document.querySelectorAll('.interactive-curriculum');
  if (!mapElements.length) return;
  fetch('../assets/course-descriptions.json')
    .then(response => { if (!response.ok) throw new Error('Course descriptions unavailable'); return response.json(); })
    .then(descriptions => mapElements.forEach(el => initialize(el, descriptions)))
    .catch(() => mapElements.forEach(el => { el.textContent = 'Course descriptions are temporarily unavailable.'; }));
})();
