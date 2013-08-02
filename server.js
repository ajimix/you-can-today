( function( require ) {
	'use strict';

		/**
		 * Require dependencies.
		 **/
	var oRestify = require( 'restify' ),
		oMongoose = require( 'mongoose' ),
		oFs = require( 'fs' ),

		/**
		 * Create server and database connection.
		 */
		oServer = oRestify.createServer(),
		oDb = oMongoose.connection,

		/**
		 * Gets a random action.
		 * @private
		 * @param  {Object} oRandom
		 * @param  {Object} oResponse
		 */
		_fpGetRandomAction = function( oRandom, oResponse ) {
			Action.findOne( {
				random: oRandom
			}, function( oError, oAction ) {
				if ( oError ) {
					oResponse.send( 'An error ocurred trying to get the actions' );
				} else if ( oAction === null ) {
					if ( oRandom.$gte !== undefined ) {
						_fpGetRandomAction( { $lte: oRandom.$gte }, oResponse )
					} else {
						// Empty table, no action found.
						oResponse.send( { action: "" } );
					}
				} else {
					oResponse.send( { action: oAction.action } );
				}
			} );
		},

		/**
		 * Gets a random action.
		 * @param  {Object} oRequest
		 * @param  {Object} oResponse
		 * @param  {Function} fpNext
		 * @return {Function} Next execution.
		 */
		fpGetRandomAction = function( oRequest, oResponse, fpNext ) {
			_fpGetRandomAction( { $gte: Math.random() }, oResponse );

			return fpNext();
		},

		/**
		 * Saves a new action.
		 * @param  {Object} oRequest
		 * @param  {Object} oResponse
		 * @param  {Function} fpNext
		 * @return {Function} Next execution
		 */
		fpPostAction = function( oRequest, oResponse, fpNext ) {
			var oAction = new Action( {
					random: Math.random(),
					action: oRequest.body.action
				} );

			oAction.save( function( oError, oObject ) {
				if ( oError ) {
					oResponse.send( 'An error ocurred during save action' );
				} else {
					oResponse.send( 201, Math.random().toString( 36 ).substr( 3, 8 ) );
				}
			} );

			return fpNext();
		},

		/**
		 * Loads index.html
		 * @param  {Object} oRequest
		 * @param  {Object} oResponse
		 * @param  {Function} fpNext
		 */
		fpLoadIndex = function( oRequest, oResponse, fpNext ) {
			oFs.readFile( 'index.html', 'binary', function( oError, oFile ) {
				if( oError ) {
					oResponse.writeHead( 500, { 'Content-Type': 'text/plain' } );
					oResponse.write( oError + "\n");
					oResponse.end();

					return fpNext();
				}

				oResponse.writeHead( 200 );
				oResponse.write( oFile, 'binary' );
				oResponse.end();

				return fpNext();
			} );
		},

		/**
		 * Other vars.
		 */
		ActionSchema,
		Action;

	/**
	 * Restify server configuration.
	 */
	oServer.pre( oRestify.pre.userAgentConnection() );
	oServer.use( oRestify.bodyParser( { mapParams: false } ) );

	/**
	 * Restify routes.
	 */
	oServer.get( '/', fpLoadIndex );
	oServer.get( '/action', fpGetRandomAction );
	oServer.post( '/action', fpPostAction );

	/**
	 * Mongo DB connection.
	 */
	oMongoose.connect( 'mongodb://localhost/you-can-today' );
	oDb.on( 'error', console.error.bind( console, 'Connection error:' ) );
	oDb.once( 'open', function callback () {
		console.log( 'Connection to mongodb succesfull' );
	});

	/**
	 * Action schema and model.
	 */
	ActionSchema = oMongoose.Schema( {
		random: Number,
		action: { type: String, unique: true }
	} );
	ActionSchema.index( { random: 1 } );

	Action  = oMongoose.model( 'Action', ActionSchema );
	Action.on( 'index', function( oError ) {
		if ( oError ) {
			console.error( 'Error adding index' );
		}
	} );

	/**
	 * Server initialization.
	 */
	oServer.listen( process.env.PORT || 8080, function() {
		console.log( '%s listening at %s', oServer.name, oServer.url );
	} );
}( require ) );