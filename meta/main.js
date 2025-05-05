import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// 1. 读取并解析 CSV
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

// 2. 聚合为提交层面
function processCommits(data) {
  return d3.groups(data, d => d.commit).map(([id, lines]) => {
    const f = lines[0];
    const dt = f.datetime;
    const c = {
      id,
      author: f.author,
      datetime: dt,
      hourFrac: dt.getHours() + dt.getMinutes() / 60,
      totalLines: lines.length,
      url: 'https://github.com/JACK-coder0315/portfolio/commit/' + id
    };
    Object.defineProperty(c, 'lines', { value: lines });
    return c;
  });
}

// 3. 渲染摘要统计
function renderCommitInfo(data, commits) {
  const dl = d3.select('#stats').append('dl').attr('class', 'stats');
  dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
  dl.append('dd').text(data.length);
  dl.append('dt').text('Total commits');
  dl.append('dd').text(commits.length);
}

// 4. 工具提示逻辑
function renderTooltipContent(c) {
  const t = document.getElementById('commit-tooltip');
  if (!c) return;
  t.innerHTML = `
    <dt>Commit</dt><dd><a href="${c.url}" target="_blank">${c.id}</a></dd>
    <dt>Date</dt><dd>${c.datetime.toLocaleString('en', { dateStyle:'full', timeStyle:'short' })}</dd>
    <dt>Author</dt><dd>${c.author}</dd>
    <dt>Lines Edited</dt><dd>${c.totalLines}</dd>
  `;
}
function updateTooltipPosition(e) {
  const t = document.getElementById('commit-tooltip');
  t.style.left = e.clientX + 10 + 'px';
  t.style.top  = e.clientY + 10 + 'px';
}
function updateTooltipVisibility(v) {
  document.getElementById('commit-tooltip').hidden = !v;
}

// 5. 绘制散点图 + 大小编码 + 交互
function renderScatterPlot(commits) {
  const W = 1000, H = 600;
  const m = { top:10, right:10, bottom:30, left:40 };
  const svg = d3.select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`);

  const x = d3.scaleTime()
    .domain(d3.extent(commits, d => d.datetime))
    .range([m.left, W - m.right]).nice();
  const y = d3.scaleLinear().domain([0,24]).range([H - m.bottom, m.top]);

  const [mn, mx] = d3.extent(commits, d => d.totalLines);
  const r = d3.scaleSqrt().domain([mn,mx]).range([3,20]);

  const sorted = commits.slice().sort((a,b)=> b.totalLines - a.totalLines);

  svg.append('g')
    .attr('transform', `translate(0,${H-m.bottom})`)
    .call(d3.axisBottom(x));
  svg.append('g')
    .attr('transform', `translate(${m.left},0)`)
    .call(d3.axisLeft(y).tickFormat(d=>String(d%24).padStart(2,'0')+':00'));

  svg.append('g')
    .attr('class','gridlines')
    .attr('transform',`translate(${m.left},0)`)
    .call(d3.axisLeft(y).tickFormat('').tickSize(-(W-m.left-m.right)));

  svg.append('g').attr('class','dots')
    .selectAll('circle')
    .data(sorted)
    .join('circle')
    .attr('cx', d=>x(d.datetime))
    .attr('cy', d=>y(d.hourFrac))
    .attr('r',  d=>r(d.totalLines))
    .style('fill','steelblue')
    .style('fill-opacity',0.7)
    .on('mouseenter',(e,d)=>{
      d3.select(e.currentTarget).style('fill-opacity',1);
      renderTooltipContent(d);
      updateTooltipPosition(e);
      updateTooltipVisibility(true);
    })
    .on('mousemove', e=> updateTooltipPosition(e))
    .on('mouseleave',(e)=>{
      d3.select(e.currentTarget).style('fill-opacity',0.7);
      updateTooltipVisibility(false);
    });
}

// 主流程启动
(async()=>{
  const data = await loadData();
  const commits = processCommits(data);
  renderCommitInfo(data, commits);
  renderScatterPlot(commits);
})();