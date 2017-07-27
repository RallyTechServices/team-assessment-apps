Ext.define('Rally.technicalservices.utils.DomainProjectHealthModel', {
    extend: 'Ext.data.Model',
    logger: new Rally.technicalservices.Logger(),
    fields: [{
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
        name: '__ratioEstimated',
        defaultValue: -1
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
        name: '__plannedPoints',
        defaultValue: -1
    },{
        name: '__plannedCount',
        defaultValue: -1
    },{
        name: '__acceptedAfterSprintEndPoints',
        defaultValue: -1
    },{
        name: '__acceptedAfterSprintEndPoints',
        defaultValue: -1
    },{
        name: '__acceptedAfterSprintEndCount',
        defaultValue: -1
    },{
        name: '__acceptedAfterSprintEndCount',
        defaultValue: -1
      },{
        name: '__addedScope',
        defaultValue: -1
    },{
        name: '__removedScope',
        defaultValue: -1

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
        name: '__ratioInProgress',
        defaultValue: -1
    },{
        name: '__endAcceptanceRatio',
        defaultValue: -1 //2
    },{
        name: '__taskChurn',
        defaultValue: -2
    },{
        name: '__scopeChurn',
        defaultValue: -2
    },{
        name: '__velocity',
        defaultValue: -2
    },{
        name: '__currentVelocity',
        defaultValue: -2
    },{
        name: '__cycleTime',
        defaultValue: -2
    },{
        name: '__sayDoRatioData',
        type: 'object'
    },{
        name: '__cfdRecords',
        type: 'object'
    }],
    calculate: function(usePoints, skipZeroForEstimation, doneStates) {
        this.resetDefaults();

        if (this.get('__cfdRecords')) {
            this._processCFD(this.get('__cfdRecords'), this.get('__iteration'), usePoints, doneStates);
        }

        if (this.get('__artifacts')){
           this._mungeArtifacts(this.get('__artifacts'));
        }
    },
    resetDefaults: function(){
        this.set('__ratioInProgress',-1);
        this.set('__endCompletionRatio', -1);
        this.set('__endAcceptanceRatio'-1);
        this.set('__taskChurn', -2);
        this.set('__scopeChurn', -2);
        this.set('__cycleTime',-2);
        this.set('__acceptedAfterSprintEndCount', -1);
        this.set('__acceptedAtSprintEndCount', -1);
        this.set('__acceptedAfterSprintEndPoints', -1);
        this.set('__acceptedAtSprintEndPoints', -1);

    },
    _setError: function(){
        var errorString = 'Error';
        this.set('__ratioInProgress', errorString);
        this.set('__endAcceptanceRatio', errorString);
        this.set('__endCompletionRatio', errorString);
        this.set('__scopeChurn',errorString);
        this.set('__taskChurn',errorString);
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
                this.logger.log('cardcount',this.get('Name'),card_state,card_date, cf.CardCount, cf.CardEstimateTotal,card_task_estimate);
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

        //this.logger.log('totals',this.get('Name'),daily_totals, daily_task_estimate_totals, doneStates);

        var avg_daily_in_progress = Rally.technicalservices.util.Health.getAverageInState(daily_totals, inprogress_state);
        //this.logger.log('avg_daily_inprogress',this.get('Name'), avg_daily_in_progress)
        if (avg_daily_in_progress > 0){
            this.set('__ratioInProgress',avg_daily_in_progress);
        }

        this.set('__endAcceptanceRatio', Rally.technicalservices.util.Health.getAcceptanceRatio(daily_totals, doneStates))

        var scopeAdditions = Rally.technicalservices.util.Health.getScopeAdditions(daily_totals, usePoints);
        this.set('__addedScope', scopeAdditions);
        var scopeRemovals = Rally.technicalservices.util.Health.getScopeRemovals(daily_totals, usePoints);
        this.set('__removedScope', scopeRemovals);

        var task_churn = Rally.technicalservices.util.Health.getTaskChurn(daily_task_estimate_totals);
        //this.logger.log('__taskChurn', 'getTaskChurn', this.get('Name'), task_churn);
        if (task_churn !== null){
            this.set('__taskChurn',task_churn);
        }

        var velocity = Rally.technicalservices.util.Health.getVelocity(daily_totals, doneStates);
        this.set('__velocity', velocity);

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
        if (!card_date || ( card_date.getDay() > 0 && card_date.getDay() < 6 )){
            if (this.get('EndDate') && this.get('StartDate')){
                return (card_date <= this.get('EndDate') && card_date >= this.get('StartDate'));
            }
            return true;
        }
        return false;
    },
    _mungeArtifacts: function(records){
       var count_of_estimated_artifacts = 0;

        var this_velocity = 0,
            end_velocity = 0,
            this_count = 0,
            planned_points = 0,
            end_velocity_count = 0,
            this_velocity_count = 0;

        Ext.Array.each(records,function(artifact){
            var plan_estimate = artifact.PlanEstimate;
            planned_points += (plan_estimate || 0);
            this_count++;
            if (!Ext.isEmpty(plan_estimate) && plan_estimate >= 0) {
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

        this.set('__plannedCount', this_count);
        this.set('__plannedPoints', planned_points);
        if (planned_points){
          this.set('__acceptedAfterSprintEndPoints', (this_velocity - end_velocity)/planned_points);  // this uses velocity that is as of now
          this.set('__acceptedAtSprintEndPoints', end_velocity/planned_points);
        }

        if (this_count > 0){
            this.set('__acceptedAfterSprintEndCount', (this_velocity_count - end_velocity_count)/this_count);  // this uses velocity that is as of now
            this.set('__acceptedAtSprintEndCount', end_velocity_count/this_count);
            this.set('__ratioEstimated',count_of_estimated_artifacts/this_count);
        }
    }
});
