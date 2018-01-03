Ext.define('CArABU.teamassessmentapps.teamhealth.SummaryGrid',{
   extend: 'CArABU.teamassessmentapps.utils.TeamHealthBaseGrid',
   alias: 'widget.summarygrid',

   _getColumnCfgs: function(usePoints){
      var icons = {
         scrum: 'icon-graph',
         other: 'icon-board',
         program: 'icon-portfolio',
         inactive: 'icon-box'
      };


      return [{
              dataIndex: 'team',
              text: 'Team',
              flex: 3,
              renderer: function(v,m,r){
                m.tdCls = 'team-label ' + r.get('classification');
                  return Ext.String.format('<div class="team-label {0} {1}"></div>{2}', icons[r.get('classification')], r.get('classification'), v);
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
             dataIndex: '__healthIndex',
             text: 'Health',
             sortable: false,
             align: 'center',
             flex: 1,
             listeners: {
                  afterrender: this._initTooltip
              },
              renderer: this._renderHealthIndex
           }];
   },
   _renderHealthIndex: function(v,m,r){

      if (v && Ext.isObject(v)){
        var tpl = Ext.create('CArABU.technicalservices.HealthIndexTemplate');
        return tpl.apply(v);
      }
      return '';
   }

});
