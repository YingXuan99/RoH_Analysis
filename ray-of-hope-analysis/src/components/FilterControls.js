import React from 'react';

const FilterControls = ({
    // Filter state values
    showOnlyCompleted,
    setShowOnlyCompleted,
    removeOutliers,
    setRemoveOutliers,
    excludeGivingCircles,
    setExcludeGivingCircles,

    // Optional props
    showCompletedFilter = true,
    showOutliersFilter = true,
    showGivingCirclesFilter = true,

    // Additional custom filters
    additionalFilters = null
}) => {
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

    return (
        <>
            <div className="row mt-4">
                <div className="col-12">
                    {/* Filters explanation */}
                    <div className="card mb-3">
                        <div className="card-body">
                            <h3 className="h5 mb-3">Dashboard Filters</h3>
                            <ul className="list-group list-group-flush">
                                {showCompletedFilter && (
                                    <li className="list-group-item"><strong>Completed Campaigns Toggle</strong>: Show only campaigns that have reached their end date (Days to Go = 0).</li>
                                )}
                                {showOutliersFilter && (
                                    <li className="list-group-item"><strong>Remove Outliers Toggle</strong>: Exclude campaigns with target amounts of $1 million or more from the analysis.</li>
                                )}
                                {showGivingCirclesFilter && (
                                    <li className="list-group-item"><strong>Exclude Giving Circles Toggle</strong>: Remove giving circles from the analysis as they remain perpetually open and can receive donations regardless of start date.</li>
                                )}
                                {/* Render any additional filter explanations */}
                                {additionalFilters?.explanations}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            <div className="d-flex flex-wrap justify-content-center gap-4 mb-4">
                {showCompletedFilter && (
                    <button
                        className={`btn ${showOnlyCompleted ? 'btn-primary' : 'btn-outline-secondary'} d-flex align-items-center`}
                        onClick={() => setShowOnlyCompleted(!showOnlyCompleted)}
                    >
                        <span className="me-2">
                            {showOnlyCompleted ? '✓' : ''}
                        </span>
                        {showOnlyCompleted ? "Showing only completed campaigns" : "Showing all campaigns"}
                    </button>
                )}

                {showOutliersFilter && (
                    <button
                        className={`btn ${removeOutliers ? 'btn-primary' : 'btn-outline-secondary'} d-flex align-items-center`}
                        onClick={() => setRemoveOutliers(!removeOutliers)}
                    >
                        <span className="me-2">
                            {removeOutliers ? '✓' : ''}
                        </span>
                        {removeOutliers ? "Excluding campaigns ≥ $1M" : "Including all campaign targets"}
                    </button>
                )}

                {showGivingCirclesFilter && (
                    <button
                        className={`btn ${excludeGivingCircles ? 'btn-primary' : 'btn-outline-secondary'} d-flex align-items-center`}
                        onClick={() => setExcludeGivingCircles(!excludeGivingCircles)}
                    >
                        <span className="me-2">
                            {excludeGivingCircles ? '✓' : ''}
                        </span>
                        {excludeGivingCircles ? "Excluding giving circles" : "Including giving circles"}
                    </button>
                )}

                {/* Render any additional filter buttons */}
                {additionalFilters?.buttons}
            </div>
        </>
    );
};

export default FilterControls;