function generateRandomData(num = 100) {
    const arr = [];
    for (let i = 0; i < num; i++) {
      const gender = Math.random() > 0.5 ? 'M' : 'F';
      const reading = 300 + Math.random() * 200;
      const math = 300 + Math.random() * 200;
      const science = 300 + Math.random() * 200;
      const mainSalary = 30 + Math.random() * 70;
      const extraSalary = Math.random() * 30;
      const totalSalary = mainSalary + extraSalary;
      const logSalary = totalSalary > 0 ? Math.log(totalSalary) : 0;
      arr.push({
        idstud: i,
        gender: gender,
        reading: reading,
        math: math,
        science: science,
        totalSalary: totalSalary,
        logSalary: logSalary
      });
    }
    return arr;
  }
  async function loadDataFromDB() {
    return [
      {
        idstud: 1,
        nQ129_numbers: 50,
        nQ130_numbers: 20,
        PV1READ: 450, PV2READ: 460, PV3READ: 440, PV4READ: 455, PV5READ: 465,
        PV1MATH: 470, PV2MATH: 480, PV3MATH: 490, PV4MATH: 460, PV5MATH: 475,
        PV1SCIE: 430, PV2SCIE: 432, PV3SCIE: 445, PV4SCIE: 420, PV5SCIE: 440,
        ITSEX: null,
        aQ1: "M"
      },
      {
        idstud: 2,
        nQ129_numbers: 70,
        nQ130_numbers: 10,
        PV1READ: 310, PV2READ: 320, PV3READ: 300, PV4READ: 315, PV5READ: 325,
        PV1MATH: 350, PV2MATH: 355, PV3MATH: 340, PV4MATH: 360, PV5MATH: 345,
        PV1SCIE: 400, PV2SCIE: 405, PV3SCIE: 390, PV4SCIE: 410, PV5SCIE: 420,
        ITSEX: "F",
        aQ1: null
      }
    ];
  }
  function prepareDataFromDB(rawData) {
    function mean(values) {
      const valid = values.filter(v => v != null && !isNaN(v));
      if (!valid.length) return null;
      return d3.mean(valid);
    }
    function getGender(d) {
      if (d.ITSEX) return d.ITSEX;
      if (d.aQ1) return d.aQ1;
      if (d.iQ_gender) return d.iQ_gender;
      if (d.jQ_gender) return d.jQ_gender;
      if (d.kQ_gender) return d.kQ_gender;
      return null;
    }
    const result = [];
    rawData.forEach(d => {
      const mainSalary = parseFloat(d.nQ129_numbers) || 0;
      const extraSalary = parseFloat(d.nQ130_numbers) || 0;
      const totalSalary = mainSalary + extraSalary;
      const logSalary = totalSalary > 0 ? Math.log(totalSalary) : 0;
      const reading = mean([
        d.PV1READ, d.PV2READ, d.PV3READ, d.PV4READ, d.PV5READ
      ]);
      const math = mean([
        d.PV1MATH, d.PV2MATH, d.PV3MATH, d.PV4MATH, d.PV5MATH
      ]);
      const science = mean([
        d.PV1SCIE, d.PV2SCIE, d.PV3SCIE, d.PV4SCIE, d.PV5SCIE
      ]);
      const gender = getGender(d);
      result.push({
        idstud: d.idstud,
        gender: gender,
        reading: reading,
        math: math,
        science: science,
        totalSalary: totalSalary,
        logSalary: logSalary
      });
    });
    return result;
  }
  const width = 800;
  const height = 500;
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
  const xScale = d3.scaleLinear()
    .range([0, width - margin.left - margin.right]);
  const yScale = d3.scaleLinear()
    .range([height - margin.top - margin.bottom, 0]);
  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip");
  const trendLine = chartArea.append("path")
    .attr("class", "trend-line");
  function calcLinearRegression(data, xAccessor, yAccessor) {
    const xMean = d3.mean(data, xAccessor);
    const yMean = d3.mean(data, yAccessor);
    let numerator = 0;
    let denominator = 0;
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
  let randomDataset = generateRandomData(100);
  let dbDataset = [];
  let currentData = [...randomDataset];
  const genderCheckboxes = document.querySelectorAll('input[type="checkbox"][value="M"], input[type="checkbox"][value="F"]');
  const disciplineCheckboxes = document.querySelectorAll('input[type="checkbox"][value="READING"], input[type="checkbox"][value="MATH"], input[type="checkbox"][value="SCIENCE"]');
  genderCheckboxes.forEach(ch => ch.addEventListener("change", updateChart));
  disciplineCheckboxes.forEach(ch => ch.addEventListener("change", updateChart));
  function getSelectedGenders() {
    return Array.from(genderCheckboxes)
      .filter(ch => ch.checked)
      .map(ch => ch.value);
  }
  function getSelectedDisciplines() {
    return Array.from(disciplineCheckboxes)
      .filter(ch => ch.checked)
      .map(ch => ch.value);
  }
  function getXValue(d, selectedDisciplines) {
    let sum = 0;
    if (selectedDisciplines.includes("READING") && d.reading != null) sum += d.reading;
    if (selectedDisciplines.includes("MATH") && d.math != null) sum += d.math;
    if (selectedDisciplines.includes("SCIENCE") && d.science != null) sum += d.science;
    return sum;
  }
  function updateChart() {
    const selectedGenders = getSelectedGenders();
    const selectedDisciplines = getSelectedDisciplines();
    const filtered = currentData.filter(d => {
      if (!selectedGenders.includes(d.gender)) return false;
      return true;
    });
    const dataWithX = filtered.map(d => {
      const xVal = getXValue(d, selectedDisciplines);
      return { ...d, xVal };
    });
    const xExtent = d3.extent(dataWithX, d => d.xVal);
    const yExtent = d3.extent(dataWithX, d => d.logSalary);
    if (!dataWithX.length) {
      xScale.domain([0, 1]);
      yScale.domain([0, 1]);
    } else {
      xScale.domain([xExtent[0], xExtent[1]]);
      yScale.domain([yExtent[0], yExtent[1]]);
    }
    const circles = chartArea.selectAll("circle")
      .data(dataWithX, d => d.idstud);
    circles.exit()
      .transition()
      .duration(500)
      .attr("r", 0)
      .remove();
    circles.enter()
      .append("circle")
      .attr("r", 0)
      .attr("cx", d => xScale(d.xVal))
      .attr("cy", d => yScale(d.logSalary))
      .attr("fill", d => d.gender === 'M' ? "#00B7EB" : "pink")
      .on("mouseover", (event, d) => {
        const selectedDisciplines = getSelectedDisciplines();
        const disciplineNames = selectedDisciplines.join(" + ") || "(нет)";
        tooltip
          .style("opacity", 1)
          .html(`
            <div><strong>Дисциплины:</strong> ${disciplineNames}</div>
            <div><strong>X (баллы):</strong> ${d3.format(".2f")(d.xVal)}</div>
            <div><strong>Y (log ЗП):</strong> ${d3.format(".2f")(d.logSalary)}</div>
            <div><strong>Суммарная ЗП (тыс. руб.):</strong> ${d3.format(".2f")(d.totalSalary)}</div>
          `)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY + 10) + "px");
      })
      .on("mousemove", event => {
        tooltip
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY + 10) + "px");
      })
      .on("mouseout", () => {
        tooltip.style("opacity", 0);
      })
      .merge(circles)
      .transition()
      .duration(1000)
      .ease(d3.easeBounce)
      .attr("cx", d => xScale(d.xVal))
      .attr("cy", d => yScale(d.logSalary))
      .attr("r", 5);
    const xAxis = d3.axisBottom(xScale).ticks(6);
    const yAxis = d3.axisLeft(yScale).ticks(6);
    xAxisGroup
      .transition()
      .duration(1000)
      .call(xAxis);
    yAxisGroup
      .transition()
      .duration(1000)
      .call(yAxis);
    if (dataWithX.length > 1) {
      const { slope, intercept } = calcLinearRegression(dataWithX, d => d.xVal, d => d.logSalary);
      const xMin = xExtent[0];
      const xMax = xExtent[1];
      const yMin = intercept + slope * xMin;
      const yMax = intercept + slope * xMax;
      const lineData = [
        { x: xMin, y: yMin },
        { x: xMax, y: yMax }
      ];
      trendLine
        .datum(lineData)
        .transition()
        .duration(1000)
        .ease(d3.easeSinInOut)
        .attr("d", d3.line()
          .x(d => xScale(d.x))
          .y(d => yScale(d.y))
        )
        .style("stroke", "#00ff00")
        .style("stroke-width", 2)
        .style("opacity", 1);
    } else {
      trendLine
        .transition()
        .duration(500)
        .style("opacity", 0);
    }
  }
  updateChart();
  let usingRandomData = true;
  const toggleBtn = document.getElementById("data-toggle");
  toggleBtn.addEventListener("click", async () => {
    if (usingRandomData) {
      toggleBtn.textContent = "Переключиться на случайные данные";
      if (!dbDataset.length) {
        const rawData = await loadDataFromDB();
        dbDataset = prepareDataFromDB(rawData);
      }
      currentData = dbDataset;
      usingRandomData = false;
    } else {
      toggleBtn.textContent = "Переключиться на данные из БД";
      currentData = randomDataset;
      usingRandomData = true;
    }
    updateChart();
  });