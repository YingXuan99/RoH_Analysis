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

const UnifiedD3Analysis = ({
    // Required props
    title,
    description,
    
    // Data props - flexible structure to support both component types
    dataItems = [], // Array of categories or platforms
    itemKey = 'Category', // The key to identify each item (Category or Platform)
    metricsData = [], // Array of metrics data (can be categoryMetrics or platformData transformed)
    comparisonData = [], // Data prepared for chart comparison
    
    // Display and selection props
    selectedYears = ['2023', '2024'],
    selectedMetric = 'FundraisingEfficiency',
    
    // Callback for metric change
    onMetricChange,
    
    // Formatting functions
    formatAmount = (val) => `$${val.toLocaleString()}`,
    formatPercent = (val) => `${val.toFixed(0)}%`,
    
    // Optional custom props
    metricOptions = [],
    sortedItems = null, // Optional pre-sorted items
    priorityItems = [], // Items to highlight or prioritize
    groupByYear = false, // Whether to group by year first (true) or by item first (false)
    showChangeRows = true, // Whether to show percentage change rows
    maxBarItems = 10, // Max number of items to show in the bar chart
    
    // Optional custom styling
    tableContainerStyle = {},
    chartHeight = 600,
    
    // Layout customization
    showTable = true,
    showChart = true
}) => {
    // D3 chart reference
    const chartRef = useRef(null);

    // Debounce function for resize handling
    const debounce = (fn, ms) => {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), ms);
        };
    };
    
    // Helper to get display name for metric
    const getMetricDisplayName = (metricKey) => {
        const metricMap = {
            'FundraisingEfficiency': 'Target Completion',
            'TargetSuccessRate': 'Target Success Rate',
            'Campaigns': 'Campaigns',
            'CampaignsMetTarget': 'Campaigns with Target Met',
            'Donors': 'Number of Donors',
            'AmountRaised': 'Amount Raised',
            'TargetAmount': 'Target Amount',
            'AvgDonorsPerCampaign': 'Avg Donors per Campaign',
            'AvgAmountPerDonor': 'Avg Amount per Donor',
            'AvgAmountPerCampaign': 'Avg Amount per Campaign'
        };
        
        // Try to find in provided metric options first
        const foundMetric = metricOptions.find(m => m.key === metricKey);
        if (foundMetric) return foundMetric.label;
        
        // Fall back to our built-in map
        return metricMap[metricKey] || metricKey;
    };

    // Helper to get Y-axis label based on metric
    const getYAxisLabel = (metric) => {
        if (['FundraisingEfficiency', 'TargetSuccessRate'].includes(metric)) {
            return "Percentage (%)";
        } else if (['Campaigns', 'CampaignsMetTarget', 'Donors', 'AvgDonorsPerCampaign'].includes(metric)) {
            return "Count";
        } else {
            return "Amount (SGD)";
        }
    };

    // Helper to format values
    const formatValue = (value, metric) => {
        if (value === undefined || value === null) return 'N/A';
        
        if (['FundraisingEfficiency', 'TargetSuccessRate'].includes(metric)) {
            return formatPercent(value);
        } else if (['AmountRaised', 'TargetAmount', 'AvgAmountPerDonor', 'AvgAmountPerCampaign'].includes(metric)) {
            return formatAmount(value);
        }
        return value.toLocaleString();
    };

    // Calculate percentage change between values
    const calculatePercentageChange = (current, previous) => {
        if (previous === 0 && current > 0) return 100;
        else if (previous === 0) return 0; // Avoid division by zero
        else return ((current - previous) / previous) * 100;
    };

    // Sort the items if needed
    const getDisplayItems = () => {
        // If sorted items are provided, use them
        if (sortedItems) return sortedItems;
        
        // Otherwise, sort with priority items first
        return [...dataItems].sort((a, b) => {
            // Check if they're in the priority list
            const aIsPriority = priorityItems.includes(a);
            const bIsPriority = priorityItems.includes(b);
            
            // If both are in priority list or both are not, sort alphabetically
            if (aIsPriority === bIsPriority) {
                return a.localeCompare(b);
            }
            
            // If only a is in priority list, it comes first
            if (aIsPriority) return -1;
            
            // If only b is in priority list, it comes first
            return 1;
        });
    };

    // D3 chart creation effect
    useLayoutEffect(() => {
        // Initial render
        if (chartRef.current && showChart && comparisonData.length > 0) {
            createD3Chart();
        }

        // Add resize listener with debounce
        const handleResize = debounce(() => {
            if (chartRef.current && showChart && comparisonData.length > 0) {
                // Clear previous chart
                d3.select(chartRef.current).selectAll("*").remove();
                // Redraw with new dimensions
                createD3Chart();
            }
        }, 250); // 250ms debounce time

        window.addEventListener('resize', handleResize);

        // Clean up
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [comparisonData, selectedMetric, selectedYears, showChart, groupByYear]);

    // Function to create D3 chart
    const createD3Chart = () => {
        if (!chartRef.current) return;

        // Clear previous chart
        d3.select(chartRef.current).selectAll("*").remove();

        // Set dimensions and margins
        const margin = { top: 50, right: 120, bottom: 100, left: 100 };

        // Create SVG element
        const containerWidth = chartRef.current.clientWidth;
        const containerHeight = chartHeight;

        const svg = d3.select(chartRef.current)
            .append("svg")
            .attr("width", "100%")
            .attr("height", containerHeight)
            .attr("viewBox", `0 0 ${containerWidth} ${containerHeight}`)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Calculate width and height
        const width = containerWidth - margin.left - margin.right;
        const height = containerHeight - margin.top - margin.bottom;

        // Responsive font sizes
        const axisTitleFontSize = Math.max(0.75, Math.min(1, width / 800));
        const barValueFontSize = Math.max(0.625, Math.min(0.875, width / 960));
        const tickLabelFontSize = Math.max(0.625, Math.min(0.875, width / 1120));

        // Show only top N items for better readability if more than maxBarItems
        const dataToShow = comparisonData.slice(0, Math.min(maxBarItems, comparisonData.length));

        // Determine the domain categories based on itemKey
        const domain = dataToShow.map(d => d[itemKey]);

        // Create bands for x-axis based on grouping
        let x0, x1, outerDomain, innerDomain;
        
        if (groupByYear) {
            // When grouping by year first, then items
            outerDomain = selectedYears;
            innerDomain = domain;
        } else {
            // Default: group by items first, then years
            outerDomain = domain;
            innerDomain = selectedYears;
        }
        
        // Create outer scale
        x0 = d3.scaleBand()
            .domain(outerDomain)
            .rangeRound([0, width])
            .paddingInner(0.1);

        // Create inner scale
        x1 = d3.scaleBand()
            .domain(innerDomain)
            .rangeRound([0, x0.bandwidth()])
            .padding(0.05);

        // Define max y value based on selected metric
        const maxValue = d3.max(dataToShow, d =>
            d3.max(selectedYears, year => d[`${selectedMetric}_${year}`] || 0)
        );

        // Create y scale
        const y = d3.scaleLinear()
            .domain([0, maxValue * 1.1]) // Add 10% padding at the top
            .nice()
            .rangeRound([height, 0]);

        // Define colors based on grouping
        const colorScale = d3.scaleOrdinal()
            .domain(groupByYear ? domain : selectedYears)
            .range(groupByYear ? 
                // More colors for categories/platforms
                ['#0d6efd', '#20c997', '#fd7e14', '#dc3545', '#6f42c1', '#ffc107'] : 
                // Default year colors
                ['#0d6efd', '#20c997']);

        // Add X axis
        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x0))
            .selectAll("text")
            .text(d => {
                // Handle long label abbreviations if needed
                const labelMap = {
                    'children-12-years-and-below': ['children'],
                    'other-marginalised-communities': ['marginalized'],
                    'youth-from-13-to-21-years': ['youth'],
                    'families-in-need': ['families'],
                    'Other Marginalised Communities': ['Marginalized']
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

        // Add bars - adapt based on grouping
        if (groupByYear) {
            // Group by year first, then by items
            svg.append("g")
                .selectAll("g")
                .data(selectedYears)
                .join("g")
                .attr("transform", year => `translate(${x0(year)},0)`)
                .selectAll("rect")
                .data(year => {
                    return dataToShow.map(d => ({
                        item: d[itemKey],
                        year: year,
                        value: d[`${selectedMetric}_${year}`] || 0
                    }));
                })
                .join("rect")
                .attr("x", d => x1(d.item))
                .attr("y", d => y(d.value))
                .attr("width", x1.bandwidth())
                .attr("height", d => height - y(d.value))
                .attr("fill", d => colorScale(d.item))
                .attr("rx", 4) // Rounded corners
                .attr("ry", 4);
        } else {
            // Default: Group by items first, then by years
            svg.append("g")
                .selectAll("g")
                .data(dataToShow)
                .join("g")
                .attr("transform", d => `translate(${x0(d[itemKey])},0)`)
                .selectAll("rect")
                .data(d => selectedYears.map(year => ({
                    item: d[itemKey],
                    year: year,
                    value: d[`${selectedMetric}_${year}`] || 0
                })))
                .join("rect")
                .attr("x", d => x1(d.year))
                .attr("y", d => y(d.value))
                .attr("width", x1.bandwidth())
                .attr("height", d => height - y(d.value))
                .attr("fill", d => colorScale(d.year))
                .attr("rx", 4) // Rounded corners
                .attr("ry", 4);
        }

        // Add values on top of bars - adapt based on grouping
        if (groupByYear) {
            // Group by year first, then by items
            svg.append("g")
                .selectAll("g")
                .data(selectedYears)
                .join("g")
                .attr("transform", year => `translate(${x0(year)},0)`)
                .selectAll("text")
                .data(year => {
                    return dataToShow.map(d => ({
                        item: d[itemKey],
                        year: year,
                        value: d[`${selectedMetric}_${year}`] || 0
                    }));
                })
                .join("text")
                .attr("x", d => x1(d.item) + x1.bandwidth() / 2)
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
        } else {
            svg.append("g")
                .selectAll("g")
                .data(dataToShow)
                .join("g")
                .attr("transform", d => `translate(${x0(d[itemKey])},0)`)
                .selectAll("text")
                .data(d => selectedYears.map(year => ({
                    item: d[itemKey],
                    year: year,
                    value: d[`${selectedMetric}_${year}`] || 0
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
        }

        // Add a legend - adapt based on grouping
        const legendItems = groupByYear ? domain : selectedYears;
        const legend = svg.append("g")
            .attr("font-family", "sans-serif")
            .attr("font-size", `${tickLabelFontSize}rem`)
            .attr("text-anchor", "start")
            .selectAll("g")
            .data(legendItems)
            .join("g")
            .attr("transform", (d, i) => `translate(${width - 150},${i * 20})`);

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
                let tooltipText = '';
                
                if (groupByYear) {
                    // For year-first grouping
                    tooltipText = `
                        <strong>${d.item}</strong><br>
                        ${getMetricDisplayName(selectedMetric)} (${d.year}): ${formatValue(d.value, selectedMetric)}
                    `;
                    
                    // Add platform comparison if applicable
                    if (selectedYears.includes(d.year) && displayItems.length === 2) {
                        const otherItem = displayItems.find(item => item !== d.item);
                        const otherItemData = dataToShow.find(item => item[itemKey] === otherItem);
                        if (otherItemData) {
                            const otherValue = otherItemData[`${selectedMetric}_${d.year}`] || 0;
                            changePercentage = calculatePercentageChange(d.value, otherValue);
                            tooltipText += `<br>vs ${otherItem}: ${changePercentage > 0 ? '+' : ''}${changePercentage.toFixed(1)}%`;
                        }
                    }
                } else {
                    // For item-first grouping
                    if (selectedYears.length === 2 && selectedYears.includes('2023') && selectedYears.includes('2024')) {
                        const item = d.item;
                        const itemData = comparisonData.find(i => i[itemKey] === item);

                        if (itemData) {
                            const value2023 = itemData[`${selectedMetric}_2023`] || 0;
                            const value2024 = itemData[`${selectedMetric}_2024`] || 0;
                            changePercentage = calculatePercentageChange(value2024, value2023);
                        }
                    }

                    tooltipText = `
                        <strong>${d.item}</strong><br>
                        ${getMetricDisplayName(selectedMetric)} (${d.year}): ${formatValue(d.value, selectedMetric)}
                    `;

                    if (changePercentage !== null && d.year === '2024') {
                        tooltipText += `<br>YoY Change: ${changePercentage > 0 ? '+' : ''}${changePercentage.toFixed(1)}%`;
                    }
                }

                // Show tooltip
                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);

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
    const defaultTableContainerStyle = {
        maxHeight: "600px",
        overflowY: "auto",
        border: "1px solid #dee2e6",
        ...tableContainerStyle
    };

    // Get the displayable items
    const displayItems = getDisplayItems();

    // Function to get item data for all years
    const getItemData = (item) => {
        const result = {};
        selectedYears.forEach(year => {
            // Find data for this item for this year
            const yearData = metricsData.find(
                metric => metric[itemKey] === item && metric.Year === year
            );
            if (yearData) {
                result[year] = yearData;
            }
        });
        return result;
    };

    // Process item data for the table
    const processItemData = (itemData) => {
        // Calculate the additional metrics for each year's data
        Object.keys(itemData).forEach(year => {
            const data = itemData[year];
            // Skip if no data
            if (!data) return;
            
            // Average donors per campaign
            data.avgDonorsPerCampaign = data.Campaigns > 0 ? data.Donors / data.Campaigns : 0;
            // Average amount per donor
            data.avgAmountPerDonor = data.Donors > 0 ? data.AmountRaised / data.Donors : 0;
            // Average amount per campaign
            data.avgAmountPerCampaign = data.Campaigns > 0 ? data.AmountRaised / data.Campaigns : 0;
        });
        return itemData;
    };

    // Calculate changes between two years if both exist
    const calculateChanges = (itemData) => {
        if (selectedYears.length !== 2 || !itemData[selectedYears[0]] || !itemData[selectedYears[1]]) {
            return null;
        }
        
        const oldData = itemData[selectedYears[0]];
        const newData = itemData[selectedYears[1]];
        
        return {
            campaigns: calculatePercentageChange(newData.Campaigns || 0, oldData.Campaigns || 0),
            campaignsMetTarget: calculatePercentageChange(newData.CampaignsMetTarget || 0, oldData.CampaignsMetTarget || 0),
            donors: calculatePercentageChange(newData.Donors || 0, oldData.Donors || 0),
            targetSuccessRate: calculatePercentageChange(newData.TargetSuccessRate || 0, oldData.TargetSuccessRate || 0),
            fundraisingEfficiency: calculatePercentageChange(newData.FundraisingEfficiency || 0, oldData.FundraisingEfficiency || 0),
            amountRaised: calculatePercentageChange(newData.AmountRaised || 0, oldData.AmountRaised || 0),
            targetAmount: calculatePercentageChange(newData.TargetAmount || 0, oldData.TargetAmount || 0),
            avgDonorsPerCampaign: calculatePercentageChange(newData.avgDonorsPerCampaign || 0, oldData.avgDonorsPerCampaign || 0),
            avgAmountPerDonor: calculatePercentageChange(newData.avgAmountPerDonor || 0, oldData.avgAmountPerDonor || 0),
            avgAmountPerCampaign: calculatePercentageChange(newData.avgAmountPerCampaign || 0, oldData.avgAmountPerCampaign || 0)
        };
    };

    // Render the table based on the grouping option
    const renderTable = () => {
        if (!showTable) return null;
        
        // Render table when grouping by items first (categories/platforms)
        const renderItemFirstTable = () => (
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
                    {displayItems.map((item, itemIndex) => {
                        // Get data for this item across all years
                        const itemData = processItemData(getItemData(item));
                        
                        // Only show items that have data in the selected years
                        if (Object.keys(itemData).length === 0) {
                            return null;
                        }
                        
                        // Calculate year-on-year changes
                        const changes = showChangeRows ? calculateChanges(itemData) : null;
                        
                        // Check if this is a priority item
                        const isPriorityItem = priorityItems.includes(item);
                        const itemRowClass = isPriorityItem ? "table-primary" : "table-secondary";
                        
                        return (
                            <React.Fragment key={itemIndex}>
                                <tr className={itemRowClass}>
                                    <td colSpan="11" className="fw-bold text-center">{item}</td>
                                </tr>
                                {selectedYears.map(year => {
                                    const yearData = itemData[year];
                                    if (!yearData) return null;

                                    return (
                                        <tr key={`${item}-${year}`}>
                                            <td className="ps-4">{year}</td>
                                            <td className="text-center">{yearData.Campaigns}</td>
                                            <td className="text-center">{yearData.CampaignsMetTarget}</td>
                                            <td className="text-center">{yearData.Donors?.toLocaleString() || 'N/A'}</td>
                                            <td className="text-center">{formatPercent(yearData.TargetSuccessRate || 0)}</td>
                                            <td className="text-center">{formatPercent(yearData.FundraisingEfficiency || 0)}</td>
                                            <td className="text-center">{formatAmount(yearData.AmountRaised || 0)}</td>
                                            <td className="text-center">{formatAmount(yearData.TargetAmount || 0)}</td>
                                            <td className="text-center">{yearData.avgDonorsPerCampaign?.toFixed(0) || 'N/A'}</td>
                                            <td className="text-center">{formatAmount(yearData.avgAmountPerDonor || 0)}</td>
                                            <td className="text-center">{formatAmount(yearData.avgAmountPerCampaign || 0)}</td>
                                        </tr>
                                    );
                                })}

                                {/* Add Y-o-Y Change row if we have both years */}
                                {changes && (
                                    <tr key={`${item}-change`} className="table-light">
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
        );

        // Render table when grouping by years first
        const renderYearFirstTable = () => {
            // Restructure data for year-first grouping
            const yearFirstData = {};
            
            // Initialize the structure
            selectedYears.forEach(year => {
                yearFirstData[year] = {
                    items: {}
                };
                
                displayItems.forEach(item => {
                    yearFirstData[year].items[item] = null;
                });
            });
            
            // Fill with actual data
            metricsData.forEach(metric => {
                if (selectedYears.includes(metric.Year) && displayItems.includes(metric[itemKey])) {
                    // Process the data to ensure all the derived metrics are calculated
                    const processedMetric = { ...metric };
                    
                    // Calculate additional metrics if missing
                    if (processedMetric.Campaigns > 0) {
                        if (!processedMetric.avgDonorsPerCampaign) {
                            processedMetric.avgDonorsPerCampaign = processedMetric.Donors / processedMetric.Campaigns;
                        }
                        if (!processedMetric.avgAmountPerCampaign) {
                            processedMetric.avgAmountPerCampaign = processedMetric.AmountRaised / processedMetric.Campaigns;
                        }
                    }
                    
                    if (processedMetric.Donors > 0 && !processedMetric.avgAmountPerDonor) {
                        processedMetric.avgAmountPerDonor = processedMetric.AmountRaised / processedMetric.Donors;
                    }
                    
                    yearFirstData[metric.Year].items[metric[itemKey]] = processedMetric;
                }
            });
            
            // Create yearly comparison data for showing changes between platforms
            const itemComparisons = {};
            if (selectedYears.length === 2 && displayItems.length === 2 && showChangeRows) {
                selectedYears.forEach(year => {
                    const items = Object.keys(yearFirstData[year].items);
                    
                    if (items.length === 2 && yearFirstData[year].items[items[0]] && yearFirstData[year].items[items[1]]) {
                        const item1 = yearFirstData[year].items[items[0]];
                        const item2 = yearFirstData[year].items[items[1]];
                        
                        itemComparisons[year] = {
                            campaigns: calculatePercentageChange(item2.Campaigns || 0, item1.Campaigns || 0),
                            campaignsMetTarget: calculatePercentageChange(item2.CampaignsMetTarget || 0, item1.CampaignsMetTarget || 0),
                            donors: calculatePercentageChange(item2.Donors || 0, item1.Donors || 0),
                            targetSuccessRate: calculatePercentageChange(item2.TargetSuccessRate || 0, item1.TargetSuccessRate || 0),
                            fundraisingEfficiency: calculatePercentageChange(item2.FundraisingEfficiency || 0, item1.FundraisingEfficiency || 0),
                            amountRaised: calculatePercentageChange(item2.AmountRaised || 0, item1.AmountRaised || 0),
                            targetAmount: calculatePercentageChange(item2.TargetAmount || 0, item1.TargetAmount || 0),
                            avgDonorsPerCampaign: calculatePercentageChange(item2.avgDonorsPerCampaign || 0, item1.avgDonorsPerCampaign || 0),
                            avgAmountPerDonor: calculatePercentageChange(item2.avgAmountPerDonor || 0, item1.avgAmountPerDonor || 0),
                            avgAmountPerCampaign: calculatePercentageChange(item2.avgAmountPerCampaign || 0, item1.avgAmountPerCampaign || 0)
                        };
                    }
                });
            }
            
            return (
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
                        {selectedYears.map((year, yearIndex) => {
                            // Get data for this year
                            const yearData = yearFirstData[year];
                            
                            // Skip if no data
                            if (!yearData) return null;
                            
                            // Check if this is a priority year (not typically used but included for consistency)
                            const yearRowClass = "table-primary";
                            
                            return (
                                <React.Fragment key={yearIndex}>
                                    <tr className={yearRowClass}>
                                        <td colSpan="11" className="fw-bold text-center">{year}</td>
                                    </tr>
                                    {displayItems.map((item, itemIndex) => {
                                        const itemData = yearData.items[item];
                                        if (!itemData) return null;

                                        const isPriorityItem = priorityItems.includes(item);
                                        
                                        return (
                                            <tr key={`${year}-${item}`} className={isPriorityItem ? "table-info" : ""}>
                                                <td className="ps-4">{item}</td>
                                                <td className="text-center">{itemData.Campaigns}</td>
                                                <td className="text-center">{itemData.CampaignsMetTarget}</td>
                                                <td className="text-center">{itemData.Donors?.toLocaleString() || 'N/A'}</td>
                                                <td className="text-center">{formatPercent(itemData.TargetSuccessRate || 0)}</td>
                                                <td className="text-center">{formatPercent(itemData.FundraisingEfficiency || 0)}</td>
                                                <td className="text-center">{formatAmount(itemData.AmountRaised || 0)}</td>
                                                <td className="text-center">{formatAmount(itemData.TargetAmount || 0)}</td>
                                                <td className="text-center">{itemData.avgDonorsPerCampaign?.toFixed(0) || 'N/A'}</td>
                                                <td className="text-center">{formatAmount(itemData.avgAmountPerDonor || 0)}</td>
                                                <td className="text-center">{formatAmount(itemData.avgAmountPerCampaign || 0)}</td>
                                            </tr>
                                        );
                                    })}
                                    
                                    {/* Add platform comparison row if applicable */}
                                    {itemComparisons[year] && (
                                        <tr key={`${year}-comparison`} className="table-light">
                                            <td className="ps-4 fw-medium">Difference</td>
                                            <td className="text-center"><PercentageChange value={itemComparisons[year].campaigns} /></td>
                                            <td className="text-center"><PercentageChange value={itemComparisons[year].campaignsMetTarget} /></td>
                                            <td className="text-center"><PercentageChange value={itemComparisons[year].donors} /></td>
                                            <td className="text-center"><PercentageChange value={itemComparisons[year].targetSuccessRate} /></td>
                                            <td className="text-center"><PercentageChange value={itemComparisons[year].fundraisingEfficiency} /></td>
                                            <td className="text-center"><PercentageChange value={itemComparisons[year].amountRaised} /></td>
                                            <td className="text-center"><PercentageChange value={itemComparisons[year].targetAmount} /></td>
                                            <td className="text-center"><PercentageChange value={itemComparisons[year].avgDonorsPerCampaign} /></td>
                                            <td className="text-center"><PercentageChange value={itemComparisons[year].avgAmountPerDonor} /></td>
                                            <td className="text-center"><PercentageChange value={itemComparisons[year].avgAmountPerCampaign} /></td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            );
        };
        
        return (
            <div className="d-flex justify-content-center mb-4 mt-4">
                <div className="card w-100">
                    <div className="card-body">
                        <h4 className="mb-3">{title}</h4>
                        <div style={defaultTableContainerStyle}>
                            {groupByYear ? renderYearFirstTable() : renderItemFirstTable()}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Render metric selector and chart
    const renderChart = () => {
        if (!showChart) return null;
        
        return (
            <div className="bg-white rounded shadow p-4 mb-4">
                <h2 className="h4 mb-3">
                    {description} Comparison: {selectedYears.join(' vs ')}
                </h2>

                <div className="mb-3">
                    <label className="form-label fw-medium">Select Metric to Compare:</label>
                    <select
                        className="form-select w-auto"
                        value={selectedMetric}
                        onChange={(e) => onMetricChange(e.target.value)}
                    >
                        {metricOptions.length > 0 ? (
                            // Use provided metric options if available
                            metricOptions.map(option => (
                                <option key={option.key} value={option.key}>{option.label}</option>
                            ))
                        ) : (
                            // Default options if none provided
                            <>
                                <option value="FundraisingEfficiency">Target Completion (%)</option>
                                <option value="TargetSuccessRate">Target Success Rate (%)</option>
                                <option value="Campaigns">Number of Campaigns</option>
                                <option value="CampaignsMetTarget">Campaigns with Target Met</option>
                                <option value="Donors">Number of Donors</option>
                                <option value="AmountRaised">Amount Raised</option>
                                <option value="TargetAmount">Target Amount</option>
                                <option value="AvgDonorsPerCampaign">Avg Donors per Campaign</option>
                                <option value="AvgAmountPerDonor">Avg Amount per Donor</option>
                                <option value="AvgAmountPerCampaign">Avg Amount per Campaign</option>
                            </>
                        )}
                    </select>
                </div>
                
                <div className="mb-3">
                    <div className="form-check">
                        <input 
                            className="form-check-input" 
                            type="checkbox" 
                            id="groupByYearToggle" 
                            checked={groupByYear} 
                            onChange={() => typeof window !== 'undefined' && window.location.reload()} 
                            disabled={true}
                        />
                        <label className="form-check-label" htmlFor="groupByYearToggle">
                            Group by year first {groupByYear ? "(Showing years → items)" : "(Showing items → years)"}
                        </label>
                    </div>
                </div>

                {/* D3 Chart Container */}
                <div ref={chartRef} style={{ width: '100%', height: `${chartHeight}px` }}></div>

                {/* If there are more than maxBarItems items, show message */}
                {comparisonData.length > maxBarItems && (
                    <div className="text-muted mt-2 text-center">
                        Showing top {maxBarItems} items. Use the table above to see all data.
                    </div>
                )}
            </div>
        );
    };

    return (
        <>
            {renderTable()}
            {renderChart()}
        </>
    );
};

export default UnifiedD3Analysis;