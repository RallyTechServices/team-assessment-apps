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
     console.log('v',v);
      if (v && Ext.isObject(v)){
         var total = Ext.Array.sum(Ext.Object.getValues(v));
         if (total > 0){
           var redPct = v[Rally.technicalservices.util.HealthRenderers.red]/total,
           yellowPct = v[Rally.technicalservices.util.HealthRenderers.yellow]/total,
           greenPct = v[Rally.technicalservices.util.HealthRenderers.green]/total ;

           redPct = redPct > 0 ? redPct * 100 : 0;
           yellowPct = yellowPct > 0 ? yellowPct * 100 : 0;
           greenPct = greenPct > 0 ? greenPct * 100 : 0;

           //color pct, color pct, color pct
           var indexStrs = [];
           if (redPct){
              indexStrs.push(Ext.String.format('{0} {1}%', Rally.technicalservices.util.HealthRenderers.red, redPct));
           }

           if (yellowPct){
              indexStrs.push(Ext.String.format('{0} {1}%',Rally.technicalservices.util.HealthRenderers.yellow, redPct + yellowPct));
           }

          if (greenPct){
             indexStrs.push(Ext.String.format('{0} {1}%',Rally.technicalservices.util.HealthRenderers.green, redPct + yellowPct + greenPct));
          }

          // var str = Ext.String.format('<div style="background-color: {0}; ' +
          //     'background: -webkit-gradient(linear, right top, right top, from({0}), color-stop({7},{1}), color-stop({8},{3}), color-stop({9},{5}), to({10})); '  +
          //     'background: -webkit-linear-gradient(right, {0}, {1} {2}%, {3} {4}%, {5} {6}%, {10});' +  /* Safari 5.1, Chrome 10+ */
          //     'background: -moz-linear-gradient(right, {0}, {1} {2}%, {3} {4}%, {5} {6}%, {10});' + /* Firefox 3.6+ */
          //     'background: -ms-linear-gradient(right, {0}, {1} {2}%, {3} {4}%, {5} {6}%, {10});'  +           /* IE 10 */
          //     'background: -o-linear-gradient(right, {0}, {1} {2}%, {3} {4}%, {5} {6}%, {10});width:200px;height:25px;"></div>',           /* Opera 11.10+ */
          //      Rally.technicalservices.util.HealthRenderers.grey,
          //      Rally.technicalservices.util.HealthRenderers.red,
          //      redPct,
          //      Rally.technicalservices.util.HealthRenderers.yellow,
          //      yellowPct,
          //      Rally.technicalservices.util.HealthRenderers.green,
          //      greenPct,
          //      redPct/100, yellowPct/100, greenPct/100,
          //      Rally.technicalservices.util.HealthRenderers.grey);
          //      return str;


            return Ext.String.format('<div style="background: linear-gradient(to right, {0});width:200px;height:25px;"></div>',indexStrs.join(','));
         }
      }
      return '';

   }



});
