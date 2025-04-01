import React, { useRef, useLayoutEffect } from 'react';
import * as d3 from 'd3';

const D3BarChart = ({
    data,
    keys, // array of keys to display as bars, e.g., ['Campaigns', 'CampaignsMetTarget']
    colors, // array of colors for each key
    title, // chart title
    xAxisLabel = "Year",
    yAxisLabel,
    yFormat, // function to format y-axis values (e.g., adding % or $)
    barLabels, // array of display names for keys in legend
    valueFormat // function to format values displayed on top of bars
}) => {
    const chartRef = useRef(null);

    // Helper function for debouncing
    const debounce = (fn, ms) => {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), ms);
        };
    };

    // Create and update chart
    const createChart = () => {
        if (!chartRef.current || !data || data.length === 0 || !keys || keys.length === 0) return;

        // Clear previous chart
        d3.select(chartRef.current).selectAll("*").remove();

        // Get container dimensions
        const containerWidth = chartRef.current.clientWidth;
        const containerHeight = 300;

        // Set dimensions and margins
        const margin = { top: 40, right: 30, bottom: 60, left: 80 };
        const width = containerWidth - margin.left - margin.right;
        const height = containerHeight - margin.top - margin.bottom;

        // Calculate responsive font sizes
        const axisTitleFontSize = Math.max(0.75, Math.min(1, width / 800));
        const barValueFontSize = Math.max(0.625, Math.min(0.875, width / 960));
        const tickLabelFontSize = Math.max(0.625, Math.min(0.875, width / 1120));

        // Create SVG element with viewBox for responsiveness
        const svg = d3.select(chartRef.current)
            .append("svg")
            .attr("width", "100%")
            .attr("height", containerHeight)
            .attr("viewBox", `0 0 ${containerWidth} ${containerHeight}`)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Create scales
        const x0 = d3.scaleBand()
            .domain(data.map(d => d.Year))
            .rangeRound([0, width])
            .paddingInner(0.1);

        const x1 = d3.scaleBand()
            .domain(keys)
            .rangeRound([0, x0.bandwidth()])
            .padding(0.05);

        // Find maximum value for y-scale
        const maxY = d3.max(data, d => d3.max(keys, key => d[key]));

        const y = d3.scaleLinear()
            .domain([0, maxY * 1.1]) // Add 10% padding at the top
            .nice()
            .rangeRound([height, 0]);

        // Define colors
        const colorScale = d3.scaleOrdinal()
            .domain(keys)
            .range(colors);

        // Add X axis
        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x0))
            .selectAll("text")
            .style("font-size", `${tickLabelFontSize}rem`);

        // Add X axis label
        svg.append("text")
            .attr("fill", "#000")
            .attr("y", height + 40)
            .attr("x", width / 2)
            .attr("text-anchor", "middle")
            .attr("font-size", `${axisTitleFontSize}rem`)
            .text(xAxisLabel);

        // Add Y axis
        svg.append("g")
            .call(d3.axisLeft(y).tickFormat(yFormat))
            .selectAll("text")
            .style("font-size", `${tickLabelFontSize}rem`);

        // Add Y axis label
        svg.append("text")
            .attr("fill", "#000")
            .attr("transform", "rotate(-90)")
            .attr("y", -60)
            .attr("x", -(height / 2))
            .attr("text-anchor", "middle")
            .attr("font-size", `${axisTitleFontSize}rem`)
            .text(yAxisLabel);

        // Add bars
        svg.append("g")
            .selectAll("g")
            .data(data)
            .join("g")
            .attr("transform", d => `translate(${x0(d.Year)},0)`)
            .selectAll("rect")
            .data(d => keys.map(key => ({
                key: key,
                value: d[key],
                year: d.Year
            })))
            .join("rect")
            .attr("x", d => x1(d.key))
            .attr("y", d => y(d.value))
            .attr("width", x1.bandwidth())
            .attr("height", d => height - y(d.value))
            .attr("fill", d => colorScale(d.key))
            .attr("rx", 4) // Rounded corners
            .attr("ry", 4);

        // Add values on top of bars
        svg.append("g")
            .selectAll("g")
            .data(data)
            .join("g")
            .attr("transform", d => `translate(${x0(d.Year)},0)`)
            .selectAll("text")
            .data(d => keys.map(key => ({
                key: key,
                value: d[key],
                year: d.Year
            })))
            .join("text")
            .attr("x", d => x1(d.key) + x1.bandwidth() / 2)
            .attr("y", d => y(d.value) - 5)
            .attr("text-anchor", "middle")
            .attr("font-size", `${barValueFontSize}rem`)
            .text(d => valueFormat ? valueFormat(d.value) : d.value);

        // Add a legend
        const legendItemHeight = 20;
        const legend = svg.append("g")
            .attr("font-family", "sans-serif")
            .attr("font-size", `${tickLabelFontSize}rem`)
            .attr("text-anchor", "start")
            .selectAll("g")
            .data(keys.map((key, i) => ({ key, label: barLabels[i] })))
            .join("g")
            .attr("transform", (d, i) => `translate(${width - 200},${i * legendItemHeight - 30})`);

        legend.append("rect")
            .attr("x", 0)
            .attr("width", 19)
            .attr("height", 19)
            .attr("fill", d => colorScale(d.key));

        legend.append("text")
            .attr("x", 24)
            .attr("y", 9.5)
            .attr("dy", "0.32em")
            .text(d => d.label);

        // Add tooltips
        const tooltip = d3.select(chartRef.current)
            .append("div")
            .attr("class", "tooltip")
            .style("position", "absolute")
            .style("opacity", 0)
            .style("background-color", "white")
            .style("border", "1px solid #ddd")
            .style("border-radius", "4px")
            .style("padding", "8px")
            .style("pointer-events", "none");

        svg.selectAll("rect")
            .on("mouseover", function (event, d) {
                const index = keys.indexOf(d.key);
                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);
                tooltip.html(`${d.year}<br>${barLabels[index]}: ${valueFormat ? valueFormat(d.value) : d.value}`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function () {
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            });
    };

    // Initialize chart and handle resize
    useLayoutEffect(() => {
        // Initial render
        createChart();

        // Add resize listener
        const handleResize = debounce(() => {
            createChart();
        }, 250);

        window.addEventListener('resize', handleResize);

        // Clean up
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [data, keys, colors, title, xAxisLabel, yAxisLabel, barLabels, yFormat, valueFormat]);

    return (
        <div className="chart-container">
            <h4 className="text-lg font-medium mb-2">{title}</h4>
            <div ref={chartRef} style={{ width: '100%', height: '300px' }}></div>
        </div>
    );
};

export default D3BarChart;