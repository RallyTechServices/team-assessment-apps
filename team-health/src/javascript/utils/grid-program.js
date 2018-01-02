Ext.define('CArABU.teamassessmentapps.teamhealth.ProgramGrid',{
   extend: 'CArABU.teamassessmentapps.utils.TeamHealthBaseGrid',
   alias: 'widget.programgrid',

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
             dataIndex: '__activeWorkItems',
             text: 'Active Work Items',
             sortable: false,
             align: 'center',
             flex: 1,
             listeners: {
                  afterrender: this._initTooltip
              }
           },{
             dataIndex: '__activePortfolioItemCount',
             text: 'Active Portfolio Items',
             sortable: false,
             align: 'center',
             flex: 1,
             listeners: {
                  afterrender: this._initTooltip
              }
            },{
              dataIndex: '__activeStoryCount',
              text: 'Active User Stories',
              sortable: false,
              align: 'center',
              flex: 1,
              listeners: {
                   afterrender: this._initTooltip
               }
             },{
               dataIndex: '__activeDefectCount',
               text: 'Active Defects',
               sortable: false,
               align: 'center',
               flex: 1,
               listeners: {
                    afterrender: this._initTooltip
                }
              },{
                dataIndex: '__activeTestCaseCount',
                text: 'Active Test Cases',
                sortable: false,
                align: 'center',
                flex: 1,
                listeners: {
                     afterrender: this._initTooltip
                 }
               },{
                 dataIndex: '__activeTaskCount',
                 text: 'Active Tasks',
                 sortable: false,
                 align: 'center',
                 flex: 1,
                 listeners: {
                      afterrender: this._initTooltip
                  }
           }];
   }



});
