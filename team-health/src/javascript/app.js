Ext.define("team-health", {
  extend: 'CATS.teamassessmentapps.app.DomainApp',

  maxIterationsAgo: 9,
  doneStates: ['Accepted'],

  thresholds: {

  },


  _initializeApp: function(){
     var items = [{
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
     }];
     this.callParent(items);
  },
  getIterationsAgo: function(){
     return this.down('#iterationsAgo') && this.down('#iterationsAgo').getValue() || 0;  //defaults to last iteration
  },
  getShowTimebox: function(){
    return false;
  },
  _updateView: function(){
      this.logger.log('_updateView', this.getIterationsAgo());
      if (this.getIterationsAgo() < 1 || this.getIterationsAgo() > this.maxIterationsAgo){
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

        var projectIterations = this._getProjectIterations(iterations, this.getIterationsAgo());
        this.projectIterations = projectIterations;
        this.setLoading('Fetching Iteration Data...');
        Deft.Promise.all([
          this._fetchIterationCumulativeData(projectIterations),
          this._fetchArtifactData('HierarchicalRequirement', projectIterations),
          this._fetchArtifactData('Defect',projectIterations),
          this._fetchArtifactData('DefectSuite',projectIterations),
          this._fetchArtifactData('TestSet',projectIterations)
        ]).then({
            success: this._processData,
            failure: this._showErrorNotification,
            scope: this
        }).always(function(){ this.setLoading(false); },this);

    },
    getUsePoints: function(){
       return true;
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
      this.logger.log('_processData', icfd, artifacts)

      var cfdHash = this._getHashByField(icfd, 'IterationObjectID'),
          artifactHash = this._getHashByField(artifacts, 'Project', 'Name');

       this.logger.log('_proecessData cfdHash', cfdHash);
       var data = [];
       Ext.Array.each(this.domainProjects, function(p){
          var iteration = this.projectIterations[p.get('Name')],
              cfdRecords = iteration ? cfdHash[iteration.ObjectID] || [] : [],
              artifacts = artifactHash[p.get('Name')] || [],
              row = Ext.create('Rally.technicalservices.utils.DomainProjectHealthModel',{
              __cfdRecords: cfdRecords,
              __iteration: iteration,
              __artifacts: artifacts,
              team: p.get('Name')
          });
          row.calculate(this.getUsePoints(),this.getSkipZeroForEstimation(),this.getDoneStates());
          data.push(row);
       }, this);

       this._buildGrid(data);

    },
    _buildGrid: function(data){
        this.logger.log('_buildGrid', data);

        var store = Ext.create('Rally.data.custom.Store',{
            data: data,
            model: 'Rally.technicalservices.utils.DomainProjectHealthModel',
            pageSize: data.length
        });

        this.down('rallygrid') && this.down('rallygrid').destroy();
        this.add({
           xtype: 'rallygrid',
           store: store,
           columnCfgs: this._getColumnCfgs(),
           showPagingToolbar: false,
           showRowActionsColumn: false,
           enableBulkEdit: false
        })

    },
    _getColumnCfgs: function(){
        return [{
           dataIndex: 'team',
           text: 'Team',
           flex: 1
        },{
           dataIndex: '__iteration',
           text: 'Iteration',
           flex: 1,
           renderer: function(v,m,r){
              if (v && v.Name){
                  return v.Name;
              }
              return '--';
           }
         },{
            dataIndex: '__plannedVelocity',
            text: 'Iteration Planned Velocity',
            align: 'center'
          },{
            dataIndex: '__plannedPoints',
            text: 'Actual Planned Points',
            align: 'center',
            renderer: this._plannedPointsRenderer
          },{
            dataIndex: '__ratioEstimated',
            text: 'Estimated Ratio',
            align: 'center',
            renderer: this._percentRenderer
         },{
            dataIndex: '__ratioInProgress',
            text: 'Average Daily In Progress',
            align: 'center',
            renderer: this._percentRenderer
        },{
          dataIndex: '__acceptedAtSprintEndPoints',
          text: 'Accepted At Sprint End (Points)',
          align: 'center',
          renderer: this._percentRenderer
        },{
          dataIndex: '__acceptedAfterSprintEndPoints',
          text: 'Accepted After Sprint End (Points)',
          align: 'center',
          renderer: this._percentRenderer
        },{
          dataIndex: '__addedScope',
          text: 'Added Scope (Points)',
          align: 'center',
          renderer: this._scopeRenderer
        },{
          dataIndex: '__removedScope',
          text: 'Removed Scope (Points)',
          align: 'center',
          renderer: this._scopeRenderer
        }];
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
    _scopeRenderer: function(v,m,r){
      var plannedPoints = r.get('__plannedPoints'),
          pct = plannedPoints ? v/plannedPoints : -1;

       if (pct >= 0){
          var color = Rally.technicalservices.util.HealthRenderers.getCellColor(pct, '__addedScope');
          m.style = 'padding-right:7px;text-align:center;background-color:'+color;
          return v;
       }
       return v;
    },
    _plannedPointsRenderer: function(v,m,r){
        var plannedVelocity = r.get('__iteration') && r.get('__iteration').PlannedVelocity,
            pct = plannedVelocity ? v/plannedVelocity : -1;

         if (pct >= 0){
            var color = Rally.technicalservices.util.HealthRenderers.getCellColor(pct, '__plannedPoints');
            m.style = 'padding-right:7px;text-align:center;background-color:'+color;
            return v;
         }
         return '--';
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
        filters = Rally.data.wsapi.Filter.or(filters);
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
    }

});
