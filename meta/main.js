import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// 读取并解析 CSV
async function loadData() {
  return d3.csv('loc.csv', row => ({
    ...row,
    line: +row.line,
    depth: +row.depth,
    length: +row.length,
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime)
  }));
}

// 聚合到提交层面
function processCommits(data) {
  return d3.groups(data, d => d.commit).map(([id, lines]) => {
    const first = lines[0];
    const dt = first.datetime;
    const commit = {
      id,
      author: first.author,
      datetime: dt,
      hourFrac: dt.getHours() + dt.getMinutes() / 60,
      totalLines: lines.length,
      url: 'https://github.com/JACK-coder0315/portfolio/commit/' + id
    };
    // 隐藏原始行数据
    Object.defineProperty(commit, 'lines', { value: lines });
    return commit;
  });
}

// 渲染摘要统计
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

// 更新 tooltip 内容与位置
function renderTooltipContent(d) {
  document.getElementById('commit-link').href = d.url;
  document.getElementById('commit-link').textContent = d.id;
  document.getElementById('commit-date').textContent   = d.datetime.toLocaleString();
  document.getElementById('commit-author').textContent = d.author;
  document.getElementById('commit-lines').textContent  = d.totalLines;
}
function updateTooltipPosition(e) {
  const t = document.getElementById('commit-tooltip');
  t.style.left = e.clientX + 10 + 'px';
  t.style.top  = e.clientY + 10 + 'px';
}
function updateTooltipVisibility(visible) {
  document.getElementById('commit-tooltip').hidden = !visible;
}

// brush 选中判断
function isCommitSelected(sel, d, x, y) {
  if (!sel) return false;
  const [[x0, y0], [x1, y1]] = sel;
  const cx = x(d.datetime), cy = y(d.hourFrac);
  return x0 <= cx && cx <= x1 && y0 <= cy && cy <= y1;
}

// 渲染语言细分
function renderLanguageBreakdown(commits, sel, x, y) {
  const chosen = sel ? commits.filter(d => isCommitSelected(sel, d, x, y)) : [];
  const source = chosen.length ? chosen : commits;
  const lines = source.flatMap(d => d.lines);
  const breakdown = d3.rollup(lines, v => v.length, d => d.type);
  const total = lines.length;
  const container = d3.select('#language-breakdown').html('');
  container.selectAll('div')
    .data(Array.from(breakdown.entries()))
    .join('div').attr('class', 'lang')
    .html(([lang, count]) => `${lang}: ${count} (${d3.format('.1~%')(count/total)})`);
}

// 绘制散点图 + tooltips + brushing
function renderScatterPlot(commits) {
  const W = 1000, H = 600;
  const margin = { top: 10, right: 10, bottom: 30, left: 40 };
  const svg = d3.select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .style('overflow', 'visible');

  const x = d3.scaleTime()
    .domain(d3.extent(commits, d => d.datetime))
    .range([margin.left, W - margin.right]).nice();
  const y = d3.scaleLinear()
    .domain([0, 24])
    .range([H - margin.bottom, margin.top]);
  const [minL, maxL] = d3.extent(commits, d => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minL, maxL]).range([3, 20]);

  // 轴
  svg.append('g')
    .attr('transform', `translate(0, ${H - margin.bottom})`)
    .call(d3.axisBottom(x));
  svg.append('g')
    .attr('transform', `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(y).tickFormat(d => String(d % 24).padStart(2, '0') + ':00'));

  // 网格线
  svg.append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(y).tickFormat('').tickSize(-(W - margin.left - margin.right)));

  // 数据点
  const sorted = commits.slice().sort((a, b) => b.totalLines - a.totalLines);
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
    const count = dots.selectAll('circle.selected').size();
    d3.select('#selection-count').text(count ? `${count} commits selected` : 'No commits selected');
    renderLanguageBreakdown(commits, selection, x, y);
  });
  svg.call(brush);
  svg.selectAll('.dots, .overlay ~ *').raise();
}

// 启动
(async () => {
  const data = await loadData();
  const commits = processCommits(data);
  renderCommitInfo(data, commits);
  renderScatterPlot(commits);
})();