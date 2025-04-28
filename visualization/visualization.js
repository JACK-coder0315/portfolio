// == 自动生成蓝色导航栏 ==
console.log("Generating Navigation Bar...");

const BASE_PATH = location.hostname.includes("localhost") ? "/" : "/portfolio/";

let pages = [
  { url: "", title: "Home" },
  { url: "projects/", title: "Projects" },
  { url: "contact/", title: "Contact" },
  { url: "resume/", title: "Resume" },
  { url: "hiking/hiking.html", title: "Hiking" },
  { url: "visualization/", title: "Visualization" },
  { url: "https://github.com/JACK-coder0315", title: "GitHub" }
];

function generateNavbar() {
  let navHTML = `<nav class="nav">\n`;
  for (let p of pages) {
    let url = p.url.startsWith("http") ? p.url : BASE_PATH + p.url;
    navHTML += `<a href="${url}"${url.startsWith("http") ? ' target="_blank"' : ''}>${p.title}</a>\n`;
  }
  navHTML += `
    <label class="color-scheme">
      Theme:
      <select>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="normal">Auto</option>
      </select>
    </label>
  </nav>
  `;

  document.getElementById("nav-container")?.insertAdjacentHTML("beforeend", navHTML);

  document.querySelectorAll(".nav a").forEach((a) => {
    if (a.host === location.host && a.pathname === location.pathname) {
      a.classList.add("current");
    }
  });

  let select = document.querySelector("select");

  function setColorScheme(scheme) {
    if (scheme === "normal") {
      document.documentElement.style.removeProperty("color-scheme");
    } else {
      document.documentElement.style.setProperty("color-scheme", scheme);
    }
    select.value = scheme;
  }

  if ("colorScheme" in localStorage) {
    setColorScheme(localStorage.colorScheme);
  } else {
    setColorScheme("normal");
  }

  select.addEventListener("input", (e) => {
    localStorage.colorScheme = e.target.value;
    setColorScheme(e.target.value);
  });
}

// 调用生成导航栏
generateNavbar();

// == 导入 D3.js ==
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// == 原始数据（带年份）==
let originalData = [
  { value: 1, label: 'Data Science', year: 2025 },
  { value: 2, label: 'Web Development', year: 2024 },
  { value: 3, label: 'Machine Learning', year: 2023 },
  { value: 4, label: 'Cybersecurity', year: 2022 },
  { value: 5, label: 'Artificial Intelligence', year: 2021 },
  { value: 6, label: 'Big Data', year: 2020 }
];

let colors = d3.scaleOrdinal(d3.schemeTableau10);

let selectedIndex = -1;
let currentQuery = '';
let filteredData = [...originalData];

// == 绘制饼图和图例 ==
function renderPieChart(dataGiven) {
  let svg = d3.select('#projects-pie-plot');
  svg.selectAll('path').remove();
  let legend = d3.select('.legend');
  legend.selectAll('li').remove();

  let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
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
}

// == 更新选中状态 ==
function updateSelection() {
  let paths = d3.selectAll('#projects-pie-plot path');
  let legendItems = d3.selectAll('.legend li');

  paths.attr('class', (_, idx) => (idx === selectedIndex ? 'selected' : ''));
  legendItems.attr('class', (_, idx) => (idx === selectedIndex ? 'selected' : ''));
}

// == 渲染项目卡片 ==
function updateProjects() {
  let grid = document.querySelector('.projects-grid');
  grid.innerHTML = '';

  let visibleData = filteredData;

  if (selectedIndex !== -1) {
    let selectedLabel = filteredData[selectedIndex]?.label;
    if (selectedLabel) {
      visibleData = filteredData.filter(d => d.label === selectedLabel);
    }
  }

  visibleData.forEach((item) => {
    let card = document.createElement('div');
    card.className = 'project-card';

    let img = document.createElement('img');
    img.src = chooseImage(item.label);

    let title = document.createElement('h2');
    title.textContent = item.label;

    let desc = document.createElement('p');
    desc.textContent = getDescription(item.label);

    let year = document.createElement('p');
    year.textContent = `Year: ${item.year}`;
    year.style.fontSize = '0.9rem';
    year.style.color = '#999';

    card.appendChild(img);
    card.appendChild(title);
    card.appendChild(desc);
    card.appendChild(year);
    grid.appendChild(card);
  });
}

// == 辅助函数：根据类别选择图片 ==
function chooseImage(label) {
  if (label === 'Data Science') return 'https://source.unsplash.com/400x300/?data,science';
  if (label === 'Web Development') return 'https://source.unsplash.com/400x300/?web,development';
  if (label === 'Machine Learning') return 'https://source.unsplash.com/400x300/?machine,learning';
  if (label === 'Cybersecurity') return 'https://source.unsplash.com/400x300/?cybersecurity';
  if (label === 'Artificial Intelligence') return 'https://source.unsplash.com/400x300/?artificial,intelligence';
  if (label === 'Big Data') return 'https://source.unsplash.com/400x300/?big,data';
  return 'https://via.placeholder.com/400x300?text=Project';
}

// == 辅助函数：根据类别生成描述 ==
function getDescription(label) {
  switch (label) {
    case 'Data Science':
      return 'Data science blends domain expertise, programming skills, and knowledge of mathematics and statistics to extract meaningful insights from data.';
    case 'Web Development':
      return 'Web development involves building and maintaining websites, focusing on web design, publishing, and programming.';
    case 'Machine Learning':
      return 'Machine learning enables applications to learn and improve from experience automatically without being explicitly programmed.';
    case 'Cybersecurity':
      return 'Cybersecurity protects systems, networks, and programs from digital attacks aiming to access, alter, or destroy sensitive data.';
    case 'Artificial Intelligence':
      return 'Artificial Intelligence refers to the simulation of human intelligence processes by machines, including learning and problem-solving.';
    case 'Big Data':
      return 'Big data involves extremely large datasets that are analyzed computationally to reveal patterns, trends, and associations.';
    default:
      return 'A wonderful project category!';
  }
}

// == 搜索栏监听 ==
let searchInput = document.querySelector('.searchBar');
searchInput.addEventListener('input', (event) => {
  currentQuery = event.target.value.toLowerCase();
  filteredData = originalData.filter(d => d.label.toLowerCase().includes(currentQuery));
  selectedIndex = -1;
  renderPieChart(filteredData);
  updateProjects();
});

// == 页面初始化 ==
renderPieChart(filteredData);
updateProjects();
