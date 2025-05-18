import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

/* =========================================================
   全局变量
   ========================================================= */
let commitProgress = 100;       // 滑块百分比 (0–100)
let timeScale;                  // Date ↔︎ 百分比 尺规
let commitMaxTime;              // 对应百分比的 Date
let filteredCommits = [];       // 过滤后要画的提交

// 技术 → 颜色  (Tableau10 调色盘)
const fileTypeColors = d3.scaleOrdinal(d3.schemeTableau10);

/* =========================================================
   读取 / 预处理数据
   ========================================================= */
async function loadData () {
  return d3.csv('loc.csv', row => ({
    ...row,
    line:     +row.line,
    depth:    +row.depth,
    length:   +row.length,
    date:     new Date(`${row.date}T00:00${row.timezone}`),
    datetime: new Date(row.datetime)
  }));
}

function processCommits (data) {
  return d3.groups(data, d => d.commit).map(([id, lines]) => {
    const first = lines[0];
    const dt    = first.datetime;

    const commit = {
      id,
      author: first.author,
      datetime: dt,
      hourFrac: dt.getHours() + dt.getMinutes() / 60,
      totalLines: lines.length,
      url: `https://github.com/JACK-coder0315/portfolio/commit/${id}`
    };

    // 把每条行记录挂在 commit 上但不枚举
    Object.defineProperty(commit, 'lines', { value: lines });
    return commit;
  });
}

/* =========================================================
   摘要统计 (实验 6)
   ========================================================= */
function renderCommitInfo (data, commits) {
  const dl = d3.select('#stats').append('dl').attr('class', 'stats');

  dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
  dl.append('dd').text(data.length);

  dl.append('dt').text('Total commits');
  dl.append('dd').text(commits.length);

  const fileCount = d3.groups(data, d => d.file).length;
  dl.append('dt').text('Files');
  dl.append('dd').text(fileCount);

  const maxFile = d3.rollups(data, v => d3.max(v, d => d.line), d => d.file);
  dl.append('dt').text('Max file length');
  dl.append('dd').text(d3.max(maxFile, d => d[1]));

  dl.append('dt').text('Avg line length');
  dl.append('dd').text(d3.mean(data, d => d.length).toFixed(1));

  dl.append('dt').text('Max depth');
  dl.append('dd').text(d3.max(data, d => d.depth));
}

/* =========================================================
   Tooltip
   ========================================================= */
function renderTooltipContent (d) {
  document.getElementById('commit-link').href        = d.url;
  document.getElementById('commit-link').textContent = d.id;
  document.getElementById('commit-date').textContent   = d.datetime.toLocaleString();
  document.getElementById('commit-author').textContent = d.author;
  document.getElementById('commit-lines').textContent  = d.totalLines;
}
function updateTooltipPosition (e) {
  const t = document.getElementById('commit-tooltip');
  t.style.left = `${e.clientX + 10}px`;
  t.style.top  = `${e.clientY + 10}px`;
}
function updateTooltipVisibility (visible) {
  document.getElementById('commit-tooltip').hidden = !visible;
}

/* =========================================================
   语言细分 (来自实验 6)
   ========================================================= */
function isCommitSelected (sel, d, x, y) {
  if (!sel) return false;
  const [[x0, y0], [x1, y1]] = sel;
  const cx = x(d.datetime);
  const cy = y(d.hourFrac);
  return x0 <= cx && cx <= x1 && y0 <= cy && cy <= y1;
}

function renderLanguageBreakdown (commits, sel, x, y) {
  const chosen  = sel ? commits.filter(d => isCommitSelected(sel, d, x, y)) : [];
  const source  = chosen.length ? chosen : commits;
  const lines   = source.flatMap(d => d.lines);
  const summary = d3.rollup(lines, v => v.length, d => d.type);
  const total   = lines.length;

  const container = d3.select('#language-breakdown').html('');
  container.selectAll('div')
    .data(Array.from(summary.entries()))
    .join('div')
      .attr('class', 'lang')
      .html(([lang, count]) => `${lang}: ${count} (${d3.format('.1~%')(count / total)})`);
}

/* =========================================================
   散点图 (提交时间 × 一天中的小时)
   ========================================================= */
function renderScatterPlot (commits) {
  const W = 1000, H = 600;
  const margin = { top: 10, right: 10, bottom: 30, left: 40 };

  const svg = d3.select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .style('overflow', 'visible');

  // 尺规
  const x = d3.scaleTime()
              .domain(d3.extent(commits, d => d.datetime))
              .range([margin.left, W - margin.right])
              .nice();

  const y = d3.scaleLinear()
              .domain([0, 24])
              .range([H - margin.bottom, margin.top]);

  const [minL, maxL] = d3.extent(commits, d => d.totalLines);
  const r = d3.scaleSqrt().domain([minL, maxL]).range([3, 20]);

  // 坐标轴
  svg.append('g')
     .attr('transform', `translate(0,${H - margin.bottom})`)
     .call(d3.axisBottom(x));

  svg.append('g')
     .attr('transform', `translate(${margin.left},0)`)
     .call(d3.axisLeft(y).tickFormat(d => String(d % 24).padStart(2, '0') + ':00'));

  // 网格
  svg.append('g')
     .attr('class', 'gridlines')
     .attr('transform', `translate(${margin.left},0)`)
     .call(d3.axisLeft(y).tickFormat('').tickSize(-(W - margin.left - margin.right)));

  // 数据点
  const dots = svg.append('g').attr('class', 'dots');
  dots.selectAll('circle')
      .data(commits.slice().sort((a, b) => b.totalLines - a.totalLines))
      .join('circle')
        .attr('cx', d => x(d.datetime))
        .attr('cy', d => y(d.hourFrac))
        .attr('r',  d => r(d.totalLines))
        .style('fill', 'steelblue')
        .style('fill-opacity', 0.7)
        .on('mouseenter', (e, d) => {
          d3.select(e.currentTarget)
            .transition().duration(100)
            .attr('r', r(d.totalLines) * 1.5)
            .style('fill-opacity', 1);
          renderTooltipContent(d);
          updateTooltipPosition(e);
          updateTooltipVisibility(true);
        })
        .on('mousemove', e => updateTooltipPosition(e))
        .on('mouseleave', (e, d) => {
          d3.select(e.currentTarget)
            .transition().duration(100)
            .attr('r', r(d.totalLines))
            .style('fill-opacity', 0.7);
          updateTooltipVisibility(false);
        });

  // Brush
  const brush = d3.brush().on('start brush end', ({ selection }) => {
    dots.selectAll('circle')
        .classed('selected', d => isCommitSelected(selection, d, x, y));

    const selCount = dots.selectAll('circle.selected').size();
    d3.select('#selection-count')
      .text(selCount ? `${selCount} commits selected` : 'No commits selected');

    renderLanguageBreakdown(commits, selection, x, y);
  });

  svg.call(brush);
  svg.selectAll('.dots, .overlay ~ *').raise();
}

/* =========================================================
   文件单元可视化
   ========================================================= */
function computeFiles (commits) {
  const lines = commits.flatMap(d => d.lines);
  return d3.groups(lines, d => d.file)
           .map(([name, lines]) => ({ name, lines }))
           .sort((a, b) => d3.descending(a.lines.length, b.lines.length));
}

function renderFiles (files) {
  const dl = d3.select('.files').html('');

  // 每个文件一个 <div>
  const fileDiv = dl.selectAll('div')
    .data(files, d => d.name)
    .join('div');

  // 文件名
  fileDiv.append('dt')
         .append('code')
         .text(d => d.name);

  // 行数 (小字)
  fileDiv.append('dt')
         .html(d => `<small>${d.lines.length}&nbsp;lines</small>`);

  // 单元可视化
  fileDiv.append('dd')
         .selectAll('div')
         .data(d => d.lines)
         .join('div')
           .attr('class', 'line')
           .style('background', d => fileTypeColors(d.type));
}

/* =========================================================
   过滤 & 更新
   ========================================================= */
function filterCommitsByTime (allCommits) {
  filteredCommits = allCommits.filter(d => d.datetime <= commitMaxTime);
}

function updateScatterPlot (data) {
  d3.select('#chart svg').remove();
  renderScatterPlot(data);
}

/* =========================================================
   主程序
   ========================================================= */
(async () => {
  const rawData = await loadData();
  const commits = processCommits(rawData);

  /* 初始化时间尺规 */
  timeScale      = d3.scaleTime(d3.extent(commits, d => d.datetime), [0, 100]);
  commitMaxTime  = timeScale.invert(commitProgress);

  /* 初始过滤 & 绘图 */
  filterCommitsByTime(commits);

  renderCommitInfo(rawData, commits);
  renderScatterPlot(filteredCommits);
  renderFiles(computeFiles(filteredCommits));

  /* 设置滑块 UI */
  const timeSlider   = document.getElementById('time-slider');
  const selectedTime = document.getElementById('selectedTime');

  timeSlider.value = commitProgress;
  timeSlider.style.setProperty('--value', timeSlider.value);
  selectedTime.textContent = commitMaxTime.toLocaleString(
    'en-US', { dateStyle: 'long', timeStyle: 'short' }
  );

  /* 滑块事件 */
  timeSlider.addEventListener('input', () => {
    timeSlider.style.setProperty('--value', timeSlider.value);

    commitProgress = +timeSlider.value;
    commitMaxTime  = timeScale.invert(commitProgress);

    selectedTime.textContent = commitMaxTime.toLocaleString(
      'en-US', { dateStyle: 'long', timeStyle: 'short' }
    );

    filterCommitsByTime(commits);
    updateScatterPlot(filteredCommits);
    renderFiles(computeFiles(filteredCommits));
  });
})();
