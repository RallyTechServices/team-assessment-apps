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
            }
        }
});

Ext.override(Rally.ui.dialog.BulkEditDialog,{

  _fieldIsBulkEditable: function(field) {
    var fieldDefAttr = field.attributeDefinition;

    //TODO, if we enable multi value field bulk edit, this will help,
    //but we still have to solve the problem of setting the values without wiping out the original values
     
    // if (field.isMultiValueCustom() && !field.editor){
    //   //lets create an editor for this.
    //   field.editor = {
    //     xtype: 'rallyfieldvaluecombobox',
    //     field: field.name,
    //     model: 'Project',
    //     multiSelect: true
    //     };
    // }

    return field.editor
        && !field.readOnly
        && !field.hidden
        && !field.isMappedFromArtifact
        //Need to override this next line so that it doesn't leave out collections
        && ((fieldDefAttr.AttributeType === 'OBJECT' && fieldDefAttr.Constrained) || !_.contains(['TEXT'], fieldDefAttr.AttributeType))
        && this._fieldCanBeEditedForAllRecords(field);
      }
});
