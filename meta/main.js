import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

/* ---------- 常量 ---------- */
const ITEM_HEIGHT = 60;
const VISIBLE_COUNT = 10;
const fileTypeColors = d3.scaleOrdinal(d3.schemeTableau10);

/* ---------- 数据加载 ---------- */
async function loadData() {
  return d3.csv('loc.csv', row => ({
    ...row,
    line: +row.line,
    depth: +row.depth,
    length: +row.length,
    datetime: new Date(row.datetime)
  }));
}

function processCommits(data) {
  return d3.groups(data, d => d.commit).map(([id, lines]) => {
    const dt = lines[0].datetime;
    const commit = {
      id,
      author: lines[0].author,
      datetime: dt,
      hourFrac: dt.getHours() + dt.getMinutes() / 60,
      totalLines: lines.length,
      url: `https://github.com/JACK-coder0315/portfolio/commit/${id}`
    };
    Object.defineProperty(commit, 'lines', { value: lines });
    return commit;
  });
}

/* ---------- Summary ---------- */
function renderSummary(data, commits) {
  const dl = d3.select('#stats').html('').append('dl').attr('class', 'stats');

  const add = (label, value) => { dl.append('dt').text(label); dl.append('dd').text(value); };

  add('Total LOC', data.length);
  add('Total Commits', commits.length);
  add('Average Depth', d3.mean(data, d => d.depth).toFixed(1));
  add('Maximum Depth', d3.max(data, d => d.depth));
  add('Number Of Files', d3.groups(data, d => d.file).length);
  const byFile = d3.groups(data, d => d.file).map(([f, lines]) => lines.length);
  add('Average File Length (In Lines)', d3.mean(byFile).toFixed(0));
  /* peak work time */
  const hourCounts = d3.rollup(commits, v => v.length, d => d.datetime.getHours());
  const peakHour = Array.from(hourCounts).sort((a, b) => b[1] - a[1])[0][0];
  add('Peak Work Time', peakHour >= 18 || peakHour < 6 ? 'At Night' : 'Daytime');
  add('Longest Line', d3.max(data, d => d.length));
}

/* ---------- Tooltip ---------- */
function showTip(d, e) {
  d3.select('#tip-id').text(d.id.slice(0, 7));
  d3.select('#tip-date').text(d.datetime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
  d3.select('#tip-time').text(d.datetime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));
  d3.select('#tip-author').text(d.author);
  d3.select('#tip-lines').text(d.totalLines);

  const tip = d3.select('#commit-tooltip').style('left', e.clientX + 10 + 'px').style('top', e.clientY + 10 + 'px');
  tip.attr('hidden', null);
}
function hideTip() { d3.select('#commit-tooltip').attr('hidden', true); }

/* ---------- 散点图 ---------- */
function renderScatter(commits) {
  const W = 1000, H = 600, margin = { top: 10, right: 10, bottom: 30, left: 40 };
  const svg = d3.select('#chart').html('').append('svg').attr('viewBox', `0 0 ${W} ${H}`).style('overflow', 'visible');

  const x = d3.scaleTime().domain(d3.extent(commits, d => d.datetime)).range([margin.left, W - margin.right]).nice();
  const y = d3.scaleLinear().domain([0, 24]).range([H - margin.bottom, margin.top]);
  const r = d3.scaleSqrt().domain(d3.extent(commits, d => d.totalLines)).range([3, 20]);

  svg.append('g').attr('transform', `translate(0,${H - margin.bottom})`).call(d3.axisBottom(x));
  svg.append('g').attr('transform', `translate(${margin.left},0)`).call(d3.axisLeft(y).tickFormat(d => `${String(d % 24).padStart(2, '0')}:00`));

  svg.append('g').selectAll('circle').data(commits.sort((a, b) => b.totalLines - a.totalLines)).join('circle')
    .attr('cx', d => x(d.datetime))
    .attr('cy', d => y(d.hourFrac))
    .attr('r', d => r(d.totalLines))
    .attr('fill', 'steelblue').attr('fill-opacity', 0.7)
    .on('mouseenter', function (e, d) { d3.select(this).attr('fill-opacity', 1); showTip(d, e); })
    .on('mousemove', e => d3.select('#commit-tooltip').style('left', e.clientX + 10 + 'px').style('top', e.clientY + 10 + 'px'))
    .on('mouseleave', function () { d3.select(this).attr('fill-opacity', 0.7); hideTip(); });
}

/* ---------- 文件单元 ---------- */
function renderFiles(commits) {
  const files = d3.groups(commits.flatMap(c => c.lines), d => d.file).map(([n, l]) => ({ name: n, lines: l })).sort((a, b) => d3.descending(a.lines.length, b.lines.length));
  const dl = d3.select('.files').html('');
  const rows = dl.selectAll('div').data(files, d => d.name).join('div');
  rows.append('dt').append('code').text(d => d.name);
  rows.append('dt').html(d => `<small>${d.lines.length} lines</small>`);
  rows.append('dd')
    .selectAll('div').data(d => d.lines).join('div')
    .attr('class', 'line')
    .style('background', d => fileTypeColors(d.type));
}

/* ---------- Items (scrollytelling) ---------- */
function renderItems(slice) {
  const items = d3.select('#items-container').selectAll('div').data(slice, d => d.id).join('div')
    .attr('class', 'item')
    .style('position', 'absolute')
    .style('top', (d, i) => `${i * ITEM_HEIGHT}px`)
    .html(d => {
      const date = d.datetime.toLocaleString('en', { dateStyle: 'full', timeStyle: 'short' });
      return `<p>On ${date}, I made <a href="${d.url}" target="_blank">another glorious commit</a>. I edited ${d.totalLines} lines.</p>`;
    });
}

/* ---------- 主程序 ---------- */
(async () => {
  const raw = await loadData();
  const commits = processCommits(raw);

  renderSummary(raw, commits);

  const totalHeight = (commits.length - 1) * ITEM_HEIGHT;
  d3.select('#spacer').style('height', `${totalHeight}px`);

  const scrollC = d3.select('#scroll-container');

  function update(idx) {
    idx = Math.max(0, Math.min(idx, commits.length - VISIBLE_COUNT));
    const slice = commits.slice(idx, idx + VISIBLE_COUNT);
    renderItems(slice);
    renderScatter(slice);
    renderFiles(slice);
  }

  scrollC.on('scroll', () => {
    const idx = Math.floor(scrollC.property('scrollTop') / ITEM_HEIGHT);
    update(idx);
  });

  update(0);
})();
