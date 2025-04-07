import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import FilterControls from './components/FilterControls';
import UnifiedD3Analysis from './components/UnifiedD3Analysis';

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

    // Combined state for loading and errors
    const [dataState, setDataState] = useState({
        loading: true,
        error: null
    });

    // Raw data storage
    const [rawData, setRawData] = useState({
        rayOfHope: [],
        g2c: []
    });

    // Selected years for comparison
    const years = ['2023', '2024'];

    // Selected metric for the chart - default is Target Success Rate
    const [selectedMetric, setSelectedMetric] = useState('TargetSuccessRate');
    const [showOnlyCompleted, setShowOnlyCompleted] = useState(false);
    const [removeOutliers, setRemoveOutliers] = useState(false);
    const [excludeGivingCircles, setExcludeGivingCircles] = useState(true);
    
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

    // First useEffect: Load raw data only once on component mount
    useEffect(() => {
        const fetchRawData = async () => {
            try {
                console.log("Fetching raw data for both platforms...");
                const rohRawData = await fetchRawRayOfHopeData();
                const g2cRawData = await fetchRawG2CData();
                
                setRawData({
                    rayOfHope: rohRawData,
                    g2c: g2cRawData
                });
                
                console.log("Raw data fetched successfully. ROH:", rohRawData.length, "items, G2C:", g2cRawData.length, "items");
            } catch (err) {
                console.error("Error loading raw data:", err);
                setDataState({
                    loading: false,
                    error: "Failed to load data. Please try again later."
                });
            }
        };

        fetchRawData();
    }, []); // Empty dependency array - run once on mount

    // Second useEffect: Process data when filters change or raw data becomes available
    useEffect(() => {
        const processData = async () => {
            try {
                // Only process if we have raw data
                if (rawData.rayOfHope.length === 0 || rawData.g2c.length === 0) {
                    // If we don't have raw data yet, keep the loading state
                    return;
                }
                
                console.log("Processing data with filters:", {
                    showOnlyCompleted,
                    removeOutliers,
                    excludeGivingCircles
                });

                const rohData = processRayOfHopeData(
                    rawData.rayOfHope,
                    showOnlyCompleted,
                    removeOutliers,
                    excludeGivingCircles
                );

                const g2cData = processG2CData(
                    rawData.g2c,
                    showOnlyCompleted,
                    removeOutliers
                );

                console.log("Processed ROH data:", rohData);
                console.log("Processed G2C data:", g2cData);

                setPlatformData({
                    'Ray of Hope (Children)': rohData,
                    'G2C': g2cData
                });

                setDataState({
                    loading: false,
                    error: null
                });
            } catch (err) {
                console.error("Error processing data:", err);
                setDataState({
                    loading: false,
                    error: "Failed to process data. Please try again later."
                });
            }
        };

        processData();
    }, [rawData, showOnlyCompleted, removeOutliers, excludeGivingCircles]);

    // Function to fetch raw Ray of Hope data
    const fetchRawRayOfHopeData = async () => {
        try {
            console.log("Loading Ray of Hope data via fetch API");
            const response = await fetch(`${process.env.PUBLIC_URL}/ray_of_hope_campaigns_detailed.xlsx`);
            const arrayBuffer = await response.arrayBuffer();
            const workbook = XLSX.read(new Uint8Array(arrayBuffer), { cellDates: true });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            console.log("Successfully loaded Ray of Hope data via fetch");
            return jsonData;
        } catch (fetchError) {
            console.error("Error fetching Ray of Hope data:", fetchError);
            throw new Error("Failed to load Ray of Hope data");
        }
    };

    // Function to fetch raw G2C data
    const fetchRawG2CData = async () => {
        try {
            console.log("Loading G2C data via fetch API");
            const response = await fetch(`${process.env.PUBLIC_URL}/G2C_campaigns.xlsx`);
            const arrayBuffer = await response.arrayBuffer();
            const workbook = XLSX.read(new Uint8Array(arrayBuffer), { cellDates: true });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            console.log("Successfully loaded G2C data via fetch");
            return jsonData;
        } catch (fetchError) {
            console.error("Error fetching G2C data:", fetchError);
            throw new Error("Failed to load G2C data");
        }
    };

    // Function to process Ray of Hope data with filters
    const processRayOfHopeData = (jsonData, showOnlyCompleted = false, removeOutliers = false, excludeGivingCircles = true) => {
        try {
            if (!jsonData || jsonData.length === 0) {
                return { '2023': null, '2024': null };
            }

            let filteredData = [...jsonData]; // Create a copy to avoid modifying original

            if (showOnlyCompleted) {
                filteredData = filteredData.filter(campaign => campaign["Days to Go"] === 0);
            }

            if (removeOutliers) {
                filteredData = filteredData.filter(campaign => (campaign["Target Amount"] || 0) < 1000000);
            }

            if (excludeGivingCircles) {
                filteredData = filteredData.filter(campaign => {
                    if (!campaign["Source Category"]) return true;
                    return !campaign["Source Category"].toLowerCase().includes('giving-circles');
                });
            }

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
            filteredData.forEach(campaign => {
                // Check if this is a children's campaign
                if (campaign["Source Category"]) {
                    // Split the Source Category by commas and trim each category
                    const categories = campaign["Source Category"].split(',').map(cat => cat.trim());

                    // Check if "children-12-years-and-below" is one of the categories
                    if (categories.includes("children-12-years-and-below")) {
                        const year = getYearFromDate(campaign["Start Date"]);

                        if (year && (year === '2023' || year === '2024')) {
                            aggregatedData[year].Campaigns++;

                            if (campaign["Completion Percentage"] >= 100) {
                                aggregatedData[year].CampaignsMetTarget++;
                            }
                            aggregatedData[year].AmountRaised += campaign["Amount Raised"] || 0;
                            aggregatedData[year].TargetAmount += campaign["Target Amount"] || 0;
                            aggregatedData[year].Donors += campaign["Number of Donors"] || 0;
                        }
                    }
                }
            });

            const result = {};

            Object.keys(aggregatedData).forEach(year => {
                const yearData = aggregatedData[year];

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

    // Function to process G2C data with filters
    const processG2CData = (jsonData, showOnlyCompleted = false, removeOutliers = false) => {
        try {
            if (!jsonData || jsonData.length === 0) {
                return { '2023': null, '2024': null };
            }

            let filteredData = [...jsonData]; // Create a copy to avoid modifying original

            if (showOnlyCompleted) {
                filteredData = filteredData.filter(campaign => {
                    // Adjust these conditions based on G2C's data structure
                    return campaign["Status"] === "Completed" ||
                        campaign["Days Remaining"] === 0 ||
                        (campaign["Percentage Completion"] && campaign["Percentage Completion"] >= 100);
                });
            }

            if (removeOutliers) {
                filteredData = filteredData.filter(campaign => (campaign["Target Amount"] || 0) < 1000000);
            }

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

            filteredData.forEach(campaign => {
                const year = getYearFromDate(campaign["Start Date"]);

                if (year && (year === '2023' || year === '2024')) {
                    aggregatedData[year].Campaigns++;

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

    const transformPlatformData = () => {
        // Transform platform data for the metricsData format
        const metricsData = [];

        Object.keys(platformData).forEach(platform => {
            Object.keys(platformData[platform]).forEach(year => {
                if (platformData[platform][year]) {
                    metricsData.push({
                        Category: platform, // Using "Category" as the itemKey for consistency
                        Year: year,
                        Campaigns: platformData[platform][year].Campaigns || 0,
                        CampaignsMetTarget: platformData[platform][year].CampaignsMetTarget || 0,
                        AmountRaised: platformData[platform][year].AmountRaised || 0,
                        TargetAmount: platformData[platform][year].TargetAmount || 0,
                        Donors: platformData[platform][year].Donors || 0,
                        FundraisingEfficiency: platformData[platform][year].FundraisingEfficiency || 0,
                        TargetSuccessRate: platformData[platform][year].TargetSuccessRate || 0,
                        AvgDonorsPerCampaign: platformData[platform][year].AvgDonorsPerCampaign || 0,
                        AvgAmountPerDonor: platformData[platform][year].AvgAmountPerDonor || 0,
                        AvgAmountPerCampaign: platformData[platform][year].AvgAmountPerCampaign || 0
                    });
                }
            });
        });

        // Transform platform data for the comparisonData format
        const comparisonData = Object.keys(platformData).map(platform => {
            const result = { Category: platform }; // Using "Category" as the itemKey

            years.forEach(year => {
                if (platformData[platform][year]) {
                    result[`Campaigns_${year}`] = platformData[platform][year].Campaigns || 0;
                    result[`CampaignsMetTarget_${year}`] = platformData[platform][year].CampaignsMetTarget || 0;
                    result[`AmountRaised_${year}`] = platformData[platform][year].AmountRaised || 0;
                    result[`TargetAmount_${year}`] = platformData[platform][year].TargetAmount || 0;
                    result[`Donors_${year}`] = platformData[platform][year].Donors || 0;
                    result[`FundraisingEfficiency_${year}`] = platformData[platform][year].FundraisingEfficiency || 0;
                    result[`TargetSuccessRate_${year}`] = platformData[platform][year].TargetSuccessRate || 0;
                    result[`AvgDonorsPerCampaign_${year}`] = platformData[platform][year].AvgDonorsPerCampaign || 0;
                    result[`AvgAmountPerDonor_${year}`] = platformData[platform][year].AvgAmountPerDonor || 0;
                    result[`AvgAmountPerCampaign_${year}`] = platformData[platform][year].AvgAmountPerCampaign || 0;
                } else {
                    // Set default values if data doesn't exist for this year
                    result[`Campaigns_${year}`] = 0;
                    result[`CampaignsMetTarget_${year}`] = 0;
                    result[`AmountRaised_${year}`] = 0;
                    result[`TargetAmount_${year}`] = 0;
                    result[`Donors_${year}`] = 0;
                    result[`FundraisingEfficiency_${year}`] = 0;
                    result[`TargetSuccessRate_${year}`] = 0;
                    result[`AvgDonorsPerCampaign_${year}`] = 0;
                    result[`AvgAmountPerDonor_${year}`] = 0;
                    result[`AvgAmountPerCampaign_${year}`] = 0;
                }
            });

            return result;
        });

        return { metricsData, comparisonData };
    };
    
    const metricOptions = [
        { key: 'TargetSuccessRate', label: 'Target Success Rate (%)' },
        { key: 'FundraisingEfficiency', label: 'Target Completion (%)' },
        { key: 'Campaigns', label: 'Number of Campaigns' },
        { key: 'CampaignsMetTarget', label: 'Campaigns with Target Met' },
        { key: 'Donors', label: 'Total Donors' },
        { key: 'AmountRaised', label: 'Amount Raised' },
        { key: 'TargetAmount', label: 'Target Amount' },
        { key: 'AvgDonorsPerCampaign', label: 'Avg Donors per Campaign' },
        { key: 'AvgAmountPerDonor', label: 'Avg Amount per Donor' },
        { key: 'AvgAmountPerCampaign', label: 'Avg Amount per Campaign' }
    ];
    
    const { metricsData, comparisonData } = transformPlatformData();
    
    // Render loading state
    if (dataState.loading) {
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
    if (dataState.error) {
        return (
            <div className="alert alert-danger m-4" role="alert">
                <h4 className="alert-heading">Error Loading Data</h4>
                <p>{dataState.error}</p>
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
            <FilterControls
                showOnlyCompleted={showOnlyCompleted}
                setShowOnlyCompleted={setShowOnlyCompleted}
                removeOutliers={removeOutliers}
                setRemoveOutliers={setRemoveOutliers}
                excludeGivingCircles={excludeGivingCircles}
                setExcludeGivingCircles={setExcludeGivingCircles}
                // If G2C doesn't have giving circles, you can hide that filter
                showGivingCirclesFilter={false}
            />

            <UnifiedD3Analysis
                title="Platform Comparison"
                description="Platform"
                dataItems={Object.keys(platformData)}
                itemKey="Category" // Using "Category" for consistency
                metricsData={metricsData}
                comparisonData={comparisonData}
                selectedYears={years}
                selectedMetric={selectedMetric}
                onMetricChange={setSelectedMetric}
                formatAmount={formatAmount}
                formatPercent={formatPercent}
                metricOptions={metricOptions}
                chartHeight={500}
                priorityItems={[]}
                groupByYear={true} // Set to true to group by year first
            />
        </div>
    );
};

export default PlatformComparison;