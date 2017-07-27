Ext.define('Rally.technicalservices.util.HealthRenderers',{
  singleton: true,

  red: '#ff9999',
  yellow: '#ffffcc',
  green: '#ccffcc',
  grey: '#e6e6e6',

  metrics: {
     '__ratioInProgress': {green: [0.1], yellow: [0.25], reversed: true},
     '__acceptedAfterSprintEndPoints': {green: [0.1], yellow: [0.25], reversed: true},
     '__acceptedAtSprintEndPoints': {green: [0.9,1.1], yellow: [0.75,1.25]},
     '__ratioEstimated': {green: [0.9,1.1], yellow: [0.75,1.25]},
     '__plannedPoints': {green: [0.9,1.1], yellow: [0.75,1.25]},
     '__addedScope': {green: [0.1], yellow: [0.25], reversed: true}

  },
  getCellColor: function(val, metricName){

    var range = Rally.technicalservices.util.HealthRenderers.metrics[metricName];
    if (!range){
       return Rally.technicalservices.util.HealthRenderers.grey;
    }

    if (range.reversed){
       if (val <= range.green[0]){ return Rally.technicalservices.util.HealthRenderers.green; }
       if (val <= range.yellow[0]){ return Rally.technicalservices.util.HealthRenderers.yellow; }
       return Rally.technicalservices.util.HealthRenderers.red;
    }

    var color = Rally.technicalservices.util.HealthRenderers.red;
    if (val > range.green[0] && val < range.green[1]){
      color = Rally.technicalservices.util.HealthRenderers.green;
    } else if (val > range.yellow[0] && val < range.yellow[1]) {
      color = Rally.technicalservices.util.HealthRenderers.yellow;
    }
    return color;
  }
});
