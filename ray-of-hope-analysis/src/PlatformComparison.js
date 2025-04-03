import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import * as d3 from 'd3';
import * as XLSX from 'xlsx';

// Component to display colored percentage change
const PercentageChange = ({ value, suffix = '%', label = 'Difference' }) => {
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

const PlatformComparison = () => {
    // State for the processed platform data
    const [platformData, setPlatformData] = useState({
        'Ray of Hope (Children)': {
            '2023': null,
            '2024': null
        },
        'G2C': {
            '2023': null,
            '2024': null
        }
    });

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Selected years for comparison
    const years = ['2023', '2024'];

    // Available metrics for the chart
    const metrics = [
        { key: 'Campaigns', label: 'Number of Campaigns' },
        { key: 'CampaignsMetTarget', label: 'Campaigns with Target Met' },
        { key: 'TargetSuccessRate', label: 'Target Success Rate (%)' },
        { key: 'AmountRaised', label: 'Amount Raised' },
        { key: 'TargetAmount', label: 'Target Amount' },
        { key: 'FundraisingEfficiency', label: 'Target Completion (%)' },
        { key: 'Donors', label: 'Total Donors' },
        { key: 'AvgDonorsPerCampaign', label: 'Avg Donors per Campaign' },
        { key: 'AvgAmountPerDonor', label: 'Avg Amount per Donor' },
        { key: 'AvgAmountPerCampaign', label: 'Avg Amount per Campaign' }
    ];

    // Selected metric for the chart - default is Target Success Rate
    const [selectedMetric, setSelectedMetric] = useState('TargetSuccessRate');

    // Selected year for the chart view
    const [selectedYear, setSelectedYear] = useState('2023');

    // Ref for D3 chart
    const chartRef = useRef(null);

    // Helper functions
    const formatAmount = (amount) => {
        return new Intl.NumberFormat('en-SG', {
            style: 'currency',
            currency: 'SGD',
            maximumFractionDigits: 0,
            minimumFractionDigits: 0
        }).format(amount);
    };

    const formatPercent = (value) => {
        return `${value.toFixed(0)}%`;
    };

    // Calculate percentage change
    const calculatePercentageChange = (current, previous) => {
        if (previous === 0 && current > 0) return 100;
        else if (previous === 0) return 0; // Avoid division by zero
        return ((current - previous) / previous) * 100;
    };

    // Parse date strings to get the year
    const getYearFromDate = (dateString) => {
        let date;

        // Try MM/DD/YYYY format (Ray of Hope style)
        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateString)) {
            const parts = dateString.split('/');
            // Use DD as parts[0], MM as parts[1], YYYY as parts[2]
            date = new Date(parts[2], parts[1] - 1, parts[0]);
        }
        // Try D MMM YYYY format (G2C style)
        else if (/^\d{1,2}\s[A-Za-z]{3}\s\d{4}$/.test(dateString)) {
            date = new Date(dateString);
        }

        if (date && !isNaN(date.getTime())) {
            return date.getFullYear().toString();
        }

        // If we can't parse the date, return null
        return null;
    };

    // Fetch and process data from Excel files
    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);

                // Process Ray of Hope data
                const rohData = await fetchRayOfHopeData();

                // Process G2C data
                const g2cData = await fetchG2CData();

                // Combine the data
                setPlatformData({
                    'Ray of Hope (Children)': rohData,
                    'G2C': g2cData
                });

                setIsLoading(false);
            } catch (err) {
                console.error("Error loading data:", err);
                setError("Failed to load data. Please try again later.");
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    // Fetch and process Ray of Hope data
    const fetchRayOfHopeData = async () => {
        try {
            let jsonData = [];

            try {
                console.log("Loading Ray of Hope data via fetch API");
                const response = await fetch(`${process.env.PUBLIC_URL}/ray_of_hope_campaigns_detailed.xlsx`);
                const arrayBuffer = await response.arrayBuffer();
                const workbook = XLSX.read(new Uint8Array(arrayBuffer), { cellDates: true });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                jsonData = XLSX.utils.sheet_to_json(worksheet);
                console.log("Successfully loaded Ray of Hope data via fetch");
            } catch (fetchError) {
                console.error("Error fetching Ray of Hope data:", fetchError);
                throw new Error("Failed to load Ray of Hope data");
            }

            // Initialize aggregated data by year
            const aggregatedData = {
                '2023': {
                    Campaigns: 0,
                    CampaignsMetTarget: 0,
                    AmountRaised: 0,
                    TargetAmount: 0,
                    Donors: 0
                },
                '2024': {
                    Campaigns: 0,
                    CampaignsMetTarget: 0,
                    AmountRaised: 0,
                    TargetAmount: 0,
                    Donors: 0
                }
            };

            // Process each campaign and aggregate by year
            jsonData.forEach(campaign => {
                // Check if this is a children's campaign
                if (campaign["Source Category"]) {
                    // Split the Source Category by commas and trim each category
                    const categories = campaign["Source Category"].split(',').map(cat => cat.trim());

                    // Check if "children-12-years-and-below" is one of the categories
                    if (categories.includes("children-12-years-and-below")) {
                        const year = getYearFromDate(campaign["Start Date"]);

                        if (year && (year === '2023' || year === '2024')) {
                            // Add to campaign count
                            aggregatedData[year].Campaigns++;

                            // Check if target was met
                            if (campaign["Completion Percentage"] >= 100) {
                                aggregatedData[year].CampaignsMetTarget++;
                            }

                            // Add to financial totals
                            aggregatedData[year].AmountRaised += campaign["Amount Raised"] || 0;
                            aggregatedData[year].TargetAmount += campaign["Target Amount"] || 0;

                            // Add to donor count
                            aggregatedData[year].Donors += campaign["Number of Donors"] || 0;
                        }
                    }
                }
            });

            // Calculate derived metrics for each year
            const result = {};

            Object.keys(aggregatedData).forEach(year => {
                const yearData = aggregatedData[year];

                // Only process years with data
                if (yearData.Campaigns > 0) {
                    result[year] = {
                        Campaigns: yearData.Campaigns,
                        CampaignsMetTarget: yearData.CampaignsMetTarget,
                        TargetSuccessRate: (yearData.CampaignsMetTarget / yearData.Campaigns) * 100,
                        AmountRaised: yearData.AmountRaised,
                        TargetAmount: yearData.TargetAmount,
                        FundraisingEfficiency: (yearData.AmountRaised / yearData.TargetAmount) * 100,
                        Donors: yearData.Donors,
                        AvgDonorsPerCampaign: yearData.Donors / yearData.Campaigns,
                        AvgAmountPerDonor: yearData.AmountRaised / yearData.Donors,
                        AvgAmountPerCampaign: yearData.AmountRaised / yearData.Campaigns
                    };
                }
            });

            return result;
        } catch (error) {
            console.error("Error processing Ray of Hope data:", error);
            throw error;
        }
    };

    // Fetch and process G2C data
    const fetchG2CData = async () => {
        try {
            let jsonData = [];

            try {
                console.log("Loading G2C data via fetch API");
                const response = await fetch(`${process.env.PUBLIC_URL}/G2C_campaigns.xlsx`);
                const arrayBuffer = await response.arrayBuffer();
                const workbook = XLSX.read(new Uint8Array(arrayBuffer), { cellDates: true });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                jsonData = XLSX.utils.sheet_to_json(worksheet);
                console.log("Successfully loaded G2C data via fetch");
            } catch (fetchError) {
                console.error("Error fetching G2C data:", fetchError);
                throw new Error("Failed to load G2C data");
            }

            // Initialize aggregated data by year
            const aggregatedData = {
                '2023': {
                    Campaigns: 0,
                    CampaignsMetTarget: 0,
                    AmountRaised: 0,
                    TargetAmount: 0,
                    Donors: 0
                },
                '2024': {
                    Campaigns: 0,
                    CampaignsMetTarget: 0,
                    AmountRaised: 0,
                    TargetAmount: 0,
                    Donors: 0
                }
            };

            // Process each campaign and aggregate by year
            jsonData.forEach(campaign => {
                // Get the year from the start date
                const year = getYearFromDate(campaign["Start Date"]);

                if (year && (year === '2023' || year === '2024')) {
                    // Add to campaign count
                    aggregatedData[year].Campaigns++;

                    // Check if target was met
                    if (campaign["Percentage Completion"] >= 100) {
                        aggregatedData[year].CampaignsMetTarget++;
                    }

                    // Add to financial totals
                    aggregatedData[year].AmountRaised += campaign["Amount Raised"] || 0;
                    aggregatedData[year].TargetAmount += campaign["Target Amount"] || 0;

                    // Add to donor count
                    aggregatedData[year].Donors += campaign["Number of Donors"] || 0;
                }
            });

            // Calculate derived metrics for each year
            const result = {};

            Object.keys(aggregatedData).forEach(year => {
                const yearData = aggregatedData[year];

                // Only process years with data
                if (yearData.Campaigns > 0) {
                    result[year] = {
                        Campaigns: yearData.Campaigns,
                        CampaignsMetTarget: yearData.CampaignsMetTarget,
                        TargetSuccessRate: (yearData.CampaignsMetTarget / yearData.Campaigns) * 100,
                        AmountRaised: yearData.AmountRaised,
                        TargetAmount: yearData.TargetAmount,
                        FundraisingEfficiency: (yearData.AmountRaised / yearData.TargetAmount) * 100,
                        Donors: yearData.Donors,
                        AvgDonorsPerCampaign: yearData.Donors / yearData.Campaigns,
                        AvgAmountPerDonor: yearData.AmountRaised / yearData.Donors,
                        AvgAmountPerCampaign: yearData.AmountRaised / yearData.Campaigns
                    };
                }
            });

            return result;
        } catch (error) {
            console.error("Error processing G2C data:", error);
            throw error;
        }
    };

    // Debounce function for resize handling
    const debounce = (fn, ms) => {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), ms);
        };
    };

    // Helper to format values based on metric type
    const formatValue = (value, metric) => {
        if (!value && value !== 0) return 'N/A';

        if (metric === 'TargetSuccessRate' || metric === 'FundraisingEfficiency') {
            return formatPercent(value);
        } else if (metric === 'AmountRaised' || metric === 'TargetAmount' ||
            metric === 'AvgAmountPerDonor' || metric === 'AvgAmountPerCampaign') {
            return formatAmount(value);
        }
        return value.toLocaleString();
    };

    // Create the D3 chart
    useLayoutEffect(() => {
        // Check if we have data and the chart reference
        if (chartRef.current && !isLoading && !error) {
            const hasData = Object.values(platformData).some(platform =>
                Object.values(platform).some(yearData => yearData !== null)
            );

            if (hasData) {
                createD3Chart();
            }
        }

        // Add resize listener with debounce
        const handleResize = debounce(() => {
            if (chartRef.current && !isLoading && !error) {
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
    }, [platformData, selectedMetric, selectedYear, isLoading, error]);

    const createD3Chart = () => {
        if (!chartRef.current) return;

        // Clear previous chart
        d3.select(chartRef.current).selectAll("*").remove();

        // Set dimensions and margins
        const margin = { top: 50, right: 120, bottom: 80, left: 100 };

        // Get container dimensions
        const containerWidth = chartRef.current.clientWidth;
        const containerHeight = 500; // Fixed height or adjust as needed

        // Create SVG element
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

        // Font sizes that scale with chart width
        const axisTitleFontSize = Math.max(0.75, Math.min(1, width / 800));
        const barValueFontSize = Math.max(0.625, Math.min(0.875, width / 960));
        const tickLabelFontSize = Math.max(0.625, Math.min(0.875, width / 1120));

        // Prepare the platforms and years
        const platforms = Object.keys(platformData);

        // Create a dataset for the chart that includes all platforms and years
        const chartData = [];
        years.forEach(year => {
            platforms.forEach(platform => {
                const yearData = platformData[platform][year];
                if (yearData && yearData[selectedMetric] !== undefined) {
                    chartData.push({
                        platform,
                        year,
                        value: yearData[selectedMetric]
                    });
                }
            });
        });

        // Check if we have data to display
        if (chartData.length === 0) {
            svg.append("text")
                .attr("x", width / 2)
                .attr("y", height / 2)
                .attr("text-anchor", "middle")
                .attr("font-size", "16px")
                .text("No data available for the selected metric");
            return;
        }

        // Create x scale (years)
        const x0 = d3.scaleBand()
            .domain(years)
            .rangeRound([0, width])
            .paddingInner(0.3);

        // Create inner x scale (platforms)
        const x1 = d3.scaleBand()
            .domain(platforms)
            .rangeRound([0, x0.bandwidth()])
            .padding(0.05);

        // Define max y value based on selected metric
        const maxValue = d3.max(chartData, d => d.value);

        // Create y scale
        const y = d3.scaleLinear()
            .domain([0, maxValue * 1.1]) // Add 10% padding at the top
            .nice()
            .range([height, 0]);

        // Define colors for platforms
        const colorScale = d3.scaleOrdinal()
            .domain(platforms)
            .range(['#0d6efd', '#20c997']);

        // Add X axis
        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x0))
            .selectAll("text")
            .style("font-size", `${tickLabelFontSize}rem`)
            .style("text-anchor", "middle");

        // Add Y axis
        svg.append("g")
            .call(d3.axisLeft(y)
                .ticks(10)
                .tickFormat(d => {
                    if (selectedMetric === 'TargetSuccessRate' || selectedMetric === 'FundraisingEfficiency') {
                        return d + "%";
                    } else if (selectedMetric === 'AmountRaised' || selectedMetric === 'TargetAmount') {
                        return "$" + d3.format(",.0f")(d);
                    }
                    return d;
                })
            )
            .style("font-size", `${tickLabelFontSize}rem`);

        // Helper to get Y-axis label based on metric
        const getYAxisLabel = (metric) => {
            if (metric === 'TargetSuccessRate' || metric === 'FundraisingEfficiency') {
                return "Percentage (%)";
            } else if (metric === 'AmountRaised' || metric === 'TargetAmount' ||
                metric === 'AvgAmountPerDonor' || metric === 'AvgAmountPerCampaign') {
                return "Amount (SGD)";
            } else {
                return "Count";
            }
        };

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
            .text(`${metrics.find(m => m.key === selectedMetric)?.label || selectedMetric} Comparison (2023-2024)`);

        // Group data by year for the chart
        const groupedData = d3.group(chartData, d => d.year);

        // Add bars grouped by year
        svg.append("g")
            .selectAll("g")
            .data(groupedData)
            .join("g")
            .attr("transform", ([year]) => `translate(${x0(year)},0)`)
            .selectAll("rect")
            .data(([_, values]) => values)
            .join("rect")
            .attr("x", d => x1(d.platform))
            .attr("y", d => y(d.value))
            .attr("width", x1.bandwidth())
            .attr("height", d => height - y(d.value))
            .attr("fill", d => colorScale(d.platform))
            .attr("rx", 4) // Rounded corners
            .attr("ry", 4);

        // Add values on top of bars
        svg.append("g")
            .selectAll("g")
            .data(groupedData)
            .join("g")
            .attr("transform", ([year]) => `translate(${x0(year)},0)`)
            .selectAll("text")
            .data(([_, values]) => values)
            .join("text")
            .attr("x", d => x1(d.platform) + x1.bandwidth() / 2)
            .attr("y", d => y(d.value) - 5)
            .attr("text-anchor", "middle")
            .attr("font-size", `${barValueFontSize}rem`)
            .text(d => {
                if (selectedMetric === 'TargetSuccessRate' || selectedMetric === 'FundraisingEfficiency') {
                    return `${d.value.toFixed(0)}%`;
                } else if (selectedMetric === 'AmountRaised' || selectedMetric === 'TargetAmount') {
                    return formatAmount(d.value);
                }
                return d.value.toLocaleString();
            });

        // Add a legend
        const legend = svg.append("g")
            .attr("font-family", "sans-serif")
            .attr("font-size", `${tickLabelFontSize}rem`)
            .attr("text-anchor", "start")
            .selectAll("g")
            .data(platforms)
            .join("g")
            .attr("transform", (d, i) => `translate(${width - 180},${i * 20})`);

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
                // Calculate percentage change between platforms for the same year
                let platformComparison = null;
                const otherPlatform = d.platform === 'G2C' ? 'Ray of Hope (Children)' : 'G2C';
                const otherPlatformData = platformData[otherPlatform][d.year];
                const thisPlatformData = platformData[d.platform][d.year];

                if (otherPlatformData && thisPlatformData) {
                    platformComparison = calculatePercentageChange(
                        thisPlatformData[selectedMetric],
                        otherPlatformData[selectedMetric]
                    );
                }

                // Show tooltip
                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);

                let tooltipText = `
                    <strong>${d.platform} (${d.year})</strong><br>
                    ${metrics.find(m => m.key === selectedMetric)?.label || selectedMetric}: ${formatValue(d.value, selectedMetric)}
                `;

                if (platformComparison !== null) {
                    tooltipText += `<br>vs ${otherPlatform}: ${platformComparison > 0 ? '+' : ''}${platformComparison.toFixed(0)}%`;
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

    // CSS for the table container
    const tableContainerStyle = {
        maxHeight: "600px",
        overflowY: "auto",
        border: "1px solid #dee2e6"
    };

    // Render loading state
    if (isLoading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ height: "400px" }}>
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
                <span className="ms-3">Loading platform data...</span>
            </div>
        );
    }

    // Render error state
    if (error) {
        return (
            <div className="alert alert-danger m-4" role="alert">
                <h4 className="alert-heading">Error Loading Data</h4>
                <p>{error}</p>
                <hr />
                <p className="mb-0">Please check that the Excel files are correctly placed in the public folder.</p>
            </div>
        );
    }

    // Check if we have data to display
    const hasData = Object.values(platformData).some(platform =>
        Object.values(platform).some(yearData => yearData !== null)
    );

    if (!hasData) {
        return (
            <div className="alert alert-warning m-4" role="alert">
                <h4 className="alert-heading">No Data Available</h4>
                <p>No campaign data was found for the selected time period.</p>
                <hr />
                <p className="mb-0">Please check that the Excel files contain valid campaign data.</p>
            </div>
        );
    }

    return (
        <div className="platform-comparison">
            <h1 className="h3 mb-4">Platform Comparison: Ray of Hope (Children) vs G2C</h1>

            {/* Metrics Table - Reorganized by Year */}
            <div className="card mb-5">
                <div className="card-body">
                    <h2 className="h4 mb-3">Campaign Performance Metrics (2023-2024)</h2>
                    <div style={tableContainerStyle}>
                        <table className="table table-bordered table-striped table-hover">
                            <thead className="table-light">
                                <tr style={stickyHeaderStyle}>
                                    <th className="text-center" style={{ width: "10%" }}>Platform</th>
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
                                {/* 2023 Section */}
                                <tr className="table-primary">
                                    <td colSpan="11" className="fw-bold text-center">2023</td>
                                </tr>
                                <tr key="g2c-2023">
                                    <td className="ps-4">G2C</td>
                                    <td className="text-center">{platformData['G2C']['2023']?.Campaigns || 'N/A'}</td>
                                    <td className="text-center">{platformData['G2C']['2023']?.CampaignsMetTarget || 'N/A'}</td>
                                    <td className="text-center">{platformData['G2C']['2023']?.Donors?.toLocaleString() || 'N/A'}</td>
                                    <td className="text-center">{formatPercent(platformData['G2C']['2023']?.TargetSuccessRate || 0)}</td>
                                    <td className="text-center">{formatPercent(platformData['G2C']['2023']?.FundraisingEfficiency || 0)}</td>
                                    <td className="text-center">{formatAmount(platformData['G2C']['2023']?.AmountRaised || 0)}</td>
                                    <td className="text-center">{formatAmount(platformData['G2C']['2023']?.TargetAmount || 0)}</td>
                                    <td className="text-center">{platformData['G2C']['2023']?.AvgDonorsPerCampaign?.toFixed(0) || 'N/A'}</td>
                                    <td className="text-center">{formatAmount(platformData['G2C']['2023']?.AvgAmountPerDonor || 0)}</td>
                                    <td className="text-center">{formatAmount(platformData['G2C']['2023']?.AvgAmountPerCampaign || 0)}</td>
                                </tr>
                                <tr key="roh-2023">
                                    <td className="ps-4">RoH (Children)</td>
                                    <td className="text-center">{platformData['Ray of Hope (Children)']['2023']?.Campaigns || 'N/A'}</td>
                                    <td className="text-center">{platformData['Ray of Hope (Children)']['2023']?.CampaignsMetTarget || 'N/A'}</td>
                                    <td className="text-center">{platformData['Ray of Hope (Children)']['2023']?.Donors?.toLocaleString() || 'N/A'}</td>
                                    <td className="text-center">{formatPercent(platformData['Ray of Hope (Children)']['2023']?.TargetSuccessRate || 0)}</td>
                                    <td className="text-center">{formatPercent(platformData['Ray of Hope (Children)']['2023']?.FundraisingEfficiency || 0)}</td>
                                    <td className="text-center">{formatAmount(platformData['Ray of Hope (Children)']['2023']?.AmountRaised || 0)}</td>
                                    <td className="text-center">{formatAmount(platformData['Ray of Hope (Children)']['2023']?.TargetAmount || 0)}</td>
                                    <td className="text-center">{platformData['Ray of Hope (Children)']['2023']?.AvgDonorsPerCampaign?.toFixed(0) || 'N/A'}</td>
                                    <td className="text-center">{formatAmount(platformData['Ray of Hope (Children)']['2023']?.AvgAmountPerDonor || 0)}</td>
                                    <td className="text-center">{formatAmount(platformData['Ray of Hope (Children)']['2023']?.AvgAmountPerCampaign || 0)}</td>
                                </tr>
                                {/* Calculate difference for 2023 */}
                                {platformData['G2C']['2023'] && platformData['Ray of Hope (Children)']['2023'] && (
                                    <tr className="table-light">
                                        <td className="ps-4 fw-medium">Difference</td>
                                        <td className="text-center">
                                            <PercentageChange
                                                value={calculatePercentageChange(
                                                    platformData['Ray of Hope (Children)']['2023']?.Campaigns || 0,
                                                    platformData['G2C']['2023']?.Campaigns || 0
                                                )}
                                                label="Difference"
                                            />
                                        </td>
                                        <td className="text-center">
                                            <PercentageChange
                                                value={calculatePercentageChange(
                                                    platformData['Ray of Hope (Children)']['2023']?.CampaignsMetTarget || 0,
                                                    platformData['G2C']['2023']?.CampaignsMetTarget || 0
                                                )}
                                                label="Difference"
                                            />
                                        </td>
                                        <td className="text-center">
                                            <PercentageChange
                                                value={calculatePercentageChange(
                                                    platformData['Ray of Hope (Children)']['2023']?.Donors || 0,
                                                    platformData['G2C']['2023']?.Donors || 0
                                                )}
                                                label="Difference"
                                            />
                                        </td>
                                        <td className="text-center">
                                            <PercentageChange
                                                value={calculatePercentageChange(
                                                    platformData['Ray of Hope (Children)']['2023']?.TargetSuccessRate || 0,
                                                    platformData['G2C']['2023']?.TargetSuccessRate || 0
                                                )}
                                                label="Difference"
                                            />
                                        </td>
                                        <td className="text-center">
                                            <PercentageChange
                                                value={calculatePercentageChange(
                                                    platformData['Ray of Hope (Children)']['2023']?.FundraisingEfficiency || 0,
                                                    platformData['G2C']['2023']?.FundraisingEfficiency || 0
                                                )}
                                                label="Difference"
                                            />
                                        </td>
                                        <td className="text-center">
                                            <PercentageChange
                                                value={calculatePercentageChange(
                                                    platformData['Ray of Hope (Children)']['2023']?.AmountRaised || 0,
                                                    platformData['G2C']['2023']?.AmountRaised || 0
                                                )}
                                                label="Difference"
                                            />
                                        </td>
                                        <td className="text-center">
                                            <PercentageChange
                                                value={calculatePercentageChange(
                                                    platformData['Ray of Hope (Children)']['2023']?.TargetAmount || 0,
                                                    platformData['G2C']['2023']?.TargetAmount || 0
                                                )}
                                                label="Difference"
                                            />
                                        </td>
                                        <td className="text-center">
                                            <PercentageChange
                                                value={calculatePercentageChange(
                                                    platformData['Ray of Hope (Children)']['2023']?.AvgDonorsPerCampaign || 0,
                                                    platformData['G2C']['2023']?.AvgDonorsPerCampaign || 0
                                                )}
                                                label="Difference"
                                            />
                                        </td>
                                        <td className="text-center">
                                            <PercentageChange
                                                value={calculatePercentageChange(
                                                    platformData['Ray of Hope (Children)']['2023']?.AvgAmountPerDonor || 0,
                                                    platformData['G2C']['2023']?.AvgAmountPerDonor || 0
                                                )}
                                                label="Difference"
                                            />
                                        </td>
                                        <td className="text-center">
                                            <PercentageChange
                                                value={calculatePercentageChange(
                                                    platformData['Ray of Hope (Children)']['2023']?.AvgAmountPerCampaign || 0,
                                                    platformData['G2C']['2023']?.AvgAmountPerCampaign || 0
                                                )}
                                                label="Difference"
                                            />
                                        </td>
                                    </tr>
                                )}

                                {/* 2024 Section */}
                                <tr className="table-success">
                                    <td colSpan="11" className="fw-bold text-center">2024</td>
                                </tr>
                                <tr key="g2c-2024">
                                    <td className="ps-4">G2C</td>
                                    <td className="text-center">{platformData['G2C']['2024']?.Campaigns || 'N/A'}</td>
                                    <td className="text-center">{platformData['G2C']['2024']?.CampaignsMetTarget || 'N/A'}</td>
                                    <td className="text-center">{platformData['G2C']['2024']?.Donors?.toLocaleString() || 'N/A'}</td>
                                    <td className="text-center">{formatPercent(platformData['G2C']['2024']?.TargetSuccessRate || 0)}</td>
                                    <td className="text-center">{formatPercent(platformData['G2C']['2024']?.FundraisingEfficiency || 0)}</td>
                                    <td className="text-center">{formatAmount(platformData['G2C']['2024']?.AmountRaised || 0)}</td>
                                    <td className="text-center">{formatAmount(platformData['G2C']['2024']?.TargetAmount || 0)}</td>
                                    <td className="text-center">{platformData['G2C']['2024']?.AvgDonorsPerCampaign?.toFixed(0) || 'N/A'}</td>
                                    <td className="text-center">{formatAmount(platformData['G2C']['2024']?.AvgAmountPerDonor || 0)}</td>
                                    <td className="text-center">{formatAmount(platformData['G2C']['2024']?.AvgAmountPerCampaign || 0)}</td>
                                </tr>
                                <tr key="roh-2024">
                                    <td className="ps-4">RoH (Children)</td>
                                    <td className="text-center">{platformData['Ray of Hope (Children)']['2024']?.Campaigns || 'N/A'}</td>
                                    <td className="text-center">{platformData['Ray of Hope (Children)']['2024']?.CampaignsMetTarget || 'N/A'}</td>
                                    <td className="text-center">{platformData['Ray of Hope (Children)']['2024']?.Donors?.toLocaleString() || 'N/A'}</td>
                                    <td className="text-center">{formatPercent(platformData['Ray of Hope (Children)']['2024']?.TargetSuccessRate || 0)}</td>
                                    <td className="text-center">{formatPercent(platformData['Ray of Hope (Children)']['2024']?.FundraisingEfficiency || 0)}</td>
                                    <td className="text-center">{formatAmount(platformData['Ray of Hope (Children)']['2024']?.AmountRaised || 0)}</td>
                                    <td className="text-center">{formatAmount(platformData['Ray of Hope (Children)']['2024']?.TargetAmount || 0)}</td>
                                    <td className="text-center">{platformData['Ray of Hope (Children)']['2024']?.AvgDonorsPerCampaign?.toFixed(0) || 'N/A'}</td>
                                    <td className="text-center">{formatAmount(platformData['Ray of Hope (Children)']['2024']?.AvgAmountPerDonor || 0)}</td>
                                    <td className="text-center">{formatAmount(platformData['Ray of Hope (Children)']['2024']?.AvgAmountPerCampaign || 0)}</td>
                                </tr>
                                {/* Calculate difference for 2024 */}
                                {platformData['G2C']['2024'] && platformData['Ray of Hope (Children)']['2024'] && (
                                    <tr className="table-light">
                                        <td className="ps-4 fw-medium">Difference</td>
                                        <td className="text-center">
                                            <PercentageChange
                                                value={calculatePercentageChange(
                                                    platformData['Ray of Hope (Children)']['2024']?.Campaigns || 0,
                                                    platformData['G2C']['2024']?.Campaigns || 0
                                                )}
                                                label="Difference"
                                            />
                                        </td>
                                        <td className="text-center">
                                            <PercentageChange
                                                value={calculatePercentageChange(
                                                    platformData['Ray of Hope (Children)']['2024']?.CampaignsMetTarget || 0,
                                                    platformData['G2C']['2024']?.CampaignsMetTarget || 0
                                                )}
                                                label="Difference"
                                            />
                                        </td>
                                        <td className="text-center">
                                            <PercentageChange
                                                value={calculatePercentageChange(
                                                    platformData['Ray of Hope (Children)']['2024']?.Donors || 0,
                                                    platformData['G2C']['2024']?.Donors || 0
                                                )}
                                                label="Difference"
                                            />
                                        </td>
                                        <td className="text-center">
                                            <PercentageChange
                                                value={calculatePercentageChange(
                                                    platformData['Ray of Hope (Children)']['2024']?.TargetSuccessRate || 0,
                                                    platformData['G2C']['2024']?.TargetSuccessRate || 0
                                                )}
                                                label="Difference"
                                            />
                                        </td>
                                        <td className="text-center">
                                            <PercentageChange
                                                value={calculatePercentageChange(
                                                    platformData['Ray of Hope (Children)']['2024']?.FundraisingEfficiency || 0,
                                                    platformData['G2C']['2024']?.FundraisingEfficiency || 0
                                                )}
                                                label="Difference"
                                            />
                                        </td>
                                        <td className="text-center">
                                            <PercentageChange
                                                value={calculatePercentageChange(
                                                    platformData['Ray of Hope (Children)']['2024']?.AmountRaised || 0,
                                                    platformData['G2C']['2024']?.AmountRaised || 0
                                                )}
                                                label="Difference"
                                            />
                                        </td>
                                        <td className="text-center">
                                            <PercentageChange
                                                value={calculatePercentageChange(
                                                    platformData['Ray of Hope (Children)']['2024']?.TargetAmount || 0,
                                                    platformData['G2C']['2024']?.TargetAmount || 0
                                                )}
                                                label="Difference"
                                            />
                                        </td>
                                        <td className="text-center">
                                            <PercentageChange
                                                value={calculatePercentageChange(
                                                    platformData['Ray of Hope (Children)']['2024']?.AvgDonorsPerCampaign || 0,
                                                    platformData['G2C']['2024']?.AvgDonorsPerCampaign || 0
                                                )}
                                                label="Difference"
                                            />
                                        </td>
                                        <td className="text-center">
                                            <PercentageChange
                                                value={calculatePercentageChange(
                                                    platformData['Ray of Hope (Children)']['2024']?.AvgAmountPerDonor || 0,
                                                    platformData['G2C']['2024']?.AvgAmountPerDonor || 0
                                                )}
                                                label="Difference"
                                            />
                                        </td>
                                        <td className="text-center">
                                            <PercentageChange
                                                value={calculatePercentageChange(
                                                    platformData['Ray of Hope (Children)']['2024']?.AvgAmountPerCampaign || 0,
                                                    platformData['G2C']['2024']?.AvgAmountPerCampaign || 0
                                                )}
                                                label="Difference"
                                            />
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded shadow p-4 mb-4">
                <h2 className="h4 mb-3">Platform Comparison Chart</h2>

                <div className="mb-3">
                    <label className="form-label fw-medium">Select Metric to Compare:</label>
                    <select
                        className="form-select w-auto"
                        value={selectedMetric}
                        onChange={(e) => setSelectedMetric(e.target.value)}
                    >
                        {metrics.map(metric => (
                            <option key={metric.key} value={metric.key}>{metric.label}</option>
                        ))}
                    </select>
                </div>

                {/* D3 Chart Container */}
                <div ref={chartRef} style={{ width: '100%', height: '500px' }}></div>
            </div>
        </div>
    );
};

export default PlatformComparison;