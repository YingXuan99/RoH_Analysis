import React, { useRef, useLayoutEffect } from 'react';
import * as d3 from 'd3';

// Component to display colored percentage change
const PercentageChange = ({ value, suffix = '%' }) => {
    // Determine if positive (green) or negative (red)
    const isPositive = value > 0;
    const color = isPositive ? 'green' : (value < 0 ? 'red' : 'inherit');

    // Format with + sign for positive values
    const formattedValue = `${isPositive ? '+' : ''}${value.toFixed(0)}${suffix}`;

    return (
        <span style={{ color, fontWeight: 'Normal' }}>
            {formattedValue}
        </span>
    );
};

const CategoryAnalysisD3 = ({
    title,
    description,
    categories,
    categoryMetrics,
    selectedYears,
    selectedMetric,
    filteredComparison,
    formatAmount,
    formatPercent,
    onMetricChange
}) => {
    // D3 chart reference
    const chartRef = useRef(null);

    const debounce = (fn, ms) => {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), ms);
        };
    };
    // Helper to get display name for metric
    const getMetricDisplayName = (metricKey) => {
        switch (metricKey) {
            case 'FundraisingEfficiency': return 'Target Completion';
            case 'TargetSuccessRate': return 'Target Success Rate';
            case 'Campaigns': return 'Campaigns';
            case 'CampaignsMetTarget': return 'Campaigns with Target Met';
            case 'Donors': return 'Number of Donors';
            case 'AmountRaised': return 'Amount Raised';
            case 'TargetAmount': return 'Target Amount';
            case 'AvgDonorsPerCampaign': return 'Avg Donors per Campaign';
            case 'AvgAmountPerDonor': return 'Avg Amount per Donor';
            case 'AvgAmountPerCampaign': return 'Avg Amount per Campaign';
            default: return metricKey;
        }
    };

    // Helper to get Y-axis label based on metric
    const getYAxisLabel = (metric) => {
        if (metric === 'FundraisingEfficiency' || metric === 'TargetSuccessRate') {
            return "Percentage (%)";
        } else if (metric === 'Campaigns' || metric === 'CampaignsMetTarget' || metric === 'Donors' || metric === 'AvgDonorsPerCampaign') {
            return "Count";
        } else {
            return "Amount (SGD)";
        }
    };

    // Helper to format values
    const formatValue = (value, metric) => {
        if (metric === 'FundraisingEfficiency' || metric === 'TargetSuccessRate') {
            return formatPercent(value);
        } else if (metric === 'AmountRaised' || metric === 'TargetAmount' ||
            metric === 'AvgAmountPerDonor' || metric === 'AvgAmountPerCampaign') {
            return formatAmount(value);
        }
        return value.toLocaleString();
    };

    // Calculate percentage change between years
    const calculatePercentageChange = (current, previous) => {
        if (previous === 0 && current > 0) return 100;
        else if (previous === 0) return 0; // Avoid division by zero
        else return ((current - previous) / previous) * 100;
    };

    // Add this inside your CategoryAnalysisD3 component:
    useLayoutEffect(() => {
        // Initial render
        if (chartRef.current && filteredComparison.length > 0) {
            createD3CategoryChart();
        }

        // Add resize listener with debounce
        const handleResize = debounce(() => {
            if (chartRef.current && filteredComparison.length > 0) {
                // Clear previous chart
                d3.select(chartRef.current).selectAll("*").remove();
                // Redraw with new dimensions
                createD3CategoryChart();
            }
        }, 250); // 250ms debounce time

        window.addEventListener('resize', handleResize);

        // Clean up
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [filteredComparison, selectedMetric, selectedYears]);

    // Function to create D3 category comparison chart
    const createD3CategoryChart = () => {
        if (!chartRef.current) return;

        // Clear previous chart
        d3.select(chartRef.current).selectAll("*").remove();

        // Set dimensions and margins
        const margin = { top: 50, right: 120, bottom: 100, left: 100 };

        // Create SVG element
        // Replace the SVG creation code with this:
        const containerWidth = chartRef.current.clientWidth;
        const containerHeight = 600; // Or use clientHeight if container has a defined height

        const svg = d3.select(chartRef.current)
            .append("svg")
            .attr("width", "100%")
            .attr("height", containerHeight)
            .attr("viewBox", `0 0 ${containerWidth} ${containerHeight}`)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Then adjust the width and height calculations:
        const width = containerWidth - margin.left - margin.right;
        const height = containerHeight - margin.top - margin.bottom;

        const axisTitleFontSize = Math.max(0.75, Math.min(1, width / 800));
        const barValueFontSize = Math.max(0.625, Math.min(0.875, width / 960));
        const tickLabelFontSize = Math.max(0.625, Math.min(0.875, width / 1120));

        // Show only top 10 categories for better readability if more than 10
        const dataToShow = filteredComparison.slice(0, Math.min(10, filteredComparison.length));

        // Create x scale (categories)
        const x0 = d3.scaleBand()
            .domain(dataToShow.map(d => d.Category))
            .rangeRound([0, width])
            .paddingInner(0.1);

        // Create inner x scale (years)
        const x1 = d3.scaleBand()
            .domain(selectedYears)
            .rangeRound([0, x0.bandwidth()])
            .padding(0.05);

        // Define max y value based on selected metric
        const maxValue = d3.max(dataToShow, d =>
            d3.max(selectedYears, year => d[`${selectedMetric}_${year}`])
        );

        // Create y scale
        const y = d3.scaleLinear()
            .domain([0, maxValue * 1.1]) // Add 10% padding at the top
            .nice()
            .rangeRound([height, 0]);

        // Define colors for years
        const colorScale = d3.scaleOrdinal()
            .domain(selectedYears)
            .range(['#0d6efd', '#20c997']);

        // Add X axis
        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x0))
            .selectAll("text")
            .text(d => {
                // Split long labels into multiple lines
                const labelMap = {
                    'children-12-years-and-below': ['children'],
                    'other-marginalised-communities': ['marginalized', 'comm'],
                    'youth-from-13-to-21-years': ['youth'],
                    'families-in-need': ['families']
                };
                return labelMap[d] ? labelMap[d].join('\n') : d;
            })
            .style("font-size", `${tickLabelFontSize}rem`)
            .style("text-anchor", "middle");

        // Add Y axis
        svg.append("g")
            .call(d3.axisLeft(y)
                .ticks(10)
                .tickFormat(d => {
                    if (selectedMetric === 'FundraisingEfficiency' || selectedMetric === 'TargetSuccessRate') {
                        return d + "%";
                    } else if (selectedMetric === 'AmountRaised' || selectedMetric === 'TargetAmount') {
                        return "$" + d3.format(",.0f")(d);
                    }
                    return d;
                })
            )
            .style("font-size", `${tickLabelFontSize}rem`);

        // Add Y axis label
        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", -60)
            .attr("x", -(height / 2))
            .attr("text-anchor", "middle")
            .attr("font-size", `${axisTitleFontSize}rem`)
            .text(getYAxisLabel(selectedMetric));

        // Add chart title
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", -20)
            .attr("text-anchor", "middle")
            .attr("font-size", "16px")
            .attr("font-weight", "bold")
            .text(`${description} Comparison: ${getMetricDisplayName(selectedMetric)}`);

        // Add bars
        svg.append("g")
            .selectAll("g")
            .data(dataToShow)
            .join("g")
            .attr("transform", d => `translate(${x0(d.Category)},0)`)
            .selectAll("rect")
            .data(d => selectedYears.map(year => ({
                category: d.Category,
                year: year,
                value: d[`${selectedMetric}_${year}`]
            })))
            .join("rect")
            .attr("x", d => x1(d.year))
            .attr("y", d => y(d.value))
            .attr("width", x1.bandwidth())
            .attr("height", d => height - y(d.value))
            .attr("fill", d => colorScale(d.year))
            .attr("rx", 4) // Rounded corners
            .attr("ry", 4);

        // Add values on top of bars
        svg.append("g")
            .selectAll("g")
            .data(dataToShow)
            .join("g")
            .attr("transform", d => `translate(${x0(d.Category)},0)`)
            .selectAll("text")
            .data(d => selectedYears.map(year => ({
                category: d.Category,
                year: year,
                value: d[`${selectedMetric}_${year}`]
            })))
            .join("text")
            .attr("x", d => x1(d.year) + x1.bandwidth() / 2)
            .attr("y", d => y(d.value) - 5)
            .attr("text-anchor", "middle")
            .attr("font-size", `${barValueFontSize}rem`)
            .text(d => {
                if (selectedMetric === 'FundraisingEfficiency' || selectedMetric === 'TargetSuccessRate') {
                    return `${d.value.toFixed(0)}%`;
                } else if (selectedMetric === 'AmountRaised' || selectedMetric === 'TargetAmount') {
                    return `$${d.value >= 1000 ? (d.value / 1000).toFixed(0) + 'K' : d.value}`;
                }
                return d.value.toFixed(0);
            });

        // Add a legend
        const legend = svg.append("g")
            .attr("font-family", "sans-serif")
            .attr("font-size", `${tickLabelFontSize}rem`)
            .attr("text-anchor", "start")
            .selectAll("g")
            .data(selectedYears)
            .join("g")
            .attr("transform", (d, i) => `translate(${width - 100},${i * 20})`);

        legend.append("rect")
            .attr("x", 0)
            .attr("width", 19)
            .attr("height", 19)
            .attr("fill", d => colorScale(d));

        legend.append("text")
            .attr("x", 24)
            .attr("y", 9.5)
            .attr("dy", "0.32em")
            .text(d => d);

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
                // Calculate percentage change
                let changePercentage = null;
                if (selectedYears.length === 2 && selectedYears.includes('2023') && selectedYears.includes('2024')) {
                    const category = d.category;
                    const categoryData = filteredComparison.find(item => item.Category === category);

                    if (categoryData) {
                        const value2023 = categoryData[`${selectedMetric}_2023`];
                        const value2024 = categoryData[`${selectedMetric}_2024`];
                        changePercentage = calculatePercentageChange(value2024, value2023);
                    }
                }

                // Show tooltip
                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);

                let tooltipText = `
                    <strong>${d.category}</strong><br>
                    ${getMetricDisplayName(selectedMetric)} (${d.year}): ${formatValue(d.value, selectedMetric)}
                `;

                if (changePercentage !== null && d.year === '2024') {
                    tooltipText += `<br>YoY Change: ${changePercentage > 0 ? '+' : ''}${changePercentage.toFixed(1)}%`;
                }

                tooltip.html(tooltipText)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function () {
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            });
    };

    // CSS for sticky header
    const stickyHeaderStyle = {
        position: "sticky",
        top: 0,
        backgroundColor: "#f8f9fa",
        zIndex: 10,
        borderBottom: "2px solid #dee2e6"
    };

    // CSS for the table container to enable proper scrolling
    const tableContainerStyle = {
        maxHeight: "600px",
        overflowY: "auto",
        border: "1px solid #dee2e6"
    };

    // Sort categories with priority ones first
    const sortedCategories = [...categories].sort((a, b) => {
        // Priority categories to appear at the top
        const priorityCategories = [
            'children-12-years-and-below',
            'mental-health',
            'youth-from-13-to-21-years'
        ];

        // Check if they're in the priority list
        const aIndex = priorityCategories.indexOf(a);
        const bIndex = priorityCategories.indexOf(b);

        // If both are in priority list, sort by their position in the priority list
        if (aIndex !== -1 && bIndex !== -1) {
            return aIndex - bIndex;
        }

        // If only a is in priority list, it comes first
        if (aIndex !== -1) {
            return -1;
        }

        // If only b is in priority list, it comes first
        if (bIndex !== -1) {
            return 1;
        }

        // For everything else, sort alphabetically
        return a.localeCompare(b);
    });

    return (
        <>
            {/* Metrics Table - Same as before but with enhanced styling */}
            <div className="d-flex justify-content-center mb-4 mt-4">
                <div className="card w-100">
                    <div className="card-body">
                        <h4 className="mb-3">{title}</h4>
                        <div style={tableContainerStyle}>
                            <table className="table table-bordered table-striped table-hover">
                                <thead className="table-light">
                                    <tr style={stickyHeaderStyle}>
                                        <th className="text-center" style={{ width: "10%" }}>{description}</th>
                                        <th className="text-center" colSpan="2">Campaigns</th>
                                        <th className="text-center">Donors</th>
                                        <th className="text-center" colSpan="2">Success Rates</th>
                                        <th className="text-center" colSpan="2">Financials</th>
                                        <th className="text-center" colSpan="3">Averages</th>
                                    </tr>
                                    <tr style={stickyHeaderStyle}>
                                        <th></th>
                                        <th className="text-center">Total</th>
                                        <th className="text-center">Target Met</th>
                                        <th className="text-center">Total</th>
                                        <th className="text-center">Target Success</th>
                                        <th className="text-center">Target Completion</th>
                                        <th className="text-center">Amount Raised</th>
                                        <th className="text-center">Target Amount</th>
                                        <th className="text-center">Donors/ Campaign</th>
                                        <th className="text-center">Amount/ Donor</th>
                                        <th className="text-center">Amount/ Campaign</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedCategories.map((category, categoryIndex) => {
                                        // Find data for this category for both years
                                        const categoryData = {};
                                        selectedYears.forEach(year => {
                                            const yearData = categoryMetrics.find(
                                                metric => metric.Category === category && metric.Year === year
                                            );
                                            if (yearData) {
                                                categoryData[year] = yearData;
                                            }
                                        });

                                        // Only show categories that have data in the selected years
                                        if (Object.keys(categoryData).length === 0) {
                                            return null;
                                        }

                                        // Calculate the additional metrics
                                        Object.keys(categoryData).forEach(year => {
                                            const data = categoryData[year];
                                            // Average donors per campaign
                                            data.avgDonorsPerCampaign = data.Campaigns > 0 ? data.Donors / data.Campaigns : 0;
                                            // Average amount per donor
                                            data.avgAmountPerDonor = data.Donors > 0 ? data.AmountRaised / data.Donors : 0;
                                            // Average amount per campaign
                                            data.avgAmountPerCampaign = data.Campaigns > 0 ? data.AmountRaised / data.Campaigns : 0;
                                        });

                                        // Calculate year-on-year changes if we have data for both years
                                        let changes = null;
                                        if (selectedYears.length === 2 && categoryData[selectedYears[0]] && categoryData[selectedYears[1]]) {
                                            const oldData = categoryData[selectedYears[0]];
                                            const newData = categoryData[selectedYears[1]];

                                            changes = {
                                                campaigns: calculatePercentageChange(newData.Campaigns, oldData.Campaigns),
                                                campaignsMetTarget: calculatePercentageChange(newData.CampaignsMetTarget, oldData.CampaignsMetTarget),
                                                donors: calculatePercentageChange(newData.Donors, oldData.Donors),
                                                targetSuccessRate: calculatePercentageChange(newData.TargetSuccessRate, oldData.TargetSuccessRate),
                                                fundraisingEfficiency: calculatePercentageChange(newData.FundraisingEfficiency, oldData.FundraisingEfficiency),
                                                amountRaised: calculatePercentageChange(newData.AmountRaised, oldData.AmountRaised),
                                                targetAmount: calculatePercentageChange(newData.TargetAmount, oldData.TargetAmount),
                                                avgDonorsPerCampaign: calculatePercentageChange(newData.avgDonorsPerCampaign, oldData.avgDonorsPerCampaign),
                                                avgAmountPerDonor: calculatePercentageChange(newData.avgAmountPerDonor, oldData.avgAmountPerDonor),
                                                avgAmountPerCampaign: calculatePercentageChange(newData.avgAmountPerCampaign, oldData.avgAmountPerCampaign)
                                            };
                                        }

                                        // Add a visual highlight for priority categories
                                        const isPriorityCategory = ['children-12-years-and-below', 'mental-health', 'youth-from-13-to-21-years'].includes(category);
                                        const categoryRowClass = isPriorityCategory ? "table-primary" : "table-secondary";

                                        return (
                                            <React.Fragment key={categoryIndex}>
                                                <tr className={categoryRowClass}>
                                                    <td colSpan="11" className="fw-bold text-center">{category}</td>
                                                </tr>
                                                {selectedYears.map(year => {
                                                    const yearData = categoryData[year];
                                                    if (!yearData) return null;

                                                    return (
                                                        <tr key={`${category}-${year}`}>
                                                            <td className="ps-4">{year}</td>
                                                            <td className="text-center">{yearData.Campaigns}</td>
                                                            <td className="text-center">{yearData.CampaignsMetTarget}</td>
                                                            <td className="text-center">{yearData.Donors.toLocaleString()}</td>
                                                            <td className="text-center">{formatPercent(yearData.TargetSuccessRate)}</td>
                                                            <td className="text-center">{formatPercent(yearData.FundraisingEfficiency)}</td>
                                                            <td className="text-center">{formatAmount(yearData.AmountRaised)}</td>
                                                            <td className="text-center">{formatAmount(yearData.TargetAmount)}</td>
                                                            <td className="text-center">{yearData.avgDonorsPerCampaign.toFixed(0)}</td>
                                                            <td className="text-center">{formatAmount(yearData.avgAmountPerDonor)}</td>
                                                            <td className="text-center">{formatAmount(yearData.avgAmountPerCampaign)}</td>
                                                        </tr>
                                                    );
                                                })}

                                                {/* Add Y-o-Y Change row if we have both years */}
                                                {changes && (
                                                    <tr key={`${category}-change`} className="table-light">
                                                        <td className="ps-4 fw-medium">Change</td>
                                                        <td className="text-center"><PercentageChange value={changes.campaigns} /></td>
                                                        <td className="text-center"><PercentageChange value={changes.campaignsMetTarget} /></td>
                                                        <td className="text-center"><PercentageChange value={changes.donors} /></td>
                                                        <td className="text-center"><PercentageChange value={changes.targetSuccessRate} /></td>
                                                        <td className="text-center"><PercentageChange value={changes.fundraisingEfficiency} /></td>
                                                        <td className="text-center"><PercentageChange value={changes.amountRaised} /></td>
                                                        <td className="text-center"><PercentageChange value={changes.targetAmount} /></td>
                                                        <td className="text-center"><PercentageChange value={changes.avgDonorsPerCampaign} /></td>
                                                        <td className="text-center"><PercentageChange value={changes.avgAmountPerDonor} /></td>
                                                        <td className="text-center"><PercentageChange value={changes.avgAmountPerCampaign} /></td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* D3 Chart Section */}
            <div className="bg-white rounded shadow p-4 mb-4">
                <h2 className="h4 mb-3">
                    {description} Comparison: 2023 vs 2024
                </h2>

                <div className="mb-3">
                    <label className="form-label fw-medium">Select Metric to Compare:</label>
                    <select
                        className="form-select w-auto"
                        value={selectedMetric}
                        onChange={(e) => onMetricChange(e.target.value)}
                    >
                        <option value="FundraisingEfficiency">Target Completion (%)</option>
                        <option value="TargetSuccessRate">Target Success Rate (%)</option>
                        <option value="Campaigns">Number of Campaigns</option>
                        <option value="CampaignsMetTarget">Campaigns with Target Met</option>
                        <option value="Donors">Number of Donors</option>
                        <option value="AmountRaised">Amount Raised</option>
                        <option value="TargetAmount">Target Amount</option>
                        {/* New metrics in dropdown */}
                        <option value="AvgDonorsPerCampaign">Avg Donors per Campaign</option>
                        <option value="AvgAmountPerDonor">Avg Amount per Donor</option>
                        <option value="AvgAmountPerCampaign">Avg Amount per Campaign</option>
                    </select>
                </div>

                {/* D3 Chart Container */}
                <div ref={chartRef} style={{ width: '100%', height: '600px' }}></div>

                {/* If there are more than 10 categories, show message */}
                {filteredComparison.length > 10 && (
                    <div className="text-muted mt-2 text-center">
                        Showing top 10 categories. Use the table above to see all data.
                    </div>
                )}
            </div>
        </>
    );
};

export default CategoryAnalysisD3;