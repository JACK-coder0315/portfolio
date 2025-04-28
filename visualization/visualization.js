// 引入 D3
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// 项目分类数据 + 合理描述
let originalData = [
  { value: 3, label: 'Web Development', description: 'Projects building responsive and interactive websites.' },
  { value: 4, label: 'Data Visualization', description: 'Projects creating charts and graphs using D3.js and other tools.' },
  { value: 2, label: 'Machine Learning', description: 'Projects involving classification, prediction, and data modeling.' },
  { value: 3, label: 'Mobile Applications', description: 'Projects developing apps for Android and iOS platforms.' },
  { value: 2, label: 'Game Development', description: 'Projects designing and programming games.' },
  { value: 1, label: 'Cybersecurity', description: 'Projects focused on network security, encryption, and threat analysis.' }
];

// 配色
let colors = d3.scaleOrdinal(d3.schemeTableau10);

// 状态管理
let selectedIndex = -1;
let currentQuery = '';
let filteredData = [...originalData];

// 搜索框
let searchInput = document.querySelector('.searchBar');

// 绘制饼图 + 图例
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

  // 绘制每个扇区
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

  // 绘制图例
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

// 更新饼图和图例的选中状态
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
      <img src="https://via.placeholder.com/300x150?text=${encodeURIComponent(proj.label)}" alt="Project Image">
      <h2>${proj.label}</h2>
      <p>${proj.description}</p>
    `;
    projectsContainer.appendChild(card);
  });
}

// 更新可见项目 (✅ 修复了搜索+饼图点击同时生效的问题)
function updateProjects() {
  let visibleData = originalData.filter(d => 
    d.label.toLowerCase().includes(currentQuery)
  );

  if (selectedIndex !== -1) {
    const selectedLabel = filteredData[selectedIndex]?.label;
    visibleData = visibleData.filter(d => d.label === selectedLabel);
  }

  renderProjects(visibleData);
}

// 页面初始渲染
renderPieChart(filteredData);

// 搜索框输入监听
searchInput.addEventListener('input', (event) => {
  currentQuery = event.target.value.toLowerCase();
  filteredData = originalData.filter(d => 
    d.label.toLowerCase().includes(currentQuery)
  );
  selectedIndex = -1;
  renderPieChart(filteredData);
});
