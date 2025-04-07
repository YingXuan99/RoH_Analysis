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
        <div className="table-responsive">
            <table className="table table-bordered table-hover">
                <thead className="table-light">
                    <tr>
                        <th className="text-Center" style={{ width: "25%" }}>Metric</th>
                        <th className="text-center">{year1}</th>
                        <th className="text-center">{year2}</th>
                        <th className="text-center">Change</th>
                    </tr>
                </thead>
                <tbody>
                    {/* Campaign metrics section */}
                    <tr className="table-secondary">
                        <td colSpan="4" className="fw-bold text-center">Campaign Metrics</td>
                    </tr>
                    <tr>
                        <td className="text-start fw-medium ps-3">Total Campaigns</td>
                        <td className="text-center">{data1.campaigns?.toLocaleString()}</td>
                        <td className="text-center">{data2.campaigns?.toLocaleString()}</td>
                        <td className="text-center">
                            <PercentageChange value={calculatePercentageChange(data2.campaigns, data1.campaigns)} />
                        </td>
                    </tr>
                    <tr>
                        <td className="text-start fw-medium ps-3">Campaigns with Target Met</td>
                        <td className="text-center">{data1.campaignsMetTarget?.toLocaleString()}</td>
                        <td className="text-center">{data2.campaignsMetTarget?.toLocaleString()}</td>
                        <td className="text-center">
                            <PercentageChange value={calculatePercentageChange(data2.campaignsMetTarget, data1.campaignsMetTarget)} />
                        </td>
                    </tr>
                    <tr>
                        <td className="text-start fw-medium ps-3">Target Success Rate</td>
                        <td className="text-center">{formatPercent(data1.targetSuccessRate)}</td>
                        <td className="text-center">{formatPercent(data2.targetSuccessRate)}</td>
                        <td className="text-center">
                            <PercentageChange value={calculatePercentageChange(data2.targetSuccessRate, data1.targetSuccessRate)} />
                        </td>
                    </tr>

                    {/* Financial metrics section */}
                    <tr className="table-secondary">
                        <td colSpan="4" className="fw-bold text-center">Financial Metrics</td>
                    </tr>
                    <tr>
                        <td className="text-start fw-medium ps-3">Amount Raised</td>
                        <td className="text-center">{formatAmount(data1.amountRaised)}</td>
                        <td className="text-center">{formatAmount(data2.amountRaised)}</td>
                        <td className="text-center">
                            <PercentageChange value={calculatePercentageChange(data2.amountRaised, data1.amountRaised)} />
                        </td>
                    </tr>
                    <tr>
                        <td className="text-start fw-medium ps-3">Target Amount</td>
                        <td className="text-center">{formatAmount(data1.targetAmount)}</td>
                        <td className="text-center">{formatAmount(data2.targetAmount)}</td>
                        <td className="text-center">
                            <PercentageChange value={calculatePercentageChange(data2.targetAmount, data1.targetAmount)} />
                        </td>
                    </tr>
                    <tr>
                        <td className="text-start fw-medium ps-3">Target Completion %</td>
                        <td className="text-center">{formatPercent(data1.fundraisingEfficiency)}</td>
                        <td className="text-center">{formatPercent(data2.fundraisingEfficiency)}</td>
                        <td className="text-center">
                            <PercentageChange value={calculatePercentageChange(data2.fundraisingEfficiency, data1.fundraisingEfficiency)} />
                        </td>
                    </tr>

                    {/* Donor metrics section */}
                    <tr className="table-secondary">
                        <td colSpan="4" className="fw-bold text-center">Donor Metrics</td>
                    </tr>
                    <tr>
                        <td className="text-start fw-medium ps-3">Total Donors</td>
                        <td className="text-center">{data1.donors?.toLocaleString()}</td>
                        <td className="text-center">{data2.donors?.toLocaleString()}</td>
                        <td className="text-center">
                            <PercentageChange value={calculatePercentageChange(data2.donors, data1.donors)} />
                        </td>
                    </tr>
                    <tr>
                        <td className="text-start fw-medium ps-3">Average Donors per Campaign</td>
                        <td className="text-center">{avgDonorsPerCampaign1.toFixed(0)}</td>
                        <td className="text-center">{avgDonorsPerCampaign2.toFixed(0)}</td>
                        <td className="text-center">
                            <PercentageChange value={calculatePercentageChange(avgDonorsPerCampaign2, avgDonorsPerCampaign1)} />
                        </td>
                    </tr>
                    <tr>
                        <td className="text-start fw-medium ps-3">Average Donated per Donor</td>
                        <td className="text-center">{formatAmount(avgDonatedPerDonor1)}</td>
                        <td className="text-center">{formatAmount(avgDonatedPerDonor2)}</td>
                        <td className="text-center">
                            <PercentageChange value={calculatePercentageChange(avgDonatedPerDonor2, avgDonatedPerDonor1)} />
                        </td>
                    </tr>
                    <tr>
                        <td className="text-start fw-medium ps-3">Average Donated per Campaign</td>
                        <td className="text-center">{formatAmount(avgAmountPerCampaign1)}</td>
                        <td className="text-center">{formatAmount(avgAmountPerCampaign2)}</td>
                        <td className="text-center">
                            <PercentageChange value={calculatePercentageChange(avgAmountPerCampaign2, avgAmountPerCampaign1)} />
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
};

export default MetricsTableD3;