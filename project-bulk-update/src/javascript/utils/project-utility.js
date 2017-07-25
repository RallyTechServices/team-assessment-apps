Ext.define('CA.technicalservices.userutilities.ProjectUtility',{

    initialize: function(context){
        var deferred = Ext.create('Deft.Deferred');

        this.fetchProjectsInWorkspace(context.getWorkspace().ObjectID).then({
            success: function(records){
              this.initializeRecords(records);
              deferred.resolve(this);
            },
            failure: function(msg){
                deferred.reject(msg);
            },
            scope: this
        });

        return deferred;
    },
    getAllProjects: function(){
        //in current workspace
        return Ext.Object.getValues(this.projectHash);
    },

    fetchProjectsInWorkspace: function(workspaceOid){
        var deferred = Ext.create('Deft.Deferred');

        Ext.create('Rally.data.wsapi.Store',{
            model: 'Project',
            fetch: ['ObjectID','Name','Parent','Workspace'],
            limit: Infinity,
            context: {workspace: '/workspace/' + workspaceOid, project: null},
            compact: false,
            filters: [{
                property: 'State',
                value: 'Open'
            }],
            sorters: [{
                property: 'ObjectID',
                direction: 'ASC'
            }]
        }).load({
            callback: function(records, operation){
                if (operation.wasSuccessful()){
                    //todo - parse out projects that the user is a project admin or higher to or
                    //projects that are parents to that
                  deferred.resolve(records);

                } else {
                    deferred.reject("Error loading project structure for workspace " + workspaceOid + ": " + operation.error.errors.join(','));
                }
            }
        });
        return deferred.promise;
    },
    initializeRecords: function(records){
        var hash = {},
            rootProjects = [];

        Ext.Array.each(records, function(r){
            hash[r.get('ObjectID')] = r.getData();
            hash[r.get('ObjectID')].children = [];
        });

        Ext.Object.each(hash, function(oid, projectData){
            projectData.__projectHierarchy = this._buildProjectHierarchy(oid,hash);
            var parentID = projectData.Parent && projectData.Parent.ObjectID || null;

            if (!parentID || !hash[parentID]){
                rootProjects.push(projectData);
            } else {
                var parentModel = hash[parentID];
                parentModel.children.push(projectData);
            }
        }, this);
        this.projectHash = hash;
        this.rootProjects = rootProjects;
    },
    getProjectTreeData: function(){
        //This is an attempt to deep clone the root projects structure.
        var newRootProjects = (JSON.parse(JSON.stringify(this.rootProjects)));
        return newRootProjects; //CA.technicalservices.userutilities.ProjectUtility.rootProjects;
    },
    getProjectHierarchy: function(ObjectID){
        var projectHierarchy = this.projectHash[ObjectID] && this.projectHash[ObjectID].__projectHierarchy;
        var path = [];

        Ext.Array.each(projectHierarchy, function(p){
           path.push(this.projectHash[p].Name);
        }, this);

        return path.join(' | ');

        return 'pj';
    },
    _buildProjectHierarchy: function(projectID, projectHash){
        var parent = projectHash[projectID].Parent && projectHash[projectID].Parent.ObjectID || null;

        var projectHierarchy = [projectID];
        if (parent){
            do {
                projectHierarchy.unshift(parent);
                parent = projectHash[parent] &&
                    projectHash[parent].Parent &&
                    projectHash[parent].Parent.ObjectID || null;

            } while (parent);
        }
        return projectHierarchy;

    }
});
