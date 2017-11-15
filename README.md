# team-assessment-apps
A suite of tools to support team assessments for users, activity, data quality, health, etc

These apps were designed for organizations that might want to see projects grouped together that are not necessarily in line
with the other projects in their hierarchy.  To do this, these apps support the concept of a "Domain", which is a virtual
group of projects that are grouped together by a custom field on the project.  In this case, this app will ignore project
scope and run at an scope.  The Domain field can be a dropdown list field or a Multi-value Dropdown list field on the Project.  

If a domain field is configured in the App settings, these apps will provide a dropdown box to select the appropriate domain.  If no
domain field is configured, then the app will follow the project scope.  In this case, the app must be run at a parent level or higher and
will not work at the project leaf node.  

One or more domains may be selected for each app. 


The "Project Update App" can be used to assign a domain in bulk.  This app is found here:
https://github.com/RallyTechServices/team-assessment-apps/tree/master/project-bulk-update

The "Team Users View" app will show user types on a project basis (permissions, team members and also work items and active users).  
https://github.com/RallyTechServices/team-assessment-apps/tree/master/team-users

The "Team Domain Health" app will show health metrics on a project basis
https://github.com/RallyTechServices/team-assessment-apps/tree/master/team-health
