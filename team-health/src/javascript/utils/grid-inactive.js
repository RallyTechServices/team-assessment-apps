Ext.define('CArABU.teamassessmentapps.teamhealth.InactiveGrid',{
    extend: 'CArABU.teamassessmentapps.utils.TeamHealthBaseGrid',
    alias: 'widget.inactivegrid',

    _getColumnCfgs: function(usePoints){
      return [{
        dataIndex: 'team',
        text: 'Team',
        flex: 3
      },{
         dataIndex: '__totalWorkItems',
         text: 'Total Work Items',
         align: 'center',
         sortable: false,
         flex: 1,
         listeners: {
              afterrender: this._initTooltip
          }
      },{
        dataIndex: '__lastUpdatedWorkItem',
        text: 'Last Updated Work Item',
        align: 'center',
        sortable: false,
        flex: 1,
        listeners: {
             afterrender: this._initTooltip
         }
      }];
    }

});
