Ext.define('CArABU.teamassessmentapps.teamhealth.ScrumGrid',{
   extend: 'CArABU.teamassessmentapps.utils.TeamHealthBaseGrid',
   alias: 'widget.scrumgrid',

   config: {

     columnCfgs: null
   },


   _getColumnCfgs: function(usePoints){
     var metric = usePoints ? 'Points' : 'Count';
     var me = this;
     var defaults = {
       flex: 1,
       listeners: {
            afterrender: this._initTooltip,
        },
        align: 'center',
        sortable: false
     };

    var cols = [{
        dataIndex: 'team',
        text: 'Team',
        flex: 3
      },
      Ext.apply({}, {
         dataIndex: '__totalWorkItems',
         text: 'Total Work Items'
      }, defaults),
      Ext.apply({}, {
         dataIndex: '__activeWorkItems',
         text: 'Active Work Items'
      }, defaults),
      Ext.apply({}, {
        dataIndex: '__iteration',
        text: 'Iteration',
        flex: 3,
        renderer: function(v,m,r){
           if (v && v.Name){
               return v.Name;
           }
           return '--';
        }
      }, defaults)];

      if (usePoints){
        cols = cols.concat([
          Ext.apply({}, {
              dataIndex: '__plannedVelocity',
              text: 'Iteration Planned Velocity',
              renderer: this._plannedVelocityRenderer,
              toolTip: 'The planned velocity set on the Iteration'
          }, defaults),
          Ext.apply({}, {
              dataIndex: '__ratioEstimated',
              text: '% Items Estimated',
              renderer: this._percentRenderer,
          }, defaults),
          Ext.apply({}, {
              dataIndex: '__planned',
              text: Ext.String.format("Actual Planned At Sprint Start ({0})", metric),
              renderer: this._metricRenderer,
          }, defaults),
          Ext.apply({}, {
              dataIndex: '__currentPlanned',
              text: Ext.String.format("Current Planned ({0})", metric),
              renderer: this._metricRenderer,
            }, defaults),
          Ext.apply({}, {
              dataIndex: '__velocity',
              text: Ext.String.format("Actual Accepted At Sprint End ({0})", metric),
              renderer: this._metricRenderer,
            }, defaults)
        ]);

      } else {
        cols = cols.concat([
          Ext.apply({}, {
            dataIndex: '__planned',
            text: Ext.String.format("Actual Planned At Sprint Start ({0})", metric),
          }, defaults),
          Ext.apply({}, {
            dataIndex: '__currentPlanned',
            text: Ext.String.format("Current Planned ({0})", metric),
          }, defaults),
          Ext.apply({}, {
            dataIndex: '__velocity',
            text: Ext.String.format("Actual Accepted At Sprint End ({0})", metric),
          }, defaults)]);
      }

      cols = cols.concat([
        Ext.apply({}, {
            dataIndex: '__ratioInProgress',
            text: Ext.String.format("% Average Daily in Progress ({0})", metric),
            renderer: this._percentRenderer
        }, defaults),
        Ext.apply({}, {
          dataIndex: '__acceptedAtSprintEnd',
          text: Ext.String.format("% Accepted by Sprint End ({0})", metric),
          renderer: this._percentRenderer
        }, defaults),
        Ext.apply({}, {
          dataIndex: '__acceptedAfterSprintEnd',
          text: Ext.String.format("% Accepted after Sprint End ({0})", metric),
          renderer: this._percentRenderer
        }, defaults),
        Ext.apply({}, {
          dataIndex: '__addedScope',
          text: Ext.String.format("Added Scope ({0})", metric),
          renderer: this._metricRenderer
        }, defaults),
        Ext.apply({}, {
          dataIndex: '__removedScope',
          text: Ext.String.format("Removed Scope ({0})", metric),
          renderer: this._metricRenderer
       }, defaults),
       Ext.apply({}, {
         dataIndex: '__netChurn',
         text: Ext.String.format("Net Churn ({0})", metric),
         renderer: this._percentRenderer
       }, defaults),
       Ext.apply({}, {
         dataIndex: '__plannedLoad',
         text: 'Planning Load',
         renderer: this._percentRenderer,
       }, defaults)
      ]);
      return cols;
   }
});
