Ext.override(Rally.ui.grid.CheckboxModel, {
    _recordIsSelectable: function(record) {
        return record.get('_type') === "project";
    }
});
Ext.override(Rally.ui.grid.RowActionColumn, {

    /**
     * @private
     * @param value
     * @param metaData
     * @param record
     */
    _renderGearIcon: function(value, metaData, record) {
        metaData.tdCls = Rally.util.Test.toBrowserTestCssClass('row-action', Rally.util.Ref.getOidFromRef(record.get('_ref')));

        var gearIconHtml = '<div class="row-action-icon icon-gear"/>';
        // if(record.self.typePath === 'recyclebinentry'){
        //     return record.get('updatable') ? gearIconHtml : '';
        // }

        return gearIconHtml;
    }
});

Ext.override(Rally.ui.menu.bulk.Edit, {
        config: {
            predicate: function(records) {
              return true;
            },


        },


    });
