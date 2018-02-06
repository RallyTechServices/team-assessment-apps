Ext.define("CATS.teamassessmentapps.app.DomainApp", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    defaults: { margin: 10 },

    config: {
      defaultSettings: {
        projectDomainField: null,
        useDashboardTimeboxScope: false
      }
    },

    launch: function() {
      this.logger.log('launch', this.getSettings());
      this._initializeApp();
    },
    getShowTimebox: function(){
      return true;
    },
    getProjectDomainField: function(){
      this.logger.log('getProjectDomainField', this.getSetting('projectDomainField'));
       return this.getSetting('projectDomainField') || null;
    },
    getUseDashboardTimeboxScope: function(){
       var useDashboardScope = this.getSetting('useDashboardTimeboxScope') || 'false';
       if (this.getContext().getTimeboxScope()){
         return useDashboardScope === true || useDashboardScope.toLowerCase() === 'true'
       }
       return false;
    },
    getTimebox: function(){
       this.logger.log('getTimebox', this.getUseDashboardTimeboxScope(), this.getContext().getTimeboxScope());
       if (this.getUseDashboardTimeboxScope()){

         var startDateField = "StartDate",
            endDateField = "EndDate";

         if (this.getContext().getTimeboxScope().type.toLowerCase() === 'release'){
            startDateField = "ReleaseStartDate";
            endDateField = "ReleaseDate";
         }

         return {
            startDate: this.getContext().getTimeboxScope().getRecord().get(startDateField),
            endDate: this.getContext().getTimeboxScope().getRecord().get(endDateField)
         }

       }
       return {
          startDate: this.down('#startDate').getValue(),
          endDate: new Date()
       }

    },
    onTimeboxScopeChange: function(timeboxScope){
       this.getContext().setTimeboxScope(timeboxScope);
       this.logger.log('onTimeboxScopeChange', timeboxScope,this.getUseDashboardTimeboxScope(),timeboxScope.getRecord());
       if (!this.getUseDashboardTimeboxScope()){ return; }

       if (!timeboxScope.getRecord()){
          Rally.ui.notify.Notifier.showWarning({message: "Please select a timebox."});
       } else {
         this._updateView();
       }
    },
    addAppMessage: function(msg){
       this.add({
         xtype: 'container',
         itemId: 'appMessage',
         html: '<div class="no-data-container"><div class="secondary-message">' + msg + '</div></div>'
       });
    },
    clearAppMessage: function(){
       if (this.down('#appMessage')){
         this.down('#appMessage').destroy();
       }
    },
    _initializeApp: function(args){
      this.logger.log('_initializeApp', args);
      this.removeAll();
      var selectorBox = this.add({
        itemId: 'selectorBox',
        xtype: 'container',
        layout: 'hbox'
      });

       if (this.getProjectDomainField()){
          var pd = selectorBox.add({
            xtype: 'rallyfieldvaluecombobox',
            fieldLabel: 'Team Domain',
            labelAlign: 'right',
            model: 'Project',
            margin: 10,
            multiSelect: true,
            emptyText: 'Project Scope',
            width: 250,
            labelWidth: 75,
            field: this.getProjectDomainField(),
            allowClear: true
          });

          //Hack to remove the NoEntry option from the dropdown.  The alternative is to override the combobox
          pd.on('ready', function(cb){
            var idx = cb.getStore().findBy(function(r){return r.get('value') == ""});
            cb.getStore().removeAt(idx);
          },this);
          pd.on('change', this._updateDomainProjects, this);
       }

       if (args){
          Ext.Array.each(args, function(a){
             selectorBox.add(a);
          });
       }

       if (!this.getUseDashboardTimeboxScope() && this.getShowTimebox()){
           var tbStart = selectorBox.add({
             xtype: 'rallydatefield',
             itemId: 'startDate',
             fieldLabel: "Start Date",
             labelAlign: 'right',
             margin: 10,
             value: Rally.util.DateTime.add(new Date(), 'day', -14)
           });
           tbStart.on('select', this._updateView, this);
       }

         // selectorBox.add({
         //   xtype: 'rallybutton',
         //   text: 'Update',
         //   margin: 10,
         //   handler: this._updateView,
         //   scope: this
         // });

         selectorBox.add({
           xtype: 'rallybutton',
           iconCls: 'icon-export',
           margin: 10,
           cls: 'secondary rly-small',
           handler: this._export,
           scope: this
         });

        this._updateDomainProjects();
    },
    _export: function(){
      this._showErrorNotification("Please implement the _export method.");
    },
    _updateDomainProjects: function(pdCombo, newValue, oldValue){
        this.logger.log('_updateDomainProjects newValue', newValue, oldValue);

        var pdDomain = newValue || [];
        this.domainProjects = null;
        if (this.domainProjectsLoading){ return; }
        this.domainProjectsLoading = true;

        if (pdDomain.length > 0){
           //get the teams
           this.logger.log('_updateDomainProjects', pdDomain.length);
          var projectDomainField = this.getProjectDomainField(),
             domainOperator = "contains"; //TODO if this is multi-select field, we need to use contains

           var filters = _.map(pdDomain, function(d){
                return {
                   property: projectDomainField,
                   operator: domainOperator,
                   value: d
                };
           });

           if (filters.length > 1){
              filters = Rally.data.wsapi.Filter.or(filters);
           } else {
              filters = Ext.create('Rally.data.wsapi.Filter', filters[0]);
           }
           filters = filters.and({
             property: 'State',
             value: 'Open'
           });

           this.logger.log('Project Filters', filters.toString());
           var fetch = ['ObjectID','Name','Children:summary[State]'];
           if (this.getProjectDomainField()){
              fetch.push(this.getProjectDomainField());
           }
           this._fetchWsapiRecords({
              model: 'Project',
              filters: filters,
              fetch: fetch,
              limit: 'Infinity'
           }).then({
             success: function(projects){
                this.domainProjects = projects;
                this._updateView();
             },
             failure: this._showErrorNotification,
             scope: this
           }).always(function(){
              this.domainProjectsLoading = false;
           },this);
        } else {
           //follow the project scope
           this.domainProjects = null;
           this.logger.log('_updateDomainProjects no domain selected');
           var parentFilters = [],
              properties = ['Parent'],
              projectRef = this.getContext().getProject()._ref;

           for (var i=0; i<8; i++){
              parentFilters.push({
                property: properties.join('.'),
                value: projectRef
              });
              properties.push('Parent');
           }

           parentFilters.push({
             property: 'ObjectID',
             value: this.getContext().getProject().ObjectID
           });

           parentFilters = Rally.data.wsapi.Filter.or(parentFilters);
           parentFilters.and({
             property: 'State',
             value: 'Open'
           });

           this.logger.log('Project Filters', parentFilters.toString());
           this._fetchWsapiRecords({
              model: 'Project',
              filters: parentFilters,
              fetch: ['ObjectID','Name','Children:summary[State]'],
              limit: 'Infinity'
           }).then({
             success: function(projects){
                this.domainProjects = projects;
                this._updateView();
             },
             failure: this._showErrorNotification,
             scope: this
           }).always(function(){
              this.domainProjectsLoading = false;
           },this);
        }
    },
    _updateView: function(){
        this._showErrorNotification("Please implement the _updateView method.");
    },
    _showErrorNotification: function(msg){
      this.setLoading(false);
      Rally.ui.notify.Notifier.showError({message: msg});
    },
    _fetchWsapiRecords: function(config){
       var deferred = Ext.create('Deft.Deferred');
       this.logger.log('_fetchWsapiRecords', config && config.filters && config.filters.toString());
       if (!config.limit){
         config.limit = "Infinity";
       }
       if (!config.pageSize){
         config.pageSize = 2000;
       }

       config.enablePostGet = true;
       config.context = {project: null}

       Ext.create('Rally.data.wsapi.Store',config).load({
         callback: function(records, operation, success){
            if (success){
              deferred.resolve(records);
            } else {
              deferred.reject(operation.error.errors.join(','));
            }
         }
       });
       return deferred;
    },
    getSettingsFields: function(){
        var fields = [{
          xtype: 'rallyfieldcombobox',
          fieldLabel: 'Project Domain Field',
          model: 'Project',
          labelWidth: 150,
          labelAlign: 'right',
          labelCls: 'sliderlabel',
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
          },
          listeners:{
             ready: function(cb){
                cb.getStore().add({name: '-- Follow Project Scope --', value: null});
             }
          }
        }];

        if (this.getShowTimebox()){
          fields.push({
            xtype: 'rallycheckboxfield',
            fieldLabel: 'Follow Dashboard Timebox Scope',
            name: 'useDashboardTimeboxScope'
          });
        }
        return fields;
    },
    getOptions: function() {
        return [
            {
                text: 'About...',
                handler: this._launchInfo,
                scope: this
            }
        ];
    },

    _launchInfo: function() {
        if ( this.about_dialog ) { this.about_dialog.destroy(); }
        this.about_dialog = Ext.create('Rally.technicalservices.InfoLink',{});
    },

    isExternal: function(){
        return typeof(this.getAppId()) == 'undefined';
    },
    _fetchDoneStates: function(){
       var deferred = Ext.create('Deft.Deferred');
       Rally.data.ModelFactory.getModel({
           type: 'HierarchicalRequirement',
           success: function(model) {
               var field = model.getField('ScheduleState');
               field.getAllowedValueStore().load({
                   callback: function(records, operation, success) {
                       if (success){
                           var values = [];
                           for (var i=records.length - 1; i > 0; i--){
                               values.push(records[i].get('StringValue'));
                               if (records[i].get('StringValue') == "Accepted"){
                                   i = 0;
                               }
                           }
                           deferred.resolve(values);
                       } else {
                           deferred.reject('Error loading ScheduleState values for User Story:  ' + operation.error.errors.join(','));
                       }
                   },
                   scope: this
               });
           },
           failure: function() {
               var error = "Could not load schedule states";
               deferred.reject(error);
           }
       });
       return deferred.promise;
   }

});
