import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

let data = [
  { value: 1, label: 'Apples' },
  { value: 2, label: 'Oranges' },
  { value: 3, label: 'Mangoes' },
  { value: 4, label: 'Pears' },
  { value: 5, label: 'Limes' },
  { value: 5, label: 'Cherries' }
];

let colors = d3.scaleOrdinal(d3.schemeTableau10);

let arcGenerator = d3.arc()
  .innerRadius(0)
  .outerRadius(50);

let sliceGenerator = d3.pie().value(d => d.value);
let arcData = sliceGenerator(data);

arcData.forEach((d, idx) => {
  d3.select('#projects-pie-plot')
    .append('path')
    .attr('d', arcGenerator(d))
    .attr('fill', colors(idx));
});

let legend = d3.select('.legend');
data.forEach((d, idx) => {
  legend.append('li')
    .attr('style', `--color:${colors(idx)}`)
    .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
});
