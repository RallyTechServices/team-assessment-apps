Ext.define('CArABU.teamassessmentapps.teamhealth.OtherGrid',{
    extend: 'CArABU.teamassessmentapps.utils.TeamHealthBaseGrid',
    alias: 'widget.othergrid',

    _getColumnCfgs: function(usePoints){
      var units = usePoints ? '(Points)' : '(Count)';

       return  [{
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
            dataIndex: '__activeWorkItems',
          text: 'Active Work Items',
          align: 'center',
          sortable: false,
          flex: 1,
          listeners: {
               afterrender: this._initTooltip
           }
         },{
           dataIndex: '__ratioEstimated',
          text: '% Items Estimated',
          renderer: this._percentRenderer,
          flex: 1,
          sortable: false,
          listeners: {
               afterrender: this._initTooltip
           }

         },{
            dataIndex: '__defined',
            text: '# Defined Stories',
            sortable: false,
            flex: 1,
            listeners: {
                 afterrender: this._initTooltip
             }
        },{
           dataIndex: '__throughput',
           text: 'Accepted Stories ' + units,
           sortable: false,
           flex: 1,
           listeners: {
                afterrender: this._initTooltip
            }
         },{
           dataIndex: '__avgThroughput',
           text: 'Average Accepted Stories per Day ' + units,
           sortable: false,
           flex: 1,
           renderer: this._decimalRenderer,
           listeners: {
                afterrender: this._initTooltip
            }
       },{
         dataIndex: '__avgCycleTime',
         text: 'Average Cycle Time (Days)',
         sortable: false,
         flex: 1,
         renderer: this._decimalRenderer,
         listeners: {
              afterrender: this._initTooltip
          }
        },{
          dataIndex: '__sdCycleTime',
          text: 'Cycle Time CoV',
          sortable: false,
          flex: 1,
          renderer: this._percentRenderer,
          listeners: {
               afterrender: this._initTooltip
           }
          },{
            dataIndex: '__avgWIP',
            text: 'Average Work In-Progress per Day ' + units,
            sortable: false,
            flex: 1,
            renderer: this._decimalRenderer,
            listeners: {
                 afterrender: this._initTooltip
             }
           },{
             dataIndex: '__sdWIP',
             text: 'Work In-Progress CoV',
             sortable: false,
             flex: 1,
             renderer: this._percentRenderer,
             listeners: {
                  afterrender: this._initTooltip
              }
       }];
    }

});
