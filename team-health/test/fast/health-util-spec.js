describe("Team Health Utility", function() {

    it("should calculate average WIP given a set of snapshots and a number of active days",function(){

        var currentDate = new Date(),
            validFrom1 = Rally.util.DateTime.toIsoString(Rally.util.DateTime.add(currentDate, 'day', -7)), //6.5
            validFrom2 = Rally.util.DateTime.toIsoString(Rally.util.DateTime.add(currentDate, 'day', -6)),  //4
            validFrom3 = Rally.util.DateTime.toIsoString(Rally.util.DateTime.add(currentDate, 'day', -5)), // 3
            validFrom4 = Rally.util.DateTime.toIsoString(Rally.util.DateTime.add(currentDate, 'day', -3)); //2.5

        var snaps = [{
             ScheduleState: 'In-Progress',
             PlanEstimate: 5,
             _ValidFrom: validFrom1,
             _ValidTo: validFrom2
          },{
            ScheduleState: 'In-Progress',
            PlanEstimate: 6,
            _ValidFrom: validFrom2,
            _ValidTo: validFrom3
          },{
            ScheduleState: 'In-Progress',
            PlanEstimate: 3,
            _ValidFrom: validFrom3,
            _ValidTo: validFrom4
          },{
            ScheduleState: 'In-Progress',
            PlanEstimate: 1,
            _ValidFrom: validFrom4,
            _ValidTo: '9999-12-31T11:59:59'  //3
          }];

        var wip = Rally.technicalservices.util.Health.getDailyWIP(snaps, 5);
        expect(wip.length).toEqual(6);
        expect(Ext.Array.mean(wip)).toEqual(1);

        var wip = Rally.technicalservices.util.Health.getDailyWIP(snaps, 5, true);
        expect(wip[0]).toEqual(3);
        expect(wip[1]).toEqual(3);
        expect(wip[2]).toEqual(1);
        expect(wip[3]).toEqual(1);
        expect(wip[4]).toEqual(1);
        expect(wip[5]).toEqual(1);

    });

    it("should calculate average WIP for many different snapshots and a number of active days",function(){

        var currentDate = new Date(),
            validFrom1 = Rally.util.DateTime.toIsoString(Rally.util.DateTime.add(currentDate, 'day', -7)), //6.5
            validFrom2 = Rally.util.DateTime.toIsoString(Rally.util.DateTime.add(currentDate, 'day', -4)),  //4
            validFrom3 = Rally.util.DateTime.toIsoString(Rally.util.DateTime.add(currentDate, 'day', -2)),
            validFrom1b = Rally.util.DateTime.toIsoString(Rally.util.DateTime.add(currentDate, 'day', -6)), //6.5
            validFrom2b = Rally.util.DateTime.toIsoString(Rally.util.DateTime.add(currentDate, 'day', -3));
            ; //2.5

        var snaps = [{
          ScheduleState: 'In-Progress',
          PlanEstimate: 8,
          _ValidFrom: validFrom1b,
          _ValidTo: validFrom2b
        },{
          ScheduleState: 'Completed',
          PlanEstimate: 8,
          _ValidFrom: validFrom2b,
          _ValidTo: '9999-12-31T11:59:59'
        },{
             ScheduleState: 'In-Progress',
             PlanEstimate: 5,
             _ValidFrom: validFrom1,
             _ValidTo: validFrom2
          },{
            ScheduleState: 'In-Progress',
            PlanEstimate: 6,
            _ValidFrom: validFrom2,
            _ValidTo: validFrom3
          },{
            ScheduleState: 'In-Progress',
            PlanEstimate: 3,
            _ValidFrom: validFrom3,
            _ValidTo: '9999-12-31T11:59:59'  //3
          }];

        var wip = Rally.technicalservices.util.Health.getDailyWIP(snaps, 5);
        expect(wip.length).toEqual(6);
        expect(wip[0]).toEqual(2);
        expect(wip[1]).toEqual(2);
        expect(wip[2]).toEqual(1);
        expect(wip[3]).toEqual(1);
        expect(wip[4]).toEqual(1);
        expect(wip[5]).toEqual(1);

        var wip = Rally.technicalservices.util.Health.getDailyWIP(snaps, 5, true);
        expect(wip[0]).toEqual(13);
        expect(wip[1]).toEqual(14);
        expect(wip[2]).toEqual(6);
        expect(wip[3]).toEqual(3);
        expect(wip[4]).toEqual(3);
        expect(wip[5]).toEqual(3);

    });

});
