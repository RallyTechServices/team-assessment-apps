Ext.define("project-update-app", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    defaults: { margin: 10 },
    items: [
        {xtype:'container',itemId:'message_box',tpl:'Hello, <tpl>{_refObjectName}</tpl>'},
        {xtype:'container',itemId:'display_box'}
    ],

    integrationHeaders : {
        name : "project-update-app"
    },

    launch: function() {
      this.setLoading("Loading Projects...");

      this.projectUtility = Ext.create('CA.technicalservices.userutilities.ProjectUtility');
      this.projectUtility.initialize(this.getContext()).then({
        success: this._initializeApp,
        failure: this._showErrorNotification,
        scope: this
      }).always(function(){ this.setLoading(false); },this);
    },
    _addBoxes: function(){
        this.removeAll();

        var northBox = this.add({
            xtype:'container',
            region: 'north'
        });

        northBox.add({
            xtype: 'container',
            itemId: 'selectorBox',
            layout: 'hbox'
        });

        northBox.add({
            xtype:'container',
            itemId: 'advancedFilterBox',
            flex: 1
        });

        this.add({
            xtype:'container',
            itemId: 'gridBox',
            region: 'center',
            layout: 'fit'
        });
    },
    _initializeApp: function(projectUtility){
        this.projectUtility = projectUtility;
        this.logger.log('_initializeApp', projectUtility);

        this._addBoxes();

        var selectorBox = this.down('#selectorBox');

        var fp = selectorBox.add({
            xtype: 'fieldpickerbutton',
            modelNames: ['Project'],
            context: this.getContext(),
            margin: '10 5 10 5',
            stateful: true,
            stateId: 'grid-columns'
        });
        fp.on('fieldsupdated', this.updateStoreFields, this);

        selectorBox.add({
            xtype: 'rallyinlinefilterbutton',
            modelNames: ['Project'],
            context: this.getContext(),
            margin: '10 5 10 5',
            stateful: true,
            stateId: 'grid-filters-3',
            listeners: {
                inlinefilterready: this.addInlineFilterPanel,
                inlinefilterchange: this.updateGridFilters,
                scope: this
            }
        });

        this.buildGrid();
    },
    addInlineFilterPanel: function(panel){
        this.down('#advancedFilterBox').add(panel);
    },
    updateStoreFields: function(fields){
        //console.log('updateStoreFields', fields)
        this.buildGrid();
    },
    updateGridFilters: function(filter){
        this.logger.log('updateGridFilters', filter);
        this.down('#selectorBox').doLayout();
        this.buildGrid();
    },

    buildGrid: function(){
      this.down('#gridBox').removeAll();

      var fields = this.down('fieldpickerbutton').getFields() || undefined;
      
      this.down('#gridBox').add({
        xtype: 'rallygrid',
        store: Ext.create('Rally.data.wsapi.Store',{
           model: 'Project',
           fetch: fields,
           filters: this.getFilters()
        }),
        columnCfgs: this._getColumnCfgs(fields),
        enableBulkEdit: true
      });

    },
    getFilters: function(){
        var filters = null;

        // var advancedFilters = this.down('rallyinlinefilterbutton').getWsapiFilter();
        var filterButton = this.down('rallyinlinefilterbutton');
        if (filterButton && filterButton.inlineFilterPanel && filterButton.getWsapiFilter()){
            filters = filterButton.getWsapiFilter();
        }

        if (filters){
          filters = filters.and({
            property: 'State',
            value: 'Open'
          });
        } else {
          filters = [{
            property: 'State',
            value: 'Open'
          }];
        }
        return filters || [];
    },
    _getColumnCfgs: function(fields){

      var projectUtility = this.projectUtility;
       var cols =  [{
         dataIndex: 'Name',
         text: 'Name',
         flex: 1
       },{
         dataIndex: 'ObjectID',
         text: 'Project Path',
         flex: 2,
         align: 'left',
         renderer: function(v){
            return projectUtility.getProjectHierarchy(v);
         }
       }];

       Ext.Array.each(fields, function(f){
          if (f!== 'Name' && f!== 'ObjectID'){
            var textVal = f.replace('c_','');
            cols.push({
              dataIndex: f,
              text: textVal
            });
          }
       });
       return cols;
    },
    _showErrorNotification: function(msg){
       this.logger.log('_showErrorNotification', msg);
       Rally.ui.notify.Notifier.showError({message: msg});
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
    }

});
