import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

/* ---------- 常量 ---------- */
const ITEM_HEIGHT   = 100;   // 与 .css 中 .item { height: 100px; } 保持一致
const VISIBLE_COUNT = 10;
const fileTypeColors = d3.scaleOrdinal(d3.schemeTableau10);

/* ---------- 数据加载 ---------- */
async function loadData() {
  return d3.csv('loc.csv?' + Date.now(), row => ({
    ...row,
    line     : +row.line,
    depth    : +row.depth,
    length   : +row.length,
    datetime : new Date(row.datetime)
  }));
}

/* ---------- 提取并按时间升序排序提交 ---------- */
function processCommits(data) {
  return d3.groups(data, d => d.commit)
    .map(([id, lines], idx) => {
      const dt = lines[0].datetime;
      return {
        id,
        idx,
        author     : lines[0].author,
        datetime   : dt,
        hourFrac   : dt.getHours() + dt.getMinutes() / 60,
        totalLines : lines.length,
        url        : `https://github.com/JACK-coder0315/portfolio/commit/${id}`,
        lines
      };
    })
    .sort((a, b) => a.datetime - b.datetime);
}

/* ---------- 渲染摘要统计 ---------- */
function renderSummary(data, commits) {
  const dl = d3.select('#stats').html('')
    .append('dl').attr('class', 'stats');
  const add = (label, value) => {
    dl.append('dt').text(label);
    dl.append('dd').text(value);
  };

  add('Total LOC', data.length);
  add('Total Commits', commits.length);
  add('Average Depth', d3.mean(data, d=>d.depth).toFixed(1));
  add('Maximum Depth', d3.max(data, d=>d.depth));
  add('Number Of Files', d3.groups(data, d=>d.file).length);

  const byFile = d3.rollups(data, v=>v.length, d=>d.file).map(d=>d[1]);
  add('Average File Length (In Lines)', d3.mean(byFile).toFixed(0));

  const hourCounts = d3.rollup(commits, v=>v.length, c=>c.datetime.getHours());
  const peakHour   = d3.greatest(hourCounts, d=>d[1])[0];
  add('Peak Work Time', peakHour >= 18 || peakHour < 6 ? 'At Night' : 'Daytime');

  add('Longest Line', d3.max(data, d=>d.length));
}

/* ---------- 渲染散点图 + 刷选 + Tooltip ---------- */
function renderScatter(allCommits, slice) {
  const W = 1000, H = 600, m = { top:10, right:10, bottom:30, left:40 };
  const svg = d3.select('#chart').html('')
    .append('svg')
      .attr('viewBox', `0 0 ${W} ${H}`)
      .style('overflow','visible');

  const x = d3.scaleTime()
      .domain(d3.extent(allCommits, d=>d.datetime))
      .range([m.left, W-m.right]).nice();
  const y = d3.scaleLinear()
      .domain([0,24])
      .range([H-m.bottom, m.top]);
  const r = d3.scaleSqrt()
      .domain(d3.extent(allCommits, d=>d.totalLines))
      .range([3,20]);

  svg.append('g')
      .attr('transform', `translate(0,${H-m.bottom})`)
      .call(d3.axisBottom(x));
  svg.append('g')
      .attr('transform', `translate(${m.left},0)`)
      .call(d3.axisLeft(y).tickFormat(d=>`${String(d%24).padStart(2,'0')}:00`));
  svg.append('g')
      .attr('class','gridlines')
      .attr('transform', `translate(${m.left},0)`)
      .call(d3.axisLeft(y).tickFormat('').tickSize(-(W-m.left-m.right)));

  const dots = svg.append('g').attr('class','dots');
  dots.selectAll('circle')
    .data(slice.slice().sort((a,b)=>b.totalLines - a.totalLines))
    .join('circle')
      .attr('cx', d=>x(d.datetime))
      .attr('cy', d=>y(d.hourFrac))
      .attr('r',  d=>r(d.totalLines))
      .attr('fill','steelblue')
      .attr('fill-opacity',0.7);

  const brush = d3.brush()
    .extent([[m.left,m.top],[W-m.right,H-m.bottom]])
    .on('start brush end', ({selection}) => {
      dots.selectAll('circle')
        .classed('selected', d => {
          if (!selection) return false;
          const [[x0,y0],[x1,y1]] = selection;
          const cx = x(d.datetime), cy = y(d.hourFrac);
          return x0<=cx && cx<=x1 && y0<=cy && cy<=y1;
        });

      const selectedCommits = allCommits.filter(d => {
        if (!selection) return false;
        const [[x0,y0],[x1,y1]] = selection;
        const cx = x(d.datetime), cy = y(d.hourFrac);
        return x0<=cx && cx<=x1 && y0<=cy && cy<=y1;
      });

      d3.select('#selection-count')
        .text(selectedCommits.length
              ? `${selectedCommits.length} commits selected`
              : 'No commits selected');

      renderLanguageBreakdown(selectedCommits);
      renderFiles(selectedCommits);
    });

  svg.append('g').call(brush);
  svg.selectAll('.dots, .overlay ~ *').raise();

  const tooltip = d3.select('#commit-tooltip');
  dots.selectAll('circle')
    .on('mouseenter', function(e,d) {
      d3.select(this).attr('fill-opacity',1);
      d3.select('#tip-id').text(d.id.slice(0,7));
      d3.select('#tip-date').text(
        d.datetime.toLocaleDateString('en-US', {
          weekday:'long', year:'numeric', month:'long', day:'numeric'
        })
      );
      d3.select('#tip-time').text(
        d.datetime.toLocaleTimeString('en-US', {
          hour:'numeric', minute:'2-digit'
        })
      );
      d3.select('#tip-author').text(d.author);
      d3.select('#tip-lines').text(d.totalLines);
      tooltip
        .classed('visible', true)
        .style('left',  (e.clientX+10) + 'px')
        .style('top',   (e.clientY+10) + 'px');
    })
    .on('mousemove', function(e) {
      tooltip
        .style('left', (e.clientX+10)+'px')
        .style('top',  (e.clientY+10)+'px');
    })
    .on('mouseleave', function() {
      d3.select(this).attr('fill-opacity',0.7);
      tooltip.classed('visible', false);
    });
}

/* ---------- 渲染语言细分 ---------- */
function renderLanguageBreakdown(selectedCommits) {
  const lines   = selectedCommits.flatMap(d=>d.lines);
  const summary = d3.rollup(lines, v=>v.length, d=>d.type);
  const total   = d3.sum(summary.values());

  const dl = d3.select('#language-breakdown').html('');
  if (total === 0) return;
  for (const [lang,cnt] of summary) {
    dl.append('dt').text(lang);
    dl.append('dd').text(`${cnt} lines (${d3.format('.1~%')(cnt/total)})`);
  }
}

/* ---------- 渲染文件列表可视化（Commit 点阵） ---------- */
function renderFiles(commits) {
  const files = d3.groups(commits.flatMap(c=>c.lines), d=>d.file)
    .map(([name,lines]) => ({ name, lines }))
    .sort((a,b)=>d3.descending(a.lines.length,b.lines.length));

  const dl = d3.select('.files').html('');
  const rows = dl.selectAll('div')
    .data(files, d=>d.name)
    .join('div');

  rows.append('dt')
    .html(d=>`<code>${d.name}</code><small>${d.lines.length} lines</small>`);
  rows.append('dd')
    .selectAll('div')
    .data(d=>d.lines)
    .join('div')
      .attr('class','line')
      .style('background', d=>fileTypeColors(d.type));
}

/* ---------- 故事 Narrative ---------- */
function narrative(c) {
  const dateStr  = c.datetime.toLocaleString('en', { dateStyle:'full', timeStyle:'short' });
  const linkText = c.idx
    ? 'another glorious commit'
    : 'my first commit, and it was glorious';
  return `<p>On ${dateStr}, I made <a href="${c.url}" target="_blank">${linkText}</a>. I edited <b>${c.totalLines}</b> lines.</p>`;
}

function renderItems(slice, startIdx) {
  d3.select('#items-container')
    .style('transform', `translateY(${startIdx * ITEM_HEIGHT}px)`);
  d3.select('#items-container').selectAll('div')
    .data(slice, d=>d.id)
    .join('div')
      .attr('class','item')
      .style('position','absolute')
      .style('top', (d,i)=>`${i*ITEM_HEIGHT}px`)
      .html(narrative);
}

/* ---------- 新：渲染 File-Size Narrative & 可视化 ---------- */
function renderFileItems(commit) {
  const cont = d3.select('#file-items-container').html('');
  // 提交头
  cont.append('div').attr('class','item')
    .html(`<p><b>${commit.id.slice(0,7)}</b> @ ${commit.datetime.toLocaleDateString('en-US', {
      month:'short', day:'numeric', year:'numeric'
    })}</p>`);
  // 各文件行数
  const groups = d3.groups(commit.lines, d=>d.file)
    .sort((a,b)=>b[1].length - a[1].length);
  groups.forEach(([file, lines]) => {
    cont.append('div').attr('class','item')
      .html(`<p><code>${file}</code>: ${lines.length} lines edited</p>`);
  });
}

function renderFileVis(commit) {
  const dl = d3.select('#file-chart').html('')
    .append('dl').attr('class','files');
  const groups = d3.groups(commit.lines, d=>d.file)
    .sort((a,b)=>d3.descending(a[1].length,b[1].length));
  groups.forEach(([file, lines]) => {
    const row = dl.append('div');
    row.append('dt').html(`<code>${file}</code><small>${lines.length} lines</small>`);
    const dd = row.append('dd');
    dd.selectAll('div')
      .data(lines)
      .join('div')
        .attr('class','line')
        .style('background', d=>fileTypeColors(d.type));
  });
}

/* ---------- 主程序 ---------- */
(async () => {
  const raw     = await loadData();
  const commits = processCommits(raw);

  renderSummary(raw, commits);

  // 设置 spacer 高度
  d3.select('#spacer')
    .style('height', `${(commits.length-1)*ITEM_HEIGHT}px`);
  d3.select('#file-spacer')
    .style('height', `${(commits.length-1)*80}px`);  // 每条 80px

  const scrollC      = d3.select('#scroll-container');
  const fileScrollC  = d3.select('#file-scroll-container');

  function update(idx) {
    idx = Math.max(0, Math.min(idx, commits.length - VISIBLE_COUNT));
    const slice = commits.slice(idx, idx + VISIBLE_COUNT);
    renderItems(slice, idx);
    renderScatter(commits, slice);
    renderFiles(slice);

    // File-size section
    const c = commits[idx];
    if (c) {
      renderFileItems(c);
      renderFileVis(c);
    }
  }

  // 监听滚动
  scrollC.on('scroll', () => {
    const scrollTop = scrollC.property('scrollTop');
    const idx       = Math.floor(scrollTop / ITEM_HEIGHT);
    update(idx);
  });

  // 首次渲染
  update(0);
})();
