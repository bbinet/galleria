/**
 * @preserve Galleria PyGall Plugin 2011-10-23
 * http://galleria.aino.se
 *
 * Licensed under the MIT license.
 */

/*global jQuery, Galleria, window */

Galleria.requires(1.25, 'The PyGall Plugin requires Galleria version 1.2.5 or later.');

(function($) {

// The script path
var PATH = Galleria.utils.getScriptPath();

/**

    @class
    @constructor

    @example var pygall = new Galleria.PyGall();

    @author Bruno Binet

    @requires jQuery
    @requires Galleria

    @param {Galleria} galleria Galleria instance which this plugin applies to

    @returns Instance
*/

Galleria.PyGall = function(galleria, options) {

    this._galleria = galleria;

    // set default options
    this._options = {
        server_url: 'http://pygall.inneos.org/demo', // PyGall server url to be used, defaults to the PyGall demo server url
        thumb: false,                  // set this to true to get a thumb image
        big: false,                    // set this to true to get a big image
        backlink: false,               // set this to true if you want to pass a link back to the original image
        max: 30,                       // max number of photos to return
        //sort: 'date-taken-desc',       // sort option ( date-posted-asc, date-posted-desc, date-taken-asc, date-taken-desc, interestingness-desc, interestingness-asc, relevance )
        title: false,                  // set this to true to get the image title
        description: false,            // set this to true to get description as caption
        loader: $('<div>').css({
            width: 48,
            height: 48,
            opacity: 0.7,
            background:'#000 url('+PATH+'loader.gif) no-repeat 50% 50%'
        })
    };

    if (options) {
        this.setOptions(options);
    }

    // register this pygall plugin instance in the galleria plugins property
    if (!galleria.plugins) {
        galleria.plugins = {};
    }
    galleria.plugins.pygall = this;

};

Galleria.PyGall.prototype = {

    _galleria: null,

    _last_params: null,

    _options: null,

    // bring back the constructor reference

    constructor: Galleria.PyGall,

    /**
        Complete callback to be called inside the Galleria.prototype.load
        (to be overriden by setOptions)

        @param {Array} data The photos data array
        @param {Object} meta A metadata object also returned by PyGall server
    */
    complete: function(data, meta){},

    /**
        Search for anything at PyGall

        @param {String} phrase The string to search for
        @param {Function} [callback] The callback to be called when the data is ready
        @param {Boolean} noload True will not load returned data in Galleria

        @returns Instance
    */

    search: function( phrase, callback, noload ) {
        return this._find({
            search: phrase
        }, callback, noload);
    },

    /**
        Search for anything at PyGall by tag

        @param {String} tag The tag(s) to search for
        @param {Function} [callback] The callback to be called when the data is ready
        @param {Boolean} noload True will not load returned data in Galleria

        @returns Instance
    */

    tags: function( tag, callback, noload ) {
        return this._find({
            tags: tag
        }, callback, noload);
    },

    /**
        Get photos from a photoset by ID

        @param {String|Number} photoset The photoset id to fetch
        @param {Function} [callback] The callback to be called when the data is ready
        @param {Boolean} noload True will not load returned data in Galleria

        @returns Instance
    */

    photoset: function( photoset, callback, noload ) {
        return this._find({
            photoset: photoset,
        }, callback, noload);
    },

    /**
        Get previous page in PyGall pagination

        @param {Function} [callback] The callback to be called when the data is ready
        @param {Boolean} noload True will not load returned data in Galleria

        @returns Instance
    */

    previousPage: function( callback, noload ) {
        var currentpage = this._last_params.page || 1;
        if (currentpage <= 1) {
            Galleria.raise( 'Can\'t load previous page: current page is' +
                            'already the first page.');
            return this;
        }
        this._last_params.page = currentpage - 1;

        return this._find( this._last_params, callback, noload);
    },

    /**
        Get next page in PyGall pagination

        @param {Function} [callback] The callback to be called when the data is ready
        @param {Boolean} noload True will not load returned data in Galleria

        @returns Instance
    */

    nextPage: function( callback, noload ) {
        var currentpage = this._last_params.page || 1;
        this._last_params.page = currentpage + 1;

        return this._find( this._last_params, callback, noload);
    },

    /**
        Set pygall options

        @param {Object} options The options object to blend

        @returns Instance
    */

    setOptions: function( options ) {
        if (options.complete) {
            this.complete = options.complete;
            delete options.complete;
        }
        $.extend(this._options, options);
        return this;
    },


    // call PyGall and raise errors

    _call: function( params, callback ) {

        var self = this;
        // apply the preloader
        window.setTimeout(function() {
            self._galleria.$( 'target' ).append( self._options.loader );
        },0);

        this._last_params = $.extend({}, params);

        $.ajax({
            url: this._options.server_url,
            dataType: 'jsonp',
            data: params,
            success:  function(data) {
                callback.call(self, data.photos, data.meta);
            },
            failure: function() {
                //TODO: raise the correct exception
                Galleria.raise( data.code.toString() + ' ' + data.stat + ': ' + data.message, true );
            },
            complete: function() {
                self._options.loader.remove();
            }
        });

        return self;
    },


    // ask pygall for photos, parse the result and call the callback with the galleria-ready data array

    _find: function( params, callback, noload ) {

        params = $.extend({
            title: this._options.title,
            description: this._options.description,
            //sort: this._options.sort,
            max: this._options.max,
            thumb: this._options.thumb,
            big: this._options.big,
            link: this._options.backlink
        }, params );

        return this._call( params, function(data, meta) {
            if (callback) {
                callback.call( this, data, meta );
            }
            if (!noload) {
                this._galleria.load(data);
            }
        });
    }
};


/**
    Galleria modifications
    We fake-extend the load prototype to make PyGall integration as simple as possible
*/


// save the old prototype in a local variable

var load = Galleria.prototype.load;


// fake-extend the load prototype using the pygall data

Galleria.prototype.load = function() {

    // pass if data is provided or pygall option not found
    if ( arguments.length || typeof this._options.pygall !== 'string' ) {
        load.apply( this, Galleria.utils.array( arguments ) );
        return;
    }

    // define some local vars
    var self = this,
        args = Galleria.utils.array( arguments ),
        pygall = this._options.pygall.split(':'),
        f,
        opts = $.extend({}, self._options.pygallOptions);

    if ( pygall.length ) {

        // validate the method
        if ( typeof Galleria.PyGall.prototype[ pygall[0] ] !== 'function' ) {
            Galleria.raise( pygall[0] + ' method not found in PyGall plugin' );
            return load.apply( this, args );
        }

        // validate the argument
        if ( !pygall[1] ) {
            Galleria.raise( 'No pygall argument found' );
            return load.apply( this, args );
        }

        // create the instance
        f = new Galleria.PyGall(self, opts);

        // call the pygall method and trigger the DATA event
        f[ pygall[0] ]( pygall[1], function( data, meta ) {

            self._data = data;
            self.trigger( Galleria.DATA );
            f.complete.call(f, data, meta);

        }, true);
    } else {
        // if pygall array not found, pass
        load.apply( this, args );
    }
};

}( jQuery ) );
