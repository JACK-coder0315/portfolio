import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

let originalData = [
  { value: 1, label: 'Apples' },
  { value: 2, label: 'Oranges' },
  { value: 3, label: 'Mangoes' },
  { value: 4, label: 'Pears' },
  { value: 5, label: 'Limes' },
  { value: 5, label: 'Cherries' }
];

let colors = d3.scaleOrdinal(d3.schemeTableau10);

let selectedIndex = -1;
let currentQuery = '';
let filteredData = [...originalData];

function renderPieChart(dataGiven) {
  let svg = d3.select('#projects-pie-plot');
  svg.selectAll('path').remove();
  let legend = d3.select('.legend');
  legend.selectAll('li').remove();

  let arcGenerator = d3.arc()
    .innerRadius(0)
    .outerRadius(50);

  let sliceGenerator = d3.pie().value(d => d.value);
  let arcData = sliceGenerator(dataGiven);

  arcData.forEach((d, idx) => {
    svg.append('path')
      .attr('d', arcGenerator(d))
      .attr('fill', colors(idx))
      .attr('data-idx', idx)
      .on('click', () => {
        selectedIndex = selectedIndex === idx ? -1 : idx;
        updateSelection();
        updateProjects();
      });
  });

  dataGiven.forEach((d, idx) => {
    legend.append('li')
      .attr('style', `--color:${colors(idx)}`)
      .attr('data-idx', idx)
      .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`)
      .on('click', () => {
        selectedIndex = selectedIndex === idx ? -1 : idx;
        updateSelection();
        updateProjects();
      });
  });

  updateSelection();
  updateProjects();
}

function updateSelection() {
  let paths = d3.selectAll('#projects-pie-plot path');
  let legendItems = d3.selectAll('.legend li');

  paths.attr('class', (_, idx) => (idx === selectedIndex ? 'selected' : ''));
  legendItems.attr('class', (_, idx) => (idx === selectedIndex ? 'selected' : ''));
}

function renderProjects(projectsToRender) {
  let projectsContainer = document.querySelector('.projects-grid');
  projectsContainer.innerHTML = '';

  projectsToRender.forEach(proj => {
    let card = document.createElement('div');
    card.className = 'project-card';
    card.innerHTML = `
      <img src="https://via.placeholder.com/300x150?text=Coming+Soon" alt="Project Image">
      <h2>${proj.label}</h2>
      <p>Sample project description.</p>
    `;
    projectsContainer.appendChild(card);
  });
}

function updateProjects() {
  let visibleData;

  if (selectedIndex === -1) {
    visibleData = filteredData;
  } else {
    visibleData = [filteredData[selectedIndex]];
  }

  renderProjects(visibleData);
}

renderPieChart(filteredData);

let searchInput = document.querySelector('.searchBar');

searchInput.addEventListener('input', (event) => {
  currentQuery = event.target.value.toLowerCase();

  filteredData = originalData.filter(d => d.label.toLowerCase().includes(currentQuery));
  selectedIndex = -1;

  renderPieChart(filteredData);
});

