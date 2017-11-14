// Ext.define("CATS.teamassessmentapps.app.DomainApp", {
//     extend: 'Rally.app.App',
//     componentCls: 'app',
//     logger: new Rally.technicalservices.Logger(),
//     defaults: { margin: 10 },
//
//     config: {
//       defaultSettings: {
//         projectDomainField: null,
//         useDashboardTimeboxScope: false
//       }
//     },
//
//     launch: function() {
//       this.logger.log('launch', this.getSettings());
//         this._initializeApp();
//     },
//     getProjectDomainField: function(){
//       this.logger.log('getProjectDomainField', this.getSetting('projectDomainField'));
//        return this.getSetting('projectDomainField') || null;
//     },
//     getUseDashboardTimeboxScope: function(){
//        var useDashboardScope = this.getSetting('useDashboardTimeboxScope') || 'false';
//        if (this.getContext().getTimeboxScope()){
//          return useDashboardScope === true || useDashboardScope.toLowerCase() === 'true'
//        }
//        return false;
//     },
//     getTimebox: function(){
//        this.logger.log('getTimebox', this.getUseDashboardTimeboxScope(), this.getContext().getTimeboxScope());
//        if (this.getUseDashboardTimeboxScope()){
//          var startDateField = "StartDate",
//             endDateField = "EndDate";
//          if (this.getContext().getTimeboxScope().type.toLowerCase() === 'release'){
//             startDateField = "ReleaseStartDate";
//             endDateField = "ReleaseDate";
//          }
//
//          return {
//             startDate: this.getContext().getTimeboxScope().getRecord().get(startDateField),
//             endDate: this.getContext().getTimeboxScope().getRecord().get(endDateField)
//          }
//        }
//        return {
//           startDate: this.down('#startDate').getValue(),
//           endDate: new Date()
//        }
//
//     },
//     onTimeboxScopeChange: function(timeboxScope){
//        this.getContext().setTimeboxScope(timeboxScope);
//        this.logger.log('onTimeboxScopeChange', timeboxScope,this.getUseDashboardTimeboxScope(),timeboxScope.getRecord());
//        if (!this.getUseDashboardTimeboxScope()){ return; }
//
//        if (!timeboxScope.getRecord()){
//           Rally.ui.notify.Notifier.showWarning({message: "Please select a timebox."});
//        } else {
//          this._updateView();
//        }
//     },
//     _initializeApp: function(){
//
//       this.removeAll();
//       var selectorBox = this.add({
//         itemId: 'selectorBox',
//         xtype: 'container',
//         layout: 'hbox'
//       });
//
//        if (this.getProjectDomainField()){
//           var pd = selectorBox.add({
//             xtype: 'rallyfieldvaluecombobox',
//             fieldLabel: 'Team Domain',
//             labelAlign: 'right',
//             model: 'Project',
//             margin: 10,
//             field: this.getProjectDomainField(),
//             allowNoEntry: true,
//             noEntryText: '-- Follow Project Scope --'
//           });
//           pd.on('select', this._updateDomainProjects, this);
//        }
//
//        if (!this.getUseDashboardTimeboxScope()){
//            var tbStart = selectorBox.add({
//              xtype: 'rallydatefield',
//              itemId: 'startDate',
//              fieldLabel: "Start Date",
//              labelAlign: 'right',
//              margin: 10,
//              value: Rally.util.DateTime.add(new Date(), 'day', -14)
//            });
//            tbStart.on('select', this._updateView, this);
//          }
//
//          var bt = selectorBox.add({
//            xtype: 'rallybutton',
//            iconCls: 'icon-export',
//            margin: 10,
//            cls: 'secondary rly-small'
//          });
//          bt.on('click', this._export, this);
//
//     },
//     _export: function(){
//       this._showErrorNotification("Please implement the _export method.");
//     },
//     _updateDomainProjects: function(pdCombo){
//         var pdDomain = pdCombo && pdCombo.getValue();
//         this.logger.log('_updateView', pdDomain);
//
//         if (pdDomain){
//            //get the teams
//            var filters = [{
//              property: 'State',
//              value: 'Open'
//            },{
//              property: this.getProjectDomainField(),
//              value: pdDomain
//            }];
//            this.logger.log('Project Filters', filters);
//            this._fetchWsapiRecords({
//               model: 'Project',
//               filters: filters,
//            }).then({
//              success: function(projects){
//                 this.domainProjects = projects;
//                 this._updateView();
//              },
//              failure: this._showErrorNotification,
//              scope: this
//            });
//         } else {
//            //follow the project scope
//            this.domainProjects = null;
//            this._updateView();
//         }
//     },
//     _updateView: function(){
//         this._showErrorNotification("Please implement the _updateView method.");
//     },
//     _showErrorNotification: function(msg){
//       Rally.ui.notify.Notifier.showError({message: msg});
//     },
//     _fetchWsapiRecords: function(config){
//        var deferred = Ext.create('Deft.Deferred');
//
//        if (!config.limit){
//          config.limit = "Infinity";
//        }
//        if (!config.pageSize){
//          config.pageSize = 2000;
//        }
//
//        Ext.create('Rally.data.wsapi.Store',config).load({
//          callback: function(records, operation, success){
//             if (success){
//               deferred.resolve(records);
//             } else {
//               deferred.reject(operation.error.errors.join(','));
//             }
//          }
//        });
//
//        return deferred;
//     },
//     getSettingsFields: function(){
//         return [{
//           xtype: 'rallyfieldcombobox',
//           fieldLabel: 'Project Domain Field',
//           model: 'Project',
//           name: 'projectDomainField',
//           allowBlank: true,
//           noEntryText: '-- Follow Project Scope --',
//           emptyText: '-- Follow Project Scope --',
//           _isNotHidden: function(field) {
//
//             if (field && !field.readOnly &&
//                   field.attributeDefinition &&
//                   field.attributeDefinition.Constrained &&
//                   field.attributeDefinition.Custom){
//                 return true;
//             }
//             return false;
//           }
//         },{
//           xtype: 'rallycheckboxfield',
//           fieldLabel: 'Follow Dashboard Timebox Scope',
//           name: 'useDashboardTimeboxScope'
//         }];
//     },
//     getOptions: function() {
//         return [
//             {
//                 text: 'About...',
//                 handler: this._launchInfo,
//                 scope: this
//             }
//         ];
//     },
//
//     _launchInfo: function() {
//         if ( this.about_dialog ) { this.about_dialog.destroy(); }
//         this.about_dialog = Ext.create('Rally.technicalservices.InfoLink',{});
//     },
//
//     isExternal: function(){
//         return typeof(this.getAppId()) == 'undefined';
//     }
//
// });
