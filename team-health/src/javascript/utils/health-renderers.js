Ext.define('Rally.technicalservices.util.HealthRenderers',{
  singleton: true,

  red: '#ff9999',
  yellow: '#ffffcc',
  green: '#ccffcc',
  grey: '#e6e6e6',

  metrics: {
     '__ratioInProgress': {green: 0, yellow: 0, reversed: true},
     '__acceptedAfterSprintEnd': {green: 0, yellow: 0, reversed: true},
     '__acceptedAtSprintEnd': {green: 0, yellow: 0},
     '__ratioEstimated': {green: 0, yellow: 0},
     '__planned': {green: 0, yellow: 0},
     '__currentPlanned': {green: 0, yellow: 0},
     '__velocity': {green: 0, yellow: 0},
     '__addedScope': {green: 0, yellow: 0, reversed: true},
     '__removedScope': {green: 0, yellow: 0, reversed: true}
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
