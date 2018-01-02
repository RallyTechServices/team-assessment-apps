describe("Team Health App", function() {

    it('should render the app', function() {
        var app = Rally.test.Harness.launchApp("team-health");
        expect(app.getEl()).toBeDefined();
    });

});
