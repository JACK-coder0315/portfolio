import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

/* ---------- 常量 ---------- */
const ITEM_HEIGHT    = 80;    // 与 CSS 中 .item/.item2 { height:80px } 保持一致
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

/* ---------- 渲染 Commit 故事条目 ---------- */
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

/* ---------- 原始 renderScatter（含 tooltip & 选择回调） ---------- */
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

  // 刷选
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

  // Tooltip
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
        .style('left', `${e.clientX+10}px`)
        .style('top',  `${e.clientY+10}px`);
    })
    .on('mousemove', function(e){
      tooltip
        .style('left', `${e.clientX+10}px`)
        .style('top',  `${e.clientY+10}px`);
    })
    .on('mouseleave', function(){
      d3.select(this).attr('fill-opacity',0.7);
      tooltip.classed('visible',false);
    });
}

function renderScatterAt(containerId, allCommits, slice) {
  // 1. 清空容器并创建 SVG
  const container = d3.select(containerId).html('');
  const W = container.node().clientWidth;
  const H = container.node().clientHeight;
  const m = { top: 10, right: 10, bottom: 30, left: 40 };
  const svg = container.append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .style('overflow', 'visible');

  // 2. 比例尺
  const x = d3.scaleTime()
    .domain(d3.extent(allCommits, d => d.datetime))
    .range([m.left, W - m.right]).nice();
  const y = d3.scaleLinear()
    .domain([0, 24])
    .range([H - m.bottom, m.top]);
  const r = d3.scaleSqrt()
    .domain(d3.extent(allCommits, d => d.totalLines))
    .range([3, 20]);

  // 3. 画坐标轴 & 网格线
  svg.append('g')
    .attr('transform', `translate(0,${H - m.bottom})`)
    .call(d3.axisBottom(x));
  svg.append('g')
    .attr('transform', `translate(${m.left},0)`)
    .call(d3.axisLeft(y).tickFormat(d => `${String(d % 24).padStart(2, '0')}:00`));
  svg.append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${m.left},0)`)
    .call(d3.axisLeft(y).tickFormat('').tickSize(-(W - m.left - m.right)));

  // 4. 画点
  const dots = svg.append('g').attr('class', 'dots');
  const circles = dots.selectAll('circle')
    .data(slice.slice().sort((a, b) => b.totalLines - a.totalLines))
    .join('circle')
      .attr('cx', d => x(d.datetime))
      .attr('cy', d => y(d.hourFrac))
      .attr('r',  d => r(d.totalLines))
      .attr('fill', 'steelblue')
      .attr('fill-opacity', 0.7);

  // 5. 添加原生 <title> tooltip（最稳定的方案）
  circles.append('title')
    .text(d => {
      const date = d.datetime.toLocaleDateString('en-US', {
        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
      });
      const time = d.datetime.toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit'
      });
      return `${d.id.slice(0,7)}\n${date} ${time}\nLines: ${d.totalLines}`;
    });

  // 6. brush（保持原有逻辑即可）
  const brush = d3.brush()
    .extent([[m.left, m.top], [W - m.right, H - m.bottom]])
    .on('start brush end', ({selection}) => {
      // 如果需要联动选中效果，可以在这里处理
    });
  svg.append('g').call(brush);
}


/* ---------- 渲染语言细分 ---------- */
function renderLanguageBreakdown(selectedCommits) {
  const lines   = selectedCommits.flatMap(d=>d.lines);
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
    .map(([name, lines]) => ({ name, lines }))
    .sort((a,b)=>d3.descending(a.lines.length, b.lines.length));

  const dl   = d3.select('.files').html('');
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

/* ---------- 渲染 第二个 Scrolly 文本 ---------- */
function renderDailyItems(commits) {
  d3.select('#spacer2')
    .style('height', `${commits.length * ITEM_HEIGHT}px`);

  d3.select('#items-container2').html('')
    .selectAll('div')
    .data(commits)
    .join('div')
      .attr('class','item2')
      .style('position','absolute')
      .style('top',(d,i)=>`${i * ITEM_HEIGHT}px`)
      .html(c => {
        const dateStr = c.datetime.toLocaleDateString('en-US',{
          month:'long', day:'numeric'
        });
        const file    = c.lines[0].file;
        const minLine = d3.min(c.lines, d=>d.line);
        const maxLine = d3.max(c.lines, d=>d.line);
        const hour    = c.datetime.getHours();
        const period  = hour < 12
          ? 'it is early in the morning'
          : (hour < 13 ? 'it is around afternoon' : 'it is late in the evening');

        return `
          <p>
            On ${dateStr}, modified <code>${file}</code> (lines ${minLine}–${maxLine}).<br/>
            ${period}.
          </p>
        `;
      });
}

/* ---------- 主程序 ---------- */
(async () => {
  const raw     = await loadData();
  const commits = processCommits(raw);

  // 1) 渲染 Summary
  renderSummary(raw, commits);

  // 2) 第一组：初次渲染 + 滚动绑定
  const initialSlice = commits.slice(0, VISIBLE_COUNT);
  renderCommitItems(initialSlice, 0);
  // ← 这里用原来的 renderScatter，保留 tooltip & 选择回调
  renderScatter(commits, initialSlice);
  renderFiles(initialSlice);
  d3.select('#scroll-container1').on('scroll', function() {
    const idx   = Math.floor(this.scrollTop / ITEM_HEIGHT);
    const slice = commits.slice(idx, idx + VISIBLE_COUNT);
    renderCommitItems(slice, idx);
    renderScatter(commits, slice);
    renderFiles(slice);

    const dateStr = commits[idx].datetime.toLocaleDateString('en-US',{
      weekday:'long',year:'numeric',month:'long',day:'numeric'
    });
    d3.select('#scroll-date')
      .style('top', this.scrollTop + 'px')
      .text(dateStr);
  });

  // 3) 第二组：初次渲染文本 + 散点 + 滚动绑定
  renderDailyItems(commits);
  // ← 这里第二幅图继续用 renderScatterAt
  renderScatterAt('#daily-chart', commits, initialSlice);
  d3.select('#scroll-container2').on('scroll', function() {
    const idx   = Math.floor(this.scrollTop / ITEM_HEIGHT);
    const slice = commits.slice(idx, idx + VISIBLE_COUNT);
    renderScatterAt('#daily-chart', commits, slice);
  });
})();
