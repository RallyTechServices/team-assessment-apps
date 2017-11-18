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
       plannedLoad: '59,86'
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
  },
  _initializeApp: function(){
     var selectors = [{
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
          change: this._updateView
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
          select: this._updateGrid
        }
     }];

     this.logger.log('selectors', selectors);



     this.callParent([selectors]);
  },
  getIterationsAgo: function(){
     return this.down('#iterationsAgo') && this.down('#iterationsAgo').getValue() || 0;  //defaults to last iteration
  },
  getShowTimebox: function(){
    return false;
  },
  _updateView: function(){
      this.logger.log('_updateView', this.getIterationsAgo());
      this.down('rallygrid') && this.down('rallygrid').destroy();
      this.clearAppMessage();

      if (this.getIterationsAgo() < 1 || this.getIterationsAgo() > this.maxIterationsAgo){
        this.addAppMessage("Please select a valid # Iterations Ago.");
        return;
      }

      if (!this.domainProjects || this.domainProjects.length === 0){
         this.addAppMessage("No projects in the selected domain.");
         return;
      }

      this.setLoading('Fetching Iterations...');
      this._fetchIterations(this.getIterationsAgo()).then({
        success: this._fetchData,
        failure: this._showErrorNotification,
        scope: this
      });

    },
    _fetchData: function(iterations){
        this.logger.log('_fetchData', iterations);
        var domainProjects = this.domainProjects;

        var projectIterations = this._getProjectIterations(iterations, this.getIterationsAgo());
        this.projectIterations = projectIterations;
        this.setLoading('Fetching Iteration Data...');
        Deft.Promise.all([
          this._fetchIterationCumulativeData(projectIterations),
          this._fetchArtifactData('HierarchicalRequirement', projectIterations),
          this._fetchArtifactData('Defect',projectIterations),
          this._fetchArtifactData('DefectSuite',projectIterations),
          this._fetchArtifactData('TestSet',projectIterations),
          CATS.teamassessmentapps.utils.WorkItemUtility.fetchWorkItemInfo(domainProjects)
        ]).then({
            success: this._processData,
            failure: this._showErrorNotification,
            scope: this
        }).always(function(){ this.setLoading(false); },this);

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
    _processData: function(results){
       var icfd = results[0],
            artifacts = results[1].concat(results[2]).concat(results[3]).concat(results[4]);
      this.logger.log('_processData', icfd, artifacts, results[5]);

      var cfdHash = this._getHashByField(icfd, 'IterationObjectID'),
          artifactHash = this._getHashByField(artifacts, 'Project', 'Name');

       this.logger.log('_proecessData cfdHash', cfdHash);
       var data = [];
       var workItemData = CATS.teamassessmentapps.utils.WorkItemUtility.calculateWorkItemStats(results[5], this.getActiveDays());
       this.logger.log('workItemData', workItemData, this.getActiveDays());
       Ext.Array.each(this.domainProjects, function(p){
          var iteration = this.projectIterations[p.get('Name')],
              cfdRecords = iteration ? cfdHash[iteration.ObjectID] || [] : [],
              artifacts = artifactHash[p.get('Name')] || [],
              row = Ext.create('Rally.technicalservices.utils.DomainProjectHealthModel',{
                __cfdRecords: cfdRecords,
                __iteration: iteration,
                __artifacts: artifacts,
                project: p.getData(),
                __workItemData: workItemData[p.get('Name')] || {},
                team: p.get('Name')
              });

          row.calculate(this.getUsePoints(),this.getSkipZeroForEstimation(),this.getDoneStates());
          data.push(row);
       }, this);

       this._buildGrid(data);

    },
    _updateGrid: function(){
       var usePoints = this.getUsePoints();
       this.logger.log('_updateGrid', usePoints);

       if (!this.down('rallygrid')){ return; }

       var store = this.down('rallygrid').getStore();

       store.each(function(rec){
          rec.calculate(this.getUsePoints(),this.getSkipZeroForEstimation(),this.getDoneStates());
       }, this);
       this.down('rallygrid') && this.down('rallygrid').destroy();
       this.add({
          xtype: 'rallygrid',
          store: store,
          columnCfgs: this._getColumnCfgs(usePoints),
          showPagingToolbar: false,
          showRowActionsColumn: false,
          enableBulkEdit: false
       })

    },
    _buildGrid: function(data){
        this.logger.log('_buildGrid', data);

        var store = Ext.create('Rally.data.custom.Store',{
            data: data,
            model: 'Rally.technicalservices.utils.DomainProjectHealthModel',
            pageSize: data.length,
            groupField: 'classification'
        });

        this.down('rallygrid') && this.down('rallygrid').destroy();
        this.add({
           xtype: 'rallygrid',
           store: store,
           columnCfgs: this._getColumnCfgs(this.getUsePoints()),
           showPagingToolbar: false,
           showRowActionsColumn: false,
           enableBulkEdit: false,
           features: [{
              ftype: 'grouping',
              groupHeaderTpl: '{name}'
           }]
        });

    },
    _getColumnCfgs: function(usePoints){

        var metric = this.down('#metric').getRecord().get('name');

        var cols = [{
           dataIndex: 'team',
           text: 'Team',
           flex: 1
        },{
            dataIndex: '__totalWorkItems',
            text: 'Total Work Items',
            align: 'center',
            sortable: false,
            listeners: {
                 scope: this,
                 headerclick: this._showColumnDescription
             }
         },{
            dataIndex: '__activeWorkItems',
            text: 'Active Work Items',
            sortable: false,
            align: 'center',
            listeners: {
                 scope: this,
                 headerclick: this._showColumnDescription
             }
        //  },{
        //     dataIndex: '__activeUsers',
        //     text: 'Active Users',
        //     align: 'center'
         },{
            dataIndex: '__iteration',
            text: 'Iteration',
            sortable: false,
            flex: 1,
            renderer: function(v,m,r){
               if (v && v.Name){
                   return v.Name;
               }
               return '--';
            },
            listeners: {
                 scope: this,
                 headerclick: this._showColumnDescription
             }
          }];


         if (this.getUsePoints()){
            cols.push({
               dataIndex: '__plannedVelocity',
               text: 'Iteration Planned Velocity',
               sortable: false,
               align: 'center',
               renderer: this._plannedVelocityRenderer,
               tooltip: 'The planned velocity set on the Iteration',
               toolTip: 'The planned velocity set on the Iteration',
               listeners: {
                    scope: this,
                    headerclick: this._showColumnDescription
                }
             });
             cols.push({
                dataIndex: '__ratioEstimated',
                sortable: false,
                text: '% Items Estimated',
                align: 'center',
                renderer: this._percentRenderer,
                listeners: {
                     scope: this,
                     headerclick: this._showColumnDescription
                 }
             });
             cols.push({
               dataIndex: '__planned',
                text: Ext.String.format("Actual Planned At Sprint Start ({0})", metric),
                sortable: false,
                align: 'center',
               renderer: this._pointsPctRenderer,
               listeners: {
                    scope: this,
                    headerclick: this._showColumnDescription
                }
             });

             cols.push({
               dataIndex: '__currentPlanned',
               sortable: false,
               text: Ext.String.format("Current Planned ({0})", metric),
               align: 'center',
               renderer: this._pointsPctRenderer,
               listeners: {
                    scope: this,
                    headerclick: this._showColumnDescription
                }
            });

             cols.push({
               sortable: false,
               dataIndex: '__velocity',
               text: Ext.String.format("Actual Accepted At Sprint End ({0})", metric),
               align: 'center',
               renderer: this._pointsPctRenderer,
               listeners: {
                    scope: this,
                    headerclick: this._showColumnDescription
                }
             });


         } else {
             cols.push({
               sortable: false,
               dataIndex: '__planned',
               text: Ext.String.format("Actual Planned At Sprint Start ({0})", metric),
               align: 'center',
               listeners: {
                    scope: this,
                    headerclick: this._showColumnDescription
                }
             });

             cols.push({
               sortable: false,
               dataIndex: '__currentPlanned',
               text: Ext.String.format("Current Planned ({0})", metric),
               align: 'center',
               listeners: {
                    scope: this,
                    headerclick: this._showColumnDescription
                }
            });

             cols.push({
               sortable: false,
               dataIndex: '__velocity',
               text: Ext.String.format("Actual Accepted At Sprint End ({0})", metric),
               align: 'center',
               listeners: {
                    scope: this,
                    headerclick: this._showColumnDescription
                }
             });
         }

         cols = cols.concat([{
           sortable: false,
           dataIndex: '__ratioInProgress',
            text: Ext.String.format("% Average Daily in Progress ({0})", metric),
            align: 'center',
            renderer: this._percentRenderer,
            listeners: {
                 scope: this,
                 headerclick: this._showColumnDescription
             }
        },{
          sortable: false,
          dataIndex: '__acceptedAtSprintEnd',
          text: Ext.String.format("% Accepted by Sprint End ({0})", metric),
          align: 'center',
          renderer: this._percentRenderer,
          listeners: {
               scope: this,
               headerclick: this._showColumnDescription
           }
        },{
          sortable: false,
          dataIndex: '__acceptedAfterSprintEnd',
          text: Ext.String.format("% Accepted after Sprint End ({0})", metric),
          align: 'center',
          renderer: this._percentRenderer,
          listeners: {
               scope: this,
               headerclick: this._showColumnDescription
           }
        },{
          sortable: false,
          dataIndex: '__addedScope',
          text: Ext.String.format("Added Scope ({0})", metric),
          align: 'center',
          renderer: this._scopeRenderer,
          listeners: {
               scope: this,
               headerclick: this._showColumnDescription
           }
        },{
          sortable: false,
          dataIndex: '__removedScope',
          text: Ext.String.format("Removed Scope ({0})", metric),
          align: 'center',
          renderer: this._scopeRenderer,
          listeners: {
               scope: this,
               headerclick: this._showColumnDescription
           }
        },{
          sortable: false,
          dataIndex: '__netChurn',
          text: Ext.String.format("Net Churn ({0})", metric),
          align: 'center',
          renderer: this._percentRenderer,
          listeners: {
               scope: this,
               headerclick: this._showColumnDescription
           }
        },{
          dataIndex: '__plannedLoad',
          sortable: false,
          text: 'Planning Load',
          renderer: this._percentRenderer,
          listeners: {
               scope: this,
               headerclick: this._showColumnDescription
           }
        }]);
        return cols;
    },
    _showColumnDescription: function(ct, column, evt, target_element, eOpts){
  
        var tool_tip = Rally.technicalservices.util.HealthRenderers.getTooltip(column.dataIndex);

        Ext.create('Rally.ui.tooltip.ToolTip', {
            target : target_element,
            html: tool_tip,
            autoShow: true
        });

    },
    _plannedVelocityRenderer: function(v,m,r){
      var color = v > 0 ? Rally.technicalservices.util.HealthRenderers.green : Rally.technicalservices.util.HealthRenderers.red;
      m.style = 'padding-right:7px;text-align:center;background-color:'+color;
      return v;
    },
    _percentRenderer: function(v,m,r, rowIdx, colIdx){
        var fieldName = this.columns[colIdx].dataIndex;
        if (v >= 0 && v < 2){
          var color = Rally.technicalservices.util.HealthRenderers.getCellColor(v, fieldName);
          m.style = 'padding-right:7px;text-align:center;background-color:'+color;
          return Math.round(v * 100) + ' %';
        }
        return '--';
    },
    _scopeRenderer: function(v,m,r,rowIdx, colIdx){
      var plannedPoints = r.get('__planned'),
          pct = plannedPoints ? v/plannedPoints : -1;

       var fieldName = this.columns[colIdx].dataIndex;
       if (pct >= 0){
          var color = Rally.technicalservices.util.HealthRenderers.getCellColor(pct, fieldName);
          m.style = 'padding-right:7px;text-align:center;background-color:'+color;
          return v;
       }
       return v;
    },
    _pointsPctRenderer: function(v,m,r,rowIdx, colIdx){
        var plannedVelocity = r.get('__iteration') && r.get('__iteration').PlannedVelocity,
            pct = plannedVelocity ? v/plannedVelocity : -1;
        var fieldName = this.columns[colIdx].dataIndex;
         if (pct >= 0){
            var color = Rally.technicalservices.util.HealthRenderers.getCellColor(pct, fieldName);
            m.style = 'padding-right:7px;text-align:center;background-color:'+color;
            return v;
         }
         return '--';
    },
    _export: function(){
       if (!this.down('rallygrid')){
         return;
       }

       var store = this.down('rallygrid').getStore(),
          cols = this._getColumnCfgs(this.getUsePoints());

      cols.unshift({dataIndex: 'classification', text:'Classification'});
      var data = [_.pluck(cols,'text').join(',')];

       store.each(function(r){
          var row = [];

          Ext.Array.each(cols, function(c){

            var val = r.get(c.dataIndex);
            if (Ext.isObject(val)){
               val = val._refObjectName || val.Name;
            }
            if (val < 0){
              val = '';
            }
            row.push(val);
          });
          data.push(row.join(','));
       });

       var csv = data.join('\r\n'),
          fileName = Ext.String.format('health-{0}.csv', Rally.util.DateTime.format(new Date(),'Y-m-d-h-i-s'));

       CATS.teamassessmentapps.utils.Toolbox.saveAs(csv,fileName);
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
         if (iterations.length <= iterationsAgo){
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

        return this._fetchWsapiRecords({
           model: 'Iteration',
           fetch: ['ObjectID','Name','StartDate','EndDate','Project','PlannedVelocity'],
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
