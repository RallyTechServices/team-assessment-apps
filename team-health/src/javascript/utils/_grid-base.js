Ext.define('CArABU.teamassessmentapps.utils.TeamHealthBaseGrid',{
   extend: 'Rally.ui.grid.Grid',
   alias: 'widget.basegrid',

   config: {
     showPagingToolbar: false,
     showRowActionsColumn: false,
     enableBulkEdit: false,
     itemId: 'teamGrid'
   },
   constructor: function(config) {
       this.config.columnCfgs = this._getColumnCfgs(config.usePoints);
       this.callParent(arguments);
   },
   _initTooltip: function(column){
     var tool_tip = Rally.technicalservices.util.HealthRenderers.getTooltip(column.dataIndex);

     Ext.create('Rally.ui.tooltip.ToolTip', {
         target : column.getEl(), //target_element,
         html: tool_tip
     });

   },
   _plannedVelocityRenderer: function(v,m,r){
     var color = v > 0 ? Rally.technicalservices.util.HealthRenderers.green : Rally.technicalservices.util.HealthRenderers.red;
     m.tdAttr = 'data-qtip="The planned velocity set on the Iteration"';
     m.style = 'padding-right:7px;text-align:center;background-color:'+color;
     return v;
   },
   _percentRenderer: function(v,m,r, rowIdx, colIdx){
       var fieldName = this.columns[colIdx].dataIndex;
       var color = Rally.technicalservices.util.HealthRenderers.getCellColor(v, fieldName, r.getData());
       m.style = 'padding-right:7px;text-align:center;background-color:'+color;

       if (v >= 0 && v < 2){
         return Math.round(v * 100) + ' %';
       }
       return '--';
   },
   // _scopeRenderer: function(v,m,r,rowIdx, colIdx){
   //   // var plannedPoints = r.get('__planned'),
   //   //     pct = plannedPoints ? v/plannedPoints : -1;
   //
   //    var fieldName = this.columns[colIdx].dataIndex;
   //    var color = Rally.technicalservices.util.HealthRenderers.getCellColor(v, fieldName, r.getData());
   //    //var color = Rally.technicalservices.util.HealthRenderers.getCellColor(pct, fieldName);
   //    m.style = 'padding-right:7px;text-align:center;background-color:'+color;
   //
   //    if (v >= 0){
   //       return v;
   //    }
   //    return v;
   // },
   // _pointsPctRenderer: function(v,m,r,rowIdx, colIdx){
   //     // var plannedVelocity = r.get('__iteration') && r.get('__iteration').PlannedVelocity,
   //     //     pct = plannedVelocity ? v/plannedVelocity : -1;
   //
   //     var fieldName = this.columns[colIdx].dataIndex;
   //     var color = Rally.technicalservices.util.HealthRenderers.getCellColor(v, fieldName, r.getData());
   //     //var color = Rally.technicalservices.util.HealthRenderers.getCellColor(pct, fieldName);
   //     m.style = 'padding-right:7px;text-align:center;background-color:'+color;
   //
   //      if (v >= 0){
   //         return v;
   //      }
   //      return '--';
   // },
   _metricRenderer: function(v,m,r,rowIdx, colIdx){
       var fieldName = this.columns[colIdx].dataIndex;
       var color = Rally.technicalservices.util.HealthRenderers.getCellColor(v, fieldName, r.getData());

       m.style = 'padding-right:7px;text-align:center;background-color:'+color;

        if (v >= 0){
           return v;
        }
        return '--';
   },
   _decimalRenderer: function(v,m,r,rowIdx, colIdx){
     var fieldName = this.columns[colIdx].dataIndex;
     var color = Rally.technicalservices.util.HealthRenderers.getCellColor(v, fieldName, r.getData());
     m.style = 'padding-right:7px;text-align:center;background-color:'+color;
     if (v >= 0){
        return v.toFixed(1);
     }
     return '--';
   }

 });
