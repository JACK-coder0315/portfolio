import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

/* =========================================================
   配置常量
   ========================================================= */
const ITEM_HEIGHT   = 60;   // 每条 story 占高
const VISIBLE_COUNT = 10;   // 同时可见条数
const fileTypeColors = d3.scaleOrdinal(d3.schemeTableau10);

/* =========================================================
   读取与预处理
   ========================================================= */
async function loadData () {
  return d3.csv('loc.csv', row => ({
    ...row,
    line:     +row.line,
    depth:    +row.depth,
    length:   +row.length,
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
    Object.defineProperty(commit, 'lines', { value: lines });
    return commit;
  });
}

/* =========================================================
   摘要统计
   ========================================================= */
function renderCommitInfo (data, commits) {
  const dl = d3.select('#stats').append('dl').attr('class', 'stats');
  dl.html('');                      // 清空
  dl.append('dt').html('Total <abbr title="Lines of Code">LOC</abbr>');
  dl.append('dd').text(data.length);
  dl.append('dt').text('Total commits');
  dl.append('dd').text(commits.length);
}

/* =========================================================
   Tooltip
   ========================================================= */
function renderTooltipContent (d) {
  d3.select('#commit-link').attr('href', d.url).text(d.id);
  d3.select('#commit-date').text(d.datetime.toLocaleString());
  d3.select('#commit-author').text(d.author);
  d3.select('#commit-lines').text(d.totalLines);
}
function updateTooltipPosition (e) {
  d3.select('#commit-tooltip')
    .style('left', `${e.clientX + 10}px`)
    .style('top',  `${e.clientY + 10}px`);
}
function updateTooltipVisibility (v) {
  d3.select('#commit-tooltip').attr('hidden', !v);
}

/* =========================================================
   散点图
   ========================================================= */
function renderScatterPlot (commits) {
  const W = 1000, H = 600, margin = {top:10,right:10,bottom:30,left:40};
  const svg = d3.select('#chart').html('').append('svg')
                .attr('viewBox',`0 0 ${W} ${H}`)
                .style('overflow','visible');

  const x = d3.scaleTime()
              .domain(d3.extent(commits, d => d.datetime))
              .range([margin.left, W-margin.right]).nice();
  const y = d3.scaleLinear().domain([0,24]).range([H-margin.bottom,margin.top]);
  const r = d3.scaleSqrt()
              .domain(d3.extent(commits,d=>d.totalLines))
              .range([3,20]);

  svg.append('g').attr('transform',`translate(0,${H-margin.bottom})`)
     .call(d3.axisBottom(x));
  svg.append('g').attr('transform',`translate(${margin.left},0)`)
     .call(d3.axisLeft(y).tickFormat(d=>String(d%24).padStart(2,'0')+':00'));

  svg.append('g')
     .attr('class','dots')
     .selectAll('circle')
     .data(commits.sort((a,b)=>b.totalLines-a.totalLines))
     .join('circle')
       .attr('cx',d=>x(d.datetime))
       .attr('cy',d=>y(d.hourFrac))
       .attr('r', d=>r(d.totalLines))
       .attr('fill','steelblue')
       .attr('fill-opacity',.7)
       .on('mouseenter',(e,d)=>{
          d3.select(e.currentTarget)
            .transition().duration(100)
            .attr('r', r(d.totalLines)*1.5)
            .attr('fill-opacity',1);
          renderTooltipContent(d);
          updateTooltipPosition(e);
          updateTooltipVisibility(true);
       })
       .on('mousemove',updateTooltipPosition)
       .on('mouseleave',(e,d)=>{
          d3.select(e.currentTarget)
            .transition().duration(100)
            .attr('r', r(d.totalLines))
            .attr('fill-opacity',.7);
          updateTooltipVisibility(false);
       });
}

/* =========================================================
   文件单元可视化
   ========================================================= */
function renderFiles (commits) {
  const files = d3.groups(commits.flatMap(c=>c.lines), d=>d.file)
                 .map(([name,lines])=>({name,lines}))
                 .sort((a,b)=>d3.descending(a.lines.length,b.lines.length));

  const dl = d3.select('.files').html('');
  const div = dl.selectAll('div').data(files,d=>d.name).join('div');

  div.append('dt').append('code').text(d=>d.name);
  div.append('dt').html(d=>`<small>${d.lines.length} lines</small>`);
  div.append('dd')
     .selectAll('div')
     .data(d=>d.lines)
     .join('div')
       .attr('class','line')
       .style('background',d=>fileTypeColors(d.type));
}

/* =========================================================
   Scrollytelling Items
   ========================================================= */
function renderItems (slice) {
  const items = d3.select('#items-container')
                  .selectAll('div')
                  .data(slice, d=>d.id)
                  .join('div')
                    .attr('class','item')
                    .style('position','absolute')
                    .style('top',(d,idx)=>`${idx*ITEM_HEIGHT}px`)
                    .html(d=>{
                      const dateStr = d.datetime.toLocaleString(
                        'en',{dateStyle:'full',timeStyle:'short'});
                      return `
                        <p>
                          On ${dateStr}, I made
                          <a href="${d.url}" target="_blank">${d.id.slice(0,7)}</a>,
                          editing ${d.totalLines} lines across
                          ${d3.rollups(d.lines,v=>v.length,l=>l.file).length}
                          files.
                        </p>`;
                    });
}

/* =========================================================
   主程序
   ========================================================= */
(async () => {
  const raw  = await loadData();
  const commits = processCommits(raw);

  /* 页面静态信息 */
  renderCommitInfo(raw, commits);

  /* spacer 高度 & 滚动处理 */
  const totalHeight = (commits.length-1) * ITEM_HEIGHT;
  d3.select('#spacer').style('height', `${totalHeight}px`);

  const scrollC = d3.select('#scroll-container');
  let startIdx  = 0;

  function updateView(idx){
    startIdx = Math.max(0, Math.min(idx, commits.length-VISIBLE_COUNT));
    const slice = commits.slice(startIdx, startIdx+VISIBLE_COUNT);
    renderItems(slice);
    renderScatterPlot(slice);
    renderFiles(slice);
  }

  scrollC.on('scroll', () => {
    const sTop = scrollC.property('scrollTop');
    const idx  = Math.floor(sTop / ITEM_HEIGHT);
    updateView(idx);
  });

  /* 初始渲染 */
  updateView(0);
})();
