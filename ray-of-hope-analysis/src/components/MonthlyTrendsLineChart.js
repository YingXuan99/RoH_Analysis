import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';

const MonthlyTrendsLineChart = ({
    data, // Format: [{month: 'Jan', '2023': 7, '2024': 3}, {...}]
    title = 'Monthly Campaign Distribution',
    xAxisLabel = 'Month',
    yAxisLabel = 'Number of Campaigns',
    colors = ['#8884d8', '#82ca9d'], // Default colors for 2023 and 2024
    yearKeys = ['2023', '2024'], // The keys in the data representing years
    valueFormat = value => value // Function to format displayed values
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
        if (!chartRef.current || !data || data.length === 0) return;

        // Clear previous chart
        d3.select(chartRef.current).selectAll("*").remove();

        // Get container dimensions
        const containerWidth = chartRef.current.clientWidth;
        const containerHeight = 400;

        // Set dimensions and margins
        const margin = { top: 40, right: 80, bottom: 60, left: 60 };
        const width = containerWidth - margin.left - margin.right;
        const height = containerHeight - margin.top - margin.bottom;

        // Calculate responsive font sizes
        const axisTitleFontSize = Math.max(0.75, Math.min(1, width / 800));
        const labelFontSize = Math.max(0.625, Math.min(0.875, width / 960));
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

        // X scale (months)
        const x = d3.scaleBand()
            .domain(data.map(d => d.month))
            .range([0, width])
            .padding(0.1);

        // Y scale (campaign count)
        const y = d3.scaleLinear()
            .domain([0, d3.max(data, d => Math.max(...yearKeys.map(key => d[key]))) * 1.1])
            .nice()
            .range([height, 0]);

        // Add X axis
        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x))
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
            .call(d3.axisLeft(y).tickFormat(d => valueFormat(d)))
            .selectAll("text")
            .style("font-size", `${tickLabelFontSize}rem`);

        // Add Y axis label
        svg.append("text")
            .attr("fill", "#000")
            .attr("transform", "rotate(-90)")
            .attr("y", -40)
            .attr("x", -(height / 2))
            .attr("text-anchor", "middle")
            .attr("font-size", `${axisTitleFontSize}rem`)
            .text(yAxisLabel);

        // Create line generators for each year
        yearKeys.forEach((yearKey, index) => {
            // Line generator
            const line = d3.line()
                .x(d => x(d.month) + x.bandwidth() / 2)
                .y(d => y(d[yearKey]))
                .curve(d3.curveMonotoneX);

            // Add line
            svg.append("path")
                .datum(data)
                .attr("fill", "none")
                .attr("stroke", colors[index])
                .attr("stroke-width", 3)
                .attr("d", line);

            // Add dots
            svg.selectAll(`.dot-${yearKey}`)
                .data(data)
                .enter()
                .append("circle")
                .attr("class", `dot-${yearKey}`)
                .attr("cx", d => x(d.month) + x.bandwidth() / 2)
                .attr("cy", d => y(d[yearKey]))
                .attr("r", 5)
                .attr("fill", colors[index]);

            // Add labels
            svg.selectAll(`.label-${yearKey}`)
                .data(data)
                .enter()
                .append("text")
                .attr("class", `label-${yearKey}`)
                .attr("x", d => x(d.month) + x.bandwidth() / 2)
                .attr("y", d => y(d[yearKey]) - 10)
                .attr("text-anchor", "middle")
                .attr("font-size", `${labelFontSize}rem`)
                .attr("fill", colors[index])
                .text(d => valueFormat(d[yearKey]));
        });

        // Add legend
        const legend = svg.append("g")
        .attr("font-family", "sans-serif")
        .attr("font-size", `${labelFontSize}rem`)
        .attr("text-anchor", "start")
        .selectAll("g")
        .data(yearKeys)
        .join("g")
        .attr("transform", (d, i) => `translate(${width - 70},${i * 20 - 30})`);

        legend.append("rect")
            .attr("x", 0)
            .attr("width", 15)
            .attr("height", 15)
            .attr("fill", (d, i) => colors[i]);

        legend.append("text")
            .attr("x", 20)
            .attr("y", 7.5)
            .attr("dy", "0.32em")
            .text(d => d);

        // Add tooltip
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

        // Add tooltip behavior to dots
        yearKeys.forEach((yearKey, index) => {
            svg.selectAll(`.dot-${yearKey}`)
                .on("mouseover", function (event, d) {
                    tooltip.transition()
                        .duration(200)
                        .style("opacity", .9);
                    tooltip.html(`${d.month} ${yearKey}: ${valueFormat(d[yearKey])}`)
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 28) + "px");
                })
                .on("mouseout", function () {
                    tooltip.transition()
                        .duration(500)
                        .style("opacity", 0);
                });
        });
    };

    // Initialize chart and handle resize
    useEffect(() => {
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
    }, [data, title, xAxisLabel, yAxisLabel, colors, yearKeys]);

    return (
        <div className="chart-container">
            <h4 className="text-lg font-medium mb-2">{title}</h4>
            <div ref={chartRef} style={{ width: '100%', height: '400px' }}></div>
        </div>
    );
};

export default MonthlyTrendsLineChart;