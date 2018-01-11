Ext.define('CATS.teamassessmentapps.utils.WorkItemUtility',{
    singleton: true,
    calculateWorkItemStatsWsapi: function(records, activeOffset){
        var snaps = {},
            activeDate = Rally.util.DateTime.add(new Date(), 'day', -activeOffset);

        for (var i=0; i<records.length; i++){
           var snap = snapshots[i].getData();
           var prj = snap.Project.Name;
           if (!snaps[prj]){
              snaps[prj] = {
                 totalSnaps: 0,
                 activeSnaps: 0,
                 snaps: [], //activeSnaps
                 latestUpdate: new Date(1900,01,01)
              };
           }

           snaps[prj].totalSnaps++;
           var dt = Rally.util.DateTime.fromIsoString(snap.LastUpdateDate);
           if (dt > snaps[prj].latestUpdate){
               snaps[prj].latestUpdate = dt;
           }
           if (dt >= activeDate){
             snaps[prj].snaps.push(snap);
             snaps[prj].activeSnaps++;
           }
        }
        return snaps;

    },
    calculateWorkItemStats: function(snapshots, activeOffset){
        var snaps = {},
            activeDate = Rally.util.DateTime.add(new Date(), 'day', -activeOffset);

        for (var i=0; i<snapshots.length; i++){
           var snap = snapshots[i].getData();
           var prj = snap.Project.Name;
           if (!snaps[prj]){
              snaps[prj] = {
                 totalSnaps: 0,
                 activeSnaps: 0,
                 activeUsers: [],
                 snaps: [], //activeSnaps
                 workItemCreation: [],
                 latestUpdate: new Date(1900,01,01)
              };
           }
           var day = Rally.util.DateTime.format(Rally.util.DateTime.fromIsoString(snap.CreationDate),'Y-m-d');
           snaps[prj].workItemCreation.push(day);


           snaps[prj].totalSnaps++;
           var dt = Rally.util.DateTime.fromIsoString(snap._ValidFrom);
           if (dt > snaps[prj].latestUpdate){
               snaps[prj].latestUpdate = dt;
           }
           if (dt >= activeDate){
             snaps[prj].snaps.push(snap);
             snaps[prj].activeSnaps++;
             snaps[prj].activeUsers.push(snap._User)
           }
        }


        Ext.Object.each(snaps, function(p,obj){
           obj.activeUsers = _.uniq(obj.activeUsers).length;
           obj.workItemCreation = this._arrayToHashCount(obj.workItemCreation)
        }, this);

        return snaps;

    },
    _arrayToHashCount: function(ar){
       var hash = {};

       ar = Ext.Array.sort(ar);

       for (var i=0; i<ar.length; i++){
          if (!hash[ar[i]]){
            hash[ar[i]] = 0;
          }
          hash[ar[i]]++;
       }
       return hash;
    },
    fetchWorkItemInfoWsapi: function(projects){
      var deferred = Ext.create('Deft.Deferred');
      var project_oids = Ext.Array.map(projects, function(p){ return {property: 'Project.ObectID', value: p.get('ObjectID')}; });
      var filters = Rally.data.wsapi.Filter.or(project_oids);

      Ext.create('Rally.data.wsapi.Store', {
          filters: filters,
          model: 'SchedulableArtifact',
          fetch: ['ObjectID','Project','Name','CreationDate','Iteration','LastUpdateDate'],
          limit: 'Infinity',
          enablePostGet: true,
          sorters: [{
             property: "LastUpdateDate",
             direction: "DESC"
          }]
      }).load({
         callback: function(records, operation, success){
            if (operation.wasSuccessful()){
              deferred.resolve(records);
            } else {
              var msg = operation && operation.error && operation.error.errors && operation.error.errors.join(',') || "Unknown error fetching work item data.";
            //msg += "<br/>There could be an issue with the Lookback API.  Please turn off Show Work Item Data in the App Settings and try again."
              deferred.reject(msg);
            }
         }
      });
      return deferred.promise;
    },
    fetchWorkItemInfo: function(projects){
      var deferred = Ext.create('Deft.Deferred');
      var project_oids = Ext.Array.map(projects, function(p){ return p.get('ObjectID'); });

      Ext.create('Rally.data.lookback.SnapshotStore', {
          find: {
             _TypeHierarchy: {$in: ['Artifact']},
             Project: {$in: project_oids},
             __At: "current"
          },
          fetch: ['ObjectID','Project','_TypeHierarchy','_ValidFrom','_User','CreationDate','Iteration'],
          hydrate: ['_TypeHierarchy','Project'],
          removeUnauthorizedSnapshots: true,
          limit: 'Infinity',
          useHttpPost: true,
          sorters: [{
             property: "_ValidFrom",
             direction: "DESC"
          }]
      }).load({
         callback: function(records, operation, success){
            if (operation.wasSuccessful()){
              deferred.resolve(records);
            } else {
              var msg = operation && operation.error && operation.error.errors && operation.error.errors.join(',') || "Unknown error fetching work item data.";
              msg += "<br/>There could be an issue with the Lookback API.  Please turn off Show Work Item Data in the App Settings and try again."
              deferred.reject(msg);
            }
         }
      });
      return deferred.promise;
    }
});
