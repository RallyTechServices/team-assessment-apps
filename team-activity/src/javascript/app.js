Ext.define("team-activity", {
    extend: 'CATS.teamassessmentapps.app.DomainApp',

    // time from in-progress to accepted (stories and defects)
    // # stories/defects accepted in the past week (e.g. timebox)
    // test coverage (number of stories that have test cases) - current
    // configurable by iterations/release or custom timebox

    _updateView: function(){

        var timebox = this.getTimebox();
        this.logger.log('_updateView.projectRecords', this.domainProjects,timebox);

        if (!timebox.startDate || !timebox.endDate || timebox.startDate > timebox.EndDate){
            Rally.ui.notify.Notifier.showWarning({message: "Please select a valid timebox."});
           return;
        }

        if (this.down('rallygrid')){
           this.down('rallygrid').destroy();
        }
        this.clearAppMessage();
        
        if (!this.domainProjects || this.domainProjects.length === 0){
           this.addAppMessage("No projects in the selected Team Domain.");
           return;
        }

        this.setLoading(true);
        Deft.Promise.all([
          this._fetchWsapiRecords(this._getConfig('UserStory')),
          this._fetchWsapiRecords(this._getConfig('Defect')),
        ]).then({
          success: this._buildGrid,
          failure: this._showErrorNotification,
          scope: this
        }).always(function(){
          this.setLoading(false);
        }, this);
    },

    _buildGrid: function(results){
       this.logger.log('_buildGrid', results);



       var calc = Ext.create('CATS.teamassessmentapps.utils.ActivityCalculator', {
          records: _.flatten(results),
          timebox: this.getTimebox(),
          activeDays: this.getActiveDays()
       });

       var data = calc.getData(),
          fields = Ext.Object.getKeys(data[0]);
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
    getColumnCfgs: function(fields){
        return [{
          dataIndex: 'projectName',
          text: 'Team',
          flex: 1
        },{
          dataIndex: 'totalRecords',
          text: '# Work Items'
        },{
          dataIndex: 'activeRecords',
          text: '# Active Items ( past ' + this.getActiveDays() + ' days)'
        },{
          dataIndex: 'acceptedRecords',
          text: 'Accepted Work Items'
        },{
          dataIndex: 'inProgressRecords',
          text: 'In-Progress Work Items'
        },{
          dataIndex: 'averageCycleTime',
          text: 'Average Cycle Time (Days)',
          renderer: function(v){
             if (v){
               return v.toFixed(1);
             }
             return '--';
          }
        },{
          dataIndex: 'noTests',
          text: 'No Tests'
        },{
          dataIndex: 'testsNotRun',
          text: 'Tests Exist, Not Run'
        },{
          dataIndex: 'testsFailed',
          text: 'Failing Tests'
        },{
          dataIndex: 'testsPassed',
          text: 'Passing Tests'
        }];
    },
    _getConfig: function(modelName){
      var filters = null,
          config = {
            model: modelName,
            fetch: ['InProgressDate','AcceptedDate','TestCaseStatus','PlanEstimate','Project','Name','ObjectID','LastUpdateDate']
          };

      if (this.domainProjects){
          filters = _.map(this.domainProjects, function(p){ return {
              property: 'Project.ObjectID',
              value: p.get('ObjectID')
            }
          });
          filters = Rally.data.wsapi.Filter.or(filters);
          config.context = {project: null}
      }

      if (this.getUseDashboardTimeboxScope()){
         var tbFilters = this.getContext().getTimeboxScope().getQueryFilter();
         if (filters){
            filters = filters.and(tbFilters);
         } else {
           filters = tbFilters;
         }
      } else {
         //Should we filter on stories who have an inprogressdate and not an accepted date or an accepteddate within the last 14 days
      }

      if (modelName === "UserStory"){
        if (filters){
           filters = filters.and({
              property: 'DirectChildrenCount',
              value: 0
           });
        } else {
           filters = [{
              property: 'DirectChildrenCount',
              value: 0
           }];
        }
      }

      config.filters = filters || [];
      return config;
    },
    getActiveDays: function(){
       return this.getSetting('activeDays') || 3;
    },
    getSettingsFields: function(){
       var cols = this.callParent();
       cols.push({
         xtype: 'rallynumberfield',
         fieldLabel: 'Active Days',
         name: 'activeDays',
         labelAlign: 'right',
         minValue: 1,
         maxValue: 365
       });
       return cols;
    }
});
