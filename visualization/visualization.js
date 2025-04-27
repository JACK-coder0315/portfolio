// 引入 D3
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// 原始数据
let originalData = [
  { value: 1, label: 'Apples' },
  { value: 2, label: 'Oranges' },
  { value: 3, label: 'Mangoes' },
  { value: 4, label: 'Pears' },
  { value: 5, label: 'Limes' },
  { value: 5, label: 'Cherries' }
];

// 配色方案
let colors = d3.scaleOrdinal(d3.schemeTableau10);

// 当前状态变量
let selectedIndex = -1;
let currentQuery = '';
let filteredData = [...originalData];  // 初始就是全部数据

// 只声明一次 searchInput
let searchInput = document.querySelector('.searchBar');

// 画饼图和图例
function renderPieChart(dataGiven) {
  let svg = d3.select('#projects-pie-plot');
  svg.selectAll('path').remove();  // 清空之前的扇形
  let legend = d3.select('.legend');
  legend.selectAll('li').remove(); // 清空之前的图例

  let arcGenerator = d3.arc()
    .innerRadius(0)
    .outerRadius(50);

  let sliceGenerator = d3.pie().value(d => d.value);
  let arcData = sliceGenerator(dataGiven);

  // 画饼图的每一块
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

  // 画图例
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

// 更新高亮（点击后高亮某块）
function updateSelection() {
  let paths = d3.selectAll('#projects-pie-plot path');
  let legendItems = d3.selectAll('.legend li');

  paths.attr('class', (_, idx) => (idx === selectedIndex ? 'selected' : ''));
  legendItems.attr('class', (_, idx) => (idx === selectedIndex ? 'selected' : ''));
}

// 渲染项目卡片
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

// 更新项目区内容（根据点击、搜索变化）
function updateProjects() {
  let visibleData;

  if (selectedIndex === -1) {
    visibleData = filteredData;
  } else {
    visibleData = [filteredData[selectedIndex]];
  }

  renderProjects(visibleData);
}

// 初始渲染
renderPieChart(filteredData);

// 搜索框监听
searchInput.addEventListener('input', (event) => {
  currentQuery = event.target.value.toLowerCase();

  filteredData = originalData.filter(d => d.label.toLowerCase().includes(currentQuery));
  selectedIndex = -1;

  renderPieChart(filteredData);
});
