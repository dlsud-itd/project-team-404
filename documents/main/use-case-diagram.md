# HabitFlow Use-Case Diagram

**Version:** 1.0.0  
**Created:** 2026-09-24  
**Last Updated:** 2026-11-25

This diagram separates public account flows from authenticated task-management flows. All registered-user cases operate on data owned by that user.

```mermaid
%%{init: {"flowchart": {"htmlLabels": true, "curve": "basis", "nodeSpacing": 25, "rankSpacing": 35}}}%%
flowchart LR
    guest(["Guest"])
    user(["Registered User"])

    subgraph public["Public Account Flows"]
        register(["Register"])
        login(["Sign In"])
        recover(["Reset Password"])
        validateEmail(["Validate Email"])
        verifyCredentials(["Verify Credentials"])

        register -. "<<include>>" .-> validateEmail
        login -. "<<include>>" .-> verifyCredentials
        login -. "<<extend>>" .-> recover
    end

    subgraph account["Account Management"]
        profile(["Update Profile"])
        settings(["Configure Preferences"])
        theme(["Choose Theme"])
        signOut(["Sign Out"])

        settings -. "<<include>>" .-> theme
    end

    subgraph projects["Project Management"]
        projectsPage(["List Projects"])
        projectCrud(["Create / Edit Project"])
        projectOrganize(["Favorite / Archive / Reorder"])

        projectsPage -. "<<include>>" .-> projectCrud
        projectsPage -. "<<include>>" .-> projectOrganize
    end

    subgraph tasks["Task Management"]
        tasksPage(["List Tasks"])
        taskCrud(["Create / Edit / Complete / Delete"])
        schedule(["Set Dates & Recurrence"])
        organize(["Assign Priority & Labels"])
        reorder(["Drag & Drop Reorder"])
        archiveTask(["Archive / Restore / Delete"])

        tasksPage -. "<<include>>" .-> taskCrud
        tasksPage -. "<<include>>" .-> schedule
        tasksPage -. "<<include>>" .-> organize
        tasksPage -. "<<extend>>" .-> reorder
        tasksPage -. "<<extend>>" .-> archiveTask
    end

    subgraph planning["Planning and Progress"]
        dashboard(["View Dashboard"])
        search(["Global Search"])
        filter(["Filter & Sort"])
        listView(["List View"])
        boardView(["Kanban Board"])
        timeline(["Gantt Timeline"])
        streaks(["View Streaks"])

        dashboard -. "<<include>>" .-> listView
        dashboard -. "<<extend>>" .-> boardView
        dashboard -. "<<extend>>" .-> timeline
        dashboard -. "<<extend>>" .-> streaks
    end

    subgraph archive["Archive"]
        archivePage(["Review Archived Items"])
        restore(["Restore Item"])
        purge(["Permanently Remove Item"])

        archivePage -. "<<include>>" .-> restore
        archivePage -. "<<extend>>" .-> purge
    end

    guest --> register
    guest --> login
    guest --> recover

    user --> profile
    user --> settings
    user --> signOut
    user --> projectsPage
    user --> tasksPage
    user --> dashboard
    user --> search
    user --> filter
    user --> archivePage

    classDef actor fill:#202938,color:#FFFFFF,stroke:#111827,stroke-width:2px
    classDef usecase fill:#F8FAFC,color:#17212B,stroke:#596579,stroke-width:1px

    class guest,user actor
    class register,login,recover,validateEmail,verifyCredentials,profile,settings,theme,signOut,projectsPage,projectCrud,projectOrganize,tasksPage,taskCrud,schedule,organize,reorder,archiveTask,dashboard,search,filter,listView,boardView,timeline,streaks,archivePage,restore,purge usecase
```
