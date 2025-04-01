import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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

const CategoryAnalysis = ({
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
            return { value: 'Percentage (%)', angle: -90, position: 'insideLeft', offset: 10 };
        } else if (metric === 'Campaigns' || metric === 'CampaignsMetTarget' || metric === 'Donors' || metric === 'AvgDonorsPerCampaign') {
            return { value: 'Count', angle: -90, position: 'insideLeft', offset: 10 };
        } else {
            return { value: 'Amount (SGD)', angle: -90, position: 'insideLeft', offset: 10 };
        }
    };

    // Helper to format tooltip values
    const formatTooltipValue = (value, name) => {
        if (name.includes('FundraisingEfficiency') || name.includes('TargetSuccessRate')) {
            return formatPercent(value);
        } else if (name.includes('AmountRaised') || name.includes('TargetAmount') || 
                  name.includes('AvgAmountPerDonor') || name.includes('AvgAmountPerCampaign')) {
            return formatAmount(value);
        }
        return value.toLocaleString();
    };

    // Calculate percentage change between years
    const calculatePercentageChange = (current, previous) => {
        if (previous === 0) return 0; // Avoid division by zero
        return ((current - previous) / previous) * 100;
    };

    // CSS for sticky header
    const stickyHeaderStyle = {
        position: "sticky",
        top: 0,
        backgroundColor: "#f8f9fa", // Light background to match table-light
        zIndex: 10, // Ensure it stays above other elements
        borderBottom: "2px solid #dee2e6" // More visible border for the sticky header
    };

    // CSS for the table container to enable proper scrolling
    const tableContainerStyle = {
        maxHeight: "600px", // Set a max height for scrolling
        overflowY: "auto",
        border: "1px solid #dee2e6" // Match table border
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
            {/* Metrics Table */}
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

            {/* Comparison Chart */}
            <div className="bg-white rounded shadow p-4 mb-4">
                <h2 className="h4 mb-3">
                    {description} Comparison: 2023 vs 2024
                    <span className="ms-2 fs-6 text-muted">
                        {/* You might want to pass filter info as props instead of hardcoding */}
                    </span>
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

                <div style={{ height: '600px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={filteredComparison}
                            margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="Category" />
                            <YAxis label={getYAxisLabel(selectedMetric)} />
                            <Tooltip formatter={formatTooltipValue} />
                            <Legend />
                            {selectedYears.map((year, index) => (
                                <Bar
                                    key={year}
                                    dataKey={`${selectedMetric}_${year}`}
                                    fill={index === 0 ? '#0d6efd' : '#20c997'}
                                    name={`${getMetricDisplayName(selectedMetric)} (${year})`}
                                />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </>
    );
};

export default CategoryAnalysis;