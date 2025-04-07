import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import FilterControls from './components/FilterControls';
import UnifiedD3Analysis from './components/UnifiedD3Analysis';
import MetricsTableD3 from './components/MetricsTableD3';
import D3BarChart from './components/D3BarChart';
import MonthlyTrendsLineChart from './components/MonthlyTrendsLineChart';

const RayOfHopeAnalysis = () => {
    const [data, setData] = useState({
        loading: true,
        overallMetrics: [],
        categoryMetrics: [],
        primaryCategoryMetrics: [],
        yearlyComparison: [],
        primaryYearlyComparison: [],
        sourceCategories: [],
        primaryCategories: []
    });

    const [selectedYears, setSelectedYears] = useState(['2023', '2024']);
    const [selectedMetric, setSelectedMetric] = useState('FundraisingEfficiency');
    const [selectedPrimaryMetric, setSelectedPrimaryMetric] = useState('FundraisingEfficiency');
    const [showOnlyCompleted, setShowOnlyCompleted] = useState(false);
    const [removeOutliers, setRemoveOutliers] = useState(false);
    const [excludeGivingCircles, setExcludeGivingCircles] = useState(true);

    // Function to extract primary category (the one starting with "0")
    const extractPrimaryCategory = (sourceCategory) => {
        if (!sourceCategory) return "Unknown";

        // Split by comma and look for categories starting with 0
        const categories = sourceCategory.split(',').map(cat => cat.trim());
        const primaryCategory = categories.find(cat => cat.startsWith('0'));

        // If found, return without the "0" prefix, otherwise return the first category
        if (primaryCategory) {
            return primaryCategory.replace(/^0\s*/, '');
        } else {
            // If no category starts with 0, use the first one as fallback
            return categories[0] || "Unknown";
        }
    };
    const [monthlyDistribution, setMonthlyDistribution] = useState({
        '2023': new Array(12).fill(0),
        '2024': new Array(12).fill(0)
    });

    // Add the function to process monthly distribution data
    const processMonthlyDistribution = (jsonData) => {
        const monthlyData = {
            '2023': new Array(12).fill(0),
            '2024': new Array(12).fill(0)
        };

        // Apply filters first
        let filteredData = [...jsonData];

        if (removeOutliers) {
            filteredData = filteredData.filter(row => (row['Target Amount'] || 0) < 1000000);
        }

        if (excludeGivingCircles) {
            filteredData = filteredData.filter(row => {
                if (!row['Source Category']) return true;
                return !row['Source Category'].toLowerCase().includes('giving-circles');
            });
        }

        if (showOnlyCompleted) {
            filteredData = filteredData.filter(campaign => campaign["Days to Go"] === 0);
        }

        // Count campaigns by month
        filteredData.forEach(campaign => {
            if (campaign['Start Date']) {
                const dateParts = campaign['Start Date'].split('/');
                if (dateParts.length === 3) {
                    // For Ray of Hope format (DD/MM/YYYY)
                    const month = parseInt(dateParts[1]) - 1; // Convert to 0-based month index
                    const year = dateParts[2];

                    if ((year === '2023' || year === '2024') && month >= 0 && month < 12) {
                        monthlyData[year][month]++;
                    }
                }
            }
        });

        return monthlyData;
    };
    useEffect(() => {
        const processData = async () => {
            try {
                // Sample fallback data
                let jsonData = [
                    { "Title": "Sample Campaign 1", "Days to Go": 0, "Amount Raised": 2500, "Target Amount": 3000, "Source Category": "0chronic-illness, families-in-need", "Start Date": "15/03/2023" },
                    { "Title": "Sample Campaign 2", "Days to Go": 0, "Amount Raised": 1800, "Target Amount": 2000, "Source Category": "disability, 0children-12-years-and-below", "Start Date": "20/04/2023" },
                    { "Title": "Sample Campaign 3", "Days to Go": 0, "Amount Raised": 5000, "Target Amount": 5000, "Source Category": "0mental-health, youth-from-13-to-21-years", "Start Date": "10/05/2023" },
                    { "Title": "Sample Campaign 4", "Days to Go": 0, "Amount Raised": 4200, "Target Amount": 5000, "Source Category": "0chronic-illness, seniors", "Start Date": "25/06/2024" },
                    { "Title": "Sample Campaign 5", "Days to Go": 0, "Amount Raised": 3500, "Target Amount": 4000, "Source Category": "families-in-need, 0children-12-years-and-below", "Start Date": "12/07/2024" }
                ];

                // Try to load real data via fetch
                try {
                    console.log("Trying fetch API as fallback");
                    try {
                        const response = await fetch(`${process.env.PUBLIC_URL}/ray_of_hope_campaigns_detailed.xlsx`);
                        const arrayBuffer = await response.arrayBuffer();
                        const workbook = XLSX.read(new Uint8Array(arrayBuffer), { cellDates: true });
                        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                        jsonData = XLSX.utils.sheet_to_json(worksheet);
                        console.log("Successfully loaded Excel data via fetch");
                    } catch (fetchError) {
                        console.log("Fetch failed, using sample data:", fetchError);
                    }
                } catch (loadError) {
                    console.log("Error loading data, using sample data:", loadError);
                }

                // Extract primary category for each campaign
                jsonData.forEach(row => {
                    // Extract primary category
                    if (row['Categories']) {
                        row.primaryCategory = extractPrimaryCategory(row['Categories']);
                    } else {
                        row.primaryCategory = "Unknown";
                    }

                    // Process start dates and convert to years
                    if (row['Start Date']) {
                        const dateParts = row['Start Date'].split('/');
                        if (dateParts.length === 3) {
                            const year = parseInt(dateParts[2]);
                            row.startYear = year;
                        }
                    }
                });

                // Apply filter for completed campaigns if toggle is on
                let filteredJsonData = showOnlyCompleted
                    ? jsonData.filter(row => row['Days to Go'] === 0)
                    : jsonData;

                // Apply outlier filter if toggle is on (removing campaigns with target >= 1 million)
                if (removeOutliers) {
                    filteredJsonData = filteredJsonData.filter(row => (row['Target Amount'] || 0) < 1000000);
                }

                // Exclude giving circles if toggle is on
                if (excludeGivingCircles) {
                    filteredJsonData = filteredJsonData.filter(row => {
                        if (!row['Source Category']) return true;
                        return !row['Source Category'].toLowerCase().includes('giving-circles');
                    });
                }

                // Group campaigns by start year
                const campaignsByYear = {};
                filteredJsonData.forEach(row => {
                    if (row.startYear) {
                        if (!campaignsByYear[row.startYear]) {
                            campaignsByYear[row.startYear] = [];
                        }
                        campaignsByYear[row.startYear].push(row);
                    }
                });

                // Calculate overall metrics by year
                const yearlyMetrics = {};
                Object.keys(campaignsByYear).forEach(year => {
                    const campaigns = campaignsByYear[year];
                    const totalRaised = Number(campaigns.reduce((sum, campaign) => sum + (campaign['Amount Raised'] || 0), 0).toFixed(0));
                    const totalTarget = campaigns.reduce((sum, campaign) => sum + (campaign['Target Amount'] || 0), 0);
                    const fundraisingEfficiency = totalTarget > 0 ? parseFloat(((totalRaised / totalTarget) * 100).toFixed(0)) : 0;
                    const totalDonors = campaigns.reduce((sum, campaign) => sum + (campaign['Number of Donors'] || 0), 0)
                    const campaignsMetTarget = campaigns.filter(campaign =>
                        (campaign['Amount Raised'] || 0) >= (campaign['Target Amount'] || 0)
                    ).length;
                    const targetSuccessRate = campaigns.length > 0 ? parseFloat(((campaignsMetTarget / campaigns.length) * 100).toFixed(0)) : 0;

                    yearlyMetrics[year] = {
                        campaigns: campaigns.length,
                        amountRaised: totalRaised,
                        targetAmount: totalTarget,
                        fundraisingEfficiency: fundraisingEfficiency,
                        campaignsMetTarget: campaignsMetTarget,
                        targetSuccessRate: targetSuccessRate,
                        donors: totalDonors
                    };
                });

                // Extract all unique source categories
                const allSourceCategories = new Set();
                jsonData.forEach(row => {
                    if (row['Source Category']) {
                        const categories = row['Source Category'].split(',').map(cat => cat.trim());
                        categories.forEach(cat => allSourceCategories.add(cat));
                    }
                });

                // Extract all unique primary categories
                const allPrimaryCategories = new Set();
                jsonData.forEach(row => {
                    if (row.primaryCategory) {
                        allPrimaryCategories.add(row.primaryCategory);
                    }
                });

                // For each source category, calculate metrics by year
                const categoryMetricsByYear = {};
                Array.from(allSourceCategories).forEach(category => {
                    categoryMetricsByYear[category] = {};

                    Object.keys(campaignsByYear).forEach(year => {
                        // Filter campaigns for this category and year
                        const categoryCampaigns = campaignsByYear[year].filter(campaign =>
                            campaign['Source Category'] &&
                            campaign['Source Category'].split(',').map(cat => cat.trim()).includes(category)
                        );

                        const totalRaised = categoryCampaigns.reduce((sum, campaign) => sum + (campaign['Amount Raised'] || 0), 0);
                        const totalTarget = categoryCampaigns.reduce((sum, campaign) => sum + (campaign['Target Amount'] || 0), 0);
                        const totalDonors = categoryCampaigns.reduce((sum, campaign) => sum + (campaign['Number of Donors'] || 0), 0);
                        const fundraisingEfficiency = totalTarget > 0 ? (totalRaised / totalTarget) * 100 : 0;

                        // 2. Target Success Rate
                        const campaignsMetTarget = categoryCampaigns.filter(campaign =>
                            (campaign['Amount Raised'] || 0) >= (campaign['Target Amount'] || 0)
                        ).length;
                        const targetSuccessRate = categoryCampaigns.length > 0 ? (campaignsMetTarget / categoryCampaigns.length) * 100 : 0;

                        categoryMetricsByYear[category][year] = {
                            campaigns: categoryCampaigns.length,
                            amountRaised: totalRaised,
                            targetAmount: totalTarget,
                            fundraisingEfficiency: fundraisingEfficiency,
                            campaignsMetTarget: campaignsMetTarget,
                            targetSuccessRate: targetSuccessRate,
                            donors: totalDonors
                        };
                    });
                });

                // For each primary category, calculate metrics by year
                const primaryCategoryMetricsByYear = {};
                Array.from(allPrimaryCategories).forEach(category => {
                    primaryCategoryMetricsByYear[category] = {};

                    Object.keys(campaignsByYear).forEach(year => {
                        // Filter campaigns for this primary category and year
                        const categoryCampaigns = campaignsByYear[year].filter(campaign =>
                            campaign.primaryCategory === category
                        );

                        const totalRaised = categoryCampaigns.reduce((sum, campaign) => sum + (campaign['Amount Raised'] || 0), 0);
                        const totalTarget = categoryCampaigns.reduce((sum, campaign) => sum + (campaign['Target Amount'] || 0), 0);
                        const totalDonors = categoryCampaigns.reduce((sum, campaign) => sum + (campaign['Number of Donors'] || 0), 0)
                        // Calculate metrics for primary categories
                        const fundraisingEfficiency = totalTarget > 0 ? (totalRaised / totalTarget) * 100 : 0;

                        const campaignsMetTarget = categoryCampaigns.filter(campaign =>
                            (campaign['Amount Raised'] || 0) >= (campaign['Target Amount'] || 0)
                        ).length;
                        const targetSuccessRate = categoryCampaigns.length > 0 ? (campaignsMetTarget / categoryCampaigns.length) * 100 : 0;

                        primaryCategoryMetricsByYear[category][year] = {
                            campaigns: categoryCampaigns.length,
                            amountRaised: totalRaised,
                            targetAmount: totalTarget,
                            fundraisingEfficiency: fundraisingEfficiency,
                            campaignsMetTarget: campaignsMetTarget,
                            targetSuccessRate: targetSuccessRate,
                            donors: totalDonors
                        };
                    });
                });

                // Format data for charts
                const overallMetricsData = Object.keys(yearlyMetrics).map(year => ({
                    Year: year,
                    Campaigns: yearlyMetrics[year].campaigns,
                    AmountRaised: yearlyMetrics[year].amountRaised,
                    TargetAmount: yearlyMetrics[year].targetAmount,
                    FundraisingEfficiency: yearlyMetrics[year].fundraisingEfficiency,
                    CampaignsMetTarget: yearlyMetrics[year].campaignsMetTarget,
                    TargetSuccessRate: yearlyMetrics[year].targetSuccessRate,
                    Donors: yearlyMetrics[year].donors
                }));

                const categoryMetricsData = [];
                Object.keys(categoryMetricsByYear).forEach(category => {
                    Object.keys(categoryMetricsByYear[category]).forEach(year => {
                        categoryMetricsData.push({
                            Category: category,
                            Year: year,
                            Campaigns: categoryMetricsByYear[category][year].campaigns,
                            AmountRaised: categoryMetricsByYear[category][year].amountRaised,
                            TargetAmount: categoryMetricsByYear[category][year].targetAmount,
                            FundraisingEfficiency: categoryMetricsByYear[category][year].fundraisingEfficiency,
                            CampaignsMetTarget: categoryMetricsByYear[category][year].campaignsMetTarget,
                            TargetSuccessRate: categoryMetricsByYear[category][year].targetSuccessRate,
                            Donors: categoryMetricsByYear[category][year].donors
                        });
                    });
                });

                // Format primary category metrics data
                const primaryCategoryMetricsData = [];
                Object.keys(primaryCategoryMetricsByYear).forEach(category => {
                    Object.keys(primaryCategoryMetricsByYear[category]).forEach(year => {
                        primaryCategoryMetricsData.push({
                            Category: category,
                            Year: year,
                            Campaigns: primaryCategoryMetricsByYear[category][year].campaigns,
                            AmountRaised: primaryCategoryMetricsByYear[category][year].amountRaised,
                            TargetAmount: primaryCategoryMetricsByYear[category][year].targetAmount,
                            FundraisingEfficiency: primaryCategoryMetricsByYear[category][year].fundraisingEfficiency,
                            CampaignsMetTarget: primaryCategoryMetricsByYear[category][year].campaignsMetTarget,
                            TargetSuccessRate: primaryCategoryMetricsByYear[category][year].targetSuccessRate,
                            Donors: primaryCategoryMetricsByYear[category][year].donors
                        });
                    });
                });

                // Sort the yearly comparison data based on the selected metric for 2023
                const yearlyComparisonData = Array.from(allSourceCategories).map(category => {
                    const result = { Category: category };
                    selectedYears.forEach(year => {
                        if (categoryMetricsByYear[category][year]) {
                            result[`Campaigns_${year}`] = categoryMetricsByYear[category][year].campaigns;
                            result[`AmountRaised_${year}`] = categoryMetricsByYear[category][year].amountRaised;
                            result[`TargetAmount_${year}`] = categoryMetricsByYear[category][year].targetAmount;
                            result[`FundraisingEfficiency_${year}`] = categoryMetricsByYear[category][year].fundraisingEfficiency;
                            result[`CampaignsMetTarget_${year}`] = categoryMetricsByYear[category][year].campaignsMetTarget;
                            result[`TargetSuccessRate_${year}`] = categoryMetricsByYear[category][year].targetSuccessRate;
                            result[`Donors_${year}`] = categoryMetricsByYear[category][year].donors;
                        } else {
                            result[`Campaigns_${year}`] = 0;
                            result[`AmountRaised_${year}`] = 0;
                            result[`TargetAmount_${year}`] = 0;
                            result[`FundraisingEfficiency_${year}`] = 0;
                            result[`CampaignsMetTarget_${year}`] = 0;
                            result[`TargetSuccessRate_${year}`] = 0;
                            result[`Donors_${year}`] = 0;
                        }
                    });
                    return result;
                });

                // Primary category yearly comparison data
                const primaryYearlyComparisonData = Array.from(allPrimaryCategories).map(category => {
                    const result = { Category: category };
                    selectedYears.forEach(year => {
                        if (primaryCategoryMetricsByYear[category][year]) {
                            result[`Campaigns_${year}`] = primaryCategoryMetricsByYear[category][year].campaigns;
                            result[`AmountRaised_${year}`] = primaryCategoryMetricsByYear[category][year].amountRaised;
                            result[`TargetAmount_${year}`] = primaryCategoryMetricsByYear[category][year].targetAmount;
                            result[`FundraisingEfficiency_${year}`] = primaryCategoryMetricsByYear[category][year].fundraisingEfficiency;
                            result[`CampaignsMetTarget_${year}`] = primaryCategoryMetricsByYear[category][year].campaignsMetTarget;
                            result[`TargetSuccessRate_${year}`] = primaryCategoryMetricsByYear[category][year].targetSuccessRate;
                            result[`Donors_${year}`] = primaryCategoryMetricsByYear[category][year].donors;
                        } else {
                            result[`Campaigns_${year}`] = 0;
                            result[`AmountRaised_${year}`] = 0;
                            result[`TargetAmount_${year}`] = 0;
                            result[`FundraisingEfficiency_${year}`] = 0;
                            result[`CampaignsMetTarget_${year}`] = 0;
                            result[`TargetSuccessRate_${year}`] = 0;
                            result[`Donors_${year}`] = 0;
                        }
                    });
                    return result;
                });

                setData({
                    loading: false,
                    yearlyMetrics: yearlyMetrics,
                    overallMetrics: overallMetricsData,
                    categoryMetrics: categoryMetricsData,
                    primaryCategoryMetrics: primaryCategoryMetricsData,
                    yearlyComparison: yearlyComparisonData,
                    primaryYearlyComparison: primaryYearlyComparisonData,
                    sourceCategories: Array.from(allSourceCategories),
                    primaryCategories: Array.from(allPrimaryCategories)
                });

                const monthlyData = processMonthlyDistribution(filteredJsonData);
                setMonthlyDistribution(monthlyData);

            } catch (error) {
                console.error("Error processing data:", error);
                setData(prev => ({ ...prev, loading: false, error: error.message }));
            }
        };

        processData();
    }, [selectedYears, showOnlyCompleted, removeOutliers, excludeGivingCircles]);

    // Filter for 2023 vs 2024 comparison
    const filteredOverallMetrics = data.overallMetrics.filter(
        item => selectedYears.includes(item.Year)
    );

    // Filter and sort the yearly comparison data
    let filteredYearlyComparison = data.yearlyComparison.filter(
        item => {
            return selectedYears.every(
                year => item[`${selectedMetric}_${year}`] > 0
            );
        }
    );

    // Sort by the selected metric for 2023
    if (selectedYears.includes('2023')) {
        filteredYearlyComparison.sort((a, b) => {
            // Sort by the selected metric values for 2023 in descending order
            return b[`${selectedMetric}_2023`] - a[`${selectedMetric}_2023`];
        });
    }

    // Filter and sort primary category data
    let filteredPrimaryYearlyComparison = data.primaryYearlyComparison.filter(
        item => {
            return selectedYears.every(
                year => item[`${selectedPrimaryMetric}_${year}`] > 0
            );
        }
    );

    // Sort by the selected metric for 2023
    if (selectedYears.includes('2023')) {
        filteredPrimaryYearlyComparison.sort((a, b) => {
            // Sort by the selected metric values for 2023 in descending order
            return b[`${selectedPrimaryMetric}_2023`] - a[`${selectedPrimaryMetric}_2023`];
        });
    }

    // Format numbers for display
    const formatAmount = (amount) => {
        return new Intl.NumberFormat('en-SG', {
            style: 'currency',
            currency: 'SGD',
            maximumFractionDigits: 0,
            minimumFractionDigits: 0
        }).format(amount);
    };

    const formatPercent = (value) => {
        return value.toFixed(0) + '%';
    };

    const getFilterSummary = () => {
        return (
            <span className="ms-2 fs-6 text-muted">
                {removeOutliers ? "(Excluding campaigns ≥ $1M)" : ""}
                {(removeOutliers && (showOnlyCompleted || excludeGivingCircles)) ? " | " : ""}
                {showOnlyCompleted ? "(Completed campaigns only)" : ""}
                {(showOnlyCompleted && excludeGivingCircles) ? " | " : ""}
                {excludeGivingCircles ? "(Excluding giving circles)" : ""}
            </span>
        );
    };
    const formatMonthlyDataForLineChart = () => {
        const months = [
            'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ];
    
        return months.map((month, index) => ({
            month: month, // Use 'month' property instead of 'Year'
            '2023': monthlyDistribution['2023'][index],
            '2024': monthlyDistribution['2024'][index]
        }));
    };

    if (data.loading) {
        return <div className="flex justify-center items-center h-64">Loading data...</div>;
    }

    if (data.error) {
        return (
            <div className="flex justify-center items-center h-64 flex-col">
                <div className="text-red-500 mb-4">Error loading data: {data.error}</div>
                <div>Using sample data instead</div>
            </div>
        );
    }

    return (
        <div className="container py-4">
            <h1 className="h2 text-center mb-4">Ray of Hope Crowdfunding Campaign Analysis</h1>
            <FilterControls
                showOnlyCompleted={showOnlyCompleted}
                setShowOnlyCompleted={setShowOnlyCompleted}
                removeOutliers={removeOutliers}
                setRemoveOutliers={setRemoveOutliers}
                excludeGivingCircles={excludeGivingCircles}
                setExcludeGivingCircles={setExcludeGivingCircles}
            />

            {/* Improved Metrics and Categories Explanation */}
            <div className="row mt-4">
                <div className="col-12">
                    <div className="card mb-4">
                        <div className="card-header bg-light">
                            <h3 className="h5 mb-0 text-center">
                                Understanding Metrics &amp; Categories
                            </h3>
                        </div>
                        <div className="card-body">
                            <div className="row">
                                {/* Metrics Column */}
                                <div className="col-md-6 mb-3 mb-md-0">
                                    <h4 className="h6 fw-bold text-primary">Key Metrics</h4>
                                    <div className="border-start ps-3 mb-3">
                                        <p className="mb-2"><strong>Target Success Rate:</strong> The percentage of campaigns that fully met or exceeded their target amount.</p>
                                        <p className="mb-0"><strong>Target Completion %:</strong> The ratio of total amount raised to total target amount, expressed as a percentage.</p>
                                    </div>
                                </div>

                                {/* Categories Column */}
                                <div className="col-md-6">
                                    <h4 className="h6 fw-bold text-primary">Category Types</h4>
                                    <div className="border-start ps-3">
                                        <p className="mb-2"><strong>Primary Category:</strong> The direct recipient/purpose of the funds (e.g., Chronic Illness, Children, Migrant Worker).</p>
                                        <p className="mb-0"><strong>Beneficiary Category:</strong> The groups or individuals who benefit either directly or indirectly from the campaign (e.g., children of direct recipient).</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
                <div className="h4 mb-4">Overall Campaign Metrics: 2023 vs 2024
                    {getFilterSummary()}
                </div>
                <div className="d-flex justify-content-center mb-4 mt-4">
                    <div className="card w-100">
                        <div className="card-body">
                            <MetricsTableD3
                                yearlyMetrics={data.yearlyMetrics}
                                selectedYears={selectedYears}
                                formatAmount={formatAmount}
                                formatPercent={formatPercent}
                            />
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* <D3BarChart
                        data={filteredOverallMetrics}
                        keys={['Campaigns', 'CampaignsMetTarget']}
                        colors={['#8884d8', '#FF8042']}
                        title="Campaign Counts"
                        yAxisLabel="Number of Campaigns"
                        barLabels={['Total Campaigns', 'Campaigns Met Target']}
                        valueFormat={(value) => value}
                    /> */}
                    <D3BarChart
                        data={filteredOverallMetrics}
                        keys={['FundraisingEfficiency', 'TargetSuccessRate']}
                        colors={['#82ca9d', '#FFBB28']}
                        title="Success Metrics (%)"
                        yAxisLabel="Percentage (%)"
                        barLabels={['Target Completion %', 'Target Success Rate']}
                        yFormat={(value) => value + '%'}
                        valueFormat={(value) => value + '%'}
                    />
                    <MonthlyTrendsLineChart
                        data={formatMonthlyDataForLineChart()}
                        title="Campaigns Started per Month"
                        xAxisLabel="Month"
                        yAxisLabel="Number of Campaigns"
                        colors={['#8884d8', '#82ca9d']}
                        yearKeys={['2023', '2024']}
                        valueFormat={(value) => value}
                    />
                </div>



                <UnifiedD3Analysis
                    title="Metrics by Beneficiary Category"
                    description="Year"
                    dataItems={data.sourceCategories}
                    itemKey="Category"
                    metricsData={data.categoryMetrics}
                    comparisonData={filteredYearlyComparison}
                    selectedYears={selectedYears}
                    selectedMetric={selectedMetric}
                    onMetricChange={setSelectedMetric}
                    formatAmount={formatAmount}
                    formatPercent={formatPercent}
                    priorityItems={[
                        'children-12-years-and-below',
                        'youth-from-13-to-21-years',
                        'mental-health'
                    ]}
                    maxBarItems={10}
                />

                <UnifiedD3Analysis
                    title="Metrics by Primary Category"
                    description="Year"
                    dataItems={data.primaryCategories}
                    itemKey="Category"
                    metricsData={data.primaryCategoryMetrics}
                    comparisonData={filteredPrimaryYearlyComparison}
                    selectedYears={selectedYears}
                    selectedMetric={selectedPrimaryMetric}
                    onMetricChange={setSelectedPrimaryMetric}
                    formatAmount={formatAmount}
                    formatPercent={formatPercent}
                    priorityItems={[
                        'Children (12 years and below)',
                        'Youth (from 13 to 21 years)',
                        'Mental Health',
                        'Families In Need'
                    ]}
                    maxBarItems={10}
                />
            </div>
        </div>
    );
};

export default RayOfHopeAnalysis;