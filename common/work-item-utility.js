Ext.define('CATS.teamassessmentapps.utils.WorkItemUtility',{
    singleton: true,
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
                 workItemCreation: []
              };
           }
           var day = Rally.util.DateTime.format(Rally.util.DateTime.fromIsoString(snap.CreationDate),'Y-m-d');
           snaps[prj].workItemCreation.push(day);

           snaps[prj].totalSnaps++;
           var dt = Rally.util.DateTime.fromIsoString(snap._ValidFrom);
           if (dt >= activeDate){
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
    fetchWorkItemInfo: function(projects){
      var deferred = Ext.create('Deft.Deferred');
      var project_oids = Ext.Array.map(projects, function(p){ return p.get('ObjectID'); });

      Ext.create('Rally.data.lookback.SnapshotStore', {
          find: {
             _TypeHierarchy: {$in: ['Artifact']},
             Project: {$in: project_oids},
             __At: "current"
          },
          fetch: ['ObjectID','Project','_TypeHierarchy','_ValidFrom','_User','CreationDate'],
          hydrate: ['_TypeHierarchy','Project'],
          removeUnauthorizedSnapshots: true,
          limit: 'Infinity',
          useHttpPost: true,
          sorters: {"_ValidFrom": -1}
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
