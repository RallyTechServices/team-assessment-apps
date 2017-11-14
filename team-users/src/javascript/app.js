Ext.define("team-users", {
    extend: 'CATS.teamassessmentapps.app.DomainApp',

    config: {
      defaultSettings: {
         activeDays: 7,
         showWorkItemData: true
      }
    },

    _updateView: function(){

          //Get Permissions

          var promises = Ext.Array.map(this.domainProjects, function(p){
              return CATS.teamassessmentapps.utils.UserUtility.fetchUsersByProject(p.get('ObjectID'));
          });
          if (this.getShowWorkItemData()){
            promises.push(CATS.teamassessmentapps.utils.WorkItemUtility.fetchWorkItemInfo(this.domainProjects));
          }

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
      getActiveDays: function(){
         return this.getSetting('activeDays');
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
        this.down('#userChart') && this.down('#userChart').destroy();
        this.down('#growthChart') && this.down('#growthChart').destroy();
        this.clearAppMessage();
        
        if (!this.domainProjects || this.domainProjects.length === 0 ){
           Rally.ui.notify.Notifier.showWarning({message: "No projects selected."});
           this.addAppMessage("No projects in the selected Team Domain.");
           return;
        }

        var idx = 0,
            data = [];
        Ext.Array.each(this.domainProjects, function(d){
           data.push(CATS.teamassessmentapps.utils.UserUtility.calculateProjectUsage(d,results[idx++]));
        });
        if (results[idx]){ //this is workitem results
            var workItemData = CATS.teamassessmentapps.utils.WorkItemUtility.calculateWorkItemStats(results[idx], this.getActiveDays());
            Ext.Array.each(data, function(d){
               if (workItemData[d.team]){
                  d.totalWorkItems = workItemData[d.team].totalSnaps;
                  d.activeWorkItems = workItemData[d.team].activeSnaps;
                  d.activeUsers = workItemData[d.team].activeUsers;
                  d.createdDates = workItemData[d.team].workItemCreation;
               } else {
                 d.totalWorkItems = 0;
                 d.activeWorkItems = 0;
                 d.activeUsers = 0;
                 d.createdDates = {};
                }
            });
            this.logger.log('workItemData', workItemData);
        }

        var chartData = {};
        totalWorkItemsDiff = Ext.Array.map(data, function(d){
           return d.totalWorkItems - d.activeWorkItems;
        });
        chartData.series = [
          {name: 'Viewer', data: _.pluck(data, 'viewer'), stack: 0},
          {name: 'Editor', data: _.pluck(data, 'editor'), stack: 0},
          {name: 'Project Admin', data: _.pluck(data, 'projectAdmin'), stack: 0},
          {name: 'Workspace Admin', data: _.pluck(data, 'workspaceAdmin'), stack: 0},
          {name: 'Subscription Admin', data: _.pluck(data, 'subscriptionAdmin'), stack: 0},
          {name: 'Disabled', data: _.pluck(data, 'disabled'), stack: 0},
          {name: 'Team Member', data: _.pluck(data, 'teamMember'), stack: 1}
        ];
        if (this.getShowWorkItemData()){
          chartData.series = chartData.series.concat([{name: 'Active Users (Last ' + this.getActiveDays() + ' days)', data: _.pluck(data, 'activeUsers'), stack: 2},
            {name: 'Total Work Items', data: totalWorkItemsDiff, stack: 3, yAxis: 1},
            {name: 'Active Work Items (Last ' + this.getActiveDays() + ' days)', data: _.pluck(data, 'activeWorkItems'), stack: 3, yAxis: 1}]
          );
        }
        chartData.categories = _.pluck(data, 'team');

        this.logger.log('chartData', chartData);
        this.add({
          xtype: 'rallychart',
          itemId: 'userChart',
          chartColors: ['#BDD7EA','#7CAFD7','#005EB8','#FF8200','#B81B10','#E6E6E6','#FAD200','#3a874f','#A9A9A9','#b2e3b6'],
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
              yAxis: [{
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
              },{
                  min: 0,
                  title: {
                      text: 'Work Items',
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
                  },
                  opposite: true
              }],
              legend: {
                reversed: false,
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

        if (this.getShowWorkItemData()){
          this._buildGrowthChart(data);
        }
        this._buildGrid(data);
      },
      _buildGrowthChart: function(data){
        this.down('#growthChart') && this.down('#growthChart').destroy();
        var series = []
        Ext.Array.each(data, function(d){
           var s = {
              name: d.team,
              data: []
           };

           var cumulativeTotal = 0,
              currentDate = new Date(),
              currentYear = currentDate.getFullYear(),
              currentMonth = currentDate.getMonth(),
              currentDay = currentDate.getDate();

           Ext.Object.each(d.createdDates, function(dt,count){
              cumulativeTotal += count;
              var year = dt.substring(0,4),
                  month = Number(dt.substring(5,7)) - 1,
                  day = dt.substring(8,10);
              s.data.push([Date.UTC(year, month, day),cumulativeTotal]);
           });
          // s.data.push([Date.UTC(currentYear, currentMonth, currentDay), cumulativeTotal]);
           series.push(s);
        });

        this.add({
          xtype: 'rallychart',
          itemId: 'growthChart',
          chartColors: ['#B81B10','#CADDA3','#7CAFD7','#FF8200','#FAD200','#3a874f','#7832A5','#00B398','#105CAB','#EE6C19'],
          chartConfig: {
            chart: {
                type: 'spline'
            },
            title: {
                text: "Work Item Growth",
                style: {
                  color: '#666',
                  fontSize: '18px',
                  fontFamily: 'ProximaNova',
                  fill: '#666'
              }
            },
            xAxis: {
                type: 'datetime',
                dateTimeLabelFormats: { // don't display the dummy year
                    week: '%e %b',
                    month: "%b %Y",
                    year: "%Y"
                },
                title: {
                    text: 'Date',
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
                },
            },
            yAxis: {
              title: {
                  text: 'Work Item Count',
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
              },
                min: 0
            },
            legend: {
              reversed: false,
              itemStyle: {
                      color: '#444',
                      fontFamily:'ProximaNova',
                      textTransform: 'uppercase'
              },
              borderWidth: 0
            },
            tooltip: {
              backgroundColor: '#444',
              headerFormat: '<span style="display:block;margin:0;padding:0 0 2px 0;text-align:center"><b style="font-family:NotoSansBold;color:white;">{series.name}</b></span><table><tbody>',
              footerFormat: '</tbody></table>',
              pointFormat: '<tr><td class="tooltip-label"><span style="color:{series.color};width=100px;">\u25CF</span></td><td class="tooltip-point">{point.x:%e %b %Y}: {point.y}</td></tr>',
              useHTML: true
            },

            plotOptions: {
                spline: {
                    marker: {
                        enabled: true
                    }
                }
            },
          },
          chartData: {
            series: series
          }
        });

        //
        // chartData.series = [
        //   {name: 'Viewer', data: _.pluck(data, 'viewer'), stack: 0},
        //   {name: 'Editor', data: _.pluck(data, 'editor'), stack: 0},
        //   {name: 'Project Admin', data: _.pluck(data, 'projectAdmin'), stack: 0},
        //   {name: 'Workspace Admin', data: _.pluck(data, 'workspaceAdmin'), stack: 0},
        //   {name: 'Subscription Admin', data: _.pluck(data, 'subscriptionAdmin'), stack: 0},
        //   {name: 'Disabled', data: _.pluck(data, 'disabled'), stack: 0},
        //   {name: 'Team Member', data: _.pluck(data, 'teamMember'), stack: 1}
        // ];

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

       var cols = [{
         dataIndex: 'team',
         text: 'Team',
         flex: 1
       }];

       if (this.getShowWorkItemData()){
         cols = cols.concat([{
           dataIndex: 'totalWorkItems',
           text: 'Total Work Items'
         },{
           dataIndex: 'activeWorkItems',
           text: 'Active Work Items (Last ' + this.getActiveDays() + ' Days)'
         },{
           dataIndex: 'activeUsers',
           text: 'Active Users (Last ' + this.getActiveDays() + ' Days)'
         }]);
       }
        cols = cols.concat([{
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
         }]);
         return cols;
     },
     getShowWorkItemData: function(){
        return (this.getSetting('showWorkItemData') === 'true' || this.getSetting('showWorkItemData') === true)
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
          },{
            xtype: 'rallynumberfield',
            name: 'activeDays',
            fieldLabel: 'Active Days',
            minValue: 1,
            maxValue: 365
          },{
            xtype: 'rallycheckboxfield',
            name: 'showWorkItemData',
            fieldLabel: 'Show Work Item Data'
          }];
      },
  });
