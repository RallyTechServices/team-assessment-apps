Ext.define('CATS.teamassessmentapps.utils.UserUtility',{
    singleton: true,
    calculateProjectUsage: function(team, projectUsers){
         var data = {
            team: team.get('Name'),
            teamMember: 0,
            viewer: 0,
            editor: 0,
            projectAdmin: 0,
            workspaceAdmin: 0,
            subscriptionAdmin: 0,
            disabled: 0,
            totalAccess: projectUsers.length
         };

         for (var i=0; i<projectUsers.length; i++){
            var pu = projectUsers[i];
            if (pu.Disabled) {
              data.disabled ++;
            } else {
              if (pu.TeamMember){ data.teamMember++; }
              if (pu.Permission === 'Viewer'){ data.viewer++; }
              if (pu.Permission === 'Editor'){ data.editor++; }
              if (pu.Permission === 'Project Admin'){ data.projectAdmin++; }
              if (pu.Permission === 'Workspace Admin'){ data.workspaceAdmin++; }
              if (pu.Permission === 'Subscription Admin'){ data.subscriptionAdmin++; }
            }
         }
         
         return data;
    },
    fetchUsersByProject: function(project_oid){
        var deferred = Ext.create('Deft.Deferred');

        this._fetchProjectPermissionsPage(project_oid, 1,1).then({
            success: function(obj){
                if (!obj){
                    deferred.resolve([]);
                } else {

                    var totalCount = obj.QueryResult && obj.QueryResult.TotalResultCount || 0,
                        pageSize = 1000,
                        promises = [];

                    for (var i=0; i<totalCount; i += pageSize){
                        var start = i+ 1;
                        promises.push(this._fetchProjectPermissionsPage(project_oid, start, pageSize));
                    }
                    Deft.Promise.all(promises).then({
                        success: function(results){
                            var users = [];
                            Ext.Array.each(results, function(r){
                                users = users.concat(r.QueryResult && r.QueryResult.Results || []);
                            });
                            deferred.resolve(users);
                        }
                    });
                }
            },
            scope: this
        });
        return deferred.promise;
    },
    _fetchProjectPermissionsPage: function(project_oid, startindex, pagesize){
        var deferred = Ext.create('Deft.Deferred');

        if (!startindex){
            startindex = 1;
        }
        if (!pagesize){
            pagesize = 2000;
        }

        Ext.Ajax.request({
            url: Ext.String.format("/slm/webservice/v2.0/project/{0}/projectusers?fetch=TeamMember,Permission,Disabled,UserName&start={2}&pagesize={1}",project_oid, pagesize, startindex),
            success: function(response){
                if (response && response.responseText){
                    var obj = Ext.JSON.decode(response.responseText);
                    deferred.resolve(obj);
                } else {
                    deferred.resolve(null);
                }
            }
        });

        return deferred.promise;
    }
});
