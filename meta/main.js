import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

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

function processCommits(data) {
  return d3.groups(data, d => d.commit).map(([id, lines]) => {
    const f = lines[0];
    const dt = f.datetime;
    const c = {
      id,
      author: f.author,
      datetime: dt,
      hourFrac: dt.getHours() + dt.getMinutes()/60,
      totalLines: lines.length,
      url: 'https://github.com/JACK-coder0315/portfolio/commit/' + id
    };
    Object.defineProperty(c, 'lines', { value: lines });
    return c;
  });
}

function renderCommitInfo(data, commits) {
  const dl = d3.select('#stats').append('dl').attr('class','stats');
  dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
  dl.append('dd').text(data.length);
  dl.append('dt').text('Total commits');
  dl.append('dd').text(commits.length);
  const fileCount = d3.groups(data, d => d.file).length;
  dl.append('dt').text('Files');
  dl.append('dd').text(fileCount);
  const fileLengths = d3.rollups(data, v=>d3.max(v,d=>d.line), d=>d.file);
  dl.append('dt').text('Max file length');
  dl.append('dd').text(d3.max(fileLengths,d=>d[1]));
  dl.append('dt').text('Avg line length');
  dl.append('dd').text(d3.mean(data,d=>d.length).toFixed(1));
  dl.append('dt').text('Max depth');
  dl.append('dd').text(d3.max(data,d=>d.depth));
}

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
function updateTooltipVisibility(v) {
  document.getElementById('commit-tooltip').hidden = !v;
}
function isCommitSelected(sel, d, x, y) {
  if (!sel) return false;
  const [[x0,y0],[x1,y1]] = sel;
  const cx = x(d.datetime), cy = y(d.hourFrac);
  return x0<=cx && cx<=x1 && y0<=cy && cy<=y1;
}
function renderLanguageBreakdown(commits, sel, x, y) {
  const chosen = sel ? commits.filter(d=>isCommitSelected(sel,d,x,y)) : [];
  const src = chosen.length ? chosen : commits;
  const lines = src.flatMap(d=>d.lines);
  const breakdown = d3.rollup(lines,v=>v.length,d=>d.type);
  const total = lines.length;
  const cont = d3.select('#language-breakdown').html('');
  cont.selectAll('div')
    .data(Array.from(breakdown.entries()))
    .join('div').attr('class','lang')
    .html(([lang,cnt])=>`${lang}: ${cnt} (${d3.format('.1~%')(cnt/total)})`);
}

function renderScatterPlot(commits) {
  const W=1000,H=600,m={top:10,right:10,bottom:30,left:40};
  const svg = d3.select('#chart').append('svg')
    .attr('viewBox',`0 0 ${W} ${H}`).style('overflow','visible');
  const x = d3.scaleTime()
    .domain(d3.extent(commits,d=>d.datetime))
    .range([m.left, W-m.right]).nice();
  const y = d3.scaleLinear()
    .domain([0,24]).range([H-m.bottom,m.top]);
  const [mn,mx] = d3.extent(commits,d=>d.totalLines);
  const r = d3.scaleSqrt().domain([mn,mx]).range([3,20]);
  svg.append('g')
    .attr('transform',`translate(0,${H-m.bottom})`)
    .call(d3.axisBottom(x));
  svg.append('g')
    .attr('transform',`translate(${m.left},0)`)
    .call(d3.axisLeft(y).tickFormat(d=>String(d%24).padStart(2,'0')+':00'));
  svg.append('g')
    .attr('class','gridlines')
    .attr('transform',`translate(${m.left},0)`)
    .call(d3.axisLeft(y).tickFormat('').tickSize(-(W-m.left-m.right)));

  const sorted = [...commits].sort((a,b)=>b.totalLines-a.totalLines);
  const dots = svg.append('g').attr('class','dots');
  dots.selectAll('circle').data(sorted).join('circle')
    .attr('cx',d=>x(d.datetime))
    .attr('cy',d=>y(d.hourFrac))
    .attr('r',d=>r(d.totalLines))
    .style('fill','steelblue').style('fill-opacity',0.7)
    .on('mouseenter',(e,d)=>{
      d3.select(e.currentTarget)
        .transition().duration(100)
        .attr('r',r(d.totalLines)*1.5)
        .style('fill-opacity',1);
      renderTooltipContent(d);
      updateTooltipPosition(e);
      updateTooltipVisibility(true);
    })
    .on('mousemove',e=>updateTooltipPosition(e))
    .on('mouseleave',(e,d)=>{
      d3.select(e.currentTarget)
        .transition().duration(100)
        .attr('r',r(d.totalLines))
        .style('fill-opacity',0.7);
      updateTooltipVisibility(false);
    });

  const brush = d3.brush().on('start brush end',({selection})=>{
    dots.selectAll('circle').classed('selected',d=>isCommitSelected(selection,d,x,y));
    const cnt = dots.selectAll('circle.selected').size();
    d3.select('#selection-count').text(cnt?`${cnt} commits selected`:'No commits selected');
    renderLanguageBreakdown(commits,selection,x,y);
  });
  svg.call(brush);
  svg.selectAll('.dots, .overlay ~ *').raise();
}

(async()=>{
  const data = await loadData();
  const commits = processCommits(data);
  renderCommitInfo(data, commits);
  renderScatterPlot(commits);
})();