const width = 600;
const height = 400;
const margin = { top: 20, right: 20, bottom: 40, left: 50 };

const svg = d3.select("#chart")
  .append("svg")
  .attr("width", width)
  .attr("height", height);

const chartArea = svg.append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

const xAxisGroup = chartArea.append("g")
  .attr("transform", `translate(0, ${height - margin.top - margin.bottom})`);
const yAxisGroup = chartArea.append("g");

const xScale = d3.scaleLinear().range([0, width - margin.left - margin.right]);
const yScale = d3.scaleLinear().range([height - margin.top - margin.bottom, 0]);

const tooltip = d3.select("body")
  .append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);

const trendLine = chartArea.append("path")
  .attr("class", "trend-line");

function calcLinearRegression(data, xAccessor, yAccessor) {
  const xMean = d3.mean(data, xAccessor);
  const yMean = d3.mean(data, yAccessor);
  let numerator = 0, denominator = 0;
  data.forEach(d => {
    const xVal = xAccessor(d) - xMean;
    const yVal = yAccessor(d) - yMean;
    numerator += xVal * yVal;
    denominator += xVal * xVal;
  });
  const slope = denominator ? (numerator / denominator) : 0;
  const intercept = yMean - slope * xMean;
  return { slope, intercept };
}

let globalExamData = [];

d3.json("scatter_plot.json")
  .then(jsonData => {
    globalExamData = jsonData.data.map(exam => {
      const newData = {};
      Object.entries(exam.data).forEach(([gender, points]) => {
        newData[gender] = points.map(point => {
          const [score, salary] = point;
          return { 
            score: score, 
            expSalary: Math.pow(Math.E, salary) / 1000
          };
        });
      });
      return { ...exam, data: newData };
    });
    updateChart();
  })
  .catch(error => {
    console.error("Ошибка загрузки данных:", error);
  });

const genderCheckboxes = document.querySelectorAll('input[type="checkbox"].gender');
const examRadioButtons = document.querySelectorAll('input[type="radio"].exam-system');
const disciplineCheckboxes = document.querySelectorAll('input[type="checkbox"].discipline');

genderCheckboxes.forEach(ch => ch.addEventListener("change", updateChart));
examRadioButtons.forEach(rb => {
  rb.addEventListener("change", () => {
    updateDisciplineFilters();
    updateChart();
  });
});
disciplineCheckboxes.forEach(ch => ch.addEventListener("change", updateChart));

function getSelectedGenders() {
  return Array.from(genderCheckboxes)
    .filter(ch => ch.checked)
    .map(ch => ch.value);
}

function getSelectedExamSystem() {
  const selected = document.querySelector('input[name="exam-system"]:checked');
  return selected ? selected.value : null;
}

function getSelectedDisciplines() {
  const selectedExam = getSelectedExamSystem();
  if (!selectedExam) return [];
  const containerId = examSystemToContainerId(selectedExam);
  const checkboxes = document.querySelectorAll(`#${containerId} input[type="checkbox"].discipline`);
  return Array.from(checkboxes)
    .filter(cb => cb.checked)
    .map(cb => cb.value);
}

function examSystemToContainerId(examSystem) {
  return {
    "ЕГЭ": "ege-disciplines",
    "TIMSS": "timss-disciplines",
    "PISA": "pisa-disciplines"
  }[examSystem] || "";
}

function updateDisciplineFilters() {
  document.querySelectorAll(".discipline-container").forEach(div => {
    div.style.display = "none";
  });
  const selectedExam = getSelectedExamSystem();
  if (selectedExam) {
    const containerId = examSystemToContainerId(selectedExam);
    const container = document.getElementById(containerId);
    if (container) container.style.display = "block";
  }
}

updateDisciplineFilters();

function updateChart() {
  const selectedGenders = getSelectedGenders();
  const selectedExamSystem = getSelectedExamSystem();
  const selectedDisciplines = getSelectedDisciplines();

  if (!selectedExamSystem || selectedGenders.length === 0 || selectedDisciplines.length === 0) {
    chartArea.selectAll("circle").remove();
    trendLine.transition().duration(500).style("opacity", 0);
    return;
  }

  const filteredExams = globalExamData.filter(exam => {
    const isCorrectSystem = exam.name.startsWith(selectedExamSystem);
    const discipline = exam.name.replace(selectedExamSystem, "").trim();
    return isCorrectSystem && selectedDisciplines.includes(discipline);
  });

  let dataPoints = [];
  filteredExams.forEach(exam => {
    Object.entries(exam.data).forEach(([gender, points]) => {
      if (selectedGenders.includes(gender)) {
      points.forEach((point, i) => {
        if (point.expSalary > 400000) return; // Добавленная проверка
            dataPoints.push({
    id: `${exam.name}_${gender}_${i}`,
    examName: exam.name,
    gender,
    score: point.score,
    expSalary: point.expSalary 
  });
});
      }
    });
  });

  if (dataPoints.length > 0) {
    xScale.domain(d3.extent(dataPoints, d => d.score));
    yScale.domain(d3.extent(dataPoints, d => d.expSalary));
  } else {
    xScale.domain([0, 1]);
    yScale.domain([0, 1]);
  }

  const circles = chartArea.selectAll("circle")
    .data(dataPoints, d => d.id);

  circles.exit()
    .transition()
    .duration(500)
    .attr("r", 0)
    .remove();

  circles.enter()
    .append("circle")
    .attr("r", 0)
    .attr("cx", d => xScale(d.score))
    .attr("cy", d => yScale(d.expSalary))
    .attr("fill", d => d.gender === "Male" ? "#00B7EB" : "#FF69B4")
    .on("mouseover", showTooltip)
    .on("mousemove", moveTooltip)
    .on("mouseout", hideTooltip)
    .merge(circles)
    .transition()
    .duration(1000)
    .attr("r", 2)
    .attr("cx", d => xScale(d.score))
    .attr("cy", d => yScale(d.expSalary));

  xAxisGroup.transition().duration(1000).call(d3.axisBottom(xScale).ticks(6));
  yAxisGroup.transition().duration(1000).call(d3.axisLeft(yScale).ticks(6));

  updateTrendLine(dataPoints);
}

function showTooltip(event, d) {
  tooltip.style("opacity", 1)
    .html(`
      <div><strong>Экзамен:</strong> ${d.examName}</div>
      <div><strong>Баллы:</strong> ${d.score}</div>
      <div><strong>Зарплата:</strong> ${d.expSalary.toFixed(2)} тыс. руб.</div>
    `)
    .style("left", `${event.pageX + 15}px`)
    .style("top", `${event.pageY + 15}px`);
}

function moveTooltip(event) {
  tooltip
    .style("left", `${event.pageX + 15}px`)
    .style("top", `${event.pageY + 15}px`);
}

function hideTooltip() {
  tooltip.style("opacity", 0);
}

function updateTrendLine(dataPoints) {
  if (dataPoints.length > 1) {
    const { slope, intercept } = calcLinearRegression(dataPoints, d => d.score, d => d.expSalary);
    const xValues = dataPoints.map(d => d.score);
    const lineData = [
      { x: Math.min(...xValues), y: intercept + slope * Math.min(...xValues) },
      { x: Math.max(...xValues), y: intercept + slope * Math.max(...xValues) }
    ];
    
    trendLine.datum(lineData)
      .transition()
      .duration(1000)
      .attr("d", d3.line()
        .x(d => xScale(d.x))
        .y(d => yScale(d.y))
      )
      .style("stroke", "#2ECC71")
      .style("stroke-width", 2)
      .style("opacity", 1);
  } else {
    trendLine.transition().duration(500).style("opacity", 0);
  }
}

