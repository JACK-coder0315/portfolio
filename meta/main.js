import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

/* ---------- 常量 ---------- */
const ITEM_HEIGHT   = 100;   // 与 CSS 中 .item/.item2 { height:100px } 保持一致
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
  add('Average Depth', d3.mean(data, d => d.depth).toFixed(1));
  add('Maximum Depth', d3.max(data, d => d.depth));
  add('Number Of Files', d3.groups(data, d => d.file).length);

  const byFile = d3.rollups(data, v => v.length, d => d.file).map(d => d[1]);
  add('Average File Length (In Lines)', d3.mean(byFile).toFixed(0));

  const hourCounts = d3.rollup(commits, v => v.length, c => c.datetime.getHours());
  const peakHour   = d3.greatest(hourCounts, d => d[1])[0];
  add('Peak Work Time', peakHour >= 18 || peakHour < 6 ? 'At Night' : 'Daytime');

  add('Longest Line', d3.max(data, d => d.length));
}

/* ---------- 渲染散点图 + 刷选 + Tooltip ---------- */
function renderScatter(allCommits, slice) {
  const W = 1000, H = 600, m = { top: 10, right: 10, bottom: 30, left: 40 };
  const svg = d3.select('#chart').html('')
    .append('svg')
      .attr('viewBox', `0 0 ${W} ${H}`)
      .style('overflow', 'visible');

  // x/y/r 轴度量都用全量 commits
  const x = d3.scaleTime()
      .domain(d3.extent(allCommits, d => d.datetime))
      .range([m.left, W - m.right]).nice();
  const y = d3.scaleLinear()
      .domain([0, 24])
      .range([H - m.bottom, m.top]);
  const r = d3.scaleSqrt()
      .domain(d3.extent(allCommits, d => d.totalLines))
      .range([3, 20]);

  // 画轴 & 网格
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

  // 渲染切片 slice 中的点
  const dots = svg.append('g').attr('class', 'dots');
  dots.selectAll('circle')
    .data(slice.slice().sort((a, b) => b.totalLines - a.totalLines))
    .join('circle')
      .attr('cx', d => x(d.datetime))
      .attr('cy', d => y(d.hourFrac))
      .attr('r',  d => r(d.totalLines))
      .attr('fill', 'steelblue')
      .attr('fill-opacity', 0.7);

  // 刷选
  const brush = d3.brush()
    .extent([[m.left, m.top], [W - m.right, H - m.bottom]])
    .on('start brush end', ({ selection }) => {
      dots.selectAll('circle')
        .classed('selected', d => {
          if (!selection) return false;
          const [[x0, y0], [x1, y1]] = selection;
          const cx = x(d.datetime), cy = y(d.hourFrac);
          return x0 <= cx && cx <= x1 && y0 <= cy && cy <= y1;
        });

      const selectedCommits = allCommits.filter(d => {
        if (!selection) return false;
        const [[x0, y0], [x1, y1]] = selection;
        const cx = x(d.datetime), cy = y(d.hourFrac);
        return x0 <= cx && cx <= x1 && y0 <= cy && cy <= y1;
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

  // Tooltip
  const tooltip = d3.select('#commit-tooltip');
  dots.selectAll('circle')
    .on('mouseenter', function(e, d) {
      d3.select(this).attr('fill-opacity', 1);
      d3.select('#tip-id').text(d.id.slice(0, 7));
      d3.select('#tip-date').text(
        d.datetime.toLocaleDateString('en-US', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        })
      );
      d3.select('#tip-time').text(
        d.datetime.toLocaleTimeString('en-US', {
          hour: 'numeric', minute: '2-digit'
        })
      );
      d3.select('#tip-author').text(d.author);
      d3.select('#tip-lines').text(d.totalLines);

      tooltip
        .classed('visible', true)
        .style('left', (e.clientX + 10) + 'px')
        .style('top',  (e.clientY + 10) + 'px');
    })
    .on('mousemove', function(e) {
      tooltip
        .style('left', (e.clientX + 10) + 'px')
        .style('top',  (e.clientY + 10) + 'px');
    })
    .on('mouseleave', function() {
      d3.select(this).attr('fill-opacity', 0.7);
      tooltip.classed('visible', false);
    });
}

/* ---------- 渲染语言细分 ---------- */
function renderLanguageBreakdown(selectedCommits) {
  const lines   = selectedCommits.flatMap(d => d.lines);
  const summary = d3.rollup(lines, v => v.length, d => d.type);
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
  const files = d3.groups(commits.flatMap(c => c.lines), d => d.file)
    .map(([name, lines]) => ({ name, lines }))
    .sort((a, b) => d3.descending(a.lines.length, b.lines.length));

  const dl   = d3.select('.files').html('');
  const rows = dl.selectAll('div')
    .data(files, d => d.name)
    .join('div');

  rows.append('dt')
    .html(d => `<code>${d.name}</code><small>${d.lines.length} lines</small>`);

  rows.append('dd')
    .selectAll('div')
    .data(d => d.lines)
    .join('div')
      .attr('class', 'line')
      .style('background', d => fileTypeColors(d.type));
}

/* ---------- Scrollytelling Items for Commits ---------- */
function narrativeCommit(c) {
  const dateStr  = c.datetime.toLocaleString('en', { dateStyle: 'full', timeStyle: 'short' });
  const linkText = c.idx
    ? 'another glorious commit'
    : 'my first commit, and it was glorious';
  return `<p>On ${dateStr}, I made <a href="${c.url}" target="_blank">${linkText}</a>. I edited <b>${c.totalLines}</b> lines.</p>`;
}
function renderCommitItems(slice, startIdx) {
  d3.select('#items-container1')
    .style('transform', `translateY(${startIdx * ITEM_HEIGHT}px)`);
  d3.select('#items-container1').selectAll('div')
    .data(slice, d => d.id)
    .join('div')
      .attr('class','item')
      .style('position','absolute')
      .style('top',   (d,i) => `${i * ITEM_HEIGHT}px`)
      .html(narrativeCommit);
}

/* ---------- 新增：Scrollytelling Items for Daily Work Summary ---------- */
function renderDailyItems(allCommits, slice, startIdx) {
  d3.select('#items-container2')
    .style('transform', `translateY(${startIdx * ITEM_HEIGHT}px)`);
  d3.select('#items-container2').selectAll('div')
    .data(slice, d => d.id)
    .join('div')
      .attr('class','item2')
      .style('position','absolute')
      .style('top', (d,i) => `${i * ITEM_HEIGHT}px`)
      .html(d => {
        // 当天日期键
        const dayKey = d.datetime.toISOString().slice(0,10);
        // 当天所有提交
        const daily = allCommits.filter(c =>
          c.datetime.toISOString().slice(0,10) === dayKey
        );
        // 工作时长：最晚 - 最早，小时
        const times = daily.map(c => c.datetime.getTime());
        const hours = ((Math.max(...times) - Math.min(...times)) / 3600000).toFixed(1);
        // 计算 CSS/JS/HTML 占比
        const lines = daily.flatMap(c => c.lines);
        const counts = d3.rollup(lines, v => v.length, l => l.type);
        const total  = d3.sum(counts.values());
        const parts  = [];
        if (hours > 0) parts.push(`Worked ${hours}h`);
        ['css','js','html'].forEach(t => {
          if (counts.has(t)) {
            const pct = Math.round((counts.get(t)/total)*100);
            parts.push(`${t.toUpperCase()} ${pct}%`);
          }
        });
        return `<p>${parts.join(' • ')}</p>`;
      });
}

/* ---------- 主程序 ---------- */
(async () => {
  const raw     = await loadData();
  const commits = processCommits(raw);

  renderSummary(raw, commits);

  // 为两个滚动区撑高度
  d3.select('#spacer1')
    .style('height', `${(commits.length - 1) * ITEM_HEIGHT}px`);
  d3.select('#spacer2')
    .style('height', `${(commits.length - 1) * ITEM_HEIGHT}px`);

  // 更新函数：同时刷新两个滚动框
  function update(idx) {
    const slice = commits.slice(idx, idx + VISIBLE_COUNT);
    renderCommitItems(slice, idx);
    renderScatter(commits, slice);
    renderFiles(slice);
    renderDailyItems(commits, slice, idx);
  }

  // 监听第一个滚动区滚动
  d3.select('#scroll-container1')
    .on('scroll', () => {
      const idx = Math.floor(d3.select('#scroll-container1').property('scrollTop') / ITEM_HEIGHT);
      update(idx);
    });

  // 首次渲染
  update(0);
})();
