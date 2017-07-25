Ext.define("team-users", {
    extend: 'CATS.teamassessmentapps.app.DomainApp',

    _updateView: function(){

          //Get Permissions
          var promises = Ext.Array.map(this.domainProjects, function(p){
              return CATS.teamassessmentapps.utils.UserUtility.fetchUsersByProject(p.get('ObjectID'));
          });
          this.setLoading(true);
          Deft.Promise.all(promises).then({
              success: this._buildChart,
              failure: this._showErrorNotification,
              scope: this
          }).always(function(){
            this.setLoading(false);
          },this);
      },
      getShowTimebox: function(){
        return false;
      },
      _export: function(){
         if (!this.down('rallygrid')){
           return;
         }

         var store = this.down('rallygrid').getStore(),
            cols = this.getColumnCfgs(),
            data = [_.pluck(cols,'text').join(',')];

         store.each(function(r){
            var row = [];
            Ext.Array.each(cols, function(c){
              row.push(r.get(c.dataIndex));
            });
            data.push(row.join(','));
         });

         var csv = data.join('\r\n'),
            fileName = Ext.String.format('user-activity-{0}.csv', Rally.util.DateTime.format(new Date(),'Y-m-d-h-i-s'));

         CATS.teamassessmentapps.utils.Toolbox.saveAs(csv,fileName);
      },
      _buildChart: function(results){
        this.logger.log('_buildChart', results);

        this.down('rallygrid') && this.down('rallygrid').destroy();
        this.down('rallychart') && this.down('rallychart').destroy();

        if (!this.domainProjects || this.domainProjects.length === 0 ){
           Rally.ui.notify.Notifier.showWarning({message: "No projects selected."});
           return;
        }

        var idx = 0,
            data = [];
        Ext.Array.each(this.domainProjects, function(d){
           data.push(CATS.teamassessmentapps.utils.UserUtility.calculateProjectUsage(d,results[idx++]));
        });

        var chartData = {};
        chartData.series = [
          {name: 'Viewer', data: _.pluck(data, 'viewer'), stack: 0},
          {name: 'Editor', data: _.pluck(data, 'editor'), stack: 0},
          {name: 'Project Admin', data: _.pluck(data, 'projectAdmin'), stack: 0},
          {name: 'Workspace Admin', data: _.pluck(data, 'workspaceAdmin'), stack: 0},
          {name: 'Subscription Admin', data: _.pluck(data, 'subscriptionAdmin'), stack: 0},
          {name: 'Disabled', data: _.pluck(data, 'disabled'), stack: 0},
          {name: 'Team Member', data: _.pluck(data, 'teamMember'), stack: 1},
        ];
        chartData.categories = _.pluck(data, 'team');

        this.logger.log('chartData', chartData);
        this.add({
          xtype: 'rallychart',
          chartColors: ['#BDD7EA','#7CAFD7','#005EB8','#FF8200','#B81B10','#E6E6E6','#FAD200'],
          chartConfig: {
             chart: {
                  type: 'bar'
              },
              title: {
                  text: null,
                  style: {
                    color: '#666',
                    fontSize: '18px',
                    fontFamily: 'ProximaNova',
                    fill: '#666'
                }
              },
              xAxis: {
                  categories: chartData.categories,
                  labels: {
                    style: {
                        color: '#444',
                        fontFamily:'ProximaNova',
                        textTransform: 'uppercase',
                        fill:'#444'
                    }
                  }
              },
              yAxis: {
                  min: 0,
                  title: {
                      text: 'Users',
                      style: {
                          color: '#444',
                          fontFamily:'ProximaNova',
                          textTransform: 'uppercase',
                          fill:'#444'
                      }
                  },
                  labels: {
                      style: {
                          color: '#444',
                          fontFamily:'ProximaNova',
                          textTransform: 'uppercase',
                          fill:'#444'
                      }
                  }
              },
              legend: {
                reversed: true,
                verticalAlign: 'top',
                itemStyle: {
                        color: '#444',
                        fontFamily:'ProximaNova',
                        textTransform: 'uppercase'
                },
                borderWidth: 0
              },
              plotOptions: {
                  bar: {
                      stacking: 'normal'
                  }
              },
              series: chartData.series
          },
          chartData: chartData
        });
        this._buildGrid(data);
      },
      _buildGrid: function(data){
        this.logger.log('_buildGrid', data);

        var fields = Ext.Object.getKeys(data[0]);
        this.logger.log('_buildGrid', data, fields);
        var grid = this.add({
          xtype: 'rallygrid',
          store: Ext.create('Rally.data.custom.Store',{
            data: data,
            fields: fields,
            pageSize: data.length
          }),
          columnCfgs: this.getColumnCfgs(fields),
          showPagingToolbar: false,
          pageSize: data.length,
          showRowActionsColumn: false,
          enableEditing: false,
          enableBulkEdit: false
        });

        grid.setHeight(this.getHeight() - this.down('#selectorBox').getHeight());
     },

     getColumnCfgs: function(){
         return [{
           dataIndex: 'team',
           text: 'Team',
           flex: 1
         },{
           dataIndex: 'totalAccess',
           text: 'Total Users'
         },{
           dataIndex: 'teamMember',
           text: 'Team Members'
         },{
           dataIndex: 'viewer',
           text: 'Viewers'
         },{
           dataIndex: 'editor',
           text: 'Editors'
         },{
           dataIndex: 'projectAdmin',
           text: 'Project Admins'
         },{
           dataIndex: 'workspaceAdmin',
           text: 'Workspace Admins'
         },{
           dataIndex: 'subscriptionAdmin',
           text: 'Subscription Admins'
         }];
     },
     getSettingsFields: function(){
          return [{
            xtype: 'rallyfieldcombobox',
            fieldLabel: 'Project Domain Field',
            model: 'Project',
            name: 'projectDomainField',
            allowBlank: true,
            noEntryText: '-- Follow Project Scope --',
            emptyText: '-- Follow Project Scope --',
            _isNotHidden: function(field) {

              if (field && !field.readOnly &&
                    field.attributeDefinition &&
                    field.attributeDefinition.Constrained &&
                    field.attributeDefinition.Custom){
                  return true;
              }
              return false;
            }
          }];
      },
  });
