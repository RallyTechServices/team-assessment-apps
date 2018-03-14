Ext.define('CArABU.teamassessmentapps.teamhealth.TeamHealthExporter',{
   singleton: true,

   exportAllData: function(storeData, usePoints){
     if (!storeData){
       return;
     }

    var cols = CArABU.teamassessmentapps.teamhealth.TeamHealthExporter.getExportColumnCfgs(usePoints);
    var data = [_.pluck(cols,'text').join(',')];

    //for each type, add export
    var sortedData = _.sortBy(storeData, function(d){
       return d.get('classification');
    });

     Ext.Array.each(sortedData, function(r){
       var row = [];

       Ext.Array.each(cols, function(c){
        var val = r.get(c.dataIndex);
           if (Ext.isObject(val)){
              val = val._refObjectName || val.Name;
           }
           if (!val || val < 0){
             val = '';
           }
         row.push(val);
       });
       data.push(row.join(','));
     });

     var csv = data.join('\r\n'),
        fileName = Ext.String.format('health-{0}.csv', Rally.util.DateTime.format(new Date(),'Y-m-d-h-i-s'));

     CATS.teamassessmentapps.utils.Toolbox.saveAs(csv,fileName);
   },
   getExportColumnCfgs: function(usePoints){

     var metric = usePoints ? 'Points' : 'Count';
     var cols = [{
          dataIndex: 'classification',
          text: 'Classification'
        },{
          dataIndex: 'domain',
          text: 'Domain'
        },{
          dataIndex: 'team',
          text: 'Team'
        },{
          dataIndex: '__totalWorkItems',
          text: 'Total Work Items'
        },{
          dataIndex: '__activeWorkItems',
          text: 'Active Work Items'
        },{
          dataIndex: '__lastUpdatedWorkItem',
          text: 'Last Updated Work Item'
        },{
          dataIndex: '__activeWorkItems',
          text: 'Active Work Items'
        },{
          dataIndex: '__activePortfolioItemCount',
          text: 'Active Portfolio Items'
        },{
          dataIndex: '__activeStoryCount',
          text: 'Active User Stories'
        },{
          dataIndex: '__activeDefectCount',
          text: 'Active Defects'
        },{
          dataIndex: '__activeTestCaseCount',
          text: 'Active Test Cases'
        },{
          dataIndex: '__activeTaskCount',
          text: 'Active Tasks'
        },{
          dataIndex: '__iteration',
          text: 'Iteration'
       }];

       if (usePoints){
         cols = cols.concat([{
               dataIndex: '__plannedVelocity',
               text: 'Iteration Planned Velocity'
             },{
               dataIndex: '__ratioEstimated',
               text: '% Items Estimated'
             },{
               dataIndex: '__planned',
               text: Ext.String.format("Actual Planned At Sprint Start ({0})", metric)
             },{
               dataIndex: '__currentPlanned',
               text: Ext.String.format("Current Planned ({0})", metric)
          },{
              dataIndex: '__velocity',
              text: Ext.String.format("Actual Accepted At Sprint End ({0})", metric)
          }]);

       } else {
         cols = cols.concat([{
             dataIndex: '__planned',
             text: Ext.String.format("Actual Planned At Sprint Start ({0})", metric)
           }, {
             dataIndex: '__currentPlanned',
             text: Ext.String.format("Current Planned ({0})", metric)
           },{
             dataIndex: '__velocity',
             text: Ext.String.format("Actual Accepted At Sprint End ({0})", metric),
           }]);
       }

       cols = cols.concat([{
             dataIndex: '__ratioInProgress',
             text: Ext.String.format("% Average Daily in Progress ({0})", metric)
           },{
             dataIndex: '__acceptedAtSprintEnd',
             text: Ext.String.format("% Accepted by Sprint End ({0})", metric)
           },{
           dataIndex: '__acceptedAfterSprintEnd',
           text: Ext.String.format("% Accepted after Sprint End ({0})", metric)
         },{
           dataIndex: '__addedScope',
           text: Ext.String.format("Added Scope ({0})", metric)
         },{
           dataIndex: '__removedScope',
           text: Ext.String.format("Removed Scope ({0})", metric)
         },{
           dataIndex: '__netChurn',
          text: Ext.String.format("Net Churn ({0})", metric)
        },{
          dataIndex: '__plannedLoad',
          text: 'Planning Load'
        }]);
       return cols;
   }


});
