/** Property under which non-field-specific errors are stored. */
var NON_FIELD_ERRORS = '__all__';

/**
 * A field and its associated data.
 *
 * @param {Form} form a form.
 * @param {Field} field one of the form's fields.
 * @param {String} name the name under which the field is held in the form.
 * @constructor
 */
function BoundField(form, field, name) {
  if (!(this instanceof BoundField)) return new BoundField(form, field, name);
  this.form = form;
  this.field = field;
  this.name = name;
  this.htmlName = form.addPrefix(name);
  this.htmlInitialName = form.addInitialPrefix(name);
  this.htmlInitialId = form.addInitialPrefix(this.autoId());
  this.label = this.field.label !== null ? this.field.label : prettyName(name);
  this.helpText = field.helpText || '';
}

BoundField.prototype = {
  /*get */errors: function() {
    return this.form.errors(this.name) || new this.form.errorConstructor();
  }

, /*get */isHidden: function() {
    return this.field.widget.isHidden;
  }

  /**
   * Calculates and returns the <code>id</code> attribute for this BoundFIeld
   * if the associated form has an autoId. Returns an empty string otherwise.
   */
, /*get */autoId: function() {
    var autoId = this.form.autoId;
    if (autoId) {
      autoId = ''+autoId;
      if (autoId.indexOf('%(name)s') != -1) {
        return format(autoId, {name: this.htmlName});
      }
      return this.htmlName;
    }
    return '';
  }

  /**
   * Returns the data for this BoundFIeld, or <code>null</code> if it wasn't
   * given.
   */
, /*get */data: function() {
    return this.field.widget.valueFromData(this.form.data,
                                           this.form.files,
                                           this.htmlName);
  }

  /**
   * Wrapper around the field widget's <code>idForLabel</code> method.
   * Useful, for example, for focusing on this field regardless of whether
   * it has a single widget or a MutiWidget.
   */
, /*get */idForLabel: function() {
    var widget = this.field.widget
      , id = getDefault(widget.attrs, 'id', this.autoId());
    return widget.idForLabel(id);
  }
};

/**
 * Assuming this method will only be used when DOMBuilder is configured to
 * generate HTML.
 */
BoundField.prototype.toString = function() {
  return ''+this.defaultRendering();
};

BoundField.prototype.defaultRendering = function() {
  if (this.field.showHiddenInitial) {
    return DOMBuilder.fragment(this.asWidget(),
                               this.asHidden({onlyInitial: true}));
  }
  return this.asWidget();
};

/**
 * Renders a widget for the field.
 *
 * @param {Object} [kwargs] configuration options
 * @config {Widget} [widget] an override for the widget used to render the field
 *                           - if not provided, the field's configured widget
 *                           will be used
 * @config {Object} [attrs] additional attributes to be added to the field's
 *                          widget.
 */
BoundField.prototype.asWidget = function(kwargs) {
  kwargs = extend({
    widget: null, attrs: null, onlyInitial: false
  }, kwargs || {});
  var widget = (kwargs.widget !== null ? kwargs.widget : this.field.widget)
    , attrs = (kwargs.attrs !== null ? kwargs.attrs : {})
    , autoId = this.autoId()
    , name = !kwargs.onlyInitial ? this.htmlName : this.htmlInitialName;
  if (autoId &&
      typeof attrs.id == 'undefined' &&
      typeof widget.attrs.id == 'undefined') {
    attrs.id = (!kwargs.onlyInitial ? autoId : this.htmlInitialId);
  }

  return widget.render(name, this.value(), {attrs: attrs});
};

/**
 * Renders the field as a text input.
 *
 * @param {Object} [kwargs] widget options.
 */
BoundField.prototype.asText = function(kwargs) {
  kwargs = extend({}, kwargs || {}, {widget: TextInput()});
  return this.asWidget(kwargs);
};

/**
 * Renders the field as a textarea.
 *
 * @param {Object} [kwargs] widget options.
 */
BoundField.prototype.asTextarea = function(kwargs) {
  kwargs = extend({}, kwargs || {}, {widget: Textarea()});
  return this.asWidget(kwargs);
};

/**
 * Renders the field as a hidden field.
 *
 * @param {Object} [attrs] additional attributes to be added to the field's
 *                         widget.
 */
BoundField.prototype.asHidden = function(kwargs) {
  kwargs = extend({}, kwargs || {}, {widget: new this.field.hiddenWidget()});
  return this.asWidget(kwargs);
};

/**
 * Returns the value for this BoundField, using the initial value if the form
 * is not bound or the data otherwise.
 */
BoundField.prototype.value = function() {
  var data;
  if (!this.form.isBound) {
    data = getDefault(this.form.initial, this.name, this.field.initial);
    if (isFunction(data)) {
      data = data();
    }
  }
  else {
    data = this.field.boundData(this.data(),
                                getDefault(this.form.initial,
                                           this.name,
                                           this.field.initial));
  }
  return this.field.prepareValue(data);
};

/**
 * Wraps the given contents in a &lt;label&gt;, if the field has an ID
 * attribute. Does not HTML-escape the contents. If contents aren't given, uses
 * the field's HTML-escaped label.
 *
 * If attrs are given, they're used as HTML attributes on the <label> tag.
 *
 * @param {Object} [kwargs] configuration options.
 * @config {String} [contents] contents for the label - if not provided, label
 *                             contents will be generated from the field itself.
 * @config {Object} [attrs] additional attributes to be added to the label.
 */
BoundField.prototype.labelTag = function(kwargs) {
  kwargs = extend({contents: null, attrs: null}, kwargs || {});
  var contents, widget = this.field.widget, id, attrs;
  if (kwargs.contents !== null) {
    contents = kwargs.contents;
  }
  else {
    contents = this.label;
  }

  id = getDefault(widget.attrs, 'id', this.autoId());
  if (id) {
    attrs = extend(kwargs.attrs || {},
                   {'for': widget.idForLabel(id)});
    contents = DOMBuilder.createElement('label', attrs, [contents]);
  }
  return contents;
};

/**
 * Returns a string of space-separated CSS classes for this field.
 */
BoundField.prototype.cssClasses = function(extraClasses) {
  extraClasses = extraClasses || null;
  if (extraClasses !== null && isFunction(extraClasses.split)) {
    extraClasses = extraClasses.split();
  }
  extraClasses = extraClasses || [];
  if (this.errors().isPopulated() &&
      typeof this.form.errorCssClass != 'undefined') {
    extraClasses.push(this.form.errorCssClass);
  }
  if (this.field.required && typeof this.form.requiredCssClass != 'undefined') {
    extraClasses.push(this.form.requiredCssClass);
  }
  return extraClasses.join(' ');
};

/**
 * A collection of Fields that knows how to validate and display itself.
 *
 * @param {Object} [kwargs] configuration options.
 * @config {Object} [data] input form data, where property names are field
 *                         names.
 * @config {Object} [files] input file data - this is meaningless on the
 *                          client-side, but is included for future use in any
 *                          future server-side implementation.
 * @config {String} [autoId] a template for use when automatically generating
 *                           <code>id</code> attributes for fields, which should
 *                           contain a <code>%(name)s</code> placeholder for
 *                           the field name - defaults to
 *                           <code>id_%(name)s</code>.
 * @config {String} [prefix] a prefix to be applied to the name of each field in
 *                           this instance of the form - using a prefix allows
 *                           you to easily work with multiple instances of the
 *                           same Form object in the same HTML
 *                           <code>&lt;form&gt;</code>, or to safely mix Form
 *                           objects which have fields with the same names.
 * @config {Object} [initial] initial form data, where property names are field
 *                            names - if a field's value is not specified in
 *                            <code>data</code>, these values will be used when
 *                            rendering field widgets.
 * @config {Function} [errorConstructor] the constructor function to be used
 *                                       when creating error details - defaults
 *                                       to {@link ErrorList}.
 * @config {String} [labelSuffix] a suffix to be used when generating labels
 *                                in one of the convenience method which renders
 *                                the entire Form - defaults to
 *                                <code>:</code>.
 * @config {Boolean} [emptyPermitted] if <code>true</code>, the form is allowed
 *                                    to be empty - defaults to
 *                                    <code>false</code>.
 * @constructor
 */
function BaseForm(kwargs) {
  kwargs = extend({
    data: null, files: null, autoId: 'id_%(name)s', prefix: null,
    initial: null, errorConstructor: ErrorList, labelSuffix: ':',
    emptyPermitted: false
  }, kwargs || {});
  this.isBound = kwargs.data !== null || kwargs.files !== null;
  this.data = kwargs.data || {};
  this.files = kwargs.files || {};
  this.autoId = kwargs.autoId;
  this.prefix = kwargs.prefix;
  this.initial = kwargs.initial || {};
  this.errorConstructor = kwargs.errorConstructor;
  this.labelSuffix = kwargs.labelSuffix;
  this.emptyPermitted = kwargs.emptyPermitted;
  this._errors = null; // Stores errors after clean() has been called
  this._changedData = null;

  // The baseFields  attribute is the *prototype-wide* definition of fields.
  // Because a particular *instance* might want to alter this.fields, we
  // create this.fields here by deep copying baseFields. Instances should
  // always modify this.fields; they should not modify baseFields.
  this.fields = copy.deepCopy(this.baseFields);
}

BaseForm.prototype = {
  /**
   * Getter for errors, which first cleans the form if there are no errors
   * defined yet.
   *
   * @return errors for the data provided for the form.
   */
  /*get */errors: function(name) {
    if (this._errors === null) {
      this.fullClean();
    }
    if (name) {
      return this._errors.get(name);
    }
    return this._errors;
  }

, /*get */changedData: function() {
    if (this._changedData === null) {
      this._changedData = [];
      // XXX: For now we're asking the individual fields whether or not
      // the data has changed. It would probably be more efficient to hash
      // the initial data, store it in a hidden field, and compare a hash
      // of the submitted data, but we'd need a way to easily get the
      // string value for a given field. Right now, that logic is embedded
      // in the render method of each field's widget.
      for (var name in this.fields) {
        if (!this.fields.hasOwnProperty(name)) {
          continue;
        }

        var field = this.fields[name]
          , prefixedName = this.addPrefix(name)
          , dataValue = field.widget.valueFromData(this.data,
                                                   this.files,
                                                   prefixedName)
          , initialValue = getDefault(this.initial, name,
                                      field.initial);

        if (field.showHiddenInitial) {
          var initialPrefixedName = this.addInitialPrefix(name)
            , hiddenWidget = new field.hiddenWidget()
            , initialValue = hiddenWidget.valueFromData(
                  this.data, this.files, initialPrefixedName);
        }

        if (field._hasChanged(initialValue, dataValue)) {
          this._changedData.push(name);
        }
      }
    }
    return this._changedData;
  }

  // TODO Implement Media functionality
, /*get */media: function() {}
};

BaseForm.prototype.toString = function() {
  return ''+this.defaultRendering();
};

BaseForm.prototype.defaultRendering = function() {
  return this.asTable();
};

/**
 * In lieu of __iter__, creates a {@link BoundField} for each field in the form,
 * in the order in which the fields were created.
 *
 * @param {Function} [test] if provided, this function will be called with
 *                          <var>field</var> and <var>name</var> arguments -
 *                          BoundFields will only be generated for fields for
 *                          which <code>true</code> is returned.
 *
 * @return a list of <code>BoundField</code> objects - one for each field in
 *         the form, in the order in which the fields were created.
 */
BaseForm.prototype.boundFields = function(test) {
  test = test || function() { return true; };

  var fields = [];
  for (var name in this.fields) {
    if (this.fields.hasOwnProperty(name) &&
        test(this.fields[name], name) === true) {
      fields.push(BoundField(this, this.fields[name], name));
    }
  }
  return fields;
};

/**
 * {name -> BoundField} version of boundFields
 */
BaseForm.prototype.boundFieldsObj = function(test) {
  test = test || function() { return true; };

  var fields = {};
  for (var name in this.fields) {
    if (this.fields.hasOwnProperty(name) &&
        test(this.fields[name], name) === true) {
      fields[name] = BoundField(this, this.fields[name], name);
    }
  }
  return fields;
};

/**
 * In lieu of __getitem__, creates a {@link BoundField} for the field with the
 * given name.
 *
 * @param {String} name a field name.
 *
 * @return a <code>BoundField</code> for the field with the given name, if one
 *         exists.
 */
BaseForm.prototype.boundField = function(name) {
  if (!this.fields.hasOwnProperty(name)) {
    throw new Error("Form does not have a '" + name + "' field.");
  }
  return BoundField(this, this.fields[name], name);
};

/**
 * Determines whether or not the form has errors.
 *
 * @return <code>true</code> if the form has no errors, <code>false</code>
 *         otherwise. If errors are being ignored, returns <code>false</code>.
 */
BaseForm.prototype.isValid = function() {
  if (!this.isBound) {
    return false;
  }
  return !this.errors().isPopulated();
};

/**
 * Returns the field name with a prefix appended, if this Form has a prefix set.
 *
 * @param {String} fieldName a field name.
 *
 * @return a field name with a prefix appended, if this Form has a prefix set,
 *         otherwise <code>fieldName</code> is returned as-is.
 */
BaseForm.prototype.addPrefix = function(fieldName) {
  if (this.prefix !== null) {
      return format('%(prefix)s-%(fieldName)s',
                    {prefix: this.prefix, fieldName: fieldName});
  }
  return fieldName;
};

/**
 * Add an initial prefix for checking dynamic initial values.
 */
BaseForm.prototype.addInitialPrefix = function(fieldName) {
  return format('initial-%(fieldName)s',
                {fieldName: this.addPrefix(fieldName)});
};

/**
 * Helper function for outputting HTML.
 *
 * @param {Function} normalRow a function which produces a normal row.
 * @param {Function} errorRow a function which produces an error row.
 * @param {Boolean} errorsOnSeparateRow determines if errors are placed in their
 *                                      own row, or in the row for the field
 *                                      they are related to.
 * @param {Boolean} [doNotCoerce] if <code>true</code>, the resulting rows will
 *                                not be coerced to a String if we're operating
 *                                in HTML mode - defaults to <code>false</code>.
 *
 * @return if we're operating in DOM mode returns a list of DOM elements
 *         representing rows, otherwise returns an HTML string, with rows
 *         separated by linebreaks.
 */
BaseForm.prototype._htmlOutput = function(normalRow, errorRow, errorsOnSeparateRow,
                                      doNotCoerce) {
  // Errors that should be displayed above all fields
  var topErrors = this.nonFieldErrors()
    , rows = []
    , hiddenFields = []
    , htmlClassAttr = null
    , cssClasses = null
    , hiddenBoundFields = this.hiddenFields()
    , visibleBoundFields = this.visibleFields()
    , bf, bfErrors;

  for (var i = 0, l = hiddenBoundFields.length; i < l; i++) {
    bf = hiddenBoundFields[i];
    bfErrors = bf.errors();
    if (bfErrors.isPopulated()) {
      for (var j = 0, m = bfErrors.errors.length; j < m; j++) {
        topErrors.errors.push('(Hidden field ' + bf.name + ') ' +
                              bfErrors.errors[j]);
      }
    }
    hiddenFields.push(bf.defaultRendering());
  }

  for (var i = 0, l = visibleBoundFields.length; i < l; i++) {
    bf = visibleBoundFields[i];
    htmlClassAttr = '';
    cssClasses = bf.cssClasses();
    if (cssClasses) {
      htmlClassAttr = cssClasses;
    }

    // Variables which can be optional in each row
    var errors = null
      , label = null
      , helpText = null
      , extraContent = null;

    bfErrors = bf.errors();
    if (bfErrors.isPopulated()) {
      errors = new this.errorConstructor();
      for (var j = 0, m = bfErrors.errors.length; j < m; j++) {
        errors.errors.push(bfErrors.errors[j]);
      }

      if (errorsOnSeparateRow === true) {
        rows.push(errorRow(errors.defaultRendering()));
        errors = null;
      }
    }

    if (bf.label) {
      var isSafe = DOMBuilder.html && DOMBuilder.html.isSafe(bf.label);
      label = ''+bf.label;
      // Only add the suffix if the label does not end in punctuation
      if (this.labelSuffix &&
          ':?.!'.indexOf(label.charAt(label.length - 1)) == -1) {
        label += this.labelSuffix;
      }
      if (isSafe) {
        label = DOMBuilder.html.markSafe(label);
      }
      label = bf.labelTag({contents: label}) || '';
    }

    if (bf.field.helpText) {
      helpText = bf.field.helpText;
    }

    // If this is the last row, it should include any hidden fields
    if (i == l - 1 && hiddenFields.length > 0) {
      extraContent = hiddenFields;
    }
    if (errors !== null) {
      errors = errors.defaultRendering();
    }
    rows.push(normalRow(label, bf.defaultRendering(), helpText, errors,
                        htmlClassAttr, extraContent));
  }

  if (topErrors.isPopulated()) {
    // Add hidden fields to the top error row if it's being displayed and
    // there are no other rows.
    var extraContent = null;
    if (hiddenFields.length > 0 && rows.length == 0) {
      extraContent = hiddenFields;
    }
    rows.splice(0, 0, errorRow(topErrors.defaultRendering(), extraContent));
  }

  // Put hidden fields in their own error row if there were no rows to
  // display.
  if (hiddenFields.length > 0 && rows.length == 0) {
    rows.push(errorRow('', hiddenFields));
  }
  if (doNotCoerce === true || DOMBuilder.mode == 'dom') {
    return rows;
  }
  else {
    return DOMBuilder.html.markSafe(rows.join('\n'));
  }
};

/**
 * Returns this form rendered as HTML &lt;tr&gt;s - excluding the
 * &lt;table&gt;&lt;/table&gt;.
 *
 * @param {Boolean} [doNotCoerce] if <code>true</code>, the resulting rows will
 *                                not be coerced to a String if we're operating
 *                                in HTML mode - defaults to <code>false</code>.
 */
BaseForm.prototype.asTable = (function() {
  var normalRow = function(label, field, helpText, errors, htmlClassAttr,
                           extraContent) {
    var contents = [];
    if (errors) {
      contents.push(errors);
    }
    contents.push(field);
    if (helpText) {
      contents.push(DOMBuilder.createElement('br'));
      contents.push(helpText);
    }
    if (extraContent) {
      contents = contents.concat(extraContent);
    }

    var rowAttrs = {};
    if (htmlClassAttr) {
      rowAttrs['class'] = htmlClassAttr;
    }
    return DOMBuilder.createElement('tr', rowAttrs, [
      DOMBuilder.createElement('th', {}, [label]),
      DOMBuilder.createElement('td', {}, contents)
    ]);
  };

  var errorRow = function(errors, extraContent) {
    var contents = [errors];
    if (extraContent) {
      contents = contents.concat(extraContent);
    }
    return DOMBuilder.createElement('tr', {}, [
      DOMBuilder.createElement('td', {colSpan: 2}, contents)
    ]);
  };

  return function(doNotCoerce) {
    return this._htmlOutput(normalRow, errorRow, false, doNotCoerce);
  };
})();

/**
 * Returns this form rendered as HTML &lt;li&gt;s - excluding the
 * &lt;ul&gt;&lt;/ul&gt;.
 *
 * @param {Boolean} [doNotCoerce] if <code>true</code>, the resulting rows will
 *                                not be coerced to a String if we're operating
 *                                in HTML mode - defaults to <code>false</code>.
 */
BaseForm.prototype.asUL = (function() {
  var normalRow = function(label, field, helpText, errors, htmlClassAttr,
                           extraContent) {
    var contents = [];
    if (errors) {
      contents.push(errors);
    }
    if (label) {
      contents.push(label);
    }
    contents.push(' ');
    contents.push(field);
    if (helpText) {
      contents.push(' ');
      contents.push(helpText);
    }
    if (extraContent) {
      contents = contents.concat(extraContent);
    }

    var rowAttrs = {};
    if (htmlClassAttr) {
      rowAttrs['class'] = htmlClassAttr;
    }
    return DOMBuilder.createElement('li', rowAttrs, contents);
  };

  var errorRow = function(errors, extraContent) {
    var contents = [errors];
    if (extraContent) {
      contents = contents.concat(extraContent);
    }
    return DOMBuilder.createElement('li', {}, contents);
  };

  return function(doNotCoerce) {
    return this._htmlOutput(normalRow, errorRow, false, doNotCoerce);
  };
})();

/**
 * Returns this form rendered as HTML &lt;p&gt;s.
 *
 * @param {Boolean} [doNotCoerce] if <code>true</code>, the resulting rows will
 *                                not be coerced to a String if we're operating
 *                                in HTML mode - defaults to <code>false</code>.
 */
BaseForm.prototype.asP = (function() {
  var normalRow = function(label, field, helpText, errors, htmlClassAttr,
                           extraContent) {
    var contents = [];
    if (label) {
      contents.push(label);
    }
    contents.push(' ');
    contents.push(field);
    if (helpText) {
      contents.push(' ');
      contents.push(helpText);
    }
    if (extraContent) {
      contents = contents.concat(extraContent);
    }

    var rowAttrs = {};
    if (htmlClassAttr) {
      rowAttrs['class'] = htmlClassAttr;
    }
    return DOMBuilder.createElement('p', rowAttrs, contents);
  };

  var errorRow = function(errors, extraContent) {
    if (extraContent) {
      // When provided extraContent is usually hidden fields, so we need
      // to give it a block scope wrapper in this case for HTML validity.
      return DOMBuilder.createElement('div', {}, [errors].concat(extraContent));
    }
    // Otherwise, just display errors as they are
    return errors;
  };

  return function(doNotCoerce) {
    return this._htmlOutput(normalRow, errorRow, true, doNotCoerce);
  };
})();

/**
 * Returns errors that aren't associated with a particular field.
 *
 * @return errors that aren't associated with a particular field - i.e., errors
 *         generated by <code>clean()</code>. Will be empty if there are none.
 */
BaseForm.prototype.nonFieldErrors = function() {
  return (this.errors(NON_FIELD_ERRORS) || new this.errorConstructor());
};

/**
 * Returns the raw value for a particular field name. This is just a convenient
 * wrapper around widget.valueFromData.
 */
BaseForm.prototype._rawValue = function(fieldname) {
  var field = this.fields[fieldname]
    , prefix = this.addPrefix(fieldname);
  return field.widget.valueFromData(this.data, this.files, prefix);
};

/**
 * Cleans all of <code>data</code> and populates <code>_errors</code> and
 * <code>cleanedData</code>.
 */
BaseForm.prototype.fullClean = function() {
  this._errors = ErrorObject();
  if (!this.isBound) {
    return; // Stop further processing
  }

  this.cleanedData = {};

  // If the form is permitted to be empty, and none of the form data has
  // changed from the initial data, short circuit any validation.
  if (this.emptyPermitted && !this.hasChanged()) {
    return;
  }

  this._cleanFields();
  this._cleanForm();
  this._postClean();

  if (this._errors.isPopulated()) {
    delete this.cleanedData;
  }
};

BaseForm.prototype._cleanFields = function() {
  for (var name in this.fields)
  {
    if (!this.fields.hasOwnProperty(name)) {
      continue;
    }

    var field = this.fields[name]
        // valueFromData() gets the data from the data objects.
        // Each widget type knows how to retrieve its own data, because some
        // widgets split data over several HTML fields.
      , value = field.widget.valueFromData(this.data, this.files,
                                           this.addPrefix(name));
    try {
      if (field instanceof FileField) {
        var initial = getDefault(this.initial, name, field.initial);
        value = field.clean(value, initial);
      }
      else {
        value = field.clean(value);
      }
      this.cleanedData[name] = value;

      // Try clean_name
      var customClean = 'clean_' + name;
      if (typeof this[customClean] != 'undefined' &&
          isFunction(this[customClean])) {
         this.cleanedData[name] = this[customClean]();
         continue;
      }

      // Try cleanName
      customClean = 'clean' + name.charAt(0).toUpperCase() +
                    name.substr(1);
      if (typeof this[customClean] != 'undefined' &&
          isFunction(this[customClean])) {
        this.cleanedData[name] = this[customClean]();
      }
    }
    catch (e) {
      if (!(e instanceof ValidationError)) {
        throw e;
      }
      this._errors.set(name, new this.errorConstructor(e.messages));
      if (typeof this.cleanedData[name] != 'undefined') {
        delete this.cleanedData[name];
      }
    }
  }
};

BaseForm.prototype._cleanForm = function() {
  try {
    this.cleanedData = this.clean();
  }
  catch (e) {
    if (!(e instanceof ValidationError)) {
      throw e;
    }
    this._errors.set(NON_FIELD_ERRORS,
                     new this.errorConstructor(e.messages));
  }
};

/**
 * An internal hook for performing additional cleaning after form cleaning is
 * complete.
 */
BaseForm.prototype._postClean = function() {};

/**
 * Hook for doing any extra form-wide cleaning after each Field's
 * <code>clean()</code> has been called. Any {@link ValidationError} raised by
 * this method will not be associated with a particular field; it will have a
 * special-case association with the field named <code>__all__</code>.
 *
 * @return validated, cleaned data.
 */
BaseForm.prototype.clean = function() {
  return this.cleanedData;
};

/**
 * Determines if data differs from initial.
 */
BaseForm.prototype.hasChanged = function() {
  return (this.changedData().length > 0);
};

/**
 * Determines if the form needs to be multipart-encrypted, in other words, if it
 * has a {@link FileInput}.
 *
 * @return <code>true</code> if the form needs to be multipart-encrypted,
 *         <code>false</code> otherwise.
 */
BaseForm.prototype.isMultipart = function() {
  for (var name in this.fields) {
    if (this.fields.hasOwnProperty(name)) {
      if (this.fields[name].widget.needsMultipartForm) {
        return true;
      }
    }
  }
  return false;
};

/**
 * Returns a list of all the {@link BoundField} objects that correspond to
 * hidden fields. Useful for manual form layout.
 */
BaseForm.prototype.hiddenFields = function() {
  return this.boundFields(function(field) {
    return field.widget.isHidden;
  });
};

/**
 * Returns a list of {@link BoundField} objects that do not correspond to
 * hidden fields. The opposite of the hiddenFields() method.
 */
BaseForm.prototype.visibleFields = function()
{
    return this.boundFields(function(field)
    {
        return !field.widget.isHidden;
    });
};

/**
 * Creates a new form constructor, eliminating some of the steps required when
 * manually defining a new form class and wiring up convenience hooks into the
 * form initialisation process.
 *
 * @param {Object} kwargs arguments defining options for the created form
 *     constructor. Arguments which are <code>Field</code> instances will
 *     contribute towards the form's <code>baseFields</code>. All remaining
 *     arguments other than those defined below will be added to the new form
 *     constructor's <code>prototype</code>, so this object can also be used to
 *     define new methods on the resulting form, such as custom
 *     <code>clean</code> and <code>cleanFieldName</code> methods.
 * @config {Function|Array} [form] the Form constructor which will provide the
 *     prototype for the new Form constructor - defaults to
 *     <code>BaseForm</code>.
 * @config {Function} [preInit] if provided, this function will be invoked with
 *     any keyword arguments which are passed when a new instance of the form is
 *     being created, *before* fields have been created and the prototype
 *     constructor called - if a value is returned from the function, it will be
 *     used as the kwargs object for further processing, so typical usage of
 *     this argument would be to set default kwarg arguments or pop and store
 *     kwargs as properties of the form object being created.
 * @config {Function} [postInit] if provided, this function will be invoked with
 *     any keyword arguments which are passed when a new instance of the form is
 *     being created, *after* fields have been created and the prototype
 *     constructor called - typical usage of this function would be to
 *     dynamically alter the form fields which have just been created or to
 *     add/remove fields by altering <code>this.fields</code>.
 */
function Form(kwargs) {
  kwargs = extend({
    form: BaseForm, preInit: null, postInit: null
  }, kwargs || {});

  // Create references to special kwargs which will be closed over by the
  // new form constructor.
  var bases = isArray(kwargs.form) ? kwargs.form : [kwargs.form]
    , preInit = kwargs.preInit
    , postInit = kwargs.postInit;

  // Deliberately shadowing the outer function's kwargs so it won't be
  // accessible.
  var formConstructor = function(kwargs) {
    // Allow the form to be instantiated without the 'new' operator
    if (!(this instanceof bases[0])) return new formConstructor(kwargs);

    if (preInit !== null) {
      // If the preInit function returns anything, use the returned value
      // as the kwargs object for further processing.
      kwargs = preInit.call(this, kwargs) || kwargs;
    }

    // Instantiate using the first base form we were given
    bases[0].call(this, kwargs);

    if (postInit !== null) {
      postInit.call(this, kwargs);
    }
  };

  // *Really* inherit from the first base form we were passed
  inheritFrom(formConstructor, bases[0]);

  // Borrow methods from any additional base forms - this is a bit of a hack
  // to fake multiple inheritance, using any additonal base forms as mixins.
  // We can only use instanceof for the form we really inherited from, but we
  // can access methods from all our 'parents'.
  for (var i = 1, l = bases.length; i < l; i++) {
    extend(formConstructor.prototype, bases[i].prototype);
  }

  // Pop fields from kwargs to contribute towards baseFields.
  var fields = [];
  for (var name in kwargs) {
    if (kwargs.hasOwnProperty(name) && kwargs[name] instanceof Field) {
      fields.push([name, kwargs[name]]);
      delete kwargs[name];
    }
  }
  fields.sort(function(a, b) {
    return a[1].creationCounter - b[1].creationCounter;
  });
  // Note that we loop over the base forms in *reverse* to preserve the
  // correct order of fields. Fields from any given base forms will be first,
  // in the order they were given; fields from kwargs will be last.
  for (var i = bases.length - 1; i >= 0; i--) {
    if (typeof bases[i].prototype.baseFields != 'undefined') {
      fields = objectItems(bases[i].prototype.baseFields).concat(fields);
    }
  }
  // Instantiate baseFields from our list of [name, field] pairs
  formConstructor.prototype.baseFields = itemsToObject(fields);

  // Remove any 'special' properties from kwargs, as they will now be used to
  // add remaining properties to the new prototype.
  delete kwargs.form;
  delete kwargs.preInit;
  delete kwargs.postInit;
  // Anything else defined in kwargs should take precedence
  extend(formConstructor.prototype, kwargs);

  return formConstructor;
}
