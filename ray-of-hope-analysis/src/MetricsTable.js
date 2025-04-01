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

const MetricsTable = ({ yearlyMetrics, selectedYears, formatAmount, formatPercent }) => {
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

    return (
        <table className="table table-bordered">
            <thead className="table-light">
                <tr>
                    <th className="text-start" style={{ width: "25%" }}>Metric</th>
                    <th className="text-center" style={{ width: "25%" }}>{year1}</th>
                    <th className="text-center" style={{ width: "25%" }}>{year2}</th>
                    <th className="text-center" style={{ width: "25%" }}>Change</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td className="fw-medium">Total Campaigns</td>
                    <td className="text-center">{data1.campaigns?.toLocaleString()}</td>
                    <td className="text-center">{data2.campaigns?.toLocaleString()}</td>
                    <td className="text-center">
                        <PercentageChange value={calculatePercentageChange(data2.campaigns, data1.campaigns)} />
                    </td>
                </tr>
                <tr>
                    <td className="fw-medium">Campaigns with Target Met</td>
                    <td className="text-center">{data1.campaignsMetTarget?.toLocaleString()}</td>
                    <td className="text-center">{data2.campaignsMetTarget?.toLocaleString()}</td>
                    <td className="text-center">
                        <PercentageChange value={calculatePercentageChange(data2.campaignsMetTarget, data1.campaignsMetTarget)} />
                    </td>
                </tr>
                <tr>
                    <td className="fw-medium">Total Donors</td>
                    <td className="text-center">{data1.donors?.toLocaleString()}</td>
                    <td className="text-center">{data2.donors?.toLocaleString()}</td>
                    <td className="text-center">
                        <PercentageChange value={calculatePercentageChange(data2.donors, data1.donors)} />
                    </td>
                </tr>
                <tr>
                    <td className="fw-medium">Target Success Rate</td>
                    <td className="text-center">{formatPercent(data1.targetSuccessRate)}</td>
                    <td className="text-center">{formatPercent(data2.targetSuccessRate)}</td>
                    <td className="text-center">
                        <PercentageChange value={calculatePercentageChange(data2.targetSuccessRate, data1.targetSuccessRate)} />
                    </td>
                </tr>
                <tr>
                    <td className="fw-medium">Amount Raised</td>
                    <td className="text-center">{formatAmount(data1.amountRaised)}</td>
                    <td className="text-center">{formatAmount(data2.amountRaised)}</td>
                    <td className="text-center">
                        <PercentageChange value={calculatePercentageChange(data2.amountRaised, data1.amountRaised)} />
                    </td>
                </tr>
                <tr>
                    <td className="fw-medium">Target Amount</td>
                    <td className="text-center">{formatAmount(data1.targetAmount)}</td>
                    <td className="text-center">{formatAmount(data2.targetAmount)}</td>
                    <td className="text-center">
                        <PercentageChange value={calculatePercentageChange(data2.targetAmount, data1.targetAmount)} />
                    </td>
                </tr>
                <tr>
                    <td className="fw-medium">Target Completion %</td>
                    <td className="text-center">{formatPercent(data1.fundraisingEfficiency)}</td>
                    <td className="text-center">{formatPercent(data2.fundraisingEfficiency)}</td>
                    <td className="text-center">
                        <PercentageChange value={calculatePercentageChange(data2.fundraisingEfficiency, data1.fundraisingEfficiency)} />
                    </td>
                </tr>

                {/* Additional metrics */}
                <tr>
                    <td className="fw-medium">Average Donors per Campaign</td>
                    <td className="text-center">{avgDonorsPerCampaign1.toFixed(0)}</td>
                    <td className="text-center">{avgDonorsPerCampaign2.toFixed(0)}</td>
                    <td className="text-center">
                        <PercentageChange value={calculatePercentageChange(avgDonorsPerCampaign2, avgDonorsPerCampaign1)} />
                    </td>
                </tr>
                <tr>
                    <td className="fw-medium">Average Donated per Donor</td>
                    <td className="text-center">{formatAmount(avgDonatedPerDonor1)}</td>
                    <td className="text-center">{formatAmount(avgDonatedPerDonor2)}</td>
                    <td className="text-center">
                        <PercentageChange value={calculatePercentageChange(avgDonatedPerDonor2, avgDonatedPerDonor1)} />
                    </td>
                </tr>
                <tr>
                    <td className="fw-medium">Average Donated per Campaign</td>
                    <td className="text-center">{formatAmount(avgAmountPerCampaign1)}</td>
                    <td className="text-center">{formatAmount(avgAmountPerCampaign2)}</td>
                    <td className="text-center">
                        <PercentageChange value={calculatePercentageChange(avgAmountPerCampaign2, avgAmountPerCampaign1)} />
                    </td>
                </tr>
            </tbody>
        </table>
    );
};

export default MetricsTable;