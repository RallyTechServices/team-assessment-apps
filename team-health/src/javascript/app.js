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
       plannedLoad: '50,75',
       sdCycleTime: '10,25',
       sdWIP: '10,25'
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
  /**
     adds component specific to this app
  **/
  _initializeApp: function(){

     var selectors = [{
       xtype: 'rallybutton',
       text: 'Update',
       handler: this._updateViewButton,
       margin: 10,
       scope: this,
       itemId: 'updateButton'
     },{
       xtype: 'rallybutton',
       text: 'Scrum',
       itemId: 'classicficationBtn-scrum',
       margin: '10 -1 10 25',
       pressed: true,
       cls: 'primary rly-small',
       iconCls: 'icon-graph',
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
       iconCls: 'icon-board',
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
       iconCls: 'icon-portfolio',
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
       margin: '10 -1 10 -1',
       cls: 'secondary rly-small',
       iconCls: 'icon-box',
       toggleGroup: 'classificationView',
       style: {
          borderBottomLeftRadius: 0,
          borderTopLeftRadius: 0
       },
       toggleHandler: this._tabChange,
       scope: this
     },{
       xtype: 'rallybutton',
       text: 'Summary',
       itemId: 'classicficationBtn-summary',
       margin: '10 10 10 -1',
       pressed: false,
       cls: 'secondary rly-small',
       toggleGroup: 'classificationView',
       toggleHandler: this._tabChange,
       style: {
          borderBottomRightRadius: 0,
          borderTopRightRadius: 0
       },
       scope: this
     },{
       xtype:'rallynumberfield',
       itemId: 'iterationsAgo',
       fieldLabel: '# Iterations Ago',
       labelAlign: 'right',
       labelWidth: 100,
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
        labelWidth: 50,
        itemId: 'metric',
        labelAlign: 'right',
        margin: 10,
        listeners: {
          scope: this,
          select: this._updateUsePoints
        }
     }];

    // this.logger.log('selectors', selectors);
     this.callParent([selectors]);
  },
  _tabChange: function(btn, pressed){

     var btns = this.query('rallybutton[toggleGroup=classificationView]');
    // this.logger.log('_tabChange', btns.length);
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
      this._clearView();
      this.otherDataLoaded = false;
      this.scrumDataLoaded = false;
      this.classificationDataLoaded = false;
      this.data = null;
      this.addAppMessage("Click Update to load team data.")
      this.down('#updateButton').focus();
  },

  _updateViewButton: function(){

    this.logger.log('_updateView', this.getIterationsAgo(), this.domainProjects);
    this._clearView();
    this.otherDataLoaded = false;
    this.scrumDataLoaded = false;
    this.down('#iterationsAgo').setValue(null);

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

  /**
      _fetchClassificationData
      Fetchs minimum data needed to classify teams as Scrum, Other, Program or Inactive.
      The classification is needed up front so taht we can filter the data we retrieve for the classified teams.
  **/
  _fetchClassificationData: function(projectIterations){
    this.projectIterations = projectIterations;
    var domainProjects = this.domainProjects;

    this.logger.log('_fetchClassificationData', projectIterations,domainProjects);

    this.setLoading('Fetching Team data...');
    CATS.teamassessmentapps.utils.WorkItemUtility.fetchWorkItemInfo(domainProjects).then({
      success: this._initializeData,
      failure: this._showErrorNotification,
      scope: this
    }).always(function(){ this.setLoading(false); },this);
  },

  /**
      _initializeData
      Initializes the classification data and creates the models.  After data has been initialized, then
      we can fetch the other data nad the initial scrum data
  **/
    _initializeData: function(workItemData){
      this.logger.log('_initializeData', workItemData);
      var data = [];
      var workItemInfo = CATS.teamassessmentapps.utils.WorkItemUtility.calculateWorkItemStats(workItemData, this.getActiveDays());
      this.logger.log('_initializeData.workItemInfo', workItemInfo, this.getActiveDays());
      Ext.Array.each(this.domainProjects, function(p){
         var iteration = this.projectIterations[p.get('Name')],
               domain = this.getProjectDomainField() ? p.get(this.getProjectDomainField()) : "",
             row = Ext.create('Rally.technicalservices.utils.DomainProjectHealthModel',{
               __iteration: iteration,
               __workItemData: workItemInfo[p.get('Name')] || {},
               project: p.getData(),
               team: p.get('Name'),
               domain: domain
             });

         row.initialize()
         data.push(row);
      }, this);
      this.data = data ;
      this.classificationDataLoaded = true;

      this._displaySelectedView();


      // this.setLoading('Fetching Other and Scrum data...');
      // Deft.Promise.all([
      //   this._fetchOtherData(this.getActiveDays()),
      //   this._fetchScrumData(this.projectIterations)
      // ], this).then({
      //    success: this._displaySelectedView,
      //    failure: this._showErrorNotification,
      //    scope: this
      // }).always(function(){ this.setLoading(false); },this);
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

    _fetchOtherData: function(activeDays){
      var deferred = Ext.create('Deft.Deferred');

      //Now, only get data for the iterations in teams that we classified as scrum
      var otherTeams = _.filter(this.data, function(d){
         return d.get('classification') === 'other';
      }).map(function(d){
         return d.get('project').ObjectID;
      });

      if (otherTeams && otherTeams.length > 0){
        var projectFilters = _.map(otherTeams, function(t){
           return {
               property: 'Project.ObjectID',
               value: t
           };
        });

        if (projectFilters.length > 1){
           projectFilters = Rally.data.wsapi.Filter.or(projectFilters);
        } else {
           projectFilters = Ext.create('Rally.data.wsapi.Filter',projectFilters[0]);
        }
        // projectFilters = projectFilters.and({
        //    property: 'ScheduleState',
        //    value: 'Defined'
        // });

        var fromActiveDate = Rally.util.DateTime.toIsoString(Rally.util.DateTime.add(new Date(),'day',-activeDays));

        this.logger.log('_fetchHistory teams', otherTeams, fromActiveDate);
        this.setLoading('Fetching Other data...');
        Deft.Promise.all([
          this._fetchHistory(fromActiveDate, otherTeams),
          this._fetchWsapiRecords({
            model: 'HierarchicalRequirement',
            fetch: ['FormattedID','PlanEstimate','Project','Name','ScheduleState'],
            filters: projectFilters.and({
                property: 'ScheduleState',
                value: 'Defined'
            }),
            sorters: {
               property: 'CreationDate',
               direction: 'ASC'
            }
          }),
          this._fetchWsapiRecords({
            model: 'HierarchicalRequirement',
            fetch: ['FormattedID','PlanEstimate','InProgressDate','AcceptedDate','Project','Name'],
            filters: projectFilters.and({
                property: 'AcceptedDate',
                operator: '>=',
                value: fromActiveDate
            }),
            sorters: {
               property: 'CreationDate',
               direction: 'ASC'
            }
          })
        ],this).then({
            success: function(results){
                this._processOtherData(results);
                deferred.resolve();
            },
            failure: deferred.reject,
            scope: this
        }).always(function(){ this.setLoading(false); },this);
      } else {
         deferred.resolve();
      }
      return deferred.promise;
    },
    _fetchHistory: function(fromActiveDate, teams){
       var deferred = Ext.create('Deft.Deferred');

       Ext.create('Rally.data.lookback.SnapshotStore', {
          fetch: ['FormattedID','PlanEstimate','ScheduleState','_ValidFrom','_ValidTo'],
          filters: [{
             property: 'Project',
             operator: 'in',
             value: teams
          },{
             property: 'ScheduleState',
             value: 'In-Progress'
          },{
             property: '_ValidTo',
             operator: '>=',
             value: fromActiveDate
          },{
             property: '_TypeHierarchy',
             operator: 'in',
             value: ['HierarchicalRequirement']
          }],
          removeUnauthorizedSnapshots: true,
          limit: 'Infinity',
          hydrate: ['ScheduleState','Project'],
          useHttpPost: true,
          sorters: [{
             property: '_ValidTo',
             direction: 'ASC'
          }]
       }).load({
          callback: function(snapshots, operation){
             if(operation.wasSuccessful()){
               deferred.resolve(snapshots);
             } else {
               deferred.reject('Error loading history: ' + operation.error.errors.join(','));
             }
          }
       });
       return deferred.promise;
    },
    _processOtherData: function(results){
        this.logger.log('_processOtherData', results);
        var history = results[0],
            definedItems = results[1],
            acceptedItems = results[2];

        var historyHash = this._getHashByField(history,'Project','Name'),
              definedHash = this._getHashByField(definedItems,'Project','Name'),
              acceptedHash = this._getHashByField(acceptedItems, 'Project','Name');



        Ext.Array.each(this.data, function(d){

          var projectName = d.get('team'),
              isOther = d.get('classification') === 'other',
              history = historyHash[projectName] || [],
              definedRecords = definedHash[projectName] || [],
              acceptedRecords = acceptedHash[projectName] || [];

           if (isOther){
             d.updateOtherData(history, definedRecords, acceptedRecords, this.getActiveDays(), this.getUsePoints(),this.getSkipZeroForEstimation());
           }
        }, this);

        this.otherDataLoaded = true;
    },
    /**
      BEGIN Scrum data collection
    */
    _fetchScrumData: function(projectIterations){
      this.projectIterations = projectIterations || this.projectIterations;

      //Now, only get data for the iterations in teams that we classified as scrum
      var scrumTeams = _.filter(this.data, function(d){
         return d.get('classification') === 'scrum';
      }).map(function(d){
         return d.get('project').ObjectID;
      });

      var relvantIterations = _.filter(projectIterations, function(i){
         return Ext.Array.contains(scrumTeams, i.Project.ObjectID);
      });


      this.setLoading('Fetching Iteration Data...');
      Deft.Promise.all([
        this._fetchIterationCumulativeData(relvantIterations),
        this._fetchArtifactData('HierarchicalRequirement', relvantIterations),
        this._fetchArtifactData('Defect',relvantIterations),
        this._fetchArtifactData('DefectSuite',relvantIterations),
        this._fetchArtifactData('TestSet',relvantIterations)
      ]).then({
          success: this._processScrumData,
          failure: this._showErrorNotification,
          scope: this
      }).always(function(){ this.setLoading(false); },this);
    },
    hasScrumTeams: function(){
      var scrumTeamsExist = _.find(this.data, function(d){
         return d.get('classification') === 'scrum';
      });
      return scrumTeamsExist && true;
    },
    hasOtherTeams: function(){
      var teamsExist = _.find(this.data, function(d){
         return d.get('classification') === 'other';
      });
      return teamsExist && true;
    },
    hasOtherData: function(){
       //if there are no scrum teams, this will return true
       //if there are scrum teams, then this will return true if there is data loaded

       if (!this.hasOtherTeams()){
          return true;
       }
       return this.otherDataLoaded;
    },
    hasScrumData: function(){
       //if there are no scrum teams, this will return true
       //if there are scrum teams, then this will return true if there is data loaded

       if (!this.hasScrumTeams()){
          return true;
       }

       return this.scrumDataLoaded;
    },
    _processScrumData: function(results){

      var icfd = results[0],
           artifacts = results[1].concat(results[2]).concat(results[3]).concat(results[4]);

     this.logger.log('_processScrumData', icfd, artifacts);

     var cfdHash = this._getHashByField(icfd, 'IterationObjectID'),
         artifactHash = this._getHashByField(artifacts, 'Project', 'Name');


      Ext.Array.each(this.data, function(d){

        var projectName = d.get('team'),
            isScrum = d.get('classification') === 'scrum',
            iteration = this.projectIterations[projectName],
            cfdRecords = iteration ? cfdHash[iteration.ObjectID] || [] : [],
            artifacts = artifactHash[projectName] || [];

         if (isScrum){
           d.updateScrumData(iteration, cfdRecords, artifacts, this.getUsePoints(),this.getSkipZeroForEstimation(),this.getDoneStates());
         }
      }, this);

      this.scrumDataLoaded = true;
      if (this.getSelectedTab() === 'scrum'){
          this._addGrid(this.data);
      }

    },
    // END SCRUM DATA PROCESSING
    _clearView: function(){
      this.clearAppMessage();

      if (this.down('#teamGrid')){
         this.down('#teamGrid').destroy();
      }

      if (this.down('#charts')){
        this.down('#charts').destroy();
      }
    },
    _displaySelectedView: function(){
      if (!this.classificationDataLoaded){
         this._updateView();
         return;
      }

       var tab  = this.getSelectedTab(),
           isScrum = tab === 'scrum',
           isOther = tab === 'other',
           isSummary = tab === 'summary';
      this.logger.log('_displaySelectedView', tab);

      this._clearView();

      this.down('#iterationsAgo') && this.down('#iterationsAgo').setVisible(isScrum);
      this.down('#metric') && this.down('#metric').setVisible(isScrum || isOther || isSummary);


       if (tab === 'scrum' && this.getIterationsAgo() < 1 || this.getIterationsAgo() > this.maxIterationsAgo){
         if (this.hasScrumTeams()){
           this.addAppMessage("Please select a valid # Iterations Ago between 1 and " + this.maxIterationsAgo + ".");
         } else {
           this.addAppMessage("No teams classified as 'Scrum' exist in the selected scope or domain.");
         }
         return;
       }

       this.logger.log('_displaySelectedView ', isOther, isSummary, this.otherDataLoaded);
       if ((isOther || isSummary) && !this.hasOtherData()){
          this._fetchOtherData(this.getActiveDays()).then({
            success: this._displaySelectedView,
            failure: this._showErrorNotification,
            scope: this
          });
          this.logger.log('_displaySelectedView return', isOther, isSummary, this.otherDataLoaded);
          return;
       }

       if (isOther && !this.hasOtherTeams()){
         this.addAppMessage("No teams classified as 'Other' exist in the selected scope or domain.");
         return;
       }

       if (tab === 'summary' && !this.hasScrumData()){
         this.addAppMessage("Please navigate to the Scrum tab and select and iterations ago to load Scrum data for the desired iteration.");
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

      this._clearView();

      this.logger.log('_addGrid', gridtype, data);


      filteredData = Ext.Array.filter(data, function(d){
          return tab === 'summary' || d.get('classification') === tab;
      });

      if (!filteredData || filteredData.length === 0){
         this.addAppMessage("No teams found for the selected classification.");
         return;
      }

      if (tab === 'summary'){
          filteredData = _.sortBy(filteredData, function(d){
              return d.get('team');
          });

          this._addSummaryCharts(filteredData);
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
    _addSummaryCharts: function(data){



        var scrumChartData = this._getChartObjectDef(filteredData, 'scrum'),
            otherChartData = this._getChartObjectDef(filteredData, 'other');

        this.add({
           xtype: 'container',
           itemId: 'charts',
           layout: 'hbox',
           items: [
             scrumChartData,
             otherChartData
           ]
        });
    },
    _getChartObjectDef: function(data, type){
      var colors = [Rally.technicalservices.util.HealthRenderers.red,
                      Rally.technicalservices.util.HealthRenderers.yellow,
                      Rally.technicalservices.util.HealthRenderers.green,
                      Rally.technicalservices.util.HealthRenderers.grey];

      var chartData = this._getChartData(data,type,colors),
          typeDisplay = type[0].toUpperCase() + type.substring(1);

      if (chartData){
         return {
            chartColors: colors,
            xtype: 'rallychart',
            width: '50%',
            loadMask: false,
            chartConfig: {
                chart: {type: 'pie'},
                title: {
                  text: typeDisplay,
                  style: {
                      color: 'black',
                      fontFamily: 'ProximaNovaSemiBold',
                      fontSize: '14px',
                      textTransform: 'uppercase'
                  },
                  margin: 0
                },
                plotOptions: {
                  pie: {
                    showInLegend: false,
                    size: 200,
                    tooltip: {
                      headerFormat: "",
                      pointFormat: '<span style="color:{point.color}">\u25CF</span><b>{point.y}</b>'
                    },
                    dataLabels: {
                       enabled: true,
                       format: '{point.percentage:.1f} %',
                       distance: -25,
                       style: {
                           color: 'black',
                           fontFamily: 'ProximaNovaSemiBold',
                           fontSize: '14px'
                       }
                   }
                    }
                }
            },
            chartData: chartData
         };
      }
      return {
         xtype: 'container',
         html: '<div class="no-data-container"><div class="secondary-message">No data for ' + typeDisplay + ' teams.</div></div>',
         width: '33%'
      };

    },
    _getChartData: function(data, type, colors){
      var filteredData =  Ext.Array.filter(data, function(d){
            return d.get('classification') === type;
      });

      var seriesData = [];
      Ext.Array.each(colors, function(c){
        var total = _.reduce(filteredData, function(tot, d){
           var hIdx = d.get('__healthIndex');
           tot += (hIdx && hIdx[c] || 0);
           return tot;
        },0);
        seriesData.push(total);
      });

      if (seriesData.length === 0 || Ext.Array.sum(seriesData) === 0){
         return null;
      }

        return {
           series: [{
              name: 'Health',
              colorByPoint: true,
              data: seriesData
          }]
        };
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

      if (!iterationsAgo){
         iterationsAgo = 1;
      }

      Ext.Array.each(iterations, function(i){
         if (!projectIterations[i.get('Project').Name]){
           projectIterations[i.get('Project').Name] = [];
         }
         projectIterations[i.get('Project').Name].push(i.getData());
      });


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
    /**
      _fetchIterations
      Fetches the iterations for the domain projects getting the latest iterations per the iterations ago setting.
      RETURNS: a hash of iteration by project name
    **/
    _fetchIterations: function(iterationsAgo){
        //if we are initializing and no iterations ago is sent in, then we will
        //just get the most recent iteration for each team
        var deferred = Ext.create('Deft.Deferred');

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
        this._fetchWsapiRecords({
           model: 'Iteration',
           fetch: ['ObjectID','Name','StartDate','EndDate','Project','PlannedVelocity','PlanEstimate'],
           filters: filters,
           sorters: {
              property: 'EndDate',
              direction: 'DESC'
           },
           pageSize: pageSize,
           limit: pageSize
        }).then({
            success: function(iterations){
              var projectIterations = this._getProjectIterations(iterations, iterationsAgo);
              deferred.resolve(projectIterations);
            },
            failure: this._showErrorNotification,
            scope: this
        });

        return deferred.promise;

    },
    _fetchArtifactData: function(model, projectIterations){

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
      //  this.logger.log('_getRangeFromSettings', val);
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

       var range = this._getRangeFromSettings(settings, 'netChurn');
       Rally.technicalservices.util.HealthRenderers.metrics.__netChurn.green = range[0];
       Rally.technicalservices.util.HealthRenderers.metrics.__netChurn.yellow = range[1];

       var range = this._getRangeFromSettings(settings, 'plannedLoad');
       Rally.technicalservices.util.HealthRenderers.metrics.__plannedLoad.green = range[1];
       Rally.technicalservices.util.HealthRenderers.metrics.__plannedLoad.yellow = range[0];

       var range = this._getRangeFromSettings(settings, 'sdCycleTime');
       Rally.technicalservices.util.HealthRenderers.metrics.__plannedLoad.green = range[0];
       Rally.technicalservices.util.HealthRenderers.metrics.__plannedLoad.yellow = range[1]

       var range = this._getRangeFromSettings(settings, 'sdWIP');
       Rally.technicalservices.util.HealthRenderers.metrics.__plannedLoad.green = range[0];
       Rally.technicalservices.util.HealthRenderers.metrics.__plannedLoad.yellow = range[1]
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

      var vals = this._getRangeFromSettings(settings, 'sdCycleTime');
      fields.push({
         xtype:'multislider',
         fieldLabel: Ext.String.format("Cycle Time CoV  <span class=\"pct\">Green - {0}% - Yellow - {1}% - Red</span>",vals[0],vals[1]),
         labelAlign: 'top',
         labelCls: 'sliderlabel',
         name: 'sdCycleTime',
         width: 400,
         margin: 25,
         values: vals,
         increment: 5,
         minValue: 0,
         maxValue: 100,
         listeners: {
            drag: function(sl){
                sl.setFieldLabel(Ext.String.format("Cycle Time CoV  <span class=\"pct\">Green - {0}% - Yellow - {1}% - Red</span>",sl.getValues()[0],sl.getValues()[1]));
            }
         }
      });

      var vals = this._getRangeFromSettings(settings, 'sdWIP');
      fields.push({
         xtype:'multislider',
         fieldLabel: Ext.String.format("WIP CoV  <span class=\"pct\">Green - {0}% - Yellow - {1}% - Red</span>",vals[0],vals[1]),
         labelAlign: 'top',
         labelCls: 'sliderlabel',
         name: 'sdWIP',
         width: 400,
         margin: 25,
         values: vals,
         increment: 5,
         minValue: 0,
         maxValue: 100,
         listeners: {
            drag: function(sl){
                sl.setFieldLabel(Ext.String.format("WIP CoV  <span class=\"pct\">Green - {0}% - Yellow - {1}% - Red</span>",sl.getValues()[0],sl.getValues()[1]));
            }
         }
      });

      return fields;

    }
});
