import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

let arcGenerator = d3.arc()
  .innerRadius(0)    
  .outerRadius(50);  

let arc = arcGenerator({
  startAngle: 0,
  endAngle: 2 * Math.PI
});

d3.select('#projects-pie-plot')
  .append('path')
  .attr('d', arc)        
  .attr('fill', 'red');  
