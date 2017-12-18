Ext.define('Rally.technicalservices.utils.DomainProjectHealthModel', {
    extend: 'Ext.data.Model',
    logger: new Rally.technicalservices.Logger(),
    fields: [{
        name: 'project',
        type: 'object'
      },{
        name: 'classification'
    },{
        name: 'team'
    },{
        name: '__iteration',
        type: 'object'
    },{
        name: '__cfdRecords',
        type: 'object'
    },{
        name: '__artifacts',
        type: 'object'
      },{
          name: '__plannedLoad',
          defaultValue: -1
       },{
           name: '__ratioEstimated',
           defaultValue: -1
       },{
          name: '__planned',
          defaultValue: -1
      },{
          name: '__currentPlanned',
          defaultValue: -1
      },{
          name: '__velocity',
          defaultValue: -1
      },{
          name: '__acceptedAfterSprintEnd',
          defaultValue: -1
      },{
          name: '__acceptedAfterSprintEnd',
          defaultValue: -1
      },{
          name: '__addedScope',
          defaultValue: 0
      },{
          name: '__removedScope',
          defaultValue: 0
        },{
            name: '__ratioInProgress',
            defaultValue: -1
        },{
            name: '__currentVelocity',
            defaultValue: -2
        },{
            name: '__workItemData',
            type: 'object'
        },{
          name: '__plannedLoad',
          defaultValue: -1
        },{
          name: '__netChurn',
          defaultValue: -1
      },{
        name: '__activeWorkItems',
        convert: function(value, record){
            if (record.get('__workItemData') && record.get('__workItemData').activeSnaps ){
                return record.get('__workItemData').activeSnaps;
            } else {
                return '--';
            }
        }
    },{
      name: '__totalWorkItems',
      convert: function(value, record){
          if (record.get('__workItemData') && record.get('__workItemData').totalSnaps ){
              return record.get('__workItemData').totalSnaps;
          } else {
              return '--';
          }
      }
    },{
      name: '__activeUsers',
      convert: function(value, record){
          if (record.get('__workItemData') && record.get('__workItemData').activeUsers ){
              return record.get('__workItemData').activeUsers;
          } else {
              return '--';
          }
      }
    },{
      name: '__lastUpdatedWorkItem',
      convert: function(value, record){
          if (record.get('__workItemData') && record.get('__workItemData').latestUpdate ){
              return record.get('__workItemData').latestUpdate;
          } else {
              return '--';
          }
      }

    },{
      name: '__plannedVelocity',
      convert: function(value, record){
          if (record.get('__iteration') && record.get('__iteration').PlannedVelocity ){
              return record.get('__iteration').PlannedVelocity;
          } else {
              return '--';
          }
      }

    },{
         name: '__days',
         convert: function(value, record){
             if (record.get('__iteration') && record.get('__iteration').EndDate && record.get('__iteration').EndDate){
                 return Rally.technicalservices.util.Health.daysBetween(record.get('__iteration').EndDate,record.get('__iteration').StartDate,true);
             } else {
                 return '--';
             }
         }
    },{
      name: '__activeScheduledIntoIteration',
      convert: function(value, record){
        if (record.get('__workItemData') && record.get('__workItemData').snaps && record.get('__workItemData').snaps.length > 0 ){
            var scheduledSnaps = _.filter(record.get('__workItemData').snaps, function(s){
               return s.Iteration > 0;
            });
            return scheduledSnaps.length;
        } else {
            return '--';
        }
      }
    },{
      name: '__activePortfolioItemCount',
      convert: function(value, record){
        if (record.get('__workItemData') && record.get('__workItemData').snaps && record.get('__workItemData').snaps.length > 0 ){
            var snaps = _.filter(record.get('__workItemData').snaps, function(s){
               return /PortfolioItem/.test(s._TypeHierarchy.slice(-1)[0]);
            });
            return snaps.length;
        } else {
            return '--';
        }
      }
    },{
      name: '__activeStoryCount',
      convert: function(value, record){
        if (record.get('__workItemData') && record.get('__workItemData').snaps && record.get('__workItemData').snaps.length > 0 ){
            var snaps = _.filter(record.get('__workItemData').snaps, function(s){
               return s._TypeHierarchy.slice(-1)[0] === 'HierarchicalRequirement';
            });
            return snaps.length;
        } else {
            return '--';
        }
      }
    },{
      name: '__activeDefectCount',
      convert: function(value, record){
        if (record.get('__workItemData') && record.get('__workItemData').snaps && record.get('__workItemData').snaps.length > 0 ){
            var snaps = _.filter(record.get('__workItemData').snaps, function(s){
               return s._TypeHierarchy.slice(-1)[0] === 'Defect';
            });
            return snaps.length;
        } else {
            return '--';
        }
      }
    },{
      name: '__activeTestCaseCount',
      convert: function(value, record){
        if (record.get('__workItemData') && record.get('__workItemData').snaps && record.get('__workItemData').snaps.length > 0 ){
            var snaps = _.filter(record.get('__workItemData').snaps, function(s){
               return s._TypeHierarchy.slice(-1)[0] === 'TestCase';
            });
            return snaps.length;
        } else {
            return '--';
        }
      }
    },{
      name: '__activeTaskCount',
      convert: function(value, record){
        if (record.get('__workItemData') && record.get('__workItemData').snaps && record.get('__workItemData').snaps.length > 0 ){
            var snaps = _.filter(record.get('__workItemData').snaps, function(s){
               return s._TypeHierarchy.slice(-1)[0] === 'Task';
            });
            return snaps.length;
        } else {
            return '--';
        }
      }
    }],
    initialize: function(){
      this.resetDefaults();
      console.log('workitemdata', this.get('__workItemData'));
      var classification = 'inactive';
      if (this.get('project') && this.get('project').Summary && this.get('project').Summary.Children &&
          this.get('project').Summary.Children.State &&  this.get('project').Summary.Children.State.Open > 0){
         classification = 'program';
      } else {
        if (this.get('__workItemData') && this.get('__workItemData').activeSnaps  > 0){
            classification = "other";
            if (this.get('__iteration') && this.get('__plannedVelocity') > 0 && this.get('__iteration').PlanEstimate > 0){
                 classification = "scrum";
            }
        }
      }
      this.set('classification', classification);
    },

    updateScrumData: function(iteration, cfdRecords, artifacts, usePoints, skipZeroForEstimation, doneStates, projects) {

        this.set('__cfdRecords', cfdRecords);
        this.set('__artifacts', artifacts);
        this.set('__iteration', iteration);

        this.recalculate(usePoints, skipZeroForEstimation, doneStates, projects);

    },
    recalculate: function(usePoints, skipZeroForEstimation, doneStates, projects){
      this.resetDefaults();

      if (this.get('__cfdRecords')) {
          this._processCFD(this.get('__cfdRecords'), this.get('__iteration'), usePoints, doneStates);
      }

      if (this.get('__artifacts')){
         this._mungeArtifacts(this.get('__artifacts'), usePoints);
      }

      var netChurn = 0;
      if (this.get('__planned') > 0){
         var addedScope = this.get('__addedScope') || 0,
             removedScope = this.get('__removedScope') || 0;
         netChurn = Math.abs(addedScope - removedScope)/this.get('__planned');
      }
      this.set('__netChurn', netChurn);

      if (this.get('__plannedVelocity') > 0){
        var planningLoad = this.get('__planned')/this.get('__plannedVelocity');
        this.set('__plannedLoad', planningLoad);
      }

    },
    resetDefaults: function(){
        this.set('__ratioEstimated',-1);
        this.set('__planned', -1);
        this.set('__velocity'-1);
        this.set('__acceptedAfterSprintEnd', -1);
        this.set('__acceptedAtSprintEnd', -1);
        this.set('__addedScope',-1);
        this.set('__removedScope',-1);
    },
    _setError: function(){
        var errorString = 'Error';
        this.set('__ratioEstimated',errorString);
        this.set('__planned', errorString);
        this.set('__velocity',errorString);
        this.set('__acceptedAfterSprintEnd', errorString);
        this.set('__acceptedAtSprintEnd', errorString);
        this.set('__addedScope',errorString);
        this.set('__removedScope',errorString);
    },
    _processCFD: function(records, iteration, usePoints, doneStates){

        var daily_totals = {},
            daily_task_estimate_totals = {},
            counter = 0;

        Ext.Array.each(records, function(cf) {
            var card_date = cf.CreationDate; //cf.get('CreationDate');

            if (this._isValidDate(card_date)){
                var card_total = cf.CardEstimateTotal || 0,
                    card_state = cf.CardState,
                    card_task_estimate = cf.TaskEstimateTotal || 0;

                if (usePoints === false){
                    card_total = cf.CardCount || 0;
                }
                if (!daily_totals[card_date]){
                    daily_totals[card_date] = {};
                }
                if (!daily_task_estimate_totals[card_date]){
                    daily_task_estimate_totals[card_date] = {};
                }

                if (!daily_totals[card_date][card_state]){
                    daily_totals[card_date][card_state] = 0;
                }
                if (!daily_task_estimate_totals[card_date][card_state]){
                    daily_task_estimate_totals[card_date][card_state] = 0;
                }
                daily_totals[card_date][card_state] += card_total;
                daily_task_estimate_totals[card_date][card_state] += card_task_estimate;
            }
        }, this);

        var completed_state = "Completed",
            inprogress_state = "In-Progress",
            days = this.get('__days');

        var avg_daily_in_progress = Rally.technicalservices.util.Health.getAverageInState(daily_totals, inprogress_state);
        if (avg_daily_in_progress > 0){
            this.set('__ratioInProgress',avg_daily_in_progress);
        }

        var scopeAdditions = Rally.technicalservices.util.Health.getScopeAdditions(daily_totals, usePoints);
        this.set('__addedScope', scopeAdditions);
        var scopeRemovals = Rally.technicalservices.util.Health.getScopeRemovals(daily_totals, usePoints);
        this.set('__removedScope', scopeRemovals);
        var velocity = Rally.technicalservices.util.Health.getVelocity(daily_totals, doneStates);
        this.set('__velocity', velocity);

        var planned = Rally.technicalservices.util.Health.getPlanned(daily_totals);
        this.set('__planned', planned);

    },
    /**
     * _isValidDate determines whether or not to use this card in the calculations.  This
     * checks for weekends and if the date is within the sprint
     *
     * @param card_date
     * @returns {boolean}
     * @private
     */
    _isValidDate: function(card_date) {
        //NOTE: original app returns true of there is no start or end date in the iteration.
        var startDate = this.get('__iteration').StartDate,
            endDate = this.get('__iteration').EndDate;

        if (!card_date || ( card_date.getDay() > 0 && card_date.getDay() < 6 )){

            if (endDate && startDate){
                return (card_date <= endDate && card_date >= startDate);
            }
            return true;
        }
        return false;
    },
    _mungeArtifacts: function(records, usePoints){
       var count_of_estimated_artifacts = 0;

        var this_velocity = 0,
            end_velocity = 0,
            this_count = 0,
            planned_points = 0,
            end_velocity_count = 0,
            this_velocity_count = 0;

        if (!this.get('__iteration')){
           return;
        }

        Ext.Array.each(records,function(artifact){
            var plan_estimate = artifact.PlanEstimate;
            planned_points += (plan_estimate || 0);
            this_count++;
            if ((!Ext.isEmpty(plan_estimate) && plan_estimate >= 0) || !usePoints) {
                  count_of_estimated_artifacts++;
                  if (artifact.AcceptedDate){
                      this_velocity += plan_estimate;
                      this_velocity_count++;
                      if (artifact.AcceptedDate <= this.get('__iteration').EndDate){
                          end_velocity += plan_estimate;
                          end_velocity_count++;
                      }
                  }
            }
        }, this);

        if (usePoints){
        this.set('__currentPlanned', planned_points);
          if (planned_points){
            this.set('__acceptedAfterSprintEnd', (this_velocity - end_velocity)/planned_points);  // this uses velocity that is as of now
            this.set('__acceptedAtSprintEnd', end_velocity/planned_points);
          }
        } else {
          this.set('__currentPlanned', this_count);
          if (this_count){
            this.set('__acceptedAfterSprintEnd', (this_velocity_count - end_velocity_count)/this_count);  // this uses velocity that is as of now
            this.set('__acceptedAtSprintEnd', end_velocity_count/this_count);
          }
        }

        if (this_count > 0){
            this.set('__ratioEstimated',count_of_estimated_artifacts/this_count);
        }
    }
});
