let commits = [];

d3.csv('loc.csv', d3.autoType).then(data => {
  // 按日期分组
  const nested = d3.group(data, d => d.date);
  commits = Array.from(nested, ([date, recs]) => ({
    date: new Date(date),
    lines: recs.map(r => ({ file: r.file, type: r.type }))
  })).sort((a, b) => a.date - b.date);
  init();
});

// 预定义 SVG 容器和比例尺变量
const evoSvg = d3.select('#evo-chart'),
      width = +evoSvg.attr('width'),
      height = +evoSvg.attr('height');
let timeScale, xScale, rScale;

function initScales() {
  timeScale = d3.scaleTime()
    .domain(d3.extent(commits, d => d.date))
    .range([0, 100]);
  xScale = d3.scaleTime().range([0, width]);
  rScale = d3.scaleSqrt().range([2, 10]);
}

function bindSlider() {
  d3.select('#slider').on('input', function() {
    const pct = +this.value;
    const cutoff = timeScale.invert(pct);
    d3.select('#date-label').text(d3.timeFormat('%Y-%m-%d')(cutoff));
    updateEvo(commits.filter(d => d.date <= cutoff));
  });
}

function updateEvo(filtered) {
  xScale.domain(d3.extent(filtered, d => d.date));
  rScale.domain(d3.extent(filtered, d => d.lines.length));

  const circles = evoSvg.selectAll('circle').data(filtered, d => d.date);
  circles.exit().remove();
  circles.enter().append('circle')
    .attr('cx', d => xScale(d.date))
    .attr('cy', height / 2)
    .attr('r', 0)
    .transition().duration(500)
      .attr('r', d => rScale(d.lines.length));
}

function updateFiles(slice) {
  const all = slice.flatMap(d => d.lines.map(l => ({ file: l.file, type: l.type })));
  const files = Array.from(d3.group(all, d => d.file), ([name, recs]) => ({
    name,
    lines: recs,
    type: recs[0].type
  })).sort((a, b) => b.lines.length - a.lines.length);

  const dl = d3.select('#file-race .files');
  dl.selectAll('*').remove();

  dl.selectAll('dt').data(files).enter().append('dt').text(d => d.name);
  dl.selectAll('dd').data(files).enter().append('dd')
    .selectAll('div').data(d => d.lines).enter().append('div')
    .attr('class', 'line')
    .style('background-color', d => d3.schemeTableau10[d.type]);
}

const ITEM_H = 60, VISIBLE = 8;

function initScrollCommits() {
  const N = commits.length;
  d3.select('#spacer-commits').style('height', `${N * ITEM_H}px`);
  d3.select('#scroll-container-commits').on('scroll', () => {
    const idx = Math.floor(d3.select('#scroll-container-commits').property('scrollTop') / ITEM_H);
    renderCommits(idx);
  });
}

function renderCommits(start) {
  const slice = commits.slice(start, start + VISIBLE);
  updateEvo(slice);

  const items = d3.select('#items-container-commits')
    .selectAll('.item').data(slice, d => d.date);
  items.exit().remove();
  items.enter().append('div').attr('class', 'item')
    .merge(items)
    .style('top', (d,i) => `${i * ITEM_H}px`)
    .html(d => `<p>${d3.timeFormat('%Y-%m-%d')(d.date)} — ${d.lines.length} 行</p>`);
}

function initScrollFiles() {
  const all = commits.flatMap(d => d.lines.map(l => ({ file: l.file, type: l.type })));
  const files = Array.from(d3.group(all, d => d.file), ([name, recs]) => ({ name, lines: recs, type: recs[0].type }))
    .sort((a, b) => b.lines.length - a.lines.length);
  const N = files.length;
  d3.select('#spacer-files').style('height', `${N * ITEM_H}px`);
  d3.select('#scroll-container-files').on('scroll', () => {
    const idx = Math.floor(d3.select('#scroll-container-files').property('scrollTop') / ITEM_H);
    renderFiles(files.slice(idx, idx + VISIBLE));
  });
}

function renderFiles(slice) {
  updateFiles(slice);

  const items = d3.select('#items-container-files')
    .selectAll('.item').data(slice, d => d.name);
  items.exit().remove();
  items.enter().append('div').attr('class', 'item')
    .merge(items)
    .style('top', (d,i) => `${i * ITEM_H}px`)
    .html(d => `<p>${d.name}: ${d.lines.length} 行</p>`);
}

function init() {
  initScales();
  bindSlider();
  initScrollCommits();
  initScrollFiles();
  updateEvo([]);
  updateFiles([]);
  renderCommits(0);
  renderFiles([]);
}