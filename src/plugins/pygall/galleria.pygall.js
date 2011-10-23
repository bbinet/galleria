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

    @returns Instance
*/

Galleria.PyGall = function() {

    this.options = {
        server_url: 'http://pygall.inneos.org/demo', // PyGall server url to be used, defaults to the PyGall demo server url
        thumb: false,                  // set this to true to get a thumb image
        big: false,                    // set this to true to get a big image
        backlink: false,               // set this to true if you want to pass a link back to the original image
        max: 30,                       // max number of photos to return
        //sort: 'date-taken-desc',       // sort option ( date-posted-asc, date-posted-desc, date-taken-asc, date-taken-desc, interestingness-desc, interestingness-asc, relevance )
        title: false,                  // set this to true to get the image title
        description: false,            // set this to true to get description as caption
        complete: function(){}         // callback to be called inside the Galleria.prototype.load
                                       // the callback will be given both the photos array and
                                       // a "meta" object
    };
};

Galleria.PyGall.prototype = {

    // bring back the constructor reference

    constructor: Galleria.PyGall,

    /**
        Search for anything at PyGall

        @param {String} phrase The string to search for
        @param {Function} [callback] The callback to be called when the data is ready

        @returns Instance
    */

    search: function( phrase, callback ) {
        return this._find({
            search: phrase
        }, callback );
    },

    /**
        Search for anything at PyGall by tag

        @param {String} tag The tag(s) to search for
        @param {Function} [callback] The callback to be called when the data is ready

        @returns Instance
    */

    tags: function( tag, callback ) {
        return this._find({
            tags: tag
        }, callback);
    },

    /**
        Get photos from a photoset by ID

        @param {String|Number} photoset The photoset id to fetch
        @param {Function} [callback] The callback to be called when the data is ready

        @returns Instance
    */

    photoset: function( photoset, callback ) {
        return this._find({
            photoset: photoset,
        }, callback);
    },

    /**
        Set pygall options

        @param {Object} options The options object to blend

        @returns Instance
    */

    setOptions: function( options ) {
        $.extend(this.options, options);
        return this;
    },


    // call PyGall and raise errors

    _call: function( params, callback ) {

        var scope = this;

        $.ajax({
            url: this.options.server_url,
            dataType: 'jsonp',
            data: params,
            success:  function(data) {
                callback.call(scope, data.photos, data.meta);
            },
            failure: function() {
                //TODO: raise the correct exception
                Galleria.raise( data.code.toString() + ' ' + data.stat + ': ' + data.message, true );
            }
        });

        return scope;
    },


    // ask pygall for photos, parse the result and call the callback with the galleria-ready data array

    _find: function( params, callback ) {

        params = $.extend({
            title: this.options.title,
            description: this.options.description,
            //sort: this.options.sort,
            max: this.options.max,
            thumb: this.options.thumb,
            big: this.options.big,
            link: this.options.backlink
        }, params );

        return this._call( params, function(data, meta) {
            callback.call( this, data, meta );
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

    // pass if no data is provided or pygall option not found
    if ( arguments.length || typeof this._options.pygall !== 'string' ) {
        load.apply( this, Galleria.utils.array( arguments ) );
        return;
    }

    // define some local vars
    var self = this,
        args = Galleria.utils.array( arguments ),
        pygall = this._options.pygall.split(':'),
        f,
        opts = $.extend({}, self._options.pygallOptions),
        loader = typeof opts.loader !== 'undefined' ?
            opts.loader : $('<div>').css({
                width: 48,
                height: 48,
                opacity: 0.7,
                background:'#000 url('+PATH+'loader.gif) no-repeat 50% 50%'
            });

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

        // apply the preloader
        window.setTimeout(function() {
            self.$( 'target' ).append( loader );
        },0);

        // create the instance
        f = new Galleria.PyGall();

        // apply PyGall options
        if ( typeof self._options.pygallOptions === 'object' ) {
            f.setOptions( self._options.pygallOptions );
        }

        // call the pygall method and trigger the DATA event
        f[ pygall[0] ]( pygall[1], function( data, meta ) {

            self._data = data;
            loader.remove();
            self.trigger( Galleria.DATA );
            f.options.complete.call(f, data, meta);

        });
    } else {
        // if pygall array not found, pass
        load.apply( this, args );
    }
};

}( jQuery ) );
