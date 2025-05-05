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
  { url: "https://github.com/JACK-coder0315", title: "GitHub" },
  { url: "meta/index.html", title: "Meta"     }
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
  </nav>`;

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

// 生成导航栏
generateNavbar();

// == 导入 D3.js ==
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// == 原始数据 ==
let originalData = [
  { value: 1, label: 'Data Science', year: 2022 },
  { value: 2, label: 'Web Development', year: 2023 },
  { value: 3, label: 'Machine Learning', year: 2023 },
  { value: 4, label: 'Cybersecurity', year: 2024 },
  { value: 5, label: 'Artificial Intelligence', year: 2024 },
  { value: 6, label: 'Big Data', year: 2022 }
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
      .html(`<span class="swatch"></span> ${d.label} (${d.year}) <em>(${d.value})</em>`)
      .on('click', () => {
        selectedIndex = selectedIndex === idx ? -1 : idx;
        updateSelection();
        updateProjects();
      });
  });

  updateSelection();
  renderProjects(dataGiven);
}

// == 更新选中状态 ==
function updateSelection() {
  let paths = d3.selectAll('#projects-pie-plot path');
  let legendItems = d3.selectAll('.legend li');

  paths.attr('class', (_, idx) => (idx === selectedIndex ? 'selected' : ''));
  legendItems.attr('class', (_, idx) => (idx === selectedIndex ? 'selected' : ''));
}

// == 渲染项目卡片 ==
function renderProjects(visibleData) {
  let grid = document.querySelector('.projects-grid');
  grid.innerHTML = '';

  visibleData.forEach((item) => {
    let card = document.createElement('div');
    card.className = 'project-card';

    let img = document.createElement('img');

    if (item.label === 'Data Science') {
      img.src = '../images/data%20science.jpg';
    } else if (item.label === 'Web Development') {
      img.src = '../images/web%20development.png';
    } else if (item.label === 'Machine Learning') {
      img.src = '../images/machine%20learning.jpg';
    } else if (item.label === 'Cybersecurity') {
      img.src = '../images/cybersecurity.jpg';
    } else if (item.label === 'Artificial Intelligence') {
      img.src = '../images/artificial%20intelligence.jpg';
    } else if (item.label === 'Big Data') {
      img.src = '../images/big%20data.jpg';
    } else {
      img.src = 'https://via.placeholder.com/400x300?text=Project';
    }

    img.onerror = () => {
      img.src = 'https://via.placeholder.com/400x300?text=Image+Not+Found';
    };

    let title = document.createElement('h2');
    title.textContent = `${item.label} (${item.year})`;

    let desc = document.createElement('p');
    desc.textContent = getDescription(item.label);

    card.appendChild(img);
    card.appendChild(title);
    card.appendChild(desc);
    grid.appendChild(card);
  });
}

function getDescription(label) {
  if (label === 'Data Science') {
    return 'Data science combines programming, statistics, and domain expertise to gain actionable insights from data.';
  } else if (label === 'Web Development') {
    return 'Web development involves building and maintaining websites and web applications.';
  } else if (label === 'Machine Learning') {
    return 'Machine learning creates algorithms that can learn patterns from data and make predictions.';
  } else if (label === 'Cybersecurity') {
    return 'Cybersecurity protects systems and networks from malicious attacks and data breaches.';
  } else if (label === 'Artificial Intelligence') {
    return 'Artificial Intelligence simulates human thinking to perform tasks like decision-making and problem-solving.';
  } else if (label === 'Big Data') {
    return 'Big data analyzes huge datasets to reveal insights, trends, and relationships for better decision-making.';
  } else {
    return 'A wonderful project category!';
  }
}

let searchInput = document.querySelector('.searchBar');

searchInput.addEventListener('input', (event) => {
  currentQuery = event.target.value.toLowerCase();
  filteredData = originalData.filter(d =>
    d.label.toLowerCase().includes(currentQuery) || d.year.toString().includes(currentQuery)
  );
  selectedIndex = -1;
  renderPieChart(filteredData);
});

renderPieChart(filteredData);
