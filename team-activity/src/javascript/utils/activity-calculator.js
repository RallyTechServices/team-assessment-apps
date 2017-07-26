Ext.define('CATS.teamassessmentapps.utils.ActivityCalculator',{

  // time from in-progress to accepted (stories and defects)
  // # stories/defects accepted in the past week (e.g. timebox)
  // test coverage (number of stories that have test cases) - current
  // configurable by iterations/release or custom timebox

   constructor: function(config){
      this.records = config.records,
      this.timebox = config.timebox || {};
      this.activeDays = config.activeDays;
   },
   _mungeTestCoverage:function(records){
      var tcHash =  this._getCountByValueHash(records, 'TestCaseStatus');
      //"NONE", "NONE_RUN", "SOME_RUN_NONE_PASSING", "SOME_RUN_SOME_NOT_PASSING", "SOME_RUN_ALL_PASSING", "ALL_RUN_NONE_PASSING", "ALL_RUN_SOME_NOT_PASSING", "ALL_RUN_ALL_PASSING"
      return {
         noTests: tcHash.NONE || 0,
         testsNotRun: tcHash.NONE_RUN || 0,
         testsFailed: tcHash.SOME_RUN_NONE_PASSING || 0 + tcHash.SOME_RUN_SOME_NOT_PASSING || 0 + tcHash.ALL_RUN_NONE_PASSING || 0 + tcHash.ALL_RUN_SOME_NOT_PASSING || 0,
         testsPassed: tcHash.ALL_RUN_ALL_PASSING || 0
      };


   },
   _getRecordsByProjectOidHash: function(records){
     var hash = {};

     for (var i=0; i<records.length; i++){
         var v = records[i].get('Project').Name;

          if (!hash[v]){
            hash[v] = [];
         }
         hash[v].push(records[i].getData());

     }
     return hash;
   },
   _getCountByValueHash: function(records, fieldName){
     var hash = {};
     for (var i=0; i<records.length; i++){
         var v = records[i][fieldName];
         if (v && v.length> 0){
             if (!hash[v]){
                hash[v] = 0;
             }
             hash[v]++;
          }
     }
     return hash;
   },
   _calculateCycleTime: function(records){
       var cycleTimes = [],
            cycleTimesAndEstimates = [];
       for (var i=0; i<records.length; i++){
          var ipDt = records[i].InProgressDate,
              acDt = records[i].AcceptedDate,
              est = records[i].PlanEstimate;

          if (ipDt && acDt){
              var diff = Rally.util.DateTime.getDifference(acDt, ipDt, 'second');
              diff = diff/86400
              cycleTimes.push(diff);
              cycleTimesAndEstimates.push([est,diff]);
          }
       }
       return Ext.Array.mean(cycleTimes);
   },
   _mungeDateInRange: function(records, fieldName, start, end){
     var inRange = 0;
     for (var i=0; i<records.length; i++){
         var dt = records[i][fieldName];
         if (this._isInRange(dt,start,end)){
           inRange++;
         }
     }
     return inRange;
   },
   _isInRange: function(dt, startDate, endDate){

      if (!dt){ return false; }

      if (isNaN(Date.parse(dt))) { return false; }

      var dt = new Date(dt);

      if ((dt <= endDate) && (dt >= startDate)){
          return true;
      }
      return false;

   },
   _calculateActiveItems: function(records){
      var date = Rally.util.DateTime.add(new Date(), 'day', -this.activeDays),
          active = 0;
      Ext.Array.each(records, function(r){
           if (r.LastUpdateDate >= date){
              active++;
           }
      });
      return active;
   },
   getData: function(){
        //Project Name, stories/defects accepted in the past timebox, avg cycletime, test coverage
        var projectHash = this._getRecordsByProjectOidHash(this.records),
            startDate = this.timebox.startDate,
            endDate = this.timebox.endDate,
            data = [];

        Ext.Object.each(projectHash, function(name, recs){

           var acceptedRecs = this._mungeDateInRange(recs, 'AcceptedDate', startDate, endDate),
               inProgressRecs = Ext.Array.filter(recs, function(r){ return r.InProgressDate && !r.AcceptedDate; });
               inProgressCount = this._mungeDateInRange(inProgressRecs, 'InProgressDate', startDate, endDate),
               avgCycleTime = this._calculateCycleTime(recs),
               tcHash = this._mungeTestCoverage(recs),
               activeRecords = this._calculateActiveItems(recs);

           var row = {
              projectName: name,
              totalRecords: recs.length,
              acceptedRecords: acceptedRecs,
              inProgressRecords: inProgressCount,
              averageCycleTime: avgCycleTime,
              activeRecords: activeRecords
           }

           row = Ext.Object.merge(row, tcHash);
           data.push(row);

        }, this);
        return data;
   }
});
