Ext.define('Rally.technicalservices.util.HealthRenderers',{
  singleton: true,

  red: '#ff0000', //'#ff9999',
  yellow: '#ffff00',
  green: '#00ff00',
  grey: '#e6e6e6',

  tooltips: {
    '__totalWorkItems': "Total number of artifacts (Portfolio Items, User Stories, Defects, Tasks, Test Cases, Test Sets, Defect Suites) in the project.",
    '__activeWorkItems': "Number of work items created or updated within the active window specified in app settings.",
    '__ratioInProgress': '% Average Daily In Progress: This is the average of the ratio of points (or count) in an In Progress state versus the total points for each day during the course of the iteration. This is calculated using Iteration Cumulative Flow Data.',
    '__acceptedAfterSprintEnd': 'Actual Accepted After Sprint End: The sum of Points or Count accepted after the sprint ended.',
    '__acceptedAtSprintEnd': 'Actual Accepted: The actual sum of Points (or Count) accepted as of the last day of the iteration. This number comes from the cumulative flow data from the last day of the iteration.',
    '__ratioEstimated': 'Ratio of Work Items estimated for the Iteration.',
    '__plannedVelocity': 'Iteration Planned Velocity: The planned velocity set on the Iteration',
    '__planned': 'Actual Planned at Sprint Start: The actual sum of Points (or Count) planned into the iteration. This number comes from the cumulative flow data from the first day of the iteration.',
    '__currentPlanned': 'Current Planned: The sum of Points (or Count) associated with the iteration currently. This number will be different from the Actual Planned becuase it represents the current number of points associated with the iteration. If stories were added or removed from the iteration after the first day, this will include those.',
    '__velocity': 'Iteration Planned Velocity: The planned velocity set on the Iteration',
    '__addedScope': 'Added Scope: This is the sum of points (or count) added each day over the course of the iteration. Note that the net scope change for the iteration should be represented by subtracting Removed Scope from Added Scope. This is calculated using Iteration Cumulative Flow Data.',
    '__removedScope': 'Removed Scope: This is the sum of points (or count) removed each day over the course of the iteration. Note that the net scope change for the iteration should be represented by subtracting Removed Scope from Added Scope. This is calculated using Iteration Cumulative Flow Data.',
    '__netChurn': 'Net Churn is the absolute value of the Added Scope - Removed Scope / Actual Planned at Iteration Start.',
    '__plannedLoad': 'Planned Load is the Actual Planned at Sprint Start / Iteration Planned Velocity'
  },


  metrics: {
     '__ratioInProgress': {green: 0, yellow: 0, reversed: true},
     '__acceptedAfterSprintEnd': {green: 0, yellow: 0, reversed: true},
     '__acceptedAtSprintEnd': {green: 0, yellow: 0},
     '__ratioEstimated': {green: 0, yellow: 0},
     '__planned': {green: 0, yellow: 0},
     '__currentPlanned': {green: 0, yellow: 0},
     '__velocity': {green: 0, yellow: 0},
     '__addedScope': {green: 0, yellow: 0, reversed: true},
     '__removedScope': {green: 0, yellow: 0, reversed: true},
     '__netChurn': {green: 0, yellow: 0, reversed: true},
     '__plannedLoad': {green: 0, yellow: 0}
  },
  getTooltip: function(metricName){
      return Rally.technicalservices.util.HealthRenderers.tooltips[metricName] || 'No tooltip';
  },
  getCellColor: function(val, metricName){

    var range = Rally.technicalservices.util.HealthRenderers.metrics[metricName];
    if (!range){
       return Rally.technicalservices.util.HealthRenderers.grey;
    }

    val = val * 100;

    if (range.reversed){
       if (val <= range.green){ return Rally.technicalservices.util.HealthRenderers.green; }
       if (val <= range.yellow){ return Rally.technicalservices.util.HealthRenderers.yellow; }
       return Rally.technicalservices.util.HealthRenderers.red;
    }

    var color = Rally.technicalservices.util.HealthRenderers.red;
    var upperGreen = 100 + (100 - range.green),
    upperYellow = 100 + (100 - range.yellow);
    if (val > range.green && val < upperGreen){
      color = Rally.technicalservices.util.HealthRenderers.green;
    } else if (val > range.yellow && val < upperYellow) {
      color = Rally.technicalservices.util.HealthRenderers.yellow;
    }
    return color;
  }
});
