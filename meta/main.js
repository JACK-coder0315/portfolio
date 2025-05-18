import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// === Lab8 Step1 变量声明 ===
let commitProgress = 100;
let timeScale;
// commits 数组由 loadData() 填充
let commits = [];

// 读取并解析 CSV
async function loadData() {
  const data = await d3.csv('loc.csv', row => ({
    ...row,
    line: +row.line,
    depth: +row.depth,
    length: +row.length,
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime)
  }));

  // 聚合到提交层面
  commits = d3.groups(data, d => d.commit).map(([id, lines]) => ({
    id,
    author: lines[0].author,
    datetime: lines[0].datetime,
    hourFrac: lines[0].datetime.getHours() + lines[0].datetime.getMinutes() / 60,
    totalLines: lines.length,
    url: `https://github.com/JACK-coder0315/portfolio/commit/${id}`,
    lines
  })).sort((a, b) => a.datetime - b.datetime);

  init();
}

// 初始化函数
function init() {
  // 1. 初始化时间比例尺
  timeScale = d3.scaleTime()
    .domain(d3.extent(commits, d => d.datetime))
    .range([0, 100]);

  // 2. 初始化滑块 UI
  const display = document.getElementById('time-display');
  display.textContent = timeScale.invert(commitProgress).toLocaleString();

  const slider = document.getElementById('time-slider');
  slider.addEventListener('input', () => {
    commitProgress = +slider.value;
    const cutoffDate = timeScale.invert(commitProgress);
    display.textContent = cutoffDate.toLocaleString();
    // 3. 根据 cutoffDate 过滤并更新散点图
    const filtered = commits.filter(c => c.datetime <= cutoffDate);
    updateScatterPlot(filtered);
  });

  // 4. 渲染初始散点图与统计
  renderCommitInfo(commentsDataToChart(), commits);
  updateScatterPlot(commits);
}

// 渲染摘要统计（原有不变）
function renderCommitInfo(data, commits) {
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

// 更新 tooltip 内容与位置（原有不变）
function renderTooltipContent(d) { /* ... */ }
function updateTooltipPosition(e) { /* ... */ }
function updateTooltipVisibility(visible) { /* ... */ }

// 选中判断（原有不变）
function isCommitSelected(sel, d, x, y) { /* ... */ }

// 语言细分渲染（原有不变）
function renderLanguageBreakdown(commits, sel, x, y) { /* ... */ }

// 更新散点图：支持滑块过滤
function updateScatterPlot(commitsData) {
  // 清空旧 svg
  d3.select('#chart svg').remove();

  // 新建 svg
  const W = 1000, H = 600;
  const margin = { top: 10, right: 10, bottom: 30, left: 40 };
  const svg = d3.select('#chart').append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .style('overflow', 'visible');

  // 比例尺
  const x = d3.scaleTime()
    .domain(d3.extent(commitsData, d => d.datetime))
    .range([margin.left, W - margin.right]).nice();
  const y = d3.scaleLinear()
    .domain([0, 24])
    .range([H - margin.bottom, margin.top]);
  const [minL, maxL] = d3.extent(commitsData, d => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minL, maxL]).range([3, 20]);

  // 轴与网格线
  svg.append('g')
    .attr('transform', `translate(0, ${H - margin.bottom})`)
    .call(d3.axisBottom(x));
  svg.append('g')
    .attr('transform', `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(y).tickFormat(d => String(d % 24).padStart(2, '0') + ':00'));
  svg.append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(y).tickFormat('').tickSize(-(W - margin.left - margin.right)));

  // 绘制点
  const sorted = commitsData.slice().sort((a, b) => b.totalLines - a.totalLines);
  const dots = svg.append('g').attr('class', 'dots');
  dots.selectAll('circle').data(sorted).join('circle')
    .attr('cx', d => x(d.datetime))
    .attr('cy', d => y(d.hourFrac))
    .attr('r', d => rScale(d.totalLines))
    .style('fill', 'steelblue')
    .style('fill-opacity', 0.7)
    .on('mouseenter', (e, d) => {
      d3.select(e.currentTarget)
        .transition().duration(100)
        .attr('r', rScale(d.totalLines) * 1.5)
        .style('fill-opacity', 1);
      renderTooltipContent(d);
      updateTooltipPosition(e);
      updateTooltipVisibility(true);
    })
    .on('mousemove', e => updateTooltipPosition(e))
    .on('mouseleave', (e, d) => {
      d3.select(e.currentTarget)
        .transition().duration(100)
        .attr('r', rScale(d.totalLines))
        .style('fill-opacity', 0.7);
      updateTooltipVisibility(false);
    });

  // 刷选
  const brush = d3.brush().on('start brush end', ({ selection }) => {
    dots.selectAll('circle').classed('selected', d => isCommitSelected(selection, d, x, y));
    d3.select('#selection-count').text(
      dots.selectAll('circle.selected').size()
        ? `${dots.selectAll('circle.selected').size()} commits selected`
        : 'No commits selected'
    );
    renderLanguageBreakdown(commitsData, selection, x, y);
  });
  svg.call(brush);
}

// 辅助：将原始 data 转为 renderCommitInfo 所需格式
function commentsDataToChart() {
  // 假定原始 CSV 数据已加载到全局 data 变量，否则需修改
  return d3.csv('loc.csv', d3.autoType);
}

// 启动
loadData();