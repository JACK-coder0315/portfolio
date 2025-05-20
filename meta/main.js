import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

/* ---------- 常量 ---------- */
const ITEM_HEIGHT    = 80;   // 与 CSS 中 .item、.item-story { height:80px } 保持一致
const VISIBLE_COUNT  = 10;
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
    .map(([id, lines], idx) => ({
      id,
      idx,
      author     : lines[0].author,
      datetime   : lines[0].datetime,
      hourFrac   : lines[0].datetime.getHours() + lines[0].datetime.getMinutes() / 60,
      totalLines : lines.length,
      url        : `https://github.com/JACK-coder0315/portfolio/commit/${id}`,
      lines
    }))
    .sort((a, b) => a.datetime - b.datetime);
}

/* ---------- 渲染摘要统计 ---------- */
function renderSummary(data, commits) {
  const dl = d3.select('#stats').html('')
    .append('dl').attr('class','stats');
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
  add('Peak Work Time', peakHour>=18||peakHour<6 ? 'At Night':'Daytime');

  add('Longest Line', d3.max(data, d=>d.length));
}

/* ---------- 渲染提交叙事条目 ---------- */
function narrativeCommit(c) {
  const dateStr  = c.datetime.toLocaleString('en', { dateStyle:'full', timeStyle:'short' });
  const linkText = c.idx
    ? 'another glorious commit'
    : 'my first commit, and it was glorious';
  return `<p>On ${dateStr}, I made <a href="${c.url}" target="_blank">${linkText}</a>. I edited <b>${c.totalLines}</b> lines.</p>`;
}
function renderCommitItems(slice, startIdx) {
  d3.select('#items-container1')
    .style('transform', `translateY(${startIdx * ITEM_HEIGHT}px)`);
  d3.select('#items-container1').selectAll('div')
    .data(slice, d=>d.id)
    .join('div')
      .attr('class','item')
      .style('position','absolute')
      .style('top',(d,i)=>`${i * ITEM_HEIGHT}px`)
      .html(narrativeCommit);
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
    .data(slice.slice().sort((a,b)=>b.totalLines-a.totalLines))
    .join('circle')
      .attr('cx', d=>x(d.datetime))
      .attr('cy', d=>y(d.hourFrac))
      .attr('r' , d=>r(d.totalLines))
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

      const selected = allCommits.filter(d => {
        if (!selection) return false;
        const [[x0,y0],[x1,y1]] = selection;
        const cx = x(d.datetime), cy = y(d.hourFrac);
        return x0<=cx && cx<=x1 && y0<=cy && cy<=y1;
      });

      d3.select('#selection-count')
        .text(selected.length
          ? `${selected.length} commits selected`
          : 'No commits selected');

      renderLanguageBreakdown(selected);
      renderFiles(selected);
    });

  svg.append('g').call(brush);
  svg.selectAll('.dots, .overlay ~ *').raise();

  const tooltip = d3.select('#commit-tooltip');
  dots.selectAll('circle')
    .on('mouseenter', function(e,d){
      d3.select(this).attr('fill-opacity',1);
      d3.select('#tip-id').text(d.id.slice(0,7));
      d3.select('#tip-date').text(
        d.datetime.toLocaleDateString('en-US',{
          weekday:'long',year:'numeric',month:'long',day:'numeric'
        })
      );
      d3.select('#tip-time').text(
        d.datetime.toLocaleTimeString('en-US',{
          hour:'numeric',minute:'2-digit'
        })
      );
      d3.select('#tip-author').text(d.author);
      d3.select('#tip-lines').text(d.totalLines);

      tooltip
        .classed('visible',true)
        .style('left', (e.clientX+10)+'px')
        .style('top',  (e.clientY+10)+'px');
    })
    .on('mousemove', function(e){
      tooltip
        .style('left', (e.clientX+10)+'px')
        .style('top',  (e.clientY+10)+'px');
    })
    .on('mouseleave', function(){
      d3.select(this).attr('fill-opacity',0.7);
      tooltip.classed('visible',false);
    });
}

/* ---------- 渲染语言细分 ---------- */
function renderLanguageBreakdown(selected) {
  const lines   = selected.flatMap(d=>d.lines);
  const summary = d3.rollup(lines, v=>v.length, d=>d.type);
  const total   = d3.sum(summary.values());

  const dl = d3.select('#language-breakdown').html('');
  if (total === 0) return;

  for (const [lang, cnt] of summary) {
    dl.append('dt').text(lang);
    dl.append('dd').text(`${cnt} lines (${d3.format('.1~%')(cnt/total)})`);
  }
}

/* ---------- 渲染文件列表可视化 ---------- */
function renderFiles(commits) {
  const files = d3.groups(commits.flatMap(c=>c.lines), d=>d.file)
    .map(([name, lines])=>({ name, count: lines.length, type: lines[0].type }))
    .sort((a,b)=>b.count - a.count);

  const dl   = d3.select('.files').html('');
  const rows = dl.selectAll('div')
    .data(files, d=>d.name)
    .join('div');

  rows.append('dt')
    .html(d=>`<code>${d.name}</code><small>${d.count} lines</small>`);

  rows.append('dd')
    .selectAll('div')
    .data(d=>Array(d.count).fill(d).map((f,i)=>f))
    .join('div')
      .attr('class','line')
      .style('background', d=>fileTypeColors(d.type));
}

/* ---------- 渲染文件活动散点图（底部左侧） ---------- */
function renderActivityScatter(data) {
  const W = 400, H = 400, m = { top:20, right:20, bottom:40, left:50 };
  const svg = d3.select('#activity-chart').html('')
    .append('svg')
      .attr('viewBox', `0 0 ${W} ${H}`);

  const x = d3.scaleLinear()
      .domain([0,1])
      .range([m.left, W-m.right]);
  const y = d3.scaleLinear()
      .domain([0, d3.max(data, d=>d.changedLines)])
      .nice()
      .range([H-m.bottom, m.top]);
  const r = d3.scaleSqrt()
      .domain(d3.extent(data, d=>d.changedLines))
      .range([2,8]);

  svg.append('g')
     .attr('transform', `translate(0,${H-m.bottom})`)
     .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format('.0%')));
  svg.append('g')
     .attr('transform', `translate(${m.left},0)`)
     .call(d3.axisLeft(y));

  svg.selectAll('circle')
    .data(data)
    .join('circle')
      .attr('cx', d=>x(d.progress))
      .attr('cy', d=>y(d.changedLines))
      .attr('r' , d=>r(d.changedLines))
      .attr('fill', d=>fileTypeColors(d.type))
      .attr('fill-opacity', 0.7);

  // 图标题
  svg.append('text')
    .attr('x', W/2).attr('y', m.top - 5)
    .attr('text-anchor','middle')
    .text('File Changes Over Project Lifecycle');
  // 轴标签
  svg.append('text')
    .attr('x', W/2).attr('y', H - 5)
    .attr('text-anchor','middle')
    .text('Progress');
  svg.append('text')
    .attr('transform','rotate(-90)')
    .attr('x', -H/2).attr('y', 15)
    .attr('text-anchor','middle')
    .text('Changed Lines');
}

/* ---------- 渲染文件演进滚动叙事（底部右侧） ---------- */
function renderFileStoryItems(stories) {
  d3.select('#spacer-story')
    .style('height', `${stories.length * ITEM_HEIGHT}px`);

  const container = d3.select('#items-file-story');
  container.selectAll('div')
    .data(stories)
    .join('div')
      .attr('class','item-story')
      .style('position','absolute')
      .style('top',(d,i)=>`${i * ITEM_HEIGHT}px`)
      .html(d => `<p>${d.text}</p>`);
}

/* ---------- 主流程 ---------- */
(async () => {
  const raw     = await loadData();
  const commits = processCommits(raw);

  // 渲染摘要
  renderSummary(raw, commits);

  // 首次渲染提交区域
  const initialSlice = commits.slice(0, VISIBLE_COUNT);
  renderCommitItems(initialSlice, 0);
  renderScatter(commits, initialSlice);
  renderFiles(initialSlice);

  // 初始化滚动日期
  d3.select('#scroll-date')
    .style('top','0px')
    .text(
      commits[0].datetime.toLocaleDateString('en-US',{
        weekday:'long',year:'numeric',month:'long',day:'numeric'
      })
    );

  // 同步滚动逻辑
  d3.select('#scroll-container1')
    .on('scroll', function() {
      const idx   = Math.floor(this.scrollTop / ITEM_HEIGHT);
      const slice = commits.slice(idx, idx + VISIBLE_COUNT);

      renderCommitItems(slice, idx);
      renderScatter(commits, slice);
      renderFiles(slice);

      const dateStr = commits[idx]
        .datetime
        .toLocaleDateString('en-US',{
          weekday:'long',year:'numeric',month:'long',day:'numeric'
        });
      d3.select('#scroll-date')
        .style('top', this.scrollTop + 'px')
        .text(dateStr);
    });

  // —— 底部：文件活动和故事 —— //

  // 1. 组装文件活动数据
  const fileCommitGroups = d3.groups(raw, d=>d.file, d=>d.commit);
  const activityData = fileCommitGroups.flatMap(([file, commitGroups]) =>
    commitGroups.map(([commitId, rows]) => ({
      file,
      type        : rows[0].type,
      datetime    : rows[0].datetime,
      changedLines: rows.length
    }))
  );
  const dates = activityData.map(d=>d.datetime);
  const t0 = d3.min(dates), t1 = d3.max(dates);
  activityData.forEach(d => {
    d.progress = (d.datetime - t0) / (t1 - t0);
  });

  // 2. 渲染文件活动散点
  renderActivityScatter(activityData);

  // 3. 生成并渲染“文件演进故事”叙事（选取改动最多的那个文件）
  const totalByFile = d3.rollup(
    activityData,
    v => d3.sum(v, d=>d.changedLines),
    d => d.file
  );
  const topFile = Array.from(totalByFile.entries())
    .sort((a,b)=>b[1] - a[1])[0][0];

  const fileEvents = activityData
    .filter(d => d.file === topFile)
    .sort((a,b)=>a.datetime - b.datetime);

  const first = fileEvents[0];
  const peak  = fileEvents.reduce((p,c)=> c.changedLines>p.changedLines?c:p, first);
  const last  = fileEvents[fileEvents.length-1];

  const fmtDate = d => d.datetime.toLocaleDateString('en-US',{
    year:'numeric',month:'short',day:'numeric'
  });
  const stories = [
    { text: `On ${fmtDate(first)}, file ${topFile} first appeared (changed ${first.changedLines} lines).` },
    { text: `On ${fmtDate(peak)}, file ${topFile} had its largest change: ${peak.changedLines} lines.` },
    { text: `On ${fmtDate(last)}, file ${topFile} last changed (${last.changedLines} lines).` }
  ];

  renderFileStoryItems(stories);
})();
