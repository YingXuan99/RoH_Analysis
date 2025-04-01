import React from 'react';

// Component to display colored percentage change
const PercentageChange = ({ value, suffix = '%' }) => {
    // Determine if positive (green) or negative (red)
    const isPositive = value > 0;
    const color = isPositive ? 'green' : (value < 0 ? 'red' : 'inherit');

    // Format with + sign for positive values
    const formattedValue = `${isPositive ? '+' : ''}${value.toFixed(0)}${suffix}`;

    return (
        <span style={{ color, fontWeight: 'normal' }}>
            {formattedValue}
        </span>
    );
};

const MetricsTableD3 = ({ yearlyMetrics, selectedYears, formatAmount, formatPercent }) => {
    // We expect selectedYears to be an array like ['2023', '2024']
    // For simplicity, we'll assume there are exactly 2 years being compared
    const [year1, year2] = selectedYears;

    // Function to calculate percentage change
    const calculatePercentageChange = (current, previous) => {
        if (previous === 0) return 0; // Avoid division by zero
        return ((current - previous) / previous) * 100;
    };

    // Calculate additional metrics
    const data1 = yearlyMetrics[year1] || {};
    const data2 = yearlyMetrics[year2] || {};

    // Calculate derived metrics
    const avgDonorsPerCampaign1 = data1.donors / data1.campaigns || 0;
    const avgDonorsPerCampaign2 = data2.donors / data2.campaigns || 0;

    const avgDonatedPerDonor1 = data1.donors ? data1.amountRaised / data1.donors : 0;
    const avgDonatedPerDonor2 = data2.donors ? data2.amountRaised / data2.donors : 0;

    const avgAmountPerCampaign1 = data1.amountRaised / data1.campaigns || 0;
    const avgAmountPerCampaign2 = data2.amountRaised / data2.campaigns || 0;

    // Enhanced styling for the D3 version
    const tableStyles = {
        table: {
            width: '100%',
            borderCollapse: 'separate',
            borderSpacing: 0,
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        },
        thead: {
            backgroundColor: '#f8f9fa',
            borderBottom: '2px solid #dee2e6'
        },
        th: {
            padding: '12px 15px',
            fontWeight: 'bold',
            textAlign: 'center',
            borderBottom: '1px solid #dee2e6'
        },
        thTitle: {
            textAlign: 'left'
        },
        td: {
            padding: '10px 15px',
            borderBottom: '1px solid #e9ecef',
            textAlign: 'center'
        },
        tdTitle: {
            fontWeight: '500',
            textAlign: 'left',
            borderLeft: '4px solid #6c757d',
            paddingLeft: '12px'
        },
        highlight: {
            backgroundColor: '#f8f9fa'
        }
    };

    return (
        <table style={tableStyles.table}>
            <thead style={tableStyles.thead}>
                <tr>
                    <th style={{...tableStyles.th, ...tableStyles.thTitle, width: "25%"}}>Metric</th>
                    <th style={tableStyles.th}>{year1}</th>
                    <th style={tableStyles.th}>{year2}</th>
                    <th style={tableStyles.th}>Change</th>
                </tr>
            </thead>
            <tbody>
                {/* Campaign metrics section */}
                <tr style={tableStyles.highlight}>
                    <td colSpan="4" style={{...tableStyles.td, fontWeight: 'bold', backgroundColor: '#e9ecef'}}>Campaign Metrics</td>
                </tr>
                <tr>
                    <td style={{...tableStyles.td, ...tableStyles.tdTitle}}>Total Campaigns</td>
                    <td style={tableStyles.td}>{data1.campaigns?.toLocaleString()}</td>
                    <td style={tableStyles.td}>{data2.campaigns?.toLocaleString()}</td>
                    <td style={tableStyles.td}>
                        <PercentageChange value={calculatePercentageChange(data2.campaigns, data1.campaigns)} />
                    </td>
                </tr>
                <tr>
                    <td style={{...tableStyles.td, ...tableStyles.tdTitle}}>Campaigns with Target Met</td>
                    <td style={tableStyles.td}>{data1.campaignsMetTarget?.toLocaleString()}</td>
                    <td style={tableStyles.td}>{data2.campaignsMetTarget?.toLocaleString()}</td>
                    <td style={tableStyles.td}>
                        <PercentageChange value={calculatePercentageChange(data2.campaignsMetTarget, data1.campaignsMetTarget)} />
                    </td>
                </tr>
                <tr>
                    <td style={{...tableStyles.td, ...tableStyles.tdTitle}}>Target Success Rate</td>
                    <td style={tableStyles.td}>{formatPercent(data1.targetSuccessRate)}</td>
                    <td style={tableStyles.td}>{formatPercent(data2.targetSuccessRate)}</td>
                    <td style={tableStyles.td}>
                        <PercentageChange value={calculatePercentageChange(data2.targetSuccessRate, data1.targetSuccessRate)} />
                    </td>
                </tr>

                {/* Financial metrics section */}
                <tr style={tableStyles.highlight}>
                    <td colSpan="4" style={{...tableStyles.td, fontWeight: 'bold', backgroundColor: '#e9ecef'}}>Financial Metrics</td>
                </tr>
                <tr>
                    <td style={{...tableStyles.td, ...tableStyles.tdTitle}}>Amount Raised</td>
                    <td style={tableStyles.td}>{formatAmount(data1.amountRaised)}</td>
                    <td style={tableStyles.td}>{formatAmount(data2.amountRaised)}</td>
                    <td style={tableStyles.td}>
                        <PercentageChange value={calculatePercentageChange(data2.amountRaised, data1.amountRaised)} />
                    </td>
                </tr>
                <tr>
                    <td style={{...tableStyles.td, ...tableStyles.tdTitle}}>Target Amount</td>
                    <td style={tableStyles.td}>{formatAmount(data1.targetAmount)}</td>
                    <td style={tableStyles.td}>{formatAmount(data2.targetAmount)}</td>
                    <td style={tableStyles.td}>
                        <PercentageChange value={calculatePercentageChange(data2.targetAmount, data1.targetAmount)} />
                    </td>
                </tr>
                <tr>
                    <td style={{...tableStyles.td, ...tableStyles.tdTitle}}>Target Completion %</td>
                    <td style={tableStyles.td}>{formatPercent(data1.fundraisingEfficiency)}</td>
                    <td style={tableStyles.td}>{formatPercent(data2.fundraisingEfficiency)}</td>
                    <td style={tableStyles.td}>
                        <PercentageChange value={calculatePercentageChange(data2.fundraisingEfficiency, data1.fundraisingEfficiency)} />
                    </td>
                </tr>

                {/* Donor metrics section */}
                <tr style={tableStyles.highlight}>
                    <td colSpan="4" style={{...tableStyles.td, fontWeight: 'bold', backgroundColor: '#e9ecef'}}>Donor Metrics</td>
                </tr>
                <tr>
                    <td style={{...tableStyles.td, ...tableStyles.tdTitle}}>Total Donors</td>
                    <td style={tableStyles.td}>{data1.donors?.toLocaleString()}</td>
                    <td style={tableStyles.td}>{data2.donors?.toLocaleString()}</td>
                    <td style={tableStyles.td}>
                        <PercentageChange value={calculatePercentageChange(data2.donors, data1.donors)} />
                    </td>
                </tr>
                <tr>
                    <td style={{...tableStyles.td, ...tableStyles.tdTitle}}>Average Donors per Campaign</td>
                    <td style={tableStyles.td}>{avgDonorsPerCampaign1.toFixed(0)}</td>
                    <td style={tableStyles.td}>{avgDonorsPerCampaign2.toFixed(0)}</td>
                    <td style={tableStyles.td}>
                        <PercentageChange value={calculatePercentageChange(avgDonorsPerCampaign2, avgDonorsPerCampaign1)} />
                    </td>
                </tr>
                <tr>
                    <td style={{...tableStyles.td, ...tableStyles.tdTitle}}>Average Donated per Donor</td>
                    <td style={tableStyles.td}>{formatAmount(avgDonatedPerDonor1)}</td>
                    <td style={tableStyles.td}>{formatAmount(avgDonatedPerDonor2)}</td>
                    <td style={tableStyles.td}>
                        <PercentageChange value={calculatePercentageChange(avgDonatedPerDonor2, avgDonatedPerDonor1)} />
                    </td>
                </tr>
                <tr>
                    <td style={{...tableStyles.td, ...tableStyles.tdTitle}}>Average Donated per Campaign</td>
                    <td style={tableStyles.td}>{formatAmount(avgAmountPerCampaign1)}</td>
                    <td style={tableStyles.td}>{formatAmount(avgAmountPerCampaign2)}</td>
                    <td style={tableStyles.td}>
                        <PercentageChange value={calculatePercentageChange(avgAmountPerCampaign2, avgAmountPerCampaign1)} />
                    </td>
                </tr>
            </tbody>
        </table>
    );
};

export default MetricsTableD3;