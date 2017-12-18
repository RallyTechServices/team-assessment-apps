Ext.define("team-health", {
  extend: 'CATS.teamassessmentapps.app.DomainApp',

  maxIterationsAgo: 9,
  doneStates: ['Accepted'],

  config: {
    defaultSettings: {
       ratioInProgress: '30,60',
       ratioEstimated: '75,90',
       acceptedAfterSprintEnd: '10,25',
       acceptedAtSprintEnd: '75,90',
       planned: '75,90',
       velocity: '75,90',
       addedScope: '10,25',
       removedScope: '10,25',
       activeDays: 20,
       netChurn: '15,20',
       plannedLoad: '50,75'
    }
  },

  launch: function(){
    this.logger.log('launch', this.getSettings());

    this._setThreshholds(this.getSettings());
    this._fetchDoneStates().then({
       success: function(states){
          this.doneStates = states;
          this.logger.log('doneState', this.doneStates);
          this._initializeApp();
       },
       failure: this._showErrorNotification,
       scope: this
    });
  },

  _initializeApp: function(){

     var selectors = [{
       xtype: 'rallybutton',
       text: 'Scrum',
       itemId: 'classicficationBtn-scrum',
       margin: '10 -1 10 25',
       pressed: true,
       cls: 'primary rly-small',
       toggleGroup: 'classificationView',
       toggleHandler: this._tabChange,
       style: {
          borderBottomRightRadius: 0,
          borderTopRightRadius: 0
       },
       scope: this
     },{
       xtype: 'rallybutton',
       text: 'Other',
       itemId: 'classicficationBtn-other',
       margin: '10 -1 10 -1',
       cls: 'secondary rly-small',
       toggleGroup: 'classificationView',
       style: {
          borderBottomLeftRadius: 0,
          borderTopLeftRadius: 0,
          borderBottomRightRadius: 0,
          borderTopRightRadius: 0
       },
       toggleHandler: this._tabChange,
       scope: this
     },{
       xtype: 'rallybutton',
       text: 'Program',
       itemId: 'classicficationBtn-program',
       margin: '10 -1 10 -1',
       cls: 'secondary rly-small',
       toggleGroup: 'classificationView',
       style: {
          borderBottomLeftRadius: 0,
          borderTopLeftRadius: 0,
          borderBottomRightRadius: 0,
          borderTopRightRadius: 0
       },
       toggleHandler: this._tabChange,
       scope: this
     },{
       xtype: 'rallybutton',
       text: 'Inactive',
       itemId: 'classicficationBtn-inactive',
       margin: '10 25 10 -1',
       cls: 'secondary rly-small',
       toggleGroup: 'classificationView',
       style: {
          borderBottomLeftRadius: 0,
          borderTopLeftRadius: 0
       },
       toggleHandler: this._tabChange,
       scope: this
     },{
       xtype:'rallynumberfield',
       itemId: 'iterationsAgo',
       fieldLabel: '# Iterations Ago',
       labelAlign: 'right',
       minValue: 1,
       maxValue: this.maxIterationsAgo,
       margin: 10,
       emptyText: 'Last Iteration',
       listeners: {
          scope: this,
          change: this._updateIterationsAgo
       }
     },{
        xtype: 'rallycombobox',
        store: Ext.create('Rally.data.custom.Store',{
            data: [{name: 'by Points', value: 'points'},{name: 'by Count', value: 'count'}],
            fields: ['name','value']
        }),
        fieldLabel: 'Metric',
        displayField: 'name',
        valueField: 'value',
        itemId: 'metric',
        labelAlign: 'right',
        margin: 10,
        listeners: {
          scope: this,
          select: this._updateUsePoints
        }
     }];

     this.logger.log('selectors', selectors);
     this.callParent([selectors]);
  },
  _tabChange: function(btn, pressed){

     var btns = this.query('rallybutton[toggleGroup=classificationView]');
     this.logger.log('_tabChange', btns.length);
     var selectedBtn = this.getSelectedButton();
     if (!selectedBtn){ return; }

     Ext.Array.each(btns, function(b){

        if (b && b.itemId === selectedBtn.itemId){
           b.removeCls('secondary');
           b.addCls('primary');

        } else {
          b.removeCls('primary');
          b.addCls('secondary');
        }
     }, this);
     this._displaySelectedView();
  },

  _updateView: function(){

    this.logger.log('_updateView', this.getIterationsAgo(), this.domainProjects);
    this.down('#teamGrid') && this.down('#teamGrid').destroy();
    this.clearAppMessage();

    if (!this.domainProjects){  // || this.domainProjects.length === 0){
       this.addAppMessage("Project information loading...");
       this._updateDomainProjects();
       return;
    }

    if (this.domainProjects.length === 0){
       this.addAppMessage("No projects found in the selected domain.");
       return;
    }

    //For the first load, we will just load information from the most recent iteration so that we can classify teams
    this._fetchIterations().then({
      success: this._fetchClassificationData,
      failure: this._showErrorNotification,
      scope: this
    });

  },
  _fetchClassificationData: function(iterations){
    var projectIterations = this._getProjectIterations(iterations, 1);
    this.projectIterations = projectIterations;
    var domainProjects = this.domainProjects;

    this.logger.log('_fetchClassificationData', projectIterations,domainProjects);

    CATS.teamassessmentapps.utils.WorkItemUtility.fetchWorkItemInfo(domainProjects).then({
      success: this._initializeData,
      failure: this._showErrorNotification,
      scope: this
    }).always(function(){ this.setLoading(false); },this);

  },

    _initializeData: function(workItemData){
      var data = [];
      var workItemInfo = CATS.teamassessmentapps.utils.WorkItemUtility.calculateWorkItemStats(workItemData, this.getActiveDays());
      this.logger.log('_initializeData.workItemInfo', workItemInfo, this.getActiveDays());
      Ext.Array.each(this.domainProjects, function(p){
         var iteration = this.projectIterations[p.get('Name')],
             row = Ext.create('Rally.technicalservices.utils.DomainProjectHealthModel',{
               __iteration: iteration,
               __workItemData: workItemInfo[p.get('Name')] || {},
               project: p.getData(),
               team: p.get('Name')
             });

         row.initialize()
         data.push(row);
      }, this);
      this.data = data ;

      this._displaySelectedView();

    },

    _updateUsePoints: function(){
       var usePoints = this.getUsePoints();
       this.logger.log('_updateUsePoints', usePoints);

       Ext.Array.each(this.data, function(d){
          d.recalculate(this.getUsePoints(),this.getSkipZeroForEstimation(),this.getDoneStates());
       }, this);

      this._addGrid(this.data);

    },
    _updateIterationsAgo: function(){
      var iterationsAgo = this.getIterationsAgo();
      this.logger.log('_updateIterationsAgo', iterationsAgo);

      this.setLoading('Fetching Iterations...');
      this._fetchIterations(this.getIterationsAgo()).then({
        success: this._fetchScrumData,
        failure: this._showErrorNotification,
        scope: this
      });
    },
    /**
      BEGIN Scrum data collection
    */
    _fetchScrumData: function(iterations){

      var projectIterations = this._getProjectIterations(iterations, this.getIterationsAgo());
      this.projectIterations = projectIterations;

      this.logger.log('projectIterations', this.projectIterations);

      this.setLoading('Fetching Iteration Data...');
      Deft.Promise.all([
        this._fetchIterationCumulativeData(projectIterations),
        this._fetchArtifactData('HierarchicalRequirement', projectIterations),
        this._fetchArtifactData('Defect',projectIterations),
        this._fetchArtifactData('DefectSuite',projectIterations),
        this._fetchArtifactData('TestSet',projectIterations)
      ]).then({
          success: this._processScrumData,
          failure: this._showErrorNotification,
          scope: this
      }).always(function(){ this.setLoading(false); },this);
    },
    _processScrumData: function(results){

      var icfd = results[0],
           artifacts = results[1].concat(results[2]).concat(results[3]).concat(results[4]);

     this.logger.log('_processScrumData', icfd, artifacts);

     var cfdHash = this._getHashByField(icfd, 'IterationObjectID'),
         artifactHash = this._getHashByField(artifacts, 'Project', 'Name');

      this.logger.log('_proecessData cfdHash', cfdHash);

      Ext.Array.each(this.data, function(d){

        var projectName = d.get('team'),
            iteration = this.projectIterations[projectName],
            cfdRecords = iteration ? cfdHash[iteration.ObjectID] || [] : [],
            artifacts = artifactHash[projectName] || [];

         d.updateScrumData(iteration, cfdRecords, artifacts, this.getUsePoints(),this.getSkipZeroForEstimation(),this.getDoneStates());

      }, this);
      this._addGrid(this.data);

    },
    // END SCRUM DATA PROCESSING

    _displaySelectedView: function(){
       var tab  = this.getSelectedTab(),
           isScrum = tab === 'scrum',
           isOther = tab === 'other';

      this.clearAppMessage();
      if (this.down('#teamGrid')){
         this.down('#teamGrid').destroy();
      }

      this.down('#iterationsAgo') && this.down('#iterationsAgo').setVisible(isScrum);
      this.down('#metric') && this.down('#metric').setVisible(isScrum || isOther);

       if (tab === 'scrum' && this.getIterationsAgo() < 1 || this.getIterationsAgo() > this.maxIterationsAgo){
         this.addAppMessage("Please select a valid # Iterations Ago between 1 and " + this.maxIterationsAgo + ".");
         return;
       }

        if (!this.data || !tab || Ext.isEmpty(this.data)){
           return;
        }

        this._addGrid(this.data);

    },
    _addGrid: function(data){
      var gridtype = this.getCurrentGridType(),
          tab = this.getSelectedTab();

      this.clearAppMessage();
      if (this.down('#teamGrid')){
         this.down('#teamGrid').destroy();
      }

      this.logger.log('_addGrid', gridtype, data);

      var filteredData = Ext.Array.filter(data, function(d){
          return d.get('classification') === tab;
      });

      if (!filteredData || filteredData.length === 0){
         this.addAppMessage("No teams found for the selected classification.");
         return;
      }

      var store = Ext.create('Rally.data.custom.Store',{
          data: filteredData,
          model: 'Rally.technicalservices.utils.DomainProjectHealthModel',
          pageSize: filteredData.length
      });

      this.add({
         xtype: gridtype,
         store: store,
         usePoints: this.getUsePoints()
      });
    },

    _export: function(){
        if (!this.data){
           Rally.ui.notify.Notifier.showWarning({message: 'No data to export.'});
           return;
        }

       CArABU.teamassessmentapps.teamhealth.TeamHealthExporter.exportAllData(this.data, this.getUsePoints());
    },
    _getProjectIterations: function(iterations, iterationsAgo){
      var projectIterations = {};
      Ext.Array.each(iterations, function(i){
         if (!projectIterations[i.get('Project').Name]){
           projectIterations[i.get('Project').Name] = [];
         }
         projectIterations[i.get('Project').Name].push(i.getData());
      });

      this.logger.log('_getProjectIterations', projectIterations);

      Ext.Object.each(projectIterations, function(projName, iterations){
         if (iterations.length >= iterationsAgo){
            projectIterations[projName] = iterations[iterationsAgo-1];
         } else {
           projectIterations[projName] = null;
         }
      });
      return projectIterations;
    },
    _fetchIterationCumulativeData: function(projectIterations){
        this.logger.log('_fetchIterationCumulativeData', projectIterations);
        var filters = _.reduce(projectIterations, function(result, obj, projName){
             if (obj){
                result.push({
                  property: 'IterationObjectID',
                  value: obj.ObjectID
               });
             }
             return result;
            }, []);

        if (filters.length > 1){
          filters = Rally.data.wsapi.Filter.or(filters);
        }

        if (filters.length === 0){
           filters = [{
              property: 'ObjectID',
              value: 0
           }];
        }

        return this._fetchWsapiRecords({
          model: 'IterationCumulativeFlowData',
          fetch: ['IterationObjectID','CardCount','CardEstimateTotal','CardState','CardToDoTotal','TaskEstimateTotal','CreationDate'],
          filters: filters,
          sorters: {
             property: 'CreationDate',
             direction: 'ASC'
          }
        });
    },
    _fetchIterations: function(iterationsAgo){
        //if we are initializing and no iterations ago is sent in, then we will
        //just get the most recent iteration for each team
        if (!iterationsAgo){
           iterationsAgo = 1;
        }

        this.logger.log('_fetchIterations', this.domainProjects);
        var filters = Ext.Array.map(this.domainProjects, function(p){
           return {
              property: 'Project.ObjectID',
              value: p.get('ObjectID')
           };
        });

        if (filters.length > 1){
          filters = Rally.data.wsapi.Filter.or(filters);
        }
        if (filters.length === 1){
          filters = Ext.create('Rally.data.wsapi.Filter',filters[0]);
        }

        filters = filters.and({
           property: 'EndDate',
           operator: '<',
           value: Rally.util.DateTime.toIsoString(new Date())
        });

        var pageSize = this.domainProjects.length * iterationsAgo;
        this.logger.log('_fetchIterations', pageSize);
        return this._fetchWsapiRecords({
           model: 'Iteration',
           fetch: ['ObjectID','Name','StartDate','EndDate','Project','PlannedVelocity','PlanEstimate'],
           filters: filters,
           sorters: {
              property: 'EndDate',
              direction: 'DESC'
           },
           pageSize: pageSize,
           limit: pageSize
        });

    },
    _fetchArtifactData: function(model, projectIterations){
        this.logger.log('_fetchArtifactData', model, projectIterations);
        var filters = _.reduce(projectIterations, function(result, obj, projName){
             if (obj){
                result.push({
                  property: 'Iteration.ObjectID',
                  value: obj.ObjectID
               });
             }
             return result;
            }, []);

        this.logger.log('_fetchArtifactData', filters);
        if (filters.length > 1){
          filters = Rally.data.wsapi.Filter.or(filters);
        }

        if (filters.length === 0){
           filters = [{
              property: 'ObjectID',
              value: 0
           }];
        }

        return this._fetchWsapiRecords({
          model: model,
          fetch: ['ObjectID','PlanEstimate','AcceptedDate','ScheduleState','Project','Name','Iteration'],
          filters: filters
        });
    },

    /**
       Utility Functions
    **/
    _getHashByField: function(records, fieldName, attribute){
      var hash = {};
      for (var i=0; i<records.length; i++){

          var r = records[i].getData();
          var key = attribute ? r[fieldName][attribute] : r[fieldName];

          if (!hash[key]){
             hash[key] = [];
          }
          hash[key].push(r);
      }
      return hash;
    },
    _getRangeFromSettings: function(settings, settingName){
        var val = settings[settingName];

        if (!Ext.isArray(val)){
          val = val.split(',');
        }
        this.logger.log('_getRangeFromSettings', val);
        return Ext.Array.map(val, function(v){ return Number(v); })
    },
    _setThreshholds: function(settings){

       var range = this._getRangeFromSettings(settings, 'ratioInProgress');
       Rally.technicalservices.util.HealthRenderers.metrics.__ratioInProgress.green = range[0];
       Rally.technicalservices.util.HealthRenderers.metrics.__ratioInProgress.yellow = range[1];

       var range = this._getRangeFromSettings(settings, 'acceptedAfterSprintEnd');
       Rally.technicalservices.util.HealthRenderers.metrics.__acceptedAfterSprintEnd.green = range[0];
       Rally.technicalservices.util.HealthRenderers.metrics.__acceptedAfterSprintEnd.yellow = range[1];

       var range = this._getRangeFromSettings(settings, 'acceptedAtSprintEnd');
       Rally.technicalservices.util.HealthRenderers.metrics.__acceptedAtSprintEnd.green = range[1];
       Rally.technicalservices.util.HealthRenderers.metrics.__acceptedAtSprintEnd.yellow = range[0];

       var range = this._getRangeFromSettings(settings, 'ratioEstimated');
       Rally.technicalservices.util.HealthRenderers.metrics.__ratioEstimated.green = range[1];
       Rally.technicalservices.util.HealthRenderers.metrics.__ratioEstimated.yellow = range[0];

       var range = this._getRangeFromSettings(settings, 'planned');
       Rally.technicalservices.util.HealthRenderers.metrics.__planned.green = range[1];
       Rally.technicalservices.util.HealthRenderers.metrics.__planned.yellow = range[0];
       Rally.technicalservices.util.HealthRenderers.metrics.__currentPlanned.green = range[1];
       Rally.technicalservices.util.HealthRenderers.metrics.__currentPlanned.yellow = range[0];

       var range = this._getRangeFromSettings(settings, 'velocity');
       Rally.technicalservices.util.HealthRenderers.metrics.__velocity.green = range[1];
       Rally.technicalservices.util.HealthRenderers.metrics.__velocity.yellow = range[0];

       var range = this._getRangeFromSettings(settings, 'addedScope');
       Rally.technicalservices.util.HealthRenderers.metrics.__addedScope.green = range[0];
       Rally.technicalservices.util.HealthRenderers.metrics.__addedScope.yellow = range[1];

       var range = this._getRangeFromSettings(settings, 'removedScope');
       Rally.technicalservices.util.HealthRenderers.metrics.__removedScope.green = range[0];
       Rally.technicalservices.util.HealthRenderers.metrics.__removedScope.yellow = range[1];

       var range = this._getRangeFromSettings(settings, 'plannedLoad');
       Rally.technicalservices.util.HealthRenderers.metrics.__plannedLoad.green = range[1];
       Rally.technicalservices.util.HealthRenderers.metrics.__plannedLoad.yellow = range[0]
    },
    /**
     Configuration getter methods
    **/
    getSelectedButton: function(){
      var btns = this.query('rallybutton[toggleGroup=classificationView]');
      var selectedBtn = _.find(btns, function(b){ return b.pressed; });
      return selectedBtn || null;

    },
    getSelectedTab: function(){
        var btn = this.getSelectedButton();
        if (btn){
           var view = btn.itemId.split('-');
           if (view.length === 2){
              return view[1];
           }
        }
        return null;
    },
    getIterationsAgo: function(){
       return this.down('#iterationsAgo') && this.down('#iterationsAgo').getValue() || 0;  //defaults to last iteration
    },
    getShowTimebox: function(){
      return false;
    },
    getCurrentGrid: function(){
       return this.down('#teamGrid') || null;
    },
    getCurrentGridType: function(){
       return this.getSelectedTab() + 'grid';
    },
    getUsePoints: function(){
       return this.down('#metric').getValue() === 'points';
    },
    getActiveDays: function(){
       return this.getSetting('activeDays') || 14;
    },
    getSkipZeroForEstimation: function(){
       return false;
    },
    getDoneStates: function(){
      return this.doneStates;
    },
    getSettingsFields: function(){
       var fields = this.callParent(),
            settings = this.getSettings();

            fields.push({
              xtype: 'rallynumberfield',
              name: 'activeDays',
              fieldLabel: 'Active Days',
              minValue: 1,
              maxValue: 365
            });

            var vals = this._getRangeFromSettings(settings, 'ratioEstimated');
            fields.push({
               xtype:'multislider',
               fieldLabel: Ext.String.format("Ratio Estimated  <span class=\"pct\">Red - {0}% - Yellow - {1}% - Green</span>",vals[0],vals[1]),
               labelAlign: 'top',
               labelCls: 'sliderlabel',
               name: 'ratioEstimated',
               width: 400,
               margin: 25,
               values: vals,
               increment: 5,
               minValue: 0,
               maxValue: 100,
               listeners: {
                  drag: function(sl){
                      sl.setFieldLabel(Ext.String.format("Ratio Estimated  <span class=\"pct\">Red - {0}% - Yellow - {1}% - Green</span>",sl.getValues()[0],sl.getValues()[1]));
                  }
               }
           });

           var vals = this._getRangeFromSettings(settings, 'acceptedAtSprintEnd');
           fields.push({
              xtype:'multislider',
              fieldLabel: Ext.String.format("Accepted at Sprint End  <span class=\"pct\">Red - {0}% - Yellow - {1}% - Green</span>",vals[0],vals[1]),
              labelCls: 'sliderlabel',
              labelAlign: 'top',
              name: 'acceptedAtSprintEnd',
              width: 400,
              margin: 25,
              values: vals,
              increment: 5,
              minValue: 0,
              maxValue: 100,
              listeners: {
                 drag: function(sl){
                     sl.setFieldLabel(Ext.String.format("Accepted at Sprint End   <span class=\"pct\">Red - {0}% - Yellow - {1}% - Green</span>",sl.getValues()[0],sl.getValues()[1]));
                 }
              }
          });

          var vals = this._getRangeFromSettings(settings, 'planned');
          fields.push({
             xtype:'multislider',
             fieldLabel: Ext.String.format("Planned  <span class=\"pct\">Red - {0}% - Yellow - {1}% - Green</span>",vals[0],vals[1]),
             labelAlign: 'top',
             labelCls: 'sliderlabel',
             name: 'planned',
             width: 400,
             margin: 25,
             values: vals,
             increment: 5,
             minValue: 0,
             maxValue: 100,
             listeners: {
                drag: function(sl){
                    sl.setFieldLabel(Ext.String.format("Planned  <span class=\"pct\">Red - {0}% - Yellow - {1}% - Green</span>",sl.getValues()[0],sl.getValues()[1]));
                }
             }
         });

         var vals = this._getRangeFromSettings(settings, 'velocity');
         fields.push({
            xtype:'multislider',
            fieldLabel: Ext.String.format("Actual  <span class=\"pct\">Red - {0}% - Yellow - {1}% - Green</span>",vals[0],vals[1]),
            labelAlign: 'top',
            labelCls: 'sliderlabel',
            name: 'velocity',
            width: 400,
            margin: 25,
            values: vals,
            increment: 5,
            minValue: 0,
            maxValue: 100,
            listeners: {
               drag: function(sl){
                   sl.setFieldLabel(Ext.String.format("Actual  <span class=\"pct\">Red - {0}% - Yellow - {1}% - Green</span>",sl.getValues()[0],sl.getValues()[1]));
               }
            }
        });

        var vals = this._getRangeFromSettings(settings, 'ratioInProgress');
        fields.push({
           xtype:'multislider',
           fieldLabel: Ext.String.format("Ratio In Progress  <span class=\"pct\">Green - {0}% - Yellow - {1}% - Red</span>",vals[0],vals[1]),
           labelAlign: 'top',
           labelCls: 'sliderlabel',
           name: 'ratioInProgress',
           width: 400,
           margin: 25,
           values: vals,
           increment: 5,
           minValue: 0,
           maxValue: 100,
           listeners: {
              drag: function(sl){
                  sl.setFieldLabel(Ext.String.format("Ratio In Progress  <span class=\"pct\">Green - {0}% - Yellow - {1}% - Red</span>",sl.getValues()[0],sl.getValues()[1]));
              }
           }
       });

       var vals = this._getRangeFromSettings(settings, 'acceptedAfterSprintEnd');
       fields.push({
          xtype:'multislider',
          fieldLabel: Ext.String.format("Accepted after Sprint End  <span class=\"pct\">Green - {0}% - Yellow - {1}% - Red</span>",vals[0],vals[1]),
          labelAlign: 'top',
          labelCls: 'sliderlabel',
          name: 'acceptedAfterSprintEnd',
          width: 400,
          margin: 25,
          values: vals,
          increment: 5,
          minValue: 0,
          maxValue: 100,
          listeners: {
             drag: function(sl){
                 sl.setFieldLabel(Ext.String.format("Accepted after Sprint End  <span class=\"pct\">Green - {0}% - Yellow - {1}% - Red</span>",sl.getValues()[0],sl.getValues()[1]));
             }
          }
      });


       var vals = this._getRangeFromSettings(settings, 'addedScope');
       fields.push({
          xtype:'multislider',
          fieldLabel: Ext.String.format("Added Scope  <span class=\"pct\">Green - {0}% - Yellow - {1}% - Red</span>",vals[0],vals[1]),
          labelCls: 'sliderlabel',
          labelAlign: 'top',
          name: 'addedScope',
          width: 400,
          margin: 25,
          values: vals,
          increment: 5,
          minValue: 0,
          maxValue: 100,
          listeners: {
             drag: function(sl){
                 sl.setFieldLabel(Ext.String.format("Added Scope  <span class=\"pct\">Green - {0}% - Yellow - {1}% - Red</span>",sl.getValues()[0],sl.getValues()[1]));
             }
          }
      });

      var vals = this._getRangeFromSettings(settings, 'removedScope');
      fields.push({
         xtype:'multislider',
         fieldLabel: Ext.String.format("Removed Scope  <span class=\"pct\">Green - {0}% - Yellow - {1}% - Red</span>",vals[0],vals[1]),
         labelCls: 'sliderlabel',
         name: 'removedScope',
         labelAlign: 'top',
         width: 400,
         margin: 25,
         values: vals,
         increment: 5,
         minValue: 0,
         maxValue: 100,
         listeners: {
            drag: function(sl){
                sl.setFieldLabel(Ext.String.format("Removed Scope  <span class=\"pct\">Green - {0}% - Yellow - {1}% - Red</span>",sl.getValues()[0],sl.getValues()[1]));
            }
         }
      });

      var vals = this._getRangeFromSettings(settings, 'netChurn');
      fields.push({
         xtype:'multislider',
         fieldLabel: Ext.String.format("Net Churn  <span class=\"pct\">Green - {0}% - Yellow - {1}% - Red</span>",vals[0],vals[1]),
         labelCls: 'sliderlabel',
         name: 'netChurn',
         labelAlign: 'top',
         width: 400,
         margin: 25,
         values: vals,
         increment: 5,
         minValue: 0,
         maxValue: 100,
         listeners: {
            drag: function(sl){
                sl.setFieldLabel(Ext.String.format("Net Churn  <span class=\"pct\">Green - {0}% - Yellow - {1}% - Red</span>",sl.getValues()[0],sl.getValues()[1]));
            }
         }
      });

      var vals = this._getRangeFromSettings(settings, 'plannedLoad');
      fields.push({
         xtype:'multislider',
         fieldLabel: Ext.String.format("Planned Load  <span class=\"pct\">Red - {0}% - Yellow - {1}% - Green</span>",vals[0],vals[1]),
         labelAlign: 'top',
         labelCls: 'sliderlabel',
         name: 'plannedLoad',
         width: 400,
         margin: 25,
         values: vals,
         increment: 5,
         minValue: 0,
         maxValue: 100,
         listeners: {
            drag: function(sl){
                sl.setFieldLabel(Ext.String.format("Planned Load  <span class=\"pct\">Red - {0}% - Yellow - {1}% - Green</span>",sl.getValues()[0],sl.getValues()[1]));
            }
         }
      });

      return fields;

    }
});
